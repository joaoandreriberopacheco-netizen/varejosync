import { roundToTwoDecimals } from '@/lib/financialUtils';

/** Lançamento pago/cancelado entra no saldo (receita +, despesa −). Transferências ficam de fora. */
export function lancamentoParticipaSaldo(l) {
  if (!l || l.status === 'Cancelado') return false;
  if (l.tipo !== 'Receita' && l.tipo !== 'Despesa') return false;
  return l.status === 'Pago' || !!l.data_pagamento;
}

const FORMAS_NAO_DINHEIRO_FISICO = new Set([
  'PIX',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Conta a Pagar',
  'Vale Troca',
]);

/**
 * Receitas que não representam dinheiro físico na gaveta do PDV (PIX, cartão, fiado, etc.).
 * Despesas pagas na conta PDV sempre saem da gaveta e entram no saldo.
 */
export function formaPagamentoNaoDinheiroFisico(l) {
  if (!l || l.tipo !== 'Receita') return false;

  const fp = String(l.forma_pagamento || '').trim();
  const fpt = String(l.forma_pagamento_tipo || '').trim();

  if (fp === 'Dinheiro') return false;
  if (FORMAS_NAO_DINHEIRO_FISICO.has(fp)) return true;
  if (fpt === 'Cartão Débito' || fpt === 'Cartão Crédito' || fpt === 'Boleto') return true;

  const tags = Array.isArray(l.tags) ? l.tags : [];
  if (tags.includes('CARTAO') || tags.includes('FIADO')) return true;

  // Receita com forma definida que não é Dinheiro (ex.: PIX legado na conta errada).
  if (fp) return true;

  return false;
}

/** Saldo da conta Caixa PDV no módulo financeiro: só dinheiro na gaveta. */
export function lancamentoParticipaSaldoCaixaPDV(l) {
  if (!lancamentoParticipaSaldo(l)) return false;
  if (l.tipo === 'Despesa') return true;
  if (l.tipo === 'Receita') return !formaPagamentoNaoDinheiroFisico(l);
  return false;
}

export function lancamentoParticipaSaldoConta(conta, l) {
  if (conta?.is_caixa_pdv === true) return lancamentoParticipaSaldoCaixaPDV(l);
  return lancamentoParticipaSaldo(l);
}

export function deltaLancamentoSaldo(l) {
  if (!lancamentoParticipaSaldo(l)) return 0;
  const valor = Number(l.valor || 0);
  return l.tipo === 'Receita' ? valor : -valor;
}

export function deltaLancamentoSaldoConta(conta, l) {
  if (!lancamentoParticipaSaldoConta(conta, l)) return 0;
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
 * Contas is_caixa_pdv: apenas dinheiro físico na gaveta (vendas em dinheiro, despesas, recolhimentos).
 * Fonte única para lista de contas, extrato e KPIs.
 */
export function calcularSaldoContaFinanceira(conta, todosLancamentos = [], todosMovimentos = []) {
  if (!conta) return 0;
  const saldoInicial = Number(conta.saldo_inicial || 0);
  const lancamentos = filtrarLancamentosDaConta(conta, todosLancamentos);
  const movimentos = filtrarMovimentosDaConta(conta.id, todosMovimentos);

  let delta = 0;
  lancamentos.forEach((l) => { delta += deltaLancamentoSaldoConta(conta, l); });
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

function movimentoCaixaParticipaExtrato(mov) {
  return mov?.tipo === 'Reforço' || mov?.tipo === 'Sangria';
}

/** Indica se o movimento compõe o saldo/extrato da conta (PDV usa regra de dinheiro físico). */
export function movimentoParticipaExtrato(mov, conta = null) {
  if (mov?.origem === 'movimento' || mov?.conta_id) {
    return movimentoCaixaParticipaExtrato(mov);
  }
  return lancamentoParticipaSaldoConta(conta, mov);
}

/** Entradas e saídas de um conjunto de movimentos (extrato / período). */
export function totaisEntradaSaidaMovimentos(movimentos = [], conta = null) {
  let entradas = 0;
  let saidas = 0;

  movimentos.forEach((mov) => {
    if (mov.origem === 'movimento' || mov.conta_id) {
      if (mov.tipo === 'Reforço') entradas += Number(mov.valor || 0);
      else if (mov.tipo === 'Sangria') saidas += Number(mov.valor || 0);
      return;
    }
    if (!lancamentoParticipaSaldoConta(conta, mov)) return;
    if (mov.tipo === 'Receita') entradas += Number(mov.valor || 0);
    else if (mov.tipo === 'Despesa') saidas += Number(mov.valor || 0);
  });

  return {
    entradas: roundToTwoDecimals(entradas),
    saidas: roundToTwoDecimals(saidas),
  };
}
