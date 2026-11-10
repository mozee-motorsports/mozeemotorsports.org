(function () {
  "use strict";

  const CFG = window.STORE_CONFIG;
  const DEMO = !CFG.stockUrl || !CFG.orderUrl;
  const CART_KEY = "mozee-merch-cart";
  const DEMO_STOCK_KEY = "mozee-merch-demo-stock";
  const DEMO_ORDERS_KEY = "mozee-merch-demo-orders";

  // Only used in demo mode (before the Power Automate links are pasted in).
  const DEMO_STOCK = {
    "OLD-S": 3, "OLD-M": 0, "OLD-L": 3, "OLD-XL": 4, "OLD-XXL": 1, "OLD-XXXL": 1,
    "NEW-S": 0, "NEW-M": 5, "NEW-L": 1, "NEW-XL": 0, "NEW-XXL": 2, "NEW-XXXL": 0,
    "JKT-S": 0, "JKT-M": 0, "JKT-L": 2, "JKT-XL": 1, "JKT-XXL": 1, "JKT-XXXL": 0,
    "HAT-OS": 8
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  };

  const storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode etc. */ }
    }
  };

  // ------------------------------------------------------------------ state
  const products = CFG.products;
  const byCode = Object.fromEntries(products.map(p => [p.code, p]));
  const state = {
    stock: null,          // { sku: count } once loaded
    prices: {},           // { sku: price } from Excel, falls back to config
    cart: storage.get(CART_KEY, []).filter(l => l && byCode[codeOf(l.sku)] && l.qty > 0),
    pick: Object.fromEntries(products.map(p => [p.code, { size: null, qty: 1 }])),
    updatedAt: null,
    loadError: false,
    submitting: false
  };
  const cards = {};

  function codeOf(sku) { return String(sku).split("-")[0]; }
  function sizeOf(sku) { return String(sku).split("-").slice(1).join("-"); }
  function skuOf(code, size) { return code + "-" + size; }
  function sizeLabel(size) { return (CFG.sizeLabels && CFG.sizeLabels[size]) || size; }
  function priceOf(sku) {
    const p = state.prices[sku];
    return typeof p === "number" && !isNaN(p) ? p : byCode[codeOf(sku)].price;
  }
  function stockOf(sku) { return state.stock ? (state.stock[sku] ?? 0) : null; }
  function inCart(sku) { const l = state.cart.find(l => l.sku === sku); return l ? l.qty : 0; }
  function money(n) { return "$" + (Number.isInteger(n) ? n : n.toFixed(2)); }
  function lineName(sku) {
    const p = byCode[codeOf(sku)];
    return p.cartName || p.name;
  }
  function cartTotal() { return state.cart.reduce((s, l) => s + l.qty * priceOf(l.sku), 0); }
  function cartCount() { return state.cart.reduce((s, l) => s + l.qty, 0); }
  function saveCart() { storage.set(CART_KEY, state.cart); }

  // -------------------------------------------------------------------- API
  async function fetchStock() {
    if (DEMO) {
      await wait(250);
      return { stock: storage.get(DEMO_STOCK_KEY, DEMO_STOCK), prices: {} };
    }
    const res = await fetch(CFG.stockUrl + (CFG.stockUrl.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("Stock request failed (" + res.status + ")");
    const data = await res.json();
    const rows = Array.isArray(data) ? data : (data.items || data.value || []);
    const stock = {}, prices = {};
    for (const r of rows) {
      const sku = String(r.sku ?? r.SKU ?? "").trim();
      if (!sku) continue;
      stock[sku] = Math.max(0, parseInt(r.stock ?? r.Stock, 10) || 0);
      const price = parseFloat(r.price ?? r.Price);
      if (!isNaN(price)) prices[sku] = price;
    }
    return { stock, prices };
  }

  async function sendOrder(payload) {
    if (DEMO) return demoOrder(payload);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 100000);
    try {
      // text/plain keeps this a "simple" request, so browsers skip the CORS
      // preflight that Power Automate doesn't answer. The flow parses it as JSON.
      const res = await fetch(CFG.orderUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      let body = {};
      try { body = await res.json(); } catch { /* empty body */ }
      if (res.ok && body.ok !== false) return { ok: true, orderId: body.orderId, total: body.total };
      if (res.status === 409) return { ok: false, soldOut: body.problems || [] };
      const e = new Error("Order system returned " + res.status);
      e.server = true;   // the flow ran but failed partway; don't encourage a resubmit
      throw e;
    } catch (err) {
      if (err.name === "AbortError") { const e = new Error("timeout"); e.timeout = true; throw e; }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function demoOrder(payload) {
    await wait(900);
    const stock = storage.get(DEMO_STOCK_KEY, DEMO_STOCK);
    const problems = payload.items.filter(i => (stock[i.sku] ?? 0) < i.qty).map(i => i.sku);
    if (problems.length) return { ok: false, soldOut: problems };
    payload.items.forEach(i => { stock[i.sku] -= i.qty; });
    storage.set(DEMO_STOCK_KEY, stock);
    const orderId = "MM-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    const orders = storage.get(DEMO_ORDERS_KEY, []);
    orders.push({ orderId, at: new Date().toISOString(), ...payload });
    storage.set(DEMO_ORDERS_KEY, orders);
    return { ok: true, orderId, total: payload.items.reduce((s, i) => s + i.qty * priceOf(i.sku), 0) };
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---------------------------------------------------------- stock refresh
  let refreshing = null;
  function refresh(reconcile = true) {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const { stock, prices } = await fetchStock();
        state.stock = stock;
        state.prices = prices;
        state.updatedAt = Date.now();
        state.loadError = false;
        if (reconcile) reconcileCart();
      } catch (err) {
        console.error(err);
        state.loadError = true;
      } finally {
        refreshing = null;
        renderAll();
      }
    })();
    return refreshing;
  }

  // If stock dropped below what's in someone's cart, fix the cart and tell them.
  function reconcileCart(extraSoldOut = []) {
    if (!state.stock) return [];
    const msgs = [];
    state.cart = state.cart.filter(line => {
      const s = stockOf(line.sku);
      const label = lineName(line.sku) + ", " + sizeLabel(sizeOf(line.sku));
      if (s <= 0) { msgs.push(label + " just sold out and was removed from your order."); return false; }
      if (line.qty > s) { msgs.push("Only " + s + " left of " + label + ". We lowered your quantity."); line.qty = s; }
      else if (extraSoldOut.includes(line.sku)) { msgs.push(label + " stock changed. Please review your order."); }
      return true;
    });
    saveCart();
    if (msgs.length && !extraSoldOut.length) showNotice(msgs);
    return msgs;
  }

  function showNotice(msgs) {
    const n = $("#notice");
    n.replaceChildren(...msgs.map(m => el("div", { text: m })));
    n.hidden = false;
    n.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ------------------------------------------------------------- products
  function buildProducts() {
    const wrap = $("#products");
    for (const p of products) {
      const c = {};
      const single = p.sizes.length === 1;
      c.flag = el("div", { class: "soldout-flag", hidden: true, text: "Sold out" });
      c.sizes = {};
      const grid = el("div", { class: "size-grid" });
      for (const size of p.sizes) {
        const input = el("input", {
          type: "radio", name: "size-" + p.code, value: size,
          onchange: () => { state.pick[p.code].size = size; state.pick[p.code].qty = 1; updateProduct(p.code); }
        });
        const small = el("small", { text: "…" });
        const label = el("label", { class: "size" + (single ? " one" : "") },
          input, el("span", {}, el("b", { text: sizeLabel(size) }), small));
        c.sizes[size] = { input, small };
        grid.append(label);
      }
      c.qtyOut = el("output", { text: "1", "aria-live": "polite" });
      c.minus = el("button", { type: "button", "aria-label": "Decrease quantity", text: "−", onclick: () => bumpPick(p.code, -1) });
      c.plus = el("button", { type: "button", "aria-label": "Increase quantity", text: "+", onclick: () => bumpPick(p.code, 1) });
      c.add = el("button", { type: "button", class: "btn btn-primary", onclick: () => addToCart(p.code) });
      c.hint = el("p", { class: "hint", "aria-live": "polite" });

      const card = el("article", { class: "product", "aria-labelledby": "p-" + p.code },
        el("div", { class: "product-img" },
          el("img", { src: p.image, alt: p.name + " " + (p.tag || ""), loading: "lazy" }), c.flag),
        el("div", { class: "product-body" },
          el("div", { class: "product-top" },
            el("div", {}, el("h3", { id: "p-" + p.code, text: p.name }), p.tag ? el("span", { class: "tag", text: p.tag }) : null),
            c.price = el("div", { class: "price" })),
          p.description ? el("p", { class: "desc", text: p.description }) : null,
          el("fieldset", { class: "sizes" }, el("legend", { text: single ? "Size" : "Choose a size" }), grid),
          el("div", { class: "add-row" }, el("div", { class: "stepper" }, c.minus, c.qtyOut, c.plus), c.add),
          c.hint)
      );
      cards[p.code] = c;
      wrap.append(card);
    }
  }

  function remainingFor(code) {
    const size = state.pick[code].size;
    if (!size || !state.stock) return 0;
    const sku = skuOf(code, size);
    return Math.max(0, stockOf(sku) - inCart(sku));
  }

  function updateProduct(code) {
    const p = byCode[code], c = cards[code], pick = state.pick[code];
    const loaded = !!state.stock;
    let anyInStock = false;

    for (const size of p.sizes) {
      const { input, small } = c.sizes[size];
      const s = stockOf(skuOf(code, size));
      const soldOut = loaded && s <= 0;
      if (loaded && s > 0) anyInStock = true;
      input.disabled = !loaded || soldOut;
      small.className = loaded && s > 0 && s <= 2 ? "low" : "";
      small.textContent = !loaded ? "…" : soldOut ? "Out of stock" : s + " left";
      if (input.disabled && pick.size === size) pick.size = null;
    }
    if (p.sizes.length === 1 && loaded && !pick.size && stockOf(skuOf(code, p.sizes[0])) > 0) pick.size = p.sizes[0];
    for (const size of p.sizes) c.sizes[size].input.checked = pick.size === size;

    const price = pick.size ? priceOf(skuOf(code, pick.size)) : priceOf(skuOf(code, p.sizes[0]));
    c.price.textContent = money(price);
    c.flag.hidden = !loaded || anyInStock;

    const remaining = remainingFor(code);
    pick.qty = Math.min(Math.max(1, pick.qty), Math.max(1, remaining));
    c.qtyOut.textContent = pick.qty;
    c.minus.disabled = !pick.size || pick.qty <= 1;
    c.plus.disabled = !pick.size || pick.qty >= remaining;

    c.add.disabled = !pick.size || remaining <= 0;
    c.add.textContent = !loaded ? "Loading…"
      : !anyInStock ? "Out of stock"
      : !pick.size ? "Choose a size"
      : remaining <= 0 ? "All in your order"
      : "Add to order · " + money(price * pick.qty);

    const have = pick.size ? inCart(skuOf(code, pick.size)) : 0;
    if (!c.hint.dataset.flash) {
      c.hint.className = "hint";
      c.hint.textContent = have ? have + " of this size in your order" : "";
    }
  }

  function bumpPick(code, d) {
    state.pick[code].qty += d;
    updateProduct(code);
  }

  function addToCart(code) {
    const pick = state.pick[code];
    const remaining = remainingFor(code);
    if (!pick.size || remaining <= 0) return;
    const sku = skuOf(code, pick.size);
    const qty = Math.min(pick.qty, remaining);
    const line = state.cart.find(l => l.sku === sku);
    if (line) line.qty += qty; else state.cart.push({ sku, qty });
    pick.qty = 1;
    saveCart();

    const hint = cards[code].hint;
    hint.dataset.flash = "1";
    hint.className = "hint good";
    hint.textContent = "✓ Added " + qty + " × " + sizeLabel(pick.size) + " to your order";
    clearTimeout(hint._t);
    hint._t = setTimeout(() => { delete hint.dataset.flash; updateProduct(code); }, 2200);
    renderAll();
  }

  // ------------------------------------------------------------------ cart
  function renderCart() {
    const list = $("#cart-lines");
    list.replaceChildren();
    for (const line of state.cart) {
      const p = byCode[codeOf(line.sku)];
      const stock = stockOf(line.sku);
      const out = el("output", { text: line.qty });
      const minus = el("button", { type: "button", "aria-label": "Decrease", text: "−", disabled: line.qty <= 1,
        onclick: () => { line.qty--; saveCart(); renderAll(); } });
      const plus = el("button", { type: "button", "aria-label": "Increase", text: "+", disabled: stock != null && line.qty >= stock,
        onclick: () => { line.qty++; saveCart(); renderAll(); } });
      list.append(el("li", { class: "cart-line" },
        el("img", { src: p.image, alt: "" }),
        el("div", {},
          el("div", { class: "name", text: lineName(line.sku) }),
          el("div", { class: "meta", text: "Size: " + sizeLabel(sizeOf(line.sku)) + " · " + money(priceOf(line.sku)) + " each" }),
          el("div", { class: "ctrls" }, el("div", { class: "stepper sm" }, minus, out, plus))),
        el("div", { class: "right" },
          el("span", { class: "line-price", text: money(line.qty * priceOf(line.sku)) }),
          el("button", { type: "button", class: "remove", text: "Remove",
            onclick: () => { state.cart = state.cart.filter(l => l !== line); saveCart(); renderAll(); } }))
      ));
    }
    const count = cartCount(), total = cartTotal();
    $("#cart-empty").hidden = count > 0;
    $("#cart-total").textContent = money(total);
    $("#checkout-btn").disabled = count === 0 || !state.stock;
    $("#bar-count").textContent = count;
    $("#bar-total").textContent = money(total);
    $("#cart-bar").hidden = count === 0;
    $("#cart-bar").firstElementChild.lastChild.textContent = count === 1 ? " item" : " items";
  }

  function openCart() { $("#cart").classList.add("open"); $("#scrim").hidden = false; }
  function closeCart() { $("#cart").classList.remove("open"); $("#scrim").hidden = true; }

  // ------------------------------------------------------------ live status
  function renderStatus() {
    const dot = $("#live-dot"), text = $("#live-text");
    if (state.loadError && !state.stock) {
      dot.className = "live-dot err"; text.textContent = "Can't load stock right now. Retrying…";
    } else if (state.loadError) {
      dot.className = "live-dot err"; text.textContent = "Connection hiccup. Showing stock from " + ago(state.updatedAt) + ".";
    } else if (state.updatedAt) {
      dot.className = "live-dot on"; text.textContent = "Live stock · updated " + ago(state.updatedAt);
    }
  }
  function ago(t) {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return s + "s ago";
    return Math.round(s / 60) + " min ago";
  }

  function renderAll() {
    products.forEach(p => updateProduct(p.code));
    renderCart();
    renderStatus();
  }

  // -------------------------------------------------------------- checkout
  const fieldEls = {};
  function buildFields() {
    const box = $("#fields");
    for (const f of CFG.fields) {
      const id = "f-" + f.id;
      let input;
      if (f.type === "select") {
        input = el("select", { id, name: f.id, required: !!f.required },
          el("option", { value: "", text: "Select…" }), ...f.options.map(o => el("option", { value: o, text: o })));
      } else if (f.type === "textarea") {
        input = el("textarea", { id, name: f.id, required: !!f.required, maxlength: "1000" });
      } else {
        input = el("input", { id, name: f.id, type: f.type || "text", required: !!f.required,
          autocomplete: f.autocomplete || "on", maxlength: "200" });
      }
      input.addEventListener("input", () => { wrap.classList.remove("invalid"); err.textContent = ""; });
      input.addEventListener("change", applyShowIf);
      const err = el("span", { class: "err" });
      const wrap = el("div", { class: "field" },
        el("label", { for: id }, f.label, f.required ? el("span", { class: "req", text: " *" }) : null),
        input, err);
      fieldEls[f.id] = { f, input, wrap, err };
      box.append(wrap);
    }
    applyShowIf();
  }
  function isShown(f) {
    if (!f.showIf) return true;
    const dep = fieldEls[f.showIf.field];
    return dep && isShown(dep.f) && dep.input.value === f.showIf.equals;
  }
  function applyShowIf() {
    for (const { f, wrap } of Object.values(fieldEls)) wrap.hidden = !isShown(f);
  }
  function validate() {
    let first = null;
    for (const { f, input, wrap, err } of Object.values(fieldEls)) {
      if (!isShown(f)) continue;
      const v = input.value.trim();
      let msg = "";
      if (f.required && !v) msg = "Required";
      else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = "Enter a valid email address";
      wrap.classList.toggle("invalid", !!msg);
      err.textContent = msg;
      if (msg && !first) first = input;
    }
    if (first) first.focus();
    return !first;
  }

  function fillSummary(listSel, totalSel, lines) {
    $(listSel).replaceChildren(...lines.map(l => el("li", {},
      el("span", { text: l.qty + " × " + lineName(l.sku) + " — " + sizeLabel(sizeOf(l.sku)) }),
      el("span", { text: money(l.qty * priceOf(l.sku)) }))));
    $(totalSel).textContent = money(lines.reduce((s, l) => s + l.qty * priceOf(l.sku), 0));
  }

  function openCheckout() {
    if (!state.cart.length) return;
    closeCart();
    fillSummary("#summary-lines", "#summary-total", state.cart);
    const note = CFG.payment.enabled
      ? fillTemplate(CFG.payment.instructions, { total: money(cartTotal()), orderId: "your order number" })
      : CFG.checkoutNote;
    $("#checkout-note").textContent = note || "";
    $("#checkout-error").hidden = true;
    $("#checkout").showModal();
    const firstField = Object.values(fieldEls)[0];
    if (firstField) firstField.input.focus();
  }

  // Collapse whitespace and strip leading = + - @ so Excel never treats input as a formula.
  function cleanText(v) { return String(v).replace(/\s+/g, " ").trim().replace(/^[=+\-@\s]+/, ""); }

  function fillTemplate(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m); }

  async function submitOrder(e) {
    e.preventDefault();
    if (state.submitting || !validate()) return;
    const form = $("#checkout-form");
    const errBox = $("#checkout-error");
    errBox.hidden = true;

    const details = [];
    let name = "", email = "";
    for (const { f, input } of Object.values(fieldEls)) {
      if (!isShown(f)) continue;
      const v = cleanText(input.value);
      if (f.id === "name") name = v;
      else if (f.id === "email") email = v;
      else if (v) details.push(f.label.replace(/[:?…]+$/, "") + ": " + v);
    }
    const lines = state.cart.map(l => ({ sku: l.sku, qty: l.qty }));
    // detailsText lands as-is in the Excel "Details" column.
    const payload = { name, email, detailsText: details.join(" | "), items: lines };

    // Bots fill the hidden field; humans don't. Pretend success, send nothing.
    if (form.website.value) { finish({ orderId: "MM-" + Date.now().toString(36).toUpperCase() }, lines); return; }

    setSubmitting(true);
    try {
      const result = await sendOrder(payload);
      if (result.ok) {
        finish(result, lines);
      } else {
        $("#checkout").close();
        await refresh(false);
        const msgs = reconcileCart(result.soldOut);
        renderAll();
        showNotice(["Your order was NOT placed. Someone got to an item first. Review your order and check out again.", ...msgs]);
      }
    } catch (err) {
      console.error(err);
      errBox.textContent = err.timeout || err.server
        ? "Something went wrong while saving your order, so it MAY or may not have gone through. Please don't submit again until you've checked with a team officer. " + CFG.contactText
        : "We couldn't reach the order system, so your order was not placed. Please try again in a minute. " + CFG.contactText;
      errBox.hidden = false;
    } finally {
      setSubmitting(false);
    }
  }

  function setSubmitting(on) {
    state.submitting = on;
    const btn = $("#submit-btn");
    btn.disabled = on;
    btn.replaceChildren(...(on ? [el("span", { class: "spinner" }), "Placing order… (up to 30s)"] : ["Place order"]));
    document.querySelectorAll("#checkout [data-close]").forEach(b => { b.disabled = on; });
  }

  function finish(result, lines) {
    const snapshot = lines.map(l => ({ ...l }));
    $("#checkout").close();
    $("#done-id").textContent = result.orderId || "—";
    fillSummary("#done-lines", "#done-total", snapshot);
    const total = money(snapshot.reduce((s, l) => s + l.qty * priceOf(l.sku), 0));
    const pay = $("#done-payment");
    pay.hidden = !CFG.payment.enabled;
    if (CFG.payment.enabled) pay.textContent = fillTemplate(CFG.payment.instructions, { total, orderId: result.orderId || "" });
    $("#done-contact").textContent = (CFG.payment.enabled ? "" : CFG.checkoutNote + " ") + CFG.contactText;
    state.cart = [];
    saveCart();
    $("#checkout-form").reset();
    applyShowIf();
    $("#notice").hidden = true;
    $("#done").showModal();
    refresh();
  }

  // ------------------------------------------------------------------ init
  function init() {
    $("#contact-text").textContent = CFG.contactText;
    if (DEMO) {
      $("#demo-banner").hidden = false;
      $("#demo-reset").addEventListener("click", () => {
        storage.set(DEMO_STOCK_KEY, DEMO_STOCK);
        storage.set(DEMO_ORDERS_KEY, []);
        state.cart = []; saveCart(); refresh();
      });
    }
    buildProducts();
    buildFields();
    renderAll();

    $("#checkout-btn").addEventListener("click", openCheckout);
    $("#checkout-form").addEventListener("submit", submitOrder);
    $("#cart-bar").addEventListener("click", openCart);
    $("#cart-close").addEventListener("click", closeCart);
    $("#scrim").addEventListener("click", closeCart);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });
    document.querySelectorAll("[data-close]").forEach(b =>
      b.addEventListener("click", () => b.closest("dialog").close()));
    $("#checkout").addEventListener("cancel", e => { if (state.submitting) e.preventDefault(); });

    // Live stock: poll while the tab is visible and someone has touched the page
    // in the last 10 minutes. Each check is a flow run, and Power Automate
    // limits runs per day, so idle tabs stop asking until the viewer returns.
    const IDLE_MS = 10 * 60 * 1000;
    let lastActive = Date.now();
    const wake = () => {
      const wasIdle = Date.now() - lastActive > IDLE_MS;
      lastActive = Date.now();
      if (wasIdle || (!state.updatedAt || Date.now() - state.updatedAt > 15000)) refresh();
    };
    ["pointerdown", "keydown", "scroll", "focus"].forEach(ev => window.addEventListener(ev, () => {
      if (Date.now() - lastActive > IDLE_MS) wake(); else lastActive = Date.now();
    }, { passive: true }));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

    refresh();
    setInterval(() => {
      if (!document.hidden && Date.now() - lastActive < IDLE_MS) refresh();
    }, Math.max(20, CFG.refreshSeconds || 60) * 1000);
    setInterval(renderStatus, 10000);
  }

  init();
})();
