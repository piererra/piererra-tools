/* ============================================================
   ptMWE-core.js — NFSMW Save Editor · Binary Engine
   Author  : Piererra
   Project : Piererra Tools
   ──────────────────────────────────────────────────────────
   Handles:
     · MD5 implementation (used for save hash validation)
     · Platform-aware offset map (PC / PS2)
     · EncodedValue — typed binary read/write abstraction
     · Save file loading, hash recalculation, and download
   ──────────────────────────────────────────────────────────
   Save file specs:
     PC  — 63,596 bytes  (v1.3 EN)
     PS2 — 62,689 bytes
   MD5 hash covers bytes 0x34 → (fileSize - 16 - 1),
   stored in the last 16 bytes of the file.
============================================================ */

'use strict';

/* ── MD5 IMPLEMENTATION ─────────────────────────────────────
   Minimal self-contained MD5 for browser use.
   Used exclusively to recalculate the save file hash
   after any edit, keeping the file valid for the game.
   Input  : ArrayBuffer or Uint8Array
   Output : Array of 16 bytes (digest)
─────────────────────────────────────────────────────────── */
const ptMWE_MD5 = (function () {

  /* Rotate left helper */
  function rol(n, s) { return (n << s) | (n >>> (32 - s)); }

  /* Safe 32-bit addition */
  function add32() {
    let r = 0;
    for (let i = 0; i < arguments.length; i++) r = (r + arguments[i]) | 0;
    return r;
  }

  /* MD5 auxiliary functions */
  function F(b, c, d) { return (b & c) | (~b & d); }
  function G(b, c, d) { return (b & d) | (c & ~d); }
  function H(b, c, d) { return b ^ c ^ d; }
  function I(b, c, d) { return c ^ (b | ~d); }

  /* MD5 round constants (sin-derived) */
  const T = new Int32Array(64);
  for (let i = 0; i < 64; i++) T[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;

  /* Pad message to a multiple of 512 bits */
  function pad(bytes) {
    const len  = bytes.length;
    const bits = len * 8;
    /* Append 0x80, then zeros until length ≡ 56 (mod 64) */
    const pad  = ((len % 64) < 56) ? (56 - len % 64) : (120 - len % 64);
    const buf  = new Uint8Array(len + pad + 8);
    buf.set(bytes);
    buf[len] = 0x80;
    /* Append original length in bits as 64-bit LE */
    const view = new DataView(buf.buffer);
    view.setUint32(buf.length - 8, bits >>> 0,  true);
    view.setUint32(buf.length - 4, Math.floor(bits / 0x100000000), true);
    return buf;
  }

  /* Process one 512-bit block */
  function processBlock(state, block, off) {
    const view = new DataView(block.buffer, off, 64);
    const M = new Int32Array(16);
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(j * 4, true);

    let [a, b, c, d] = state;

    /* Round 1 */
    const R1 = [[0,7,1],[1,12,2],[2,17,3],[3,22,4],[4,7,5],[5,12,6],[6,17,7],[7,22,8],
                [8,7,9],[9,12,10],[10,17,11],[11,22,12],[12,7,13],[13,12,14],[14,17,15],[15,22,16]];
    for (const [k, s, ti] of R1) {
      const tmp = add32(a, F(b, c, d), M[k], T[ti - 1]);
      a = d; d = c; c = b; b = add32(b, rol(tmp, s));
    }

    /* Round 2 */
    const R2 = [[1,5,17],[6,9,18],[11,14,19],[0,20,20],[5,5,21],[10,9,22],[15,14,23],[4,20,24],
                [9,5,25],[14,9,26],[3,14,27],[8,20,28],[13,5,29],[2,9,30],[7,14,31],[12,20,32]];
    for (const [k, s, ti] of R2) {
      const tmp = add32(a, G(b, c, d), M[k], T[ti - 1]);
      a = d; d = c; c = b; b = add32(b, rol(tmp, s));
    }

    /* Round 3 */
    const R3 = [[5,4,33],[8,11,34],[11,16,35],[14,23,36],[1,4,37],[4,11,38],[7,16,39],[10,23,40],
                [13,4,41],[0,11,42],[3,16,43],[6,23,44],[9,4,45],[12,11,46],[15,16,47],[2,23,48]];
    for (const [k, s, ti] of R3) {
      const tmp = add32(a, H(b, c, d), M[k], T[ti - 1]);
      a = d; d = c; c = b; b = add32(b, rol(tmp, s));
    }

    /* Round 4 */
    const R4 = [[0,6,49],[7,10,50],[14,15,51],[5,21,52],[12,6,53],[3,10,54],[10,15,55],[1,21,56],
                [8,6,57],[15,10,58],[6,15,59],[13,21,60],[4,6,61],[11,10,62],[2,15,63],[9,21,64]];
    for (const [k, s, ti] of R4) {
      const tmp = add32(a, I(b, c, d), M[k], T[ti - 1]);
      a = d; d = c; c = b; b = add32(b, rol(tmp, s));
    }

    return [
      add32(state[0], a),
      add32(state[1], b),
      add32(state[2], c),
      add32(state[3], d),
    ];
  }

  /* Public: digest(ArrayBuffer | Uint8Array) → Array[16] (bytes) */
  function digest(input) {
    const bytes = (input instanceof ArrayBuffer) ? new Uint8Array(input) : input;
    const buf   = pad(bytes);
    let state   = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];

    for (let i = 0; i < buf.length; i += 64) {
      state = processBlock(state, buf, i);
    }

    /* Write state to 16-byte output, little-endian */
    const out  = new Uint8Array(16);
    const view = new DataView(out.buffer);
    view.setInt32(0,  state[0], true);
    view.setInt32(4,  state[1], true);
    view.setInt32(8,  state[2], true);
    view.setInt32(12, state[3], true);
    return Array.from(out);
  }

  return { digest };
})();


