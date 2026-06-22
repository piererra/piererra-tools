# 🛠️ Piererra Tools

> **A personal web toolbox — open source, browser-native, no installs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-lime.svg)](LICENSE)
[![Status: Active](https://img.shields.io/badge/Status-Active-00f5ff.svg)](#)
[![Built with: Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-ff2d78.svg)](#)
[![Tools: 1 Active](https://img.shields.io/badge/Tools-1%20Active-7dff00.svg)](#tools)

Piererra Tools is a growing collection of browser-based utilities built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build steps, no installs. Each tool runs fully client-side, meaning your data never leaves your device.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tools](#tools)
- [Project Structure](#project-structure)
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

---

## Tools

### ✅ Tool 01 — NFSU2 Save Data Editor

**Status:** Active · Fully tested · `nfsu2-editor.html`

A full-featured browser-based save file editor for **Need for Speed Underground 2** (PC). Load, modify, and re-download your `.sav` file without any external software.

<details>
<summary><strong>📖 Full feature list & usage guide</strong></summary>

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
| **MAX Performance** | Fill all 8 performance upgrade blocks for a slot with `0xFF`, maxing every stat. |
| **NIL Performance** | Zero all 8 performance upgrade blocks for a slot — useful for resetting tuning. |
| **Unlock Slot** | Activate an empty car slot by flipping its in-use flag to `0x01`. |
| **Unlock All Car Slots** | Unlock all 5 slots in one click. |
| **Unlock All Parts** | Write `0xFF` to all 8 parts blocks across all 5 slots — every upgrade available. |
| **Clone Save** | Copy the currently loaded save to a new profile name. Useful for making alternate saves or backups. |
| **Apply & Download** | Commits name + money edits from the UI into the buffer and downloads the modified `.sav`. |
| **Download Backup** | Download the original unmodified file as `.bak` at any time. |

#### How to use

1. Open `nfsu2-editor.html` in any modern browser.
2. **To create a new save:** Enter a profile name in the *Create New Save* section and click **Create & Download**. Place the downloaded file in `%LOCALAPPDATA%\NFS Underground 2\<Name>\<Name>` (no extension).
3. **To edit an existing save:** Drop your save file onto the dropzone or click to browse. The editor validates the header and displays your profile info.
4. Make your edits using the available sections.
5. Click **Apply All & Download** to save your changes.

#### Save file path (Windows)

```
%LOCALAPPDATA%\NFS Underground 2\<ProfileName>\<ProfileName>
```

The save file has no extension — just the profile name as the filename.

#### Technical notes

- Save files are validated by checking the 4-byte magic header (`32 30 43 4D` / ASCII `20CM`) and verifying that the low 16 bits of the file size stored at offset `0x0004` match the actual file size.
- Profile name is stored as null-terminated ASCII at a fixed offset (`0xD225`). Reads up to 16 bytes to handle non-standard external saves, but always writes at most 7 characters.
- Money is a signed 32-bit little-endian integer at offset `0xA16A`.
- Car slots begin at `0x5AEC`, each `0x7F2` bytes, 5 total.
- Performance data: 8 blocks of `0x40` bytes per slot.
- Parts data: 8 blocks of `0x10` bytes per slot starting at relative offset `0x0234`.
- Car injection patches use **slot-relative offsets** (`0` to `0x7F1`), not absolute file offsets — so any patch can be injected into any of the 5 slots.

</details>

---

### 🔒 Tool 02 — Coming Soon

> Next tool in development. Stay tuned.

### 🔒 Tool 03 — Coming Soon

> Next tool in development. Stay tuned.

---

## Project Structure

```
piererra-tools/
│
├── index.html                  # Portal homepage — tool card grid
│
├── nfsu2-editor.html           # NFSU2 Save Editor page
│
├── css/
│   ├── portal.css              # Cyberpunk portal theme
│   └── nfsu2-editor.css        # NFSU2 editor theme (NFS Underground 2 aesthetic)
│
└── js/
    ├── ptSDE-core.js           # Binary engine — all save file read/write logic
    ├── ptSDE-ui.js             # DOM wiring — events, rendering, toast notifications
    └── ptSDE-template.js       # Base64-encoded blank NFSU2 save (used for new-save creation)
```

<details>
<summary><strong>🔍 Detailed file descriptions</strong></summary>

#### `index.html`
The portal entry point. Renders a cyberpunk-themed card grid using `portal.css`. Cards link to each tool or show a locked state for upcoming tools. Uses a CSS-only scanline overlay for CRT aesthetic.

#### `nfsu2-editor.html`
The NFSU2 Save Editor page. Pulls in the Vanta.js NET animation (via CDN) for a full-page animated background. Loads the three editor scripts in dependency order: `ptSDE-template.js` → `ptSDE-core.js` → `ptSDE-ui.js`.

#### `css/portal.css`
Cyberpunk design system for the portal:
- **Palette:** deep black (`#0a0a0f`), cyan (`#00f5ff`), magenta (`#ff2d78`)
- **Font:** system monospace stack — no external font requests
- Glitch title animation via CSS pseudo-elements
- CSS scanlines via `repeating-linear-gradient`
- Responsive card grid

#### `css/nfsu2-editor.css`
Need for Speed Underground 2 themed editor UI:
- **Palette:** near-black (`#080A10`), lime (`#7DFF00`), gold (`#E0B030`), blue (`#4A9EFF`), red (`#FF4040`)
- Semi-transparent panels over Vanta.js animated background
- Scrollable content wrapper sitting above the fixed Vanta canvas (z-index layering)
- Slot cards, dropzone, infobar, toast notification, and cheat button components

#### `js/ptSDE-core.js`
The binary read/write engine. Exposes `window.ptSDE` with the full public API. Self-contained IIFE — no external dependencies. Handles:
- `ArrayBuffer` management (working copy + original for backup)
- Header validation
- Fixed-offset name/money read+write
- Slot in-use flag detection and forcing
- Performance and parts block fill (`0xFF` / `0x00`)
- Car injection (slot-relative offset patching)
- Car extraction (exports non-zero chunks as patch array)
- JSON and legacy TXT patch format support
- New save creation (decodes the base64 template, writes name, triggers download)
- Save cloning (deep-copies buffer, renames, triggers download)
- Browser download via `Blob` + `URL.createObjectURL`

#### `js/ptSDE-ui.js`
The DOM layer. Wires all UI elements to `ptSDE` core methods:
- Drag-and-drop + click-to-browse file loading
- Auto-backup on load
- Infobar update after load (name, money, slot count, header status, file size)
- Slot card rendering and per-slot button delegation
- Profile name sanitization (auto-uppercase, strip non-alphanumeric)
- Cheat button handlers
- Toast notification system with auto-dismiss

#### `js/ptSDE-template.js`
A single `window.ptSDE_TEMPLATE = "..."` assignment containing a base64-encoded blank NFSU2 save file (~73KB raw). Used by `ptSDE-core.js` to construct new saves from scratch. Generated once from a real clean save.

</details>

---

## Design System

<details>
<summary><strong>🎨 Portal theme tokens (portal.css)</strong></summary>

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
<summary><strong>🎨 NFSU2 Editor theme tokens (nfsu2-editor.css)</strong></summary>

```css
--bg-deep:        #080A10                   /* page background */
--bg-panel:       rgba(12, 15, 24, 0.82)   /* transparent panels over Vanta */
--bg-panel-solid: #0C0F18
--bg-card:        rgba(16, 20, 32, 0.88)
--bg-input:       rgba(7, 9, 16, 0.95)
--lime:           #7DFF00   /* primary accent (NFS green) */
--gold:           #E0B030   /* money / gold accent */
--blue:           #4A9EFF   /* info accent */
--red:            #FF4040   /* danger / nil accent */
--text-main:      #CDD3E8
--text-muted:     #424B68
```

Vanta.js NET config: `color: 0x7dff00`, `backgroundColor: 0x080a10`, `points: 8`, `maxDistance: 20`, `spacing: 20`.

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

Contributions are welcome! Because this project is vanilla HTML/CSS/JS with no build toolchain, getting started is as simple as opening the files.

<details>
<summary><strong>🤝 How to contribute</strong></summary>

1. **Fork** this repository on GitHub.
2. **Clone** your fork locally (or just edit files directly on GitHub).
3. Make your changes — no build step needed. Open the `.html` files directly in a browser to test.
4. **Submit a pull request** with a clear description of what you changed and why.

#### Guidelines

- Keep it vanilla — no frameworks, no npm, no bundlers. If it can't run by opening an HTML file, it doesn't belong here.
- Client-side only — tools should not require a server or make network requests for core functionality.
- Match the existing style in each CSS file (use the defined CSS variables, don't hardcode colors).
- Keep JS in IIFEs or modules to avoid polluting `window` (the exception being intentional exports like `window.ptSDE`).
- Comment your code — explain *why*, not just *what*, especially for binary offset logic.

#### Suggesting a new tool

Open a GitHub Issue with the label `tool idea` and describe:
- What the tool does
- Why it needs to be browser-based
- Any existing prior art / similar tools

</details>

---

## Roadmap

- [x] Portal homepage with tool card grid
- [x] NFSU2 Save Data Editor (create, load, edit, clone, cheat)
- [ ] Tool 02 — TBD
- [ ] Tool 03 — TBD
- [ ] Light mode toggle (optional)
- [ ] Keyboard navigation improvements

---

## Author

**Piererra** — indie developer, building browser tools from an Android phone.

- GitHub: [@piererra](https://github.com/piererra)

---

*Piererra Tools is not affiliated with Electronic Arts or the Need for Speed franchise. "Need for Speed Underground 2" is a trademark of Electronic Arts Inc.*
