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

/** Conta encerrada administrativamente — não deve aparecer na consulta Agefin nem como dívida. */
export function lancamentoCancelado(l) {
  const tags = Array.isArray(l?.tags) ? l.tags.map((t) => String(t).toLowerCase()) : [];
  if (tags.includes('cancelado') || tags.includes('cancelada')) return true;
  const raw = l?.status;
  if (raw == null || raw === '') return false;
  const s = String(raw).trim().toLowerCase();
  return s === 'cancelado' || s === 'cancelada';
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

function normalizarFormaPagamento(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * Compra de mercadoria vinculada a pedido (fluxo de aprovação financeira do PedidoCompra).
 */
export function lancamentoEhCompraMercadoriaPedido(l) {
  if (!l || l.referencia_tipo !== 'PedidoCompra') return false;
  if (l.is_custo_mercadoria === true) return true;
  const cat = String(l.categoria || '').toLowerCase();
  return cat.includes('compra de mercadoria');
}

/**
 * À vista nesse fluxo não entra na Agefin Consulta (contas a exibir para acompanhamento),
 * mesmo com tag conta_pagar.
 */
export function lancamentoCompraMercadoriaPedidoPagamentoAVista(l) {
  if (!lancamentoEhCompraMercadoriaPedido(l)) return false;
  const fp = normalizarFormaPagamento(l.forma_pagamento_tipo || l.forma_pagamento_compra || l.forma_pagamento);
  if (fp.includes('a vista') || fp === 'avista') return true;
  const d = String(l.descricao || '');
  if (/\(\s*[àa]\s*vista\s*\)/i.test(d)) return true;
  return false;
}