/* ── CONSTANTS ──────────────────────────────────────────────
   Struct and save file geometry.
   Sizes and offsets verified against NFSMW v1.3 EN (PC)
   and the PS2 retail save format.
─────────────────────────────────────────────────────────── */

/* Save file sizes (bytes) */
const MWE_SAVE_SIZE_PC  = 63596;
const MWE_SAVE_SIZE_PS2 = 62689;

/* Offset of the MD5 hash — last 16 bytes of the save */
const MWE_HASH_OFFSET_PC  = MWE_SAVE_SIZE_PC  - 16;
const MWE_HASH_OFFSET_PS2 = MWE_SAVE_SIZE_PS2 - 16;

/* Content region hashed by MD5: starts at 0x34 */
const MWE_CONTENT_START   = 0x34;

/* Car record struct */
const MWE_CAR_STRUCT_SIZE = 0x38;  /* 56 bytes per car slot */
const MWE_CAR_ID_SIZE     = 0x10;  /* 16 bytes: car ID string */
const MWE_MAX_CARS        = 6;
const MWE_INVALID_CAR_ID  = 0xFF;  /* slot is empty if first byte == 0xFF */

/* Pursuit record struct */
const MWE_PURSUIT_STRUCT_SIZE = 0x38;  /* 56 bytes per pursuit */
const MWE_PURSUIT_ID_SIZE     = 0x0C;  /* 12 bytes: pursuit ID string */
const MWE_MAX_PURSUITS        = 5;

/* Case name max length (bytes, null-terminated within this range) */
const MWE_CASE_NAME_MAX = 12;

/* Junkman token slot block (PC only — not yet reverse-engineered for PS2) */
const MWE_JUNKMAN_BASE_PC     = 0x5769;  /* saved-data-start (0x34) + 0x5735 */
const MWE_JUNKMAN_SLOT_STRIDE = 0x0C;    /* 12 bytes per slot */
const MWE_JUNKMAN_SLOT_COUNT  = 59;
const MWE_JUNKMAN_CLAMP_MAX   = 63;      /* hard ceiling; UI defaults to a 0/1 toggle */


/* ── PLATFORM MAP ───────────────────────────────────────────
   Helper that boxes a PC value and an optional PS2 value
   into a { pc, ps2 } pair.  If ps2 is omitted it equals pc.
─────────────────────────────────────────────────────────── */
function mwePP(pc, ps2) {
  return { pc, ps2: (ps2 === undefined) ? pc : ps2 };
}


