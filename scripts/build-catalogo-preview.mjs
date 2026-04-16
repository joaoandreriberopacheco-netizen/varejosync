/**
 * Extrai árvore página → componentes de domínio → cartões/tabs (heurística JSX)
 * e gera docs/migration/catalogo_interface_preview.html (dados embutidos, funciona em file://)
 *
 * npm run catalogo:build-preview
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pagesDir = join(root, 'src', 'pages');
const componentsRoot = join(root, 'src', 'components');

const BOOTSTRAP = JSON.parse(
  readFileSync(join(root, 'docs', 'migration', 'catalogo_interface_bootstrap.json'), 'utf8')
);

function resolveComponentFile(importPath) {
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
  const name = map[key] || `${key}.jsx`;
  return join(pagesDir, name);
}

/** Imports de domínio (exclui @/components/ui/, entities, lib) */
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

function analyzeComponentFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return { cards: [], tabs: [], dialogTitles: [], cardCount: 0, lineCount: 0 };
  }
  let src = readFileSync(filePath, 'utf8');
  const lineCount = src.split('\n').length;
  if (src.length > 100000) src = src.slice(0, 100000);

  const cardTitles = [];
  for (const mm of src.matchAll(/<CardTitle[^>]*>([\s\S]*?)<\/CardTitle>/g)) {
    const inner = mm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (inner && inner.length < 120) cardTitles.push(inner);
  }

  const tabs = [];
  for (const mm of src.matchAll(/<TabsTrigger[^>]*value=\{?["']([^"']+)["']\}?/g)) {
    tabs.push(mm[1]);
  }
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

  return {
    cardCount,
    cardTitles: [...new Set(cardTitles)].slice(0, 24),
    tabs: [...new Set(tabs)].slice(0, 20),
    dialogTitles: [...new Set(dialogTitles)].slice(0, 12),
    lineCount,
  };
}

function buildPageTree(pageKey) {
  const pagePath = pageFileForKey(pageKey);
  if (!existsSync(pagePath)) {
    return { pageKey, file: null, missing: true, blocks: [] };
  }
  const src = readFileSync(pagePath, 'utf8');
  const imports = extractDomainImports(src);
  const blocks = [];

  for (const imp of imports.slice(0, 20)) {
    const resolved = resolveComponentFile(imp.path);
    const analysis = analyzeComponentFile(resolved);
    blocks.push({
      kind: 'componente',
      name: imp.name,
      importPath: imp.path,
      sourceFile: resolved ? resolved.replace(root + '/', '').replace(/\\/g, '/') : null,
      ...analysis,
    });
  }

  return {
    pageKey,
    file: pagePath.replace(root + '/', '').replace(/\\/g, '/'),
    missing: false,
    blocks,
  };
}

