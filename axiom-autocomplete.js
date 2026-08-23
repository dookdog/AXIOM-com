/* axiom-autocomplete.js — v1 (2026-08-23)
 * Drop-in for axiom.inc. One file, no dependencies, injects its own styles.
 * Attaches to the existing search input, calls the live suggest Worker,
 * renders verdict-tiered suggestions; zero matches renders an HONEST NULL row.
 * Integration: put this file next to index.html and add before </body>:
 *   <script defer src="axiom-autocomplete.js"></script>
 * Override hook: add data-axiom-suggest to any input to force attachment.
 * The site's own Search button/behavior is untouched; selecting a suggestion
 * only fills the input. */
(function () {
  "use strict";
  var EP = "https://axiom-suggest.lionelsullivan.workers.dev/suggest";
  var MIN = 2, DEBOUNCE = 150, MAXTRIES = 20;

  var css = ""
    + "#axm-ac{position:absolute;z-index:99999;background:#0E1526;border:1px solid rgba(255,255,255,.10);"
    + "border-radius:14px;box-shadow:0 14px 38px rgba(0,0,0,.55);overflow:hidden;display:none;"
    + "font-family:inherit;color:#E8ECEF;text-align:left}"
    + "#axm-ac.open{display:block}"
    + "#axm-ac ul{list-style:none;margin:0;padding:0}"
    + "#axm-ac .axm-opt{display:flex;align-items:baseline;gap:10px;padding:11px 16px;cursor:pointer;font-size:15px}"
    + "#axm-ac .axm-opt+.axm-opt{border-top:1px solid rgba(255,255,255,.06)}"
    + "#axm-ac .axm-opt.axm-active,#axm-ac .axm-opt:hover{background:rgba(79,124,255,.14)}"
    + "#axm-ac .axm-claim{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#E8ECEF}"
    + "#axm-ac .axm-claim b{color:#fff}"
    + "#axm-ac .axm-tags{display:flex;align-items:center;gap:7px;flex-shrink:0}"
    + "#axm-ac .axm-verdict{font-size:10px;font-weight:700;letter-spacing:.12em}"
    + "#axm-ac .axm-true{color:#35D0C5}#axm-ac .axm-false{color:#FF6B5E}#axm-ac .axm-unv{color:#8A97A8}"
    + "#axm-ac .axm-chip{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.1em;padding:2px 7px;border-radius:4px;white-space:nowrap}"
    + "#axm-ac .axm-doc{background:#35D0C5;color:#0A1220}"
    + "#axm-ac .axm-inf{background:transparent;color:#E0A94E;border:1.5px dashed #E0A94E}"
    + "#axm-ac .axm-null{background:transparent;color:#35D0C5;border:1.5px solid rgba(53,208,197,.6)}"
    + "#axm-ac .axm-nullrow{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:#0A1220;border-top:3px solid #35D0C5;cursor:default}"
    + "#axm-ac .axm-nl{font-size:9.5px;font-weight:700;letter-spacing:.2em;color:#35D0C5}"
    + "#axm-ac .axm-nm{font-size:13.5px;color:#E8ECEF;margin-top:3px}"
    + "#axm-ac .axm-nm code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;color:#35D0C5;background:none}"
    + "#axm-ac .axm-ng{font-size:11.5px;color:#9AA7B8;margin-top:5px}"
    + "#axm-ac .axm-foot{font-size:9.5px;letter-spacing:.16em;color:#7C8AA0;padding:7px 16px;border-top:1px solid rgba(255,255,255,.06)}";

  function injectCss() {
    var s = document.createElement("style");
    s.id = "axm-ac-css"; s.textContent = css;
    document.head.appendChild(s);
  }

  function findInput() {
    var el = document.querySelector("[data-axiom-suggest]");
    if (el) return el;
    var sel = 'input[type="search"],input[name="q"],#q,#search,#search-input,input[type="text"],input:not([type])';
    var cands = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (i) {
      if (i.offsetParent === null) return false;
      var r = i.getBoundingClientRect();
      return r.width > 140 && r.height > 18;
    });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return nearSearchBtn(b) - nearSearchBtn(a); });
    return cands[0];
  }
  function nearSearchBtn(i) {
    var scope = i.closest("form, div, section") || document;
    var btns = scope.querySelectorAll('button,[role="button"],input[type="submit"]');
    for (var k = 0; k < btns.length; k++) {
      var t = (btns[k].textContent || btns[k].value || "");
      if (/search|buscar|搜索/i.test(t)) return 1;
    }
    return 0;
  }

  var input, drop, list, foot, active = -1, current = [], t = null, ctrl = null;

  function build() {
    drop = document.createElement("div");
    drop.id = "axm-ac";
    list = document.createElement("ul");
    list.setAttribute("role", "listbox");
    list.id = "axm-ac-list";
    foot = document.createElement("div");
    foot.className = "axm-foot";
    foot.textContent = "SUGGESTIONS ARE CLAIMS ALREADY CHECKED \u00b7 VERDICTS SHOWN BEFORE YOU ASK";
    drop.appendChild(list); drop.appendChild(foot);
    document.body.appendChild(drop);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", "axm-ac-list");
  }

  function place() {
    var r = input.getBoundingClientRect();
    var host = input.closest("form, div") || input;
    var hr = host.getBoundingClientRect();
    var left = Math.min(r.left, hr.left), width = Math.max(r.width, hr.width);
    drop.style.left = (left + window.scrollX) + "px";
    drop.style.top = (r.bottom + window.scrollY + 10) + "px";
    drop.style.width = width + "px";
  }
  function open() { place(); drop.classList.add("open"); input.setAttribute("aria-expanded", "true"); }
  function close() { drop.classList.remove("open"); input.setAttribute("aria-expanded", "false"); active = -1; input.removeAttribute("aria-activedescendant"); }

  function verdictEl(v) {
    var s = document.createElement("span");
    s.className = "axm-verdict " + (v === "TRUE" ? "axm-true" : v === "FALSE" ? "axm-false" : "axm-unv");
    s.textContent = v; return s;
  }
  function chipEl(tier) {
    var s = document.createElement("span");
    s.className = "axm-chip " + (tier === "DOC" ? "axm-doc" : tier === "INF" ? "axm-inf" : "axm-null");
    s.textContent = tier === "DOC" ? "DOCUMENTED" : tier === "INF" ? "INFERRED" : "NULL";
    return s;
  }
  function claimEl(c, q) {
    var span = document.createElement("span"); span.className = "axm-claim";
    var lc = c.toLowerCase(), lq = q.trim().toLowerCase();
    var i = lq ? lc.indexOf(lq) : -1;
    if (i < 0) { span.textContent = c; return span; }
    span.appendChild(document.createTextNode(c.slice(0, i)));
    var b = document.createElement("b"); b.textContent = c.slice(i, i + lq.length);
    span.appendChild(b);
    span.appendChild(document.createTextNode(c.slice(i + lq.length)));
    return span;
  }

  function render(q, results) {
    list.textContent = ""; current = results; active = -1;
    if (!results.length) {
      var li = document.createElement("li");
      li.className = "axm-nullrow"; li.setAttribute("role", "option"); li.id = "axm-opt-null";
      var box = document.createElement("div");
      var l1 = document.createElement("div"); l1.className = "axm-nl"; l1.textContent = "HONEST NULL";
      var l2 = document.createElement("div"); l2.className = "axm-nm";
      l2.appendChild(document.createTextNode("Nothing cached matches "));
      var code = document.createElement("code"); code.textContent = "\u201c" + q.trim() + "\u201d";
      l2.appendChild(code); l2.appendChild(document.createTextNode("."));
      var l3 = document.createElement("div"); l3.className = "axm-ng";
      l3.textContent = "Suggestions come only from claims already verified. Press Search to run a full check.";
      box.appendChild(l1); box.appendChild(l2); box.appendChild(l3);
      li.appendChild(box);
      list.appendChild(li);
      open(); return;
    }
    results.forEach(function (e, idx) {
      var li = document.createElement("li");
      li.className = "axm-opt"; li.setAttribute("role", "option"); li.id = "axm-opt-" + idx;
      li.appendChild(claimEl(e.claim, q));
      var tags = document.createElement("span"); tags.className = "axm-tags";
      tags.appendChild(verdictEl(e.verdict)); tags.appendChild(chipEl(e.tier));
      li.appendChild(tags);
      li.addEventListener("mousedown", function (ev) { ev.preventDefault(); select(e); });
      list.appendChild(li);
    });
    open();
  }

  function select(e) {
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(EP + "/select",
        new Blob([JSON.stringify({ q: input.value, chosen: e.claim })], { type: "text/plain" }));
    } catch (_) { /* logging must never affect the box */ }
    input.value = e.claim;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    close(); input.focus();
  }

  function setActive(i) {
    var opts = list.querySelectorAll(".axm-opt");
    if (!opts.length) return;
    if (active >= 0 && opts[active]) opts[active].classList.remove("axm-active");
    active = (i + opts.length) % opts.length;
    opts[active].classList.add("axm-active");
    input.setAttribute("aria-activedescendant", opts[active].id);
  }

  function query(q) {
    if (ctrl) ctrl.abort();
    ctrl = ("AbortController" in window) ? new AbortController() : null;
    fetch(EP + "?q=" + encodeURIComponent(q), { signal: ctrl && ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if ((input.value || "").trim() !== q.trim()) return;
        render(q, (d && d.results) || []);
      })
      .catch(function () { /* aborted or network — stay silent, never block the box */ });
  }

  function onInput() {
    clearTimeout(t);
    var q = input.value || "";
    if (q.trim().length < MIN) { close(); return; }
    t = setTimeout(function () { query(q); }, DEBOUNCE);
  }

  function onKey(ev) {
    var isOpen = drop.classList.contains("open");
    if (ev.key === "ArrowDown") { if (!isOpen) { onInput(); return; } ev.preventDefault(); setActive(active + 1); }
    else if (ev.key === "ArrowUp") { if (!isOpen) return; ev.preventDefault(); setActive(active - 1); }
    else if (ev.key === "Enter") {
      if (isOpen && active >= 0 && current[active]) { ev.preventDefault(); select(current[active]); }
      else close(); /* let the site's own Search behavior run */
    }
    else if (ev.key === "Escape") close();
  }

  function attach() {
    input = findInput();
    if (!input) return false;
    injectCss(); build();
    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKey);
    input.addEventListener("blur", function () { setTimeout(close, 150); });
    window.addEventListener("resize", function () { if (drop.classList.contains("open")) place(); });
    window.addEventListener("scroll", function () { if (drop.classList.contains("open")) place(); }, true);
    document.addEventListener("mousedown", function (ev) {
      if (ev.target !== input && !drop.contains(ev.target)) close();
    });
    return true;
  }

  var tries = 0;
  function init() {
    if (attach()) return;
    tries++;
    if (tries < MAXTRIES) setTimeout(init, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
