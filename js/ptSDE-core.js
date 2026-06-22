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
     loadSave(file)               → Promise<void>
     getSaveInfo()                → { name, money, slots, headerOk, size }
     setName(str)
     setMoney(n)
     setSlotPerf(slotIdx, mode)   mode: 'nil' | 'max'
     unlockSlot(slotIdx)
     unlockAllSlots()
     unlockAllParts()
     maxMoney()
     injectCar(slotIdx, carData)  carData: [{off, hex}, ...]
     extractCar(slotIdx)          → [{off, hex}, ...]
     applyJsonPatch(slotIdx, json)
     applyTxtPatch(slotIdx, txt)
     downloadSave(filename)
     downloadBackup(filename)
     createProfile(name, money, carKey)  ← NEW: modal-based create flow
     cloneSave(name)
     isLoaded()
============================================================ */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     OFFSETS — derived from community research + save analysis
  ---------------------------------------------------------- */
  const OFF = {
    // File header magic: ASCII "20CM"
    HEADER:        0x0000,
    HEADER_MAGIC:  [0x32, 0x30, 0x43, 0x4D],

    // Money: signed 32-bit little-endian
    MONEY:         0xA16A,

    // Profile name: ASCII, null-terminated, fixed offset.
    // NAME_READ_LEN is longer than the game's 7-char limit so names
    // written by external tools still display correctly.
    // Writing is always capped at 7 characters.
    NAME_OFFSET:   0xD225,
    NAME_READ_LEN: 16,

    // Car slots: 5 slots, each 0x7F2 bytes, starting at 0x5AEC
    SLOT_BASE:     0x5AEC,
    SLOT_SIZE:     0x7F2,
    SLOT_COUNT:    5,

    // Within each slot — slot-in-use flag (1 = active, 0 = empty)
    SLOT_INUSE:    0x0000,   // relative to slot base

    // Performance data: 8 upgrade blocks per slot, each 0x40 bytes
    PERF_OFFSETS: [
      0x0004, 0x0044, 0x0084, 0x00C4,
      0x0104, 0x0144, 0x0184, 0x01C4
    ],
    PERF_BLOCK_SIZE: 0x40,

    // Unlock all parts: 8 blocks of 0x10 bytes each
    PARTS_OFFSETS: [
      0x0234, 0x0244, 0x0254, 0x0264,
      0x0274, 0x0284, 0x0294, 0x02A4
    ],
    PARTS_BLOCK_SIZE: 0x10,

    // Active car area — absolute offsets used by car injection.
    // These target the game's "current/active car" region (pre-slot area),
    // NOT the slot memory. This is the same region GabriLex's tool writes to,
    // confirmed against real injected save files.
    // Writing order must be ascending offset to prevent corruption.
    CAR_REGION_MIN: 0x5870,
    CAR_REGION_MAX: 0xC3E6,  // 0xC3B0 + 0x36 (last block end)
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

  function _dv() {
    return new DataView(_buf);
  }

  function _readBytes(off, len) {
    return new Uint8Array(_buf, off, len);
  }

  function _writeBytes(off, bytes) {
    const view = new Uint8Array(_buf);
    for (let i = 0; i < bytes.length; i++) {
      view[off + i] = bytes[i];
    }
  }

  function _hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  function _bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  function _copyBuffer(src) {
    const dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
  }

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
     NAME
  ---------------------------------------------------------- */

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
    return _dv().getInt32(OFF.MONEY, true);
  }

  function _writeMoney(n) {
    _dv().setInt32(OFF.MONEY, Math.max(0, Math.min(n, 2147483647)), true);
  }

  /* ----------------------------------------------------------
     CAR SLOTS
  ---------------------------------------------------------- */

  function _slotOffset(slotIdx) {
    return OFF.SLOT_BASE + slotIdx * OFF.SLOT_SIZE;
  }

  function _slotInUse(slotIdx) {
    const off = _slotOffset(slotIdx) + OFF.SLOT_INUSE;
    return new Uint8Array(_buf)[off] !== 0x00;
  }

  function _unlockSlot(slotIdx) {
    const off = _slotOffset(slotIdx) + OFF.SLOT_INUSE;
    new Uint8Array(_buf)[off] = 0x01;
  }

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

  function _setSlotPerf(slotIdx, mode) {
    const base = _slotOffset(slotIdx);
    const fill = mode === 'max' ? 0xFF : 0x00;
    const view = new Uint8Array(_buf);
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
     CAR INJECTION (active car area — absolute offsets)

     These blocks target the game's active/current car region,
     NOT the slot memory. Offsets are absolute file positions.
     Blocks are always written in ascending offset order.
     Each block is bounds-checked against the buffer before write.
  ---------------------------------------------------------- */

  function _injectActiveCar(carData) {
    if (!carData || !carData.blocks || !carData.blocks.length) return false;

    // Sort ascending — safe write order
    const sorted = [...carData.blocks].sort((a, b) => a.off - b.off);

    const view = new Uint8Array(_buf);
    for (const block of sorted) {
      const bytes = _hexToBytes(block.hex);
      const off   = typeof block.off === 'string'
        ? parseInt(block.off, 16)
        : block.off;

      // Bounds check: must land within file and within the known car region
      if (off < OFF.CAR_REGION_MIN) continue;
      if (off + bytes.length > _buf.byteLength) continue;

      for (let i = 0; i < bytes.length; i++) {
        view[off + i] = bytes[i];
      }
    }
    return true;
  }

  /* ----------------------------------------------------------
     SLOT-BASED CAR INJECTION (legacy — for patch files)
     Patch format: [{off, hex}, ...]
     'off' is relative to slot start (0 .. SLOT_SIZE-1)
  ---------------------------------------------------------- */

  function _injectCar(slotIdx, carData) {
    _unlockSlot(slotIdx);
    const slotBase = _slotOffset(slotIdx);
    for (const entry of carData) {
      const relOff = typeof entry.off === 'string'
        ? parseInt(entry.off, 16)
        : entry.off;
      const bytes = _hexToBytes(entry.hex);
      if (relOff < 0 || relOff + bytes.length > OFF.SLOT_SIZE) continue;
      const off = slotBase + relOff;
      if (off + bytes.length > _buf.byteLength) continue;
      _writeBytes(off, bytes);
    }
  }

  function _extractCar(slotIdx) {
    const base    = _slotOffset(slotIdx);
    const size    = OFF.SLOT_SIZE;
    const bytes   = _readBytes(base, size);
    const patches = [];
    const CHUNK   = 16;
    for (let i = 0; i < size; i += CHUNK) {
      const chunk = bytes.slice(i, i + CHUNK);
      if (chunk.every(b => b === 0x00)) continue;
      patches.push({ off: i, hex: _bytesToHex(chunk) });
    }
    return patches;
  }

  function _applyJsonPatch(slotIdx, json) {
    let data;
    try { data = JSON.parse(json); } catch (e) {
      throw new Error('Invalid .json patch: could not parse JSON');
    }
    if (!Array.isArray(data)) throw new Error('Invalid .json patch: expected an array');
    _injectCar(slotIdx, data);
  }

  function _applyTxtPatch(slotIdx, txt) {
    _unlockSlot(slotIdx);
    const lines  = txt.split(/\r?\n/);
    const blocks = [];
    let   i      = 0;
    while (i < lines.length) {
      const offLine = lines[i]?.trim();
      const hexLine = lines[i + 1]?.trim();
      if (offLine && hexLine) {
        const off   = parseInt(offLine, 16);
        const bytes = _hexToBytes(hexLine);
        if (!isNaN(off) && bytes.length > 0) {
          blocks.push({ off, hex: hexLine });
        }
      }
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
     DECODE TEMPLATE — shared by createProfile and createNewSave
  ---------------------------------------------------------- */

  function _decodeTemplate() {
    if (!global.ptSDE_TEMPLATE) {
      throw new Error('Template not loaded. Make sure ptSDE-template.js is included.');
    }
    const binStr = atob(global.ptSDE_TEMPLATE);
    const bytes  = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /* ----------------------------------------------------------
     CREATE PROFILE (new modal flow)

     1. Decode the Peugeot 206 base template
     2. Write profile name at NAME_OFFSET
     3. Write money at MONEY offset
     4. If carKey provided → look up car in ptSDE_CARS and inject
        into the active car region (absolute offsets)
     5. If no carKey → Peugeot 206 stays as the default car
     6. Download file named after the profile

     carKey: string key from ptSDE_CARS, or null/undefined for default
  ---------------------------------------------------------- */

  function _createProfile(name, money, carKey) {
    const clean = name.slice(0, 7).replace(/[^A-Za-z0-9]/g, '') || 'PLAYER';
    const newBuf = _decodeTemplate();

    // Temporarily swap _buf so shared write helpers work
    const prev = _buf;
    _buf = newBuf;

    try {
      // 1. Write name
      _writeName(clean);

      // 2. Write money (clamp to safe range)
      const safeM = Math.max(0, Math.min(Number(money) || 0, 2147483647));
      _writeMoney(safeM);

      // 3. Inject car if requested
      if (carKey && global.ptSDE_CARS) {
        const car = global.ptSDE_CARS.findByKey(carKey);
        if (car) {
          _injectActiveCar(car);
        }
        // If carKey was given but not found — silently keep Peugeot default
      }
      // If no carKey — Peugeot 206 from template is already the car

      const result = _copyBuffer(_buf);
      _download(result, clean);

    } finally {
      // Always restore previous state — never corrupt a loaded save
      _buf = prev;
    }
  }

  /* ----------------------------------------------------------
     CLONE SAVE
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

    isSlotInUse(slotIdx) {
      if (!_buf) return false;
      return _slotInUse(slotIdx);
    },

    setName(str)      { if (_buf) _writeName(str); },
    setMoney(n)       { if (_buf) _writeMoney(n); },

    setSlotPerf(slotIdx, mode) {
      if (_buf) _setSlotPerf(slotIdx, mode);
    },

    unlockSlot(slotIdx) {
      if (_buf) _unlockSlot(slotIdx);
    },

    unlockAllSlots() {
      if (!_buf) return;
      for (let i = 0; i < OFF.SLOT_COUNT; i++) _unlockSlot(i);
    },

    unlockAllParts() {
      if (_buf) _unlockAllParts();
    },

    maxMoney() {
      if (_buf) _writeMoney(2147483647);
    },

    injectCar(slotIdx, carData) {
      if (_buf) _injectCar(slotIdx, carData);
    },

    extractCar(slotIdx) {
      if (!_buf) return [];
      return _extractCar(slotIdx);
    },

    applyJsonPatch(slotIdx, json) {
      if (_buf) _applyJsonPatch(slotIdx, json);
    },

    applyTxtPatch(slotIdx, txt) {
      if (_buf) _applyTxtPatch(slotIdx, txt);
    },

    downloadSave(filename) {
      if (_buf) _download(_buf, filename || _filename || 'save.sav');
    },

    downloadBackup(filename) {
      if (_orig) _download(_orig, filename || (_filename ? _filename + '.bak' : 'save.sav.bak'));
    },

    /**
     * createProfile(name, money, carKey)
     * The new modal-driven create flow.
     *   name   — profile name string (max 7 alphanumeric)
     *   money  — starting money (0 – 2,147,483,647)
     *   carKey — car key from ptSDE_CARS, or null for Peugeot 206 default
     */
    createProfile(name, money, carKey) {
      _createProfile(name, money, carKey);
    },

    /**
     * createNewSave(name) — legacy single-arg create.
     * Kept for backward compatibility. Uses Peugeot 206 base, no car injection.
     */
    createNewSave(name) {
      _createProfile(name, 0, null);
    },

    cloneSave(name) {
      const clean = name.slice(0, 7).replace(/[^A-Za-z0-9]/g, '') || 'CLONE';
      const buf   = _buildClone(clean);
      _download(buf, clean);
    },

    isLoaded() {
      return _buf !== null;
    },
  };

  /* ----------------------------------------------------------
     EXPORT
  ---------------------------------------------------------- */
  global.ptSDE = ptSDE;

}(window));
