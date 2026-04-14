import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const TARGET_TOKEN = 'data-source-location';
const JS_EXTENSIONS = new Set(['.js', '.mjs', '.html']);

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('[flare-check] dist/ não encontrado. Rode o build antes.');
  process.exit(1);
}

const files = walk(DIST_DIR).filter((file) => JS_EXTENSIONS.has(path.extname(file).toLowerCase()));
let matchedFile = null;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(TARGET_TOKEN)) {
    matchedFile = file;
    break;
  }
}

if (!matchedFile) {
  console.error('[flare-check] Falha: build sem data-source-location. Instrumentação obrigatória para Flare source-first.');
  process.exit(1);
}

console.log(`[flare-check] OK: token encontrado em ${path.relative(process.cwd(), matchedFile)}`);
