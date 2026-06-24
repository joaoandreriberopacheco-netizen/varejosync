import { getAbcdRank } from '@/lib/catalogProdutoPerformance';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';
import {
  aggregateSkus,
  buildTree,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  buildExpandedForLevel,
} from '@/components/produtos/treegrid/useTreeGrid';

const ABCD_LETTERS = ['A', 'B', 'C', 'D'];

export function normalizeAbcdLetter(produto) {
  const letter = String(produto?.abcd || '').trim().toUpperCase();
  return ABCD_LETTERS.includes(letter) ? letter : '?';
}

export function abcdGroupLabel(letter) {
  if (letter === '?') return 'Sem classe ABCD';
  return `Classe ${letter}`;
}

function sortAbcdLetters(a, b) {
  const ra = getAbcdRank(a === '?' ? '' : a);
  const rb = getAbcdRank(b === '?' ? '' : b);
  if (rb !== ra) return rb - ra;
  return String(a).localeCompare(String(b));
}

function prepareRowsForProdutos(produtos, layoutMode, treeLevel, sortOrder) {
  if (layoutMode === 'plana') {
    return (produtos || []).map((produto) => ({ type: 'sku', produto, level: 1, key: produto.id }));
  }

  const tree = buildTree(produtos || []);
  const expanded = buildExpandedForLevel(tree, treeLevel);
  return mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expanded, '', 0, sortOrder));
}

/**
 * Documento do relatório: blocos ABCD (embarque) → linhas hierárquicas ou planas.
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode = 'tree',
  treeLevel = 1,
  sortOrder = 'az',
} = {}) {
  const buckets = new Map();
  for (const p of produtos || []) {
    if (!p || typeof p !== 'object') continue;
    const letter = normalizeAbcdLetter(p);
    if (!buckets.has(letter)) buckets.set(letter, []);
    buckets.get(letter).push(p);
  }

  const letters = [...buckets.keys()].sort(sortAbcdLetters);
  const groups = letters.map((letter) => {
    const list = buckets.get(letter) || [];
    return {
      letter,
      label: abcdGroupLabel(letter),
      produtos: list,
      agg: aggregateSkus(list),
      totals: sumCatalogStockTotals(list),
      rows: prepareRowsForProdutos(list, layoutMode, treeLevel, sortOrder),
    };
  });

  return {
    mode: layoutMode === 'plana' ? 'plana' : 'tree',
    groups,
  };
}

/** @deprecated use prepareCatalogStockReportDocument */
export function prepareCatalogStockReportRows(opts = {}) {
  const doc = prepareCatalogStockReportDocument(opts);
  if (doc.mode === 'plana') {
    return { mode: 'plana', produtos: doc.groups.flatMap((g) => g.produtos) };
  }
  return { mode: 'tree', rows: doc.groups.flatMap((g) => g.rows) };
}
