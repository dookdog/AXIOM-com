/* Axiom search demo — a handful of canned instant answers.
   No network calls, no storage, no tracking. View source and verify. */
(function () {
  "use strict";

  var form = document.getElementById("demo-form");
  if (!form) return;

  var input = document.getElementById("q");
  var card = document.getElementById("answer");
  var label = document.getElementById("answer-label");
  var text = document.getElementById("answer-text");

  /* Most canned answers are about Axiom itself, so they only fire when the
     query is actually aimed at us — otherwise "Who is X?" or "How fast is Y?"
     would get an ego answer instead of the honest default. */
  var AIMED_AT_US = /\baxiom\b|\byou\b|\byour\b|\bthis\b/;

  var ANSWERS = [
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

  var DEFAULT_ANSWER = {
    label: "Instant answer",
    html:
      "The full index is still warming up — this demo only knows a handful of things " +
      "(try a suggestion below). The real Axiom launches soon. It already refuses to track you, " +
      "though. <strong>Some features ship early.</strong>"
  };

  function respond(query) {
    var q = query.trim();
    if (!q) return;
    var norm = q.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    var aimedAtUs = AIMED_AT_US.test(norm);
    var found = DEFAULT_ANSWER;
    for (var i = 0; i < ANSWERS.length; i++) {
      if (ANSWERS[i].aboutUs && !aimedAtUs) continue;
      if (ANSWERS[i].match.test(norm)) {
        found = ANSWERS[i];
        break;
      }
    }
    label.textContent = found.label;
    text.innerHTML = found.html;
    card.hidden = false;
    card.classList.remove("pop");
    void card.offsetWidth; /* restart the entrance animation */
    card.classList.add("pop");
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
