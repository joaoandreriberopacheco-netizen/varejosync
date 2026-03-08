import { useMemo } from 'react';

// ── IQR Mean ──────────────────────────────────────────────────────────────────
export function iqrMean(values) {
  if (!values || values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.min(Math.ceil(sorted.length * 0.75), sorted.length - 1)];
  const core = sorted.filter(v => v >= q1 && v <= q3);
  const used = core.length > 0 ? core : sorted;
  return used.reduce((s, v) => s + v, 0) / used.length;
}

// ── Enriquece SKU com campo calculado ────────────────────────────────────────
function enrichSku(p) {
  return {
    ...p,
    inventario_valorizado: (p.preco_custo_calculado || 0) * (p.estoque_atual || 0),
    margem_pct: p.preco_venda_padrao > 0
      ? ((p.preco_venda_padrao - (p.preco_custo_calculado || 0)) / p.preco_venda_padrao) * 100
      : 0,
  };
}

// ── Coleta todos os SKUs descendentes ───────────────────────────────────────
export function collectSkus(node) {
  const skus = [...node.skus];
  for (const child of Object.values(node.children)) {
    skus.push(...collectSkus(child));
  }
  return skus;
}

// ── Agrega métricas IQR para um conjunto de SKUs ──────────────────────────
export function aggregateSkus(skus) {
  const precos    = skus.map(p => p.preco_venda_padrao || 0).filter(v => v > 0);
  const custos    = skus.map(p => p.preco_custo_calculado || 0).filter(v => v > 0);
  const margens   = skus.map(p => p.margem_pct || 0).filter(v => v > 0);
  const lastros   = skus.map(p => p.inventario_valorizado || 0).filter(v => v > 0);
  const estoque   = skus.reduce((s, p) => s + (p.estoque_atual || 0), 0);

  return {
    precoMedioIQR:  iqrMean(precos),
    custoMedioIQR:  iqrMean(custos),
    margemMediaIQR: iqrMean(margens),
    lastroTotalIQR: lastros.reduce((s, v) => s + v, 0), // soma real do inventário
    estoqueTotal:   estoque,
    count:          skus.length,
  };
}

// ── Constrói árvore: h1-h4 agrupadores, h5 dado do SKU (nunca nó) ───────────
export function buildTree(produtos) {
  const root = {};

  for (const raw of produtos) {
    const p  = enrichSku(raw);
    const h1 = (p.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = (p.campo_hierarquico_2 || '').trim();
    const h3 = (p.campo_hierarquico_3 || '').trim();
    const h4 = (p.campo_hierarquico_4 || '').trim();

    const ensure = (parent, key, level) => {
      if (!parent[key]) parent[key] = { label: key, level, children: {}, skus: [] };
      return parent[key];
    };

    const n1 = ensure(root, h1, 1);
    if (!h2) { n1.skus.push(p); continue; }
    const n2 = ensure(n1.children, h2, 2);
    if (!h3) { n2.skus.push(p); continue; }
    const n3 = ensure(n2.children, h3, 3);
    if (!h4) { n3.skus.push(p); continue; }
    const n4 = ensure(n3.children, h4, 4);
    n4.skus.push(p);
  }

  return root;
}

// ── Achatamento por Divergência ──────────────────────────────────────────────
// Cessa quando: (a) nó tem 2+ filhos, (b) nó tem SKUs diretos, ou (c) chegou ao SKU.
function deepCollapse(node) {
  const childKeys = Object.keys(node.children);
  // Parar: divergência (2+ filhos) ou SKUs diretos
  if (childKeys.length !== 1 || node.skus.length > 0) {
    return { label: node.label, node };
  }
  const child = node.children[childKeys[0]];
  const inner = deepCollapse(child);
  return {
    label: `${node.label} › ${inner.label}`,
    node:  inner.node,
  };
}

function resolveCollapsedKey(baseKey, startNode, targetNode) {
  if (startNode === targetNode) return baseKey;
  const childKey = Object.keys(startNode.children)[0];
  return resolveCollapsedKey(
    `${baseKey}||${childKey}`,
    startNode.children[childKey],
    targetNode
  );
}

// ── Flatten recursivo ────────────────────────────────────────────────────────
export function flattenTree(treeNode, expandedKeys, parentKey = '', visualLevel = 0) {
  const rows = [];

  for (const [key, node] of Object.entries(treeNode)) {
    const rawKey  = parentKey ? `${parentKey}||${key}` : key;
    const { label: collapsedLabel, node: finalNode } = deepCollapse(node);
    const nodeKey = resolveCollapsedKey(rawKey, node, finalNode);
    const allSkus = collectSkus(finalNode);
    const agg     = aggregateSkus(allSkus);
    const rowLevel = visualLevel + 1;

    rows.push({
      type:  'group',
      key:   nodeKey,
      label: collapsedLabel,
      level: rowLevel,
      node:  finalNode,
      ...agg,
    });

    if (expandedKeys.has(nodeKey)) {
      if (Object.keys(finalNode.children).length > 0) {
        rows.push(...flattenTree(finalNode.children, expandedKeys, nodeKey, rowLevel));
      }
      for (const sku of finalNode.skus) {
        rows.push({ type: 'sku', key: sku.id, produto: sku, level: rowLevel + 1 });
      }
    }
  }

  return rows;
}

// ── Expande até nível visual alvo ───────────────────────────────────────────
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '', visualLevel = 0) {
  const keys = new Set();
  if (visualLevel >= targetLevel) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    const rawKey   = parentKey ? `${parentKey}||${key}` : key;
    const { node: finalNode } = deepCollapse(node);
    const nodeKey  = resolveCollapsedKey(rawKey, node, finalNode);
    const rowLevel = visualLevel + 1;

    keys.add(nodeKey);

    if (rowLevel < targetLevel && Object.keys(finalNode.children).length > 0) {
      buildExpandedForLevel(finalNode.children, targetLevel, nodeKey, rowLevel)
        .forEach(k => keys.add(k));
    }
  }
  return keys;
}

// ── Hook principal ───────────────────────────────────────────────────────────
export function useTreeGrid(produtos) {
  return useMemo(() => buildTree(produtos), [produtos]);
}