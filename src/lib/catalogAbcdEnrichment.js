import { enrichProdutosComIep } from '@/lib/calcularIepProdutos';

/**
 * Classe ABCD efetiva do produto para filtro/ordenação no catálogo.
 *
 * Ordem de leitura:
 * 1. iep_classe — gravada pelo job calcularIEP (ou trava manual)
 * 2. abcd — campo do cadastro / planilha / último cálculo persistido
 *
 * O filtro do catálogo NÃO deve olhar só `abcd`: muitos itens têm a classe
 * apenas em `iep_classe` até o job gravar os dois campos.
 */
export function resolveProdutoAbcdClasse(produto) {
  if (!produto) return '';
  if (produto.iep_trava_manual) {
    const locked = String(produto.iep_classe || produto.abcd || '').toUpperCase().trim();
    if (locked) return locked;
  }
  return String(produto.abcd || produto.iep_classe || '').toUpperCase().trim();
}

export function produtoMatchesAbcdFilter(produto, abcdFilter) {
  if (!abcdFilter || abcdFilter === 'all') return true;
  const letter = resolveProdutoAbcdClasse(produto);
  if (!letter) return false;
  return letter === String(abcdFilter).toUpperCase();
}

/** Filtro/ordenação ABCD precisa da curva calculada (90d) — não só do campo gravado no cadastro. */
export function needsCatalogAbcdEnrichment(filters, sortOrder) {
  if (filters?.abcd && filters.abcd !== 'all') return true;
  const sort = String(sortOrder || '');
  return sort.startsWith('abcd_');
}

/**
 * Estado da busca de pedidos 90d para o filtro ABCD.
 * - idle: filtro ABCD inativo
 * - loading: aguardando vendas — não aplicar filtro ABCD ainda
 * - ok: vendas carregadas — recalcular curva no cliente
 * - error: falha na API — usar classe gravada (abcd / iep_classe)
 */
export function getAbcdPedidosFetchState(needsEnrichment, pedidosQuery) {
  if (!needsEnrichment) return 'idle';
  if (pedidosQuery?.isFetching) return 'loading';
  if (pedidosQuery?.isSuccess && Array.isArray(pedidosQuery.data)) return 'ok';
  if (pedidosQuery?.isError) return 'error';
  return 'loading';
}

/**
 * Enriquece com curva calculada só quando as vendas 90d foram buscadas com sucesso.
 * Se a API falhar, devolve a lista original (filtro usa iep_classe/abcd gravados).
 */
export function enrichProdutosForAbcdFilter(produtos, pedidos90d, fetchState = 'idle') {
  if (fetchState !== 'ok' || !Array.isArray(pedidos90d)) return produtos;
  return enrichProdutosComIep(produtos, pedidos90d);
}

/** Enquanto carrega vendas, não aplicar filtro ABCD (evita lista vazia com classe em branco). */
export function getEffectiveAbcdFilters(filters, { fetchState = 'idle' } = {}) {
  if (!filters || filters.abcd === 'all') return filters;
  if (fetchState === 'loading') {
    return { ...filters, abcd: 'all' };
  }
  return filters;
}
