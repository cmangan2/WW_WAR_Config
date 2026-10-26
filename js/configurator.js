/* ----- state ----- */
let build = loadFromHash() || structuredClone(DEFAULT);
let lastNotices = [];

// Names come from the admin page and custom text from customers (and shared links), so escape them.
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));

function loadFromHash(){
  try{
    if(!location.hash.slice(1)) return null;
    const b = Object.assign(structuredClone(DEFAULT), JSON.parse(decodeURIComponent(atob(location.hash.slice(1)))));
    for(const c of CATEGORIES){
      if(c.multi){ b[c.id] = Array.isArray(b[c.id]) ? b[c.id].filter(id=>c.options.some(o=>o.id===id)) : []; continue; }
      if(!c.options.some(o=>o.id===b[c.id])) b[c.id]=DEFAULT[c.id];
    }
    const custom = {};
    if(b.custom && typeof b.custom==="object") for(const c of CATEGORIES) if(typeof b.custom[c.id]==="string") custom[c.id]=b.custom[c.id].slice(0,300);
    b.custom = custom;
    autofix(b);
    return errors(b).length ? null : b;
  }catch{ return null; }
}
function hashOf(b){ return btoa(encodeURIComponent(JSON.stringify(b))); }
function saveHash(){ history.replaceState(null,"","#"+hashOf(build)); const sw=$("viewSwitch"); if(sw) sw.href=sw.dataset.page+"#"+hashOf(build); }

function choose(catId, optId){
  const c=catById[catId];
  if(c.multi){
    const set=new Set(build[catId]); set.has(optId)?set.delete(optId):set.add(optId);
    build[catId]=[...set];
  } else build[catId]=optId;
  lastNotices = autofix(build);
  saveHash();
  render();
  if(optId==="custom"){ const box=document.querySelector(`.custom-text[data-cat="${catId}"]`); if(box) box.focus(); }
}

/* ----- options panel ----- */
function priceTag(o){
  if(o.custom) return "Quote";
  return o.price ? "+"+money(o.price) : "—";
}
function renderCats(){
  const html=[];
  for(const c of CATEGORIES){
    if(!shown(c,build)) continue;
    html.push(`<div class="panel cat"><h2>${esc(c.label)}</h2><div class="opts">`);
    for(const o of c.options){
      const on = c.multi ? build[c.id].includes(o.id) : build[c.id]===o.id;
      let why="";
      if(!on && !c.multi){
        const trial={...build,[c.id]:o.id}; autofix(trial);
        const e=errors(trial); if(e.length) why=e[0];
      }
      const extra = o.mountName ? `Needs ${esc(o.mountName.toLowerCase())} (+${money(+o.mountPrice||0)})` :
                    o.rifleBuffer ? `+ ${esc(AUTO.rifleBuffer.name.toLowerCase())} (${money(AUTO.rifleBuffer.price)})` : "";
      const sw = o.color ? `<span class="swatch" style="background:${esc(o.color)}"></span>` : "";
      const stock = o.inStock===false ? `<div class="sub special">Special order — not in stock right now</div>` : "";
      html.push(`<button type="button" class="opt${c.multi?" multi":""}${o.custom?" custom":""}" aria-pressed="${on}" ${why?"disabled":""}
        data-cat="${c.id}" data-opt="${esc(o.id)}"><span class="dot"></span><span class="body">
        <div class="name">${sw}${esc(o.name)}</div>
        ${o.sub?`<div class="sub">${esc(o.sub)}</div>`:""}
        ${extra?`<div class="sub">${extra}</div>`:""}${stock}
        ${why?`<div class="why">${esc(why)}</div>`:""}
        </span><span class="price">${priceTag(o)}</span></button>`);
      if(o.custom && on) html.push(`<textarea class="custom-text" data-cat="${c.id}" rows="2" maxlength="300"
        placeholder="Brand, model, colour, link — whatever you know">${esc(build.custom[c.id]||"")}</textarea>`);
    }
    html.push(`</div></div>`);
  }
  $("cats").innerHTML=html.join("");
}
$("cats").addEventListener("click",e=>{
  const btn=e.target.closest(".opt"); if(!btn||btn.disabled) return;
  choose(btn.dataset.cat, btn.dataset.opt);
});
// Typing a custom request only updates the summary, so the text box keeps focus.
$("cats").addEventListener("input",e=>{
  const box=e.target.closest(".custom-text"); if(!box) return;
  build.custom[box.dataset.cat]=box.value.slice(0,300);
  saveHash(); renderSummary();
});

