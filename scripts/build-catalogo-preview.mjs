/**
 * Catálogo UI: página → componente → subcomponentes com códigos hierárquicos
 * (ex.: CAT-PG-PDV.PDVVendedor.ComprovantePreVenda)
 *
 * npm run catalogo:build-preview
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pagesDir = join(root, 'src', 'pages');

const BOOTSTRAP = JSON.parse(
  readFileSync(join(root, 'docs', 'migration', 'catalogo_interface_bootstrap.json'), 'utf8')
);

const MAX_TOP_BLOCKS = 24;
const MAX_CHILDREN_PER_BLOCK = 40;
const MAX_DEPTH = 2;

function pageStableCode(pageKey) {
  return `CAT-PG-${pageKey}`;
}

function resolveImportToFile(importPath) {
  if (!importPath.startsWith('@/')) return null;
  const rel = importPath.replace('@/', join(root, 'src') + '/');
  for (const ext of ['.jsx', '.tsx', '.js']) {
    const p = rel + ext;
    if (existsSync(p)) return p;
  }
  return null;
}

function pageFileForKey(key) {
  const map = { Produtos: 'Produtos.jsx' };
  return join(pagesDir, map[key] || `${key}.jsx`);
}

/** Imports na página: @/components e ../components (domínio, sem ui/) */
function extractDomainImports(src) {
  const patterns = [
    /import\s+(\w+)\s+from\s+['"](@\/components\/[^'"]+)['"]/g,
    /import\s+(\w+)\s+from\s+['"](\.\.\/components\/[^'"]+)['"]/g,
  ];
  const out = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      let p = m[2];
      if (p.startsWith('../')) p = '@/components/' + p.replace(/^\.\.\/components\//, '');
      if (p.includes('/ui/')) continue;
      out.push({ name, path: p });
    }
  }
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.path)) return false;
    seen.add(x.path);
    return true;
  });
}

/** Imports relativos ./ e ../ dentro da mesma feature (ficheiro no disco) */
function extractRelativeImports(componentAbsPath, src) {
  const dir = dirname(componentAbsPath);
  const out = [];
  const re = /import\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    let spec = m[2];
    if (spec.endsWith('.css') || spec.endsWith('.scss')) continue;
    const resolved = join(dir, spec);
    let hit = null;
    for (const ext of ['', '.jsx', '.tsx', '.js']) {
      const tryPath = resolved + ext;
      if (existsSync(tryPath)) {
        hit = tryPath;
        break;
      }
      if (existsSync(join(resolved, 'index.jsx'))) {
        hit = join(resolved, 'index.jsx');
        break;
      }
    }
    if (!hit) continue;
    const srcRoot = join(root, 'src');
    if (!hit.startsWith(srcRoot)) continue;
    let rel = hit.slice(srcRoot.length).replace(/^[\\/]/, '').replace(/\\/g, '/');
    if (!rel.startsWith('components/')) continue;
    if (rel.includes('components/ui/')) continue;
    out.push({ name, path: '@/' + rel.replace(/\.(jsx|tsx|js)$/, '') });
  }
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.path)) return false;
    seen.add(x.path);
    return true;
  });
}

/** Imports @/components/... no interior de um ficheiro grande (sub-módulos) */
function extractAtComponentImports(src) {
  const out = [];
  const re = /import\s+(\w+)\s+from\s+['"](@\/components\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const p = m[2];
    if (p.includes('/ui/')) continue;
    out.push({ name, path: p });
  }
  const seen = new Set();
  return out.filter((x) => {
    if (seen.has(x.path)) return false;
    seen.add(x.path);
    return true;
  });
}

