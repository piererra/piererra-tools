/* ============================================================
   ptSDE-community-cars.js -- NFSU2 Save Data Editor by Piererra
   Community-submitted car patch database, embedded as JavaScript.

   This replaces the old data/ptSDE-community-cars.json, which had
   two separate problems:
     1. It was loaded over the network via synchronous XHR, the same
        fragile mechanism that caused the builtin car dropdown to
        break on mobile once the dataset grew.
     2. The file itself contained invalid JSON (a raw, unescaped line
        break inside a string value), which made JSON.parse() throw
        and silently fail -- so none of its entries were ever actually
        loading in the first place.

   Left empty for now since none of that data was ever verified
   against a real save file (unlike the builtin set, which has been
   extracted and confirmed byte-for-byte from real saves). Add
   verified entries here using the same {id, name, category, data}
   shape used in ptSDE-builtin-cars.js, with 'off' values relative to
   the start of a car slot (0 .. 0x7F1).

   Used by ptSDE-cars.js, which reads window.ptSDE_COMMUNITY_CARS
   directly.
============================================================ */

window.ptSDE_COMMUNITY_CARS = [];
