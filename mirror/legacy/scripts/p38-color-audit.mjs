#!/usr/bin/env node
/**
 * Audita classes Tailwind gray/slate legadas e opcionalmente corrige para tokens P38.
 *
 *   node scripts/p38-color-audit.mjs              # relatório no stdout
 *   node scripts/p38-color-audit.mjs --fix        # aplica correções
 *   node scripts/p38-color-audit.mjs --fix --include-pdv  # inclui PDV fullscreen
 *   node scripts/p38-color-audit.mjs --json       # JSON para CI
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const SKIP_FILE_RE =
  /PDVCaixa\.jsx$|PDVVendedor\.jsx$|PDVSupermercado\.jsx$|AutoAtendimento\.jsx$/;
const SKIP_PATH_RE = /globals\.css$|p38ShellColors|p38ThemeSurfaces\.js$/;

/** Ordem: strings mais longas / específicas primeiro */
const LITERAL_REPLACEMENTS = [
  // Chips / pills selecionados
  [
    'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900',
    'bg-primary text-primary-foreground',
  ],
  ['bg-slate-900 text-white dark:text-slate-900', 'bg-primary text-primary-foreground'],
  ['dark:bg-slate-200 dark:text-slate-900', 'dark:bg-primary dark:text-primary-foreground'],
  // Tabs / estados ativos
  ['data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700', 'data-[state=active]:bg-card'],
  ['data-[state=active]:bg-white', 'data-[state=active]:bg-card'],
  ['dark:data-[state=active]:bg-gray-700', 'dark:data-[state=active]:bg-muted'],
  ['dark:hover:bg-gray-900/50', 'dark:hover:bg-muted/50'],
  // Botões neutros escuros
  ['bg-gray-700 hover:bg-gray-600', 'bg-primary hover:bg-primary/90 text-primary-foreground'],
  ['bg-gray-800 hover:bg-gray-700', 'bg-primary hover:bg-primary/90 text-primary-foreground'],
  ['h-8 w-8 bg-gray-700 hover:bg-gray-600', 'h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground'],
  // Badges
  ['bg-gray-100 text-gray-800', 'bg-muted text-foreground'],
  ['className: "bg-gray-100 text-gray-800"', 'className: "bg-muted text-foreground"'],
  ["className: 'bg-gray-100 text-gray-800'", "className: 'bg-muted text-foreground'"],
  ['className: \'bg-gray-100 text-gray-800\'', 'className: \'bg-muted text-foreground\''],
  // Pares comuns já parcialmente migrados
  ['bg-gray-100 dark:bg-background', 'bg-muted dark:bg-muted'],
  ['dark:text-gray-100', 'dark:text-foreground'],
  ['text-gray-800 dark:text-foreground', 'text-foreground'],
  ['placeholder:text-gray-400', 'placeholder:text-muted-foreground'],
  ['divide-gray-200', 'divide-border/40'],
  ['divide-gray-100', 'divide-border/40'],
  ['ring-gray-200', 'ring-border/40'],
  ['ring-gray-300', 'ring-border/40'],
  ['shadow-gray-200', 'shadow-border/20'],
  ['from-gray-50', 'from-muted/40'],
  ['to-gray-100', 'to-muted'],
  ['via-gray-100', 'via-muted'],
];

/**
 * Substitui utilitários isolados gray/slate por token P38.
 * Não mexe em green/red/amber/blue nem em hex.
 */
/** gray/slate com opacidade → token com mesma opacidade */
function replaceOpacityUtilities(content) {
  return content
    .replace(
      /\b(bg|text|border|ring)-(?:gray|slate)-(50|100|200|300|400|500|600|700|800|900|950)(\/\d+)\b/g,
      (_, prop, _shade, opacity) => {
        const map = {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          border: 'border-border',
          ring: 'ring-border',
        };
        const base = map[prop] || 'bg-muted';
        return `${base}${opacity}`;
      }
    )
    .replace(/\bfrom-(?:gray|slate)-\d+(?:\/\d+)?\b/g, 'from-muted/40')
    .replace(/\bto-(?:gray|slate)-\d+(?:\/\d+)?\b/g, 'to-muted/60')
    .replace(/\bvia-(?:gray|slate)-\d+(?:\/\d+)?\b/g, 'via-muted/50');
}

