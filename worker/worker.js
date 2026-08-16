/**
 * Axiom search proxy — Cloudflare Worker.
 *
 * Forwards demo search queries to the Brave Search API so the API key never
 * reaches the browser. Stateless by design: no logging, no storage, no
 * cookies — the query passes through and the trimmed result passes back.
 * This file is public so anyone can verify exactly that.
 *
 * Deploy:  see worker/README.md   Secret:  wrangler secret put BRAVE_KEY
 */

const ALLOWED_ORIGINS = [
  "https://dookdog.github.io",
  "https://axiom.com",
  "https://www.axiom.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const TAG_RE = /<[^>]+>/g; // Brave descriptions carry <strong> highlights; send plain text

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    // Keep crawlers and indexers away from the endpoint entirely.
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (request.method !== "GET" || url.pathname !== "/search") {
      return json({ error: "not found" }, 404, cors);
    }
    // Bot gate: only the site's own pages send an allowed Origin. A determined
    // client can forge this header — the hard backstop is Brave's own quota and
    // rate limit — but it shuts out crawlers, scrapers, and drive-by curl.
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "forbidden: requests must come from the Axiom site" }, 403, cors);
    }

    const q = (url.searchParams.get("q") || "").trim().slice(0, 300);
    if (!q) {
      return json({ error: "empty query" }, 400, cors);
    }

    const upstream = await fetch(
      "https://api.search.brave.com/res/v1/web/search?count=5&q=" + encodeURIComponent(q),
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": env.BRAVE_KEY,
        },
      }
    );

    if (!upstream.ok) {
      return json({ error: "upstream " + upstream.status }, 502, cors);
    }

    const data = await upstream.json();
    const results = (((data || {}).web || {}).results || []).slice(0, 5).map(function (w) {
      return {
        title: (w.title || "").replace(TAG_RE, ""),
        url: w.url || "",
        description: (w.description || "").replace(TAG_RE, ""),
      };
    });

    // Edge cache identical queries briefly to be gentle on the free quota.
    return json({ results: results, source: "brave" }, 200, {
      ...cors,
      "Cache-Control": "public, max-age=300",
    });
  },
};
