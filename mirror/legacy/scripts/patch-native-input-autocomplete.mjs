/**
 * One-shot: add autoComplete="off" to native <input ... /> in JSX (not ui/input.jsx).
 * Skips file/checkbox/hidden/radio/submit/button; skips if autoComplete already set.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, '..', 'src');

const SKIP_TYPE =
  /type\s*=\s*["'](?:file|checkbox|hidden|radio|submit|button|range)["']/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsx')) out.push(p);
  }
  return out;
}

function patchContent(relPath, s) {
  if (relPath.replace(/\\/g, '/').endsWith('components/ui/input.jsx')) return s;

  return s.replace(/<input\b[\s\S]*?\/>/g, (tag) => {
    if (SKIP_TYPE.test(tag)) return tag;
    if (/autoComplete\s*=|autocomplete\s*=/i.test(tag)) return tag;
    return tag.replace(/<input\b/, '<input autoComplete="off"');
  });
}

let changed = 0;
for (const f of walk(srcRoot)) {
  const o = fs.readFileSync(f, 'utf8');
  const n = patchContent(path.relative(srcRoot, f), o);
  if (n !== o) {
    fs.writeFileSync(f, n);
    changed++;
    console.log(path.relative(path.join(__dirname, '..'), f));
  }
}
console.log('files patched:', changed);
