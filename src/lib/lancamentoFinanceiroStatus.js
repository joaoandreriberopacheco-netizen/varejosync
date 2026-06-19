import { dataHoje, toLocalDateKey } from '@/components/utils/dateUtils';

/** Lançamento já pago (entra no fluxo de caixa realizado). */
export function isLancamentoPago(l) {
  return l?.status === 'Pago' || !!l?.data_pagamento;
}

export function isLancamentoCancelado(l) {
  return l?.status === 'Cancelado';
}

/** Cartão (crédito ou débito) aguardando crédito na conta — venda em aberto até conciliação. */
export function isCartaoPendenteConciliacao(l) {
  if (!l || isLancamentoPago(l) || isLancamentoCancelado(l)) return false;
  const fpt = l.forma_pagamento_tipo;
  const cartao = fpt === 'Cartão Crédito' || fpt === 'Cartão Débito';
  return cartao && l.status_conciliacao === 'Pendente';
}

/** @deprecated Use isCartaoPendenteConciliacao — mantido para compatibilidade. */
export function isCartaoCreditoPendenteConciliacao(l) {
  return l?.forma_pagamento_tipo === 'Cartão Crédito' && l?.status_conciliacao === 'Pendente';
}

/** Valor que entra no fluxo / contas abertas: líquido (após taxa) para cartão pendente. */
export function getValorEfetivoLancamento(l) {
  if (isCartaoPendenteConciliacao(l)) {
    const liquido = l.valor_liquido;
    if (liquido != null && liquido !== '') return Number(liquido) || 0;
  }
  return Number(l?.valor || 0);
}

/** Visível no Fluxo de Caixa (pago ou cartão pendente de crédito na conta). */
export function isLancamentoRealizadoFluxo(l) {
  return isLancamentoPago(l) || isCartaoPendenteConciliacao(l);
}

/** Data usada para agrupar/filtrar no Fluxo de Caixa. */
export function getDataAncoraFluxo(l) {
  if (isCartaoPendenteConciliacao(l)) {
    return l.data_liquidacao_prevista || l.data_vencimento;
  }
  return l.data_pagamento || l.data_vencimento;
}

export function getDataAncoraFluxoKey(l) {
  const ancora = getDataAncoraFluxo(l);
  return ancora ? toLocalDateKey(ancora) : null;
}

/** Conta a pagar / aberta: em aberto e não cancelada. */
export function isLancamentoEmAberto(l) {
  if (!l || isLancamentoCancelado(l)) return false;
  if (l.tipo === 'Transferência') return false;
  return !isLancamentoPago(l);
}

export function isLancamentoVencido(l, hojeKey = dataHoje()) {
  if (!isLancamentoEmAberto(l)) return false;
  const venc = (l?.data_vencimento || '').slice(0, 10);
  return !!venc && venc < hojeKey;
}

/** Tag `conta_pagar` — regra das contas abertas. */
export function lancamentoPassaFiltroContasAbertas(l) {
  if (isLancamentoCancelado(l) || l?.tipo === 'Transferência') return false;
  const tags = l?.tags || [];
  if (tags.length > 0 && !tags.includes('conta_pagar')) return false;
  return true;
}