/* ── STATE ──────────────────────────────────────────────────
   All mutable editor state lives here.
   ptMWE-ui.js reads and writes through this object.
─────────────────────────────────────────────────────────── */
const ptMWE = {
  /* Currently active platform ('pc' | 'ps2') */
  platform: 'pc',

  /* DataView over the loaded save ArrayBuffer, or null */
  view: null,

  /* Raw ArrayBuffer of the loaded save */
  buffer: null,

  /* Original filename (for download) */
  filename: 'save',

  /* Per-car and per-pursuit parsed data arrays */
  cars:     [],
  pursuits: [],

  /* Junkman counts as read at load time (PC only) — powers "Reset to Save" */
  junkmanOriginal: null,
};


/* ── LOW-LEVEL READ / WRITE ─────────────────────────────────
   Thin wrappers around DataView get/set that
   respect the current platform's byte order (little-endian).
─────────────────────────────────────────────────────────── */

function mweGetU8 (pos)       { return ptMWE.view.getUint8(pos); }
function mweGetU16(pos)       { return ptMWE.view.getUint16(pos, true); }
function mweGetU32(pos)       { return ptMWE.view.getUint32(pos, true); }

function mweSetU8 (pos, val)  { ptMWE.view.setUint8(pos, val); }
function mweSetU16(pos, val)  { ptMWE.view.setUint16(pos, val, true); }
function mweSetU32(pos, val)  { ptMWE.view.setUint32(pos, val, true); }


/* ── STRING HELPERS ─────────────────────────────────────────
   Read a null-terminated string from the DataView.
   Write a string back with null padding to fill maxLen bytes.
─────────────────────────────────────────────────────────── */

