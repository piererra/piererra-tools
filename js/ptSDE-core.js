/* ============================================================
   ptSDE-core.js — NFSU2 Save Data Editor by Piererra
   Binary read/write engine for NFSU2 save files (.sav)

   Responsibilities:
     - Load & validate save file from FileReader
     - Parse profile name, money, car slot data
     - Write edits back into the ArrayBuffer
     - Handle car injection, patch extract/apply
     - Clone save / create new save from template
     - Trigger file downloads

   Exports (on window.ptSDE):
     loadSave(file)            → Promise<void>
     getSaveInfo()             → { name, money, slots, headerOk, size }
     setName(str)
     setMoney(n)
     setSlotPerf(slotIdx, mode)  mode: 'nil' | 'max'
     unlockSlot(slotIdx)
     unlockAllSlots()
     unlockAllParts()
     maxMoney()
     injectCar(slotIdx, carData)   carData: [{off, hex}, ...]
     extractCar(slotIdx)           → [{off, hex}, ...]
     applyJsonPatch(slotIdx, json)
     applyTxtPatch(slotIdx, txt)
     downloadSave(filename)
     downloadBackup(filename)
     createNewSave(name)
     cloneSave(name)
============================================================ */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     OFFSETS — derived from community research + save analysis
  ---------------------------------------------------------- */
  const OFF = {
    // File header magic (4 bytes): EA FC 09 11
    HEADER:        0x0000,
    HEADER_MAGIC:  [0x32, 0x30, 0x43, 0x4D], // ASCII "20CM"

    // Money: signed 32-bit little-endian
    MONEY:         0xA16A,

    // Profile name: ASCII, null-terminated, at a fixed offset.
    // Verified against multiple real save files — this offset is reliable.
    // NAME_READ_LEN is intentionally longer than the game's 7-char limit so
    // names written by external tools/exploits (which can exceed 7 chars)
    // still display correctly. Writing is always capped at 7 characters
    // (the game's real limit) inside _writeName, regardless of read length.
    NAME_OFFSET:    0xD225,
    NAME_READ_LEN:  16,

    // Car slots: 5 slots, each 0x7F2 bytes, starting at 0x5AEC
    SLOT_BASE:     0x5AEC,
    SLOT_SIZE:     0x7F2,
    SLOT_COUNT:    5,

    // Within each slot — slot-in-use flag (1 = active, 0 = empty)
    SLOT_INUSE:    0x0000,   // relative to slot base

    // Performance data: 8 upgrade blocks per slot, each 0x40 bytes
    // Offsets relative to slot base
    PERF_OFFSETS: [
      0x0004, 0x0044, 0x0084, 0x00C4,
      0x0104, 0x0144, 0x0184, 0x01C4
    ],
    PERF_BLOCK_SIZE: 0x40,

    // Unlock all parts: 8 blocks of 0x10 bytes each starting at 0x0234
    // relative to slot base — fill with 0xFF
    PARTS_OFFSETS: [
      0x0234, 0x0244, 0x0254, 0x0264,
      0x0274, 0x0284, 0x0294, 0x02A4
    ],
    PARTS_BLOCK_SIZE: 0x10,
  };

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  let _buf      = null;   // ArrayBuffer — working copy of the save
  let _orig     = null;   // ArrayBuffer — original bytes (for backup)
  let _filename = '';     // original filename

  /* ----------------------------------------------------------
     INTERNAL HELPERS
  ---------------------------------------------------------- */

  /** Return a DataView over the working buffer */
  function _dv() {
    return new DataView(_buf);
  }

  /** Read N bytes at offset, return Uint8Array */
  function _readBytes(off, len) {
    return new Uint8Array(_buf, off, len);
  }

  /** Write bytes array at offset */
  function _writeBytes(off, bytes) {
    const view = new Uint8Array(_buf);
    for (let i = 0; i < bytes.length; i++) {
      view[off + i] = bytes[i];
    }
  }

  /** Parse hex string like "A0 FF 3C" or "A0FF3C" → Uint8Array */
  function _hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  /** Uint8Array → hex string with spaces */
  function _bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  }

  /** Deep copy an ArrayBuffer */
  function _copyBuffer(src) {
    const dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
  }

  /** Trigger a browser download of bytes as filename */
  function _download(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ----------------------------------------------------------
     NAME — fixed-offset read/write
     The profile name is stored as a null-terminated ASCII string at a
     fixed offset. (A previous version of this tool scanned for the name
     dynamically, but testing against real save files showed that scan
     producing wrong results on every file tested — it kept finding false
     matches before reaching the real name. The fixed offset below was
     correct in every file tested, so it's now used directly.)
  ---------------------------------------------------------- */

  /**
   * Read profile name as string.
   * Reads up to NAME_READ_LEN bytes, stopping at the first null. This is
   * intentionally longer than the game's normal 7-character limit so that
   * names written by external tools/exploits (which can exceed 7 chars)
   * still display correctly here — this only affects reading/display,
   * not what this tool itself can write.
   */
  function _readName() {
    const off  = OFF.NAME_OFFSET;
    const view = new Uint8Array(_buf);
    let name   = '';
    for (let i = 0; i < OFF.NAME_READ_LEN; i++) {
      const c = view[off + i];
      if (c === 0x00) break;
      name += String.fromCharCode(c);
    }
    return name || '?';
  }

  /**
   * Write profile name — always capped at 7 characters (the game's real
   * limit), regardless of how long the previous/displayed name was.
   * Clears the full NAME_READ_LEN region first so no leftover characters
   * from a longer existing name remain after the new null terminator.
   */
  function _writeName(name) {
    const off   = OFF.NAME_OFFSET;
    const clean = name.slice(0, 7).replace(/[^A-Za-z0-9]/g, '');
    const view  = new Uint8Array(_buf);
    for (let i = 0; i < OFF.NAME_READ_LEN; i++) {
      view[off + i] = i < clean.length ? clean.charCodeAt(i) : 0x00;
    }
  }

  /* ----------------------------------------------------------
     MONEY
  ---------------------------------------------------------- */

  function _readMoney() {
    return _dv().getInt32(OFF.MONEY, true);  // little-endian signed
  }

  function _writeMoney(n) {
    _dv().setInt32(OFF.MONEY, Math.max(0, Math.min(n, 2147483647)), true);
  }

  /* ----------------------------------------------------------
     CAR SLOTS
  ---------------------------------------------------------- */

  /** Absolute offset of slot N */
  function _slotOffset(slotIdx) {
    return OFF.SLOT_BASE + slotIdx * OFF.SLOT_SIZE;
  }

  /** Read slot in-use flag */
  function _slotInUse(slotIdx) {
    const off = _slotOffset(slotIdx) + OFF.SLOT_INUSE;
    return new Uint8Array(_buf)[off] !== 0x00;
  }

  /** Force-unlock a slot by writing 0x01 to its in-use flag */
  function _unlockSlot(slotIdx) {
    const off = _slotOffset(slotIdx) + OFF.SLOT_INUSE;
    new Uint8Array(_buf)[off] = 0x01;
  }

  /** Read slot count info: { total, inUse } */
  function _readSlotInfo() {
    let inUse = 0;
    for (let i = 0; i < OFF.SLOT_COUNT; i++) {
      if (_slotInUse(i)) inUse++;
    }
    return { total: OFF.SLOT_COUNT, inUse };
  }

  /* ----------------------------------------------------------
     PERFORMANCE
  ---------------------------------------------------------- */

  /**
   * Set performance for a slot.
   * mode 'nil' → write 0x00 to all perf bytes
   * mode 'max' → write 0xFF to all perf bytes
   */
  function _setSlotPerf(slotIdx, mode) {
    const base  = _slotOffset(slotIdx);
    const fill  = mode === 'max' ? 0xFF : 0x00;
    const view  = new Uint8Array(_buf);
    for (const relOff of OFF.PERF_OFFSETS) {
      const abs = base + relOff;
      for (let i = 0; i < OFF.PERF_BLOCK_SIZE; i++) {
        view[abs + i] = fill;
      }
    }
  }

  /* ----------------------------------------------------------
     UNLOCK ALL PARTS
  ---------------------------------------------------------- */

  function _unlockAllParts() {
    const view = new Uint8Array(_buf);
    for (let s = 0; s < OFF.SLOT_COUNT; s++) {
      const base = _slotOffset(s);
      for (const relOff of OFF.PARTS_OFFSETS) {
        const abs = base + relOff;
        for (let i = 0; i < OFF.PARTS_BLOCK_SIZE; i++) {
          view[abs + i] = 0xFF;
        }
      }
    }
  }

  /* ----------------------------------------------------------
     HEADER VALIDATION
  ---------------------------------------------------------- */

  function _validateHeader() {
    if (!_buf || _buf.byteLength < 6) return false;
    const view = new Uint8Array(_buf);
    const magicOk = OFF.HEADER_MAGIC.every((b, i) => view[OFF.HEADER + i] === b);
    if (!magicOk) return false;
    const low16 = _dv().getUint16(0x0004, true);
    return low16 === (_buf.byteLength & 0xFFFF);
  }

  /* ----------------------------------------------------------
     CAR INJECTION & PATCH
     Patch format: [{off: number, hex: string}, ...]
     'off' is absolute offset in the save file.
  ---------------------------------------------------------- */

  /** Inject a car patch array into a slot. Each entry overwrites bytes at 'off'. */
  function _injectCar(slotIdx, carData) {
    // First unlock the slot so the car shows up
    _unlockSlot(slotIdx);

    for (const entry of carData) {
      const off   = typeof entry.off === 'string'
        ? parseInt(entry.off, 16)
        : entry.off;
      const bytes = _hexToBytes(entry.hex);

      // Bounds check
      if (off + bytes.length > _buf.byteLength) continue;
      _writeBytes(off, bytes);
    }
  }

  /** Extract car data from a slot as a patch array */
  function _extractCar(slotIdx) {
    const base    = _slotOffset(slotIdx);
    const size    = OFF.SLOT_SIZE;
    const bytes   = _readBytes(base, size);
    const patches = [];

    // Chunk the slot into 16-byte blocks, skip all-zero blocks
    const CHUNK = 16;
    for (let i = 0; i < size; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      if (chunk.every(b => b === 0x00)) continue;
      patches.push({
        off: base + i,
        hex: _bytesToHex(chunk),
      });
    }
    return patches;
  }

  /** Apply a .json patch file content (string) to a slot */
  function _applyJsonPatch(slotIdx, json) {
    let data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid .json patch: could not parse JSON');
    }
    if (!Array.isArray(data)) throw new Error('Invalid .json patch: expected an array');
    _injectCar(slotIdx, data);
  }

  /**
   * Apply legacy .txt patch format to a slot.
   * Format: pairs of lines separated by blank lines:
   *   <hex offset>
   *   <hex data>
   *   (blank line)
   *   <hex offset>
   *   <hex data>
   */
  function _applyTxtPatch(slotIdx, txt) {
    // First unlock the slot
    _unlockSlot(slotIdx);

    const lines  = txt.split(/\r?\n/);
    const blocks = [];
    let   i      = 0;

    while (i < lines.length) {
      const offLine  = lines[i]?.trim();
      const hexLine  = lines[i + 1]?.trim();
      if (offLine && hexLine) {
        const off   = parseInt(offLine, 16);
        const bytes = _hexToBytes(hexLine);
        if (!isNaN(off) && bytes.length > 0) {
          blocks.push({ off, hex: hexLine });
        }
      }
      // Skip to next blank-line-separated pair
      i += 2;
      while (i < lines.length && lines[i].trim() === '') i++;
    }

    for (const block of blocks) {
      const bytes = _hexToBytes(block.hex);
      if (block.off + bytes.length <= _buf.byteLength) {
        _writeBytes(block.off, bytes);
      }
    }
  }

  /* ----------------------------------------------------------
     NEW SAVE — built from embedded template (ptSDE-template.js)
     The template script must define window.ptSDE_TEMPLATE as a
     base64-encoded blank NFSU2 save file.
  ---------------------------------------------------------- */

  function _buildNewSave(name) {
    if (!global.ptSDE_TEMPLATE) {
      throw new Error('Template not loaded. Make sure ptSDE-template.js is included.');
    }

    // Decode base64 template to ArrayBuffer
    const b64     = global.ptSDE_TEMPLATE;
    const binStr  = atob(b64);
    const bytes   = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    const newBuf = bytes.buffer;

    // Temporarily swap _buf to write the name into the template
    const prev = _buf;
    _buf = newBuf;
    _writeName(name);
    const result = _copyBuffer(_buf);
    _buf = prev;

    return result;
  }

  /* ----------------------------------------------------------
     CLONE SAVE — copy loaded save, rename profile
  ---------------------------------------------------------- */

  function _buildClone(name) {
    if (!_buf) throw new Error('No save loaded');
    const clone = _copyBuffer(_buf);
    const prev  = _buf;
    _buf        = clone;
    _writeName(name);
    const result = _copyBuffer(_buf);
    _buf = prev;
    return result;
  }

  /* ----------------------------------------------------------
     PUBLIC API
  ---------------------------------------------------------- */

  const ptSDE = {

    /** Load a File object, parse it, store in state. Returns a Promise. */
    loadSave(file) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided'));
        _filename = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
          _orig = e.target.result;
          _buf  = _copyBuffer(_orig);

          if (!_validateHeader()) {
            _buf  = null;
            _orig = null;
            return reject(new Error('Invalid save file: header mismatch. Make sure this is an NFSU2 save.'));
          }
          resolve();
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    },

    /** Returns current parsed save info */
    getSaveInfo() {
      if (!_buf) return null;
      const slots = _readSlotInfo();
      return {
        name:     _readName(),
        money:    _readMoney(),
        slots,
        headerOk: _validateHeader(),
        size:     _buf.byteLength,
        filename: _filename,
      };
    },

    /** Returns whether a specific slot is in-use */
    isSlotInUse(slotIdx) {
      if (!_buf) return false;
      return _slotInUse(slotIdx);
    },

    /** Write profile name into working buffer */
    setName(str) {
      if (!_buf) return;
      _writeName(str);
    },

    /** Write money into working buffer */
    setMoney(n) {
      if (!_buf) return;
      _writeMoney(n);
    },

    /** Set performance for a slot (mode: 'nil' | 'max') */
    setSlotPerf(slotIdx, mode) {
      if (!_buf) return;
      _setSlotPerf(slotIdx, mode);
    },

    /** Unlock a single car slot */
    unlockSlot(slotIdx) {
      if (!_buf) return;
      _unlockSlot(slotIdx);
    },

    /** Unlock all 5 car slots */
    unlockAllSlots() {
      if (!_buf) return;
      for (let i = 0; i < OFF.SLOT_COUNT; i++) _unlockSlot(i);
    },

    /** Unlock all parts across all slots */
    unlockAllParts() {
      if (!_buf) return;
      _unlockAllParts();
    },

    /** Set money to maximum safe value */
    maxMoney() {
      if (!_buf) return;
      _writeMoney(2147483647);
    },

    /** Inject a car data array into a slot */
    injectCar(slotIdx, carData) {
      if (!_buf) return;
      _injectCar(slotIdx, carData);
    },

    /** Extract car from a slot as patch array */
    extractCar(slotIdx) {
      if (!_buf) return [];
      return _extractCar(slotIdx);
    },

    /** Apply a .json patch string to a slot */
    applyJsonPatch(slotIdx, json) {
      if (!_buf) return;
      _applyJsonPatch(slotIdx, json);
    },

    /** Apply a legacy .txt patch string to a slot */
    applyTxtPatch(slotIdx, txt) {
      if (!_buf) return;
      _applyTxtPatch(slotIdx, txt);
    },

    /** Download the current working buffer as a .sav file */
    downloadSave(filename) {
      if (!_buf) return;
      _download(_buf, filename || _filename || 'save.sav');
    },

    /** Download the original unmodified buffer as a .bak file */
    downloadBackup(filename) {
      if (!_orig) return;
      _download(_orig, filename || (_filename ? _filename + '.bak' : 'save.sav.bak'));
    },

    /** Create a blank new save with given profile name and download it */
    createNewSave(name) {
      const clean = name.slice(0, 7).replace(/[^A-Za-z0-9]/g, '') || 'PLAYER';
      const buf   = _buildNewSave(clean);
      _download(buf, clean);
    },

    /** Clone the loaded save with a new profile name and download it */
    cloneSave(name) {
      const clean = name.slice(0, 7).replace(/[^A-Za-z0-9]/g, '') || 'CLONE';
      const buf   = _buildClone(clean);
      _download(buf, clean);
    },

    /** True if a save is currently loaded */
    isLoaded() {
      return _buf !== null;
    },
  };

  /* ----------------------------------------------------------
     EXPORT
  ---------------------------------------------------------- */
  global.ptSDE = ptSDE;

}(window));
