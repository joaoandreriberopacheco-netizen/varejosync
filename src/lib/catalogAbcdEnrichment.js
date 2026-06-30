import { enrichProdutosComIep } from '@/lib/calcularIepProdutos';

/** Filtro/ordenação ABCD precisa da curva calculada (90d) — não só do campo gravado no cadastro. */
export function needsCatalogAbcdEnrichment(filters, sortOrder) {
  if (filters?.abcd && filters.abcd !== 'all') return true;
  const sort = String(sortOrder || '');
  return sort.startsWith('abcd_');
}

/**
 * Enriquece produtos com ABCD calculado quando os pedidos 90d já foram buscados.
 * Enquanto `ready` é false, devolve a lista original (evita filtrar com abcd vazio).
 */
export function enrichProdutosForAbcdFilter(produtos, pedidos90d, { ready = true } = {}) {
  if (!ready || !Array.isArray(pedidos90d)) return produtos;
  return enrichProdutosComIep(produtos, pedidos90d);
}

/** Não aplicar filtro ABCD até a curva estar calculada — evita sumir produtos com abcd vazio no BD. */
export function getEffectiveAbcdFilters(filters, { needsEnrichment, enrichmentReady }) {
  if (!filters || filters.abcd === 'all') return filters;
  if (needsEnrichment && !enrichmentReady) {
    return { ...filters, abcd: 'all' };
  }
  return filters;
}
