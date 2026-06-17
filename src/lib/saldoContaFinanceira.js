import { roundToTwoDecimals } from '@/lib/financialUtils';

/** Lançamento pago/cancelado entra no saldo (receita +, despesa −). Transferências ficam de fora. */
export function lancamentoParticipaSaldo(l) {
  if (!l || l.status === 'Cancelado') return false;
  if (l.tipo !== 'Receita' && l.tipo !== 'Despesa') return false;
  return l.status === 'Pago' || !!l.data_pagamento;
}

export function deltaLancamentoSaldo(l) {
  if (!lancamentoParticipaSaldo(l)) return 0;
  const valor = Number(l.valor || 0);
  return l.tipo === 'Receita' ? valor : -valor;
}

/** Reforço soma; sangria subtrai. */
export function deltaMovimentoCaixaSaldo(m) {
  if (!m) return 0;
  const valor = Number(m.valor || 0);
  if (m.tipo === 'Reforço') return valor;
  if (m.tipo === 'Sangria') return -valor;
  return 0;
}

export function filtrarLancamentosDaConta(conta, todosLancamentos = []) {
  if (!conta) return [];
  if (conta.is_caixa_geral === true) {
    return todosLancamentos.filter((l) => !l.conta_financeira_id);
  }
  return todosLancamentos.filter((l) => l.conta_financeira_id === conta.id);
}

export function filtrarMovimentosDaConta(contaId, todosMovimentos = []) {
  if (!contaId) return [];
  return todosMovimentos.filter((m) => m.conta_id === contaId);
}

/**
 * Saldo canónico = saldo_inicial + lançamentos pagos (receita/despesa) + reforços/sangrias.
 * Fonte única para lista de contas, extrato e KPIs.
 */
export function calcularSaldoContaFinanceira(conta, todosLancamentos = [], todosMovimentos = []) {
  if (!conta) return 0;
  const saldoInicial = Number(conta.saldo_inicial || 0);
  const lancamentos = filtrarLancamentosDaConta(conta, todosLancamentos);
  const movimentos = filtrarMovimentosDaConta(conta.id, todosMovimentos);

  let delta = 0;
  lancamentos.forEach((l) => { delta += deltaLancamentoSaldo(l); });
  movimentos.forEach((m) => { delta += deltaMovimentoCaixaSaldo(m); });

  return roundToTwoDecimals(saldoInicial + delta);
}

export function calcularSaldosTodasContas(contas = [], todosLancamentos = [], todosMovimentos = []) {
  const map = {};
  contas.forEach((conta) => {
    map[conta.id] = calcularSaldoContaFinanceira(conta, todosLancamentos, todosMovimentos);
  });
  return map;
}

/** Saldo para exibir na UI (prioriza mapa calculado). */
export function getSaldoExibicaoConta(conta, saldosCalculados) {
  if (!conta) return 0;
  if (saldosCalculados && Object.prototype.hasOwnProperty.call(saldosCalculados, conta.id)) {
    return saldosCalculados[conta.id];
  }
  if (conta.saldo_calculado != null) return roundToTwoDecimals(conta.saldo_calculado);
  return roundToTwoDecimals(Number(conta.saldo_atual ?? conta.saldo_inicial ?? 0));
}

export function contaTemDivergenciaSaldo(conta, saldoCalculado) {
  const gravado = roundToTwoDecimals(Number(conta?.saldo_atual ?? 0));
  return Math.abs(gravado - saldoCalculado) > 0.009;
}

/** Entradas e saídas de um conjunto de movimentos (extrato / período). */
export function totaisEntradaSaidaMovimentos(movimentos = []) {
  let entradas = 0;
  let saidas = 0;

  movimentos.forEach((mov) => {
    if (mov.origem === 'movimento' || mov.conta_id) {
      if (mov.tipo === 'Reforço') entradas += Number(mov.valor || 0);
      else if (mov.tipo === 'Sangria') saidas += Number(mov.valor || 0);
      return;
    }
    if (!lancamentoParticipaSaldo(mov)) return;
    if (mov.tipo === 'Receita') entradas += Number(mov.valor || 0);
    else if (mov.tipo === 'Despesa') saidas += Number(mov.valor || 0);
  });

  return {
    entradas: roundToTwoDecimals(entradas),
    saidas: roundToTwoDecimals(saidas),
  };
}

export function movimentoParticipaExtrato(mov) {
  if (mov?.origem === 'movimento') {
    return mov.tipo === 'Reforço' || mov.tipo === 'Sangria';
  }
  return lancamentoParticipaSaldo(mov);
}
