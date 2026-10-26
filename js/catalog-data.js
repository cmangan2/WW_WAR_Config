/* Default parts list. On the live site the WordPress plugin replaces this with
   whatever is set on its admin page (window.WWAC_CATALOG); the static test pages
   use it as-is. The plugin also reads this file to seed its admin page, so keep
   it as a single JSON object after the "=".

   price:   what the option ADDS to the base rifle (placeholders for now)
   look:    which built-in shape the 2D/3D preview draws for the option
   rail:    inches of upper-receiver top rail the part takes up
   fields:  the per-option settings the admin page shows for that category */
window.WWAC_DEFAULT_DATA = {
  "shop": { "name": "Wicked Weaponry", "quoteEmail": "", "samplePrices": true },
  "base": {
    "name": "Basic M4-style carbine, 5.56 NATO", "price": 899, "productId": null, "priceFrom": "manual",
    "includes": "16\" barrel, carbine gas, A2 front sight base, polymer handguard, 6-position stock, mil-spec trigger, flip-up rear sight, one 30-rd magazine. Every build is function-checked and lubed."
  },
  "upperRail": 7.0,
  "autoParts": {
    "gasBlock":    { "name": "Low-profile gas block (replaces front sight base)", "price": 59 },
    "rifleBuffer": { "name": "Rifle buffer tube, spring & buffer", "price": 65 },
    "pinWeld":     { "name": "Pin & weld muzzle device", "price": 0 }
  },
  "categories": [
    { "id": "barrel", "label": "Barrel", "default": "b16", "allowCustom": true,
      "fields": [ { "key": "len", "label": "Barrel length (in)", "type": "number" },
                  { "key": "pinned", "label": "Pinned & welded muzzle device", "type": "bool" } ],
      "options": [
        { "id": "b16",  "name": "16\" government profile", "price": 0, "len": 16, "sub": "Standard M4 setup" },
        { "id": "b145", "name": "14.5\" pinned & welded", "price": 120, "len": 14.5, "pinned": true, "sub": "Muzzle device is pinned in-house to make 16\" legal length — it can't be swapped later" },
        { "id": "b18",  "name": "18\" rifle-length gas", "price": 90, "len": 18, "sub": "Softer recoil, more velocity" }
      ] },
    { "id": "handguard", "label": "Handguard", "default": "hgc", "allowCustom": true,
      "fields": [ { "key": "ff", "label": "Free-float (replaces the front sight base)", "type": "bool" },
                  { "key": "len", "label": "Length (in)", "type": "number" } ],
      "options": [
        { "id": "hgc",  "name": "Carbine polymer handguard", "price": 0, "ff": false, "len": 7, "sub": "Keeps the A2 front sight base" },
        { "id": "hg10", "name": "10\" free-float M-LOK", "price": 189, "ff": true, "len": 10 },
        { "id": "hg13", "name": "13\" free-float M-LOK", "price": 209, "ff": true, "len": 13 },
        { "id": "hg15", "name": "15\" free-float M-LOK", "price": 229, "ff": true, "len": 15 }
      ] },
    { "id": "muzzle", "label": "Muzzle device", "default": "a2", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Shown as", "type": "select",
                    "choices": { "a2": "A2 birdcage", "tri": "3-prong flash hider", "comp": "Compensator", "qd": "Suppressor mount" } } ],
      "options": [
        { "id": "a2",   "name": "A2 birdcage flash hider", "price": 0, "look": "a2" },
        { "id": "tri",  "name": "3-prong flash hider", "price": 79, "look": "tri" },
        { "id": "comp", "name": "Compensator", "price": 99, "look": "comp", "sub": "Less muzzle rise, more side blast" },
        { "id": "qd",   "name": "Suppressor-ready QD mount", "price": 149, "look": "qd" }
      ] },
    { "id": "optic", "label": "Optic", "default": "none", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Type", "type": "select", "choices": { "none": "No optic", "reddot": "Red dot", "lpvo": "LPVO / scope" } },
                  { "key": "tube", "label": "Scope tube (mm)", "type": "select", "choices": { "": "—", "30": "30 mm", "34": "34 mm" } },
                  { "key": "rail", "label": "Rail space used (in)", "type": "number" },
                  { "key": "mountName", "label": "Mount it needs", "type": "text" },
                  { "key": "mountPrice", "label": "Mount price", "type": "number" } ],
      "options": [
        { "id": "none", "name": "No optic — iron sights", "price": 0, "look": "none" },
        { "id": "rd",   "name": "1x red dot", "price": 299, "look": "reddot", "rail": 1.5, "mountName": "Absolute co-witness riser", "mountPrice": 49 },
        { "id": "lp6",  "name": "1–6x LPVO (30 mm tube)", "price": 499, "look": "lpvo", "tube": "30", "rail": 5.0, "mountName": "30 mm cantilever mount", "mountPrice": 129 },
        { "id": "lp8",  "name": "1–8x LPVO (34 mm tube)", "price": 799, "look": "lpvo", "tube": "34", "rail": 5.0, "mountName": "34 mm cantilever mount", "mountPrice": 159 }
      ] },
    { "id": "magnifier", "label": "Magnifier", "default": "none", "allowCustom": false,
      "fields": [ { "key": "look", "label": "Type", "type": "select", "choices": { "none": "None", "magnifier": "Magnifier" } },
                  { "key": "rail", "label": "Rail space used (in)", "type": "number" } ],
      "options": [
        { "id": "none", "name": "None", "price": 0, "look": "none" },
        { "id": "mag3", "name": "3x flip-to-side magnifier", "price": 249, "look": "magnifier", "rail": 2.5, "sub": "Mounts behind a red dot" }
      ] },
    { "id": "rear", "label": "Rear sight", "default": "bu", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Type", "type": "select", "choices": { "none": "None", "flip": "Flip-up sight" } },
                  { "key": "rail", "label": "Rail space used (in)", "type": "number" } ],
      "options": [
        { "id": "bu",   "name": "Flip-up rear sight", "price": 0, "look": "flip", "rail": 1.2, "sub": "Included" },
        { "id": "none", "name": "None", "price": 0, "look": "none" }
      ] },
    { "id": "front", "label": "Front sight", "default": "none", "allowCustom": true, "requiresFreeFloat": true,
      "fields": [ { "key": "look", "label": "Type", "type": "select", "choices": { "none": "None", "flip": "Flip-up sight" } } ],
      "options": [
        { "id": "bu",   "name": "Flip-up front sight", "price": 59, "look": "flip", "sub": "Mounts on the handguard rail" },
        { "id": "none", "name": "None", "price": 0, "look": "none" }
      ] },
    { "id": "stock", "label": "Stock", "default": "m4", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Shown as", "type": "select", "choices": { "m4": "M4 6-position", "sopmod": "SOPMOD-style", "fixed": "Fixed rifle stock" } },
                  { "key": "rifleBuffer", "label": "Needs rifle buffer system", "type": "bool" } ],
      "options": [
        { "id": "m4",   "name": "M4 6-position", "price": 0, "look": "m4" },
        { "id": "sop",  "name": "SOPMOD-style 6-position", "price": 89, "look": "sopmod", "sub": "Wider cheek weld, storage tubes" },
        { "id": "a2s",  "name": "Fixed A2 rifle stock", "price": 69, "look": "fixed", "rifleBuffer": true, "sub": "Needs a rifle buffer system (added automatically)" }
      ] },
    { "id": "grip", "label": "Pistol grip", "default": "a2", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Shown as", "type": "select", "choices": { "a2": "A2", "ergo": "Ergonomic", "vertical": "Vertical-angle" } } ],
      "options": [
        { "id": "a2",   "name": "A2 grip", "price": 0, "look": "a2" },
        { "id": "ergo", "name": "Ergonomic rubber-overmold grip", "price": 25, "look": "ergo" },
        { "id": "vert", "name": "Vertical-angle grip", "price": 35, "look": "vertical", "sub": "Suits a squared-up stance" }
      ] },
    { "id": "trigger", "label": "Trigger", "default": "mil", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Shown as", "type": "select", "choices": { "milspec": "Mil-spec (grey)", "upgraded": "Upgraded (red)" } } ],
      "options": [
        { "id": "mil",  "name": "Mil-spec single stage", "price": 0, "look": "milspec" },
        { "id": "enh",  "name": "Enhanced single stage", "price": 149, "look": "upgraded", "sub": "Lighter, crisper break" },
        { "id": "two",  "name": "Two-stage match trigger", "price": 229, "look": "upgraded" }
      ] },
    { "id": "ch", "label": "Charging handle", "default": "mil", "allowCustom": true,
      "fields": [ { "key": "look", "label": "Shown as", "type": "select", "choices": { "milspec": "Mil-spec", "ambi": "Ambidextrous" } } ],
      "options": [
        { "id": "mil",  "name": "Mil-spec", "price": 0, "look": "milspec" },
        { "id": "ambi", "name": "Ambidextrous latch", "price": 79, "look": "ambi" }
      ] },
    { "id": "finish", "label": "Finish (done in house)", "default": "blk", "allowCustom": true,
      "customHint": "Describe the colour or pattern you want",
      "fields": [ { "key": "color", "label": "Preview colour", "type": "color" } ],
      "options": [
        { "id": "blk",  "name": "Black anodized", "price": 0, "color": "#2b2c2f" },
        { "id": "fde",  "name": "Cerakote Flat Dark Earth", "price": 250, "color": "#a8916c" },
        { "id": "odg",  "name": "Cerakote O.D. Green", "price": 250, "color": "#5a5f45" },
        { "id": "sgy",  "name": "Cerakote Sniper Grey", "price": 250, "color": "#6c7177" },
        { "id": "tng",  "name": "Cerakote Tungsten", "price": 250, "color": "#5b5c5e" }
      ] },
    { "id": "services", "label": "Services", "multi": true, "allowCustom": false, "fields": [],
      "options": [
        { "id": "bore", "name": "Boresighting", "price": 25 },
        { "id": "zero", "name": "Test fire & zero at 50 yd", "price": 75 }
      ] }
  ]
};
