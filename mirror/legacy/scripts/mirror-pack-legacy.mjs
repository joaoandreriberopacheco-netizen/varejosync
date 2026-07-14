/**
 * Pacote completo mirror/legacy/ para colar em a29-erp/legacy/varejosync/
 *
 * Uso: npm run mirror:pack-legacy
 */
import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { writeMirrorExportStamp } from './mirror-stamp.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEST = join(ROOT, 'mirror/legacy');

const ROOT_FILES = [
  'index.html',
  'vite.config.js',
  'package.json',
  'package-lock.json',
  'tailwind.config.js',
  'postcss.config.js',
  'jsconfig.json',
  'eslint.config.js',
  'components.json',
  'vercel.json',
];

const ROOT_DIRS = ['src', 'public', 'base44', 'supabase', 'scripts'];

const REQUIRED_FUNCTIONS = [
  'gerarRelatorioCatalogoEstoque.js',
  'calcularIEP.js',
  'atualizarMetasEstoque.js',
  'limparAbcdJobProdutos.js',
];

function syncPath(rel) {
  const src = join(ROOT, rel);
  if (!existsSync(src)) {
    console.log(`  [skip] ${rel}`);
    return false;
  }
  const dst = join(DEST, rel);
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`  [ok]   ${rel}`);
  return true;
}

function collectFunctionImports() {
  const names = new Set();
  const re = /@\/functions\/([a-zA-Z0-9_]+)/g;

  function scanFile(file) {
    const text = readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(text)) !== null) names.add(m[1]);
  }

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        walk(p);
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        scanFile(p);
      }
    }
  }

  walk(join(DEST, 'src'));
  return [...names].sort();
}

function verifyFunctions() {
  const fnDir = join(DEST, 'src/functions');
  const missing = [];
  const imports = collectFunctionImports();

  for (const name of imports) {
    const file = join(fnDir, `${name}.js`);
    if (!existsSync(file)) missing.push(name);
  }

  for (const file of REQUIRED_FUNCTIONS) {
    if (!existsSync(join(fnDir, file))) {
      missing.push(file.replace(/\.js$/, ''));
    }
  }

  if (missing.length) {
    console.error('\n[erro] Funções em falta em mirror/legacy/src/functions/:');
    for (const m of [...new Set(missing)]) console.error(`  - ${m}.js`);
    process.exit(1);
  }

  const count = readdirSync(fnDir).filter((f) => f.endsWith('.js')).length;
  console.log(`\n[ok] ${imports.length} imports @/functions/ → ${count} ficheiros em src/functions/`);
  for (const f of REQUIRED_FUNCTIONS) {
    console.log(`  [ok]   src/functions/${f}`);
  }
  return count;
}

function writeLegacyGitignore() {
  writeFileSync(
    join(DEST, '.gitignore'),
    '# Gerado por mirror:pack-legacy — não versionar artefactos locais\nnode_modules/\ndist/\ndist-ssr/\n.env\n.env.*\n',
    'utf8'
  );
}

function writeReadme() {
  const text = `# mirror/legacy — pacote para a29-erp/legacy/varejosync/

Cópia fiel do VarejoSync (branch main no momento do pack).

## Colar no A29

Substituir o conteúdo de \`a29-erp/legacy/varejosync/\` por esta pasta (exceto \`.env*\` do A29).

## Build validado

Gerado por \`npm run mirror:pack-legacy\` com \`npm run build:raw\` verde nesta pasta.

## Carimbos

Ver também \`mirror/live/\` (mirrorpass, VAREJO_UI_SYNC.stamp).
`;
  writeFileSync(join(DEST, 'README.md'), text, 'utf8');
}

console.log(`Origem:  ${ROOT}`);
console.log(`Destino: ${DEST}\n`);

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

for (const f of ROOT_FILES) syncPath(f);
for (const d of ROOT_DIRS) syncPath(d);

writeLegacyGitignore();
writeReadme();

const fnCount = verifyFunctions();

const stamp = writeMirrorExportStamp(DEST);

console.log(`\nCarimbo live: mirrorpass=${stamp.mirrorPass}`);
console.log(`export_id: ${stamp.exportId}`);
console.log(`Próximo: cd mirror/legacy && npm ci && npm run build:raw`);

export { DEST, fnCount };
