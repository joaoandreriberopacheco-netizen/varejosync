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

// ── Constrói a árvore hierárquica: h1..h4 são agrupadores, h5 é só dado do SKU
export function buildTree(produtos) {
  const root = {};

  for (const p of produtos) {
    const h1 = (p.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = (p.campo_hierarquico_2 || '').trim();
    const h3 = (p.campo_hierarquico_3 || '').trim();
    const h4 = (p.campo_hierarquico_4 || '').trim();
    // h5 é atributo de exibição do SKU, nunca agrupador

    if (!root[h1]) root[h1] = { label: h1, level: 1, children: {}, skus: [] };

    if (!h2) { root[h1].skus.push(p); continue; }
    if (!root[h1].children[h2])
      root[h1].children[h2] = { label: h2, level: 2, children: {}, skus: [] };

    if (!h3) { root[h1].children[h2].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3])
      root[h1].children[h2].children[h3] = { label: h3, level: 3, children: {}, skus: [] };

    if (!h4) { root[h1].children[h2].children[h3].skus.push(p); continue; }
    if (!root[h1].children[h2].children[h3].children[h4])
      root[h1].children[h2].children[h3].children[h4] = { label: h4, level: 4, children: {}, skus: [] };

    // h4 existe → SKU cai aqui (h5 é só label exibido na linha SKU se quiser)
    root[h1].children[h2].children[h3].children[h4].skus.push(p);
  }

  return root;
}

// ── Deep Collapse: funde recursivamente cadeias de filho-único sem SKUs diretos
// Retorna { label, node, level } onde label é o path fundido e node é o nó final
function deepCollapse(node, baseLabel) {
  const childKeys = Object.keys(node.children);
  // Condição de fusão: exatamente 1 filho e nenhum SKU direto neste nó
  if (childKeys.length === 1 && node.skus.length === 0) {
    const childKey = childKeys[0];
    const childNode = node.children[childKey];
    const mergedLabel = baseLabel ? `${baseLabel} › ${childNode.label}` : childNode.label;
    return deepCollapse(childNode, mergedLabel);
  }
  // Parou de fundir: retorna o estado actual
  return { label: baseLabel, node, level: node.level };
}

// ── Flatten recursivo com deep collapsing ─────────────────────────────────────
export function flattenTree(treeNode, expandedKeys, parentKey = '', parentLevel = 0) {
  const rows = [];

  for (const [key, node] of Object.entries(treeNode)) {
    const rawKey = parentKey ? `${parentKey}||${key}` : key;

    // Tentar colapso profundo
    const collapsed = deepCollapse(node, node.label);
    // A chave de expansão é baseada no caminho até o nó final fundido
    const nodeKey = collapsed.node === node
      ? rawKey
      : buildCollapsedKey(rawKey, node, collapsed.node);

    const allSkus = collectSkus(collapsed.node);
    const displayLevel = parentLevel + 1; // nível visual (não o do dado)

    rows.push({
      type: 'group',
      key: nodeKey,
      label: collapsed.label,
      level: displayLevel,
      isMerged: collapsed.node !== node,
      node: collapsed.node,
      allSkus,
      estoqueTotal: allSkus.reduce((s, p) => s + (p.estoque_atual || 0), 0),
      precoMedioIQR: iqrMean(allSkus.map(p => p.preco_venda_padrao || 0).filter(v => v > 0)),
      custoMedioIQR: iqrMean(allSkus.map(p => p.preco_custo_calculado || 0).filter(v => v > 0)),
      count: allSkus.length,
    });

    if (expandedKeys.has(nodeKey)) {
      const finalNode = collapsed.node;
      // Filhos-grupo (se ainda houver diversidade)
      if (Object.keys(finalNode.children).length > 0) {
        rows.push(...flattenTree(finalNode.children, expandedKeys, nodeKey, displayLevel));
      }
      // SKUs diretos do nó final (sem duplicação)
      for (const sku of finalNode.skus) {
        rows.push({
          type: 'sku',
          key: sku.id,
          produto: sku,
          level: displayLevel + 1,
        });
      }
    }
  }

  return rows;
}

// Constrói a chave do nó final após deep collapse atravessando o caminho
function buildCollapsedKey(startKey, startNode, targetNode) {
  if (startNode === targetNode) return startKey;
  const childKey = Object.keys(startNode.children)[0];
  const childNode = startNode.children[childKey];
  return buildCollapsedKey(`${startKey}||${childKey}`, childNode, targetNode);
}

// ── Expande até determinado nível visual ─────────────────────────────────────
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '', parentLevel = 0) {
  const keys = new Set();
  if (parentLevel >= targetLevel) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    const rawKey = parentKey ? `${parentKey}||${key}` : key;
    const collapsed = deepCollapse(node, node.label);
    const nodeKey = collapsed.node === node
      ? rawKey
      : buildCollapsedKey(rawKey, node, collapsed.node);

    const displayLevel = parentLevel + 1;
    if (displayLevel <= targetLevel) {
      keys.add(nodeKey);
      const childKeys = buildExpandedForLevel(
        collapsed.node.children, targetLevel, nodeKey, displayLevel
      );
      childKeys.forEach(k => keys.add(k));
    }
  }
  return keys;
}

export function useTreeGrid(produtos) {
  const tree = useMemo(() => buildTree(produtos), [produtos]);
  return tree;
}