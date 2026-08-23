/**
 * axiom-suggest — v2 (2026-08-23) "completion-first"
 * Fix for the smuggled assumption caught by Lionel on the live site:
 * the index stores declarative claims; humans type question-shaped prefixes.
 * v1 ranked by substring, so "is" returned every claim CONTAINING "is".
 * v2: every entry carries question-form ALIASES. If the typed prefix can be
 * COMPLETED (claim or alias startsWith query), only completions are served —
 * true autocomplete. Substring/keyword discovery runs only when nothing
 * completes. Response keeps `claim` as the display/fill text (frontend
 * unchanged); `canonical` carries the underlying claim.
 * Cache keys are namespaced by INDEX_VERSION so v2 logic serves immediately.
 * CORS: literal reflected allowlist + Vary. COGS guard unchanged: no live
 * search APIs ever — suggestions come only from this cached verified index.
 */

export const INDEX_VERSION = "seed-2026-08-23-completion";
const MAX_Q = 200;
const MAX_RESULTS = 7;

const ALLOWED_ORIGINS = [
  "https://axiom.inc",
  "https://www.axiom.inc",
  "http://localhost:8788",
  "http://127.0.0.1:8788"
];

// tier: DOC | INF | NULL   verdict: TRUE | FALSE | UNVERIFIED
// c = canonical claim  a = question-form aliases (completion targets)  k = keywords
export const SUGGESTIONS = [
 {id:"d1", c:"One day has 86,400 seconds", tier:"DOC", verdict:"TRUE", w:3,
  a:["How many seconds in a day","How many seconds are in a day","Seconds in a day"],
  r:"By definition: 24 h \u00d7 3,600 SI seconds (BIPM). Mean solar day \u2248 86,400.001\u2013.002 s; leap seconds reconcile.",
  k:"seconds day 86400 time", asof:"2026-08-22"},
 {id:"d2", c:"A sidereal day is 23 hours 56 minutes", tier:"DOC", verdict:"TRUE", w:2,
  a:["What is a sidereal day","How long is a sidereal day","Is a sidereal day shorter than a solar day"],
  r:"23 h 56 m 4.1 s \u2014 one Earth rotation against the stars, not the Sun (USNO).",
  k:"sidereal day rotation 23 56 stars", asof:"2026-08-22"},
 {id:"d3", c:"A 365-day year has 31,536,000 seconds", tier:"DOC", verdict:"TRUE", w:2,
  a:["How many seconds in a year","Seconds in a year"],
  r:"Arithmetic: 365 \u00d7 86,400.",
  k:"year seconds 365 31536000", asof:"2026-08-22"},
 {id:"d4", c:"Lightning never strikes the same place twice", tier:"DOC", verdict:"FALSE", w:2,
  a:["Does lightning strike the same place twice","Can lightning strike the same place twice","Is it true lightning never strikes twice"],
  r:"The Empire State Building alone is struck ~20+ times a year (NWS/NOAA).",
  k:"lightning strike twice place storm", asof:"2026-08-22"},
 {id:"d5", c:"Humans use only 10% of their brains", tier:"DOC", verdict:"FALSE", w:2,
  a:["Do humans use only 10% of their brains","Do we only use 10 percent of our brain","Is the 10% brain myth true"],
  r:"Imaging shows activity across virtually all brain regions; no dormant 90% in the record.",
  k:"brain 10 percent ten use humans", asof:"2026-08-22"},
 {id:"d6", c:"The Great Wall of China is visible from the Moon", tier:"DOC", verdict:"FALSE", w:2,
  a:["Is the Great Wall of China visible from the Moon","Is the Great Wall visible from space","Can you see the Great Wall of China from space"],
  r:"Astronaut reports and the photographic record say no (NASA).",
  k:"great wall china moon space visible", asof:"2026-08-22"},
 {id:"d7", c:"Napoleon was unusually short", tier:"DOC", verdict:"FALSE", w:1,
  a:["Was Napoleon short","How tall was Napoleon","Is it true Napoleon was short"],
  r:"~5'6\"\u20135'7\" \u2014 average for his era; unit confusion plus caricature.",
  k:"napoleon short height tall", asof:"2026-08-22"},
 {id:"d8", c:"Index funds beat most active managers over 15 years", tier:"DOC", verdict:"TRUE", w:3,
  a:["Do index funds beat active managers","Is passive investing better than active","Do most fund managers beat the market"],
  r:"SPIVA: ~90% of US large-cap active funds trail the S&P 500 over 15-year windows.",
  k:"index funds active managers sp 500 investing etf beat", asof:"2026-08-22"},
 {id:"d9", c:"The S&P 500 has returned about 10% a year since 1926", tier:"DOC", verdict:"TRUE", w:2,
  a:["What is the average return of the S&P 500","How much does the stock market return per year","Is the S&P 500 return 10% a year"],
  r:"Nominal, dividends reinvested; ~7% real (SBBI/Ibbotson long series).",
  k:"sp500 s&p returns average stock market 10 percent annual", asof:"2026-08-22"},
 {id:"d10", c:"Water boils at 100\u00b0C everywhere", tier:"DOC", verdict:"FALSE", w:1,
  a:["Does water always boil at 100 degrees","At what temperature does water boil","Is the boiling point of water always 100"],
  r:"Only at sea-level pressure; ~70\u00b0C on Everest.",
  k:"water boils 100 celsius boiling point altitude", asof:"2026-08-22"},
 {id:"i1", c:"Coffee in moderation is safe for most adults", tier:"INF", verdict:"TRUE", w:2,
  a:["Is coffee safe","Is coffee bad for you","Is coffee in moderation safe"],
  r:"Reasoned from large cohorts + FDA ~400 mg/day caffeine guidance; no single controlled proof.",
  k:"coffee caffeine safe healthy adults", asof:"2026-08-22"},
 {id:"d11", c:"Cracking your knuckles causes arthritis", tier:"DOC", verdict:"FALSE", w:1,
  a:["Does cracking your knuckles cause arthritis","Is cracking your knuckles bad for you"],
  r:"Controlled and longitudinal studies find no association (incl. Unger, 1998).",
  k:"knuckles cracking arthritis joints", asof:"2026-08-22"},
 {id:"d12", c:"Goldfish have a three-second memory", tier:"DOC", verdict:"FALSE", w:1,
  a:["Do goldfish have a three second memory","How long is a goldfish's memory","Is the goldfish memory myth true"],
  r:"Goldfish learn and retain tasks for months in lab studies.",
  k:"goldfish memory three seconds fish", asof:"2026-08-22"},
 {id:"d13", c:"Sugar makes children hyperactive", tier:"DOC", verdict:"FALSE", w:2,
  a:["Does sugar make kids hyperactive","Does sugar make children hyper","Is sugar causing hyperactivity"],
  r:"Meta-analysis of double-blind trials finds no effect (Wolraich et al., JAMA 1995).",
  k:"sugar kids children hyperactive hyper", asof:"2026-08-22"},
 {id:"d14", c:"Vitamin C prevents colds", tier:"DOC", verdict:"FALSE", w:1,
  a:["Does vitamin C prevent colds","Is vitamin C good for colds"],
  r:"Cochrane: no prevention in the general population; small duration reduction at best.",
  k:"vitamin c colds prevent immune", asof:"2026-08-22"},
 {id:"d15", c:"Bitcoin has a fixed supply of 21 million", tier:"DOC", verdict:"TRUE", w:2,
  a:["Is Bitcoin capped at 21 million","How many bitcoins will ever exist","Does Bitcoin have a fixed supply"],
  r:"Protocol consensus rule since 2009 (Bitcoin source and whitepaper).",
  k:"bitcoin 21 million supply cap crypto", asof:"2026-08-22"},
 {id:"n1", c:"You must drink 8 glasses of water a day", tier:"NULL", verdict:"UNVERIFIED", w:2,
  a:["Do you need 8 glasses of water a day","How much water should I drink a day","Is 8 glasses of water a day necessary"],
  r:"No primary source or controlled evidence for the 8\u00d78 rule located. Scope: guideline and trial literature.",
  k:"water 8 eight glasses day hydration drink", asof:"2026-08-22"},
 {id:"n2", c:"The average person swallows 8 spiders a year while asleep", tier:"NULL", verdict:"UNVERIFIED", w:1,
  a:["Do you swallow spiders in your sleep","Is it true you swallow 8 spiders a year"],
  r:"No measurement exists; the factoid's origin trail dead-ends. Scope: entomology + folklore trace.",
  k:"spiders swallow sleep eight year average", asof:"2026-08-22"},
 {id:"n3", c:"Cold plunges raise testosterone 300%", tier:"NULL", verdict:"UNVERIFIED", w:2,
  a:["Do cold plunges raise testosterone","Does cold water increase testosterone","Is the cold plunge testosterone claim true"],
  r:"No peer-reviewed source; the 300% figure tracks norepinephrine, not testosterone. Scope: PubMed + open web.",
  k:"cold plunge plunges testosterone 300 ice bath immersion", asof:"2026-08-22"}
];

