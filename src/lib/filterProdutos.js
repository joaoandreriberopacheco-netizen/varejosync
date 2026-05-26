import { isCadastroIncompleto } from '@/components/produtos/ProdutosHelpers';

export const DEFAULT_PRODUTO_FILTERS = {
  searchTerm: '',
  categoria: 'all',
  fornecedorId: 'all',
  statusEstoque: 'all',
  tag: '',
  cadastroIncompleto: 'all',
};

/** Busca por nome/descrição/códigos: substring, sem distinção de maiúsculas (não exige texto completo). */
export function produtoMatchesSearchTerm(produto, rawTerm) {
  const term = String(rawTerm || '').trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    produto?.nome,
    produto?.descricao,
    produto?.codigo_interno,
    produto?.codigo_barras,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return haystack.some((s) => s.includes(term));
}

/** Mesma lógica de filtros do catálogo (`Produtos.jsx`). */
export function filterProdutos(produtos, filters) {
  if (!Array.isArray(produtos)) return [];
  return produtos.filter((p) => {
    if (!p || typeof p !== 'object') return false;

    const searchTermMatch = produtoMatchesSearchTerm(p, filters.searchTerm);
    const categoriaMatch = filters.categoria === 'all' || p.categoria_nome === filters.categoria;
    const tagMatch =
      !filters.tag ||
      (Array.isArray(p.tags) &&
        p.tags.some((t) => t && t.toLowerCase().includes(String(filters.tag).toLowerCase())));
    const fornecedorMatch =
      filters.fornecedorId === 'all' || p.fornecedor_padrao_id === filters.fornecedorId;

    const statusMatch = () => {
      if (filters.statusEstoque === 'all') return true;
      const estoque = p.estoque_atual || 0;
      const minimo = p.estoque_minimo || 0;

      if (filters.statusEstoque === 'inativo' && !p.ativo) return true;
      if (filters.statusEstoque === 'ok' && p.ativo && estoque > minimo) return true;
      if (filters.statusEstoque === 'baixo' && p.ativo && estoque > 0 && estoque <= minimo) return true;
      if (filters.statusEstoque === 'critico' && p.ativo && (estoque <= 0 || estoque <= minimo / 2))
        return true;
      return false;
    };

    const cadastroMatch = () => {
      if (filters.cadastroIncompleto === 'all') return true;
      const { incompleto } = isCadastroIncompleto(p);
      if (filters.cadastroIncompleto === 'incompleto') return incompleto;
      if (filters.cadastroIncompleto === 'completo') return !incompleto;
      return false;
    };

    return (
      searchTermMatch &&
      categoriaMatch &&
      tagMatch &&
      fornecedorMatch &&
      statusMatch() &&
      cadastroMatch()
    );
  });
}

export function countActiveProdutoFilters(filters) {
  return [
    filters.searchTerm?.trim(),
    filters.categoria !== 'all' && filters.categoria,
    filters.fornecedorId !== 'all' && filters.fornecedorId,
    filters.statusEstoque !== 'all' && filters.statusEstoque,
    filters.tag,
    filters.cadastroIncompleto !== 'all' && filters.cadastroIncompleto,
  ].filter(Boolean).length;
}

/** Texto legível para cabeçalho de impressão / relatório. */
export function describeProdutoFilters(filters, { categorias = [], fornecedores = [] } = {}) {
  const parts = [];
  const term = (filters.searchTerm || '').trim();
  if (term) parts.push(`nome/descrição contém "${term}"`);
  if (filters.categoria && filters.categoria !== 'all') parts.push(`categoria: ${filters.categoria}`);
  if (filters.fornecedorId && filters.fornecedorId !== 'all') {
    const f = fornecedores.find((x) => x.id === filters.fornecedorId);
    parts.push(`fornecedor: ${f?.nome || filters.fornecedorId}`);
  }
  if (filters.statusEstoque && filters.statusEstoque !== 'all') {
    const labels = { ok: 'OK', baixo: 'Baixo', critico: 'Crítico', inativo: 'Inativo' };
    parts.push(`status: ${labels[filters.statusEstoque] || filters.statusEstoque}`);
  }
  if ((filters.tag || '').trim()) parts.push(`tag contém "${filters.tag.trim()}"`);
  if (filters.cadastroIncompleto === 'incompleto') parts.push('cadastro incompleto');
  if (filters.cadastroIncompleto === 'completo') parts.push('cadastro completo');
  return parts.length ? parts.join(' · ') : 'nenhum';
}
