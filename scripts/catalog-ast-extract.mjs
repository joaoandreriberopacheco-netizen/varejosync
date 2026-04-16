/**
 * Extracção AST (Babel) — cataloga widgets relevantes por âmbito de função
 * (ex.: CAT-PG-Compras.PedidosCompraTab.Button.1)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

const RELEVANT_BASE = new Set([
  'Button',
  'Input',
  'Textarea',
  'Select',
  'SelectTrigger',
  'SelectValue',
  'SelectItem',
  'SelectContent',
  'Label',
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
      const hint = hintFromOpeningElement(path.node);

      widgets.push({
        code,
        kind,
        scope,
        line,
        column: path.node.loc?.start?.column ?? 0,
        hint,
        file: fileLabel,
        source_location_raw: `${fileLabel}:${line}:${path.node.loc?.start?.column ?? 0}`,
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
  return extractWidgetsFromSource(code, label, pageStable, counters);
}

export function resolveImportToAbs(importPath, root) {
  if (!importPath.startsWith('@/')) return null;
  const rel = importPath.replace('@/', join(root, 'src') + '/');
  for (const ext of ['.jsx', '.tsx', '.js']) {
    const p = rel + ext;
    if (existsSync(p)) return p;
  }
  return null;
}

/** Imports de domínio a seguir (mesma regra que build-catalogo-preview) */
export function listDomainImportsFromSource(src) {
  const patterns = [
    /import\s+(\w+)\s+from\s+['"](@\/components\/[^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"](\.\.\/components\/[^'"]+)['"]/g,
  ];
  const out = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) {
      let p = m[2];
      if (p.startsWith('../')) p = '@/components/' + p.replace(/^\.\.\/components\//, '');
      if (p.includes('/ui/')) continue;
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

/**
 * Página completa: ficheiro da rota + N ficheiros importados (limite)
 */
export function extractPageAst(pageKey, root, pageFileAbs, maxImportFiles = 18) {
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

  const imports = listDomainImportsFromSource(pageSrc).slice(0, maxImportFiles);
  const importsWalked = [];

  for (const imp of imports) {
    const abs = resolveImportToAbs(imp.path, root);
    if (!abs) continue;
    importsWalked.push(imp.path);
    const subStable = `${pageStable}.${imp.name}`;
    const sub = walkComponentFile(abs, subStable, null, new Map());
    sections.push({
      type: 'import',
      componentName: imp.name,
      label: abs.replace(root + '/', '').replace(/\\/g, '/'),
      widgets: sub.widgets,
      parseError: sub.parseError,
    });
  }

  return {
    pageKey,
    pageStable,
    missing: false,
    sections,
    importsWalked,
  };
}