function extractCatalogMarkers(src) {
  const markers = [];
  for (const mm of src.matchAll(/\bdata-catalog-code\s*=\s*["']([^"']+)["']/g)) {
    markers.push({ code: mm[1], kind: 'data-attribute' });
  }
  for (const mm of src.matchAll(/\{\/\*\s*@catalog\s+([A-Za-z0-9._-]+)\s*\*\/\s*\}/g)) {
    markers.push({ code: mm[1], kind: 'comment' });
  }
  for (const mm of src.matchAll(/\/\/\s*@catalog\s+([A-Za-z0-9._-]+)/g)) {
    markers.push({ code: mm[1], kind: 'line-comment' });
  }
  const seen = new Set();
  return markers.filter((x) => {
    if (seen.has(x.code)) return false;
    seen.add(x.code);
    return true;
  });
}

function analyzeComponentFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return {
      cards: [],
      tabs: [],
      dialogTitles: [],
      cardCount: 0,
      lineCount: 0,
      catalogMarkers: [],
    };
  }
  let src = readFileSync(filePath, 'utf8');
  const lineCount = src.split('\n').length;
  if (src.length > 120000) src = src.slice(0, 120000);

  const cardTitles = [];
  for (const mm of src.matchAll(/<CardTitle[^>]*>([\s\S]*?)<\/CardTitle>/g)) {
    const inner = mm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (inner && inner.length < 120) cardTitles.push(inner);
  }

  const tabs = [];
  for (const mm of src.matchAll(/<TabsTrigger[^>]*value=\{?["']([^"']+)["']\}?/g)) tabs.push(mm[1]);
  for (const mm of src.matchAll(/TabsTrigger[^>]*>\s*([^<]+)\s*</g)) {
    const t = mm[1].trim();
    if (t && !tabs.includes(t) && t.length < 80) tabs.push(t);
  }

  const dialogTitles = [];
  for (const mm of src.matchAll(/<DialogTitle[^>]*>([\s\S]*?)<\/DialogTitle>/g)) {
    const inner = mm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (inner && inner.length < 100) dialogTitles.push(inner);
  }

  const cardCount = (src.match(/<Card[\s.]/g) || []).length;
  const catalogMarkers = extractCatalogMarkers(src);

  return {
    cardCount,
    cardTitles: [...new Set(cardTitles)].slice(0, 28),
    tabs: [...new Set(tabs)].slice(0, 22),
    dialogTitles: [...new Set(dialogTitles)].slice(0, 14),
    lineCount,
    catalogMarkers,
  };
}

function mergeChildImports(relativeImports, atImports, parentBlockName) {
  const byPath = new Map();
  for (const x of relativeImports) {
    if (x.name === parentBlockName) continue;
    byPath.set(x.path, x);
  }
  for (const x of atImports) {
    if (x.name === parentBlockName) continue;
    if (!byPath.has(x.path)) byPath.set(x.path, { ...x, via: '@/' });
  }
  return [...byPath.values()].slice(0, MAX_CHILDREN_PER_BLOCK);
}

function buildChildNodes(parentStableCode, filePath, depth) {
  if (depth > MAX_DEPTH) return [];
  if (!filePath || !existsSync(filePath)) return [];

  const src = readFileSync(filePath, 'utf8');
  const baseName = parentStableCode.split('.').pop();
  const rel = extractRelativeImports(filePath, src);
  const at = extractAtComponentImports(src);
  const merged = mergeChildImports(rel, at, baseName);

  const nodes = [];
  for (const ch of merged) {
    const abs = resolveImportToFile(ch.path);
    const stableCode = `${parentStableCode}.${ch.name}`;
    const analysis = analyzeComponentFile(abs);
    const sub =
      depth < MAX_DEPTH ? buildChildNodes(stableCode, abs, depth + 1) : [];

    nodes.push({
      kind: 'subcomponente',
      name: ch.name,
      stableCode,
      importPath: ch.path,
      via: ch.via || 'import',
      sourceFile: abs ? abs.replace(root + '/', '').replace(/\\/g, '/') : null,
      children: sub,
      ...analysis,
    });
  }
  return nodes;
}

