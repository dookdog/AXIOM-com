# axiom.com

Marketing site for **Axiom** — the private search engine that gets to the point.

Static HTML/CSS with a dash of vanilla JS. No frameworks, no build step, no external
requests (fonts, CDNs, analytics — none). The whole site is a few hundred kilobytes,
most of which is the social-share image.

## Structure

```
├── index.html              Home: hero + interactive search demo, features, axioms, FAQ
├── about/index.html        About the product and the brand
├── privacy/index.html      Privacy stance (site + product)
├── 404.html                Custom not-found page (served by GitHub Pages automatically)
├── assets/
│   ├── site.css            The one stylesheet (light + dark via prefers-color-scheme)
│   ├── search-demo.js      Canned instant-answer demo; also honors ?q= links
│   ├── logo.svg            Full lockup (mark + wordmark, drawn as pure paths)
│   ├── logo-white.svg      Lockup for dark backgrounds
│   ├── mark.svg            The bare mark: a peak and a point
│   ├── favicon.svg         Vector favicon (plus PNG fallbacks alongside)
│   └── og-image.png        1200×630 social card (rendered from the SVG geometry)
├── preview/index.html      Pre-release claim-gate demo teaser (unlisted — see below)
├── scripts/render-assets.py  Regenerates all PNG assets from the SVG geometry
├── sitemap.xml · robots.txt · site.webmanifest · opensearch.xml
├── CNAME                   Custom domain for GitHub Pages (axiom.com)
└── .github/workflows/deploy.yml  Deploys to GitHub Pages on push to main
```

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying to GitHub Pages

1. Merge to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) publishes the site on every
   push to `main`.

## Pointing axiom.com at the site

After buying the domain, in your DNS provider create:

| Type  | Host / Name | Value                     |
| ----- | ----------- | ------------------------- |
| A     | `@`         | `185.199.108.153`         |
| A     | `@`         | `185.199.109.153`         |
| A     | `@`         | `185.199.110.153`         |
| A     | `@`         | `185.199.111.153`         |
| AAAA  | `@`         | `2606:50c0:8000::153`     |
| AAAA  | `@`         | `2606:50c0:8001::153`     |
| AAAA  | `@`         | `2606:50c0:8002::153`     |
| AAAA  | `@`         | `2606:50c0:8003::153`     |
| CNAME | `www`       | `dookdog.github.io`       |

Then in **Settings → Pages**:

1. Set **Custom domain** to `axiom.com` (this matches the `CNAME` file already in the
   repo) and wait for the DNS check to pass.
2. Tick **Enforce HTTPS** once the certificate is provisioned (can take up to an hour).
3. `www.axiom.com` will redirect to the apex automatically via the CNAME record.

> Until the domain is attached, the site also works at
> `https://dookdog.github.io/AXIOM-com/` — every internal link is relative, so no
> changes are needed for the preview.

## SEO — what's already done

- Unique, keyword-focused `<title>` + meta description per page; canonical URLs on
  the `https://axiom.com` apex
- Open Graph + Twitter Card tags with a rendered 1200×630 share image
- JSON-LD structured data: `Organization`, `WebSite` **with `SearchAction`**
  (sitelinks-searchbox eligible — the demo really does honor `?q=`), `FAQPage`
  matching the visible FAQ, `AboutPage`/`WebPage` + `BreadcrumbList` on inner pages
- `sitemap.xml` (referenced from `robots.txt`), permissive `robots.txt`, `noindex`
  on the 404 page
- OpenSearch descriptor so browsers can register Axiom as a search provider
- Semantic HTML (one `h1` per page, landmarks, skip link), accessible focus states,
  `prefers-reduced-motion` support, AA color contrast in both themes
- Performance: zero third-party requests, system font stack, one small stylesheet,
  SVG-first imagery — LCP is text, CLS is 0 by construction

**After the domain is live:**

1. Add the site in [Google Search Console](https://search.google.com/search-console)
   (domain property) and [Bing Webmaster Tools](https://www.bing.com/webmasters), and
   submit `https://axiom.com/sitemap.xml`.
2. Keep `lastmod` in `sitemap.xml` fresh when pages change.
3. Consider swapping `hello@axiom.com` (used in CTAs) for a real mailbox or a form
   endpoint once email is set up on the domain.

## Pre-release demo (`/preview/`)

`preview/index.html` is the pre-release **claim gate** demo teaser: a single
self-contained file — no external requests, no build step, no timers. The interactive
box runs a JS port of the demo ruleset v0.1, a structural read of a claim's *form*:
it fetches nothing, verifies nothing, and says so on every result (the demo never
awards DOCUMENTED). The page takes no signups by design — a form with no backend
would be theater.

The page is unlisted rather than secret: it is not linked from the site nav, not in
`sitemap.xml`, and `/preview/` is disallowed in `robots.txt`. Share it by direct
link, or lift those two exclusions when it should become discoverable.

This ungated teaser replaced the earlier passphrase gate (2026-08-16). The gate
tooling is kept for future private drops: `scripts/gate-build.py` encrypts
`preview-src/index.html` (gitignored) into a self-decrypting page — see the script's
docstring for usage.

## Regenerating image assets

The PNGs (favicons, touch icon, og-image) are rendered from the SVG geometry:

```bash
pip install playwright   # needs a Chromium install available to Playwright
python3 scripts/render-assets.py
```

## Brand

The mark is the letter **A** reduced to first principles: *a peak and a point*.
Indigo `#4f46e5` → cyan `#06b6d4`. The wordmark is drawn from circles and lines as
pure SVG paths, so it renders identically everywhere — no webfonts involved.
