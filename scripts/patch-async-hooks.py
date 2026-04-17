#!/usr/bin/env python3
"""Patch next-on-pages build output: replace bare 'async_hooks' with 'node:async_hooks'.

The next-on-pages webpack plugin strips the 'node:' prefix from Node.js built-in
module specifiers, producing 'import "async_hooks"' which Cloudflare Workers cannot resolve.
This script patches the generated files to use the proper form.
"""
import os
import re

BUILD_DIR = ".vercel/output/static"
PATCHED = 0

for root, _, files in os.walk(BUILD_DIR):
    for fname in files:
        if not fname.endswith(".js"):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Match: import * as <name> from "async_hooks"
        # Pattern accounts for potential whitespace variations from minification
        pattern = r'import\*as (\w+) from"(async_hooks)"'
        replacement = r'import*as \1 from"node:async_hooks"'

        new_content, count = re.subn(pattern, replacement, content)
        if count > 0:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  Patched ({count}x): {fpath}")
            PATCHED += count

print(f"\nDone. Total patches applied: {PATCHED}")
