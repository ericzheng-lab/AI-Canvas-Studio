#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BUILD_DIR = '.vercel/output/static';
let PATCHED = 0;

function patchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      patchDir(full);
    } else if (entry.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      // Match: import * as <name> from "async_hooks" (no space version too)
      const newContent = content.replace(
        /import\*as (\w+) from"(async_hooks)"/g,
        'import*as $1 from"node:async_hooks"'
      );
      if (newContent !== content) {
        fs.writeFileSync(full, newContent);
        console.log('  Patched:', full);
        PATCHED++;
      }
    }
  }
}

patchDir(BUILD_DIR);
console.log(`Done. Total patches: ${PATCHED}`);
