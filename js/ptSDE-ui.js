/* ============================================================
   ptSDE-ui.js — NFSU2 Save Editor by Piererra
   DOM interactions, event wiring, UI rendering

   Depends on: ptSDE-core.js (must load first)
============================================================ */

(function () {
  'use strict';

  let $;   // getElementById shorthand

  /* ----------------------------------------------------------
     TOAST
  ---------------------------------------------------------- */

  let _toastTimer = null;

  function toast(msg, type = 'info') {
    const el = $('sde-toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'sde-toast sde-toast--' + type + ' sde-toast--show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('sde-toast--show'), 3000);
  }

  /* ----------------------------------------------------------
     INFO BAR
  ---------------------------------------------------------- */

  function updateInfoBar(info) {
    $('sde-info-name').textContent  = info.name;
    $('sde-info-money').textContent = '$' + info.money.toLocaleString();
    $('sde-info-slots').textContent = info.slots.inUse + ' / ' + info.slots.total;

    const headerEl = $('sde-info-header');
    headerEl.textContent = info.headerOk ? 'VALID ✓' : 'INVALID ✗';
    headerEl.className   = info.headerOk
      ? 'sde-infobar__val sde-infobar__val--ok'
      : 'sde-infobar__val sde-infobar__val--err';

    $('sde-info-size').textContent = (info.size / 1024).toFixed(1) + ' KB';
    $('sde-infobar').hidden = false;
  }

  /* ----------------------------------------------------------
     SLOT CARDS
  ---------------------------------------------------------- */

  function renderSlotCards() {
    const grid = $('sde-slots-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const inUse = ptSDE.isSlotInUse(i);

      const card = document.createElement('div');
      card.className = 'sde-slot' + (inUse ? ' sde-slot--active' : '');
      card.setAttribute('data-slot', i);

      card.innerHTML = `
        <div class="sde-slot__header">
          <span class="sde-slot__num">SLOT ${i + 1}</span>
          <span class="sde-slot__dot" title="${inUse ? 'In use' : 'Empty'}"></span>
        </div>
        <span class="sde-slot__status">${inUse ? 'IN USE' : 'EMPTY'}</span>
        <div class="sde-slot__controls">
          <button class="sde-slot__btn sde-slot__btn--max"
                  data-slot-action="max" data-slot="${i}"
                  title="Max all performance stats">MAX PERF</button>
          <button class="sde-slot__btn sde-slot__btn--nil"
                  data-slot-action="nil" data-slot="${i}"
                  title="Zero all performance stats">NIL PERF</button>
          <button class="sde-slot__btn sde-slot__btn--unlock"
                  data-slot-action="unlock" data-slot="${i}"
                  title="Unlock this slot"
                  ${inUse ? 'disabled' : ''}>UNLOCK</button>
        </div>
      `;

      grid.appendChild(card);
    }
  }

  function initSlotGrid() {
    const grid = $('sde-slots-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-slot-action]');
      if (!btn) return;
      const action = btn.dataset.slotAction;
      const slot   = parseInt(btn.dataset.slot, 10);

      if (action === 'nil') {
        ptSDE.setSlotPerf(slot, 'nil');
        toast(`Slot ${slot + 1} performance zeroed.`, 'ok');
      } else if (action === 'max') {
        ptSDE.setSlotPerf(slot, 'max');
        toast(`Slot ${slot + 1} performance maxed.`, 'ok');
      } else if (action === 'unlock') {
        ptSDE.unlockSlot(slot);
        toast(`Slot ${slot + 1} unlocked.`, 'ok');
        renderSlotCards();
      }
    });
  }

  /* ----------------------------------------------------------
     FILE LOAD
  ---------------------------------------------------------- */

  async function handleFile(file) {
    if (!file) return;

    try {
      await ptSDE.loadSave(file);
    } catch (err) {
      toast('❌ ' + err.message, 'err');
      return;
    }

    if ($('sde-auto-backup')?.checked) {
      ptSDE.downloadBackup();
      toast('Save loaded. Backup downloaded.', 'ok');
    } else {
      toast('Save loaded: ' + file.name, 'ok');
    }

    const info = ptSDE.getSaveInfo();
    updateInfoBar(info);

    $('sde-input-name').value  = info.name;
    $('sde-input-money').value = info.money;

    $('sde-editor-body').hidden = false;
    renderSlotCards();
  }

  function initLoadSection() {
    const fileInput = $('sde-file-input');
    const dropzone  = $('sde-dropzone');

    dropzone.addEventListener('click', (e) => {
      if (e.target === fileInput) return;
      fileInput.click();
    });
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

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
     BASIC EDITS
  ---------------------------------------------------------- */

  function initBasicEdits() {
    $('sde-input-name').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7);
    });

    $('sde-input-money').addEventListener('blur', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) e.target.value = 0;
      if (val > 2147483647)      e.target.value = 2147483647;
    });
  }

  /* ----------------------------------------------------------
     PROFILE TOOLS
  ---------------------------------------------------------- */

  function initProfileTools() {
    $('sde-btn-new-save').addEventListener('click', () => {
      const name = $('sde-new-name').value.trim().replace(/[^A-Za-z0-9]/g, '');
      if (!name) { toast('Enter a profile name (1–7 alphanumeric).', 'err'); return; }
      try {
        ptSDE.createNewSave(name);
        toast(`New save "${name}" downloaded.`, 'ok');
      } catch (err) {
        toast('❌ ' + err.message, 'err');
      }
    });

    $('sde-btn-clone').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast('Load a save file first.', 'err'); return; }
      const name = $('sde-clone-name').value.trim().replace(/[^A-Za-z0-9]/g, '');
      if (!name) { toast('Enter a new profile name (1–7 alphanumeric).', 'err'); return; }
      try {
        ptSDE.cloneSave(name);
        toast(`Save cloned as "${name}" and downloaded.`, 'ok');
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
      toast('All parts unlocked across all slots.', 'ok');
    });

    $('sde-btn-unlock-slots').addEventListener('click', () => {
      ptSDE.unlockAllSlots();
      toast('All 5 car slots unlocked.', 'ok');
      renderSlotCards();
    });

    $('sde-btn-max-money').addEventListener('click', () => {
      ptSDE.maxMoney();
      $('sde-input-money').value = 2147483647;
      toast('Money set to maximum.', 'ok');
    });
  }

  /* ----------------------------------------------------------
     DOWNLOAD
  ---------------------------------------------------------- */

  function initDownload() {
    $('sde-btn-download').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast('No save loaded.', 'err'); return; }
      const name  = $('sde-input-name').value.trim();
      const money = parseInt($('sde-input-money').value, 10);
      if (name)          ptSDE.setName(name);
      if (!isNaN(money)) ptSDE.setMoney(money);
      ptSDE.downloadSave();
      toast('Modified save downloaded.', 'ok');
    });

    $('sde-btn-backup').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast('No save loaded.', 'err'); return; }
      ptSDE.downloadBackup();
      toast('Original backup (.bak) downloaded.', 'ok');
    });
  }

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', () => {
    $ = (id) => document.getElementById(id);

    initLoadSection();
    initSlotGrid();
    initBasicEdits();
    initProfileTools();
    initCheats();
    initDownload();
  });

}());
