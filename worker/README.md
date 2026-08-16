# Axiom search proxy (Cloudflare Worker)

Forwards the homepage demo's searches to the **Brave Search API** so the API key
stays server-side. Stateless: no logging, no storage — `worker.js` is short and
public precisely so that claim is checkable.

## Deploy (one time, ~2 minutes)

Requires a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and
Node.js on your machine:

```bash
cd worker
npx wrangler login                 # opens browser, authorize
npx wrangler secret put BRAVE_KEY  # paste your Brave Search API key when prompted
npx wrangler deploy                # prints your worker URL
```

The deploy prints something like
`https://axiom-search-proxy.<your-subdomain>.workers.dev`.

## Wire the site to it

In `assets/search-demo.js`, set:

```js
var SEARCH_PROXY = "https://axiom-search-proxy.<your-subdomain>.workers.dev";
```

and commit — the demo switches from Wikipedia mode to full web results, with
automatic fallback to Wikipedia (then to the honest error card) if the worker
is ever unreachable. **Also update `privacy/index.html` in the same commit**:
in Brave mode, queries transit this worker (ours) and Brave — the current copy
says queries go only to Wikimedia, and it must not go stale. A ready-made
paragraph is in the comment at the top of `search-demo.js`.

## Local test

```bash
cd worker
echo 'BRAVE_KEY=<your key>' > .dev.vars   # .dev.vars is gitignored
npx wrangler dev                          # serves http://localhost:8787
curl 'http://localhost:8787/search?q=test'
```

## Notes

- Allowed origins are pinned in `worker.js` (`dookdog.github.io`, `axiom.com`,
  localhost). Add domains there if the site moves.
- Brave free tier: ~2,000 queries/month, 1 req/sec. The worker sets a 5-minute
  edge cache on identical queries to stretch it.
- Rotate the key any time in the Brave dashboard; re-run
  `npx wrangler secret put BRAVE_KEY` with the new one.
