/* Axiom search demo.
   Two paths, both honest:
   - Questions about Axiom get canned answers, matched locally in your browser.
   - Anything else does a LIVE lookup against Wikipedia's public API — the
     request goes straight from your browser to Wikimedia (we never see it),
     and the result card says exactly where it came from.
   No tracking, no storage. View source and verify. */
(function () {
  "use strict";

  var form = document.getElementById("demo-form");
  if (!form) return;

  /* Full-web mode: set to your deployed worker URL (see worker/README.md),
     e.g. "https://axiom-search-proxy.<subdomain>.workers.dev".
     Leave "" for Wikipedia-only mode. If you flip this on, update
     privacy/index.html in the same commit — suggested wording:
     "a live demo search is forwarded through our stateless search proxy
     (source public in /worker) to the Brave Search API; neither logs nor
     stores your query." Honesty outranks features here. */
  var SEARCH_PROXY = (typeof window !== "undefined" && window.AXIOM_SEARCH_PROXY) ||
    "https://axiom-com.lionelsullivan.workers.dev";

  var input = document.getElementById("q");
  var card = document.getElementById("answer");
  var label = document.getElementById("answer-label");
  var text = document.getElementById("answer-text");
  var extra = document.getElementById("answer-extra");
  var foot = document.getElementById("answer-foot");

  var CANNED_FOOT = "0 trackers · 0 ads · 1 answer";
  var LIVE_FOOT = "0 trackers · 0 ads · fetched from Wikipedia’s open API by your browser";
  var WEB_FOOT = "0 trackers · 0 ads · web results via Brave Search (stateless proxy, never logged)";

  var WIKI_API =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrlimit=3&prop=extracts%7Cinfo&exintro=1&explaintext=1" +
    "&exsentences=2&inprop=url&gsrsearch=";

  /* Canned answers about Axiom only fire when the query is actually aimed at
     us — otherwise "Who is X?" would get an ego answer instead of a real one. */
  var AIMED_AT_US = /\baxiom\b|\byou\b|\byour\b|\bthis\b/;

  var ANSWERS = [{ match: /\blionel\b.*\bsullivan\b|\bsullivan\b.*\blionel\b/, label: "The founder", html: "<strong>Lionel C. Sullivan is the creator of Axiom</strong> \u2014 a Frisco, Texas entrepreneur and the founder of Unicron Studios, LLC and its research arm, ForcedFlow Labs. His career runs from piano retail \u2014 the Southwest&rsquo;s first Fazioli dealership \u2014 through IT, logistics, real estate, and AI &amp; quantitative research. Axiom is search rebuilt from his first principles: answers first, privacy by default, rank earned. More on the <a href='about/'>about page</a>." },
    {
      match: /\baxioms?\b.*\b(what|mean|definition)\b|\b(what|whats)\b.*\baxiom\b/,
      label: "Definition",
      html:
        "<strong>An axiom is a statement so evidently true that it needs no proof</strong> — " +
        "the starting point every other truth is built on. We think a search engine should " +
        "work the same way: start from what&rsquo;s true, skip what&rsquo;s noise."
    },
    {
      match: /\b(track|tracking|privacy|private|spy|data|collect)\b/,
      aboutUs: true,
      label: "Privacy",
      html:
        "<strong>No.</strong> Axiom doesn&rsquo;t build a profile of you, doesn&rsquo;t tie search " +
        "history to your identity, and doesn&rsquo;t sell your attention. Privacy isn&rsquo;t a " +
        "premium tier here — it&rsquo;s Axiom&nbsp;3 of 5. Scroll down and hold us to it."
    },
    {
      match: /\b(funded|funding|money|business|revenue|ads|advertis)\b/,
      aboutUs: true,
      label: "Business model",
      html:
        "Not by ads that follow you around. Core search stays free; a paid tier adds power " +
        "features for people who live in a search bar. The business model is " +
        "<strong>&ldquo;be worth paying for,&rdquo;</strong> not &ldquo;sell the searcher.&rdquo;"
    },
    {
      match: /\bwhy\b.*\b(name|called|axiom)\b|\bname\b/,
      aboutUs: true,
      label: "The name",
      html:
        "In mathematics, axioms are the small set of truths everything else is derived from. " +
        "Our five fit on one screen — scroll down. Also, <strong>&ldquo;axiom&rdquo; looks " +
        "excellent with a dot on the i.</strong>"
    },
    {
      match: /\b(fast|speed|quick|slow|latency)\b/,
      aboutUs: true,
      label: "Speed",
      html:
        "Fast enough that you stop noticing the search and only notice the answer. Our results " +
        "page is measured in <strong>kilobytes, not megabytes</strong> — built for a phone on a " +
        "subway, not a lab benchmark."
    },
    {
      match: /\b(launch|available|release|when|beta|try|waitlist|sign ?up)\b/,
      aboutUs: true,
      label: "Availability",
      html:
        "Axiom is in private beta, and this page is where the public launch will happen. " +
        "<strong>Want in early?</strong> Hit &ldquo;Request early access&rdquo; below."
    },
    {
      match: /\b(who|built|team|made|created|founder)\b/,
      aboutUs: true,
      label: "The team",
      html:
        "A small, independent team that got tired of searching through ads to find answers — " +
        "so we started from the axioms and derived a search engine. More on the " +
        "<a href='about/'>about page</a>."
    }
  ];

  function el(tag, className, textContent) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function showCard() {
    card.hidden = false;
    card.classList.remove("pop");
    void card.offsetWidth; /* restart the entrance animation */
    card.classList.add("pop");
  }

  function renderCanned(answer) {
    label.textContent = answer.label;
    text.innerHTML = answer.html; /* trusted, hand-written strings only */
    extra.textContent = "";
    foot.textContent = CANNED_FOOT;
    showCard();
  }

  function renderSearching(q) {
    label.textContent = "Searching…";
    text.textContent = "Looking up “" + q + "” in the live index.";
    extra.textContent = "";
    foot.textContent = LIVE_FOOT;
    showCard();
  }

  /* Live results are untrusted text: everything lands via textContent. */
  function renderHits(pages) {
    var top = pages[0];
    label.textContent = "Live answer";
    text.textContent = "";
    var t = el("a", "hit-title", top.title);
    t.href = top.fullurl || "#";
    t.target = "_blank";
    t.rel = "noopener";
    text.appendChild(t);
    text.appendChild(el("span", null, " — " + (top.extract || "No summary available.")));

    extra.textContent = "";
    if (pages.length > 1) {
      var list = el("ul", "more-hits");
      for (var i = 1; i < pages.length; i++) {
        var li = el("li");
        var a = el("a", null, pages[i].title);
        a.href = pages[i].fullurl || "#";
        a.target = "_blank";
        a.rel = "noopener";
        li.appendChild(a);
        list.appendChild(li);
      }
      var more = el("p", "more-label", "More from the index:");
      extra.appendChild(more);
      extra.appendChild(list);
    }
    foot.textContent = LIVE_FOOT;
    showCard();
  }

  function renderMiss() {
    label.textContent = "No result";
    text.textContent =
      "The live index has nothing solid for that one, and Axiom doesn’t pad a " +
      "miss into a maybe. An honest scale sometimes reads zero.";
    extra.textContent = "";
    foot.textContent = LIVE_FOOT;
    showCard();
  }

  function renderError() {
    label.textContent = "Index unreachable";
    text.textContent =
      "Couldn’t reach the live index (Wikipedia’s public API) from your " +
      "browser just now. The canned answers below still work — try a suggestion.";
    extra.textContent = "";
    foot.textContent = "0 trackers · 0 ads · 0 answers — said so instead";
    showCard();
  }

  /* Web results from the proxy are untrusted text: textContent only. */
  function renderWebHits(results) {
    var top = results[0];
    label.textContent = "Live answer";
    text.textContent = "";
    var t = el("a", "hit-title", top.title || top.url);
    t.href = top.url || "#";
    t.target = "_blank";
    t.rel = "noopener";
    text.appendChild(t);
    text.appendChild(el("span", null, " — " + (top.description || "No summary available.")));

    extra.textContent = "";
    if (results.length > 1) {
      var list = el("ul", "more-hits");
      for (var i = 1; i < Math.min(results.length, 4); i++) {
        var li = el("li");
        var a = el("a", null, results[i].title || results[i].url);
        a.href = results[i].url || "#";
        a.target = "_blank";
        a.rel = "noopener";
        li.appendChild(a);
        list.appendChild(li);
      }
      extra.appendChild(el("p", "more-label", "More from the web:"));
      extra.appendChild(list);
    }
    foot.textContent = WEB_FOOT;
    showCard();
  }

  var seq = 0;

  function fetchWithTimeout(url) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(url, ctl ? { signal: ctl.signal } : {});
  }

  function wikiSearch(q, mine) {
    return fetchWithTimeout(WIKI_API + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (mine !== seq) return;
        var raw = (d && d.query && d.query.pages) || {};
        var pages = Object.keys(raw).map(function (k) { return raw[k]; });
        pages.sort(function (a, b) { return (a.index || 9) - (b.index || 9); });
        pages.length ? renderHits(pages) : renderMiss();
      });
  }

  function liveSearch(q) {
    var mine = ++seq;
    renderSearching(q);
    var chain;
    if (SEARCH_PROXY) {
      chain = fetchWithTimeout(SEARCH_PROXY + "/search?q=" + encodeURIComponent(q))
        .then(function (r) {
          if (!r.ok) throw new Error("proxy " + r.status);
          return r.json();
        })
        .then(function (d) {
          if (mine !== seq) return;
          var results = (d && d.results) || [];
          if (!results.length) { renderMiss(); return; }
          renderWebHits(results);
        })
        .catch(function () {
          /* Proxy down? Fall back to the open encyclopedia rather than a dead box. */
          if (mine !== seq) return;
          return wikiSearch(q, mine);
        });
    } else {
      chain = wikiSearch(q, mine);
    }
    chain.catch(function () {
      if (mine !== seq) return;
      renderError();
    });
  }

  function respond(query) {
    var q = query.trim();
    if (!q) return;
    var norm = q.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    var aimedAtUs = AIMED_AT_US.test(norm);
    for (var i = 0; i < ANSWERS.length; i++) {
      if (ANSWERS[i].aboutUs && !aimedAtUs) continue;
      if (ANSWERS[i].match.test(norm)) {
        seq++; /* cancel any in-flight live render */
        renderCanned(ANSWERS[i]);
        return;
      }
    }
    liveSearch(q.slice(0, 300));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    respond(input.value);
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      input.value = chip.textContent.trim();
      respond(input.value);
      input.focus();
    });
  });

  /* Honor ?q= links (this is the SearchAction target used in structured data). */
  try {
    var param = new URLSearchParams(window.location.search).get("q");
    if (param) {
      input.value = param;
      respond(param);
    }
  } catch (err) {
    /* very old browsers: the demo simply waits for input */
  }
})();
