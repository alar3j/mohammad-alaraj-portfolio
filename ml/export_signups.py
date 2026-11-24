#!/usr/bin/env python3
"""Export the waitlist to CSV and print a quick report (standard library only).

    export TECHALARAJ_ADMIN_KEY="..."        # never commit the key
    python ml/export_signups.py               # -> signups-YYYY-MM-DD.csv + report
    python ml/export_signups.py --out list.csv

The key is checked in Postgres against a bcrypt hash; wrong keys are rate
limited per IP. Data comes from the `techalaraj-waitlist` Supabase Edge Function.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from collections import Counter

API = "https://ienypzfqspjlmjbiujhy.supabase.co/functions/v1/techalaraj-waitlist"
COLUMNS = ["id", "name", "email", "source", "timezone", "country", "user_agent", "created_at"]


def fetch(key: str) -> dict:
    req = urllib.request.Request(
        API,
        data=json.dumps({"action": "admin_list", "key": key}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 403:
            sys.exit("Wrong admin key (or too many attempts - wait 15 minutes).")
        raise


def bar(n: int, total: int, width: int = 24) -> str:
    return "█" * max(1, round(width * n / total)) if total else ""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=f"signups-{dt.date.today()}.csv")
    args = ap.parse_args()

    key = os.environ.get("TECHALARAJ_ADMIN_KEY") or input("Admin key: ").strip()
    data = fetch(key)
    rows = data["rows"]

    # utf-8-sig so Excel shows Arabic names correctly
    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    total = data["total"]
    print(f"\n{total} signups ({data['today']} in the last 24h) -> {args.out}\n")
    if not rows:
        return

    for title, key_fn in (
        ("By source (?src= / ?utm_source=)", lambda r: r.get("source") or "(direct)"),
        ("By time zone", lambda r: r.get("timezone") or "(unknown)"),
        ("By day", lambda r: r["created_at"][:10]),
    ):
        print(title)
        counts = Counter(map(key_fn, rows))
        items = sorted(counts.items()) if title == "By day" else counts.most_common(10)
        for k, n in items:
            print(f"  {k:<24} {n:>5}  {bar(n, total)}")
        print()


if __name__ == "__main__":
    main()
