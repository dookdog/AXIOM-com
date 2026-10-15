#!/usr/bin/env python3
"""Static gate: in-page links must resolve, ids must not be empty, block tags must not self-close.

Runs over every *.html in the repo (minus node_modules/.git). Exit 1 on any defect, so the
2 Sep 2026 CTA breakage (href="#cta" with <section id=""> and <div class=early-access/>)
can never deploy again.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP = {".git", "node_modules"}
RE_ID = re.compile(r'\bid\s*=\s*("([^"]*)"|\'([^\']*)\')', re.I)
RE_HREF_ANCHOR = re.compile(r'\bhref\s*=\s*"#([^"]*)"', re.I)
RE_SELFCLOSED_DIV = re.compile(r'<(div|section|span|a|button|p)\b[^>]*/\s*>', re.I)
RE_UNQUOTED_CLASS = re.compile(r'\bclass\s*=\s*[^"\'\s>][^\s>]*', re.I)

def main():
    problems = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in SKIP for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(ROOT)
        ids = set()
        for m in RE_ID.finditer(text):
            val = m.group(2) if m.group(2) is not None else m.group(3)
            if val.strip() == "":
                problems.append(f"{rel}: empty id attribute at offset {m.start()}")
            ids.add(val)
        for m in RE_HREF_ANCHOR.finditer(text):
            target = m.group(1)
            if target and target not in ids:
                problems.append(f'{rel}: href="#{target}" has no matching id in the page')
        for m in RE_SELFCLOSED_DIV.finditer(text):
            problems.append(f"{rel}: self-closed <{m.group(1)}> tag: {m.group(0)[:60]}")
        for m in RE_UNQUOTED_CLASS.finditer(text):
            problems.append(f"{rel}: unquoted class attribute: {m.group(0)[:60]}")
    if problems:
        print("ANCHOR GATE: FAIL")
        for p in problems:
            print("  -", p)
        return 1
    print("ANCHOR GATE: PASS (all in-page links resolve; no empty ids; no self-closed block tags)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
