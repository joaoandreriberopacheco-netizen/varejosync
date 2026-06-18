import {
  agora,
  codigoOrdenacaoDesdeDataSomente,
  codigoOrdenacaoDesdeInstante,
} from '@/components/utils/dateUtils';

/**
 * Arredonda número (ou string numérica) para 2 casas decimais.
 * Evita caudas de ponto flutuante em totais de caixa, quantidades embarcadas, etc.
 */
export const roundToTwoDecimals = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/**
 * Exibe quantidade com no máximo 2 decimais (pt-BR), sem poluir a UI com IEEE 754.
 */
export const formatQuantity = (value) => {
  const r = roundToTwoDecimals(value);
  return r.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata um número como moeda brasileira com 2 casas decimais
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0,00';
  const rounded = roundToTwoDecimals(value);
  return rounded.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Parse de número com suporte a vírgula decimal (brasileiro)
 */
export const parseFinancialValue = (value) => {
  if (typeof value === 'number') return roundToTwoDecimals(value);
  if (typeof value === 'string') {
    return roundToTwoDecimals(parseFloat(value.replace(',', '.')));
  }
  return 0;
};

/**
 * Código AAAAMMDDHHMMSS para ordenar lançamentos no fluxo de caixa.
 * Usa `codigo_lancamento` persistido, depois `data_lancamento`, `created_date`
 * ou data de pagamento/vencimento (00:00:00).
 */
export function codigoOrdenacaoLancamento(item) {
  if (item?.codigo_lancamento) return String(item.codigo_lancamento);
  if (item?.data_lancamento) {
    const codigo = codigoOrdenacaoDesdeInstante(item.data_lancamento);
    if (codigo) return codigo;
  }
  if (item?.created_date) {
    const codigo = codigoOrdenacaoDesdeInstante(item.created_date);
    if (codigo) return codigo;
  }
  return codigoOrdenacaoDesdeDataSomente(item?.data_pagamento || item?.data_vencimento)
    || '00000000000000';
}

/**
 * Preenche `data_lancamento` e `codigo_lancamento` ao criar um lançamento.
 * Se `dataLancamento` não for informada, usa o instante atual.
 */
export function prepararMetadadosLancamentoFinanceiro({ dataLancamento } = {}) {
  const iso = dataLancamento || agora();
  return {
    data_lancamento: iso,
    codigo_lancamento: codigoOrdenacaoDesdeInstante(iso),
  };
}

/**
 * Ordena lançamentos por código AAAAMMDDHHMMSS; em empate, ordem alfabética (pt-BR).
 */
export function sortLancamentosPorDescricao(items) {
  if (!items?.length) return [];
  return [...items].sort((a, b) => {
    const cmp = codigoOrdenacaoLancamento(a).localeCompare(codigoOrdenacaoLancamento(b));
    if (cmp !== 0) return cmp;
    return (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' });
  });
}