function buildPageTree(pageKey) {
  const pagePath = pageFileForKey(pageKey);
  const pageStable = pageStableCode(pageKey);

  if (!existsSync(pagePath)) {
    return { pageKey, pageStable, file: null, missing: true, blocks: [] };
  }

  const src = readFileSync(pagePath, 'utf8');
  const imports = extractDomainImports(src);
  const blocks = [];

  for (const imp of imports.slice(0, MAX_TOP_BLOCKS)) {
    const resolved = resolveImportToFile(imp.path);
    const analysis = analyzeComponentFile(resolved);
    const stableCode = `${pageStable}.${imp.name}`;
    const children = buildChildNodes(stableCode, resolved, 1);

    blocks.push({
      kind: 'componente',
      name: imp.name,
      stableCode,
      importPath: imp.path,
      sourceFile: resolved ? resolved.replace(root + '/', '').replace(/\\/g, '/') : null,
      children,
      ...analysis,
    });
  }

  return {
    pageKey,
    pageStable,
    file: pagePath.replace(root + '/', '').replace(/\\/g, '/'),
    missing: false,
    blocks,
  };
}

function main() {
  const pageDetails = {};
  for (const mod of BOOTSTRAP.modules) {
    for (const pk of mod.pages) {
      pageDetails[pk] = buildPageTree(pk);
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    schema: 'CAT-PG-<Page>.<Bloco> | CAT-PG-<Page>.<Bloco>.<Filho>[.<Neto>…]',
    modules: BOOTSTRAP.modules,
    pageDetails,
  };

  const jsonStr = JSON.stringify(payload);
  const b64 = Buffer.from(jsonStr, 'utf8').toString('base64');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Catálogo de UI — códigos hierárquicos</title>
  <style>
    :root {
      --bg: #0c0f14;
      --panel: #151b24;
      --text: #e8edf4;
      --muted: #8b98ab;
      --accent: #5b9fd4;
      --teal: #5ec9b0;
      --gold: #e6c35c;
      --line: #2a3544;
      --pill: #1e2632;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1.25rem 1.5rem 2rem;
      line-height: 1.45;
      max-width: 58rem;
      margin-inline: auto;
    }
    h1 { font-size: 1.35rem; font-weight: 600; margin: 0 0 0.35rem; color: var(--accent); }
    .sub { color: var(--muted); font-size: 0.88rem; margin-bottom: 1rem; max-width: 50rem; }
    .schema { font-size: 0.8rem; color: var(--gold); margin-bottom: 0.75rem; font-family: ui-monospace, monospace; }
    details { margin: 0.2rem 0; }
    details.mod > summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--teal);
      padding: 0.35rem 0;
      list-style: none;
    }
    details.mod > summary::-webkit-details-marker { display: none; }
    details.mod > summary::before { content: "▸ "; color: var(--muted); }
    details.mod[open] > summary::before { content: "▾ "; }
    details.page > summary {
      cursor: pointer;
      font-size: 0.92rem;
      padding: 0.25rem 0 0.25rem 0.5rem;
      border-left: 2px solid var(--line);
      margin-left: 0.35rem;
    }
    details.block > summary, details.sub > summary {
      cursor: pointer;
      font-size: 0.82rem;
      color: #c5d4e8;
      padding: 0.15rem 0 0.15rem 0.75rem;
    }
    details.sub > summary { padding-left: 1.25rem; font-size: 0.78rem; }
    .codez {
      display: inline-block;
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
      color: var(--gold);
      background: #121820;
      padding: 0.12rem 0.4rem;
      border-radius: 4px;
      margin-right: 0.35rem;
      border: 1px solid #3d4a5c;
    }
    .meta { font-size: 0.7rem; color: var(--muted); margin-left: 0.25rem; }
    ul.inline { margin: 0.2rem 0 0.35rem 1.5rem; padding: 0; list-style: square; }
    ul.inline li { margin: 0.1rem 0; font-size: 0.78rem; color: #c8d0dc; }
    .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.25rem 0 0.25rem 1rem; }
    .pills span {
      font-size: 0.65rem;
      padding: 0.18rem 0.4rem;
      background: var(--pill);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: #9ecfff;
      max-width: 100%;
    }
    .markers { margin: 0.35rem 0 0.25rem 1rem; }
    .markers .codez { color: #7dffb3; border-color: #2d5a45; }
    .empty { color: var(--muted); font-size: 0.78rem; margin-left: 1rem; font-style: italic; }
    .diagram { text-align: center; margin-bottom: 1rem; }
    .diagram-root {
      display: inline-block;
      padding: 0.45rem 0.9rem;
      background: #1a2330;
      border: 1px solid var(--accent);
      border-radius: 8px;
      font-weight: 600;
      margin-bottom: 0.65rem;
      font-size: 0.9rem;
    }
    .diagram-children {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      justify-content: center;
    }
    .diagram-children span {
      font-size: 0.68rem;
      padding: 0.3rem 0.45rem;
      background: #0d1218;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: #8ec5ff;
    }
    footer { color: var(--muted); font-size: 0.75rem; margin-top: 1.25rem; }
    code { font-size: 0.76rem; background: #0a0e14; padding: 0.05rem 0.3rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Catálogo de UI (código hierárquico)</h1>
  <p class="sub">
    Cada nó tem um <strong>código estável</strong> em cadeia: página → componente da rota → subcomponentes
    (imports relativos <code>./</code> e imports <code>@/components</code> não-ui). Também se listam
    <code>data-catalog-code="…"</code> e comentários <code>@catalog …</code> no JSX (zonas como barra de pesquisa).
    Regenerado em <span id="gen"></span>.
  </p>
  <p class="schema" id="schema"></p>

  <div class="diagram">
    <div class="diagram-root">CAT-APP-RAIZ</div>
    <div class="diagram-children" id="mod-pills"></div>
  </div>

  <div id="tree"></div>

  <footer>
    <code>npm run catalogo:build-preview</code> · profundidade máx. ${MAX_DEPTH} níveis abaixo do primeiro componente de página
  </footer>

  <div id="payload-b64" hidden>${b64}</div>
  <script>
    (function(){
      var b64 = document.getElementById('payload-b64').textContent.trim();
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      window.__payload = JSON.parse(new TextDecoder().decode(bytes));
    })();
    const payload = window.__payload;
    document.getElementById('gen').textContent = payload.generated_at || '';
    document.getElementById('schema').textContent = 'Esquema: ' + (payload.schema || '');

    const pillRoot = document.getElementById('mod-pills');
    for (const m of payload.modules) {
      const s = document.createElement('span');
      s.textContent = m.stable_code;
      pillRoot.appendChild(s);
    }

    function renderAnalysis(container, b) {
      const parts = [];
      if (b.cardCount) parts.push(b.cardCount + ' &lt;Card&gt;');
      if (b.cardTitles && b.cardTitles.length) parts.push(b.cardTitles.length + ' CardTitle');
      if (b.tabs && b.tabs.length) parts.push(b.tabs.length + ' tabs');
      if (b.dialogTitles && b.dialogTitles.length) parts.push(b.dialogTitles.length + ' diálogos');
      if (parts.length) {
        const p = document.createElement('p');
        p.className = 'meta';
        p.style.marginLeft = '1rem';
        p.textContent = parts.join(' · ');
        container.appendChild(p);
      }
      if (b.catalogMarkers && b.catalogMarkers.length) {
        const wrap = document.createElement('div');
        wrap.className = 'markers';
        const lab = document.createElement('div');
        lab.className = 'meta';
        lab.textContent = 'Marcadores explícitos (zonas)';
        wrap.appendChild(lab);
        for (const mk of b.catalogMarkers) {
          const sp = document.createElement('span');
          sp.className = 'codez';
          sp.textContent = mk.code;
          wrap.appendChild(sp);
          wrap.appendChild(document.createTextNode(' '));
        }
        container.appendChild(wrap);
      }
      if (b.cardTitles && b.cardTitles.length) {
        const lab = document.createElement('div');
        lab.className = 'meta';
        lab.style.marginLeft = '1rem';
        lab.textContent = 'CardTitle';
        container.appendChild(lab);
        const div = document.createElement('div');
        div.className = 'pills';
        for (const t of b.cardTitles) {
          const sp = document.createElement('span');
          sp.textContent = t;
          div.appendChild(sp);
        }
        container.appendChild(div);
      }
      if (b.tabs && b.tabs.length) {
        const ul = document.createElement('ul');
        ul.className = 'inline';
        for (const t of b.tabs) {
          const li = document.createElement('li');
          li.textContent = 'Tab: ' + t;
          ul.appendChild(li);
        }
        container.appendChild(ul);
      }
      if (b.dialogTitles && b.dialogTitles.length) {
        const lab = document.createElement('div');
        lab.className = 'meta';
        lab.style.marginLeft = '1rem';
        lab.textContent = 'DialogTitle';
        container.appendChild(lab);
        const ul = document.createElement('ul');
        ul.className = 'inline';
        for (const t of b.dialogTitles) {
          const li = document.createElement('li');
          li.textContent = t;
          ul.appendChild(li);
        }
        container.appendChild(ul);
      }
    }

    function renderChild(parentEl, node, depth) {
      const d = document.createElement('details');
      d.className = 'sub';
      d.open = depth < 1;
      const s = document.createElement('summary');
      s.innerHTML = '<span class="codez">' + node.stableCode + '</span> <strong>' + node.name + '</strong>' +
        ' <span class="meta">' + (node.sourceFile || '') + '</span>';
      d.appendChild(s);
      renderAnalysis(d, node);
      if (node.children && node.children.length) {
        for (const ch of node.children) renderChild(d, ch, depth + 1);
      }
      parentEl.appendChild(d);
    }

    const host = document.getElementById('tree');
    for (const mod of payload.modules) {
      const det = document.createElement('details');
      det.className = 'mod';
      det.open = false;
      const sum = document.createElement('summary');
      sum.innerHTML = '<span class="mod">' + mod.stable_code + '</span> — ' + mod.titulo +
        ' <span class="meta">(' + mod.pages.length + ' páginas)</span>';
      det.appendChild(sum);

      for (const pk of mod.pages) {
        const pd = payload.pageDetails[pk];
        const pDet = document.createElement('details');
        pDet.className = 'page';
        const pSum = document.createElement('summary');
        pSum.innerHTML = '<span class="codez">' + (pd.pageStable || ('CAT-PG-' + pk)) + '</span> · ' + pk +
          (pd.file ? ' <span class="meta">' + pd.file + '</span>' : '');
        pDet.appendChild(pSum);

        if (!pd || pd.missing) {
          const em = document.createElement('div');
          em.className = 'empty';
          em.textContent = 'Ficheiro de página não encontrado.';
          pDet.appendChild(em);
        } else if (!pd.blocks.length) {
          const em = document.createElement('div');
          em.className = 'empty';
          em.textContent = 'Sem componentes de domínio na página (só ui/ ou JSX inline). Use data-catalog-code nos blocos.';
          pDet.appendChild(em);
        } else {
          for (const b of pd.blocks) {
            const bDet = document.createElement('details');
            bDet.className = 'block';
            bDet.open = pk === 'PDV';
            const bSum = document.createElement('summary');
            bSum.innerHTML = '<span class="codez">' + b.stableCode + '</span> <strong>' + b.name + '</strong>' +
              ' <span class="meta">' + (b.sourceFile || b.importPath) +
              (b.lineCount ? ' · ~' + b.lineCount + ' linhas' : '') + '</span>';
            bDet.appendChild(bSum);
            renderAnalysis(bDet, b);
            if (b.children && b.children.length) {
              for (const ch of b.children) renderChild(bDet, ch, 0);
            }
            pDet.appendChild(bDet);
          }
        }
        det.appendChild(pDet);
      }
      host.appendChild(det);
    }
  </script>
</body>
</html>`;

  const out = join(root, 'docs', 'migration', 'catalogo_interface_preview.html');
  writeFileSync(out, html, 'utf8');
  console.log('Gerado:', out);
  console.log('Páginas:', Object.keys(pageDetails).length);
}

main();
