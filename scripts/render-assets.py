#!/usr/bin/env python3
"""Render the PNG brand assets (favicons, touch icon, og-image) from the
source SVG geometry, using headless Chromium via Playwright.

Usage:  pip install playwright  (a Chromium install must be available)
        python3 scripts/render-assets.py
"""
import pathlib
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

BRAND_GRAD = "linear-gradient(135deg, #4f46e5, #06b6d4)"

# The mark: a peak and a point. `scale` shrinks it inside its box.
def mark_svg(stroke="#fff", scale=1.0, size=64):
    s = scale
    cx = 32
    def sx(v):  # scale around center
        return cx + (v - cx) * s
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">
  <path d="M{sx(12)} {sx(52)} L{sx(32)} {sx(12)} L{sx(52)} {sx(52)}" fill="none" stroke="{stroke}" stroke-width="{9*s}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{sx(32)}" cy="{sx(45)}" r="{7*s}" fill="{stroke}"/>
</svg>'''


def icon_html(px, radius_frac, mark_scale):
    radius = int(px * radius_frac)
    return f'''<!doctype html><html><body style="margin:0">
<div style="width:{px}px;height:{px}px;border-radius:{radius}px;background:{BRAND_GRAD};
            display:grid;place-items:center">{mark_svg(scale=mark_scale, size=int(px*0.82))}</div>
</body></html>'''


OG_HTML = f'''<!doctype html><html><body style="margin:0">
<div style="position:relative;width:1200px;height:630px;overflow:hidden;
            background:#0a0f26;font-family:'Liberation Sans',Arial,sans-serif">
  <div style="position:absolute;inset:0;
              background-image:radial-gradient(circle, rgba(148,163,184,.22) 1.6px, transparent 1.6px);
              background-size:34px 34px;
              -webkit-mask-image:radial-gradient(80% 90% at 30% 20%, #000 20%, transparent 80%)"></div>
  <div style="position:absolute;inset:0;background:
              radial-gradient(760px 420px at 12% -10%, rgba(79,70,229,.38), transparent 70%),
              radial-gradient(700px 420px at 95% 115%, rgba(6,182,212,.30), transparent 70%)"></div>
  <div style="position:relative;height:100%;display:flex;flex-direction:column;
              justify-content:center;padding:0 96px">
    <svg viewBox="0 0 238 57" width="620" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="12" y1="52" x2="52" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#818cf8"/>
        </linearGradient>
      </defs>
      <path d="M12 47.5 L32 8.5 L52 47.5" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="45" r="7" fill="url(#g)"/>
      <g fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" transform="translate(68.5 0)">
        <circle cx="15" cy="37" r="11"/><path d="M26 26 V48"/>
        <path d="M41 26 L59 48 M59 26 L41 48"/>
        <path d="M74 26 V48"/>
        <circle cx="100" cy="37" r="11"/>
        <path d="M126 48 V34 A8 8 0 0 1 142 34 V48 M142 34 A8 8 0 0 1 158 34 V48"/>
      </g>
      <circle cx="142.5" cy="12.5" r="4.5" fill="#22d3ee"/>
    </svg>
    <div style="margin-top:44px;font-size:44px;font-weight:700;letter-spacing:-0.5px;
                color:rgba(255,255,255,.94)">The search engine that gets to the point.</div>
    <div style="margin-top:40px;display:flex;align-items:center;gap:26px;font-size:24px">
      <span style="color:#22d3ee;font-weight:700;letter-spacing:.06em">axiom.com</span>
      <span style="color:rgba(185,195,216,.72);letter-spacing:.04em">0 trackers &middot; 0 ads &middot; 1 answer</span>
    </div>
  </div>
</div>
</body></html>'''


def main():
    from playwright.sync_api import sync_playwright

    exe = shutil.which("chromium") or "/opt/pw-browsers/chromium"
    jobs = [
        # (filename, html, viewport_w, viewport_h)
        ("favicon-32.png", icon_html(32, 0.22, 1.0), 32, 32),
        ("favicon-192.png", icon_html(192, 0.22, 1.0), 192, 192),
        ("icon-512.png", icon_html(512, 0.22, 1.0), 512, 512),
        # maskable: full-bleed square, mark shrunk into the 80% safe zone
        ("icon-maskable-512.png", icon_html(512, 0.0, 0.78), 512, 512),
        # Apple applies its own corner rounding, so ship it square
        ("apple-touch-icon.png", icon_html(180, 0.0, 0.9), 180, 180),
        ("og-image.png", OG_HTML, 1200, 630),
    ]
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception:
            browser = p.chromium.launch(executable_path=exe)
        for name, html, w, h in jobs:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.set_content(html)
            page.screenshot(path=str(ASSETS / name), omit_background=True)
            page.close()
            print("rendered", name)
        browser.close()

    # Losslessly recompress if optipng is available (optional)
    if shutil.which("optipng"):
        for name, *_ in jobs:
            subprocess.run(["optipng", "-quiet", str(ASSETS / name)], check=False)


if __name__ == "__main__":
    main()
