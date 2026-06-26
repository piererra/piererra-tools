# =============================================================
# core.py — NFSU2 Save Data Editor by Piererra
# Python port of ptSDE-core.js
#
# Binary read/write engine for NFSU2 save files (.sav)
#
# Public API (via SaveEditor class):
#   load_save(path)              -> None (raises on invalid file)
#   get_save_info()              -> dict {name, money, slots, header_ok, size, filename}
#   is_slot_in_use(slot_idx)     -> bool
#   set_name(str)
#   set_money(n)
#   set_slot_perf(slot_idx, mode)  mode: 'nil' | 'max'
#   unlock_slot(slot_idx)
#   unlock_all_slots()
#   unlock_all_parts()
#   max_money()
#   download_save(out_path)
#   download_backup(out_path)
#   create_profile(name, money, car_key, unlock_parts)
#   clone_save(name, out_path)
#   is_loaded()                  -> bool
# =============================================================

import struct
import re
import os
import base64
from copy import deepcopy


# -------------------------------------------------------------
# OFFSETS — derived from community research + save analysis
# -------------------------------------------------------------

HEADER_OFFSET       = 0x0000
HEADER_MAGIC        = bytes([0x32, 0x30, 0x43, 0x4D])   # "20CM"

MONEY_OFFSET        = 0xA16A  # signed int32 little-endian

NAME_OFFSET         = 0xD225  # null-terminated ASCII
NAME_READ_LEN       = 16      # max bytes to read
NAME_WRITE_LEN      = 7       # game engine hard limit

SLOT_BASE           = 0x5AEC
SLOT_SIZE           = 0x7F2
SLOT_COUNT          = 5
SLOT_INUSE          = 0x0000  # relative to slot base

# Performance upgrade floats (10.0 = 00 00 20 41 = safe max)
PERF_UPGRADE_FLOATS = [
    0x044, 0x048, 0x04C, 0x050, 0x054, 0x058, 0x05C, 0x060, 0x064,
]
PERF_FLAGS_START    = 0x094
PERF_FLAGS_SIZE     = 0x038
PERF_COUNTER_1      = 0x1AC
PERF_COUNTER_2      = 0x1E8
PERF_COUNTER_3      = 0x200

# Parts blocks (8 × 0x10 bytes per slot)
PARTS_OFFSETS = [
    0x0234, 0x0244, 0x0254, 0x0264,
    0x0274, 0x0284, 0x0294, 0x02A4,
]
PARTS_BLOCK_SIZE    = 0x10

# Active car region (absolute offsets)
CAR_REGION_MIN      = 0x5870
CAR_REGION_MAX      = 0xC3E6

# Float bytes for 10.0 in IEEE 754 LE
FLOAT_10            = bytes([0x00, 0x00, 0x20, 0x41])
FLOAT_0             = bytes([0x00, 0x00, 0x00, 0x00])

# Counter values
COUNTER_1_MAX       = bytes([0x00, 0x01, 0x00, 0x00])
COUNTER_23_MAX      = bytes([0x00, 0x00, 0x00, 0x01])
COUNTER_ZERO        = bytes([0x00, 0x00, 0x00, 0x00])

# All 5 slot ranges as (start, end) tuples — for car injection safety check
SLOT_RANGES = [
    (SLOT_BASE + i * SLOT_SIZE, SLOT_BASE + i * SLOT_SIZE + SLOT_SIZE)
    for i in range(SLOT_COUNT)
]


# -------------------------------------------------------------
# HELPERS
# -------------------------------------------------------------

def _slot_offset(slot_idx: int) -> int:
    return SLOT_BASE + slot_idx * SLOT_SIZE


def _in_slot_range(off: int) -> bool:
    return any(s <= off < e for s, e in SLOT_RANGES)


def _clean_name(name: str) -> str:
    """Sanitise profile name: uppercase, alphanumeric only, max 7 chars."""
    return re.sub(r'[^A-Za-z0-9]', '', name)[:NAME_WRITE_LEN].upper()


def _hex_to_bytes(hex_str: str) -> bytes:
    clean = re.sub(r'\s+', '', hex_str)
    return bytes.fromhex(clean)


def _bytes_to_hex(data: bytes) -> str:
    return ' '.join(f'{b:02X}' for b in data)


# -------------------------------------------------------------
# SAVE EDITOR CLASS
# -------------------------------------------------------------

