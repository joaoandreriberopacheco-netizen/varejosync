import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dataHoje } from '@/components/utils/dateUtils';

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00-05:00`);
}

/**
 * Intervalo de datas para filtros financeiros (fluxo, corte diário, extrato).
 * Retorna { dataInicio, dataFim } em yyyy-MM-dd; null = sem limite.
 */
export function dateRangeFinanceiro(periodo, customStart = '', customEnd = '') {
  const hojeKey = dataHoje();
  const base = parseDateKey(hojeKey);

  if (periodo === 'hoje') return { dataInicio: hojeKey, dataFim: hojeKey };
  if (periodo === 'ontem') {
    const ontem = format(subDays(base, 1), 'yyyy-MM-dd');
    return { dataInicio: ontem, dataFim: ontem };
  }
  if (periodo === 'semana') {
    return {
      dataInicio: format(startOfWeek(base, { locale: ptBR }), 'yyyy-MM-dd'),
      dataFim: format(endOfWeek(base, { locale: ptBR }), 'yyyy-MM-dd'),
    };
  }
  if (periodo === 'mes') {
    return {
      dataInicio: format(startOfMonth(base), 'yyyy-MM-dd'),
      dataFim: format(endOfMonth(base), 'yyyy-MM-dd'),
    };
  }
  if (periodo === 'tudo') return { dataInicio: null, dataFim: null };
  if (periodo === 'periodo') {
    return {
      dataInicio: customStart || null,
      dataFim: customEnd || customStart || null,
    };
  }

  return {
    dataInicio: format(startOfMonth(base), 'yyyy-MM-dd'),
    dataFim: format(endOfMonth(base), 'yyyy-MM-dd'),
  };
}

/** Compat: chaves curtas usadas no fluxo de caixa. */
export function dateRangeFinanceiroCurto(periodo, customStart = '', customEnd = '') {
  const { dataInicio, dataFim } = dateRangeFinanceiro(periodo, customStart, customEnd);
  return { s: dataInicio, e: dataFim };
}

/** Balancete diário é sempre um único dia — normaliza filtros do menu de relatórios. */
export function diaBalanceteFromFiltros({ periodo, customStart, customEnd } = {}) {
  const hoje = dataHoje();
  if (periodo === 'hoje') return hoje;
  if (periodo === 'ontem') {
    return format(subDays(parseDateKey(hoje), 1), 'yyyy-MM-dd');
  }
  if (periodo === 'periodo') {
    return customStart || customEnd || hoje;
  }
  return hoje;
}
