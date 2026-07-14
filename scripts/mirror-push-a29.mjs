/**
 * Copia mirror/p38-ui/ para a29-erp/legacy/varejosync/
 *
 * Uso:
 *   npm run mirror:push -- ../a29-erp
 *   A29_ERP_PATH=../a29-erp npm run mirror:push
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { A29_LEGACY_REL, MIRROR_EXCLUDE_NAMES, MIRROR_UI_DEST } from './mirror-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, MIRROR_UI_DEST);

const a29Root = (process.argv[2] || process.env.A29_ERP_PATH || '').trim();
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

function syncDir(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });

  const entries = readdirSync(srcDir, { withFileTypes: true });
  const dstNames = new Set(readdirSync(dstDir));

  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;

    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);

    if (entry.isDirectory()) {
      syncDir(srcPath, dstPath);
      dstNames.delete(entry.name);
    } else if (entry.isFile()) {
      mkdirSync(dirname(dstPath), { recursive: true });
      cpSync(srcPath, dstPath);
      dstNames.delete(entry.name);
    }
  }

  for (const orphan of dstNames) {
    if (shouldSkip(orphan)) continue;
    const orphanPath = join(dstDir, orphan);
    rmSync(orphanPath, { recursive: true, force: true });
  }
}

console.log(`Origem:  ${SRC}`);
console.log(`Destino: ${DEST}`);
console.log('');

syncDir(SRC, DEST);

console.log('Feito. No a29-erp: npm install && npm run dev (conforme README do monorepo).');
