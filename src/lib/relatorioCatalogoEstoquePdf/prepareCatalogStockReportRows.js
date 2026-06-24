import { getAbcdRank, compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';
import { sumCatalogStockTotals, lineEstoqueQuantidade } from '@/lib/catalogStockTotals';
import { aggregateSkus } from '@/components/produtos/treegrid/useTreeGrid';

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

function sortProdutosFlat(produtos, sortOrder = 'az') {
  return [...(produtos || [])].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
}

/**
 * Documento do relatório: blocos ABCD com lista plana de SKUs (sem hierarquia de catálogo).
 */
export function prepareCatalogStockReportDocument({
  produtos = [],
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
    const list = sortProdutosFlat(buckets.get(letter) || [], sortOrder);
    const agg = aggregateSkus(list);
    const estoqueTotal = list.reduce((s, p) => s + lineEstoqueQuantidade(p), 0);
    return {
      letter,
      label: abcdGroupLabel(letter),
      produtos: list,
      agg: { ...agg, estoqueTotal },
      totals: sumCatalogStockTotals(list),
    };
  });

  return { mode: 'plana', groups };
}

/** @deprecated */
export function prepareCatalogStockReportRows(opts = {}) {
  const doc = prepareCatalogStockReportDocument(opts);
  return { mode: 'plana', produtos: doc.groups.flatMap((g) => g.produtos) };
}
