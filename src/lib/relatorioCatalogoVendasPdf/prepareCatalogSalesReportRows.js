import {
  aggregateEstoqueDisplay,
  buildCategoryTree,
  buildExpandedForLevel,
  buildTree,
  collectSkus,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  TREE_GRID_EXPAND_ALL_LEVEL,
} from '@/components/produtos/treegrid/catalogTreeCore';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import {
  aggregateCatalogSalesVelocity,
  buildCatalogSalesVelocityMap,
} from '@/lib/catalogSalesVelocity';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';

function prepareFlatRows(produtos, velocityMap, sortOrder = 'az') {
  const sorted = [...produtos].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return sorted.map((produto) => ({
    type: 'sku',
    produto,
    key: produto.id,
    level: 1,
    velocity: velocityMap[String(produto.id)] || aggregateCatalogSalesVelocity([produto], velocityMap),
    commercial: commercialCostValues(produto),
  }));
}

function enrichTreeRows(rows, velocityMap) {
  return (rows || []).map((row) => {
    if (row.type === 'sku') {
      return {
        ...row,
        velocity: velocityMap[String(row.produto?.id)] || aggregateCatalogSalesVelocity([row.produto], velocityMap),
        commercial: commercialCostValues(row.produto),
      };
    }
    if (row.type === 'group') {
      const skus = collectSkus(row.node);
      const hideGroupTotals = isHeterogeneousGroup(skus, velocityMap);
      return {
        ...row,
        velocity: aggregateCatalogSalesVelocity(skus, velocityMap),
        skuCount: skus.length,
        stock: groupStockTexto(skus, { hideGroupTotals }),
        hideGroupTotals,
        commercial: {
          vCompra: roundToTwoDecimals(row.valorCompraMedio || 0),
          custoCalc: roundToTwoDecimals(row.custoMedio || 0),
        },
      };
    }
    return row;
  });
}

function isHeterogeneousGroup(skus = [], velocityMap = {}) {
  const disp = aggregateEstoqueDisplay(skus);
  if (disp.mode === 'mixed') return true;

  const stockUnits = new Set();
  const velocityUnits = new Set();

  for (const sku of skus) {
    const ap = formatEstoqueApresentacao(sku);
    if (ap?.sigla) stockUnits.add(String(ap.sigla).trim().toUpperCase());
    else if (sku?.unidade_principal) {
      stockUnits.add(String(sku.unidade_principal).trim().toUpperCase());
    }

    const velocity = velocityMap[String(sku?.id)];
    if (velocity?.unidade) velocityUnits.add(String(velocity.unidade).trim().toUpperCase());
  }

  return stockUnits.size > 1 || velocityUnits.size > 1;
}

function resolveExpandedKeysForCatalogView(tree, treeLevel = 1, expandedKeysFromCatalog = null) {
  if (expandedKeysFromCatalog?.length) {
    return new Set(expandedKeysFromCatalog);
  }
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
  expandedKeys: expandedKeysFromCatalog = null,
} = {}) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const velocityMap = buildCatalogSalesVelocityMap(list, pedidos);

  const isFlat = layoutMode === 'plana';
  let rows;

  if (isFlat) {
    rows = prepareFlatRows(list, velocityMap, sortOrder);
  } else {
    const tree = groupByCategory ? buildCategoryTree(list) : buildTree(list);
    const expandedKeys = resolveExpandedKeysForCatalogView(tree, treeLevel, expandedKeysFromCatalog);
    rows = mergeAdjacentDuplicateGroupHeaders(
      flattenTree(tree, expandedKeys, '', 0, sortOrder, { collapseSoloSkuBranches: true }),
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

export function groupStockTexto(skus = [], { hideGroupTotals = false } = {}) {
  if (hideGroupTotals) return { texto: '—', heterogeneous: true };
  const disp = aggregateEstoqueDisplay(skus);
  if (disp.mode === 'empty') return { texto: '—', heterogeneous: false };
  if (disp.mode === 'mixed') return { texto: '—', heterogeneous: true };
  return {
    texto: `${formatQty(disp.quantidade)} ${disp.sigla || 'UN'}`,
    heterogeneous: false,
  };
}

export function commercialCostValues(produto) {
  const cat = getCatalogoComercialView(produto);
  return {
    vCompra: roundToTwoDecimals(cat.valorCompraNaEmbalagem),
    custoCalc: roundToTwoDecimals(cat.custoNaEmbalagem),
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
