/* ============================================================
   ptSDE-ui.js — NFSU2 Save Data Editor by Piererra
   DOM interactions, event wiring, and UI rendering

   Responsibilities:
     - Wire all buttons, inputs, file pickers to ptSDE-core.js
     - Render 5 car slot cards dynamically
     - Populate car dropdown from ptSDE-cars.js
     - Show/hide editor sections after file load
     - Toast notifications (non-blocking)
     - Drag-and-drop support on the dropzone
     - Validate user inputs before passing to core

   Depends on: ptSDE-core.js, ptSDE-cars.js (must load first)
============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     DOM REFS — grabbed once on DOMContentLoaded
  ---------------------------------------------------------- */
  let $;  // shorthand for getElementById

  /* ----------------------------------------------------------
     TOAST
  ---------------------------------------------------------- */

  let _toastTimer = null;

  /**
   * Show a toast message.
   * type: 'ok' | 'err' | 'info'
   */
  function toast(msg, type = 'info') {
    const el = $('sde-toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'sde-toast sde-toast--' + type + ' sde-toast--show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      el.classList.remove('sde-toast--show');
    }, 3000);
  }

  /* ----------------------------------------------------------
     INFO BAR — populate after load
  ---------------------------------------------------------- */

  function updateInfoBar(info) {
    $('sde-info-name').textContent   = info.name;
    $('sde-info-money').textContent  = '$' + info.money.toLocaleString();
    $('sde-info-slots').textContent  = info.slots.inUse + ' / ' + info.slots.total;
    $('sde-info-header').textContent = info.headerOk ? 'VALID ✓' : 'INVALID ✗';
    $('sde-info-size').textContent   = (info.size / 1024).toFixed(1) + ' KB';

    const headerEl = $('sde-info-header');
    headerEl.className = info.headerOk
      ? 'sde-infobar__val sde-infobar__val--ok'
      : 'sde-infobar__val sde-infobar__val--err';

    $('sde-infobar').hidden = false;
  }

  /* ----------------------------------------------------------
     SLOT CARDS — rendered by JS into #sde-slots-grid
  ---------------------------------------------------------- */

  function renderSlotCards() {
    const grid = $('sde-slots-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const inUse = ptSDE.isSlotInUse(i);
      const num   = i + 1;

      const card = document.createElement('div');
      card.className = 'sde-slot' + (inUse ? ' sde-slot--active' : '');
      card.setAttribute('data-slot', i);

      card.innerHTML = `
        <div class="sde-slot__header">
          <span class="sde-slot__num">SLOT ${num}</span>
          <span class="sde-slot__status">${inUse ? '● IN USE' : '○ EMPTY'}</span>
        </div>
        <div class="sde-slot__controls">
          <button class="sde-btn sde-btn--sm sde-btn--ghost"
                  data-slot-action="nil" data-slot="${i}"
                  title="Zero all performance stats">
            NIL PERF
          </button>
          <button class="sde-btn sde-btn--sm sde-btn--lime"
                  data-slot-action="max" data-slot="${i}"
                  title="Max all performance stats">
            MAX PERF
          </button>
          <button class="sde-btn sde-btn--sm sde-btn--blue"
                  data-slot-action="unlock" data-slot="${i}"
                  title="Unlock this car slot"
                  ${inUse ? 'disabled' : ''}>
            UNLOCK
          </button>
        </div>
      `;

      grid.appendChild(card);
    }

    // Wire slot action buttons via delegation on the grid
    grid.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-slot-action]');
      if (!btn) return;
      const action = btn.dataset.slotAction;
      const slot   = parseInt(btn.dataset.slot, 10);

      if (action === 'nil') {
        ptSDE.setSlotPerf(slot, 'nil');
        toast(`Slot ${slot + 1}: performance zeroed.`, 'ok');
      } else if (action === 'max') {
        ptSDE.setSlotPerf(slot, 'max');
        toast(`Slot ${slot + 1}: performance maxed.`, 'ok');
      } else if (action === 'unlock') {
        ptSDE.unlockSlot(slot);
        toast(`Slot ${slot + 1} unlocked.`, 'ok');
        renderSlotCards();  // re-render to reflect new status
      }
    });
  }

  /* ----------------------------------------------------------
     CAR DROPDOWN — populated from ptSDE-cars.js
  ---------------------------------------------------------- */

  function populateCarDropdown() {
    const sel = $('sde-car-select');
    if (!sel) return;

    // ptSDE_CARS is defined in ptSDE-cars.js
    if (typeof ptSDE_CARS === 'undefined' || !ptSDE_CARS.length) {
      sel.innerHTML = '<option value="">— no cars loaded —</option>';
      return;
    }

    sel.innerHTML = '<option value="">— select a car —</option>';

    // Group by category
    const groups = {};
    for (const car of ptSDE_CARS) {
      const g = car.category || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(car);
    }

    for (const [groupName, cars] of Object.entries(groups)) {
      const og = document.createElement('optgroup');
      og.label = groupName;
      for (const car of cars) {
        const opt   = document.createElement('option');
        opt.value   = car.id;
        opt.textContent = car.name;
        og.appendChild(opt);
      }
      sel.appendChild(og);
    }

    // Show preview on change
    sel.addEventListener('change', () => {
      const car     = ptSDE_CARS.find(c => c.id === sel.value);
      const preview = $('sde-car-preview');
      if (car && preview) {
        $('sde-car-preview-name').textContent   = car.name;
        $('sde-car-preview-source').textContent = car.category || '';
        preview.hidden = false;
      } else if (preview) {
        preview.hidden = true;
      }
    });
  }

  /* ----------------------------------------------------------
     LOAD SAVE — file input + drag & drop
  ---------------------------------------------------------- */

  async function handleFile(file) {
    if (!file) return;

    try {
      await ptSDE.loadSave(file);
    } catch (err) {
      toast('❌ ' + err.message, 'err');
      return;
    }

    // Auto-backup if checked
    if ($('sde-auto-backup')?.checked) {
      ptSDE.downloadBackup();
      toast('✓ Save loaded. Backup downloaded.', 'ok');
    } else {
      toast('✓ Save loaded: ' + file.name, 'ok');
    }

    const info = ptSDE.getSaveInfo();
    updateInfoBar(info);

    // Pre-fill basic edit inputs
    $('sde-input-name').value  = info.name;
    $('sde-input-money').value = info.money;

    // Reveal editor
    $('sde-editor-body').hidden = false;

    renderSlotCards();
  }

  function initLoadSection() {
    const fileInput = $('sde-file-input');
    const dropzone  = $('sde-dropzone');

    // Click to browse
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });

    // File selected via picker
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    // Drag & drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('sde-dropzone--over');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('sde-dropzone--over');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('sde-dropzone--over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  /* ----------------------------------------------------------
     BASIC EDITS — name & money inputs (live, applied on download)
  ---------------------------------------------------------- */

  function initBasicEdits() {
    // Name input — validate on input
    $('sde-input-name').addEventListener('input', (e) => {
      // Strip non-alphanumeric silently
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7);
    });

    // Money input — clamp on blur
    $('sde-input-money').addEventListener('blur', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) e.target.value = 0;
      if (val > 2147483647)      e.target.value = 2147483647;
    });
  }

  /* ----------------------------------------------------------
     CAR INJECTION
  ---------------------------------------------------------- */

  function initCarInjection() {
    $('sde-btn-inject').addEventListener('click', () => {
      const carId   = $('sde-car-select').value;
      const slotIdx = parseInt($('sde-slot-select').value, 10);

      if (!carId) {
        toast('Select a car first.', 'err');
        return;
      }

      const car = ptSDE_CARS.find(c => c.id === carId);
      if (!car || !car.data) {
        toast('Car data not found.', 'err');
        return;
      }

      try {
        ptSDE.injectCar(slotIdx, car.data);
        toast(`✓ ${car.name} injected into Slot ${slotIdx + 1}.`, 'ok');
        renderSlotCards();
      } catch (err) {
        toast('❌ Injection failed: ' + err.message, 'err');
      }
    });
  }

  /* ----------------------------------------------------------
     CAR PATCH — extract & apply
  ---------------------------------------------------------- */

  function initCarPatch() {
    // Extract car → .json
    $('sde-btn-extract').addEventListener('click', () => {
      const slotIdx = parseInt($('sde-extract-slot').value, 10);
      try {
        const patches = ptSDE.extractCar(slotIdx);
        if (!patches.length) {
          toast('Slot ' + (slotIdx + 1) + ' appears empty.', 'err');
          return;
        }
        const json = JSON.stringify(patches, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'car-slot' + (slotIdx + 1) + '-patch.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(`✓ Slot ${slotIdx + 1} extracted as .json patch.`, 'ok');
      } catch (err) {
        toast('❌ Extract failed: ' + err.message, 'err');
      }
    });

    // Apply .json patch
    $('sde-apply-json-input').addEventListener('change', (e) => {
      const file    = e.target.files[0];
      const slotIdx = parseInt($('sde-apply-json-slot').value, 10);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          ptSDE.applyJsonPatch(slotIdx, ev.target.result);
          toast(`✓ .json patch applied to Slot ${slotIdx + 1}.`, 'ok');
          renderSlotCards();
        } catch (err) {
          toast('❌ ' + err.message, 'err');
        }
        e.target.value = '';  // reset input
      };
      reader.readAsText(file);
    });

    // Apply .txt patch
    $('sde-apply-txt-input').addEventListener('change', (e) => {
      const file    = e.target.files[0];
      const slotIdx = parseInt($('sde-apply-txt-slot').value, 10);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          ptSDE.applyTxtPatch(slotIdx, ev.target.result);
          toast(`✓ .txt patch applied to Slot ${slotIdx + 1}.`, 'ok');
          renderSlotCards();
        } catch (err) {
          toast('❌ ' + err.message, 'err');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  /* ----------------------------------------------------------
     PROFILE TOOLS — new save & clone
  ---------------------------------------------------------- */

  function initProfileTools() {
    // Create new save
    $('sde-btn-new-save').addEventListener('click', () => {
      const name = $('sde-new-name').value.trim().replace(/[^A-Za-z0-9]/g, '');
      if (!name) {
        toast('Enter a profile name (1–7 alphanumeric).', 'err');
        return;
      }
      try {
        ptSDE.createNewSave(name);
        toast(`✓ New save "${name}" downloaded.`, 'ok');
      } catch (err) {
        toast('❌ ' + err.message, 'err');
      }
    });

    // Clone save
    $('sde-btn-clone').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) {
        toast('Load a save file first.', 'err');
        return;
      }
      const name = $('sde-clone-name').value.trim().replace(/[^A-Za-z0-9]/g, '');
      if (!name) {
        toast('Enter a new profile name (1–7 alphanumeric).', 'err');
        return;
      }
      try {
        ptSDE.cloneSave(name);
        toast(`✓ Save cloned as "${name}" and downloaded.`, 'ok');
      } catch (err) {
        toast('❌ ' + err.message, 'err');
      }
    });
  }

  /* ----------------------------------------------------------
     CHEATS
  ---------------------------------------------------------- */

  function initCheats() {
    $('sde-btn-unlock-parts').addEventListener('click', () => {
      ptSDE.unlockAllParts();
      toast('✓ All parts unlocked across all slots.', 'ok');
    });

    $('sde-btn-unlock-slots').addEventListener('click', () => {
      ptSDE.unlockAllSlots();
      toast('✓ All 5 car slots unlocked.', 'ok');
      renderSlotCards();
    });

    $('sde-btn-max-money').addEventListener('click', () => {
      ptSDE.maxMoney();
      $('sde-input-money').value = 2147483647;
      toast('✓ Money set to maximum ($2,147,483,647).', 'ok');
    });
  }

  /* ----------------------------------------------------------
     DOWNLOAD
  ---------------------------------------------------------- */

  function initDownload() {
    // Main download — apply all pending edits first, then download
    $('sde-btn-download').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) {
        toast('No save loaded.', 'err');
        return;
      }

      // Apply name & money from inputs
      const name  = $('sde-input-name').value.trim();
      const money = parseInt($('sde-input-money').value, 10);

      if (name)       ptSDE.setName(name);
      if (!isNaN(money)) ptSDE.setMoney(money);

      ptSDE.downloadSave();
      toast('✓ Modified save downloaded.', 'ok');
    });

    // Backup download
    $('sde-btn-backup').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) {
        toast('No save loaded.', 'err');
        return;
      }
      ptSDE.downloadBackup();
      toast('✓ Original backup (.bak) downloaded.', 'ok');
    });
  }

  /* ----------------------------------------------------------
     INIT — wire everything on DOM ready
  ---------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    // Build the $ shorthand
    $ = (id) => document.getElementById(id);

    initLoadSection();
    initBasicEdits();
    populateCarDropdown();
    initCarInjection();
    initCarPatch();
    initProfileTools();
    initCheats();
    initDownload();
  });

}());
