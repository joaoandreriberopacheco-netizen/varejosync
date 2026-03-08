import { useMemo } from 'react';

// ── IQR Mean ──────────────────────────────────────────────────────────────────
export function iqrMean(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.ceil(sorted.length * 0.75);
  const core = sorted.slice(q1Idx, q3Idx);
  if (core.length === 0) return sorted[0];
  return core.reduce((s, v) => s + v, 0) / core.length;
}

// ── Coleta todos os SKUs de um nó recursivamente ──────────────────────────────
export function collectSkus(node) {
  const skus = [...node.skus];
  for (const child of Object.values(node.children)) {
    skus.push(...collectSkus(child));
  }
  return skus;
}

// ── Constrói a árvore hierárquica usando h1..h5 ───────────────────────────────
// h5 é sempre SKU (bottom line) — nunca vira nó agrupador
export function buildTree(produtos) {
  const root = {};

  for (const p of produtos) {
    const h1 = (p.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = (p.campo_hierarquico_2 || '').trim();
    const h3 = (p.campo_hierarquico_3 || '').trim();
    const h4 = (p.campo_hierarquico_4 || '').trim();
    // h5 é sempre atributo do produto, nunca agrupador

    if (!root[h1]) root[h1] = { label: h1, level: 1, children: {}, skus: [] };

    if (!h2) { root[h1].skus.push(p); continue; }
    if (!root[h1].children[h2]) root[h1].children[h2] = { label: h2, level: 2, children: {}, skus: [] };

    if (!h3) { root[h1].children[h2].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3]) root[h1].children[h2].children[h3] = { label: h3, level: 3, children: {}, skus: [] };

    if (!h4) { root[h1].children[h2].children[h3].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3].children[h4]) root[h1].children[h2].children[h3].children[h4] = { label: h4, level: 4, children: {}, skus: [] };

    // h4 existe → SKU vai diretamente no nível 4 (h5 já é dado do produto)
    root[h1].children[h2].children[h3].children[h4].skus.push(p);
  }

  return root;
}

// ── Smart Flatten: funde nó único em linha só se ele não tem SKUs directos ────
// Regra: se um nó tem exactamente 1 filho e 0 SKUs directos → funde o label
function shouldCollapse(node) {
  const childCount = Object.keys(node.children).length;
  return childCount === 1 && node.skus.length === 0;
}

// Flatten recursivo com achatamento inteligente
export function flattenTree(treeNode, expandedKeys, parentKey = '') {
  const rows = [];

  for (const [key, node] of Object.entries(treeNode)) {
    const nodeKey = parentKey ? `${parentKey}||${key}` : key;
    const allSkus = collectSkus(node);

    // Smart collapse: se só 1 filho e sem SKUs directos, funde e passa para o filho
    if (shouldCollapse(node)) {
      const childKey = Object.keys(node.children)[0];
      const childNode = node.children[childKey];
      const mergedLabel = `${node.label} › ${childNode.label}`;
      const mergedNodeKey = `${nodeKey}||${childKey}`;
      const childAllSkus = collectSkus(childNode);

      rows.push({
        type: 'group',
        key: mergedNodeKey,
        label: mergedLabel,
        level: node.level,   // mantém nível visual do pai
        node: childNode,
        allSkus: childAllSkus,
        estoqueTotal: childAllSkus.reduce((s, p) => s + (p.estoque_atual || 0), 0),
        precoMedioIQR: iqrMean(childAllSkus.map(p => p.preco_venda_padrao || 0).filter(v => v > 0)),
        custoMedioIQR: iqrMean(childAllSkus.map(p => p.preco_custo_calculado || 0).filter(v => v > 0)),
        count: childAllSkus.length,
      });

      if (expandedKeys.has(mergedNodeKey)) {
        if (Object.keys(childNode.children).length > 0) {
          rows.push(...flattenTree(childNode.children, expandedKeys, mergedNodeKey));
        }
        for (const sku of childNode.skus) {
          rows.push({ type: 'sku', key: sku.id, produto: sku, level: node.level + 1 });
        }
      }
      continue;
    }

    // Caso normal
    rows.push({
      type: 'group',
      key: nodeKey,
      label: node.label,
      level: node.level,
      node,
      allSkus,
      estoqueTotal: allSkus.reduce((s, p) => s + (p.estoque_atual || 0), 0),
      precoMedioIQR: iqrMean(allSkus.map(p => p.preco_venda_padrao || 0).filter(v => v > 0)),
      custoMedioIQR: iqrMean(allSkus.map(p => p.preco_custo_calculado || 0).filter(v => v > 0)),
      count: allSkus.length,
    });

    if (expandedKeys.has(nodeKey)) {
      if (Object.keys(node.children).length > 0) {
        rows.push(...flattenTree(node.children, expandedKeys, nodeKey));
      }
      for (const sku of node.skus) {
        rows.push({ type: 'sku', key: sku.id, produto: sku, level: node.level + 1 });
      }
    }
  }

  return rows;
}

// ── Expande até determinado nível ─────────────────────────────────────────────
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '') {
  const keys = new Set();
  if (targetLevel < 1) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    const nodeKey = parentKey ? `${parentKey}||${key}` : key;

    // Smart collapse companion: se vai fundir, usa a chave mesclada
    if (shouldCollapse(node)) {
      const childKey = Object.keys(node.children)[0];
      const childNode = node.children[childKey];
      const mergedKey = `${nodeKey}||${childKey}`;
      if (node.level <= targetLevel) {
        keys.add(mergedKey);
        const childKeys = buildExpandedForLevel(childNode.children, targetLevel, mergedKey);
        childKeys.forEach(k => keys.add(k));
      }
      continue;
    }

    if (node.level <= targetLevel) {
      keys.add(nodeKey);
      const childKeys = buildExpandedForLevel(node.children, targetLevel, nodeKey);
      childKeys.forEach(k => keys.add(k));
    }
  }
  return keys;
}

export function useTreeGrid(produtos) {
  const tree = useMemo(() => buildTree(produtos), [produtos]);
  return tree;
}