class SaveEditor:
    """
    Binary engine for NFSU2 save files.
    All edit methods operate on an in-memory bytearray.
    Call download_save() / clone_save() to write to disk.
    """

    def __init__(self):
        self._buf: bytearray | None = None   # working copy
        self._orig: bytes | None    = None   # original bytes (for backup)
        self._filename: str         = ''

    # ----------------------------------------------------------
    # LOAD & VALIDATE
    # ----------------------------------------------------------

    def load_save(self, path: str) -> None:
        """
        Load a save file from disk.
        Raises ValueError if the file fails header validation.
        """
        with open(path, 'rb') as f:
            data = f.read()

        self._orig     = data
        self._buf      = bytearray(data)
        self._filename = os.path.basename(path)

        if not self._validate_header():
            self._buf  = None
            self._orig = None
            raise ValueError(
                'Invalid save file: header mismatch. '
                'Make sure this is an NFSU2 save.'
            )

    def _validate_header(self) -> bool:
        if self._buf is None or len(self._buf) < 6:
            return False
        if self._buf[HEADER_OFFSET:HEADER_OFFSET + 4] != HEADER_MAGIC:
            return False
        low16 = struct.unpack_from('<H', self._buf, 0x0004)[0]
        return low16 == (len(self._buf) & 0xFFFF)

    # ----------------------------------------------------------
    # NAME
    # ----------------------------------------------------------

    def _read_name(self) -> str:
        chunk = self._buf[NAME_OFFSET:NAME_OFFSET + NAME_READ_LEN]
        name  = ''
        for b in chunk:
            if b == 0x00:
                break
            name += chr(b)
        return name or '?'

    def _write_name(self, name: str) -> None:
        clean = _clean_name(name) or 'PLAYER'
        for i in range(NAME_READ_LEN):
            self._buf[NAME_OFFSET + i] = ord(clean[i]) if i < len(clean) else 0x00

    # ----------------------------------------------------------
    # MONEY
    # ----------------------------------------------------------

    def _read_money(self) -> int:
        return struct.unpack_from('<i', self._buf, MONEY_OFFSET)[0]

    def _write_money(self, n: int) -> None:
        n = max(0, min(int(n), 2_147_483_647))
        struct.pack_into('<i', self._buf, MONEY_OFFSET, n)

    # ----------------------------------------------------------
    # CAR SLOTS
    # ----------------------------------------------------------

    def _slot_in_use(self, slot_idx: int) -> bool:
        off = _slot_offset(slot_idx) + SLOT_INUSE
        return self._buf[off] != 0x00

    def _unlock_slot(self, slot_idx: int) -> None:
        off = _slot_offset(slot_idx) + SLOT_INUSE
        self._buf[off] = 0x01

    def _read_slot_info(self) -> dict:
        in_use = sum(1 for i in range(SLOT_COUNT) if self._slot_in_use(i))
        return {'total': SLOT_COUNT, 'in_use': in_use}

    # ----------------------------------------------------------
    # PERFORMANCE
    # ----------------------------------------------------------

    def _set_slot_perf(self, slot_idx: int, mode: str) -> None:
        base = _slot_offset(slot_idx)

        if mode == 'max':
            # Write 10.0 float into each upgrade float position
            for rel_off in PERF_UPGRADE_FLOATS:
                self._buf[base + rel_off:base + rel_off + 4] = FLOAT_10

            # Unlock flags → 0x01
            for i in range(PERF_FLAGS_SIZE):
                self._buf[base + PERF_FLAGS_START + i] = 0x01

            # Counters
            self._buf[base + PERF_COUNTER_1:base + PERF_COUNTER_1 + 4] = COUNTER_1_MAX
            self._buf[base + PERF_COUNTER_2:base + PERF_COUNTER_2 + 4] = COUNTER_23_MAX
            self._buf[base + PERF_COUNTER_3:base + PERF_COUNTER_3 + 4] = COUNTER_23_MAX

        else:  # 'nil'
            # Zero all upgrade floats
            for rel_off in PERF_UPGRADE_FLOATS:
                self._buf[base + rel_off:base + rel_off + 4] = FLOAT_0

            # Zero unlock flags
            for i in range(PERF_FLAGS_SIZE):
                self._buf[base + PERF_FLAGS_START + i] = 0x00

            # Zero counters
            self._buf[base + PERF_COUNTER_1:base + PERF_COUNTER_1 + 4] = COUNTER_ZERO
            self._buf[base + PERF_COUNTER_2:base + PERF_COUNTER_2 + 4] = COUNTER_ZERO
            self._buf[base + PERF_COUNTER_3:base + PERF_COUNTER_3 + 4] = COUNTER_ZERO

    # ----------------------------------------------------------
    # PARTS
    # ----------------------------------------------------------

    def _unlock_all_parts(self) -> None:
        for s in range(SLOT_COUNT):
            base = _slot_offset(s)
            for rel_off in PARTS_OFFSETS:
                abs_off = base + rel_off
                self._buf[abs_off:abs_off + PARTS_BLOCK_SIZE] = bytes([0xFF] * PARTS_BLOCK_SIZE)

    # ----------------------------------------------------------
    # CAR INJECTION (active car region — absolute offsets)
    # ----------------------------------------------------------

    def _inject_active_car(self, car_data: dict) -> bool:
        if not car_data or 'blocks' not in car_data or not car_data['blocks']:
            return False

        # Sort ascending for safe write order
        sorted_blocks = sorted(car_data['blocks'], key=lambda b: b['off'])

        for block in sorted_blocks:
            raw_off = block['off']
            off     = int(raw_off, 16) if isinstance(raw_off, str) else int(raw_off)
            data    = _hex_to_bytes(block['hex'])

            if off < CAR_REGION_MIN:
                continue
            if _in_slot_range(off):
                continue   # would corrupt career mode car data
            if off + len(data) > len(self._buf):
                continue

            self._buf[off:off + len(data)] = data

        return True

    # ----------------------------------------------------------
    # TEMPLATE — decode base64 template for new saves
    # ----------------------------------------------------------

    def _decode_template(self) -> bytearray:
        from nfsu2_editor.template import TEMPLATE_B64
        raw = base64.b64decode(TEMPLATE_B64)
        return bytearray(raw)

    # ----------------------------------------------------------
    # CREATE PROFILE
    # ----------------------------------------------------------

    def create_profile(
        self,
        name: str,
        money: int,
        car_key: str | None,
        unlock_parts: bool,
        out_path: str,
    ) -> None:
        """
        Generate a new NFSU2 save from the blank template and write to out_path.
        Does NOT overwrite the currently loaded save.
        """
        clean  = _clean_name(name) or 'PLAYER'
        new_buf = self._decode_template()

        # Swap buffer temporarily so shared write helpers work
        prev_buf      = self._buf
        self._buf     = new_buf

        try:
            self._write_name(clean)
            self._write_money(max(0, min(int(money or 0), 2_147_483_647)))

            if car_key:
                try:
                    from nfsu2_editor.cars import find_car_by_key
                    car = find_car_by_key(car_key)
                    if car:
                        self._inject_active_car(car)
                except ImportError:
                    pass  # cars module not available — keep Peugeot 206 default

            if unlock_parts:
                self._unlock_all_parts()

            with open(out_path, 'wb') as f:
                f.write(bytes(self._buf))

        finally:
            self._buf = prev_buf   # always restore — never corrupt a loaded save

    # ----------------------------------------------------------
    # CLONE SAVE
    # ----------------------------------------------------------

    def clone_save(self, name: str, out_path: str) -> None:
        """Copy the loaded save with a new profile name and write to out_path."""
        if self._buf is None:
            raise RuntimeError('No save loaded')
        clean     = _clean_name(name) or 'CLONE'
        clone_buf = bytearray(self._buf)

        prev_buf  = self._buf
        self._buf = clone_buf
        try:
            self._write_name(clean)
            with open(out_path, 'wb') as f:
                f.write(bytes(self._buf))
        finally:
            self._buf = prev_buf

    # ----------------------------------------------------------
    # SAVE / BACKUP TO DISK
    # ----------------------------------------------------------

    def download_save(self, out_path: str) -> None:
        """Write the current (edited) save to out_path."""
        if self._buf is None:
            raise RuntimeError('No save loaded')
        with open(out_path, 'wb') as f:
            f.write(bytes(self._buf))

    def download_backup(self, out_path: str) -> None:
        """Write the original unmodified bytes to out_path."""
        if self._orig is None:
            raise RuntimeError('No save loaded')
        with open(out_path, 'wb') as f:
            f.write(self._orig)

    # ----------------------------------------------------------
    # PUBLIC INTERFACE
    # ----------------------------------------------------------

    def is_loaded(self) -> bool:
        return self._buf is not None

    def get_save_info(self) -> dict | None:
        if self._buf is None:
            return None
        return {
            'name':      self._read_name(),
            'money':     self._read_money(),
            'slots':     self._read_slot_info(),
            'header_ok': self._validate_header(),
            'size':      len(self._buf),
            'filename':  self._filename,
        }

    def is_slot_in_use(self, slot_idx: int) -> bool:
        if self._buf is None:
            return False
        return self._slot_in_use(slot_idx)

    def set_name(self, name: str) -> None:
        if self._buf:
            self._write_name(name)

    def set_money(self, n: int) -> None:
        if self._buf:
            self._write_money(n)

    def set_slot_perf(self, slot_idx: int, mode: str) -> None:
        if self._buf:
            self._set_slot_perf(slot_idx, mode)

    def unlock_slot(self, slot_idx: int) -> None:
        if self._buf:
            self._unlock_slot(slot_idx)

    def unlock_all_slots(self) -> None:
        if self._buf:
            for i in range(SLOT_COUNT):
                self._unlock_slot(i)

    def unlock_all_parts(self) -> None:
        if self._buf:
            self._unlock_all_parts()

    def max_money(self) -> None:
        if self._buf:
            self._write_money(2_147_483_647)
