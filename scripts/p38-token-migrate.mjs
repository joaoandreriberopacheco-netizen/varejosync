#!/usr/bin/env node
/**
 * Migra classes gray/slate legadas para tokens P38 (shadcn).
 * Uso: node scripts/p38-token-migrate.mjs [glob roots...]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const REPLACEMENTS = [
  ['bg-gray-50 dark:bg-gray-900', 'bg-background'],
  ['bg-slate-50 dark:bg-slate-950', 'bg-background'],
  ['bg-white dark:bg-gray-900', 'bg-card'],
  ['bg-white dark:bg-gray-800', 'bg-card'],
  ['dark:bg-slate-900', 'dark:bg-card'],
  ['dark:bg-slate-800', 'dark:bg-muted'],
  ['text-gray-900 dark:text-white', 'text-foreground'],
  ['text-gray-800 dark:text-gray-200', 'text-foreground'],
  ['text-gray-800 dark:text-white', 'text-foreground'],
  ['text-gray-700 dark:text-gray-300', 'text-foreground/90'],
  ['text-gray-700 dark:text-gray-200', 'text-foreground/90'],
  ['text-gray-600 dark:text-gray-400', 'text-muted-foreground'],
  ['text-gray-600 dark:text-gray-300', 'text-muted-foreground'],
  ['text-gray-500 dark:text-gray-400', 'text-muted-foreground'],
  ['text-gray-400 dark:text-gray-500', 'text-muted-foreground'],
  ['text-gray-400 dark:text-gray-600', 'text-muted-foreground'],
  ['border-gray-100 dark:border-gray-800', 'border-border/40'],
  ['border-gray-100 dark:border-gray-700', 'border-border/40'],
  ['border-gray-200 dark:border-gray-800', 'border-border/40'],
  ['border-gray-200 dark:border-gray-700', 'border-border/40'],
  ['border-gray-200 dark:border-gray-600', 'border-border/40'],
  ['bg-gray-100 dark:bg-gray-800', 'bg-muted'],
  ['bg-gray-100 dark:bg-gray-700', 'bg-muted'],
  ['bg-gray-50 dark:bg-gray-800', 'bg-muted/50'],
  ['hover:bg-gray-100 dark:hover:bg-gray-800', 'hover:bg-muted'],
  ['hover:bg-gray-100 dark:hover:bg-gray-700', 'hover:bg-muted'],
  ['hover:bg-gray-50 dark:hover:bg-gray-700', 'hover:bg-muted'],
  ['bg-gray-200 dark:bg-gray-700', 'bg-muted'],
  ['bg-gray-50 dark:bg-gray-800', 'bg-muted/50'],
  ['dark:bg-gray-900', 'dark:bg-background'],
  ['dark:bg-gray-800', 'dark:bg-muted'],
  ['dark:bg-gray-700', 'dark:bg-muted'],
  ['bg-gray-50', 'bg-muted/40'],
  ['bg-white dark:bg-gray-950', 'bg-card'],
  ['text-gray-900', 'text-foreground'],
  ['text-gray-700', 'text-foreground/90'],
  ['text-gray-600', 'text-muted-foreground'],
  ['text-gray-500', 'text-muted-foreground'],
  ['text-gray-400', 'text-muted-foreground'],
  ['border-gray-200', 'border-border/40'],
  ['border-gray-100', 'border-border/40'],
  ['hover:bg-gray-50 dark:hover:bg-gray-800/40', 'hover:bg-muted/40'],
  ['hover:bg-gray-50', 'hover:bg-muted/40'],
  ['bg-white dark:bg-gray-900', 'bg-card'],
  ['sticky left-0 z-10 bg-white dark:bg-gray-900', 'sticky left-0 z-10 bg-card'],
  ['bg-gray-50 dark:bg-background', 'bg-background'],
  ['text-gray-800 dark:text-foreground', 'text-foreground'],
  ['dark:text-gray-200', 'dark:text-foreground'],
  ['dark:text-gray-300', 'dark:text-foreground/90'],
  ['dark:text-gray-400', 'dark:text-muted-foreground'],
  ['dark:text-gray-500', 'dark:text-muted-foreground'],
  ['dark:border-gray-800', 'dark:border-border/40'],
  ['dark:border-gray-700', 'dark:border-border/40'],
  ['dark:hover:bg-gray-800', 'dark:hover:bg-muted'],
  ['dark:bg-gray-800/40', 'dark:bg-muted/40'],
  ['bg-gray-800', 'bg-primary'],
  ['hover:bg-gray-700', 'hover:bg-primary/90'],
];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const SKIP_FILES = /PDVCaixa\.jsx$|PDVVendedor\.jsx$|PDVSupermercado\.jsx$|AutoAtendimento\.jsx$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(jsx|tsx|js|ts)$/.test(name) && !SKIP_FILES.test(name)) out.push(full);
  }
  return out;
}

const defaultRoots = [
  'src/pages',
  'src/components/financeiro',
  'src/components/agefin',
  'src/components/compras',
  'src/components/estoque',
  'src/components/consumo-interno',
  'src/components/terceiros',
  'src/components/relatorios',
  'src/components/config',
  'src/paiol/components/dashboard',
  'src/components/ui/table',
];

const args = process.argv.slice(2);
const roots = args.length ? args : defaultRoots;

let filesChanged = 0;
let totalReplacements = 0;

for (const rel of roots) {
  const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
  for (const file of walk(abs)) {
    let content = fs.readFileSync(file, 'utf8');
    const before = content;
    for (const [from, to] of REPLACEMENTS) {
      if (content.includes(from)) {
        const parts = content.split(from);
        const n = parts.length - 1;
        content = parts.join(to);
        totalReplacements += n;
      }
    }
    if (content !== before) {
      fs.writeFileSync(file, content);
      filesChanged++;
    }
  }
}

console.log(`p38-token-migrate: ${filesChanged} ficheiros, ~${totalReplacements} substituições`);
