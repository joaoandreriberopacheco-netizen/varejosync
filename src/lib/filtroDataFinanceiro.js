import {
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
  startOfMonth,
  endOfMonth,
  isBefore,
} from 'date-fns';

export function parseDataFinanceira(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dataFinanceiraKey(value) {
  const parsed = parseDataFinanceira(value);
  return parsed ? format(parsed, 'yyyy-MM-dd') : null;
}

export function hojeFinanceiroStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function periodoRangeFinanceiro(periodo, cs, ce) {
  const h = new Date();
  if (periodo === 'vencidas') return { s: null, e: startOfDay(h), vencidas: true };
  if (periodo === 'hoje') return { s: startOfDay(h), e: endOfDay(h) };
  if (periodo === 'semana') return { s: startOfDay(h), e: endOfDay(addDays(h, 7)) };
  if (periodo === 'mes') return { s: startOfMonth(h), e: endOfMonth(h) };
  if (periodo === 'futuras') return { s: addDays(h, 1), e: null };
  if (periodo === 'personalizado') {
    return {
      s: cs ? startOfDay(new Date(cs)) : null,
      e: ce ? endOfDay(new Date(ce)) : null,
    };
  }
  return { s: null, e: null };
}

/** Aplica chips de período a uma data (yyyy-MM-dd ou Date parseável). */
export function passaFiltroPeriodo(dataStr, dataDate, periodo, ds, de, hojeStr) {
  if (periodo === 'vencidas') {
    if (!dataStr || dataStr >= hojeStr) return false;
  } else if (periodo === 'mes') {
    if (!dataStr || !ds || !de) return false;
    if (!isWithinInterval(new Date(`${dataStr}T12:00:00`), { start: ds, end: de })) return false;
  } else if (ds && de && dataDate) {
    if (!isWithinInterval(dataDate, { start: ds, end: de })) return false;
  } else if (ds && !de && dataDate) {
    if (isBefore(dataDate, ds)) return false;
  }
  return true;
}

export const PERIODOS_DATA_PAGAMENTO = [
  { v: 'hoje', l: 'Hoje' },
  { v: 'semana', l: '7 dias' },
  { v: 'mes', l: 'Mês' },
  { v: 'todas', l: 'Todas' },
  { v: 'personalizado', l: 'Personalizado' },
];