/* ----- summary ----- */
function summaryLines(b){
  const rows=[{name:BASE.name, price:BASE.price}];
  for(const c of CATEGORIES){
    if(!shown(c,b)) continue;
    if(c.multi){ c.options.filter(o=>b[c.id].includes(o.id)).forEach(o=>rows.push({name:`${c.label}: ${o.name}`, price:o.price})); continue; }
    if(b[c.id]===DEFAULT[c.id]) continue;
    const o=opt(c.id,b); rows.push({name:`${c.label}: ${o.name}`, price:o.price, custom:o.custom});
  }
  return rows;
}
const lineCost = r => r.custom ? "quote" : r.price ? money(r.price) : "incl.";
function renderSummary(){
  const rows=summaryLines(build).map((r,i)=>`<tr><td>${esc(r.name)}${i?"":`<div class="sub">${esc(BASE.includes)}</div>`}</td><td>${lineCost(r)}</td></tr>`);
  autoLines(build).forEach(l=>rows.push(`<tr class="auto"><td>${esc(l.name)}</td><td>${lineCost(l)}</td></tr>`));
  $("lines").innerHTML=rows.join("");
  const t=money(priceOf(build))+(hasCustom(build)?" + custom":"");
  $("total").textContent=t; $("barTotal").textContent=t;
  const notes=[...lastNotices.map(m=>({t:"info",m})), ...warnings(build)];
  $("notes").innerHTML=notes.map(n=>`<li class="${n.t}">${esc(n.m)}</li>`).join("");
  const used=railUsed(build);
  $("railBar").style.width=Math.min(100,used/UPPER_RAIL*100)+"%";
  $("railTxt").textContent=`${used.toFixed(1)}" / ${UPPER_RAIL}"`;
  const oal = opt("barrel",build).len + 3.2 + (opt("stock",build).rifleBuffer?14.6:11.5);
  $("oal").textContent=`Approx. overall length ${oal.toFixed(1)}"`;
}

// Each page supplies its own preview (2D drawing or 3D model) via startConfigurator().
let drawBuild = ()=>{};
function render(){
  drawBuild(build);
  renderCats(); renderSummary();
  const sw=$("viewSwitch"); if(sw) sw.href=sw.dataset.page+"#"+hashOf(build);
}

/* ----- quote ----- */
function buildLink(){ return `${location.href.split("#")[0]}#${hashOf(build)}`; }
function quoteText(f){
  const lines=summaryLines(build).map(r=>`- ${r.name} (${lineCost(r)})`);
  autoLines(build).forEach(l=>lines.push(`- + ${l.name} (${lineCost(l)})`));
  return [
    `AR build quote request — ${SHOP.name}`,
    f?`From: ${f.get("name")}  |  Phone: ${f.get("phone")||"—"}  |  Email: ${f.get("email")||"—"}  |  Prefers: ${f.get("contact")}`:"",
    "", ...lines, "",
    `Estimated total: ${money(priceOf(build))}${hasCustom(build)?" plus custom parts (to be quoted)":""}${SHOP.samplePrices?" (sample pricing)":""}`,
    f&&f.get("notes")?`\nNotes: ${f.get("notes")}`:"",
    `\nBuild link: ${buildLink()}`
  ].filter(x=>x!=="").join("\n");
}
async function copy(t,ok){
  try{ await navigator.clipboard.writeText(t); $("msg").textContent=ok; }
  catch{ $("msg").textContent="Couldn't copy automatically — select and copy from the email draft instead."; }
}
$("quoteForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.target, f=new FormData(form);
  if(!f.get("phone") && !f.get("email")){ $("msg").textContent="Add a phone number or email so the shop can reach you."; return; }
  const body=quoteText(f);
  // On the live site the plugin emails the shop directly; elsewhere fall back to the customer's email app.
  if(DATA.quoteEndpoint){
    const btn=form.querySelector("button[type=submit]"); btn.disabled=true; $("msg").textContent="Sending…";
    try{
      const r=await fetch(DATA.quoteEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:f.get("name"),phone:f.get("phone"),email:f.get("email"),contact:f.get("contact"),
          notes:f.get("notes"),website:f.get("website"),summary:body,link:buildLink(),build})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.message||"Something went wrong");
      $("msg").textContent="Thanks — your build is with the shop. We'll be in touch soon."; form.reset();
    }catch(err){ $("msg").textContent=`Couldn't send (${err.message}). Please try again, or copy the build summary and email it to us.`; }
    btn.disabled=false; return;
  }
  location.href=`mailto:${SHOP.quoteEmail}?subject=${encodeURIComponent("AR build quote request — "+f.get("name"))}&body=${encodeURIComponent(body)}`;
  $("msg").textContent = SHOP.quoteEmail ? "Your email app should open with the build filled in — just hit send." :
    "Your email app should open with the build filled in — add the shop's address and hit send.";
});
$("copyBtn").onclick=()=>copy(quoteText(null),"Build summary copied.");
$("linkBtn").onclick=()=>copy(buildLink(),"Link copied — anyone with it sees this exact build.");

$("shopLine").textContent="Start from a basic M4-style carbine and build it out your way — we'll quote it, build it and Cerakote it in house.";
$("sampleNote").textContent=SHOP.samplePrices?"Sample pricing for demonstration — final price confirmed with your quote.":"Final price confirmed with your quote.";
$("barName").textContent=BASE.name;
function startConfigurator(draw){
  drawBuild=draw;
  render();
}
