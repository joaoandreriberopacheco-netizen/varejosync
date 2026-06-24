import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';

/**
 * Lista plana de SKUs em ordem alfabética (nome A → Z).
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode: _layoutMode = 'tree',
  treeLevel: _treeLevel = 1,
  sortOrder: _sortOrder = 'az',
} = {}) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const sorted = [...list].sort((a, b) => compareProdutosForCatalogSort(a, b, 'az'));
  const rows = sorted.map((produto) => ({
    type: 'sku',
    produto,
    key: produto.id,
  }));

  return {
    mode: 'plana',
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
