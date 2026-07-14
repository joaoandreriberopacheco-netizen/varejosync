/**
 * Inventário do espelho P38 (UI) → a29-erp/legacy/varejosync
 * Usado por mirror-pack.mjs e mirror-push-a29.mjs
 */
export const MIRROR_UI_DEST = 'mirror/p38-ui';

/** Palavra-chave para grep/auditoria no A29 */
export const MIRROR_EXPORT_KEYWORD = 'VAREJO_UI_SYNC';

/** Ficheiro-carimbo na raiz do espelho (legacy/varejosync no A29) */
export const MIRROR_EXPORT_STAMP_FILE = 'VAREJO_UI_SYNC.stamp';

/** Ficheiros na raiz do app Vite */
export const MIRROR_UI_ROOT_FILES = [
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'components.json',
  'jsconfig.json',
];

/** Pastas em src/ */
export const MIRROR_UI_SRC_DIRS = [
  'pages',
  'components',
  'lib',
  'hooks',
  'api',
  'integrations',
  'config',
  'entities',
  'features',
  'styles',
  'utils',
  'assets',
  'paiol',
];

/** Ficheiros soltos em src/ */
export const MIRROR_UI_SRC_FILES = [
  'App.jsx',
  'App.css',
  'Layout.jsx',
  'main.jsx',
  'pages.config.js',
  'globals.css',
  'index.css',
];

/** Pastas na raiz (além de public) */
export const MIRROR_UI_ROOT_DIRS = ['public'];

/** Destino relativo no monorepo a29-erp */
export const A29_LEGACY_REL = 'legacy/varejosync';

/**
 * Ficheiros de tema/paleta do A29 — mantidos no destino com --preserve-theme (defeito).
 * UI (páginas, componentes, layout) actualiza-se; cores/tokens do A29 ficam.
 */
export const A29_THEME_PRESERVE_PATHS = [
  'tailwind.config.js',
  'src/globals.css',
  'src/index.css',
  'src/styles/p38-identity.css',
];

/** Nunca copiar para o espelho */
export const MIRROR_EXCLUDE_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.production.local',
]);
