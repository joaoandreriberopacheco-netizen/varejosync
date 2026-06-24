import {
  aggregatePerformanceFromSkus,
  getAbcdRank,
  compareProdutosForCatalogSort,
} from '@/lib/catalogProdutoPerformance';
import { grupoAbcdKey } from '@/lib/calcularIepProdutos';
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

/** ABCD da família (nível 2 / h1+h2); filhos herdam a mesma letra no relatório. */
function buildFamilyAbcdLookup(produtos) {
  const byFamily = new Map();
  for (const p of produtos || []) {
    if (!p || typeof p !== 'object') continue;
    const key = grupoAbcdKey(p);
    if (!byFamily.has(key)) byFamily.set(key, []);
    byFamily.get(key).push(p);
  }

  const lookup = new Map();
  for (const [key, skus] of byFamily) {
    const { abcdDominante } = aggregatePerformanceFromSkus(skus);
    const dominant = String(abcdDominante || '').trim().toUpperCase();
    if (ABCD_LETTERS.includes(dominant)) {
      lookup.set(key, dominant);
      continue;
    }
    const fallback = skus.map(normalizeAbcdLetter).find((l) => l !== '?') || '?';
    lookup.set(key, fallback);
  }
  return lookup;
}

function abcdLetterForReportBucket(produto, familyLookup) {
  const key = grupoAbcdKey(produto);
  return familyLookup.get(key) || normalizeAbcdLetter(produto);
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
 * Documento: blocos ABCD (família nível 2) → diagrama hierárquico + SKUs alinhados.
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
  layoutMode = 'tree',
  treeLevel: _treeLevel = 1,
  sortOrder = 'az',
} = {}) {
  const isPlana = layoutMode === 'plana';
  const familyAbcd = buildFamilyAbcdLookup(produtos);
  const buckets = new Map();
  for (const p of produtos || []) {
    if (!p || typeof p !== 'object') continue;
    const letter = abcdLetterForReportBucket(p, familyAbcd);
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
      : prepareTreeRowsComDiagrama(list, sortOrder);
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
