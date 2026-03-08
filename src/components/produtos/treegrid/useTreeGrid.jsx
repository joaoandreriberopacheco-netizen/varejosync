import { useMemo } from 'react';

// Calcula média IQR: descarta os 25% inferiores e 25% superiores
export function iqrMean(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q1Idx = Math.floor(sorted.length * 0.25);
  const q3Idx = Math.ceil(sorted.length * 0.75);
  const core = sorted.slice(q1Idx, q3Idx);
  if (core.length === 0) return sorted[0];
  return core.reduce((s, v) => s + v, 0) / core.length;
}

// Agrupa produtos em árvore com base nos campos hierárquicos
export function buildTree(produtos) {
  const root = {};

  for (const p of produtos) {
    const h1 = p.campo_hierarquico_1 || '(sem grupo)';
    const h2 = p.campo_hierarquico_2 || '';
    const h3 = p.campo_hierarquico_3 || '';
    const h4 = p.campo_hierarquico_4 || '';

    if (!root[h1]) root[h1] = { label: h1, level: 1, children: {}, skus: [] };

    if (!h2) { root[h1].skus.push(p); continue; }
    if (!root[h1].children[h2]) root[h1].children[h2] = { label: h2, level: 2, children: {}, skus: [] };

    if (!h3) { root[h1].children[h2].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3]) root[h1].children[h2].children[h3] = { label: h3, level: 3, children: {}, skus: [] };

    if (!h4) { root[h1].children[h2].children[h3].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3].children[h4]) root[h1].children[h2].children[h3].children[h4] = { label: h4, level: 4, children: {}, skus: [] };

    root[h1].children[h2].children[h3].children[h4].skus.push(p);
  }

  return root;
}

// Flatten recursivo da árvore em lista de rows para renderização
export function flattenTree(treeNode, expandedKeys, parentKey = '') {
  const rows = [];

  for (const [key, node] of Object.entries(treeNode)) {
    const nodeKey = parentKey ? `${parentKey}||${key}` : key;
    const allSkus = collectSkus(node);

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
      // Filhos grupo
      if (Object.keys(node.children).length > 0) {
        rows.push(...flattenTree(node.children, expandedKeys, nodeKey));
      }
      // SKUs diretos
      for (const sku of node.skus) {
        rows.push({ type: 'sku', key: sku.id, produto: sku, level: node.level + 1 });
      }
    }
  }

  return rows;
}

function collectSkus(node) {
  const skus = [...node.skus];
  for (const child of Object.values(node.children)) {
    skus.push(...collectSkus(child));
  }
  return skus;
}

// Dado um nível desejado (1-5), retorna o set de chaves expandidas
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '') {
  const keys = new Set();
  if (targetLevel < 1) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    const nodeKey = parentKey ? `${parentKey}||${key}` : key;
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