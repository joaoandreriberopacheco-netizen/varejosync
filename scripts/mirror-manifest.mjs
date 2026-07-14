/**
 * Inventário do espelho P38 (UI) → a29-erp/legacy/varejosync
 * Usado por mirror-pack.mjs e mirror-push-a29.mjs
 */
export const MIRROR_UI_DEST = 'mirror/p38-ui';

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