function mweReadString(pos, maxLen) {
  const bytes = new Uint8Array(ptMWE.buffer, pos, maxLen);
  let str = '';
  for (let i = 0; i < maxLen; i++) {
    if (bytes[i] === 0) break;
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

function mweWriteString(pos, str, maxLen) {
  const enc = new TextEncoder().encode(str);
  const len = Math.min(enc.length, maxLen);
  for (let i = 0; i < len; i++) mweSetU8(pos + i, enc[i]);
  /* Null-terminate (overwrite first byte after string) */
  if (len < maxLen) mweSetU8(pos + len, 0);
  mweRehash();
}


/* ── OFFSET MAP ─────────────────────────────────────────────
   All known binary offsets for NFSMW save files.
   Each entry is a { pc, ps2 } pair produced by mwePP().

   Verified against:
     · NFSMW v1.3 EN PC save (63,596 bytes)
     · PS2 retail save (62,689 bytes)
─────────────────────────────────────────────────────────── */
const MWE_OFF = {
  /* ── Profile ── */
  money:        mwePP(0x4039),
  caseName:     mwePP(0x429D),

  /* ── Name (read-only display) ── */
  name:         mwePP(0x5A31),

  /* ── Pursuit Bounty ── */
  pursuitBounty: mwePP(0xE865, 0xE8A1),

  /* ── Infractions (Uint16, contiguous from first offset) ── */
  infractions: {
    speeding:          mwePP(0xE86D, 0xE8A9),
    excessiveSpeeding: null,  /* auto-computed: +2 from previous */
    recklessDriving:   null,
    rammingPolice:     null,
    hitAndRun:         null,
    damageToProperty:  null,
    resistingArrest:   null,
    drivingOffRoadway: null,
  },

  /* ── Car record block base (Uint8Array, 6 × 56 bytes) ── */
  carsBase:     mwePP(0xE2ED, 0xE329),

  /* ── Pursuit stats block base (Uint8Array, 5 × 56 bytes) ── */
  pursuitsBase: mwePP(0xF2BA, 0xF2F9),

  /* ── MD5 hash (last 16 bytes of file) ── */
  hash:         mwePP(MWE_HASH_OFFSET_PC, MWE_HASH_OFFSET_PS2),
};

/* Build contiguous infraction offsets from the first one */
(function buildInfractionOffsets() {
  const keys = [
    'speeding', 'excessiveSpeeding', 'recklessDriving', 'rammingPolice',
    'hitAndRun', 'damageToProperty', 'resistingArrest', 'drivingOffRoadway',
  ];
  /* PC and PS2 each step by 2 bytes (Uint16) */
  let pcOff  = MWE_OFF.infractions.speeding.pc;
  let ps2Off = MWE_OFF.infractions.speeding.ps2;
  for (const key of keys) {
    MWE_OFF.infractions[key] = mwePP(pcOff, ps2Off);
    pcOff  += 2;
    ps2Off += 2;
  }
})();


/* ── HASH ───────────────────────────────────────────────────
   Recalculate the MD5 over the content region and write
   the result back into the last 16 bytes of the save.
   Called automatically after every write operation.
─────────────────────────────────────────────────────────── */
function mweRehash() {
  if (!ptMWE.buffer) return;

  const size    = (ptMWE.platform === 'pc') ? MWE_SAVE_SIZE_PC : MWE_SAVE_SIZE_PS2;
  const hashPos = (ptMWE.platform === 'pc') ? MWE_HASH_OFFSET_PC : MWE_HASH_OFFSET_PS2;
  const content = ptMWE.buffer.slice(MWE_CONTENT_START, MWE_CONTENT_START + (size - 0x34 - 16));

  const digest  = ptMWE_MD5.digest(content);
  const u8      = new Uint8Array(ptMWE.buffer);
  for (let i = 0; i < 16; i++) u8[hashPos + i] = digest[i];

  /* Refresh the DataView (buffer reference is stable, view covers it) */
  return digest;
}


/* ── PLATFORM OFFSET ────────────────────────────────────────
   Return the correct offset for the current platform
   from a { pc, ps2 } offset pair.
─────────────────────────────────────────────────────────── */
function mweOff(pair) {
  return pair[ptMWE.platform];
}


/* ── JUNKMAN TOKEN CATALOG ───────────────────────────────────
   22 known token IDs. One filled slot of a given ID = one
   unit of that token (slot-based inventory, not a counter).
─────────────────────────────────────────────────────────── */
const MWE_JUNKMAN_CATALOG = [
  { id: 1,  name: 'Brakes',                  category: 'performance' },
  { id: 2,  name: 'Engine',                  category: 'performance' },
  { id: 3,  name: 'NOS',                     category: 'performance' },
  { id: 4,  name: 'Turbo',                   category: 'performance' },
  { id: 5,  name: 'Suspension',              category: 'performance' },
  { id: 6,  name: 'Tires',                   category: 'performance' },
  { id: 7,  name: 'Transmission',            category: 'performance' },
  { id: 8,  name: 'Body',                    category: 'visual' },
  { id: 9,  name: 'Hood',                    category: 'visual' },
  { id: 10, name: 'Spoiler',                 category: 'visual' },
  { id: 11, name: 'Rims',                    category: 'visual' },
  { id: 12, name: 'Roof',                    category: 'visual' },
  { id: 13, name: 'Gauge',                   category: 'visual' },
  { id: 14, name: 'Vinyl',                   category: 'visual' },
  { id: 15, name: 'Decal',                   category: 'visual' },
  { id: 16, name: 'Paint',                   category: 'visual' },
  { id: 17, name: 'Out of Jail',             category: 'police' },
  { id: 18, name: 'Money Marker',            category: 'police' },
  { id: 19, name: 'PinkSlip Marker',         category: 'police' },
  { id: 20, name: 'Impound Strike Slot Add', category: 'police' },
  { id: 21, name: 'Impound Release',         category: 'police' },
  { id: 22, name: 'Unknown ID 22',           category: 'unknown' },
];


/* ── JUNKMAN: LOW-LEVEL SLOT ACCESS ─────────────────────────
   PC-only. MWE_JUNKMAN_SLOT_COUNT fixed-size slots starting
   at MWE_JUNKMAN_BASE_PC.
     Filled slot:  [type_id, 00 x7, 01, 00 x3]
     Empty slot:   [00 x12]
─────────────────────────────────────────────────────────── */
function mweJunkmanSlotAbs(index) {
  return MWE_JUNKMAN_BASE_PC + index * MWE_JUNKMAN_SLOT_STRIDE;
}

function mweJunkmanReadSlot(index) {
  const abs = mweJunkmanSlotAbs(index);
  return {
    typeId: mweGetU8(abs),
    count:  mweGetU8(abs + 0x08),
  };
}

function mweJunkmanWriteSlot(index, typeId) {
  const abs = mweJunkmanSlotAbs(index);
  for (let i = 0; i < MWE_JUNKMAN_SLOT_STRIDE; i++) mweSetU8(abs + i, 0);
  mweSetU8(abs, typeId & 0xFF);
  mweSetU8(abs + 0x08, 1);
}

function mweJunkmanClearSlot(index) {
  const abs = mweJunkmanSlotAbs(index);
  for (let i = 0; i < MWE_JUNKMAN_SLOT_STRIDE; i++) mweSetU8(abs + i, 0);
}


/* ── JUNKMAN: READ CURRENT COUNTS ───────────────────────────
   Tabulates every slot. Returns per-token counts for the 22
   known IDs plus capacity info. `supported` is false on PS2
   saves, since this block hasn't been reverse-engineered there.
─────────────────────────────────────────────────────────── */
function mweGetJunkmanCounts() {
  const counts = {};
  for (const t of MWE_JUNKMAN_CATALOG) counts[t.id] = 0;

  if (ptMWE.platform !== 'pc') {
    return { counts, usedSlots: 0, freeSlots: 0, unknownSlots: 0, supported: false };
  }

  let usedSlots    = 0;
  let unknownSlots = 0;

  for (let i = 0; i < MWE_JUNKMAN_SLOT_COUNT; i++) {
    const slot = mweJunkmanReadSlot(i);
    if (slot.typeId === 0 || slot.count !== 1) continue; /* empty / non-standard slot */
    usedSlots++;
    if (Object.prototype.hasOwnProperty.call(counts, slot.typeId)) {
      counts[slot.typeId]++;
    } else {
      unknownSlots++; /* slot holds an ID outside 1..22 — always preserved as-is */
    }
  }

  return {
    counts,
    usedSlots,
    freeSlots: MWE_JUNKMAN_SLOT_COUNT - usedSlots,
    unknownSlots,
    supported: true,
  };
}


/* ── JUNKMAN: APPLY DESIRED COUNTS ──────────────────────────
   desired = { typeId: count, ... }. Only the IDs passed in are
   changed — every other ID (known or unknown) keeps its current
   save value, so anything not yet reverse-engineered is left
   alone automatically. Clamps each value to 0..MWE_JUNKMAN_CLAMP_MAX
   and refuses if the total would overflow the available slots.
   Clears and rewrites the whole block on every call, sorted by
   ascending type ID, so slot order stays deterministic.
   Returns { ok, error? }.
─────────────────────────────────────────────────────────── */
function mweApplyJunkmanCounts(desired) {
  if (ptMWE.platform !== 'pc') {
    return { ok: false, error: 'Junkman editing is PC-only for now.' };
  }

  /* Read current raw slot contents so unspecified IDs survive untouched */
  const haveFull = {};
  for (let i = 0; i < MWE_JUNKMAN_SLOT_COUNT; i++) {
    const slot = mweJunkmanReadSlot(i);
    if (slot.typeId === 0 || slot.count !== 1) continue;
    haveFull[slot.typeId] = (haveFull[slot.typeId] || 0) + 1;
  }

  const wantFull = Object.assign({}, haveFull);
  for (const key of Object.keys(desired)) wantFull[key] = desired[key];
  for (const key of Object.keys(wantFull)) {
    wantFull[key] = Math.max(0, Math.min(wantFull[key], MWE_JUNKMAN_CLAMP_MAX));
  }

  const needed = Object.values(wantFull).reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
  if (needed > MWE_JUNKMAN_SLOT_COUNT) {
    return { ok: false, error: `Need ${needed} slots, only ${MWE_JUNKMAN_SLOT_COUNT} available.` };
  }

  for (let i = 0; i < MWE_JUNKMAN_SLOT_COUNT; i++) mweJunkmanClearSlot(i);

  let idx = 0;
  const ids = Object.keys(wantFull).map(Number).sort((a, b) => a - b);
  for (const tid of ids) {
    const cnt = wantFull[tid];
    for (let n = 0; n < cnt; n++) {
      mweJunkmanWriteSlot(idx, tid);
      idx++;
    }
  }

  mweRehash();
  return { ok: true };
}

/* Convenience single-token setter, mirrors mweSetMoney() etc. */
function mweSetJunkmanWant(typeId, count) {
  return mweApplyJunkmanCounts({ [typeId]: count });
}


/* ── FILE LOAD ──────────────────────────────────────────────
   Called by ptMWE-ui.js when a file is selected.
   Returns a parsed snapshot object for the UI to render,
   or null on error (wrong size, corrupt header).
─────────────────────────────────────────────────────────── */
function mweLoadFile(arrayBuffer, platform, filename) {
  const size = (platform === 'pc') ? MWE_SAVE_SIZE_PC : MWE_SAVE_SIZE_PS2;

  if (arrayBuffer.byteLength !== size) {
    return {
      ok: false,
      error: `Wrong file size: expected ${size} bytes for ${platform.toUpperCase()}, got ${arrayBuffer.byteLength}.`,
    };
  }

  /* Store state */
  ptMWE.buffer   = arrayBuffer.slice(0); /* work on a copy */
  ptMWE.view     = new DataView(ptMWE.buffer);
  ptMWE.platform = platform;
  ptMWE.filename = filename || 'save';
  ptMWE.cars     = [];
  ptMWE.pursuits = [];

  /* Parse per-car records */
  for (let i = 0; i < MWE_MAX_CARS; i++) mweParseCarSlot(i);

  /* Parse per-pursuit records */
  for (let i = 0; i < MWE_MAX_PURSUITS; i++) mweParsePursuitSlot(i);

  /* Snapshot original Junkman counts (PC only) so the UI can offer "Reset to Save" */
  ptMWE.junkmanOriginal = mweGetJunkmanCounts().counts;

  /* Return display snapshot */
  return { ok: true, snapshot: mweSnapshot() };
}


/* ── SNAPSHOT ───────────────────────────────────────────────
   Build a plain object with all current values
   from the DataView. Used by ptMWE-ui.js to populate fields.
─────────────────────────────────────────────────────────── */
function mweSnapshot() {
  const p = ptMWE.platform;

  /* Read current MD5 from file */
  const hashPos = MWE_OFF.hash[p];
  const hashBytes = new Uint8Array(ptMWE.buffer, hashPos, 16);
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  /* Infraction counts */
  const infractions = {};
  for (const [key, pair] of Object.entries(MWE_OFF.infractions)) {
    infractions[key] = mweGetU16(pair[p]);
  }

  /* Lifetime pursuit stats (8 fields, contiguous Uint32 from pursuits block) */
  const pursuitBase = MWE_OFF.pursuitsBase[p];
  const lifetime = {
    length:             mweGetU32(pursuitBase + 0x00),
    policeInvolved:     mweGetU32(pursuitBase + 0x04),
    policeDamaged:      mweGetU32(pursuitBase + 0x08),
    policeImmobilized:  mweGetU32(pursuitBase + 0x0C),
    spikeStripsDodged:  mweGetU32(pursuitBase + 0x10),
    roadblocksDodged:   mweGetU32(pursuitBase + 0x14),
    helicoptersDeployed:mweGetU32(pursuitBase + 0x18),
    costToState:        mweGetU32(pursuitBase + 0x1C),
  };

  /* Single best pursuit stats (10 fields, offset from lifetime block end + 8) */
  const singleBase = pursuitBase + 0x1C + 2 * 4; /* skip 2 unknown Uint32s after CTS */
  const singleBest = {
    length:             mweGetU32(singleBase + 0x00),
    policeInvolved:     mweGetU32(singleBase + 0x08),
    policeDamaged:      mweGetU32(singleBase + 0x10),
    policeImmobilized:  mweGetU32(singleBase + 0x18),
    spikeStripsDodged:  mweGetU32(singleBase + 0x20),
    roadblocksDodged:   mweGetU32(singleBase + 0x28),
    helicoptersDeployed:mweGetU32(singleBase + 0x30),
    costToState:        mweGetU32(singleBase + 0x38),
    infractionsRecorded:mweGetU32(singleBase + 0x40),
    bountyAchieved:     mweGetU32(singleBase + 0x48),
  };

  return {
    name:          mweReadString(MWE_OFF.name[p], 8),
    money:         mweGetU32(MWE_OFF.money[p]),
    pursuitBounty: mweGetU32(MWE_OFF.pursuitBounty[p]),
    caseName:      mweReadString(MWE_OFF.caseName[p], MWE_CASE_NAME_MAX),
    hashHex,
    infractions,
    lifetime,
    singleBest,
    cars:     ptMWE.cars,
    pursuits: ptMWE.pursuits,
    junkman:  mweGetJunkmanCounts(),
  };
}


/* ── PER-CAR SLOT PARSER ────────────────────────────────────
   Read one car slot from the cars block.
   Slot is skipped if the first byte of the ID is 0xFF (empty).
─────────────────────────────────────────────────────────── */
function mweParseCarSlot(index) {
  const p    = ptMWE.platform;
  const base = MWE_OFF.carsBase[p] + index * MWE_CAR_STRUCT_SIZE;

  /* Empty slot check */
  if (mweGetU8(base) === MWE_INVALID_CAR_ID) return;

  /* Car ID string (max 15 chars + null) */
  const carId = mweReadString(base, MWE_CAR_ID_SIZE - 1);

  /* Bounty is at base + CAR_ID_SIZE (0x10) */
  const bountyPos = base + MWE_CAR_ID_SIZE;
  const bounty    = mweGetU32(bountyPos);

  /* Infractions start at bountyPos + 4 (Uint32) + 4 (unknown) = +8 */
  const infrBase = bountyPos + 8;
  const infractions = {
    speeding:          mweGetU16(infrBase + 0),
    excessiveSpeeding: mweGetU16(infrBase + 2),
    recklessDriving:   mweGetU16(infrBase + 4),
    rammingPolice:     mweGetU16(infrBase + 6),
    hitAndRun:         mweGetU16(infrBase + 8),
    damageToProperty:  mweGetU16(infrBase + 10),
    resistingArrest:   mweGetU16(infrBase + 12),
    drivingOffRoadway: mweGetU16(infrBase + 14),
  };

  ptMWE.cars.push({ index, carId, bountyPos, infrBase, bounty, infractions });
}


/* ── PER-PURSUIT SLOT PARSER ────────────────────────────────
   Read one pursuit record from the pursuits block.
   All 5 slots are always parsed (they may contain zeros).
─────────────────────────────────────────────────────────── */
function mweParsePursuitSlot(index) {
  const p    = ptMWE.platform;
  const base = MWE_OFF.pursuitsBase[p] + index * MWE_PURSUIT_STRUCT_SIZE;

  /* Pursuit ID string */
  const pursuitId = mweReadString(base, MWE_PURSUIT_ID_SIZE - 1);

  /* Stats start after the ID string */
  const statsBase = base + MWE_PURSUIT_ID_SIZE;
  const stats = {
    length:              mweGetU32(statsBase + 0x00),
    bountyAchieved:      mweGetU32(statsBase + 0x04),
    /* 0x08 = unknown, skipped */
    policeInvolved:      mweGetU32(statsBase + 0x0C),
    policeDamaged:       mweGetU32(statsBase + 0x10),
    policeImmobilized:   mweGetU32(statsBase + 0x14),
    roadblocksDodged:    mweGetU32(statsBase + 0x18),
    spikeStripsDodged:   mweGetU32(statsBase + 0x1C),
    costToState:         mweGetU32(statsBase + 0x20),
    infractionsRecorded: mweGetU32(statsBase + 0x24),
    helicoptersDeployed: mweGetU32(statsBase + 0x28),
  };

  ptMWE.pursuits.push({ index, pursuitId, statsBase, stats });
}


/* ── WRITE HELPERS ──────────────────────────────────────────
   Each writes one value to the DataView and rehashes.
   Called directly from ptMWE-ui.js event handlers.
─────────────────────────────────────────────────────────── */

function mweSetMoney(val) {
  mweSetU32(MWE_OFF.money[ptMWE.platform], val >>> 0);
  mweRehash();
}

function mweSetBounty(val) {
  mweSetU32(MWE_OFF.pursuitBounty[ptMWE.platform], val >>> 0);
  mweRehash();
}

function mweSetCaseName(str) {
  mweWriteString(MWE_OFF.caseName[ptMWE.platform], str.slice(0, MWE_CASE_NAME_MAX), MWE_CASE_NAME_MAX);
}

function mweSetInfraction(key, val) {
  mweSetU16(MWE_OFF.infractions[key][ptMWE.platform], val & 0xFFFF);
  mweRehash();
}

function mweSetLifetime(field, val) {
  const base = MWE_OFF.pursuitsBase[ptMWE.platform];
  const fieldOffsets = {
    length: 0x00, policeInvolved: 0x04, policeDamaged: 0x08, policeImmobilized: 0x0C,
    spikeStripsDodged: 0x10, roadblocksDodged: 0x14, helicoptersDeployed: 0x18, costToState: 0x1C,
  };
  if (fieldOffsets[field] === undefined) return;
  mweSetU32(base + fieldOffsets[field], val >>> 0);
  mweRehash();
}

function mweSetSingleBest(field, val) {
  const base = MWE_OFF.pursuitsBase[ptMWE.platform] + 0x1C + 2 * 4;
  const fieldOffsets = {
    length: 0x00, policeInvolved: 0x08, policeDamaged: 0x10, policeImmobilized: 0x18,
    spikeStripsDodged: 0x20, roadblocksDodged: 0x28, helicoptersDeployed: 0x30,
    costToState: 0x38, infractionsRecorded: 0x40, bountyAchieved: 0x48,
  };
  if (fieldOffsets[field] === undefined) return;
  mweSetU32(base + fieldOffsets[field], val >>> 0);
  mweRehash();
}

function mweSetCarBounty(carIndex, val) {
  const car = ptMWE.cars.find(c => c.index === carIndex);
  if (!car) return;
  mweSetU32(car.bountyPos, val >>> 0);
  mweRehash();
}

function mweSetCarInfraction(carIndex, key, val) {
  const car = ptMWE.cars.find(c => c.index === carIndex);
  if (!car) return;
  const keyMap = {
    speeding: 0, excessiveSpeeding: 2, recklessDriving: 4, rammingPolice: 6,
    hitAndRun: 8, damageToProperty: 10, resistingArrest: 12, drivingOffRoadway: 14,
  };
  if (keyMap[key] === undefined) return;
  mweSetU16(car.infrBase + keyMap[key], val & 0xFFFF);
  mweRehash();
}

function mweSetPursuitStat(pursuitIndex, field, val) {
  const pursuit = ptMWE.pursuits.find(p => p.index === pursuitIndex);
  if (!pursuit) return;
  const fieldOffsets = {
    length: 0x00, bountyAchieved: 0x04, policeInvolved: 0x0C, policeDamaged: 0x10,
    policeImmobilized: 0x14, roadblocksDodged: 0x18, spikeStripsDodged: 0x1C,
    costToState: 0x20, infractionsRecorded: 0x24, helicoptersDeployed: 0x28,
  };
  if (fieldOffsets[field] === undefined) return;
  mweSetU32(pursuit.statsBase + fieldOffsets[field], val >>> 0);
  mweRehash();
}


/* ── DOWNLOAD ───────────────────────────────────────────────
   Trigger a browser download of the current save buffer.
   Uses a temporary anchor element — no dependencies needed.
─────────────────────────────────────────────────────────── */
function mweDownload(filename) {
  if (!ptMWE.buffer) return;
  const name = filename || ptMWE.filename || 'save';
  const blob = new Blob([ptMWE.buffer], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 40000);
}

/* Backup download — same buffer, .bak extension */
function mweDownloadBackup() {
  if (!ptMWE.buffer) return;
  mweDownload(ptMWE.filename + '.bak');
}


/* ── CURRENT HASH HEX ───────────────────────────────────────
   Return the current MD5 stored in the save as a hex string.
   Used by ptMWE-ui.js to update the info bar after edits.
─────────────────────────────────────────────────────────── */
function mweCurrentHashHex() {
  if (!ptMWE.buffer) return '—';
  const hashPos  = MWE_OFF.hash[ptMWE.platform];
  const hashBytes = new Uint8Array(ptMWE.buffer, hashPos, 16);
  return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
