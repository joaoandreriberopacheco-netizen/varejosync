import {
  buildCategoryTree,
  buildExpandedForLevel,
  buildTree,
  collectSkus,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
} from '@/components/produtos/treegrid/useTreeGrid';
import { TREE_GRID_EXPAND_ALL_LEVEL } from '@/components/produtos/treegrid/TreeGrid';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import {
  aggregateCatalogSalesVelocity,
  buildCatalogSalesVelocityMap,
} from '@/lib/catalogSalesVelocity';
import { formatEstoqueApresentacao } from '@/lib/productUnits';

function prepareFlatRows(produtos, velocityMap, sortOrder = 'az') {
  const sorted = [...produtos].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return sorted.map((produto) => ({
    type: 'sku',
    produto,
    key: produto.id,
    level: 1,
    velocity: velocityMap[String(produto.id)] || aggregateCatalogSalesVelocity([produto], velocityMap),
  }));
}

function enrichTreeRows(rows, velocityMap) {
  return (rows || []).map((row) => {
    if (row.type === 'sku') {
      return {
        ...row,
        velocity: velocityMap[String(row.produto?.id)] || aggregateCatalogSalesVelocity([row.produto], velocityMap),
      };
    }
    if (row.type === 'group') {
      const skus = collectSkus(row.node);
      return {
        ...row,
        velocity: aggregateCatalogSalesVelocity(skus, velocityMap),
        skuCount: skus.length,
      };
    }
    return row;
  });
}

function resolveExpandedKeys(tree, treeLevel) {
  const level = Number(treeLevel) || 1;
  if (level <= 1) return new Set();
  if (level >= TREE_GRID_EXPAND_ALL_LEVEL) {
    return buildExpandedForLevel(tree, TREE_GRID_EXPAND_ALL_LEVEL);
  }
  return buildExpandedForLevel(tree, level - 1);
}

/**
 * Monta linhas do relatório de vendas (plana ou hierárquica como no catálogo).
 */
export function prepareCatalogSalesReportDocument({
  produtos = [],
  pedidos = [],
  layoutMode = 'tree',
  treeLevel = 1,
  sortOrder = 'az',
  groupByCategory = false,
} = {}) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const velocityMap = buildCatalogSalesVelocityMap(list, pedidos);

  const isFlat = layoutMode === 'plana';
  let rows;

  if (isFlat) {
    rows = prepareFlatRows(list, velocityMap, sortOrder);
  } else {
    const tree = groupByCategory ? buildCategoryTree(list) : buildTree(list);
    const expandedKeys = resolveExpandedKeys(tree, treeLevel);
    rows = mergeAdjacentDuplicateGroupHeaders(
      flattenTree(tree, expandedKeys, '', 0, sortOrder),
    );
    rows = enrichTreeRows(rows, velocityMap);
  }

  return {
    mode: isFlat ? 'plana' : groupByCategory ? 'categoria' : 'tree',
    groupByCategory: Boolean(groupByCategory),
    treeLevel: Number(treeLevel) || 1,
    produtos: list,
    velocityMap,
    rows,
  };
}

export function stockQuantTexto(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  if (apresent) {
    return {
      texto: `${formatQty(apresent.quantidade)} ${apresent.sigla}`,
      quantidade: apresent.quantidade,
      unidade: apresent.sigla,
    };
  }
  const qtd = Number(produto?.estoque_atual) || 0;
  const un = String(produto?.unidade_principal || 'UN').toUpperCase();
  return { texto: `${formatQty(qtd)} ${un}`, quantidade: qtd, unidade: un };
}

export function velocityQuantTexto(velocity, { showUnit = true } = {}) {
  const qtd = Number(velocity?.qtd ?? velocity?.quantidade ?? 0) || 0;
  const un = velocity?.unidade;
  if (showUnit && un) return `${formatQty(qtd)} ${un}`;
  return formatQty(qtd);
}

function formatQty(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
