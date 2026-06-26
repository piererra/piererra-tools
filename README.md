# Piererra Tools

> **A personal web toolbox — open source, browser-native, no installs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](LICENSE)
[![Status: Active](https://img.shields.io/badge/Status-Active-00f5ff.svg)](#)
[![Built with: Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-ff2d78.svg)](#)
[![Tools: 1 Active](https://img.shields.io/badge/Tools-1%20Active-7dff00.svg)](#tools)
[![i18n: 30 Languages](https://img.shields.io/badge/i18n-30%20Languages-7dff00.svg)](#i18n-system)
[![Desktop: Python + tkinter](https://img.shields.io/badge/Desktop-Python%20%2B%20tkinter-7dff00.svg)](#desktop-app)

Piererra Tools is a growing collection of browser-based utilities built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build steps, no installs. Each tool runs fully client-side, meaning your data never leaves your device. A standalone desktop version of the NFSU2 Save Editor is also available as a compiled `.exe`.

---

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
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

Piererra Tools started as a personal toolbox and is now shared openly for anyone who needs lightweight, no-nonsense browser utilities. The portal acts as a hub — each tool is self-contained in its own HTML page, styled with a unique theme while sharing the same zero-dependency philosophy.

**Core principles:**
- Zero server calls — everything runs in your browser
- Zero dependencies at runtime — no npm, no bundler, no CDN required for core logic
- Privacy-first — your files and data never touch a server
- Mobile-friendly — works on any modern browser including Android
- Multilingual — 30-language i18n system with localStorage persistence
- Desktop-ready — Python desktop app compilable to a standalone `.exe`

---

## Tools

### Tool 01 — NFSU2 Save Data Editor

**Status:** Active · Fully tested · Web: `nfsu2-editor.html` · Desktop: `main.py` / `NFSU2-SaveEditor.exe`

A full-featured save file editor for **Need for Speed Underground 2** (PC). Available as a browser tool and as a standalone Windows desktop app.

<details>
<summary><strong>Full feature list & usage guide</strong></summary>

#### Features

| Feature | Description |
|---|---|
| **Create New Save** | Generate a blank NFSU2 save from scratch — no existing file needed. Enter a 1–7 character alphanumeric profile name and download instantly. |
| **Load Existing Save** | Drag-and-drop or click-to-browse your `.sav` file. Validates the file header (`20CM` magic bytes + size checksum) before accepting it. |
| **Auto-Backup on Load** | Optionally download the original file as a `.bak` before any edits are made. Enabled by default. |
| **Profile Name Edit** | Change your profile name (max 7 alphanumeric characters, game engine limit). Input is auto-sanitized and uppercased. |
| **Money Edit** | Set your in-game money to any value from 0 to 2,147,483,647 (signed 32-bit max). |
| **Max Money (Cheat)** | One-click shortcut to set money to the maximum safe value. |
| **Car Slot Viewer** | Visual grid showing all 5 car slots — whether each is in use or empty. |
| **MAX Performance** | Fill all performance upgrade blocks for a slot, maxing every stat. |
| **NIL Performance** | Zero all performance upgrade blocks for a slot — useful for resetting tuning. |
| **Unlock Slot** | Activate an empty car slot by flipping its in-use flag. |
| **Unlock All Car Slots** | Unlock all 5 slots in one click. |
| **Unlock All Parts** | Every upgrade available across all 5 slots. |
| **Clone Save** | Copy the currently loaded save to a new profile name. |
| **Apply & Save** | Commits name + money edits and writes the modified `.sav` to disk. |
| **Download Backup** | Save the original unmodified file as `.bak` at any time. |

#### How to use (web)

1. Open `nfsu2-editor.html` in any modern browser.
2. **Create a new save:** Enter a profile name in the *Create New Save* section and click **Create & Download**.
3. **Edit an existing save:** Drop your save file onto the dropzone or click to browse.
4. Make your edits and click **Apply All & Download**.

#### How to use (desktop)

1. Run `NFSU2-SaveEditor.exe` (or `python main.py`).
2. Click **Load Save File** to open your `.sav`.
3. Edit name, money, slots, or use the cheat buttons.
4. Click **Apply & Save** to write the modified file to disk.

#### Save file path (Windows)

```
%LOCALAPPDATA%\NFS Underground 2\<ProfileName>\<ProfileName>
```

The save file has no extension — just the profile name as the filename.

#### Technical notes

- Save files are validated by checking the 4-byte magic header (`32 30 43 4D` / ASCII `20CM`) and verifying that the low 16 bits of the file size stored at offset `0x0004` match the actual file size.
- Profile name is stored as null-terminated ASCII at offset `0xD225`. Reads up to 16 bytes, writes at most 7 characters.
- Money is a signed 32-bit little-endian integer at offset `0xA16A`.
- Car slots begin at `0x5AEC`, each `0x7F2` bytes, 5 total.
- Performance data: 8 blocks of `0x40` bytes per slot.
- Parts data: 8 blocks of `0x10` bytes per slot starting at relative offset `0x0234`.
- Car injection patches use slot-relative offsets — safe to apply to any of the 5 slots.

</details>

---

### Tool 02 — Coming Soon

> Next tool in development. Stay tuned.

### Tool 03 — Coming Soon

> Next tool in development. Stay tuned.

---

## Project Structure

### Web version

```
piererra-tools/
│
├── index.html                  # Portal homepage — tool card grid
├── nfsu2-editor.html           # NFSU2 Save Editor page
│
├── css/
│   ├── portal.css              # Cyberpunk portal theme + language selector styles
│   └── nfsu2-editor.css        # NFSU2 editor theme + language selector styles
│
├── js/
│   ├── pt-i18n.js              # i18n system — 30 languages, 85 keys
│   ├── ptSDE-core.js           # Binary engine — all save file read/write logic
│   ├── ptSDE-ui.js             # DOM wiring — events, rendering, toasts (i18n-wired)
│   ├── ptSDE-cars.js           # Car list data (49 cars)
│   └── ptSDE-template.js       # Base64-encoded blank NFSU2 save
│
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── googlec52b3a73db4c4f44.html
```

### Desktop version

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
    ├── template.py             # Base64 blank save — Python port of ptSDE-template.js
    └── app.py                  # tkinter GUI — 15 languages, NFSU2 dark-lime theme
```

<details>
<summary><strong>Detailed file descriptions (web)</strong></summary>

#### `js/pt-i18n.js`
Self-contained IIFE exposing `window.ptI18n` with 85 translation keys across 30 languages. `t(key, vars)` for lookup, `apply(langCode)` for DOM walking, `init()` for page boot. Updates `<html lang>` on every switch for RTL/LTR support.

#### `js/ptSDE-core.js`
Binary read/write engine. Exposes `window.ptSDE`. Handles header validation, name/money read+write, slot management, performance and parts blocks, car injection, new save creation from base64 template, and save cloning. Browser download via `Blob` + `URL.createObjectURL`.

#### `js/ptSDE-ui.js`
DOM layer wiring all UI elements to `ptSDE` methods. All user-visible strings use `ptI18n.t()` — no hardcoded English strings.

#### `js/ptSDE-cars.js`
49-car database (27 standard + 22 custom/story). Each entry contains binary patch blocks keyed by slot-relative offsets.

#### `js/ptSDE-template.js`
Single base64 assignment `window.ptSDE_TEMPLATE`. Decodes to a 54,966-byte blank NFSU2 save with valid `20CM` header and size checksum.

</details>

<details>
<summary><strong>Detailed file descriptions (desktop)</strong></summary>

#### `nfsu2_editor/core.py`
Python port of `ptSDE-core.js`. `SaveEditor` class with full public API — same binary offsets, same logic. Uses Python `struct` and `bytearray`. No external dependencies.

#### `nfsu2_editor/cars.py`
Python port of `ptSDE-cars.js`. All 49 cars with hex block data. `get_all()`, `find_car_by_key(key)`, `get_car_names()`.

#### `nfsu2_editor/template.py`
Python port of `ptSDE-template.js`. `TEMPLATE_B64` string — same 54,966-byte blank save. Stored as implicit string concatenation for GitHub compatibility.

#### `nfsu2_editor/app.py`
Full tkinter GUI. NFSU2 dark-lime theme matching the web version. 15-language i18n system. Sections: load/backup, info bar, profile edit, car slots (5 cards with MAX/NIL/UNLOCK), cheats, clone, create new profile (with 49-car dropdown). Toast notification system. Language switcher in header.

</details>

---

## Desktop App

The desktop version is a standalone Windows `.exe` built from Python + tkinter. It replicates all features of the web editor with a native desktop UI — no browser needed.

### Requirements

- Windows 10 or later (or Wine/Winlator on Android)
- Python 3.10+ (only needed to build the `.exe`, not to run it)
- PyInstaller (installed automatically by `build.bat`)

### Building the .exe

**Step 1 — Install Python**

Download from [python.org](https://www.python.org/downloads/). During install, check **"Add Python to PATH"**.

**Step 2 — Get the files**

Your desktop project folder must look like this:

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
└── NFSU2-SaveEditor.exe   ← your standalone executable
```

The `.exe` is fully self-contained — no Python installation needed on the target machine. File size is approximately 8–12 MB.

### Manual build command

If you prefer to run it yourself without `build.bat`:

```bat
pyinstaller --onefile --windowed --name "NFSU2-SaveEditor" --add-data "nfsu2_editor;nfsu2_editor" main.py
```

| Flag | Purpose |
|---|---|
| `--onefile` | Bundle everything into a single `.exe` |
| `--windowed` | No black console window behind the GUI |
| `--name` | Output filename |
| `--add-data` | Include the `nfsu2_editor` package inside the bundle |

### Running without compiling

You can also run the app directly with Python (no build needed):

```bash
python main.py
```

### Running on Android (Winlator)

The compiled `.exe` can be run inside **Winlator** (Android Wine environment):

1. Copy `NFSU2-SaveEditor.exe` to your Winlator container
2. Open it via the Winlator file manager or terminal
3. The tkinter GUI should render via Wine's GDI layer

> **Note:** Performance may vary depending on Box64 translation overhead. File picker dialogs work under Wine but may look different from native Windows.

### Desktop i18n (15 languages)

The desktop app includes its own translation system in `app.py` (separate from the web `pt-i18n.js`):

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

Switching languages in the header dropdown rebuilds the UI instantly. The selection is not currently persisted between sessions (planned for a future update).

---

## i18n System

Both pages include a fully functional internationalization system built on `js/pt-i18n.js`.

### How it works

HTML elements carry translation attributes:

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

JavaScript strings use `ptI18n.t()` with optional variable interpolation:

```javascript
// Simple key lookup
toast(ptI18n.t('toast.no_save'), 'err');

// With variable interpolation
toast(ptI18n.t('toast.slot_maxed', { n: slot + 1 }), 'ok');
toast(ptI18n.t('toast.cloned', { name: name }), 'ok');
```

Initialise on a page with one call:

```javascript
document.addEventListener('DOMContentLoaded', function () {
  ptI18n.init(); // reads localStorage, syncs selector, applies all translations
});
```

### Supported languages (30)

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

### Language selector widget

The language selector (75+ languages, grouped by region) is present on both pages. Selecting a language saves the choice to `localStorage` under `pt-lang`, re-translates all DOM elements instantly, updates `<html lang>` for RTL/LTR rendering, and persists across pages and reloads. No flag emoji are used — avoids GitHub bidirectional Unicode warnings.

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
<summary><strong>NFSU2 Editor theme tokens (nfsu2-editor.css + app.py)</strong></summary>

```css
--bg-deep:        #080A10
--bg-panel:       rgba(12, 15, 24, 0.82)
--bg-panel-solid: #0C0F18
--bg-card:        rgba(16, 20, 32, 0.88)
--bg-input:       rgba(7, 9, 16, 0.95)
--lime:           #7DFF00   /* primary accent */
--gold:           #E0B030   /* money / gold accent */
--blue:           #4A9EFF   /* info accent */
--red:            #FF4040   /* danger / nil accent */
--text-main:      #CDD3E8
--text-muted:     #424B68
```

The same palette is replicated in `app.py`'s `Theme` class for the desktop app.

</details>

---

## Open Source

Piererra Tools is free and open source software released under the **MIT License**.

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

---

## Contributing

Contributions are welcome. The web version is vanilla HTML/CSS/JS with no build toolchain — open the `.html` files directly in a browser to test. The desktop version requires Python 3.10+.

<details>
<summary><strong>How to contribute</strong></summary>

1. **Fork** this repository on GitHub.
2. **Clone** your fork locally (or edit directly on GitHub).
3. Make your changes and test them.
4. **Submit a pull request** with a clear description.

#### Guidelines

- Web: keep it vanilla — no frameworks, no npm, no bundlers.
- Desktop: no external pip dependencies — stdlib only (`tkinter`, `struct`, `base64`, `re`, `os`).
- Client-side / file-only — tools must not make network requests for core functionality.
- Match the existing CSS variables and `Theme` class — no hardcoded colours.
- For new translatable strings, add to both `pt-i18n.js` (web, 30 languages) and `app.py` `STRINGS` dict (desktop, 15 languages).

#### Adding a new language

**Web (`pt-i18n.js`):**
1. Add the code to the `langs` array.
2. Add a translation for every key in `dict`.
3. Add an `<option>` in both HTML selectors.

**Desktop (`app.py`):**
1. Add the code + display name to `LANGS`.
2. Add a translation for every key in `STRINGS`.

#### Suggesting a new tool

Open a GitHub Issue with the label `tool idea` — describe what it does, why it should be browser-based or desktop, and any similar existing tools.

</details>

---

## Roadmap

- [x] Portal homepage with tool card grid
- [x] NFSU2 Save Data Editor — web version (create, load, edit, clone, cheat)
- [x] Language selector widget (75+ languages, localStorage persistence)
- [x] Full web i18n — `pt-i18n.js` with 30 languages, 85 keys
- [x] All toast & UI strings translated in `ptSDE-ui.js`
- [x] Discord & GitHub links in footers
- [x] Desktop app — Python + tkinter, 15 languages, NFSU2 theme
- [x] Desktop app — PyInstaller `.exe` build via `build.bat`
- [ ] Tool 02 — TBD
- [ ] Tool 03 — TBD
- [ ] Expand web i18n to 50+ languages
- [ ] Persist desktop language selection between sessions
- [ ] Light mode toggle (optional)
- [ ] Keyboard navigation improvements

---

## Author

**Piererra** — indie developer, building browser tools from an Android phone.

- GitHub: [@piererra](https://github.com/piererra)
- Discord: [piererra](https://discord.com/users/1413503870373462070)

---

*Piererra Tools is not affiliated with Electronic Arts or the Need for Speed franchise. "Need for Speed Underground 2" is a trademark of Electronic Arts Inc.*
