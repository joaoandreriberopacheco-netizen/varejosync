/**
 * Extracção AST (Babel) — cataloga widgets relevantes por âmbito de função
 * (ex.: CAT-PG-Compras.PedidosCompraTab.Button.1)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

function normalizeToSrcPath(fileLabel) {
  const normalized = String(fileLabel || '').replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/src/');
  if (idx >= 0) return `src/${normalized.slice(idx + 5)}`;
  if (normalized.startsWith('src/')) return normalized;
  return normalized;
}

const RELEVANT_BASE = new Set([
  'Button',
  'button',
  'Input',
  'input',
  'Textarea',
  'textarea',
  'Select',
  'select',
  'SelectTrigger',
  'SelectValue',
  'SelectItem',
  'SelectContent',
  'Label',
  'label',
  'a',
  'Dialog',
  'DialogTitle',
  'DialogContent',
  'DialogHeader',
  'DialogFooter',
  'Card',
  'CardTitle',
  'CardHeader',
  'CardContent',
  'CardFooter',
  'Tabs',
  'TabsList',
  'TabsTrigger',
  'TabsContent',
  'GlacialTabsTrigger',
  'GlacialTabsList',
  'Table',
  'TableHeader',
  'TableBody',
  'TableRow',
  'TableHead',
  'TableCell',
  'Badge',
  'Checkbox',
  'RadioGroup',
  'RadioGroupItem',
  'Switch',
  'Popover',
  'PopoverTrigger',
  'ScrollArea',
  'Sheet',
  'SheetTrigger',
  'SheetContent',
  'Drawer',
  'DrawerTrigger',
  'DrawerContent',
  'Calendar',
  'Command',
  'CommandInput',
  'Separator',
  'Skeleton',
]);

function jsxElementName(namePath) {
  if (!namePath) return null;
  if (namePath.type === 'JSXIdentifier') return namePath.name;
  if (namePath.type === 'JSXMemberExpression') {
    const o = jsxElementName(namePath.object);
    const p = namePath.property.name;
    return o ? `${o}.${p}` : p;
  }
  return null;
}

function relevantKind(fullName) {
  if (!fullName) return null;
  const base = fullName.split('.')[0];
  if (RELEVANT_BASE.has(fullName)) return fullName;
  if (RELEVANT_BASE.has(base)) return fullName;
  return null;
}

/** Função mais interior que envolve o JSX (ex.: PedidosCompraTab vs ComprasPage) */
function getScopeName(path) {
  let p = path.parentPath;
  while (p) {
    if (p.isFunctionDeclaration() && p.node.id?.name) return p.node.id.name;
    if (p.isArrowFunctionExpression() || p.isFunctionExpression()) {
      const parent = p.parentPath;
      if (parent?.isVariableDeclarator() && parent.node.id?.type === 'Identifier') {
        return parent.node.id.name;
      }
    }
    p = p.parentPath;
  }
  return 'Module';
}

function attrString(attr) {
  if (!attr || attr.type !== 'JSXAttribute') return null;
  const v = attr.value;
  if (!v) return null;
  if (v.type === 'StringLiteral') return v.value;
  if (v.type === 'JSXExpressionContainer' && v.expression?.type === 'StringLiteral') {
    return v.expression.value;
  }
  return null;
}

function hintFromOpeningElement(node) {
  const attrs = node.attributes || [];
  let hint = [];
  for (const a of attrs) {
    if (a.type !== 'JSXAttribute' || a.name?.type !== 'JSXIdentifier') continue;
    const n = a.name.name;
    if (n === 'placeholder' || n === 'title' || n === 'aria-label') {
      const s = attrString(a);
      if (s) hint.push(s);
    }
    if (n === 'variant' || n === 'size') {
      const s = attrString(a);
      if (s) hint.push(`${n}=${s}`);
    }
  }
  return hint.length ? hint.slice(0, 3).join(' · ') : null;
}

export function extractWidgetsFromSource(code, fileLabel, pageStable, counters) {
  /** counters: Map "scope::kind" -> number */
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      plugins: ['jsx', 'importMeta', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'topLevelAwait'],
    });
  } catch (e) {
    return { widgets: [], parseError: String(e.message) };
  }

  const normalizedFileLabel = normalizeToSrcPath(fileLabel);
  const widgets = [];

  traverse(ast, {
    JSXOpeningElement(path) {
      const full = jsxElementName(path.node.name);
      const kind = relevantKind(full);
      if (!kind) return;

      const scope = getScopeName(path);
      const key = `${scope}::${kind}`;
      const n = (counters.get(key) || 0) + 1;
      counters.set(key, n);

      const code = `${pageStable}.${scope}.${kind}.${n}`;
      const line = path.node.loc?.start?.line ?? 0;
      const column = path.node.loc?.start?.column ?? 0;
      const hint = hintFromOpeningElement(path.node);

      widgets.push({
        code,
        kind,
        scope,
        line,
        column,
        hint,
        file: normalizedFileLabel,
        source_location_raw: `${normalizedFileLabel}:${line}:${column}`,
      });
    },
  });

  return { widgets, parseError: null };
}

export function walkComponentFile(absPath, pageStable, relativeLabel, counters = new Map(), maxBytes = 450000) {
  if (!absPath || !existsSync(absPath)) return { widgets: [], parseError: 'missing file' };
  let code = readFileSync(absPath, 'utf8');
  if (code.length > maxBytes) code = code.slice(0, maxBytes);
  const label = relativeLabel || absPath.replace(/\\/g, '/');
  const extracted = extractWidgetsFromSource(code, label, pageStable, counters);
  return { ...extracted, code, label };
}

