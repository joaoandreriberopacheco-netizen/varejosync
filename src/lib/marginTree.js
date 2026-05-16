/** Folhas do nó (catálogo usa skus; margem usa items). */
function nodeLeafItems(node) {
  if (!node) return [];
  if (Array.isArray(node.items)) return node.items;
  if (Array.isArray(node.skus)) return node.skus;
  return [];
}

function nodeChildren(node) {
  return node?.children && typeof node.children === 'object' ? node.children : {};
}

function resolveCollapsedKey(baseKey, startNode, targetNode) {
  if (startNode === targetNode) return baseKey;
  const children = nodeChildren(startNode);
  const childKey = Object.keys(children)[0];
  if (!childKey) return baseKey;
  return resolveCollapsedKey(
    `${baseKey}||${childKey}`,
    children[childKey],
    targetNode
  );
}

/** Deep collapse para árvore de margem (items em vez de skus). */
function deepCollapseMargin(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { label: '', node: node ?? {} };
  }
  const children = nodeChildren(node);
  const childKeys = Object.keys(children);
  if (!childKeys.length) {
    return { label: node.label || '', node };
  }
  if (childKeys.length === 1 && nodeLeafItems(node).length === 0) {
    const child = children[childKeys[0]];
    const inner = deepCollapseMargin(child);
    return {
      label: `${node.label} › ${inner.label}`,
      node: inner.node,
    };
  }
  return { label: node.label || '', node };
}

/** Expande até nível visual alvo (ignora _rootItems na raiz). */
export function buildExpandedForLevel(treeNode, targetLevel, parentKey = '', visualLevel = 0) {
  const keys = new Set();
  if (!treeNode || typeof treeNode !== 'object' || visualLevel >= targetLevel) return keys;

  for (const [key, node] of Object.entries(treeNode)) {
    if (key === '_rootItems' || key === '_rootSkus') continue;
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;

    const rawKey = parentKey ? `${parentKey}||${key}` : key;
    const { node: finalNode } = deepCollapseMargin(node);
    const nodeKey = resolveCollapsedKey(rawKey, node, finalNode);
    const rowLevel = visualLevel + 1;
    const children = nodeChildren(finalNode);

    keys.add(nodeKey);

    if (rowLevel < targetLevel && Object.keys(children).length > 0) {
      const childKeys = buildExpandedForLevel(children, targetLevel, nodeKey, rowLevel);
      childKeys.forEach((k) => keys.add(k));
    }
  }
  return keys;
}

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
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const items = [...nodeLeafItems(node)];
  for (const child of Object.values(nodeChildren(node))) {
    items.push(...collectMarginItems(child));
  }
  return items;
}

/**
 * Árvore h1–h4 com folhas = linhas de margem por produto vendido.
 */
export function buildMarginTree(marginItems) {
  const root = {};
  const list = Array.isArray(marginItems) ? marginItems : [];

  for (const item of list) {
    const h1 = String(item.campo_hierarquico_1 || '(sem grupo)').trim();
    const h2 = String(item.campo_hierarquico_2 || '').trim();
    const h3 = String(item.campo_hierarquico_3 || '').trim();
    const h4 = String(item.campo_hierarquico_4 || '').trim();

    const ensure = (parent, key, level) => {
      if (!parent[key]) {
        parent[key] = { label: key, level, children: {}, items: [] };
      }
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
    if (!nodeMap || typeof nodeMap !== 'object') return;
    for (const [key, node] of Object.entries(nodeMap)) {
      if (key === '_rootItems' || key === '_rootSkus') continue;
      if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
      const children = nodeChildren(node);
      if (Object.keys(children).length > 0) {
        precompute(children);
      }
      node._agg = aggregateMarginItems(collectMarginItems(node));
    }
  }
  precompute(root);

  return root;
}

/** Lista todas as folhas (produtos) da árvore — exportação PDF/CSV. */
export function collectAllMarginLeaves(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const leaves = [...(tree._rootItems || [])];
  function walk(nodeMap) {
    if (!nodeMap || typeof nodeMap !== 'object') return;
    for (const [key, node] of Object.entries(nodeMap)) {
      if (key === '_rootItems' || key === '_rootSkus') continue;
      if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
      leaves.push(...nodeLeafItems(node));
      walk(nodeChildren(node));
    }
  }
  walk(tree);
  return leaves;
}

/**
 * Achata a árvore de margem para linhas de tabela (grupo | produto).
 */
export function flattenMarginTree(treeNode, expandedKeys, parentKey = '', visualLevel = 0) {
  const rows = [];
  const expanded = expandedKeys ?? new Set();
  const root = treeNode && typeof treeNode === 'object' ? treeNode : {};

  if (visualLevel === 0 && Array.isArray(root._rootItems)) {
    for (const item of root._rootItems) {
      rows.push({
        type: 'produto',
        key: item.produto_id || item.codigo_interno || item.nome,
        item,
        level: 1,
      });
    }
  }

  for (const [key, node] of Object.entries(root)) {
    if (key === '_rootItems' || key === '_rootSkus') continue;
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;

    const rawKey = parentKey ? `${parentKey}||${key}` : key;
    const { label: collapsedLabel, node: finalNode } = deepCollapseMargin(node);
    const nodeKey = resolveCollapsedKey(rawKey, node, finalNode);
    const agg = finalNode._agg || aggregateMarginItems(collectMarginItems(finalNode));
    const rowLevel = visualLevel + 1;
    const children = nodeChildren(finalNode);
    const leafItems = nodeLeafItems(finalNode);
    const isLeafGroup = Object.keys(children).length === 0;
    const isRoot = visualLevel === 0;

    if (!isRoot && isLeafGroup) {
      for (const item of leafItems) {
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

    if (isLeafGroup || expanded.has(nodeKey)) {
      if (Object.keys(children).length > 0) {
        rows.push(...flattenMarginTree(children, expanded, nodeKey, rowLevel));
      }
      for (const item of leafItems) {
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
