/* ============================================================
   ptSDE-cars.js — NFSU2 Save Data Editor by Piererra
   Car registry: loads, merges, and exposes all car data

   Responsibilities:
     - Read window.ptSDE_BUILTIN_CARS   (rival/NPC + verified cars, set by ptSDE-builtin-cars.js)
     - Read window.ptSDE_COMMUNITY_CARS (community patch cars, set by ptSDE-community-cars.js)
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
     1. ptSDE-template.js        (blank save)
     2. ptSDE-builtin-cars.js    sets window.ptSDE_BUILTIN_CARS
     3. ptSDE-community-cars.js  sets window.ptSDE_COMMUNITY_CARS
     4. ptSDE-cars.js            ← THIS FILE
     5. ptSDE-core.js
     6. ptSDE-ui.js
============================================================ */

(function (global) {
  'use strict';

  /* ----------------------------------------------------------
     READ embedded data
     Car data now ships as plain JavaScript (window.ptSDE_BUILTIN_CARS /
     window.ptSDE_COMMUNITY_CARS), set directly by ptSDE-builtin-cars.js
     and ptSDE-community-cars.js — no network fetch involved. (A
     previous version used synchronous XHR to load separate .json
     files; that approach proved unreliable on some mobile browsers
     once the car dataset grew past a few KB, so it's been dropped in
     favor of embedding the data the same way ptSDE-template.js does.)
  ---------------------------------------------------------- */

  function readEmbedded(globalVarName) {
    const arr = global[globalVarName];
    if (Array.isArray(arr)) return arr;
    console.warn('[ptSDE-cars] ' + globalVarName + ' was not found or not an array — is the corresponding <script> tag included before ptSDE-cars.js?');
    return [];
  }

  /* ----------------------------------------------------------
     LOAD BOTH SOURCES
  ---------------------------------------------------------- */

  const builtinRaw   = readEmbedded('ptSDE_BUILTIN_CARS');
  const communityRaw = readEmbedded('ptSDE_COMMUNITY_CARS');

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