function resolveCandidates(basePath) {
  const out = [basePath];
  for (const ext of ['.jsx', '.tsx', '.js']) out.push(basePath + ext);
  for (const ext of ['.jsx', '.tsx', '.js']) out.push(join(basePath, `index${ext}`));
  return out;
}

export function resolveImportToAbs(importPath, root, fromAbsPath = null) {
  let basePath = null;
  if (importPath.startsWith('@/')) {
    basePath = importPath.replace('@/', join(root, 'src') + '/');
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const baseDir = fromAbsPath ? dirname(fromAbsPath) : root;
    basePath = resolve(baseDir, importPath);
  } else {
    return null;
  }

  for (const p of resolveCandidates(basePath)) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Prioridade para percorrer imports antes de atingir maxImportFiles.
 * FAB, modais e fluxos críticos de compras/logística entram primeiro.
 */
const IMPORT_WALK_PRIORITY_RULES = [
  { re: /FAB|Fab\b|p38-bottom-fab/i, score: 100 },
  { re: /Modal|Dialog|Drawer|Sheet|Popover|AlertDialog|CommandDialog/i, score: 92 },
  { re: /Embarque|Despacho|Informar\w*Embarque|Informar\w*Despacho/i, score: 88 },
  { re: /Anexos|Attachment|Upload/i, score: 84 },
  { re: /Wizard|Checkout|Stepper|MultiStep/i, score: 72 },
  { re: /Inspector|Overlay|QuickPanel|SidePanel/i, score: 68 },
];

function importWalkPriority(imp) {
  const hay = `${imp.name || ''} ${imp.path || ''}`.replace(/\\/g, '/');
  let best = 0;
  for (const { re, score } of IMPORT_WALK_PRIORITY_RULES) {
    if (re.test(hay)) best = Math.max(best, score);
  }
  return best;
}

/** Imports de domínio a seguir (mesma regra que build-catalogo-preview) */
export function listDomainImportsFromSource(src) {
  const patterns = [
    /import\s+(\w+)\s+from\s+['"](@\/components\/[^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"](\.\.\/components\/[^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"](\.\/[^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"](\.\.\/[^'"]+)['"]/g,
  ];
  const out = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) {
      let p = m[2];
      if (/^\.\.\/components\//.test(p)) p = '@/components/' + p.replace(/^\.\.\/components\//, '');
      if (p.includes('/ui/')) continue;
      if (!p.startsWith('@/components/') && !p.startsWith('./') && !p.startsWith('../')) continue;
      out.push({ name: m[1], path: p });
    }
  }
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.path)) return false;
    seen.add(x.path);
    return true;
  });
}

function collectImportedComponentSections({
  src,
  root,
  ownerAbsPath,
  pageStable,
  importsWalked,
  visitedAbs,
  maxImportFiles,
  depth = 0,
}) {
  if (!src || importsWalked.length >= maxImportFiles) return [];

  const rawImports = listDomainImportsFromSource(src);
  const imports = rawImports
    .map((imp, index) => ({ imp, index, prio: importWalkPriority(imp) }))
    .sort((a, b) => b.prio - a.prio || a.index - b.index)
    .map(({ imp }) => imp);

  const sections = [];

  for (const imp of imports) {
    if (importsWalked.length >= maxImportFiles) break;
    const abs = resolveImportToAbs(imp.path, root, ownerAbsPath);
    if (!abs || visitedAbs.has(abs)) continue;

    visitedAbs.add(abs);
    importsWalked.push(imp.path);

    const subStable = `${pageStable}.${imp.name}`;
    const sub = walkComponentFile(abs, subStable, null, new Map());
    sections.push({
      type: depth === 0 ? 'import' : 'nested-import',
      componentName: imp.name,
      label: abs.replace(root + '/', '').replace(/\\/g, '/'),
      widgets: sub.widgets,
      parseError: sub.parseError,
    });

    if (sub.code && !sub.parseError) {
      sections.push(
        ...collectImportedComponentSections({
          src: sub.code,
          root,
          ownerAbsPath: abs,
          pageStable: subStable,
          importsWalked,
          visitedAbs,
          maxImportFiles,
          depth: depth + 1,
        })
      );
    }
  }

  return sections;
}

/**
 * Página completa: ficheiro da rota + N ficheiros importados (limite)
 */
export function extractPageAst(pageKey, root, pageFileAbs, maxImportFiles = 64) {
  const pageStable = `CAT-PG-${pageKey}`;
  const counters = new Map();
  const sections = [];

  let pageSrc = '';
  try {
    pageSrc = readFileSync(pageFileAbs, 'utf8');
  } catch {
    return { pageKey, pageStable, missing: true, sections: [], importsWalked: [] };
  }

  const main = extractWidgetsFromSource(
    pageSrc,
    pageFileAbs.replace(root + '/', '').replace(/\\/g, '/'),
    pageStable,
    new Map()
  );
  sections.push({ type: 'route', label: pageFileAbs.replace(root + '/', '').replace(/\\/g, '/'), widgets: main.widgets, parseError: main.parseError });

  const importsWalked = [];
  const visitedAbs = new Set([pageFileAbs]);
  sections.push(
    ...collectImportedComponentSections({
      src: pageSrc,
      root,
      ownerAbsPath: pageFileAbs,
      pageStable,
      importsWalked,
      visitedAbs,
      maxImportFiles,
      depth: 0,
    })
  );

  return {
    pageKey,
    pageStable,
    missing: false,
    sections,
    importsWalked,
  };
}
