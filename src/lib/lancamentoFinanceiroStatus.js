import { dataHoje, toLocalDateKey } from '@/components/utils/dateUtils';

/** Lançamento já pago (entra no fluxo de caixa realizado). */
export function isLancamentoPago(l) {
  return l?.status === 'Pago' || !!l?.data_pagamento;
}

export function isLancamentoCancelado(l) {
  return l?.status === 'Cancelado';
}

/** Cartão de crédito aguardando liquidação automática (só Contas Abertas até o job das 09:00). */
export function isCartaoCreditoAguardandoLiquidacao(l) {
  if (!l || isLancamentoPago(l) || isLancamentoCancelado(l)) return false;
  return l.forma_pagamento_tipo === 'Cartão Crédito' && l.status_conciliacao === 'Pendente';
}

/** @deprecated Cartão crédito pendente não entra mais no fluxo antes da liquidação automática. */
export function isCartaoCreditoPendenteConciliacao(l) {
  return isCartaoCreditoAguardandoLiquidacao(l);
}

/** Valor líquido (após taxa) para cartão de crédito; demais usam valor bruto. */
export function getValorFluxoCaixa(l) {
  if (l?.forma_pagamento_tipo === 'Cartão Crédito') {
    const liquido = l.valor_liquido;
    if (liquido != null && liquido !== '') return Number(liquido) || 0;
  }
  return Number(l?.valor || 0);
}

/** Visível no Fluxo de Caixa somente após pago (ex.: liquidação automática 09:00). */
export function isLancamentoRealizadoFluxo(l) {
  return isLancamentoPago(l);
}

/** Data usada para agrupar/filtrar no Fluxo de Caixa. */
export function getDataAncoraFluxo(l) {
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

/** Tag `conta_pagar` / `conta_receber` / cartão / fiado — regra das contas abertas. */
export function lancamentoPassaFiltroContasAbertas(l) {
  if (isLancamentoCancelado(l) || l?.tipo === 'Transferência') return false;
  const tags = l?.tags || [];
  if (
    tags.includes('conta_pagar') ||
    tags.includes('conta_receber') ||
    tags.includes('CARTAO') ||
    tags.includes('FIADO')
  ) {
    return true;
  }
  if (tags.length > 0) return false;
  return true;
}

/** Valor em Contas Abertas: líquido para cartão de crédito pendente. */
export function getValorContaAberta(l) {
  if (isCartaoCreditoAguardandoLiquidacao(l)) {
    const liquido = l.valor_liquido;
    if (liquido != null && liquido !== '') return Number(liquido) || 0;
  }
  return Number(l?.valor || 0);
}
