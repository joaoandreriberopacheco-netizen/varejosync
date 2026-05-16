import { deepCollapse, buildExpandedForLevel } from '@/components/produtos/treegrid/useTreeGrid';

export { buildExpandedForLevel };

/** Soma métricas de vendas de linhas do relatório de margem. */
export function aggregateMarginItems(items) {
  if (!items?.length) {
    return {
      quantidade_vendida: 0,
      total_recebido: 0,
      total_desconto_venda: 0,
      receita_liquida: 0,
      custo_total: 0,
      lucro_total: 0,
      valor_unitario_medio: 0,
      markup_percentual: 0,
      count: 0,
    };
  }

  const quantidade_vendida = items.reduce((s, r) => s + (r.quantidade_vendida || 0), 0);
  const total_recebido = items.reduce((s, r) => s + (r.total_recebido || 0), 0);
  const total_desconto_venda = items.reduce((s, r) => s + (r.total_desconto_venda || 0), 0);
  const receita_liquida = items.reduce((s, r) => s + (r.receita_liquida || 0), 0);
  const custo_total = items.reduce((s, r) => s + (r.custo_total || 0), 0);
  const lucro_total = items.reduce((s, r) => s + (r.lucro_total || 0), 0);

  return {
    quantidade_vendida,
    total_recebido,
    total_desconto_venda,
    receita_liquida,
    custo_total,
    lucro_total,
    valor_unitario_medio:
      quantidade_vendida > 0 ? total_recebido / quantidade_vendida : 0,
    markup_percentual: custo_total > 0 ? (lucro_total / custo_total) * 100 : 0,
    count: items.length,
  };
}

function collectMarginItems(node) {
  if (!node) return [];
  const items = [...(node.items || [])];
  if (node.children) {
    for (const child of Object.values(node.children)) {
      items.push(...collectMarginItems(child));
    }
  }
  return items;
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

/**
 * Árvore h1–h4 com folhas = linhas de margem por produto vendido.
 * Estrutura compatível com buildExpandedForLevel do catálogo.
 */
export function buildMarginTree(marginItems) {
  const root = {};

  for (const item of marginItems) {
    const h1 = (item.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = (item.campo_hierarquico_2 || '').trim();
    const h3 = (item.campo_hierarquico_3 || '').trim();
    const h4 = (item.campo_hierarquico_4 || '').trim();

    const ensure = (parent, key, level) => {
      if (!parent[key]) parent[key] = { label: key, level, children: {}, items: [] };
      return parent[key];
    };

    if (!h2) {
      if (!root._rootItems) root._rootItems = [];
      root._rootItems.push(item);
      continue;
    }
    const n1 = ensure(root, h1, 1);
    const n2 = ensure(n1.children, h2, 2);
    if (!h3) {
      n2.items.push(item);
      continue;
    }
    const n3 = ensure(n2.children, h3, 3);
    if (!h4) {
      n3.items.push(item);
      continue;
    }
    const n4 = ensure(n3.children, h4, 4);
    n4.items.push(item);
  }

  function precompute(nodeMap) {
    for (const node of Object.values(nodeMap)) {
      if (node.children && Object.keys(node.children).length > 0) {
        precompute(node.children);
      }
      node._agg = aggregateMarginItems(collectMarginItems(node));
    }
  }
  precompute(root);

  return root;
}

/** Lista todas as folhas (produtos) da árvore — exportação PDF/CSV. */
export function collectAllMarginLeaves(tree) {
  if (!tree) return [];
  const leaves = [...(tree._rootItems || [])];
  function walk(nodeMap) {
    for (const [key, node] of Object.entries(nodeMap)) {
      if (key === '_rootItems') continue;
      leaves.push(...(node.items || []));
      if (node.children) walk(node.children);
    }
  }
  walk(tree);
  return leaves;
}

/**
 * Achata a árvore de margem para linhas de tabela (grupo | produto).
 * Mesma lógica visual do TreeGrid de produtos.
 */
export function flattenMarginTree(treeNode, expandedKeys, parentKey = '', visualLevel = 0) {
  const rows = [];

  if (visualLevel === 0 && treeNode._rootItems) {
    for (const item of treeNode._rootItems) {
      rows.push({
        type: 'produto',
        key: item.produto_id || item.codigo_interno || item.nome,
        item,
        level: 1,
      });
    }
  }

  for (const [key, node] of Object.entries(treeNode)) {
    if (key === '_rootItems') continue;
    const rawKey = parentKey ? `${parentKey}||${key}` : key;
    const { label: collapsedLabel, node: finalNode } = deepCollapse(node);
    const nodeKey = resolveCollapsedKey(rawKey, node, finalNode);
    const agg = finalNode._agg || aggregateMarginItems(collectMarginItems(finalNode));
    const rowLevel = visualLevel + 1;
    const isLeafGroup = Object.keys(finalNode.children).length === 0;
    const isRoot = visualLevel === 0;

    if (!isRoot && isLeafGroup) {
      for (const item of finalNode.items) {
        rows.push({
          type: 'produto',
          key: item.produto_id || item.codigo_interno || item.nome,
          item,
          level: rowLevel,
        });
      }
      continue;
    }

    rows.push({
      type: 'group',
      key: nodeKey,
      label: collapsedLabel,
      level: rowLevel,
      isLeafGroup,
      ...agg,
    });

    if (isLeafGroup || expandedKeys.has(nodeKey)) {
      if (Object.keys(finalNode.children).length > 0) {
        rows.push(...flattenMarginTree(finalNode.children, expandedKeys, nodeKey, rowLevel));
      }
      for (const item of finalNode.items) {
        rows.push({
          type: 'produto',
          key: item.produto_id || item.codigo_interno || item.nome,
          item,
          level: rowLevel + 1,
        });
      }
    }
  }

  return rows;
}
