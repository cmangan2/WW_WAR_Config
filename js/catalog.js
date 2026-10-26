/* =====================================================================
   SHOP SETTINGS — edit these
   ===================================================================== */
const SHOP = {
  name: "Wicked Weaponry",
  phone: "603-232-0621",
  quoteEmail: "",          // address that receives quote requests, e.g. "builds@yourshop.com"
  samplePrices: true       // set to false once the prices below are real
};

/* =====================================================================
   CATALOG — every price here is a placeholder. Prices are what the
   option ADDS to the base rifle.
   rail: inches of upper-receiver top rail the part occupies (7" total)
   ===================================================================== */
const BASE = {
  name: "Basic M4-style carbine, 5.56 NATO",
  price: 899,
  includes: "16\" barrel, carbine gas, A2 front sight base, polymer handguard, 6-position stock, mil-spec trigger, flip-up rear sight, one 30-rd magazine. Every build is function-checked and lubed."
};
const UPPER_RAIL = 7.0;

const CATEGORIES = [
  { id:"barrel", label:"Barrel", options:[
    { id:"b16",  name:"16\" government profile", price:0, len:16, sub:"Standard M4 setup" },
    { id:"b145", name:"14.5\" pinned & welded", price:120, len:14.5, pinned:true, sub:"Muzzle device is pinned in-house to make 16\" legal length — it can't be swapped later" },
    { id:"b18",  name:"18\" rifle-length gas", price:90, len:18, sub:"Softer recoil, more velocity" }
  ]},
  { id:"handguard", label:"Handguard", options:[
    { id:"hgc",  name:"Carbine polymer handguard", price:0, ff:false, len:7, sub:"Keeps the A2 front sight base" },
    { id:"hg10", name:"10\" free-float M-LOK", price:189, ff:true, len:10 },
    { id:"hg13", name:"13\" free-float M-LOK", price:209, ff:true, len:13 },
    { id:"hg15", name:"15\" free-float M-LOK", price:229, ff:true, len:15 }
  ]},
  { id:"muzzle", label:"Muzzle device", options:[
    { id:"a2",   name:"A2 birdcage flash hider", price:0 },
    { id:"tri",  name:"3-prong flash hider", price:79 },
    { id:"comp", name:"Compensator", price:99, sub:"Less muzzle rise, more side blast" },
    { id:"qd",   name:"Suppressor-ready QD mount", price:149 }
  ]},
  { id:"optic", label:"Optic", options:[
    { id:"none", name:"No optic — iron sights", price:0 },
    { id:"rd",   name:"1x red dot", price:299, mount:{ name:"Absolute co-witness riser", price:49 }, rail:1.5 },
    { id:"lp6",  name:"1–6x LPVO (30 mm tube)", price:499, tube:30, mount:{ name:"30 mm cantilever mount", price:129 }, rail:5.0 },
    { id:"lp8",  name:"1–8x LPVO (34 mm tube)", price:799, tube:34, mount:{ name:"34 mm cantilever mount", price:159 }, rail:5.0 }
  ]},
  { id:"magnifier", label:"Magnifier", options:[
    { id:"none", name:"None", price:0 },
    { id:"mag3", name:"3x flip-to-side magnifier", price:249, rail:2.5, sub:"Mounts behind a red dot" }
  ]},
  { id:"rear", label:"Rear sight", options:[
    { id:"bu",   name:"Flip-up rear sight", price:0, rail:1.2, sub:"Included" },
    { id:"none", name:"None", price:0 }
  ]},
  { id:"front", label:"Front sight", showIf:b=>opt("handguard",b).ff, options:[
    { id:"bu",   name:"Flip-up front sight", price:59, sub:"Mounts on the handguard rail" },
    { id:"none", name:"None", price:0 }
  ]},
  { id:"stock", label:"Stock", options:[
    { id:"m4",   name:"M4 6-position", price:0 },
    { id:"sop",  name:"SOPMOD-style 6-position", price:89, sub:"Wider cheek weld, storage tubes" },
    { id:"a2s",  name:"Fixed A2 rifle stock", price:69, rifleBuffer:true, sub:"Needs a rifle buffer system (added automatically)" }
  ]},
  { id:"grip", label:"Pistol grip", options:[
    { id:"a2",   name:"A2 grip", price:0 },
    { id:"ergo", name:"Ergonomic rubber-overmold grip", price:25 },
    { id:"vert", name:"Vertical-angle grip", price:35, sub:"Suits a squared-up stance" }
  ]},
  { id:"trigger", label:"Trigger", options:[
    { id:"mil",  name:"Mil-spec single stage", price:0 },
    { id:"enh",  name:"Enhanced single stage", price:149, sub:"Lighter, crisper break" },
    { id:"two",  name:"Two-stage match trigger", price:229 }
  ]},
  { id:"ch", label:"Charging handle", options:[
    { id:"mil",  name:"Mil-spec", price:0 },
    { id:"ambi", name:"Ambidextrous latch", price:79 }
  ]},
  { id:"finish", label:"Finish (done in house)", options:[
    { id:"blk",  name:"Black anodized", price:0, color:"#2b2c2f" },
    { id:"fde",  name:"Cerakote Flat Dark Earth", price:250, color:"#a8916c" },
    { id:"odg",  name:"Cerakote O.D. Green", price:250, color:"#5a5f45" },
    { id:"sgy",  name:"Cerakote Sniper Grey", price:250, color:"#6c7177" },
    { id:"tng",  name:"Cerakote Tungsten", price:250, color:"#5b5c5e" }
  ]},
  { id:"services", label:"Services", multi:true, options:[
    { id:"bore", name:"Boresighting", price:25 },
    { id:"zero", name:"Test fire & zero at 50 yd", price:75 }
  ]}
];

