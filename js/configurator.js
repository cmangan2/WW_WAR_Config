/* ----- state ----- */
let build = loadFromHash() || structuredClone(DEFAULT);
let lastNotices = [];

function loadFromHash(){
  try{
    if(!location.hash.slice(1)) return null;
    const b = Object.assign(structuredClone(DEFAULT), JSON.parse(decodeURIComponent(atob(location.hash.slice(1)))));
    for(const c of CATEGORIES){
      if(c.multi){ if(!Array.isArray(b[c.id])) b[c.id]=DEFAULT[c.id]; continue; }
      if(!c.options.some(o=>o.id===b[c.id])) b[c.id]=DEFAULT[c.id];
    }
    autofix(b);
    return errors(b).length ? null : b;
  }catch{ return null; }
}
function hashOf(b){ return btoa(encodeURIComponent(JSON.stringify(b))); }

function choose(catId, optId){
  const c=catById[catId];
  if(c.multi){
    const set=new Set(build[catId]); set.has(optId)?set.delete(optId):set.add(optId);
    build[catId]=[...set];
  } else build[catId]=optId;
  lastNotices = autofix(build);
  history.replaceState(null,"","#"+hashOf(build));
  render();
}

/* ----- options panel ----- */
function renderCats(){
  const html=[];
  for(const c of CATEGORIES){
    if(c.showIf && !c.showIf(build)) continue;
    html.push(`<div class="panel cat"><h2>${c.label}</h2><div class="opts">`);
    for(const o of c.options){
      const on = c.multi ? build[c.id].includes(o.id) : build[c.id]===o.id;
      let why="";
      if(!on && !c.multi){
        const trial={...build,[c.id]:o.id}; autofix(trial);
        const e=errors(trial); if(e.length) why=e[0];
      }
      const extra = o.mount ? `Needs ${o.mount.name.toLowerCase()} (+${money(o.mount.price)})` :
                    o.rifleBuffer ? "+ rifle buffer kit ($65)" : "";
      const sw = o.color ? `<span class="swatch" style="background:${o.color}"></span>` : "";
      html.push(`<button type="button" class="opt${c.multi?" multi":""}" aria-pressed="${on}" ${why?"disabled":""}
        data-cat="${c.id}" data-opt="${o.id}"><span class="dot"></span><span class="body">
        <div class="name">${sw}${o.name}</div>
        ${o.sub?`<div class="sub">${o.sub}</div>`:""}
        ${extra?`<div class="sub">${extra}</div>`:""}
        ${why?`<div class="why">${why}</div>`:""}
        </span><span class="price">${o.price? "+"+money(o.price) : "—"}</span></button>`);
    }
    html.push(`</div></div>`);
  }
  $("cats").innerHTML=html.join("");
}
$("cats").addEventListener("click",e=>{
  const btn=e.target.closest(".opt"); if(!btn||btn.disabled) return;
  choose(btn.dataset.cat, btn.dataset.opt);
});

/* ----- summary ----- */
function summaryLines(b){
  const rows=[{name:BASE.name, price:BASE.price}];
  for(const c of CATEGORIES){
    if(c.showIf && !c.showIf(b)) continue;
    if(c.multi){ c.options.filter(o=>b[c.id].includes(o.id)).forEach(o=>rows.push({name:`${c.label}: ${o.name}`, price:o.price})); continue; }
    if(b[c.id]===DEFAULT[c.id]) continue;
    const o=opt(c.id,b); rows.push({name:`${c.label}: ${o.name}`, price:o.price});
  }
  return rows;
}
function renderSummary(){
  const rows=summaryLines(build).map((r,i)=>`<tr><td>${r.name}${i?"":`<div class="sub">${BASE.includes}</div>`}</td><td>${r.price?money(r.price):"incl."}</td></tr>`);
  autoLines(build).forEach(l=>rows.push(`<tr class="auto"><td>${l.name}</td><td>${l.price?money(l.price):"incl."}</td></tr>`));
  $("lines").innerHTML=rows.join("");
  const t=money(priceOf(build));
  $("total").textContent=t; $("barTotal").textContent=t;
  const notes=[...lastNotices.map(m=>({t:"info",m})), ...warnings(build)];
  $("notes").innerHTML=notes.map(n=>`<li class="${n.t}">${n.m}</li>`).join("");
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
function quoteText(f){
  const lines=summaryLines(build).map(r=>`- ${r.name}${r.price?` (${money(r.price)})`:""}`);
  autoLines(build).forEach(l=>lines.push(`- + ${l.name}${l.price?` (${money(l.price)})`:""}`));
  return [
    `AR build quote request — ${SHOP.name}`,
    f?`From: ${f.get("name")}  |  Phone: ${f.get("phone")||"—"}  |  Email: ${f.get("email")||"—"}  |  Prefers: ${f.get("contact")}`:"",
    "", ...lines, "",
    `Estimated total: ${money(priceOf(build))}${SHOP.samplePrices?" (sample pricing)":""}`,
    f&&f.get("notes")?`\nNotes: ${f.get("notes")}`:"",
    `\nBuild link: ${location.href.split("#")[0]}#${hashOf(build)}`
  ].filter(x=>x!=="").join("\n");
}
async function copy(t,ok){
  try{ await navigator.clipboard.writeText(t); $("msg").textContent=ok; }
  catch{ $("msg").textContent="Couldn't copy automatically — select and copy from the email draft instead."; }
}
$("quoteForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  if(!f.get("phone") && !f.get("email")){ $("msg").textContent="Add a phone number or email so the shop can reach you."; return; }
  const body=quoteText(f);
  location.href=`mailto:${SHOP.quoteEmail}?subject=${encodeURIComponent("AR build quote request — "+f.get("name"))}&body=${encodeURIComponent(body)}`;
  $("msg").textContent = SHOP.quoteEmail ? "Your email app should open with the build filled in — just hit send." :
    "Your email app should open with the build filled in — add the shop's address and hit send.";
});
$("copyBtn").onclick=()=>copy(quoteText(null),"Build summary copied.");
$("linkBtn").onclick=()=>copy(`${location.href.split("#")[0]}#${hashOf(build)}`,"Link copied — anyone with it sees this exact build.");

$("shopLine").textContent=`${SHOP.name} · custom AR builds`;
$("sampleNote").textContent=SHOP.samplePrices?"Sample pricing for demonstration — final price confirmed with your quote.":"Final price confirmed with your quote.";
$("barName").textContent=BASE.name;
function startConfigurator(draw){
  drawBuild=draw;
  render();
}
