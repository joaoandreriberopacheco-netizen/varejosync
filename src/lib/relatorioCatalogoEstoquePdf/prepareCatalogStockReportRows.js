import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';
import {
  buildTree,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  buildExpandedForLevel,
} from '@/components/produtos/treegrid/useTreeGrid';

/** Árvore completa (grupos + SKUs); nível visual vem do flattenTree. */
function prepareTreeRowsComDiagrama(produtos, sortOrder) {
  const tree = buildTree(produtos || []);
  const expanded = buildExpandedForLevel(tree, 99);
  return mergeAdjacentDuplicateGroupHeaders(
    flattenTree(tree, expanded, '', 0, sortOrder, { showLeafGroupHeaders: true }),
  );
}

function prepareSkuRowsPlana(produtos, sortOrder) {
  const list = [...(produtos || [])].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return list.map((produto) => ({
    type: 'sku',
    produto,
    level: 1,
    key: produto.id,
  }));
}

/**
 * Documento: hierarquia do catálogo; resumo agregado só nas linhas de família (grupo).
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode = 'tree',
  treeLevel: _treeLevel = 1,
  sortOrder = 'az',
} = {}) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const isPlana = layoutMode === 'plana';
  const rows = isPlana
    ? prepareSkuRowsPlana(list, sortOrder)
    : prepareTreeRowsComDiagrama(list, sortOrder);

  return {
    mode: isPlana ? 'plana' : 'tree',
    produtos: list,
    totals: sumCatalogStockTotals(list),
    rows,
  };
}

/** @deprecated */
export function prepareCatalogStockReportRows(opts = {}) {
  const doc = prepareCatalogStockReportDocument(opts);
  return {
    mode: doc.mode,
    produtos: doc.produtos,
    rows: doc.rows,
  };
}
