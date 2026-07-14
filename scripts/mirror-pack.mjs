/**
 * Gera o espelho da UI P38 em mirror/p38-ui/ (para colar em a29-erp/legacy/varejosync).
 *
 * Uso:
 *   npm run mirror:pack
 */
import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import {
  MIRROR_UI_DEST,
  MIRROR_UI_ROOT_DIRS,
  MIRROR_UI_ROOT_FILES,
  MIRROR_UI_SRC_DIRS,
  MIRROR_UI_SRC_FILES,
} from './mirror-manifest.mjs';
import { writeMirrorExportStamp } from './mirror-stamp.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEST = join(ROOT, MIRROR_UI_DEST);

function syncPath(rel) {
  const src = join(ROOT, rel);
  const dst = join(DEST, rel);
  if (!existsSync(src)) {
    console.log(`  [skip] ${rel} (não existe)`);
    return;
  }
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`  [ok]   ${rel}`);
}

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT }).trim();
  } catch {
    return '';
  }
}

console.log(`Origem:  ${ROOT}`);
console.log(`Destino: ${DEST}`);
console.log('');

mkdirSync(DEST, { recursive: true });

for (const f of MIRROR_UI_ROOT_FILES) {
  syncPath(f);
}
for (const d of MIRROR_UI_ROOT_DIRS) {
  syncPath(d);
}
for (const d of MIRROR_UI_SRC_DIRS) {
  syncPath(`src/${d}`);
}
for (const f of MIRROR_UI_SRC_FILES) {
  syncPath(`src/${f}`);
}

const sha = git('git rev-parse --short HEAD') || 'unknown';
const branch = git('git branch --show-current') || 'unknown';
const author = git('git config user.name') || 'unknown';
const date = new Date().toISOString();

const { stampPath, exportId, keyword } = writeMirrorExportStamp(DEST);

const snapshot = `# Registo do espelho P38 → A29
data_espelho=${date}
varejosync_commit_sha=${sha}
varejosync_branch=${branch}
autor=${author}
export_keyword=${keyword}
export_id=${exportId}
notas=Gerado por npm run mirror:pack (scripts/mirror-pack.mjs)
`;

writeFileSync(join(DEST, 'SNAPSHOT.txt'), snapshot, 'utf8');
console.log('');
console.log(`Carimbo:  ${relative(ROOT, stampPath)}`);
console.log(`          keyword=${keyword}  export_id=${exportId}`);
console.log(`Snapshot: ${relative(ROOT, join(DEST, 'SNAPSHOT.txt'))} (${sha})`);
console.log('');
console.log('Próximo passo: npm run mirror:push -- /caminho/para/a29-erp');
console.log('  (ou define A29_ERP_PATH no ambiente)');