function replaceUtilityTokens(content) {
  let out = content;
  out = replaceOpacityUtilities(out);

  const rules = [
    // backgrounds
    [/\bbg-gray-950\b/g, 'bg-background'],
    [/\bbg-gray-900\b/g, 'bg-background'],
    [/\bbg-slate-950\b/g, 'bg-background'],
    [/\bbg-slate-900\b/g, 'bg-primary'],
    [/\bbg-gray-800\b/g, 'bg-card'],
    [/\bbg-slate-800\b/g, 'bg-card'],
    [/\bbg-gray-700\b/g, 'bg-muted'],
    [/\bbg-slate-700\b/g, 'bg-muted'],
    [/\bbg-gray-600\b/g, 'bg-muted'],
    [/\bbg-gray-500\b/g, 'bg-muted-foreground/30'],
    [/\bbg-gray-400\b/g, 'bg-muted-foreground/40'],
    [/\bbg-gray-300\b/g, 'bg-muted'],
    [/\bbg-gray-200\b/g, 'bg-muted'],
    [/\bbg-gray-100\b/g, 'bg-muted'],
    [/\bbg-gray-50\b/g, 'bg-muted/40'],
    [/\bbg-slate-200\b/g, 'bg-muted'],
    [/\bbg-slate-100\b/g, 'bg-muted'],
    [/\bbg-slate-50\b/g, 'bg-muted/40'],
    [/\bbg-white\b/g, 'bg-card'],
    // text
    [/\btext-gray-950\b/g, 'text-foreground'],
    [/\btext-gray-900\b/g, 'text-foreground'],
    [/\btext-gray-800\b/g, 'text-foreground'],
    [/\btext-gray-700\b/g, 'text-foreground/90'],
    [/\btext-gray-600\b/g, 'text-muted-foreground'],
    [/\btext-gray-500\b/g, 'text-muted-foreground'],
    [/\btext-gray-400\b/g, 'text-muted-foreground'],
    [/\btext-gray-300\b/g, 'text-muted-foreground'],
    [/\btext-gray-200\b/g, 'text-muted-foreground'],
    [/\btext-gray-100\b/g, 'text-foreground'],
    [/\btext-slate-900\b/g, 'text-foreground'],
    [/\btext-slate-800\b/g, 'text-foreground'],
    [/\btext-slate-700\b/g, 'text-foreground/90'],
    [/\btext-slate-600\b/g, 'text-muted-foreground'],
    [/\btext-slate-500\b/g, 'text-muted-foreground'],
    [/\btext-slate-400\b/g, 'text-muted-foreground'],
    // borders
    [/\bborder-gray-900\b/g, 'border-border/40'],
    [/\bborder-gray-800\b/g, 'border-border/40'],
    [/\bborder-gray-700\b/g, 'border-border/40'],
    [/\bborder-gray-600\b/g, 'border-border/40'],
    [/\bborder-gray-500\b/g, 'border-border/40'],
    [/\bborder-gray-400\b/g, 'border-border/40'],
    [/\bborder-gray-300\b/g, 'border-border/40'],
    [/\bborder-gray-200\b/g, 'border-border/40'],
    [/\bborder-gray-100\b/g, 'border-border/40'],
    [/\bborder-slate-\d+\b/g, 'border-border/40'],
    // hover / dark variants
    [/\bhover:bg-gray-900\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-800\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-700\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-600\b/g, 'hover:bg-primary/90'],
    [/\bhover:bg-gray-100\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-50\b/g, 'hover:bg-muted/40'],
    [/\bdark:bg-gray-950\b/g, 'dark:bg-background'],
    [/\bdark:bg-gray-900\b/g, 'dark:bg-background'],
    [/\bdark:bg-gray-800\b/g, 'dark:bg-muted'],
    [/\bdark:bg-gray-700\b/g, 'dark:bg-muted'],
    [/\bdark:text-gray-100\b/g, 'dark:text-foreground'],
    [/\bdark:text-gray-200\b/g, 'dark:text-foreground'],
    [/\bdark:text-gray-300\b/g, 'dark:text-muted-foreground'],
    [/\bdark:text-gray-400\b/g, 'dark:text-muted-foreground'],
    [/\bdark:text-gray-500\b/g, 'dark:text-muted-foreground'],
    [/\bdark:border-gray-800\b/g, 'dark:border-border/40'],
    [/\bdark:border-gray-700\b/g, 'dark:border-border/40'],
    [/\bdark:hover:bg-gray-800\b/g, 'dark:hover:bg-muted'],
    [/\bdark:hover:bg-gray-700\b/g, 'dark:hover:bg-muted'],
    [/\bdark:hover:bg-gray-600\b/g, 'dark:hover:bg-muted'],
    [/\bdark:hover:bg-gray-100\b/g, 'dark:hover:bg-muted'],
    [/\bdark:bg-gray-950\b/g, 'dark:bg-background'],
    [/\bdark:bg-gray-200\b/g, 'dark:bg-muted'],
    [/\bdark:bg-gray-100\b/g, 'dark:bg-muted'],
    [/\bdark:bg-gray-600\b/g, 'dark:bg-muted'],
    [/\bdark:text-gray-100\b/g, 'dark:text-foreground'],
    [/\bdark:border-gray-600\b/g, 'dark:border-border/40'],
    [/\bdark:border-slate-700\b/g, 'dark:border-border/40'],
    [/\bborder-gray-300\b/g, 'border-border/40'],
    [/\bborder-gray-50\b/g, 'border-border/30'],
    [/\bhover:bg-gray-200\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-100\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-900\b/g, 'hover:bg-muted'],
    [/\bhover:bg-gray-300\b/g, 'hover:bg-muted'],
    [/\bhover:bg-slate-200\b/g, 'hover:bg-muted'],
    [/\bdark:hover:bg-slate-700\b/g, 'dark:hover:bg-muted'],
    [/\bdark:bg-slate-950\b/g, 'dark:bg-background'],
    [/\btext-slate-200\b/g, 'text-muted-foreground'],
    [/\btext-slate-400\b/g, 'text-muted-foreground'],
    [/\btext-slate-100\b/g, 'text-foreground'],
    [/\btext-slate-50\b/g, 'text-muted-foreground'],
    [/\btext-slate-300\b/g, 'text-muted-foreground'],
    [/\btext-slate-950\b/g, 'text-foreground'],
    [/\bdark:text-slate-300\b/g, 'dark:text-muted-foreground'],
    [/\bhover:bg-slate-600\b/g, 'hover:bg-muted'],
    [/\bplaceholder-gray-500\b/g, 'placeholder:text-muted-foreground'],
    [/\bplaceholder-gray-400\b/g, 'placeholder:text-muted-foreground'],
    [/\bplaceholder-gray-300\b/g, 'placeholder:text-muted-foreground'],
    [/\bdark:placeholder-gray-500\b/g, 'dark:placeholder:text-muted-foreground'],
    [/\bdark:placeholder-gray-400\b/g, 'dark:placeholder:text-muted-foreground'],
    [/\bdivide-gray-50\b/g, 'divide-border/30'],
    [/\bdivide-gray-100\b/g, 'divide-border/40'],
    [/\bdark:divide-gray-800\b/g, 'dark:divide-border/40'],
    [/\bdark:divide-gray-700\b/g, 'dark:divide-border/40'],
    [/\bring-gray-900\b/g, 'ring-border/40'],
    [/\bring-gray-100\b/g, 'ring-border/30'],
    [/\bdark:ring-gray-700\b/g, 'dark:ring-border/40'],
    [/\bdark:ring-gray-600\b/g, 'dark:ring-border/40'],
    [/\bdark:ring-gray-500\b/g, 'dark:ring-border/40'],
    [/\bdark:hover:ring-gray-700\b/g, 'dark:hover:ring-border/50'],
    [/\bfocus:ring-gray-400\b/g, 'focus:ring-ring'],
    [/\bfocus:ring-gray-500\b/g, 'focus:ring-ring'],
    [/\bfocus:ring-gray-600\b/g, 'focus:ring-ring'],
    [/\bfocus:ring-1 focus:ring-gray-400\b/g, 'focus:ring-1 focus:ring-ring'],
    [/\bfocus-visible:ring-gray-400\b/g, 'focus-visible:ring-ring'],
    [/\bdark:focus:ring-gray-500\b/g, 'dark:focus:ring-ring'],
    [/\bdark:focus:ring-gray-600\b/g, 'dark:focus:ring-ring'],
    [/\bring-gray-400\b/g, 'ring-ring'],
    [/\bdark:text-gray-50\b/g, 'dark:text-foreground'],
    [/\bdark:focus:ring-gray-700\b/g, 'dark:focus:ring-ring'],
    [/\bdark:focus:ring-gray-600\b/g, 'dark:focus:ring-ring'],
    [/\bdark:focus-visible:ring-gray-700\b/g, 'dark:focus-visible:ring-ring'],
    [/\bfocus-visible:ring-gray-700\b/g, 'focus-visible:ring-ring'],
    [/\bfocus-visible:ring-gray-400\b/g, 'focus-visible:ring-ring'],
    // Spinners (anel superior)
    [/\bborder-t-gray-950\b/g, 'border-t-foreground'],
    [/\bborder-t-gray-900\b/g, 'border-t-foreground'],
    [/\bborder-t-gray-800\b/g, 'border-t-primary'],
    [/\bborder-t-gray-700\b/g, 'border-t-primary'],
    [/\bborder-t-gray-600\b/g, 'border-t-primary'],
    [/\bborder-t-gray-500\b/g, 'border-t-muted-foreground'],
    [/\bborder-t-gray-400\b/g, 'border-t-muted-foreground'],
    [/\bborder-t-gray-300\b/g, 'border-t-muted-foreground'],
    [/\bborder-t-slate-900\b/g, 'border-t-foreground'],
    [/\bborder-t-slate-800\b/g, 'border-t-foreground'],
    [/\bborder-t-slate-700\b/g, 'border-t-primary'],
    [/\bborder-t-slate-600\b/g, 'border-t-primary'],
    [/\bborder-t-slate-500\b/g, 'border-t-muted-foreground'],
    [/\bdark:border-t-gray-200\b/g, 'dark:border-t-foreground'],
    [/\bdark:border-t-gray-300\b/g, 'dark:border-t-foreground'],
    [/\bdark:border-t-gray-400\b/g, 'dark:border-t-muted-foreground'],
    [/\bdark:border-t-slate-200\b/g, 'dark:border-t-foreground'],
    // Bordas laterais / accent / fill
    [/\bborder-l-gray-\d+\b/g, 'border-l-border'],
    [/\bdark:border-l-gray-\d+\b/g, 'dark:border-l-border'],
    [/\baccent-gray-\d+\b/g, 'accent-primary'],
    [/\bfill-gray-\d+\b/g, 'fill-muted-foreground'],
    [/\bdark:fill-gray-\d+\b/g, 'dark:fill-muted-foreground'],
    [/\bdark:group-hover:text-gray-300\b/g, 'dark:group-hover:text-muted-foreground'],
    [/\bfocus:ring-gray-600\b/g, 'focus:ring-ring'],
    [/\bfocus:ring-gray-500\b/g, 'focus:ring-ring'],
    [/\bfocus:ring-slate-500\b/g, 'focus:ring-ring'],
    [/\bplaceholder:text-gray-300\b/g, 'placeholder:text-muted-foreground'],
    [/\bdark:group-hover:text-gray-300\b/g, 'dark:group-hover:text-muted-foreground'],
    [/\bdata-\[state=checked\]:bg-gray-700\b/g, 'data-[state=checked]:bg-primary'],
    [/\bdark:data-\[state=checked\]:bg-gray-300\b/g, 'dark:data-[state=checked]:bg-primary'],
    [
      'data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700',
      'data-[state=active]:bg-muted dark:data-[state=active]:bg-muted',
    ],
    ['data-[state=active]:bg-gray-100', 'data-[state=active]:bg-muted'],
    ['dark:data-[state=active]:bg-gray-700', 'dark:data-[state=active]:bg-muted'],
  ];

  for (const [from, to] of LITERAL_REPLACEMENTS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  for (const [re, to] of rules) {
    out = out.replace(re, to);
  }
  return out;
}

const GRAY_SLATE_RE =
  /(?:^|[\s"'`{,])(?:(?:hover:|dark:|dark:hover:|dark:focus:|dark:focus-visible:|dark:group-hover:|focus:|focus-visible:|placeholder:)?(?:bg|text|border(?:-[tblr])?|ring|divide|from|to|via|placeholder|accent|fill)-(?:gray|slate)-\d+(?:\/\d+)?|placeholder-gray-\d+|divide-gray-\d+|ring-gray-\d+|ring-slate-\d+|data-\[[^\]]+\]:bg-gray-\d+|dark:data-\[[^\]]+\]:bg-gray-\d+)/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(jsx|tsx|js|ts|css)$/.test(name)) out.push(full);
  }
  return out;
}

function rel(p) {
  return path.relative(root, p);
}

function scanContent(content) {
  const matches = content.match(GRAY_SLATE_RE) || [];
  return [...new Set(matches.map((m) => m.trim()))];
}

function scanFile(filePath) {
  return scanContent(fs.readFileSync(filePath, 'utf8'));
}

const fix = process.argv.includes('--fix');
const asJson = process.argv.includes('--json');
const includePdv = process.argv.includes('--include-pdv');

function shouldSkipFile(filePath) {
  if (SKIP_PATH_RE.test(filePath)) return true;
  if (!includePdv && SKIP_FILE_RE.test(filePath)) return true;
  return false;
}

const srcRoot = path.join(root, 'src');
const files = walk(srcRoot).filter((f) => !shouldSkipFile(f));

const report = {
  scannedFiles: files.length,
  filesWithLegacy: [],
  uniqueTokens: new Map(),
  fixedFiles: 0,
  skippedPdv: [],
};

if (!includePdv) {
  for (const file of walk(srcRoot)) {
    if (SKIP_FILE_RE.test(file)) {
      const n = scanFile(file).length;
      if (n) report.skippedPdv.push({ file: rel(file), matches: n });
    }
  }
}

for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const tokensBefore = scanFile(file);
  if (tokensBefore.length === 0) continue;

  tokensBefore.forEach((t) => {
    report.uniqueTokens.set(t, (report.uniqueTokens.get(t) || 0) + 1);
  });

  if (fix) {
    const after = replaceUtilityTokens(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      report.fixedFiles++;
    }
    const tokensAfter = scanContent(after);
    report.filesWithLegacy.push({
      file: rel(file),
      before: tokensBefore.length,
      after: tokensAfter.length,
      remaining: tokensAfter.slice(0, 8),
    });
  } else {
    report.filesWithLegacy.push({
      file: rel(file),
      count: tokensBefore.length,
      samples: tokensBefore.slice(0, 6),
    });
  }
}

