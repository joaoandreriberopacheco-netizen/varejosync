import { buildCategoryTree } from '@/components/produtos/treegrid/useTreeGrid';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import { compareTreeLabels } from '@/lib/treeSort';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';

function prepareFlatRows(produtos, sortOrder = 'az') {
  const sorted = [...produtos].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return sorted.map((produto) => ({
    type: 'sku',
    produto,
    key: produto.id,
  }));
}

function prepareCategoryGroupedRows(produtos, sortOrder = 'az') {
  const tree = buildCategoryTree(produtos);
  const categoryKeys = Object.keys(tree).sort((a, b) => compareTreeLabels(a, b));
  const rows = [];

  for (const key of categoryKeys) {
    const node = tree[key];
    const skus = [...(node?.skus || [])].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
    if (!skus.length) continue;

    const totals = sumCatalogStockTotals(skus);
    rows.push({
      type: 'group',
      label: key,
      count: skus.length,
      totals,
      key: `cat:${key}`,
    });

    for (const produto of skus) {
      rows.push({ type: 'sku', produto, key: produto.id });
    }

    rows.push({
      type: 'category_subtotal',
      label: key,
      totals,
      key: `subtotal:${key}`,
    });
  }

  return rows;
}

/**
 * Monta linhas do relatório PDF (plana ou agrupada por categoria).
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode: _layoutMode = 'tree',
  treeLevel: _treeLevel = 1,
  sortOrder = 'az',
  groupByCategory = false,
} = {}) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const rows = groupByCategory
    ? prepareCategoryGroupedRows(list, sortOrder)
    : prepareFlatRows(list, sortOrder);

  return {
    mode: groupByCategory ? 'categoria' : 'plana',
    groupByCategory: Boolean(groupByCategory),
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
