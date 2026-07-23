import { getAbcdRank } from '@/lib/catalogProdutoPerformance';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';

export const SUGESTAO_COMPRA_SORT_COLUMNS = [
  { id: 'produto', label: 'Produto' },
  { id: 'abcd', label: 'ABCD' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'media30d', label: 'Média 30d' },
  { id: 'pontoFuturo', label: 'Ponto futuro' },
  { id: 'qtdSugerida', label: 'Qtd sugerida' },
  { id: 'fornecedor', label: 'Fornecedor' },
];

export const DEFAULT_SUGESTAO_COLUMN_SORT = {
  column: 'produto',
  direction: 'asc',
};

function directionMultiplier(direction = 'asc') {
  return direction === 'desc' ? -1 : 1;
}

function linhaEstoque(linha) {
  return Number(linha?.sugestao?.estoque_atual ?? linha?.produto?.estoque_atual) || 0;
}

function linhaMedia30d(linha) {
  return Number(linha?.sugestao?.media_30d_comercial) || 0;
}

function linhaGapPontoFuturo(linha) {
  return Number(linha?.sugestao?.gap_ponto_futuro_base) || 0;
}

function linhaQtdSugerida(linha, ctx = {}) {
  if (typeof ctx.quantidadeBase === 'function') {
    return Number(ctx.quantidadeBase(linha)) || 0;
  }
  return Number(linha?.sugestao?.quantidade_sugerida_base) || 0;
}

function linhaFornecedorNome(linha, ctx = {}) {
  if (typeof ctx.fornecedorNome === 'function') {
    return String(ctx.fornecedorNome(linha) || '').trim();
  }
  return '';
}

function compareStrings(a, b, direction) {
  const cmp = a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  return cmp * directionMultiplier(direction);
}

function compareNumbers(a, b, direction) {
  if (a !== b) return (a - b) * directionMultiplier(direction);
  return 0;
}

export function compareSugestaoCompraLinhas(a, b, sort = DEFAULT_SUGESTAO_COLUMN_SORT, ctx = {}) {
  const column = sort?.column || 'produto';
  const direction = sort?.direction || 'asc';
  const tie = (a?.label || a?.produto?.nome || '').localeCompare(
    b?.label || b?.produto?.nome || '',
    'pt-BR',
    { sensitivity: 'base' },
  );

  if (column === 'produto') {
    const cmp = compareStrings(
      String(a?.label || a?.produto?.nome || ''),
      String(b?.label || b?.produto?.nome || ''),
      direction,
    );
    return cmp || tie;
  }

  if (column === 'abcd') {
    const cmp = compareNumbers(
      getAbcdRank(getLinhaAbcdLetter(a)),
      getAbcdRank(getLinhaAbcdLetter(b)),
      direction,
    );
    return cmp || tie;
  }

  if (column === 'estoque') {
    return compareNumbers(linhaEstoque(a), linhaEstoque(b), direction) || tie;
  }

  if (column === 'media30d') {
    return compareNumbers(linhaMedia30d(a), linhaMedia30d(b), direction) || tie;
  }

  if (column === 'pontoFuturo') {
    return compareNumbers(linhaGapPontoFuturo(a), linhaGapPontoFuturo(b), direction) || tie;
  }

  if (column === 'qtdSugerida') {
    return compareNumbers(linhaQtdSugerida(a, ctx), linhaQtdSugerida(b, ctx), direction) || tie;
  }

  if (column === 'fornecedor') {
    return compareStrings(linhaFornecedorNome(a, ctx), linhaFornecedorNome(b, ctx), direction) || tie;
  }

  return tie;
}

export function sortSugestaoCompraLinhasByColumn(linhas = [], sort = DEFAULT_SUGESTAO_COLUMN_SORT, ctx = {}) {
  return [...linhas].sort((a, b) => compareSugestaoCompraLinhas(a, b, sort, ctx));
}

export function columnSortToCatalogTreeOrder(sort = DEFAULT_SUGESTAO_COLUMN_SORT) {
  const column = sort?.column || 'produto';
  const direction = sort?.direction || 'asc';
  if (column === 'produto') return direction === 'desc' ? 'za' : 'az';
  if (column === 'abcd') return direction === 'desc' ? 'abcd_desc' : 'abcd_asc';
  return null;
}

export function enrichProdutoSugestaoSortFields(produto, linha, ctx = {}) {
  if (!produto || !linha) return produto;
  const s = linha.sugestao || {};
  return {
    ...produto,
    sugestao_estoque: linhaEstoque(linha),
    sugestao_media_30d: linhaMedia30d(linha),
    sugestao_gap: linhaGapPontoFuturo(linha),
    sugestao_qtd: linhaQtdSugerida(linha, ctx),
    sugestao_abcd: getAbcdRank(getLinhaAbcdLetter(linha)),
    sugestao_fornecedor: linhaFornecedorNome(linha, ctx),
  };
}

export function sugestaoColumnSortOrderId(sort = DEFAULT_SUGESTAO_COLUMN_SORT) {
  const column = sort?.column || 'produto';
  const direction = sort?.direction || 'asc';
  if (column === 'produto') return direction === 'desc' ? 'za' : 'az';
  if (column === 'abcd') return direction === 'desc' ? 'abcd_desc' : 'abcd_asc';
  return `sugestao_${column}_${direction}`;
}