report.filesWithLegacy.sort((a, b) => (b.before ?? b.count) - (a.before ?? a.count));

if (asJson) {
  console.log(
    JSON.stringify(
      {
        ...report,
        uniqueTokens: Object.fromEntries(
          [...report.uniqueTokens.entries()].sort((a, b) => b[1] - a[1])
        ),
      },
      null,
      2
    )
  );
} else {
  console.log(`\n=== P38 color audit ${fix ? '(fix applied)' : '(scan only)'} ===\n`);
  console.log(`Ficheiros analisados: ${report.scannedFiles}`);
  console.log(`Com gray/slate legado: ${report.filesWithLegacy.length}`);
  if (fix) console.log(`Ficheiros alterados: ${report.fixedFiles}`);

  const topTokens = [...report.uniqueTokens.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);
  if (topTokens.length) {
    console.log('\nTop tokens ainda encontrados (antes do fix ou resíduos):');
    topTokens.forEach(([t, n]) => console.log(`  ${n}x  ${t}`));
  }

  console.log('\nTop ficheiros:');
  report.filesWithLegacy.slice(0, 20).forEach((row) => {
    if (fix) {
      console.log(
        `  ${row.file}  ${row.before} → ${row.after}${row.remaining?.length ? `  ex: ${row.remaining.join(', ')}` : ''}`
      );
    } else {
      console.log(`  ${row.file}  (${row.count})  ${row.samples?.join(' ')}`);
    }
  });

  if (!includePdv && report.skippedPdv.length) {
    console.log(`\nPDV fullscreen (não alterados; use --include-pdv): ${report.skippedPdv.length} ficheiros`);
  }
  console.log('');
}

if (!fix && report.filesWithLegacy.length > 0) {
  process.exitCode = 0;
}
