/* ============================================================
   ptSDE-cars.js — NFSU2 Save Data Editor by Piererra
   Car registry: loads, merges, and exposes all car data

   Responsibilities:
     - Parse ptSDE-builtin-cars.json  (rival/NPC cars from game)
     - Parse ptSDE-community-cars.json (community patch cars)
     - Merge into window.ptSDE_CARS — single flat array
     - Expose window.ptSDE_CAR_MAP   — id → car lookup object

   Data shape per car:
     {
       id:       string   — unique identifier (e.g. "builtin_skyline")
       name:     string   — display name (e.g. "Rachel's 350Z")
       category: string   — group label for dropdown optgroup
       data:     [{off: number, hex: string}, ...]  — patch array
     }

   Load order in nfsu2-editor.html:
     1. ptSDE-template.js     (blank save)
     2. ptSDE-builtin-cars.json  loaded as text by this file
     3. ptSDE-community-cars.json loaded as text by this file
     4. ptSDE-cars.js         ← THIS FILE
     5. ptSDE-core.js
     6. ptSDE-ui.js
============================================================ */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     FETCH & PARSE JSON data files at runtime
     Both JSON files are in /data/ relative to the HTML page.
     We use synchronous XHR so the data is ready before
     ptSDE-ui.js tries to populate the dropdown.
  ---------------------------------------------------------- */

  function loadJSON(path) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', path, false);   // synchronous
      xhr.send(null);
      if (xhr.status === 200 || xhr.status === 0) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) {
      console.warn('[ptSDE-cars] Could not load ' + path + ':', e.message);
    }
    return [];
  }

  /* ----------------------------------------------------------
     LOAD BOTH SOURCES
  ---------------------------------------------------------- */

  const builtinRaw   = loadJSON('data/ptSDE-builtin-cars.json');
  const communityRaw = loadJSON('data/ptSDE-community-cars.json');

  /* ----------------------------------------------------------
     NORMALISE — ensure every entry has an id, name, category
  ---------------------------------------------------------- */

  function normalise(cars, defaultCategory) {
    return cars.map((car, idx) => ({
      id:       car.id       || (defaultCategory.toLowerCase().replace(/\s+/g, '_') + '_' + idx),
      name:     car.name     || 'Unknown Car',
      category: car.category || defaultCategory,
      data:     Array.isArray(car.data) ? car.data : [],
    }));
  }

  const builtinCars   = normalise(builtinRaw,   'Rivals & NPCs');
  const communityCars = normalise(communityRaw,  'Community Cars');

  /* ----------------------------------------------------------
     MERGE — builtin first, community second
  ---------------------------------------------------------- */

  const allCars = [...builtinCars, ...communityCars];

  /* ----------------------------------------------------------
     LOOKUP MAP  id → car
  ---------------------------------------------------------- */

  const carMap = {};
  for (const car of allCars) {
    carMap[car.id] = car;
  }

  /* ----------------------------------------------------------
     EXPORT
  ---------------------------------------------------------- */

  global.ptSDE_CARS    = allCars;   // flat array — used by ptSDE-ui.js dropdown
  global.ptSDE_CAR_MAP = carMap;    // id lookup — used by ptSDE-core.js inject

  console.log(
    '[ptSDE-cars] Loaded ' + builtinCars.length + ' builtin + ' +
    communityCars.length + ' community cars (' + allCars.length + ' total).'
  );

}(window));
