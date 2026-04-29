#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (exts.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const PATTERNS = [
  /base44\.entities\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /p38\.entities\.([A-Za-z_][A-Za-z0-9_]*)/g
];

const found = new Map();
const files = await walk(ROOT);
for (const f of files) {
  const txt = await readFile(f, 'utf8');
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) {
      const name = m[1];
      if (!found.has(name)) found.set(name, new Set());
      found.get(name).add(path.relative(process.cwd(), f));
    }
  }
}

const sorted = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
console.log(`# Entidades referenciadas em código (${sorted.length})\n`);
for (const [name, fset] of sorted) {
  console.log(`- ${name}  (${fset.size} arquivos)`);
}
