import { isCadastroIncompleto } from '@/components/produtos/ProdutosHelpers';
import { parseSearchTerms } from '@/lib/searchTokens';

export const DEFAULT_PRODUTO_FILTERS = {
  searchTerm: '',
  /** false = contém (substring); true = começa com (prefixo), ambos sem distinção de maiúsculas */
  searchStartsWith: false,
  categoria: 'all',
  fornecedorId: 'all',
  statusEstoque: 'all',
  tag: '',
  cadastroIncompleto: 'all',
  ativoStatus: 'ativos',
  quantidadeOperador: 'all',
  quantidadeValor: '',
  quantidadeValorAte: '',
};

function getSearchTokens(rawTerm) {
  return parseSearchTerms(rawTerm);
}

function parseQuantityFilterNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasActiveQuantityFilter(filters) {
  if (!filters || filters.quantidadeOperador === 'all') return false;
  if (filters.quantidadeOperador === 'between') {
    return (
      parseQuantityFilterNumber(filters.quantidadeValor) !== null ||
      parseQuantityFilterNumber(filters.quantidadeValorAte) !== null
    );
  }
  return parseQuantityFilterNumber(filters.quantidadeValor) !== null;
}

/** Atalho do catálogo: somente produtos com estoque > 0 (quantidade maior que zero). */
export function isSomentePositivosFilter(filters) {
  if (!filters || filters.quantidadeOperador !== 'gt') return false;
  if (String(filters.quantidadeValorAte ?? '').trim()) return false;
  const valor = parseQuantityFilterNumber(filters.quantidadeValor);
  return valor === 0;
}

/** Busca por nome/descrição/códigos; espaço ou ";" exigem múltiplos termos. */
export function produtoMatchesSearchTerm(produto, rawTerm, options = {}) {
  const terms = getSearchTokens(rawTerm);
  if (terms.length === 0) return true;
  const startsWith = options.startsWith ?? options.searchStartsWith ?? false;
  const haystack = [
    produto?.nome,
    produto?.descricao,
    produto?.codigo_interno,
    produto?.codigo_barras,
    produto?.marca,
    produto?.categoria_nome,
    ...(Array.isArray(produto?.tags) ? produto.tags : []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return terms.every((term) =>
    haystack.some((s) => (startsWith ? s.startsWith(term) : s.includes(term)))
  );
}

/** Mesma lógica de filtros do catálogo (`Produtos.jsx`). */
export function filterProdutos(produtos, filters) {
  if (!Array.isArray(produtos)) return [];
  return produtos.filter((p) => {
    if (!p || typeof p !== 'object') return false;

    const searchTermMatch = produtoMatchesSearchTerm(p, filters.searchTerm, {
      startsWith: !!filters.searchStartsWith,
    });
    const categoriaMatch = filters.categoria === 'all' || p.categoria_nome === filters.categoria;
    const tagMatch =
      !filters.tag ||
      (Array.isArray(p.tags) &&
        p.tags.some((t) => t && t.toLowerCase().includes(String(filters.tag).toLowerCase())));
    const fornecedorMatch =
      filters.fornecedorId === 'all' || p.fornecedor_padrao_id === filters.fornecedorId;
    const ativoMatch =
      !filters.ativoStatus ||
      filters.ativoStatus === 'all' ||
      (filters.ativoStatus === 'ativos' && p.ativo) ||
      (filters.ativoStatus === 'inativos' && !p.ativo);

    const quantidadeMatch = () => {
      if (!hasActiveQuantityFilter(filters)) return true;
      const estoque = Number(p.estoque_atual || 0);
      const valor = parseQuantityFilterNumber(filters.quantidadeValor);
      const valorAte = parseQuantityFilterNumber(filters.quantidadeValorAte);

      switch (filters.quantidadeOperador) {
        case 'gt':
          return valor === null ? true : estoque > valor;
        case 'gte':
          return valor === null ? true : estoque >= valor;
        case 'lt':
          return valor === null ? true : estoque < valor;
        case 'lte':
          return valor === null ? true : estoque <= valor;
        case 'between': {
          const min = valor !== null ? valor : -Infinity;
          const max = valorAte !== null ? valorAte : Infinity;
          return estoque >= Math.min(min, max) && estoque <= Math.max(min, max);
        }
        default:
          return true;
      }
    };

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
      ativoMatch &&
      quantidadeMatch() &&
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
    filters.ativoStatus !== DEFAULT_PRODUTO_FILTERS.ativoStatus && filters.ativoStatus,
    hasActiveQuantityFilter(filters) &&
      !isSomentePositivosFilter(filters) &&
      filters.quantidadeOperador,
  ].filter(Boolean).length;
}

/** Texto legível para cabeçalho de impressão / relatório. */
export function describeProdutoFilters(filters, { categorias = [], fornecedores = [] } = {}) {
  const parts = [];
  const term = (filters.searchTerm || '').trim();
  if (term) {
    const modo = filters.searchStartsWith ? 'começa com' : 'contém';
    const termos = getSearchTokens(term);
    parts.push(
      termos.length > 1
        ? `nome/descrição ${modo} todos: ${termos.map((t) => `"${t}"`).join(' + ')}`
        : `nome/descrição ${modo} "${term}"`
    );
  }
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
  if (filters.ativoStatus === 'ativos') parts.push('somente ativos');
  if (filters.ativoStatus === 'inativos') parts.push('somente inativos');
  if (hasActiveQuantityFilter(filters)) {
    const labels = {
      gt: 'maior que',
      gte: 'maior ou igual a',
      lt: 'menor que',
      lte: 'menor ou igual a',
      between: 'entre',
    };
    const inicio = String(filters.quantidadeValor ?? '').trim();
    const fim = String(filters.quantidadeValorAte ?? '').trim();
    parts.push(
      filters.quantidadeOperador === 'between'
        ? `quantidade entre ${inicio || '-∞'} e ${fim || '+∞'}`
        : `quantidade ${labels[filters.quantidadeOperador] || filters.quantidadeOperador} ${inicio}`
    );
  }
  return parts.length ? parts.join(' · ') : 'nenhum';
}
