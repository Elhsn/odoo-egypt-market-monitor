#!/usr/bin/env python3
"""Extract the public dashboard dataset (data.json) and market chart from the
already-published public dashboard build. No credentials or private sources."""
import re, subprocess, sys, urllib.request, os, time, json, base64

CANONICAL = "https://files.instinct.com/dm6ngmf26sgh-odoo-egypt-market-monitor"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = os.path.join(ROOT, "site")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

def fresh_lease():
    dom = subprocess.run(
        ["google-chrome", "--headless", "--no-sandbox", "--disable-gpu",
         "--virtual-time-budget=8000", "--dump-dom", CANONICAL],
        capture_output=True, text=True, timeout=120).stdout
    m = re.search(r'src="(https://filerevision-[^"]*index\.html\?lease=[^"]+)"', dom)
    if not m:
        raise RuntimeError("no file-runtime iframe found on canonical page")
    ifr = m.group(1).replace("&amp;", "&")
    return ifr, re.search(r"https://[^/]+", ifr).group(0), re.search(r"lease=([^&#]+)", ifr).group(1)

def get(url, ref):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": ref, "Accept": "*/*"})
    return urllib.request.urlopen(req, timeout=60).read()

def extract(js_text):
    i = js_text.find("var data_default =")
    if i < 0:
        raise RuntimeError("data blob not found in bundle")
    j = js_text.find("{", i)
    depth, k, instr, esc = 0, j, False, False
    while k < len(js_text):
        c = js_text[k]
        if instr:
            if esc: esc = False
            elif c == "\\": esc = True
            elif c == '"': instr = False
        else:
            if c == '"': instr = True
            elif c == "{": depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0: break
        k += 1
    literal = js_text[j:k+1]
    out = subprocess.run(["node", "-e",
        "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=eval('('+s+')');process.stdout.write(JSON.stringify(d))})"],
        input=literal, capture_output=True, text=True, timeout=120)
    if out.returncode != 0:
        raise RuntimeError("node data eval failed: " + out.stderr[:200])
    return out.stdout

def main():
    os.makedirs(SITE, exist_ok=True)
    last = None
    for attempt in range(6):
        try:
            ifr, host, lease = fresh_lease()
            js = get(host + "/main.js?lease=" + lease, ifr).decode("utf-8", "replace")
            data = extract(js)
            d = json.loads(data)
            for key in ("partners", "references", "allChanges", "history", "notifications"):
                if key not in d:
                    raise RuntimeError("extracted data missing " + key)
            m = re.search(r'var market_chart_default = "(\./assets/[A-Z0-9]+\.png)"', js)
            chart = None
            if m:
                chart = get(host + "/" + m.group(1)[2:] + "?lease=" + lease, ifr)
            open(os.path.join(SITE, "data.json"), "w").write(data)
            if chart:
                open(os.path.join(SITE, "chart.png"), "wb").write(chart)
            print("synced data.json: %d partners, %d references, %d changes, %d alerts; chart %s bytes"
                  % (len(d["partners"]), len(d["references"]), len(d["allChanges"]),
                     len(d["notifications"]), len(chart) if chart else "no"))
            return 0
        except Exception as e:
            last = e
            print("attempt %d failed: %s" % (attempt, str(e)[:140]), flush=True)
            time.sleep(3)
    raise SystemExit("sync failed: %s" % last)

if __name__ == "__main__":
    sys.exit(main())
