import { useMemo } from 'react';

// ── IQR Mean: remove outliers e retorna média do miolo ───────────────────────
export function iqrMean(values) {
  if (!values || values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.ceil(sorted.length * 0.75) - 1] ?? sorted[sorted.length - 1];
  const core = sorted.filter(v => v >= q1 && v <= q3);
  const used = core.length > 0 ? core : sorted;
  return used.reduce((s, v) => s + v, 0) / used.length;
}

// ── Coleta todos os SKUs descendentes de um nó ────────────────────────────────
export function collectSkus(node) {
  if (!node) return [];
  const skus = [...(node.skus || [])];
  if (node.children) {
    for (const child of Object.values(node.children)) {
      skus.push(...collectSkus(child));
    }
  }
  return skus;
}

// ── Calcula o custo real de um produto (usa preco_custo_calculado se válido,
//    senão reconstrói a partir dos componentes) ────────────────────────────────
export function calcCusto(p) {
  const salvo = p.preco_custo_calculado || 0;
  if (salvo > 0) return salvo;
  // Reconstrói a partir dos componentes de custo
  const vc = p.valor_compra || 0;
  return vc
    + (p.custo_frete_padrao || 0)
    + (p.custo_imposto1_padrao || 0)
    + (p.custo_imposto2_padrao || 0)
    + (p.custo_outros_padrao || 0)
    - (p.desconto_compra_padrao || 0);
}

// ── Calcula markup real: sempre a partir de custo e preço de venda ────────────
export function calcMarkup(p) {
  const custo = calcCusto(p);
  const pv = p.preco_venda_padrao || 0;
  if (custo > 0 && pv > 0) return ((pv - custo) / custo) * 100;
  // Fallback: usa o percentual configurado se não há dados de custo/venda
  if (p.preco_venda_percentual > 0) return p.preco_venda_percentual;
  return 0;
}

// ── Agrega métricas IQR para um conjunto de SKUs ─────────────────────────────
export function aggregateSkus(skus) {
  const precos        = skus.map(p => p.preco_venda_padrao || 0).filter(v => v > 0);
  const custos        = skus.map(p => calcCusto(p)).filter(v => v > 0);
  const valorCompras  = skus.map(p => p.valor_compra || 0).filter(v => v > 0);
  const markups       = skus.map(p => calcMarkup(p)).filter(v => v > 0);
  const margens       = skus.map(p => {
    const pv = p.preco_venda_padrao || 0;
    const pc = calcCusto(p);
    return pv > 0 && pc > 0 ? ((pv - pc) / pv) * 100 : 0;
  }).filter(v => v > 0);
  const lastros = skus.map(p => calcCusto(p) * (p.estoque_atual || 0));

  return {
    precoMedio:      iqrMean(precos),
    custoMedio:      iqrMean(custos),
    valorCompraMedio:iqrMean(valorCompras),
    markupMedio:     iqrMean(markups),
    margemMedia:     iqrMean(margens),
    lastroTotal:     lastros.reduce((s, v) => s + v, 0),
    estoqueTotal:    skus.reduce((s, p) => s + (p.estoque_atual || 0), 0),
    estoqueMinTotal: skus.reduce((s, p) => s + (p.estoque_minimo || 0), 0),
    estoqueIdealTotal: skus.reduce((s, p) => s + (p.estoque_ideal || 0), 0),
    estoqueMaxTotal: skus.reduce((s, p) => s + (p.estoque_maximo || 0), 0),
    pesoTotal:       skus.reduce((s, p) => s + (p.peso_kg || 0), 0),
    count: skus.length,
    criticalCount: skus.filter(p => p.ativo && (p.estoque_atual || 0) <= 0).length,
  };
}

