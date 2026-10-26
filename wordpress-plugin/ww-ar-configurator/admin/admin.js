/* AR Configurator admin page: edit the parts list, link options to WooCommerce
   products and import options from a CSV export. Talks to /wp-json/wwac/v1/. */
(function () {
  "use strict";
  const A = window.WWAC_ADMIN;
  const root = document.getElementById("wwac-admin");
  const S = { catalog: null, products: {}, tab: "shop", dirty: false, status: "", csv: null };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const money = n => A.currency + (+n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const newId = () => "opt" + Math.random().toString(36).slice(2, 8);

  async function api(path, opts = {}) {
    const r = await fetch(A.rest + path, {
      ...opts,
      headers: { "X-WP-Nonce": A.nonce, "Content-Type": "application/json", ...(opts.headers || {}) }
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || r.statusText);
    return j;
  }
  function load(res) {
    S.catalog = res.catalog;
    S.products = res.products || {};
    S.dirty = false;
  }

  /* ---------- reading/writing a value by its path, e.g. "categories.2.options.0.name" ---------- */
  function getPath(path) { return path.split(".").reduce((o, k) => o?.[k], S.catalog); }
  function setPath(path, value) {
    const keys = path.split("."), last = keys.pop();
    keys.reduce((o, k) => o[k], S.catalog)[last] = value;
  }
  function markDirty() {
    S.dirty = true;
    const btn = root.querySelector("[data-act=save]");
    if (btn) btn.disabled = false;
    setStatus("Unsaved changes");
  }
  function setStatus(t) { S.status = t; const el = root.querySelector(".wwac-status"); if (el) el.textContent = t; }

  /* ---------- small form builders ---------- */
  function input(path, type = "text", attrs = "") {
    const v = getPath(path);
    if (type === "bool") return `<input type="checkbox" data-bind="${path}" data-type="bool" ${v ? "checked" : ""} ${attrs}>`;
    if (type === "textarea") return `<textarea data-bind="${path}" rows="2" ${attrs}>${esc(v)}</textarea>`;
    const t = type === "number" ? "number" : type === "color" ? "color" : "text";
    const step = type === "number" ? 'step="any"' : "";
    return `<input type="${t}" ${step} data-bind="${path}" data-type="${type}" value="${esc(v ?? "")}" ${attrs}>`;
  }
  function select(path, choices) {
    const v = String(getPath(path) ?? "");
    return `<select data-bind="${path}">${Object.entries(choices).map(([k, l]) =>
      `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  }
  const field = (label, html, cls = "") => `<label class="wwac-field ${cls}"><span>${esc(label)}</span>${html}</label>`;

  function productBox(path) {
    const item = getPath(path);
    const info = item.productId ? S.products[item.productId] : null;
    let body;
    if (!item.productId) body = `<span class="wwac-muted">Not linked to a product</span>`;
    else if (!info) body = `<span class="wwac-bad">Linked product #${item.productId} no longer exists</span>`;
    else body = `<a href="${A.productUrl}${info.id}" target="_blank">${esc(info.name)}</a>
      ${info.sku ? `<span class="wwac-muted">SKU ${esc(info.sku)}</span>` : ""}
      <span>${money(info.price)}</span>
      <span class="wwac-badge ${info.inStock ? "ok" : "bad"}">${info.inStock ? "In stock" : "Out of stock"}${info.stock != null ? ` (${info.stock})` : ""}</span>`;
    const fromProduct = item.priceFrom === "product" && info;
    return `<div class="wwac-product">
      <div class="wwac-product-line">${body}</div>
      <div class="wwac-product-actions">
        <button type="button" class="button button-small" data-act="pick" data-path="${path}">${item.productId ? "Change product" : "Link a WooCommerce product"}</button>
        ${item.productId ? `<button type="button" class="button-link" data-act="unlink" data-path="${path}">Unlink</button>` : ""}
      </div>
      <div class="wwac-price-row">
        <label><input type="radio" name="pf-${path}" data-act="pricefrom" data-path="${path}" value="manual" ${fromProduct ? "" : "checked"}> Set price here</label>
        <label><input type="radio" name="pf-${path}" data-act="pricefrom" data-path="${path}" value="product" ${fromProduct ? "checked" : ""} ${info ? "" : "disabled"}> Use the product's price</label>
        ${fromProduct ? `<span class="wwac-price-shown">${money(info.price)}</span>` : field("Price", input(path + ".price", "number"), "wwac-price")}
      </div>
    </div>`;
  }

  /* ---------- tabs ---------- */
  function renderShop() {
    const c = S.catalog;
    return `
      <div class="wwac-card"><h2>Shop</h2>
        ${field("Shop name", input("shop.name"))}
        ${field("Send quote requests to", input("shop.quoteEmail", "text", `placeholder="${esc(A.adminEmail)} (site admin email)"`))}
        <label class="wwac-check">${input("shop.samplePrices", "bool")} Show the "sample pricing" notice (turn off once prices are real)</label>
        ${field("Top rail length on the upper receiver (in)", input("upperRail", "number"))}
      </div>
      <div class="wwac-card"><h2>Base rifle</h2>
        <p class="wwac-muted">Every build starts from this rifle. Option prices are added to it.</p>
        ${field("Name", input("base.name"))}
        ${field("What's included", input("base.includes", "textarea"))}
        ${productBox("base")}
      </div>
      <div class="wwac-card"><h2>Parts added automatically</h2>
        <p class="wwac-muted">Added to a build when another choice needs them.</p>
        ${Object.entries({ gasBlock: "With a free-float handguard", rifleBuffer: "With a stock that needs a rifle buffer", pinWeld: "With a pinned & welded barrel" })
          .map(([k, when]) => `<div class="wwac-row"><span class="wwac-when">${esc(when)}</span>${field("Name", input(`autoParts.${k}.name`))}${field("Price", input(`autoParts.${k}.price`, "number"), "wwac-price")}</div>`).join("")}
      </div>`;
  }

  function renderCategory(ci) {
    const c = S.catalog.categories[ci], p = `categories.${ci}`;
    const defaults = Object.fromEntries(c.options.map(o => [o.id, o.name]));
    const opts = c.options.map((o, oi) => {
      const op = `${p}.options.${oi}`;
      return `<div class="wwac-option ${o.enabled ? "" : "is-hidden"}">
        <div class="wwac-option-head">
          <label class="wwac-check" title="Show this option to customers">${input(op + ".enabled", "bool")} Show</label>
          ${field("Name", input(op + ".name"), "wwac-grow")}
          <div class="wwac-move">
            <button type="button" class="button button-small" data-act="up" data-ci="${ci}" data-oi="${oi}" ${oi ? "" : "disabled"} aria-label="Move up">↑</button>
            <button type="button" class="button button-small" data-act="down" data-ci="${ci}" data-oi="${oi}" ${oi < c.options.length - 1 ? "" : "disabled"} aria-label="Move down">↓</button>
            <button type="button" class="button button-small wwac-del" data-act="delete" data-ci="${ci}" data-oi="${oi}" aria-label="Delete">Delete</button>
          </div>
        </div>
        ${field("Description (optional)", input(op + ".sub"))}
        ${productBox(op)}
        ${c.fields.length ? `<div class="wwac-fields">${c.fields.map(f =>
          field(f.label, f.type === "select" ? select(`${op}.${f.key}`, f.choices) : f.type === "bool" ? input(`${op}.${f.key}`, "bool") : input(`${op}.${f.key}`, f.type))).join("")}</div>` : ""}
      </div>`;
    }).join("");
    return `
      <div class="wwac-card"><h2>${esc(c.label)}</h2>
        ${field("Category name shown to customers", input(p + ".label"))}
        ${c.multi ? "" : field("Selected by default", select(p + ".default", defaults))}
        ${c.multi ? `<p class="wwac-muted">Customers can pick any number of these.</p>` : `
        <label class="wwac-check">${input(p + ".allowCustom", "bool")} Offer a "Custom request" choice so customers can ask for a part you don't list</label>
        ${field("Custom request hint (optional)", input(p + ".customHint", "text", 'placeholder="Want something we don\'t list? Tell us the part and we\'ll source it."'))}`}
        ${c.requiresFreeFloat ? `<p class="wwac-muted">Only shown when the build has a free-float handguard.</p>` : ""}
      </div>
      ${opts}
      <div class="wwac-add">
        <button type="button" class="button" data-act="add" data-ci="${ci}">+ Add option</button>
        <button type="button" class="button" data-act="add-product" data-ci="${ci}">+ Add from a WooCommerce product</button>
      </div>`;
  }

  function renderCsv() {
    const cats = Object.fromEntries(S.catalog.categories.map((c, i) => [i, c.label]));
    const prev = S.csv;
    return `<div class="wwac-card"><h2>Import options from a CSV file</h2>
      <p>Export your products from the POS (or WooCommerce → Products → Export) as a CSV file, then add them to a category here.
      Columns are matched by their heading: <code>name</code>, <code>price</code>, <code>sku</code> and <code>description</code>,
      plus any of the category's own settings (for example <code>len</code>, <code>look</code> or <code>color</code>).
      Rows whose SKU matches a WooCommerce product are linked to it and use its price.</p>
      <div class="wwac-row">
        ${field("Add to category", `<select id="wwac-csv-cat">${Object.entries(cats).map(([i, l]) => `<option value="${i}" ${prev && +prev.ci === +i ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`)}
        ${field("CSV file", `<input type="file" id="wwac-csv-file" accept=".csv,text/csv">`)}
      </div>
      ${prev ? `<table class="widefat striped"><thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>WooCommerce product</th></tr></thead><tbody>
        ${prev.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.sku)}</td><td>${r.price === "" ? "—" : money(r.price)}</td>
          <td>${r.product ? `${esc(r.product.name)} (${money(r.product.price)})` : r.sku ? '<span class="wwac-muted">No match</span>' : "—"}</td></tr>`).join("")}
        </tbody></table>
        <p><button type="button" class="button button-primary" data-act="csv-add">Add ${prev.rows.length} option${prev.rows.length === 1 ? "" : "s"} to ${esc(S.catalog.categories[prev.ci].label)}</button>
        <span class="wwac-muted">Added options are hidden until you tick "Show", so you can check them first.</span></p>` : ""}
    </div>`;
  }

  function render() {
    if (!S.catalog) return;
    const tabs = [["shop", "Shop & base rifle"], ...S.catalog.categories.map((c, i) => [String(i), c.label]), ["csv", "Import CSV"]];
    const body = S.tab === "shop" ? renderShop() : S.tab === "csv" ? renderCsv() : renderCategory(+S.tab);
    root.innerHTML = `
      <div class="wwac-bar">
        <button type="button" class="button button-primary" data-act="save" ${S.dirty ? "" : "disabled"}>Save changes</button>
        <span class="wwac-status">${esc(S.status)}</span>
        <button type="button" class="button-link wwac-reset" data-act="reset">Reset everything to the built-in defaults</button>
      </div>
      <nav class="wwac-tabs">${tabs.map(([id, l]) => `<button type="button" data-act="tab" data-tab="${id}" class="${S.tab === id ? "is-active" : ""}">${esc(l)}</button>`).join("")}</nav>
      <div class="wwac-body">${body}</div>
      <p class="wwac-muted wwac-foot">Put the configurator on any page with the shortcode <code>[ar_configurator]</code> (or <code>[ar_configurator view="2d"]</code>).</p>`;
  }

  /* ---------- product picker ---------- */
  function pickProduct(onPick) {
    const dlg = document.createElement("dialog");
    dlg.className = "wwac-dialog";
    dlg.innerHTML = `<form method="dialog"><h2>Choose a WooCommerce product</h2>
      <input type="search" placeholder="Search by name or SKU" class="wwac-search" autofocus>
      <div class="wwac-results"><p class="wwac-muted">Loading…</p></div>
      <p><button class="button" value="cancel">Cancel</button></p></form>`;
    document.body.appendChild(dlg);
    const results = dlg.querySelector(".wwac-results");
    let list = [], timer, latest = 0;
    async function search(q) {
      const mine = ++latest;   // ignore answers to searches the user has already typed past
      try {
        const found = await api("admin/products?search=" + encodeURIComponent(q));
        if (mine !== latest) return;
        list = found;
        results.innerHTML = list.length ? list.map((p, i) => `<button type="button" class="wwac-result" data-i="${i}">
          <strong>${esc(p.name)}</strong> <span class="wwac-muted">${p.sku ? "SKU " + esc(p.sku) + " · " : ""}#${p.id}</span>
          <span>${money(p.price)}</span><span class="wwac-badge ${p.inStock ? "ok" : "bad"}">${p.inStock ? "In stock" : "Out of stock"}</span></button>`).join("")
          : `<p class="wwac-muted">No products found.</p>`;
      } catch (e) { if (mine === latest) results.innerHTML = `<p class="wwac-bad">${esc(e.message)}</p>`; }
    }
    dlg.querySelector(".wwac-search").addEventListener("input", e => { clearTimeout(timer); timer = setTimeout(() => search(e.target.value), 250); });
    results.addEventListener("click", e => {
      const b = e.target.closest(".wwac-result"); if (!b) return;
      onPick(list[+b.dataset.i]); dlg.close();
    });
    dlg.addEventListener("close", () => dlg.remove());
    dlg.showModal();
    search("");
  }
  function link(item, p) {
    S.products[p.id] = p;
    item.productId = p.id;
    item.priceFrom = "product";
    item.price = p.price;
  }
  function blankOption(c, name = "New option") {
    const o = { id: newId(), name, sub: "", price: 0, enabled: true, productId: null, priceFrom: "manual" };
    const like = c.options.find(x => x.id === c.default) || c.options[0] || {};
    for (const f of c.fields) o[f.key] = like[f.key] ?? (f.type === "bool" ? false : f.type === "number" ? 0 : "");
    return o;
  }

  /* ---------- CSV ---------- */
  function parseCsv(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
  }
  async function readCsv(file, ci) {
    const grid = parseCsv(await file.text());
    if (grid.length < 2) { setStatus("That file has no rows to import."); return; }
    const head = grid[0].map(h => h.trim().toLowerCase());
    const col = (...names) => head.findIndex(h => names.includes(h));
    const ni = col("name", "product name", "title", "item"), pi = col("price", "regular price", "retail", "retail price"),
          si = col("sku", "item number", "upc"), di = col("description", "sub", "short description");
    if (ni < 0) { setStatus('No "name" column found in that file.'); return; }
    const c = S.catalog.categories[ci];
    setStatus("Matching SKUs to WooCommerce products…");
    const rows = [];
    for (const r of grid.slice(1)) {
      const name = (r[ni] || "").trim(); if (!name) continue;
      const row = { name, sku: si >= 0 ? (r[si] || "").trim() : "", price: pi >= 0 ? String(r[pi] || "").replace(/[^0-9.\-]/g, "") : "",
                    sub: di >= 0 && di !== ni ? (r[di] || "").trim() : "", extra: {} };
      for (const f of c.fields) { const i = head.indexOf(f.key.toLowerCase()); if (i >= 0) row.extra[f.key] = r[i]; }
      if (row.sku) { try { row.product = (await api("admin/products?sku=" + encodeURIComponent(row.sku)))[0] || null; } catch { row.product = null; } }
      rows.push(row);
    }
    S.csv = { ci, rows };
    setStatus(""); render();
  }
  function addCsvRows() {
    const { ci, rows } = S.csv, c = S.catalog.categories[ci];
    for (const r of rows) {
      const o = blankOption(c, r.name);
      o.enabled = false;
      o.sub = r.sub;
      o.price = r.price === "" ? 0 : +r.price;
      for (const f of c.fields) if (f.key in r.extra) {
        const v = r.extra[f.key];
        o[f.key] = f.type === "number" ? +v || 0 : f.type === "bool" ? /^(1|y|yes|true)$/i.test(v.trim()) : v.trim();
      }
      if (r.product) link(o, r.product); // matched products keep following the store price
      c.options.push(o);
    }
    S.csv = null; S.tab = String(ci);
    markDirty(); render(); setStatus(`Added ${rows.length} option${rows.length === 1 ? "" : "s"} — tick "Show" on the ones customers should see, then save.`);
  }

  /* ---------- events ---------- */
  root.addEventListener("input", e => {
    const el = e.target.closest("[data-bind]"); if (!el) return;
    const t = el.dataset.type;
    setPath(el.dataset.bind, t === "bool" ? el.checked : t === "number" ? (el.value === "" ? 0 : +el.value) : el.value);
    if (el.dataset.bind.endsWith(".enabled")) el.closest(".wwac-option")?.classList.toggle("is-hidden", !el.checked);
    markDirty();
  });
  root.addEventListener("change", e => {
    if (e.target.id === "wwac-csv-file" && e.target.files[0]) readCsv(e.target.files[0], +root.querySelector("#wwac-csv-cat").value);
  });
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, cats = S.catalog.categories;
    const c = b.dataset.ci != null ? cats[+b.dataset.ci] : null, oi = +b.dataset.oi;
    if (act === "tab") { S.tab = b.dataset.tab; render(); return; }
    if (act === "save") {
      b.disabled = true; setStatus("Saving…");
      try { load(await api("admin/catalog", { method: "POST", body: JSON.stringify(S.catalog) })); render(); setStatus("Saved."); }
      catch (err) { b.disabled = false; setStatus("Couldn't save: " + err.message); }
      return;
    }
    if (act === "reset") {
      if (!confirm("Replace every category and option with the built-in defaults? This can't be undone.")) return;
      try { load(await api("admin/reset", { method: "POST" })); render(); setStatus("Reset to defaults."); } catch (err) { setStatus(err.message); }
      return;
    }
    if (act === "pick") { const item = getPath(b.dataset.path); pickProduct(p => { link(item, p); markDirty(); render(); }); return; }
    if (act === "unlink") { const item = getPath(b.dataset.path); item.productId = null; item.priceFrom = "manual"; markDirty(); render(); return; }
    if (act === "pricefrom") {
      const item = getPath(b.dataset.path); item.priceFrom = b.value;
      const info = S.products[item.productId]; if (b.value === "product" && info) item.price = info.price;
      markDirty(); render(); return;
    }
    if (act === "csv-add") { addCsvRows(); return; }
    if (!c) return;
    if (act === "add") c.options.push(blankOption(c));
    if (act === "add-product") { pickProduct(p => { const o = blankOption(c, p.title || p.name); link(o, p); c.options.push(o); markDirty(); render(); }); return; }
    if (act === "up" || act === "down") { const j = act === "up" ? oi - 1 : oi + 1; [c.options[oi], c.options[j]] = [c.options[j], c.options[oi]]; }
    if (act === "delete") {
      if (c.options.length === 1) { alert("A category needs at least one option. Untick \"Show\" instead to hide it."); return; }
      if (!confirm(`Delete "${c.options[oi].name}"?`)) return;
      const [gone] = c.options.splice(oi, 1);
      if (c.default === gone.id) c.default = c.options[0].id;
    }
    markDirty(); render();
  });
  window.addEventListener("beforeunload", e => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });

  api("admin/catalog").then(res => { load(res); render(); }).catch(err => { root.innerHTML = `<p class="wwac-bad">Couldn't load the configurator settings: ${esc(err.message)}</p>`; });
})();
