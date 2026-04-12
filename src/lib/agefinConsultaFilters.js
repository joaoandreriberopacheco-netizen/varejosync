import { dataHoje } from '@/components/utils/dateUtils';

/** Conta a pagar reconhecida pela tag (padrão do sistema). */
export function lancamentoEhContaPagar(l) {
  return Boolean(l && Array.isArray(l.tags) && l.tags.includes('conta_pagar'));
}

/** Despesa CMV (custo mercadoria vendida). */
export function lancamentoEhCmv(l) {
  if (!l) return false;
  if (l.is_custo_mercadoria === true) return true;
  const tags = Array.isArray(l.tags) ? l.tags : [];
  if (tags.includes('cmv')) return true;
  const cat = String(l.categoria || '').toLowerCase();
  return cat.includes('cmv') || cat.includes('custo de mercadoria');
}

/**
 * Pagamento originado da aba Fretes do Itinerário Fluvial (conta vinculada ao evento logístico).
 */
export function lancamentoEhFreteItinerario(l) {
  if (!l) return false;
  if (l.referencia_tipo === 'EventosLogisticos') return true;
  const tags = Array.isArray(l.tags) ? l.tags : [];
  return tags.includes('frete') || tags.includes('conta_frete');
}

export function lancamentoPago(l) {
  return l?.status === 'Pago';
}

export function lancamentoCancelado(l) {
  return l?.status === 'Cancelado';
}

export function lancamentoVencidoOuAtrasado(l, todayKey = dataHoje()) {
  if (!l?.data_vencimento || lancamentoPago(l) || lancamentoCancelado(l)) return false;
  if (l.status === 'Vencido') return true;
  return `${l.data_vencimento}`.slice(0, 10) < todayKey;
}

export function lancamentoEmDia(l, todayKey = dataHoje()) {
  if (lancamentoCancelado(l)) return false;
  if (lancamentoPago(l)) return true;
  return !lancamentoVencidoOuAtrasado(l, todayKey);
}
