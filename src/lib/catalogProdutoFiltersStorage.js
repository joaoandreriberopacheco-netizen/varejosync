import { DEFAULT_PRODUTO_FILTERS } from '@/lib/filterProdutos';

/** Filtros do catálogo partilhados entre Produtos e Relatório de estoque (sessionStorage). */
export const CATALOG_PRODUTO_FILTERS_STORAGE_KEY = 'varejosync.catalogoProdutoFilters';

export function normalizeCatalogProdutoFilters(raw) {
  const base = { ...DEFAULT_PRODUTO_FILTERS };
  if (!raw || typeof raw !== 'object') return base;
  return {
    searchTerm: String(raw.searchTerm ?? ''),
    searchStartsWith: Boolean(raw.searchStartsWith),
    categoria: raw.categoria || 'all',
    fornecedorId: raw.fornecedorId || 'all',
    statusEstoque: raw.statusEstoque || 'all',
    tag: String(raw.tag ?? ''),
    cadastroIncompleto: raw.cadastroIncompleto || 'all',
  };
}

export function loadCatalogProdutoFilters() {
  try {
    const raw = sessionStorage.getItem(CATALOG_PRODUTO_FILTERS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRODUTO_FILTERS };
    return normalizeCatalogProdutoFilters(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PRODUTO_FILTERS };
  }
}

export function saveCatalogProdutoFilters(filters) {
  try {
    sessionStorage.setItem(
      CATALOG_PRODUTO_FILTERS_STORAGE_KEY,
      JSON.stringify(normalizeCatalogProdutoFilters(filters))
    );
  } catch {
    /* quota / private mode */
  }
}
