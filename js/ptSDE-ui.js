/* ============================================================
   ptSDE-ui.js — NFSU2 Save Editor by Piererra
   DOM interactions, event wiring, UI rendering

   Depends on:
     ptSDE-template.js  (must load first)
     ptSDE-cars.js      (must load second)
     ptSDE-core.js      (must load third)
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
    headerEl.textContent = info.headerOk ? ptI18n.t('info.valid') : ptI18n.t('info.invalid');
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
          <span class="sde-slot__dot" title="${inUse ? ptI18n.t('slot.in_use') : ptI18n.t('slot.empty')}"></span>
        </div>
        <span class="sde-slot__status">${inUse ? ptI18n.t('slot.in_use') : ptI18n.t('slot.empty')}</span>
        <div class="sde-slot__controls">
          <button class="sde-slot__btn sde-slot__btn--max"
                  data-slot-action="max" data-slot="${i}"
                  title="${ptI18n.t('btn.max')}">${ptI18n.t('btn.max')} PERF</button>
          <button class="sde-slot__btn sde-slot__btn--nil"
                  data-slot-action="nil" data-slot="${i}"
                  title="${ptI18n.t('btn.nil')}">${ptI18n.t('btn.nil')} PERF</button>
          <button class="sde-slot__btn sde-slot__btn--unlock"
                  data-slot-action="unlock" data-slot="${i}"
                  title="${ptI18n.t('btn.unlock_slot')}"
                  ${inUse ? 'disabled' : ''}>${ptI18n.t('btn.unlock_slot').toUpperCase()}</button>
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
        toast(ptI18n.t('toast.slot_zeroed', {n: slot + 1}), 'ok');
      } else if (action === 'max') {
        ptSDE.setSlotPerf(slot, 'max');
        toast(ptI18n.t('toast.slot_maxed', {n: slot + 1}), 'ok');
      } else if (action === 'unlock') {
        ptSDE.unlockSlot(slot);
        toast(ptI18n.t('toast.slot_unlocked', {n: slot + 1}), 'ok');
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

    const dropzone = $('sde-dropzone');
    const textEl   = $('sde-dropzone-text');
    if (dropzone) dropzone.classList.add('sde-dropzone--loaded');
    if (textEl)   textEl.textContent = file.name;

    if ($('sde-auto-backup')?.checked) {
      ptSDE.downloadBackup();
      toast(ptI18n.t('toast.loaded_backup'), 'ok');
    } else {
      toast(ptI18n.t('toast.loaded', {name: file.name}), 'ok');
    }

    const info = ptSDE.getSaveInfo();
    updateInfoBar(info);

    $('sde-input-name').value  = info.name;
    $('sde-input-money').value = info.money;
    $('sde-clone-name').value  = info.name;

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
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase();
    });

    $('sde-input-money').addEventListener('blur', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) e.target.value = 0;
      if (val > 2147483647)      e.target.value = 2147483647;
    });
  }

  /* ----------------------------------------------------------
     CREATE PROFILE MODAL

     Flow:
       1. User clicks "Create New Profile" button
       2. Modal opens — name input, money input, car select
       3. Car select has optgroups: Default, Standard Cars, Custom Cars
       4. User fills in fields and clicks "Create & Download"
       5. ptSDE.createProfile(name, money, carKey) called
       6. Modal closes, toast shown
  ---------------------------------------------------------- */

  function buildCarSelect() {
    const select = $('sde-modal-car');
    if (!select || !window.ptSDE_CARS) return;

    const { standard, custom } = window.ptSDE_CARS.getAll();

    // Default option
    const defOpt = document.createElement('option');
    defOpt.value       = '';
    defOpt.textContent = '🚗 Peugeot 206 (Default)';
    select.appendChild(defOpt);

    // Standard Cars group
    const stdGroup = document.createElement('optgroup');
    stdGroup.label = '── Standard Cars ──';
    for (const car of standard) {
      const opt = document.createElement('option');
      opt.value       = car.key;
      opt.textContent = car.name;
      stdGroup.appendChild(opt);
    }
    select.appendChild(stdGroup);

    // Custom / Story Cars group
    const custGroup = document.createElement('optgroup');
    custGroup.label = '── Custom / Story Cars ──';
    for (const car of custom) {
      const opt = document.createElement('option');
      opt.value       = car.key;
      opt.textContent = car.name;
      custGroup.appendChild(opt);
    }
    select.appendChild(custGroup);
  }

  function openModal() {
    const modal = $('sde-modal');
    if (!modal) return;

    // Reset fields
    $('sde-modal-name').value  = '';
    $('sde-modal-money').value = '0';
    $('sde-modal-car').value   = '';

    modal.classList.add('sde-modal--open');
    $('sde-modal-name').focus();
  }

  function closeModal() {
    const modal = $('sde-modal');
    if (modal) modal.classList.remove('sde-modal--open');
  }

  function initModal() {
    // Build car select options once on init
    buildCarSelect();

    // Open modal button
    $('sde-btn-new-save').addEventListener('click', openModal);

    // Close on backdrop click
    $('sde-modal').addEventListener('click', (e) => {
      if (e.target === $('sde-modal')) closeModal();
    });

    // Close on X button
    $('sde-modal-close').addEventListener('click', closeModal);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Name input sanitize
    $('sde-modal-name').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase();
    });

    // Money input clamp
    $('sde-modal-money').addEventListener('blur', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) e.target.value = 0;
      if (val > 2147483647)      e.target.value = 2147483647;
    });

    // Max money shortcut inside modal
    $('sde-modal-max-money').addEventListener('click', () => {
      $('sde-modal-money').value = 2147483647;
    });

    // Confirm — Create & Download
    $('sde-modal-confirm').addEventListener('click', () => {
      const name         = $('sde-modal-name').value.trim();
      const money        = parseInt($('sde-modal-money').value, 10) || 0;
      const carKey       = $('sde-modal-car').value || null;
      const unlockParts  = $('sde-modal-unlock-parts').checked;

      if (!name) {
        toast(ptI18n.t('toast.err_name'), 'err');
        $('sde-modal-name').focus();
        return;
      }

      try {
        ptSDE.createProfile(name, money, carKey, unlockParts);
        const carLabel = carKey
          ? (window.ptSDE_CARS?.findByKey(carKey)?.name || carKey)
          : 'Peugeot 206 (Default)';
        const partsLabel = unlockParts ? ' + All Parts Unlocked' : '';
        toast(`Profile "${name}" — ${carLabel}${partsLabel} downloaded.`, 'ok');
        closeModal();
      } catch (err) {
        toast('❌ ' + err.message, 'err');
      }
    });
  }

  /* ----------------------------------------------------------
     CLONE
  ---------------------------------------------------------- */

  function initClone() {
    $('sde-btn-clone').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast(ptI18n.t('toast.load_save_first'), 'err'); return; }
      const name = $('sde-clone-name').value.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!name) { toast(ptI18n.t('toast.err_clone_name'), 'err'); return; }
      try {
        ptSDE.cloneSave(name);
        toast(ptI18n.t('toast.cloned', {name: name}), 'ok');
      } catch (err) {
        toast('❌ ' + err.message, 'err');
      }
    });

    $('sde-clone-name').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase();
    });
  }

  /* ----------------------------------------------------------
     CHEATS
  ---------------------------------------------------------- */

  function initCheats() {
    $('sde-btn-unlock-parts').addEventListener('click', () => {
      ptSDE.unlockAllParts();
      toast(ptI18n.t('toast.parts_unlocked'), 'ok');
    });

    $('sde-btn-unlock-slots').addEventListener('click', () => {
      ptSDE.unlockAllSlots();
      toast(ptI18n.t('toast.slots_unlocked'), 'ok');
      renderSlotCards();
    });

    $('sde-btn-max-money').addEventListener('click', () => {
      ptSDE.maxMoney();
      $('sde-input-money').value = 2147483647;
      toast(ptI18n.t('toast.money_maxed'), 'ok');
    });
  }

  /* ----------------------------------------------------------
     DOWNLOAD
  ---------------------------------------------------------- */

  function initDownload() {
    $('sde-btn-download').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast(ptI18n.t('toast.no_save'), 'err'); return; }
      const name  = $('sde-input-name').value.trim();
      const money = parseInt($('sde-input-money').value, 10);
      if (name)          ptSDE.setName(name);
      if (!isNaN(money)) ptSDE.setMoney(money);
      ptSDE.downloadSave();
      toast(ptI18n.t('toast.save_downloaded'), 'ok');
    });

    $('sde-btn-backup').addEventListener('click', () => {
      if (!ptSDE.isLoaded()) { toast(ptI18n.t('toast.no_save'), 'err'); return; }
      ptSDE.downloadBackup();
      toast(ptI18n.t('toast.backup_downloaded'), 'ok');
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
    initModal();
    initClone();
    initCheats();
    initDownload();
  });

}());