export function norm(s){
  return s.toLowerCase().replace(/[\u2019']/g,"").replace(/[^a-z0-9%&\u00b0]+/g," ").trim();
}

export function rank(q){
  const nq = norm(q);
  if (!nq) return [];

  // ---- pass 1: COMPLETION (prefix over claim + aliases) ----
  const completions = [];
  for (const e of SUGGESTIONS){
    let best = null;
    const cands = [e.c].concat(e.a || []);
    for (const cand of cands){
      const nc = norm(cand);
      if (nc.startsWith(nq)){
        const score = 100 + e.w*10 - (nc.length - nq.length)*0.05;
        if (!best || score > best.score) best = { cand, score };
      }
    }
    if (best) completions.push({ e, cand: best.cand, s: best.score });
  }
  if (completions.length){
    completions.sort((a,b) => b.s - a.s || a.cand.length - b.cand.length);
    return completions.slice(0, MAX_RESULTS).map(x => ({
      id: x.e.id, claim: x.cand, canonical: x.e.c, mode: "completion",
      tier: x.e.tier, verdict: x.e.verdict, receipt: x.e.r, asof: x.e.asof
    }));
  }

  // ---- pass 2: DISCOVERY (word-boundary token match, v1 behavior) ----
  const toks = nq.split(" ");
  const scored = [];
  for (const e of SUGGESTIONS){
    const hay = norm(e.c) + " " + (e.k||"") + " " + norm((e.a||[]).join(" "));
    let score = 0, all = true;
    for (const t of toks){
      if (!t) continue;
      const i = hay.indexOf(t);
      if (i < 0){ all = false; break; }
      score += (i === 0 || hay.charAt(i-1) === " ") ? 3 : 1;
    }
    if (!all) continue;
    scored.push({ e, s: score * (1 + e.w/10) });
  }
  scored.sort((a,b) => b.s - a.s || a.e.c.length - b.e.c.length);
  return scored.slice(0, MAX_RESULTS).map(x => ({
    id: x.e.id, claim: x.e.c, canonical: x.e.c, mode: "discovery",
    tier: x.e.tier, verdict: x.e.verdict, receipt: x.e.r, asof: x.e.asof
  }));
}

function corsHeaders(origin){
  const h = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export default {
  async fetch(request, env, ctx){
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    // ---- query log: questions, never questioners. No IP, no UA, no cookies. ----
    async function logEvent(row){
      try{
        if (!env.QLOG_DB) return;
        await env.QLOG_DB.prepare(
          "INSERT INTO qlog (kind,q,mode,cnt,top_id,cached,country,iv) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(row.kind, row.q, row.mode||null, (row.cnt===0||row.cnt)?row.cnt:null,
               row.top||null, row.cached||null, row.country||null, INDEX_VERSION).run();
      }catch(_){ /* logging must never break suggest */ }
    }
    const country = (request.cf && request.cf.country) || null;

    const url = new URL(request.url);
    if (url.pathname === "/suggest/select" && request.method === "POST"){
      let b = {};
      try{ b = JSON.parse(await request.text()); }catch(_){}
      const q = (b.q||"").toString().slice(0, MAX_Q);
      const chosen = (b.chosen||"").toString().slice(0, 300);
      ctx.waitUntil(logEvent({ kind:"sel", q, top: chosen, country }));
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname !== "/suggest")
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...cors } });

    if (request.method !== "GET")
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405, headers: { "Content-Type": "application/json", "Allow": "GET, OPTIONS", ...cors } });

    let q = (url.searchParams.get("q") || "").slice(0, MAX_Q);
    const nq = norm(q);
    if (nq.length < 2)
      return new Response(JSON.stringify({ q, count: 0, results: [], index_version: INDEX_VERSION }), {
        status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...cors } });

    const cacheKey = new Request(`${url.origin}/suggest?ix=${encodeURIComponent(INDEX_VERSION)}&nq=${encodeURIComponent(nq)}`);
    const cache = caches.default;
    let cached = await cache.match(cacheKey);
    if (cached){
      ctx.waitUntil(logEvent({ kind:"q", q: nq, mode:"cached", cached:"HIT", country }));
      const body = await cached.text();
      return new Response(body, { status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Axiom-Cache": "HIT", ...cors } });
    }

    const results = rank(q);
    ctx.waitUntil(logEvent({ kind:"q", q: nq, mode: results.length ? results[0].mode : "none",
      cnt: results.length, top: results.length ? results[0].id : null, cached:"MISS", country }));
    const body = JSON.stringify({ q, count: results.length, results, index_version: INDEX_VERSION });
    const resp = new Response(body, { status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Axiom-Cache": "MISS", ...cors } });
    ctx.waitUntil(cache.put(cacheKey, new Response(body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=3600" } })));
    return resp;
  }
};