// ── Constrói a árvore: h1-h4 são agrupadores; h5 é dado do SKU, nunca nó ─────
// As agregações são calculadas UMA VEZ aqui, e cacheadas no nó.
// Isso evita recalcular aggregateSkus() em cada chamada de flattenTree.
export function buildTree(produtos) {
  const root = {};

  for (const p of produtos) {
    p.inventario_valorizado = (p.preco_custo_calculado || 0) * (p.estoque_atual || 0);
    const h1 = (p.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = (p.campo_hierarquico_2 || '').trim();
    const h3 = (p.campo_hierarquico_3 || '').trim();
    const h4 = (p.campo_hierarquico_4 || '').trim();

    const ensure = (parent, key, level) => {
      if (!parent[key]) parent[key] = { label: key, level, children: {}, skus: [] };
      return parent[key];
    };

    if (!h2) {
      if (!root._rootSkus) root._rootSkus = [];
      root._rootSkus.push(p);
      continue;
    }
    const n1 = ensure(root, h1, 1);
    const n2 = ensure(n1.children, h2, 2);
    if (!h3) { n2.skus.push(p); continue; }
    const n3 = ensure(n2.children, h3, 3);
    if (!h4) { n3.skus.push(p); continue; }
    const n4 = ensure(n3.children, h4, 4);
    n4.skus.push(p);
  }

  // Pré-calcula agregações em cada nó (bottom-up) para evitar recalcular no flatten
  function precompute(nodeMap) {
    for (const node of Object.values(nodeMap)) {
      if (node.children && Object.keys(node.children).length > 0) {
        precompute(node.children);
      }
      const allSkus = collectSkus(node);
      node._agg = aggregateSkus(allSkus);
    }
  }
  precompute(root);

  return root;
}

// ── Deep Collapse: funde cadeia de filho-único sem SKUs diretos ───────────────
// Retorna { label, node } onde label é o path fundido e node é o nó final diverso
export function deepCollapse(node) {
  if (!node || !node.children) return { label: node?.label || '', node };
  const childKeys = Object.keys(node.children);
  if (childKeys.length === 1 && node.skus.length === 0) {
    const child = node.children[childKeys[0]];
    const inner = deepCollapse(child);
    return {
      label: `${node.label} › ${inner.label}`,
      node: inner.node,
    };
  }
  return { label: node.label, node };
}

// Reconstrói a chave após deep collapse percorrendo o caminho fundido
function resolveCollapsedKey(baseKey, startNode, targetNode) {
  if (startNode === targetNode) return baseKey;
  const childKey = Object.keys(startNode.children)[0];
  return resolveCollapsedKey(
    `${baseKey}||${childKey}`,
    startNode.children[childKey],
    targetNode
  );
}

// ── Flatten recursivo com deep collapsing ─────────────────────────────────────
export function flattenTree(treeNode, expandedKeys, parentKey = '', visualLevel = 0) {
  const rows = [];

  // Se estamos na raiz e há SKUs diretos (sem grupo), adiciona-os primeiro
  if (visualLevel === 0 && treeNode._rootSkus) {
    for (const sku of treeNode._rootSkus) {
      const custo = calcCusto(sku);
      rows.push({
        type:    'sku',
        key:     sku.id,
        produto: sku,
        level:   1,
        lastro:  custo * (sku.estoque_atual || 0),
        margem:  sku.preco_venda_padrao > 0 && custo > 0
          ? ((sku.preco_venda_padrao - custo) / sku.preco_venda_padrao) * 100
          : 0,
        markup:  calcMarkup(sku),
      });
    }
  }

  for (const [key, node] of Object.entries(treeNode)) {
    // Pula a propriedade _rootSkus
    if (key === '_rootSkus') continue;
    const rawKey   = parentKey ? `${parentKey}||${key}` : key;
    const { label: collapsedLabel, node: finalNode } = deepCollapse(node);
    const nodeKey  = resolveCollapsedKey(rawKey, node, finalNode);
    const allSkus  = collectSkus(finalNode);
    const agg      = aggregateSkus(allSkus);
    const rowLevel = visualLevel + 1;

    const isLeafGroup = Object.keys(finalNode.children).length === 0;
    const isRoot      = visualLevel === 0;

    // Achatamento Agressivo: sub-grupos leaf (não raiz) omitem cabeçalho —
    // função só é chamada recursivamente quando o pai está expandido, logo
    // não precisamos revalidar expandedKeys aqui.
    if (!isRoot && isLeafGroup) {
      for (const sku of finalNode.skus) {
        const custo = calcCusto(sku);
        rows.push({
          type:    'sku',
          key:     sku.id,
          produto: sku,
          level:   rowLevel,
          lastro:  custo * (sku.estoque_atual || 0),
          margem:  sku.preco_venda_padrao > 0 && custo > 0
            ? ((sku.preco_venda_padrao - custo) / sku.preco_venda_padrao) * 100
            : 0,
          markup:  calcMarkup(sku),
        });
      }
      continue;
    }

    rows.push({
      type: 'group',
      key:  nodeKey,
      label: collapsedLabel,
      level: rowLevel,
      node: finalNode,
      isLeafGroup,
      ...agg,
    });

    if (isLeafGroup || expandedKeys.has(nodeKey)) {
      if (Object.keys(finalNode.children).length > 0) {
        rows.push(...flattenTree(finalNode.children, expandedKeys, nodeKey, rowLevel));
      }
      for (const sku of finalNode.skus) {
        const custo = calcCusto(sku);
        rows.push({
          type:    'sku',
          key:     sku.id,
          produto: sku,
          level:   rowLevel + 1,
          lastro:  custo * (sku.estoque_atual || 0),
          margem:  sku.preco_venda_padrao > 0 && custo > 0
            ? ((sku.preco_venda_padrao - custo) / sku.preco_venda_padrao) * 100
            : 0,
          markup:  calcMarkup(sku),
        });
      }
    }
  }

  return rows;
}

// ── Expande até nível visual alvo ────────────────────────────────────────────
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '', visualLevel = 0) {
  const keys = new Set();
  if (!treeNode || visualLevel >= targetLevel) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    const rawKey  = parentKey ? `${parentKey}||${key}` : key;
    const { node: finalNode } = deepCollapse(node);
    const nodeKey = resolveCollapsedKey(rawKey, node, finalNode);
    const rowLevel = visualLevel + 1;

    keys.add(nodeKey);

    if (rowLevel < targetLevel && Object.keys(finalNode.children).length > 0) {
      const childKeys = buildExpandedForLevel(
        finalNode.children, targetLevel, nodeKey, rowLevel
      );
      childKeys.forEach(k => keys.add(k));
    }
  }
  return keys;
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useTreeGrid(produtos) {
  return useMemo(() => buildTree(produtos), [produtos]);
}