function main() {
  const allPages = [];
  for (const mod of BOOTSTRAP.modules) {
    for (const pk of mod.pages) {
      allPages.push({ moduleId: mod.id, moduleCode: mod.stable_code, moduleTitulo: mod.titulo, pageKey: pk });
    }
  }

  const pageDetails = {};
  for (const { pageKey } of allPages) {
    pageDetails[pageKey] = buildPageTree(pageKey);
  }

  const payload = {
    generated_at: new Date().toISOString(),
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
  <title>Catálogo de UI — módulos, páginas e componentes</title>
  <style>
    :root {
      --bg: #0c0f14;
      --panel: #151b24;
      --text: #e8edf4;
      --muted: #8b98ab;
      --accent: #5b9fd4;
      --teal: #5ec9b0;
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
    .sub { color: var(--muted); font-size: 0.88rem; margin-bottom: 1rem; max-width: 48rem; }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0.9rem 1rem;
      margin-bottom: 0.75rem;
    }
    .card h2 { font-size: 0.95rem; margin: 0 0 0.6rem; color: var(--teal); font-weight: 600; }
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
    details.page > summary code { font-size: 0.78rem; }
    details.block > summary {
      cursor: pointer;
      font-size: 0.84rem;
      color: #c5d4e8;
      padding: 0.2rem 0 0.2rem 1rem;
    }
    .meta { font-size: 0.72rem; color: var(--muted); margin-left: 0.25rem; }
    ul.inline { margin: 0.25rem 0 0.35rem 1.5rem; padding: 0; list-style: square; }
    ul.inline li { margin: 0.12rem 0; font-size: 0.8rem; color: #c8d0dc; }
    .pills { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.35rem 0 0.25rem 1rem; }
    .pills span {
      font-size: 0.68rem;
      padding: 0.2rem 0.45rem;
      background: var(--pill);
      border: 1px solid var(--line);
      border-radius: 4px;
      color: #9ecfff;
      max-width: 100%;
    }
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
  <h1>Catálogo de UI (código)</h1>
  <p class="sub">
    Heurística sobre ficheiros em <code>src/pages</code> e <code>src/components</code>: por cada página listam-se
    imports de domínio (não-<code>ui/*</code>) e, em cada um, <code>CardTitle</code>, <code>TabsTrigger</code> e <code>DialogTitle</code> detectados.
    Gerado em <span id="gen"></span> — abrir este HTML offline (duplo clique).
  </p>

  <div class="diagram">
    <div class="diagram-root">CAT-APP-RAIZ</div>
    <div class="diagram-children" id="mod-pills"></div>
  </div>

  <div id="tree"></div>

  <footer>
    Regenerar: <code>npm run catalogo:build-preview</code>
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

    const pillRoot = document.getElementById('mod-pills');
    for (const m of payload.modules) {
      const s = document.createElement('span');
      s.textContent = m.stable_code;
      pillRoot.appendChild(s);
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
        pSum.innerHTML = '<code>CAT-PG-' + pk + '</code> · ' + pk;
        if (pd && pd.file) {
          pSum.innerHTML += ' <span class="meta">' + pd.file + '</span>';
        }
        pDet.appendChild(pSum);

        if (!pd || pd.missing) {
          const em = document.createElement('div');
          em.className = 'empty';
          em.textContent = 'Ficheiro de página não encontrado.';
          pDet.appendChild(em);
        } else if (!pd.blocks.length) {
          const em = document.createElement('div');
          em.className = 'empty';
          em.textContent = 'Sem imports de componentes de domínio (página só delega em ui/ ou composição inline).';
          pDet.appendChild(em);
        } else {
          for (const b of pd.blocks) {
            const bDet = document.createElement('details');
            bDet.className = 'block';
            const bSum = document.createElement('summary');
            bSum.innerHTML = '<strong>' + b.name + '</strong> <span class="meta">' + (b.sourceFile || b.importPath) +
              (b.lineCount ? ' · ~' + b.lineCount + ' linhas' : '') + '</span>';
            bDet.appendChild(bSum);

            const parts = [];
            if (b.cardCount) parts.push(b.cardCount + ' cartões (&lt;Card&gt;)');
            if (b.cardTitles && b.cardTitles.length) parts.push(b.cardTitles.length + ' títulos de cartão');
            if (b.tabs && b.tabs.length) parts.push(b.tabs.length + ' tabs');
            if (b.dialogTitles && b.dialogTitles.length) parts.push(b.dialogTitles.length + ' diálogos');

            if (parts.length) {
              const p = document.createElement('p');
              p.className = 'meta';
              p.style.marginLeft = '1rem';
              p.textContent = parts.join(' · ');
              bDet.appendChild(p);
            }

            if (b.cardTitles && b.cardTitles.length) {
              const lab = document.createElement('div');
              lab.className = 'meta';
              lab.style.marginLeft = '1rem';
              lab.textContent = 'CardTitle';
              bDet.appendChild(lab);
              const div = document.createElement('div');
              div.className = 'pills';
              for (const t of b.cardTitles) {
                const sp = document.createElement('span');
                sp.textContent = t;
                div.appendChild(sp);
              }
              bDet.appendChild(div);
            }

            if (b.tabs && b.tabs.length) {
              const ul = document.createElement('ul');
              ul.className = 'inline';
              for (const t of b.tabs) {
                const li = document.createElement('li');
                li.textContent = 'Tab: ' + t;
                ul.appendChild(li);
              }
              bDet.appendChild(ul);
            }

            if (b.dialogTitles && b.dialogTitles.length) {
              const lab = document.createElement('div');
              lab.className = 'meta';
              lab.style.marginLeft = '1rem';
              lab.textContent = 'DialogTitle';
              bDet.appendChild(lab);
              const ul = document.createElement('ul');
              ul.className = 'inline';
              for (const t of b.dialogTitles) {
                const li = document.createElement('li');
                li.textContent = t;
                ul.appendChild(li);
              }
              bDet.appendChild(ul);
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
  console.log('Páginas analisadas:', Object.keys(payload.pageDetails).length);
}

main();
