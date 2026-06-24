import { getAbcdRank, compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import { sumCatalogStockTotals, lineEstoqueQuantidade } from '@/lib/catalogStockTotals';
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

function prepareTreeRows(produtos, treeLevel, sortOrder) {
  const tree = buildTree(produtos || []);
  const expanded = buildExpandedForLevel(tree, treeLevel);
  return mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expanded, '', 0, sortOrder));
}

function prepareFlatSkuRows(produtos, sortOrder) {
  const list = [...(produtos || [])].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return list.map((produto) => ({ type: 'sku', produto, level: 1, key: produto.id }));
}

/**
 * Documento: blocos ABCD → hierarquia do catálogo (ou lista plana) dentro de cada classe.
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode = 'tree',
  treeLevel = 1,
  sortOrder = 'az',
} = {}) {
  const isPlana = layoutMode === 'plana';
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
    const agg = aggregateSkus(list);
    const estoqueTotal = list.reduce((s, p) => s + lineEstoqueQuantidade(p), 0);
    const rows = isPlana
      ? prepareFlatSkuRows(list, sortOrder)
      : prepareTreeRows(list, treeLevel, sortOrder);
    return {
      letter,
      label: abcdGroupLabel(letter),
      produtos: list,
      agg: { ...agg, estoqueTotal },
      totals: sumCatalogStockTotals(list),
      rows,
    };
  });

  return { mode: isPlana ? 'plana' : 'tree', groups };
}

/** @deprecated */
export function prepareCatalogStockReportRows(opts = {}) {
  const doc = prepareCatalogStockReportDocument(opts);
  return {
    mode: doc.mode,
    produtos: doc.groups.flatMap((g) => g.produtos),
    rows: doc.groups.flatMap((g) => g.rows),
  };
}
