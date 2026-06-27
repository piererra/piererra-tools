/* ============================================================
   ptMWE-ui.js — NFSMW Save Editor · UI Layer
   Author  : Piererra
   Project : Piererra Tools
   ──────────────────────────────────────────────────────────
   Depends on (must load before this file):
     js/pt-i18n.js      — translation helper
     js/ptMWE-core.js   — binary engine, offset map, state

   Responsibilities:
     · Dropzone / file input wiring
     · Platform toggle (PC / PS2)
     · Info bar population
     · Dynamic field rendering for:
         infractions, lifetime pursuit, single best,
         per-car records, per-pursuit records
     · All input → core write-helper calls
     · Toast notifications
     · Download / backup buttons
     · Language selector wiring
============================================================ */

(function () {
  'use strict';

  /* ── $ SHORTHAND ──────────────────────────────────────── */
  let $;  /* set in DOMContentLoaded */

  /* ── TOAST ────────────────────────────────────────────── */

  let _toastTimer = null;

  function toast(msg, type) {
    type = type || 'info';
    var el = $('mwe-toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'mwe-toast mwe-toast--' + type + ' mwe-toast--show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      el.classList.remove('mwe-toast--show');
    }, 3000);
  }

  /* ── INFO BAR ─────────────────────────────────────────── */

  function updateInfoBar(snapshot, fileSize) {
    $('mwe-info-name').textContent     = snapshot.name     || '—';
    $('mwe-info-money').textContent    = '$' + snapshot.money.toLocaleString();
    $('mwe-info-bounty').textContent   = snapshot.pursuitBounty.toLocaleString();
    $('mwe-info-size').textContent     = (fileSize / 1024).toFixed(1) + ' KB';
    $('mwe-info-hash').textContent     = snapshot.hashHex.slice(0, 8) + '…';
    $('mwe-infobar').hidden = false;
  }

  function refreshHash() {
    var el = $('mwe-info-hash');
    if (!el) return;
    el.textContent = mweCurrentHashHex().slice(0, 8) + '…';
  }

  /* ── FIELD BUILDERS ───────────────────────────────────── */

  /* Build one labeled number input inside a given parent element.
     onChange(value) is called with the parsed integer on blur/Enter. */
  function buildNumberField(parent, labelText, value, onChange) {
    var wrap  = document.createElement('div');
    wrap.className = 'mwe-stat-field';

    var lbl = document.createElement('div');
    lbl.className   = 'mwe-stat-field__label';
    lbl.textContent = labelText;

    var inp = document.createElement('input');
    inp.type      = 'number';
    inp.className = 'mwe-input';
    inp.min       = '0';
    inp.max       = '4294967295';
    inp.value     = value;

    inp.addEventListener('change', function () {
      var v = parseInt(inp.value, 10);
      if (isNaN(v) || v < 0) { v = 0; inp.value = 0; }
      if (v > 4294967295)    { v = 4294967295; inp.value = v; }
      onChange(v);
      refreshHash();
    });

    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    parent.appendChild(wrap);
    return inp;
  }

  /* Same but Uint16 max (65535) */
  function buildU16Field(parent, labelText, value, onChange) {
    var wrap  = document.createElement('div');
    wrap.className = 'mwe-stat-field';

    var lbl = document.createElement('div');
    lbl.className   = 'mwe-stat-field__label';
    lbl.textContent = labelText;

    var inp = document.createElement('input');
    inp.type      = 'number';
    inp.className = 'mwe-input';
    inp.min       = '0';
    inp.max       = '65535';
    inp.value     = value;

    inp.addEventListener('change', function () {
      var v = parseInt(inp.value, 10);
      if (isNaN(v) || v < 0) { v = 0; inp.value = 0; }
      if (v > 65535)         { v = 65535; inp.value = v; }
      onChange(v);
      refreshHash();
    });

    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    parent.appendChild(wrap);
    return inp;
  }

  /* ── RENDER — INFRACTIONS ─────────────────────────────── */

  var INFRACTION_LABELS = {
    speeding:          'Speeding',
    excessiveSpeeding: 'Excessive Speeding',
    recklessDriving:   'Reckless Driving',
    rammingPolice:     'Ramming a Police Vehicle',
    hitAndRun:         'Hit and Run',
    damageToProperty:  'Damage to Property',
    resistingArrest:   'Resisting Arrest',
    drivingOffRoadway: 'Driving Off Roadway',
  };

  function renderInfractions(snapshot) {
    var grid = $('mwe-infractions-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var keys = Object.keys(INFRACTION_LABELS);
    keys.forEach(function (key) {
      buildU16Field(
        grid,
        INFRACTION_LABELS[key],
        snapshot.infractions[key],
        function (v) { mweSetInfraction(key, v); }
      );
    });
  }

  /* ── RENDER — LIFETIME PURSUIT ────────────────────────── */

  var LIFETIME_LABELS = {
    length:              'Pursuit Length',
    policeInvolved:      'Police Vehicles Involved',
    policeDamaged:       'Police Vehicles Damaged',
    policeImmobilized:   'Police Vehicles Immobilized',
    spikeStripsDodged:   'Spike Strips Dodged',
    roadblocksDodged:    'Roadblocks Dodged',
    helicoptersDeployed: 'Helicopters Deployed',
    costToState:         'Cost to State',
  };

  function renderLifetime(snapshot) {
    var grid = $('mwe-lifetime-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var keys = Object.keys(LIFETIME_LABELS);
    keys.forEach(function (key) {
      buildNumberField(
        grid,
        LIFETIME_LABELS[key],
        snapshot.lifetime[key],
        function (v) { mweSetLifetime(key, v); }
      );
    });
  }

  /* ── RENDER — SINGLE BEST PURSUIT ────────────────────── */

  var SINGLEBEST_LABELS = {
    length:              'Pursuit Length',
    policeInvolved:      'Police Vehicles Involved',
    policeDamaged:       'Police Vehicles Damaged',
    policeImmobilized:   'Police Vehicles Immobilized',
    spikeStripsDodged:   'Spike Strips Dodged',
    roadblocksDodged:    'Roadblocks Dodged',
    helicoptersDeployed: 'Helicopters Deployed',
    costToState:         'Cost to State',
    infractionsRecorded: 'Infractions Recorded',
    bountyAchieved:      'Bounty Achieved',
  };

  function renderSingleBest(snapshot) {
    var grid = $('mwe-singlebest-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var keys = Object.keys(SINGLEBEST_LABELS);
    keys.forEach(function (key) {
      buildNumberField(
        grid,
        SINGLEBEST_LABELS[key],
        snapshot.singleBest[key],
        function (v) { mweSetSingleBest(key, v); }
      );
    });
  }

  /* ── RENDER — PER-CAR RECORDS ─────────────────────────── */

  function renderCars(snapshot) {
    var container = $('mwe-cars-container');
    if (!container) return;
    container.innerHTML = '';

    if (!snapshot.cars || snapshot.cars.length === 0) {
      var empty = document.createElement('p');
      empty.className   = 'mwe-section__desc';
      empty.textContent = 'No active car slots found in this save.';
      container.appendChild(empty);
      return;
    }

    snapshot.cars.forEach(function (car) {
      var card = document.createElement('div');
      card.className = 'mwe-car-card';

      /* Card header */
      var header = document.createElement('div');
      header.className = 'mwe-car-card__header';

      var title = document.createElement('div');
      title.className   = 'mwe-car-card__title';
      title.textContent = car.carId || ('CAR SLOT ' + (car.index + 1));

      var slot = document.createElement('div');
      slot.className   = 'mwe-car-card__slot';
      slot.textContent = 'SLOT ' + (car.index + 1);

      header.appendChild(title);
      header.appendChild(slot);
      card.appendChild(header);

      /* Bounty field */
      var bountyWrap = document.createElement('div');
      bountyWrap.className = 'mwe-row';
      buildNumberField(
        bountyWrap,
        'Bounty',
        car.bounty,
        (function (idx) {
          return function (v) { mweSetCarBounty(idx, v); };
        }(car.index))
      );
      card.appendChild(bountyWrap);

      /* Infraction fields grid */
      var infrGrid = document.createElement('div');
      infrGrid.className = 'mwe-grid-2';

      var infrKeys = Object.keys(INFRACTION_LABELS);
      infrKeys.forEach(function (key) {
        buildU16Field(
          infrGrid,
          INFRACTION_LABELS[key],
          car.infractions[key],
          (function (idx, k) {
            return function (v) { mweSetCarInfraction(idx, k, v); };
          }(car.index, key))
        );
      });

      card.appendChild(infrGrid);
      container.appendChild(card);
    });
  }

  /* ── RENDER — PER-PURSUIT RECORDS ─────────────────────── */

  var PURSUIT_STAT_LABELS = {
    length:              'Pursuit Length',
    bountyAchieved:      'Bounty Achieved',
    policeInvolved:      'Police Vehicles Involved',
    policeDamaged:       'Police Vehicles Damaged',
    policeImmobilized:   'Police Vehicles Immobilized',
    roadblocksDodged:    'Roadblocks Dodged',
    spikeStripsDodged:   'Spike Strips Dodged',
    costToState:         'Cost to State',
    infractionsRecorded: 'Infractions Recorded',
    helicoptersDeployed: 'Helicopters Deployed',
  };

  function renderPursuits(snapshot) {
    var container = $('mwe-pursuits-container');
    if (!container) return;
    container.innerHTML = '';

    if (!snapshot.pursuits || snapshot.pursuits.length === 0) {
      var empty = document.createElement('p');
      empty.className   = 'mwe-section__desc';
      empty.textContent = 'No pursuit records found in this save.';
      container.appendChild(empty);
      return;
    }

    snapshot.pursuits.forEach(function (pursuit) {
      var card = document.createElement('div');
      card.className = 'mwe-pursuit-card';

      var title = document.createElement('div');
      title.className   = 'mwe-pursuit-card__title';
      title.textContent = 'PURSUIT ' + (pursuit.index + 1) +
        (pursuit.pursuitId ? ' — ' + pursuit.pursuitId : '');
      card.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'mwe-grid-2';

      var statKeys = Object.keys(PURSUIT_STAT_LABELS);
      statKeys.forEach(function (key) {
        buildNumberField(
          grid,
          PURSUIT_STAT_LABELS[key],
          pursuit.stats[key],
          (function (idx, k) {
            return function (v) { mweSetPursuitStat(idx, k, v); };
          }(pursuit.index, key))
        );
      });

      card.appendChild(grid);
      container.appendChild(card);
    });
  }

  /* ── RENDER — ALL SECTIONS ────────────────────────────── */

  function renderAll(snapshot) {
    renderInfractions(snapshot);
    renderLifetime(snapshot);
    renderSingleBest(snapshot);
    renderCars(snapshot);
    renderPursuits(snapshot);
  }

  /* ── POPULATE PROFILE FIELDS ──────────────────────────── */

  function populateProfileFields(snapshot) {
    $('mwe-input-money').value    = snapshot.money;
    $('mwe-input-bounty').value   = snapshot.pursuitBounty;
    $('mwe-input-casename').value = snapshot.caseName;
  }

  /* ── FILE LOAD ────────────────────────────────────────── */

  function handleFile(file) {
    if (!file) return;

    var reader = new FileReader();

    reader.onload = function (e) {
      var result = mweLoadFile(e.target.result, 'pc', file.name);

      if (!result.ok) {
        toast('Error: ' + result.error, 'err');
        return;
      }

      /* Mark dropzone as loaded */
      var dropzone = $('mwe-dropzone');
      var textEl   = $('mwe-dropzone-text');
      if (dropzone) dropzone.classList.add('mwe-dropzone--loaded');
      if (textEl)   textEl.textContent = file.name;

      /* Auto-backup */
      if ($('mwe-auto-backup') && $('mwe-auto-backup').checked) {
        mweDownloadBackup();
        toast('Loaded — backup downloaded.', 'ok');
      } else {
        toast('Loaded: ' + file.name, 'ok');
      }

      var snapshot = result.snapshot;
      updateInfoBar(snapshot, file.size);
      populateProfileFields(snapshot);

      /* Show editor body */
      $('mwe-editor-body').hidden = false;

      /* Render dynamic sections */
      renderAll(snapshot);
    };

    reader.onerror = function () {
      toast('Failed to read file.', 'err');
    };

    reader.readAsArrayBuffer(file);
  }

  /* ── DROPZONE INIT ────────────────────────────────────── */

  function initDropzone() {
    var fileInput = $('mwe-file-input');
    var dropzone  = $('mwe-dropzone');
    if (!dropzone || !fileInput) return;

    /* Click anywhere on dropzone (except file input itself) to open picker */
    dropzone.addEventListener('click', function (e) {
      if (e.target === fileInput) return;
      fileInput.click();
    });

    /* Keyboard: Enter / Space opens picker */
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });

    /* File selected via picker */
    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    /* Drag and drop */
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('mwe-dropzone--over');
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('mwe-dropzone--over');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('mwe-dropzone--over');
      var file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  /* ── PROFILE FIELD EVENTS ─────────────────────────────── */

  function initProfileFields() {
    /* Money — apply on blur */
    $('mwe-input-money').addEventListener('blur', function (e) {
      if (!ptMWE.buffer) return;
      var v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 0) { v = 0; e.target.value = 0; }
      if (v > 4294967295)    { v = 4294967295; e.target.value = v; }
      mweSetMoney(v);
      $('mwe-info-money').textContent = '$' + v.toLocaleString();
      refreshHash();
      toast('Money updated.', 'ok');
    });

    /* Bounty — apply on blur */
    $('mwe-input-bounty').addEventListener('blur', function (e) {
      if (!ptMWE.buffer) return;
      var v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 0) { v = 0; e.target.value = 0; }
      if (v > 4294967295)    { v = 4294967295; e.target.value = v; }
      mweSetBounty(v);
      $('mwe-info-bounty').textContent = v.toLocaleString();
      refreshHash();
      toast('Pursuit bounty updated.', 'ok');
    });

    /* Case name — sanitize on input, apply on blur */
    $('mwe-input-casename').addEventListener('input', function (e) {
      /* Allow alphanumeric + space only, max 12 chars */
      e.target.value = e.target.value.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12);
    });

    $('mwe-input-casename').addEventListener('blur', function (e) {
      if (!ptMWE.buffer) return;
      mweSetCaseName(e.target.value);
      refreshHash();
      toast('Case name updated.', 'ok');
    });
  }

  /* ── DOWNLOAD BUTTONS ─────────────────────────────────── */

  function initDownload() {
    $('mwe-btn-download').addEventListener('click', function () {
      if (!ptMWE.buffer) {
        toast('Load a save file first.', 'err');
        return;
      }
      mweDownload(ptMWE.filename);
      toast('Save file downloaded.', 'ok');
    });

    $('mwe-btn-backup').addEventListener('click', function () {
      if (!ptMWE.buffer) {
        toast('Load a save file first.', 'err');
        return;
      }
      mweDownloadBackup();
      toast('Backup downloaded.', 'ok');
    });
  }

  /* ── LANGUAGE SELECTOR ────────────────────────────────── */

  function initLangSelect() {
    var sel = $('mwe-lang-select');
    if (!sel || typeof ptI18n === 'undefined') return;

    sel.addEventListener('change', function () {
      ptI18n.setLang(sel.value);
    });
  }

  /* ── INIT ─────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    $ = function (id) { return document.getElementById(id); };

    initDropzone();
    initProfileFields();
    initDownload();
    initLangSelect();
  });

}());
