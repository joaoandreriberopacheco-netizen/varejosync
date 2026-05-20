import { isCadastroIncompleto } from '@/components/produtos/ProdutosHelpers';

export const DEFAULT_PRODUTO_FILTERS = {
  searchTerm: '',
  categoria: 'all',
  fornecedorId: 'all',
  statusEstoque: 'all',
  tag: '',
  cadastroIncompleto: 'all',
};

/** Mesma lógica de filtros do catálogo (`Produtos.jsx`). */
export function filterProdutos(produtos, filters) {
  if (!Array.isArray(produtos)) return [];
  return produtos.filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const nome = p.nome || '';
    const codigo = p.codigo_interno || '';

    const searchTermMatch =
      nome.toLowerCase().includes((filters.searchTerm || '').toLowerCase()) ||
      codigo.toLowerCase().includes((filters.searchTerm || '').toLowerCase());
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
    filters.categoria !== 'all' && filters.categoria,
    filters.fornecedorId !== 'all' && filters.fornecedorId,
    filters.statusEstoque !== 'all' && filters.statusEstoque,
    filters.tag,
    filters.cadastroIncompleto !== 'all' && filters.cadastroIncompleto,
  ].filter(Boolean).length;
}
