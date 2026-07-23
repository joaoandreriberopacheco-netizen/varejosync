import { produtoMatchesAbcdMultiFilter } from '@/lib/catalogAbcdEnrichment';
import {
  hasActiveNumericComparison,
  matchesNumericComparison,
} from '@/lib/catalogNumericFilters';
import {
  collectCatalogVitrineUnits,
  produtoMatchesSearchTerm,
  produtoMatchesVitrineFilter,
} from '@/lib/filterProdutos';
import { getUnidadeExibicaoSigla } from '@/lib/productUnits';
import { sugestaoTemGiroVelocidade } from '@/lib/calcularSugestaoCompraVelocidade';

export const SUGESTAO_STATUS_ESTOQUE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'ok', label: 'OK' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'critico', label: 'Crítico' },
];

export const DEFAULT_SUGESTAO_COMPRA_FILTERS = {
  searchTerm: '',
  searchStartsWith: false,
  categoriaId: 'all',
  fornecedorId: 'all',
  selectedAbcd: [],
  selectedTags: [],
  unidadeVitrine: 'all',
  statusEstoque: 'all',
  quantidadeOperador: 'all',
  quantidadeValor: '',
  quantidadeValorAte: '',
  hidePending: false,
  somenteAbaixoPontoFuturo: false,
  roundingMode: 'auto',
  agruparHierarquia: true,
};

function hasActiveQuantityFilter(filters) {
  return hasActiveNumericComparison(
    filters?.quantidadeOperador,
    filters?.quantidadeValor,
    filters?.quantidadeValorAte,
  );
}

function linhaEstoqueAtual(linha) {
  return Number(linha?.sugestao?.estoque_atual ?? linha?.produto?.estoque_atual) || 0;
}

/** Ponto de pedido da sugestão (velocidade ao vivo) — nunca usa cadastro. */
function linhaPontoPedido(linha) {
  return Number(linha?.sugestao?.ponto_pedido) || 0;
}

export function linhaAbaixoPontoFuturo(linha) {
  const gap = Number(linha?.sugestao?.gap_ponto_futuro_base);
  if (Number.isFinite(gap)) return gap > 0;
  const ponto = linhaPontoPedido(linha);
  if (ponto <= 0) return false;
  return linhaEstoqueAtual(linha) < ponto;
}

export function linhaTemGiroVelocidade(linha) {
  return sugestaoTemGiroVelocidade(linha?.sugestao);
}

function linhaMatchesStatusEstoque(linha, statusEstoque = 'all') {
  if (!statusEstoque || statusEstoque === 'all') return true;

  const estoque = linhaEstoqueAtual(linha);
  const minimo = linhaPontoPedido(linha);

  if (statusEstoque === 'ok') return minimo > 0 ? estoque > minimo : estoque > 0;
  if (statusEstoque === 'baixo') {
    return minimo > 0 && estoque > 0 && estoque <= minimo;
  }
  if (statusEstoque === 'critico') {
    return estoque <= 0 || (minimo > 0 && estoque <= minimo / 2);
  }
  return true;
}

function linhaMatchesSearch(linha, filters) {
  const term = String(filters?.searchTerm || '').trim();
  if (!term) return true;

  const label = String(linha?.label || '').toLowerCase();
  const haystackLabel = label.includes(term.toLowerCase());
  if (haystackLabel) return true;

  return (linha?.skus || []).some((produto) =>
    produtoMatchesSearchTerm(produto, term, {
      startsWith: !!filters?.searchStartsWith,
    }),
  );
}

function linhaMatchesSkuPredicate(linha, predicate) {
  return (linha?.skus || []).some((produto) => predicate(produto));
}

/** Unidades de vitrine presentes nas linhas de sugestão. */
export function collectSugestaoVitrineUnits(linhas = []) {
  const produtos = linhas.flatMap((linha) => linha?.skus || []);
  return collectCatalogVitrineUnits(produtos);
}

export function filterSugestaoCompraLinhas(linhas, filters = DEFAULT_SUGESTAO_COMPRA_FILTERS) {
  if (!Array.isArray(linhas)) return [];

  return linhas.filter((linha) => {
    if (filters.somenteAbaixoPontoFuturo !== false && !linhaAbaixoPontoFuturo(linha)) return false;
    if (filters.hidePending && linha.quantidade_pendente > 0) return false;
    if (!linhaMatchesSearch(linha, filters)) return false;

    if (
      filters.categoriaId !== 'all' &&
      !linhaMatchesSkuPredicate(linha, (p) => p.categoria_id === filters.categoriaId)
    ) {
      return false;
    }

    if (
      filters.fornecedorId !== 'all' &&
      !linhaMatchesSkuPredicate(linha, (p) => p.fornecedor_padrao_id === filters.fornecedorId)
    ) {
      return false;
    }

    if (
      Array.isArray(filters.selectedTags) &&
      filters.selectedTags.length > 0 &&
      !linhaMatchesSkuPredicate(linha, (p) =>
        filters.selectedTags.every((t) => p.tags?.includes(t)),
      )
    ) {
      return false;
    }

    if (
      Array.isArray(filters.selectedAbcd) &&
      filters.selectedAbcd.length > 0 &&
      !linhaMatchesSkuPredicate(linha, (p) => produtoMatchesAbcdMultiFilter(p, filters.selectedAbcd))
    ) {
      return false;
    }

    if (
      filters.unidadeVitrine !== 'all' &&
      !linhaMatchesSkuPredicate(linha, (p) =>
        produtoMatchesVitrineFilter(p, filters.unidadeVitrine),
      )
    ) {
      return false;
    }

    if (!linhaMatchesStatusEstoque(linha, filters.statusEstoque)) return false;

    if (hasActiveQuantityFilter(filters)) {
      const estoque = linhaEstoqueAtual(linha);
      if (
        !matchesNumericComparison(
          estoque,
          filters.quantidadeOperador,
          filters.quantidadeValor,
          filters.quantidadeValorAte,
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

export function countActiveSugestaoCompraFilters(filters = DEFAULT_SUGESTAO_COMPRA_FILTERS) {
  return [
    filters.searchTerm?.trim(),
    filters.searchStartsWith,
    filters.categoriaId !== 'all',
    filters.fornecedorId !== 'all',
    filters.selectedAbcd?.length > 0,
    filters.selectedTags?.length > 0,
    filters.unidadeVitrine !== 'all',
    filters.statusEstoque !== 'all',
    hasActiveQuantityFilter(filters),
    filters.hidePending,
    filters.somenteAbaixoPontoFuturo === true,
    filters.roundingMode !== 'auto',
    filters.agruparHierarquia === false,
  ].filter(Boolean).length;
}

export function collectSugestaoTags(linhas = []) {
  const tags = new Set();
  linhas.forEach((linha) => {
    (linha?.skus || []).forEach((produto) => {
      produto?.tags?.forEach((tag) => tags.add(tag));
    });
  });
  return [...tags].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Rótulo curto da unidade vitrine para chips. */
export function formatSugestaoVitrineLabel(sigla) {
  return getUnidadeExibicaoSigla({ unidade_vitrine: sigla }) || sigla;
}
