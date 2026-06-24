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

function produtoNivelDescricao(produto) {
  const h2 = String(produto?.campo_hierarquico_2 || '').trim();
  const h3 = String(produto?.campo_hierarquico_3 || '').trim();
  const h4 = String(produto?.campo_hierarquico_4 || '').trim();
  if (h4) return 4;
  if (h3) return 3;
  if (h2) return 2;
  return 1;
}

/** Profundidade na ficha do produto (h2/h3/h4) — só para recuo da descrição, sem linhas de família. */
function prepareSkuRowsComRecuoHierarquia(produtos, sortOrder) {
  const tree = buildTree(produtos || []);
  // PDF lista todos os SKUs; treeLevel da UI não deve esconder ramos.
  const expanded = buildExpandedForLevel(tree, 99);
  const rows = mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expanded, '', 0, sortOrder));
  return rows
    .filter((row) => row.type === 'sku')
    .map((row) => ({
      ...row,
      level: produtoNivelDescricao(row.produto),
    }));
}

function prepareSkuRowsPlana(produtos, sortOrder) {
  const list = [...(produtos || [])].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
  return list.map((produto) => ({
    type: 'sku',
    produto,
    level: produtoNivelDescricao(produto),
    key: produto.id,
  }));
}

/**
 * Documento: blocos ABCD → SKUs contínuos; recuo da descrição reflecte profundidade na árvore.
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode = 'tree',
  treeLevel: _treeLevel = 1,
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
      ? prepareSkuRowsPlana(list, sortOrder)
      : prepareSkuRowsComRecuoHierarquia(list, sortOrder);
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
