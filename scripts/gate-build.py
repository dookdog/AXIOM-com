#!/usr/bin/env python3
"""Build the passphrase-gated preview page.

Encrypts preview-src/index.html (kept OUT of the public repo) into
preview/index.html — a self-contained gate page that decrypts in the
browser with WebCrypto. This is real encryption (PBKDF2-SHA256 +
AES-256-GCM), not a hide-the-content client-side gate: without the
passphrase, the committed file contains only ciphertext.

Limits, stated plainly: anyone who has the passphrase can reshare it or
the decrypted page. Rotate by re-running this script with a new
passphrase (old ciphertext remains in git history, so rotate the
passphrase, not just the file, if it ever leaks).

Usage:
  python3 scripts/gate-build.py --password 'your-passphrase'
  python3 scripts/gate-build.py --decrypt --password '...'   # recover plaintext
Requires: pip install cryptography
"""
import argparse
import base64
import json
import os
import pathlib
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "preview-src" / "index.html"
OUT = ROOT / "preview" / "index.html"
ITERATIONS = 600_000

GATE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Axiom — Private Preview</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b1023" media="(prefers-color-scheme: dark)">
<style>
:root { --bg:#ffffff; --surface:#ffffff; --ink:#0b1023; --text:#3c455a; --muted:#667085;
  --line:#e5e9f2; --brand-a:#4f46e5; --flag:#b3452e;
  --grad:linear-gradient(120deg,#4f46e5,#06b6d4);
  --grad-btn:linear-gradient(120deg,#4338ca,#4f46e5 55%,#0891b2 145%);
  --ring:rgba(79,70,229,.28); color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg:#0b1023; --surface:#121a38; --ink:#f0f4fb;
  --text:#b9c3d8; --muted:#8b96ad; --line:#222c50; --flag:#e0715a; --ring:rgba(129,140,248,.35); } }
* { box-sizing: border-box; }
body { margin:0; min-height:100svh; display:grid; place-items:center; background:var(--bg);
  color:var(--text); font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif; }
.card { width:min(92vw,420px); background:var(--surface); border:1px solid var(--line);
  border-radius:20px; box-shadow:0 10px 34px rgba(11,16,35,.09); overflow:hidden; }
.accent { height:3px; background:var(--grad); }
.inner { padding:30px 30px 28px; text-align:center; }
.mark { width:52px; height:52px; margin:0 auto 14px; }
h1 { margin:0; font-size:1.25rem; color:var(--ink); letter-spacing:-0.02em; }
p.hint { margin:8px 0 20px; font-size:14px; color:var(--muted); }
input { width:100%; font:inherit; font-size:16px; color:var(--ink); background:var(--bg);
  border:1.5px solid var(--line); border-radius:12px; padding:12px 14px; text-align:center; }
input:focus { border-color:var(--brand-a); outline:none; box-shadow:0 0 0 4px var(--ring); }
button { margin-top:14px; width:100%; padding:12px 20px; border:0; border-radius:999px;
  background:var(--grad-btn); color:#fff; font:inherit; font-size:14.5px; font-weight:700;
  letter-spacing:.06em; text-transform:uppercase; cursor:pointer; }
button:hover { filter:saturate(1.08); }
.err { margin:12px 0 0; font-size:13.5px; font-weight:600; color:var(--flag); min-height:1.2em; }
.fine { margin:18px 0 0; font-size:11.5px; color:var(--muted); }
</style>
</head>
<body>
<main class="card">
  <div class="accent" aria-hidden="true"></div>
  <div class="inner">
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="g" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#06b6d4"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>
      <path d="M12 52 L32 12 L52 52" fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="32" cy="45" r="7" fill="url(#g)"/>
    </svg>
    <h1>Private preview</h1>
    <p class="hint">This build is gated. Enter the passphrase to open it.</p>
    <form id="f">
      <input id="pw" type="password" autocomplete="current-password" aria-label="Passphrase" autofocus>
      <button type="submit">Open</button>
    </form>
    <p class="err" id="err" aria-live="polite"></p>
    <p class="fine">Encrypted at rest (AES-256-GCM). Nothing you type leaves this page.</p>
  </div>
</main>
<script>
(function () {
  'use strict';
  var PAYLOAD = __PAYLOAD__;
  var ITER = __ITER__;
  function b64(s) { var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  document.getElementById('f').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('err');
    err.textContent = '';
    var pw = document.getElementById('pw').value;
    if (!pw) { err.textContent = 'An empty passphrase is a null.'; return; }
    if (!(window.crypto && crypto.subtle)) {
      err.textContent = 'This browser blocks WebCrypto here. Serve over https:// or localhost.';
      return;
    }
    var enc = new TextEncoder();
    crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: b64(PAYLOAD.salt), iterations: ITER, hash: 'SHA-256' },
          km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(PAYLOAD.nonce) }, key, b64(PAYLOAD.ct));
      })
      .then(function (buf) {
        var html = new TextDecoder().decode(buf);
        document.open(); document.write(html); document.close();
      })
      .catch(function () {
        err.textContent = 'Not it. NULL.';
      });
  });
})();
</script>
</body>
</html>
"""


def encrypt(password: str) -> None:
    plaintext = SRC.read_bytes()
    salt = os.urandom(16)
    nonce = os.urandom(12)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS)
    key = kdf.derive(password.encode())
    ct = AESGCM(key).encrypt(nonce, plaintext, None)
    payload = json.dumps({
        "salt": base64.b64encode(salt).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "ct": base64.b64encode(ct).decode(),
    })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(GATE_TEMPLATE.replace("__PAYLOAD__", payload).replace("__ITER__", str(ITERATIONS)))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, ciphertext only)")


def decrypt(password: str) -> None:
    import re
    m = re.search(r"var PAYLOAD = (\{.*?\});", OUT.read_text())
    if not m:
        sys.exit("no payload found in preview/index.html")
    p = json.loads(m.group(1))
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32,
                     salt=base64.b64decode(p["salt"]), iterations=ITERATIONS)
    key = kdf.derive(password.encode())
    plaintext = AESGCM(key).decrypt(base64.b64decode(p["nonce"]), base64.b64decode(p["ct"]), None)
    SRC.parent.mkdir(parents=True, exist_ok=True)
    SRC.write_bytes(plaintext)
    print(f"recovered plaintext to {SRC}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--password", required=True)
    ap.add_argument("--decrypt", action="store_true", help="recover preview-src from the gate page")
    args = ap.parse_args()
    decrypt(args.password) if args.decrypt else encrypt(args.password)