const DEFAULT = { barrel:"b16", handguard:"hgc", muzzle:"a2", optic:"none", magnifier:"none", rear:"bu",
  front:"none", stock:"m4", grip:"a2", trigger:"mil", ch:"mil", finish:"blk", services:[] };

/* ===================================================================== */
const catById = Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));
function opt(cat,b){ return catById[cat].options.find(o=>o.id===b[cat]); }
const $ = id => document.getElementById(id);
const money = n => "$" + n.toLocaleString("en-US");

// Bring dependent parts in line after a change. Returns notices about what moved.
function autofix(b){
  const notes=[];
  if(!opt("handguard",b).ff) b.front="none";
  if(b.magnifier!=="none" && b.optic!=="rd"){ b.magnifier="none"; notes.push("Magnifier removed — it needs a red dot to sit behind."); }
  return notes;
}

function railUsed(b){
  return ["optic","magnifier","rear"].reduce((s,c)=>s+(opt(c,b).rail||0),0);
}

// Builds that can't be assembled. An option that would cause one is greyed out.
function errors(b){
  const e=[], bar=opt("barrel",b), hg=opt("handguard",b);
  if(hg.ff && hg.len > bar.len-1) e.push(`A ${hg.len}" handguard is too long for a ${bar.len}" barrel — use a ${bar.len-1}" or shorter handguard, or a longer barrel.`);
  if(b.magnifier!=="none" && b.optic!=="rd") e.push("A magnifier needs a red dot in front of it.");
  const used=railUsed(b);
  if(used>UPPER_RAIL) e.push(`Not enough top rail: needs ${used.toFixed(1)}" of ${UPPER_RAIL}".`);
  return e;
}

// Things worth telling the customer that don't stop the build.
function warnings(b){
  const w=[], ff=opt("handguard",b).ff;
  const hasFront = !ff || b.front!=="none";
  if(b.optic==="none" && b.rear==="none") w.push({t:"warn", m:"No sights or optic selected."});
  else if(b.optic==="none" && !hasFront) w.push({t:"warn", m:"Iron sights need a front sight — add the flip-up front sight."});
  if(b.optic!=="none" && b.optic!=="rd" && b.rear!=="none") w.push({t:"info", m:"The rear sight folds down under the LPVO and won't co-witness."});
  if(opt("barrel",b).pinned) w.push({t:"info", m:`Your ${opt("muzzle",b).name.toLowerCase()} will be pinned & welded — pick carefully.`});
  return w;
}

// Parts added because of other choices.
function autoLines(b){
  const l=[], o=opt("optic",b);
  if(opt("handguard",b).ff) l.push({name:"Low-profile gas block (replaces front sight base)", price:59});
  if(o.mount) l.push({name:o.mount.name, price:o.mount.price});
  if(opt("stock",b).rifleBuffer) l.push({name:"Rifle buffer tube, spring & buffer", price:65});
  if(opt("barrel",b).pinned) l.push({name:"Pin & weld muzzle device", price:0});
  return l;
}

function priceOf(b){
  let t=BASE.price;
  for(const c of CATEGORIES){
    if(c.multi) t+=c.options.filter(o=>b[c.id].includes(o.id)).reduce((s,o)=>s+o.price,0);
    else if(!c.showIf || c.showIf(b)) t+=opt(c.id,b).price;
  }
  return t+autoLines(b).reduce((s,l)=>s+l.price,0);
}

