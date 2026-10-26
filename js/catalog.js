/* Parts list and fitment rules shared by the 2D and 3D pages.
   The data comes from the WordPress plugin when it's on the page
   (window.WWAC_CATALOG), otherwise from js/catalog-data.js. */
const DATA = window.WWAC_CATALOG || window.WWAC_DEFAULT_DATA;
const SHOP = DATA.shop;
const BASE = DATA.base;
const UPPER_RAIL = DATA.upperRail || 7;
const AUTO = DATA.autoParts;

// Hidden options drop out; categories that allow it get a "custom request" choice last.
const CATEGORIES = DATA.categories.map(c => {
  const options = c.options.filter(o => o.enabled !== false);
  if (c.allowCustom && !c.multi) options.push({
    id: "custom", custom: true, price: 0, name: "Custom request",
    sub: c.customHint || "Want something we don't list? Tell us the part and we'll source it."
  });
  return { ...c, options };
});
const catById = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const DEFAULT = Object.fromEntries(CATEGORIES.map(c => {
  if (c.multi) return [c.id, []];
  const real = c.options.filter(o => !o.custom);
  return [c.id, (real.find(o => o.id === c.default) || real[0] || c.options[0]).id];
}));
DEFAULT.custom = {};   // free-text descriptions of custom requests, by category

// The option chosen in a category. A custom request is checked and drawn as the
// category's default part, since its real dimensions aren't known until the shop sources it.
function opt(cat, b) {
  const c = catById[cat];
  const o = c.options.find(o => o.id === b[cat]) || c.options.find(o => o.id === DEFAULT[cat]);
  if (!o.custom) return o;
  const stand = c.options.find(o => o.id === DEFAULT[cat]);
  const text = (b.custom && b.custom[cat] || "").trim();
  return { ...stand, id: "custom", custom: true, price: 0, productId: null, inStock: undefined,
           name: text ? `Custom: ${text}` : "Custom request (details to follow)" };
}
const look = (cat, b) => opt(cat, b).look;
function shown(c, b) { return !c.requiresFreeFloat || opt("handguard", b).ff; }
function firstWithLook(cat, l) { return (catById[cat].options.find(o => o.look === l) || catById[cat].options[0]).id; }
function hasCustom(b) { return CATEGORIES.some(c => shown(c, b) && b[c.id] === "custom"); }

const $ = id => document.getElementById(id);
const money = n => "$" + n.toLocaleString("en-US");

// Bring dependent parts in line after a change. Returns notices about what moved.
function autofix(b){
  const notes=[];
  if(!opt("handguard",b).ff) b.front=firstWithLook("front","none");
  if(look("magnifier",b)!=="none" && look("optic",b)!=="reddot"){ b.magnifier=firstWithLook("magnifier","none"); notes.push("Magnifier removed — it needs a red dot to sit behind."); }
  return notes;
}

function railUsed(b){
  return ["optic","magnifier","rear"].reduce((s,c)=>s+(+opt(c,b).rail||0),0);
}

// Builds that can't be assembled. An option that would cause one is greyed out.
function errors(b){
  const e=[], bar=opt("barrel",b), hg=opt("handguard",b);
  if(hg.ff && hg.len > bar.len-1) e.push(`A ${hg.len}" handguard is too long for a ${bar.len}" barrel — use a ${bar.len-1}" or shorter handguard, or a longer barrel.`);
  if(look("magnifier",b)!=="none" && look("optic",b)!=="reddot") e.push("A magnifier needs a red dot in front of it.");
  const used=railUsed(b);
  if(used>UPPER_RAIL) e.push(`Not enough top rail: needs ${used.toFixed(1)}" of ${UPPER_RAIL}".`);
  return e;
}

// Things worth telling the customer that don't stop the build.
function warnings(b){
  const w=[], ff=opt("handguard",b).ff, optic=look("optic",b);
  const hasFront = !ff || look("front",b)!=="none";
  const customSights = ["optic","rear","front"].some(c=>opt(c,b).custom);
  if(customSights){ /* can't judge sights until the custom part is known */ }
  else if(optic==="none" && look("rear",b)==="none") w.push({t:"warn", m:"No sights or optic selected."});
  else if(optic==="none" && !hasFront) w.push({t:"warn", m:"Iron sights need a front sight — add a flip-up front sight."});
  if(optic==="lpvo" && look("rear",b)!=="none") w.push({t:"info", m:"The rear sight folds down under the LPVO and won't co-witness."});
  if(opt("barrel",b).pinned) w.push({t:"info", m:`Your ${opt("muzzle",b).name.toLowerCase()} will be pinned & welded — pick carefully.`});
  const custom=CATEGORIES.filter(c=>shown(c,b) && b[c.id]==="custom").map(c=>c.label.toLowerCase());
  if(custom.length) w.push({t:"info", m:`We'll source your custom ${custom.join(", ")}, confirm it fits, and price it in your quote.`});
  return w;
}

// Parts added because of other choices.
function autoLines(b){
  const l=[], o=opt("optic",b);
  if(opt("handguard",b).ff) l.push(AUTO.gasBlock);
  if(o.mountName) l.push({name:o.mountName, price:+o.mountPrice||0});
  if(opt("stock",b).rifleBuffer) l.push(AUTO.rifleBuffer);
  if(opt("barrel",b).pinned) l.push(AUTO.pinWeld);
  return l;
}

function priceOf(b){
  let t=BASE.price;
  for(const c of CATEGORIES){
    if(c.multi) t+=c.options.filter(o=>b[c.id].includes(o.id)).reduce((s,o)=>s+o.price,0);
    else if(shown(c,b)) t+=opt(c.id,b).price;
  }
  return t+autoLines(b).reduce((s,l)=>s+l.price,0);
}
