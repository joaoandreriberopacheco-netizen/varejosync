/**
 * Copia mirror/p38-ui/ para a29-erp/legacy/varejosync/
 *
 * Uso:
 *   npm run mirror:push -- ../a29-erp
 *   npm run mirror:push -- ../a29-erp --preserve-theme   (defeito)
 *   npm run mirror:push -- ../a29-erp --no-preserve-theme
 *   A29_ERP_PATH=../a29-erp npm run mirror:push
 *
 * MIRROR_PRESERVE_PATHS=tailwind.config.js,src/globals.css  (extra, vírgulas)
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  A29_LEGACY_REL,
  A29_THEME_PRESERVE_PATHS,
  MIRROR_EXCLUDE_NAMES,
  MIRROR_UI_DEST,
} from './mirror-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, MIRROR_UI_DEST);

const argv = process.argv.slice(2);
const preserveTheme = !argv.includes('--no-preserve-theme');
const a29Root = (argv.find((a) => !a.startsWith('--')) || process.env.A29_ERP_PATH || '').trim();

const extraPreserve = (process.env.MIRROR_PRESERVE_PATHS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const preservePaths = preserveTheme
  ? [...new Set([...A29_THEME_PRESERVE_PATHS, ...extraPreserve])]
  : [];

if (!a29Root) {
  console.error('Indica o caminho do monorepo a29-erp:');
  console.error('  npm run mirror:push -- ../a29-erp');
  console.error('  A29_ERP_PATH=../a29-erp npm run mirror:push');
  process.exit(1);
}

const DEST = join(a29Root, A29_LEGACY_REL);

if (!existsSync(SRC)) {
  console.error(`Espelho não encontrado: ${SRC}`);
  console.error('Corre primeiro: npm run mirror:pack');
  process.exit(1);
}

if (!existsSync(join(SRC, 'src', 'App.jsx'))) {
  console.error('O espelho parece vazio (falta src/App.jsx). Corre: npm run mirror:pack');
  process.exit(1);
}

function shouldSkip(name) {
  return MIRROR_EXCLUDE_NAMES.has(name) || name.startsWith('.env');
}

function relPreservePath(rel) {
  return preservePaths.includes(rel.replace(/\\/g, '/'));
}

function backupPreservedFiles() {
  const backupRoot = mkdtempSync(join(tmpdir(), 'mirror-a29-preserve-'));
  const backed = [];

  for (const rel of preservePaths) {
    const srcPath = join(DEST, rel);
    if (!existsSync(srcPath)) continue;
    const backupPath = join(backupRoot, rel);
    mkdirSync(dirname(backupPath), { recursive: true });
    cpSync(srcPath, backupPath, { recursive: true });
    backed.push(rel);
  }

  return { backupRoot, backed };
}

function restorePreservedFiles(backupRoot, backed) {
  for (const rel of backed) {
    const from = join(backupRoot, rel);
    const to = join(DEST, rel);
    mkdirSync(dirname(to), { recursive: true });
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
    console.log(`  [keep] ${rel} (paleta A29)`);
  }
  rmSync(backupRoot, { recursive: true, force: true });
}

function syncDir(srcDir, dstDir, relBase = '') {
  mkdirSync(dstDir, { recursive: true });

  const entries = readdirSync(srcDir, { withFileTypes: true });
  const dstNames = existsSync(dstDir) ? new Set(readdirSync(dstDir)) : new Set();

  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;

    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);

    if (entry.isDirectory()) {
      syncDir(srcPath, dstPath, rel);
      dstNames.delete(entry.name);
    } else if (entry.isFile()) {
      if (relPreservePath(rel)) continue;
      mkdirSync(dirname(dstPath), { recursive: true });
      cpSync(srcPath, dstPath);
      dstNames.delete(entry.name);
    }
  }

  for (const orphan of dstNames) {
    if (shouldSkip(orphan)) continue;
    const orphanRel = relBase ? `${relBase}/${orphan}` : orphan;
    if (relPreservePath(orphanRel)) continue;
    const orphanPath = join(dstDir, orphan);
    rmSync(orphanPath, { recursive: true, force: true });
  }
}

console.log(`Origem:  ${SRC}`);
console.log(`Destino: ${DEST}`);
if (preserveTheme) {
  console.log(`Modo:    preservar paleta A29 (${preservePaths.length} ficheiro(s))`);
}
console.log('');

const { backupRoot, backed } = backupPreservedFiles();
syncDir(SRC, DEST);
if (backed.length > 0) {
  console.log('');
  restorePreservedFiles(backupRoot, backed);
} else if (preserveTheme) {
  console.log('(Destino sem ficheiros de tema anteriores — paleta VarejoSync aplicada.)');
  rmSync(backupRoot, { recursive: true, force: true });
}

console.log('');
console.log('Feito. No a29-erp: npm install && npm run dev (conforme README do monorepo).');
