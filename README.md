# Piererra Tools

> **A personal web toolbox — open source, browser-native, no installs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](LICENSE)
[![Status: Active](https://img.shields.io/badge/Status-Active-00f5ff.svg)](#)
[![Built with: Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-ff2d78.svg)](#)
[![Tools: 2 Active](https://img.shields.io/badge/Tools-2%20Active-7dff00.svg)](#tools)
[![i18n: 75+ Languages](https://img.shields.io/badge/i18n-75%2B%20Languages-7dff00.svg)](#i18n-system)
[![Desktop: Python + tkinter](https://img.shields.io/badge/Desktop-Python%20%2B%20tkinter-7dff00.svg)](#desktop-app)

Piererra Tools is a growing collection of browser-based utilities built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build steps, no installs. Each tool runs fully client-side, meaning your data never leaves your device. A standalone desktop version of the NFSU2 Save Editor is also available as a compiled `.exe`.

---

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
  - [Tool 01 — NFSU2 Save Editor](#tool-01--nfsu2-save-data-editor)
  - [Tool 02 — NFSMW Save Editor](#tool-02--nfsmw-save-editor)
- [Project Structure](#project-structure)
- [Desktop App](#desktop-app)
- [i18n System](#i18n-system)
- [Design System](#design-system)
- [Open Source](#open-source)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

Piererra Tools started as a personal toolbox and is now shared openly for anyone who needs lightweight, no-nonsense browser utilities. The portal acts as a hub — each tool is self-contained in its own HTML page, styled with a unique accent colour and typography while sharing the same zero-dependency philosophy.

**Core principles:**
- Zero server calls — everything runs in your browser
- Zero runtime dependencies — no npm, no bundler, no CDN required for core logic
- Privacy-first — your files and data never touch a server
- Mobile-friendly — works on any modern browser including Android
- Multilingual — 75+ language selector with localStorage persistence
- Desktop-ready — Python desktop app compilable to a standalone `.exe`

---

## Tools

### Tool 01 — NFSU2 Save Data Editor

**File:** `nfsu2-editor.html`  
**Status:** Active · Fully tested  
**Accent colour:** Lime `#7DFF00`  
**Desktop:** `main.py` / `NFSU2-SaveEditor.exe`

A full-featured save file editor for **Need for Speed Underground 2** (PC). Available as a browser tool and as a standalone Windows desktop app.

<details>
<summary><strong>Feature list</strong></summary>

| Feature | Description |
|---|---|
| **Create New Save** | Generate a blank NFSU2 save from scratch — no existing file needed. Enter a 1–7 character alphanumeric profile name and download instantly. |
| **Load Existing Save** | Drag-and-drop or click-to-browse your save file. Validates the `20CM` magic header and size checksum before accepting. |
| **Auto-Backup on Load** | Optionally download the original file as `.bak` before any edits are made. Enabled by default. |
| **Profile Name Edit** | Change your profile name (max 7 alphanumeric characters). Input is auto-sanitized and uppercased. |
| **Money Edit** | Set money to any value from 0 to 2,147,483,647 (signed 32-bit max). |
| **Max Money (Cheat)** | One-click shortcut to set money to the signed 32-bit maximum. |
| **Car Slot Viewer** | Visual grid showing all 5 car slots — in use or empty, with per-slot controls. |
| **MAX Performance** | Fill all performance upgrade blocks for a slot. |
| **NIL Performance** | Zero all performance upgrade blocks for a slot. |
| **Unlock Slot** | Activate an empty car slot by flipping its in-use flag. |
| **Unlock All Car Slots** | Unlock all 5 slots in one click. |
| **Unlock All Parts** | Every upgrade unlocked across all 5 slots. |
| **Clone Save** | Copy the loaded save under a new profile name. |
| **Apply & Download** | Commits name + money edits, downloads the modified save. |
| **Download Backup** | Save the original unmodified file as `.bak` at any time. |

</details>

<details>
<summary><strong>How to use (web)</strong></summary>

1. Open `nfsu2-editor.html` in any modern browser.
2. **Create a new save:** Enter a profile name in the *Create New Save* section and click **Create & Download**.
3. **Edit an existing save:** Drop your save file onto the dropzone or click to browse. Enable *Auto-backup* to download a `.bak` before editing.
4. Make your edits — name, money, car slots, cheats.
5. Click **Apply All & Download** to get the modified save.

**Save file path (Windows):**
```
%LOCALAPPDATA%\NFS Underground 2\<ProfileName>\<ProfileName>
```
The save file has no extension — just the profile name as the filename.

</details>

<details>
<summary><strong>How to use (desktop .exe)</strong></summary>

1. Run `NFSU2-SaveEditor.exe` (or `python main.py`).
2. Click **Load Save File** to open your save.
3. Edit name, money, slots, or use the cheat buttons.
4. Click **Apply & Save** to write the modified file to disk.

See the [Desktop App](#desktop-app) section for build instructions.

</details>

<details>
<summary><strong>Technical — binary offsets & save format</strong></summary>

**File validation**
- Magic header: bytes `0x0000–0x0003` = `32 30 43 4D` (ASCII `20CM`)
- Size checksum: low 16 bits of `uint32` at `0x0004` must equal actual file size

**Key offsets (all little-endian)**

| Field | Offset | Type | Notes |
|---|---|---|---|
| Magic header | `0x0000` | `char[4]` | `20CM` |
| Size field | `0x0004` | `uint32` | Low 16 bits = file size |
| Money | `0xA16A` | `int32` | Signed, max 2,147,483,647 |
| Profile name | `0xD225` | `char[16]` | Null-terminated, max 7 usable chars |
| Car slots base | `0x5AEC` | — | 5 slots × `0x7F2` bytes each |
| Performance blocks | slot + `0x0000` | `uint8[0x40]` | 8 blocks of 64 bytes |
| Parts blocks | slot + `0x0234` | `uint8[0x10]` | 8 blocks of 16 bytes |

**Car injection**
- Slot-relative binary patches. Safe to apply to any of the 5 slots.
- 49 cars total: 27 standard + 22 custom/story cars.

</details>

---

### Tool 02 — NFSMW Save Editor

**File:** `nfsmw-editor.html`  
**Status:** Active · Fully tested  
**Accent colour:** Orange `#FF8C00`  
**Font:** EurostileBold (loaded from jsDelivr CDN — no local font file)  
**Supported platforms:** PC (v1.3 EN) · PS2

A full-featured save file editor for **Need for Speed Most Wanted 2005**. Edits money, pursuit bounty, case name, infractions, lifetime pursuit stats, single-best pursuit record, per-car records, and per-pursuit history — all in the browser. No install required. PC and PS2 save formats supported.

<details>
<summary><strong>Feature list</strong></summary>

| Feature | Description |
|---|---|
| **Load Save File** | Drag-and-drop or click-to-browse your NFSMW save. File size is validated against the expected size for the selected platform before proceeding. |
| **Platform Toggle** | Switch between PC and PS2 mode before loading. Each platform has its own byte offsets — toggling reconfigures the offset map. |
| **Auto-Backup on Load** | Optionally download the original file as `.bak` immediately after loading. Enabled by default. |
| **Info Bar** | Displays case name, money, bounty, platform, file size, and MD5 hash (first 8 chars) after a file is loaded. |
| **Money Edit** | Set money to any value from 0 to 4,294,967,295 (unsigned 32-bit max). |
| **Pursuit Bounty Edit** | Set the lifetime pursuit bounty to any unsigned 32-bit value. |
| **Case Name Edit** | Edit your in-game case name (max 12 characters). Alphanumeric, spaces, dashes, and underscores allowed. |
| **Infractions** | Edit all 8 lifetime infraction types (Uint16 each): Speeding, Excessive Speeding, Reckless Driving, Ramming a Police Vehicle, Hit and Run, Damage to Property, Resisting Arrest, Driving Off Roadway. |
| **Lifetime Pursuit Stats** | Edit 8 cumulative pursuit fields: length, police involved, police damaged, police immobilized, spike strips dodged, roadblocks dodged, helicopters deployed, cost to state. |
| **Single Best Pursuit** | Edit 10 single-pursuit record fields — same as lifetime plus infractions recorded and bounty achieved. |
| **Per-Car Records** | Each active car slot (up to 6) shows a bounty field and all 8 infraction types for that car. Empty slots (first byte = `0xFF`) are skipped. |
| **Pursuit Records** | Up to 5 individual pursuit history entries, each with 10 editable stat fields. |
| **MD5 Auto-Rehash** | Every write operation automatically recalculates the MD5 over the content region (`0x34` → file end − 16) and writes the new digest to the last 16 bytes of the save. The game validates this on load. |
| **Apply All & Download** | Downloads the modified save with the correct filename. |
| **Download Backup (.bak)** | Downloads the current buffer (including any edits) as a `.bak` file. |

</details>

<details>
<summary><strong>How to use</strong></summary>

1. Open `nfsmw-editor.html` in any modern browser.
2. Select your platform — **PC** or **PS2** — using the toggle buttons.
3. Drop your save file onto the dropzone or click to browse.
4. The info bar will show name, money, bounty, platform, size, and hash.
5. Edit any fields across the Profile, Infractions, Pursuit Stats, Per-Car Records, or Pursuit Records sections.
6. Each field applies on blur — changes are written immediately to the in-memory buffer and the MD5 is recalculated.
7. Click **Apply All & Download** to save the modified file.

**Save file path (PC, Windows):**
```
%USERPROFILE%\Documents\NFS Most Wanted\
```

**Save file path (PS2):**
Depends on your memory card manager. The file is named `NFSMW-SAVE` or similar depending on region.

</details>

<details>
<summary><strong>Technical — binary offsets & save format</strong></summary>

**File sizes**

| Platform | Size (bytes) |
|---|---|
| PC (v1.3 EN) | 63,596 |
| PS2 | 62,689 |

**MD5 hash**
- Covers bytes `0x34` through `fileSize − 17` (content region).
- Digest (16 bytes) stored at the last 16 bytes of the file.
- Recalculated and rewritten on every edit by `ptMWE-core.js`.

**Key offsets**

> PC offset listed first, PS2 in parentheses where different.

| Field | Offset (PC) | Offset (PS2) | Type | Notes |
|---|---|---|---|---|
| Money | `0x4039` | `0x4039` | `uint32 LE` | Unsigned 32-bit |
| Case name | `0x429D` | `0x429D` | `char[12]` | Null-terminated |
| Display name | `0x5A31` | `0x5A31` | `char[8]` | Read-only in editor |
| Pursuit bounty | `0xE865` | `0xE8A1` | `uint32 LE` | |
| Infractions base | `0xE86D` | `0xE8A9` | `uint16 LE` × 8 | 8 contiguous fields, 2 bytes each |
| Cars block base | `0xE2ED` | `0xE329` | — | 6 slots × 56 bytes |
| Pursuits block base | `0xF2BA` | `0xF2F9` | — | Stats block; also houses lifetime / single-best |
| MD5 hash | `0xF874` | last 16 bytes | `uint8[16]` | Auto-rewritten on every edit |

**Car slot struct (56 bytes each)**

| Relative offset | Field | Type |
|---|---|---|
| `+0x00` | Car ID string | `char[16]` (null-terminated) |
| `+0x10` | Car bounty | `uint32 LE` |
| `+0x14` | Unknown | `uint32` |
| `+0x18` | Infractions (×8) | `uint16 LE` × 8 |

Slot is skipped if the first byte of the car ID equals `0xFF`.

**Pursuit record struct (56 bytes each)**

| Relative offset | Field | Type |
|---|---|---|
| `+0x00` | Pursuit ID string | `char[12]` (null-terminated) |
| `+0x0C` | Length | `uint32 LE` |
| `+0x10` | Bounty achieved | `uint32 LE` |
| `+0x14` | Unknown | `uint32` |
| `+0x18` | Police involved | `uint32 LE` |
| `+0x1C` | Police damaged | `uint32 LE` |
| `+0x20` | Police immobilized | `uint32 LE` |
| `+0x24` | Roadblocks dodged | `uint32 LE` |
| `+0x28` | Spike strips dodged | `uint32 LE` |
| `+0x2C` | Cost to state | `uint32 LE` |
| `+0x30` | Infractions recorded | `uint32 LE` |
| `+0x34` | Helicopters deployed | `uint32 LE` |

**JS module split**

| File | Responsibility |
|---|---|
| `ptMWE-core.js` | MD5 engine, offset map, `DataView` read/write, `mweLoadFile()`, `mweSnapshot()`, all write helpers, `mweRehash()`, `mweDownload()` |
| `ptMWE-ui.js` | DOM wiring, dropzone, platform toggle, field rendering, toast, download buttons, language selector |

</details>

---

## Project Structure

### Web files

```
piererra-tools/
│
├── index.html                  # Portal homepage — tool card grid
├── nfsu2-editor.html           # NFSU2 Save Editor page (Tool 01)
├── nfsmw-editor.html           # NFSMW Save Editor page (Tool 02)
│
├── css/
│   ├── portal.css              # Cyberpunk portal theme
│   ├── nfsu2-editor.css        # NFSU2 editor theme (lime accent)
│   └── nfsmw-editor.css        # NFSMW editor theme (orange accent, EurostileBold)
│
├── js/
│   ├── pt-i18n.js              # Shared i18n system — 75+ language selector, 30 full translations
│   │
│   ├── ptSDE-core.js           # NFSU2 — binary engine (read/write/validate/create/clone)
│   ├── ptSDE-ui.js             # NFSU2 — DOM wiring, events, rendering, toasts
│   ├── ptSDE-cars.js           # NFSU2 — 49-car database with binary patch data
│   ├── ptSDE-template.js       # NFSU2 — base64-encoded blank save template
│   │
│   ├── ptMWE-core.js           # NFSMW — binary engine + MD5 + offset map + write helpers
│   └── ptMWE-ui.js             # NFSMW — DOM wiring, dynamic field rendering, toasts
│
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── googlec52b3a73db4c4f44.html
```

### Desktop files (NFSU2 only)

```
piererra-tools-desktop/
│
├── main.py                     # Entry point — run directly or compile with PyInstaller
├── build.bat                   # One-click build script → dist\NFSU2-SaveEditor.exe
│
└── nfsu2_editor/
    ├── __init__.py             # Python package marker
    ├── core.py                 # Binary engine — Python port of ptSDE-core.js
    ├── cars.py                 # Car database — Python port of ptSDE-cars.js (49 cars)
    ├── template.py             # Blank save — Python port of ptSDE-template.js
    └── app.py                  # tkinter GUI — 15 languages, NFSU2 dark-lime theme
```

<details>
<summary><strong>Detailed file descriptions — web JS</strong></summary>

#### `js/pt-i18n.js`
Self-contained IIFE exposing `window.ptI18n`. Contains 30 full translation sets (85 keys each). Exposes:
- `t(key, vars)` — key lookup with optional `{variable}` interpolation
- `setLang(code)` — switch language, apply to DOM, persist to `localStorage`
- `init()` — reads `localStorage`, syncs the language selector, applies all translations
- Updates `<html lang>` on every switch for correct RTL/LTR rendering.

#### `js/ptSDE-core.js`
Binary engine for NFSU2. Exposes `window.ptSDE`. Handles:
- Header validation (`20CM` magic + size checksum)
- Profile name and money read/write
- Slot management (in-use flag, 5 slots)
- Performance blocks (8 × 64 bytes per slot)
- Parts blocks (8 × 16 bytes per slot)
- Car injection (49 cars, slot-relative patch blocks)
- New save creation from base64 template
- Save cloning (copy buffer, rewrite profile name)
- Browser download via `Blob` + `URL.createObjectURL`

#### `js/ptSDE-ui.js`
DOM layer for NFSU2. Wires all HTML elements to `ptSDE` methods. All user-visible strings go through `ptI18n.t()` — no hardcoded English. Handles dropzone, file input, slot grid rendering, modal (create new profile + car select), clone section, cheat buttons, download.

#### `js/ptSDE-cars.js`
49-car database (27 standard + 22 custom/story cars). Each entry contains a key, display name, and slot-relative binary patch blocks. Exposes `window.ptSDE_CARS` with `getAll()` and `findByKey(key)`.

#### `js/ptSDE-template.js`
Single assignment `window.ptSDE_TEMPLATE` — a base64 string that decodes to a 54,966-byte blank NFSU2 save with a valid `20CM` header and size checksum. Used by `ptSDE-core.js` when creating a new profile.

#### `js/ptMWE-core.js`
Binary engine for NFSMW. Exposes globals: `ptMWE` (state), `mweLoadFile()`, `mweSnapshot()`, and individual write helpers (`mweSetMoney`, `mweSetBounty`, `mweSetCaseName`, `mweSetInfraction`, `mweSetLifetime`, `mweSetSingleBest`, `mweSetCarBounty`, `mweSetCarInfraction`, `mweSetPursuitStat`). Contains a self-contained MD5 implementation — no external library. Every write helper calls `mweRehash()` automatically.

#### `js/ptMWE-ui.js`
DOM layer for NFSMW. Handles dropzone, platform toggle, info bar, dynamic grid rendering for infractions / lifetime / single-best / per-car / per-pursuit sections, profile field events, toast system, download buttons, and language selector wiring.

</details>

<details>
<summary><strong>Detailed file descriptions — desktop (NFSU2)</strong></summary>

#### `nfsu2_editor/core.py`
Python port of `ptSDE-core.js`. `SaveEditor` class with full public API — same binary offsets, same logic. Uses Python `struct` and `bytearray`. No external dependencies.

#### `nfsu2_editor/cars.py`
Python port of `ptSDE-cars.js`. All 49 cars. Exposes `get_all()`, `find_car_by_key(key)`, `get_car_names()`.

#### `nfsu2_editor/template.py`
Python port of `ptSDE-template.js`. `TEMPLATE_B64` — same 54,966-byte blank save as base64. Stored as implicit string concatenation for GitHub compatibility.

#### `nfsu2_editor/app.py`
Full tkinter GUI. NFSU2 dark-lime theme matching the web version. 15-language i18n. Sections: load/backup, info bar, profile edit, car slots (5 cards with MAX/NIL/UNLOCK per slot), cheats, clone, create new profile (with 49-car dropdown). Toast notification system. Language switcher in the header.

</details>

---

## Desktop App

The desktop version is a standalone Windows `.exe` built from Python + tkinter. It replicates all features of the web NFSU2 editor with a native desktop UI — no browser needed.

> **Note:** The desktop app covers Tool 01 (NFSU2) only. Tool 02 (NFSMW) is web-only.

### Requirements

- Windows 10 or later (or Wine / Winlator on Android)
- Python 3.10+ (only needed to build the `.exe`, not to run it)
- PyInstaller (installed automatically by `build.bat`)

<details>
<summary><strong>Build instructions</strong></summary>

**Step 1 — Install Python**

Download from [python.org](https://www.python.org/downloads/). During install, check **"Add Python to PATH"**.

**Step 2 — Check your folder structure**

```
piererra-tools-desktop/
├── main.py
├── build.bat
└── nfsu2_editor/
    ├── __init__.py
    ├── core.py
    ├── cars.py
    ├── template.py
    └── app.py
```

**Step 3 — Run the build**

Double-click `build.bat`. It will:
1. Check Python is installed
2. Auto-install PyInstaller if missing (`pip install pyinstaller`)
3. Clean any previous build output
4. Run PyInstaller with the correct flags
5. Open the `dist\` folder when done

**Step 4 — Get your .exe**

```
dist\
└── NFSU2-SaveEditor.exe   ← standalone executable (~8–12 MB)
```

The `.exe` is fully self-contained — no Python installation needed on the target machine.

**Manual build command (optional)**

```bat
pyinstaller --onefile --windowed --name "NFSU2-SaveEditor" --add-data "nfsu2_editor;nfsu2_editor" main.py
```

| Flag | Purpose |
|---|---|
| `--onefile` | Bundle everything into a single `.exe` |
| `--windowed` | No console window behind the GUI |
| `--name` | Output filename |
| `--add-data` | Include the `nfsu2_editor` package inside the bundle |

</details>

<details>
<summary><strong>Running without compiling</strong></summary>

You can run the app directly with Python (no build needed):

```bash
python main.py
```

</details>

<details>
<summary><strong>Running on Android (Winlator)</strong></summary>

The compiled `.exe` can be run inside **Winlator** (Android Wine environment):

1. Copy `NFSU2-SaveEditor.exe` to your Winlator container.
2. Open it via the Winlator file manager or terminal.
3. The tkinter GUI renders via Wine's GDI layer.

> Performance may vary depending on Box64 translation overhead. File picker dialogs work under Wine but may look different from native Windows.

</details>

<details>
<summary><strong>Desktop i18n (15 languages)</strong></summary>

The desktop app includes its own translation system in `app.py`, separate from the web `pt-i18n.js`:

| Code | Language | Code | Language |
|---|---|---|---|
| `en` | English | `ko` | 한국어 |
| `fr` | Français | `ar` | العربية |
| `es` | Español | `it` | Italiano |
| `de` | Deutsch | `tr` | Türkçe |
| `pt` | Português | `id` | Bahasa Indonesia |
| `ru` | Русский | `pl` | Polski |
| `zh` | 中文 (简体) | `nl` | Nederlands |
| `ja` | 日本語 | | |

Switching languages via the header dropdown rebuilds the UI instantly.

</details>

---

## i18n System

Both editors share `js/pt-i18n.js` — a self-contained internationalization engine with 30 full translation sets and a 75+ language selector widget.

<details>
<summary><strong>How it works</strong></summary>

**HTML attributes**

```html
<!-- Sets textContent -->
<h2 data-i18n="section.cheats">Cheats</h2>

<!-- Sets placeholder -->
<input data-i18n-placeholder="drop.title" />

<!-- Sets title attribute -->
<select data-i18n-title="lang.selector.title"></select>

<!-- Sets aria-label -->
<button data-i18n-label="btn.unlock_slot"></button>
```

**JavaScript usage**

```javascript
// Simple key lookup
toast(ptI18n.t('toast.no_save'), 'err');

// With variable interpolation
toast(ptI18n.t('toast.slot_maxed', { n: slot + 1 }), 'ok');
toast(ptI18n.t('toast.cloned',     { name: name }), 'ok');
```

**Page boot**

```javascript
document.addEventListener('DOMContentLoaded', function () {
  ptI18n.init(); // reads localStorage, syncs selector, applies all translations
});
```

`init()` reads `pt-lang` from `localStorage`, syncs the language dropdown, and walks the entire DOM applying translations. Switching languages via the dropdown calls `ptI18n.setLang(code)` which re-applies all attributes and persists the selection.

</details>

<details>
<summary><strong>30 fully translated languages</strong></summary>

| Code | Language | Code | Language |
|---|---|---|---|
| `en` | English | `ko` | 한국어 |
| `fr` | Français | `ar` | العربية |
| `es` | Español | `hi` | हिन्दी |
| `de` | Deutsch | `it` | Italiano |
| `pt` | Português | `nl` | Nederlands |
| `ru` | Русский | `pl` | Polski |
| `zh-hans` | 中文 (简体) | `tr` | Türkçe |
| `zh-hant` | 中文 (繁體) | `id` | Bahasa Indonesia |
| `ja` | 日本語 | `vi` | Tiếng Việt |
| `th` | ภาษาไทย | `uk` | Українська |
| `sv` | Svenska | `da` | Dansk |
| `fi` | Suomi | `no` | Norsk |
| `cs` | Čeština | `hu` | Magyar |
| `ro` | Română | `el` | Ελληνικά |
| `ms` | Bahasa Melayu | `fa` | فارسی |

</details>

<details>
<summary><strong>Language selector widget (75+ languages)</strong></summary>

Both editor pages include a language selector dropdown with 75+ languages grouped by region: Common, Europe, Americas, Middle East, Africa, Asia & Pacific. Selecting a language:
- Saves the choice to `localStorage` under `pt-lang`
- Re-translates all `data-i18n*` DOM elements instantly
- Updates `<html lang>` for correct RTL/LTR rendering
- Persists across pages and reloads

Languages without a full translation set fall back to English gracefully.

</details>

---

## Design System

<details>
<summary><strong>Portal theme tokens (portal.css)</strong></summary>

```css
--bg-deep:   #0a0a0f   /* page background */
--bg-panel:  #0f0f1a   /* card/panel background */
--bg-card:   #13131f   /* inner card background */
--cyan:      #00f5ff   /* primary accent */
--magenta:   #ff2d78   /* secondary accent */
--text-main: #e0e0f0   /* body text */
--text-muted:#5a5a7a   /* secondary text */
--border:    #1e1e30   /* borders */
--font-mono: "Courier New", Courier, "Lucida Console", monospace
```

</details>

<details>
<summary><strong>NFSU2 editor theme tokens (nfsu2-editor.css)</strong></summary>

```css
--bg-deep:        #080A10
--bg-panel:       rgba(12, 15, 24, 0.82)
--bg-panel-solid: #0C0F18
--bg-card:        rgba(16, 20, 32, 0.88)
--bg-input:       rgba(7, 9, 16, 0.95)
--lime:           #7DFF00   /* primary accent */
--gold:           #E0B030   /* money accent */
--blue:           #4A9EFF   /* info accent */
--red:            #FF4040   /* danger / nil accent */
--text-main:      #CDD3E8
--text-muted:     #424B68
```

Same palette replicated in `app.py`'s `Theme` class for the desktop app.

</details>

<details>
<summary><strong>NFSMW editor theme tokens (nfsmw-editor.css)</strong></summary>

```css
--bg-deep:        #080A10
--bg-panel:       rgba(12, 15, 24, 0.82)
--bg-panel-solid: #0C0F18
--bg-card:        rgba(16, 20, 32, 0.88)
--bg-input:       rgba(7, 9, 16, 0.95)
--lime:           #7DFF00   /* Piererra brand / back link / checkbox */
--gold:           #E0B030   /* money field accent */
--orange:         #FF8C00   /* primary accent — pursuit / bounty / NFSMW signature */
--red:            #FF4040   /* danger accent */
--blue:           #4A9EFF   /* code / path hints */
--text-main:      #CDD3E8
--text-muted:     #424B68
```

EurostileBold is used for game title, section headings, platform buttons, and car/pursuit card titles — loaded via jsDelivr CDN, no local font file committed to the repo.

</details>

---

## Open Source

Piererra Tools is free and open source software released under the **MIT License**.

<details>
<summary><strong>Full license text</strong></summary>

```
MIT License

Copyright (c) 2026 Piererra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>

---

## Contributing

Contributions are welcome. The web version is vanilla HTML/CSS/JS with no build toolchain — open the `.html` files directly in a browser to test.

<details>
<summary><strong>How to contribute</strong></summary>

1. **Fork** this repository on GitHub.
2. **Clone** your fork locally (or edit directly on GitHub for small changes).
3. Make your changes and test them.
4. **Submit a pull request** with a clear description of what changed and why.

**Guidelines**
- Web: keep it vanilla — no frameworks, no npm, no bundlers.
- Desktop: no external pip dependencies — stdlib only (`tkinter`, `struct`, `base64`, `re`, `os`).
- Tools must not make network requests for core functionality (client-side / file-only).
- Match the existing CSS variables and `Theme` class — no hardcoded colours.
- For new translatable strings, add to `pt-i18n.js` (web, 30 languages) and `app.py` `STRINGS` dict (desktop, 15 languages).
- No third-party author credits in any script files — `Piererra` is the sole author credit.

</details>

<details>
<summary><strong>Adding a new language</strong></summary>

**Web (`pt-i18n.js`)**
1. Add the language code to the `langs` array.
2. Add a full translation object for every key in `dict` (85 keys).
3. Add an `<option>` in the language selectors in both `nfsu2-editor.html` and `nfsmw-editor.html`.

**Desktop (`app.py`)**
1. Add the code + display name to `LANGS`.
2. Add a translation for every key in `STRINGS`.

</details>

<details>
<summary><strong>Adding a new tool</strong></summary>

Each tool follows this pattern:

1. Create `your-tool.html` — same nav/header/footer/Vanta structure as the existing editors. Pick a new accent colour.
2. Create `css/your-tool.css` — use CSS custom properties consistent with the design system.
3. Create `js/ptXXX-core.js` — binary or logic engine. Author comment: `Piererra` only.
4. Create `js/ptXXX-ui.js` — DOM wiring. Wire language selector to `ptI18n.setLang()`.
5. Update `index.html` — activate the next card slot (03, 04 …).
6. Update `README.md` — add the tool under [Tools](#tools) with its feature list, usage guide, and technical notes.

Prefix convention: `ptSDE-` (NFSU2), `ptMWE-` (NFSMW), `ptXXX-` (future tools).

</details>

---

## Roadmap

- [x] Portal homepage with tool card grid
- [x] Tool 01 — NFSU2 Save Editor (web: create, load, edit, clone, cheat)
- [x] Tool 01 — NFSU2 Save Editor (desktop: Python + tkinter, `.exe` via PyInstaller)
- [x] Tool 02 — NFSMW Save Editor (web: load, edit money/bounty/infractions/pursuit stats/per-car/per-pursuit, PC + PS2, MD5 rehash)
- [x] Language selector widget (75+ languages, grouped by region, localStorage persistence)
- [x] Full web i18n — `pt-i18n.js` with 30 languages, 85 keys
- [x] All toast & UI strings translated in `ptSDE-ui.js`
- [x] EurostileBold via jsDelivr CDN (NFSMW — no local font file)
- [x] Discord & GitHub links in footers
- [ ] Tool 02 — NFSMW desktop app (Python + tkinter)
- [ ] Tool 03 — TBD
- [ ] i18n wiring for NFSMW dynamic fields (per-car / per-pursuit section labels)
- [ ] Expand full translation sets to 50+ languages
- [ ] Persist desktop language selection between sessions
- [ ] Light mode toggle (optional)
- [ ] Keyboard navigation improvements

---

## Author

**Piererra** — indie developer, building browser tools from an Android phone.

- GitHub: [@piererra](https://github.com/piererra)
- Discord: [piererra](https://discord.com/users/1413503870373462070)

---

*Piererra Tools is not affiliated with Electronic Arts or the Need for Speed franchise. "Need for Speed Underground 2" and "Need for Speed Most Wanted" are trademarks of Electronic Arts Inc.*
