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

export function contaUsaRegraCaixaPDV(conta) {
  return conta?.is_caixa_pdv === true || conta?.tipo === 'Caixa PDV';
}

export function lancamentoParticipaSaldoConta(conta, l) {
  if (contaUsaRegraCaixaPDV(conta)) return lancamentoParticipaSaldoCaixaPDV(l);
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

/** Lançamento visível nas contas selecionadas (inclui legado sem conta_financeira_id na Caixa Geral). */
export function lancamentoPertenceContasSelecionadas(l, contasSel = [], contasById = {}) {
  if (!contasSel.length) return true;
  if (l.conta_financeira_id && contasSel.includes(l.conta_financeira_id)) return true;
  if (!l.conta_financeira_id) {
    return contasSel.some((id) => contasById[id]?.is_caixa_geral === true);
  }
  return false;
}

/** Recolhimento/fechamento PDV e transferências manuais entre contas financeiras. */
export function isTransferenciaEntreContas(l) {
  if (!l) return false;
  if (l.tipo === 'Transferência') return true;
  if (l.categoria === 'Transferência entre Contas') return true;
  if (l.referencia_tipo === 'MovimentosCaixa') return true;
  return false;
}

export function isMovimentoTransferenciaCaixaPDV(m) {
  return m?.tipo === 'Sangria' || m?.tipo === 'Recolhimento de Caixa';
}

/** Linha do Fluxo: recolhimentos aparecem como transferência (sem mudar o PDV). */
export function projetarLinhaFluxoCaixa(l) {
  if (!isTransferenciaEntreContas(l)) return l;
  return {
    ...l,
    tipoExibicao: 'Transferência',
  };
}

/** IDs de MovimentosCaixa já refletidos em LancamentoFinanceiro (evita contar duas vezes). */
export function idsMovimentosComLancamentoFinanceiro(lancamentos = []) {
  const ids = new Set();
  lancamentos.forEach((l) => {
    if (l?.referencia_tipo === 'MovimentosCaixa' && l?.referencia_id && l.tipo === 'Despesa') {
      ids.add(String(l.referencia_id));
    }
  });
  return ids;
}

/** Reforço soma; sangria e recolhimento subtraem. */
export function deltaMovimentoCaixaSaldo(m) {
  if (!m) return 0;
  const valor = Number(m.valor || 0);
  if (m.tipo === 'Reforço') return valor;
  if (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa') return -valor;
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

  const movimentosJaNoFinanceiro = idsMovimentosComLancamentoFinanceiro(lancamentos);

  let delta = 0;
  lancamentos.forEach((l) => { delta += deltaLancamentoSaldoConta(conta, l); });
  movimentos.forEach((m) => {
    if (movimentosJaNoFinanceiro.has(String(m.id))) return;
    delta += deltaMovimentoCaixaSaldo(m);
  });

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
  return mov?.tipo === 'Reforço' || mov?.tipo === 'Sangria' || mov?.tipo === 'Recolhimento de Caixa';
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
      else if (mov.tipo === 'Sangria' || mov.tipo === 'Recolhimento de Caixa') {
        saidas += Number(mov.valor || 0);
      }
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

/**
 * KPIs do Fluxo de Caixa alinhados ao extrato.
 * Caixa PDV: só dinheiro físico nos lançamentos + reforços/sangrias/recolhimentos.
 */
export function calcularKpisFluxoPeriodo(
  lancamentosPeriodo = [],
  movimentosPeriodo = [],
  todosLancamentos = [],
  contasById = {},
  contasSel = [],
) {
  const movimentosJaNoFinanceiro = idsMovimentosComLancamentoFinanceiro(todosLancamentos);
  const contaNoFiltro = (contaId) => !contasSel.length || contasSel.includes(contaId);
  let entrou = 0;
  let saiu = 0;
  let pEntrou = 0;
  let pSaiu = 0;
  let totalTransferencias = 0;
  let transfIn = 0;
  let transfOut = 0;
  let vencidos = 0;
  let qtdVencidos = 0;

  lancamentosPeriodo.forEach((l) => {
    const valor = Number(l.valor || 0);
    const isPago = l.status === 'Pago' || !!l.data_pagamento;

    if (isTransferenciaEntreContas(l)) {
      totalTransferencias += valor;
      if (contaNoFiltro(l.conta_financeira_id)) {
        if (l.tipo === 'Receita') transfIn += valor;
        else if (l.tipo === 'Despesa') transfOut += valor;
      }
      return;
    }

    const conta = contasById[l.conta_financeira_id];
    const cartaoCreditoPendente =
      l.forma_pagamento_tipo === 'Cartão Crédito' && l.status_conciliacao === 'Pendente';

    if (l.status === 'Vencido') {
      vencidos += valor;
      qtdVencidos++;
    }

    const participaSaldo = lancamentoParticipaSaldoConta(conta, l);
    if (!participaSaldo && !cartaoCreditoPendente) return;

    if (isPago || cartaoCreditoPendente) {
      if (l.tipo === 'Receita') entrou += valor;
      else if (l.tipo === 'Despesa') saiu += valor;
    } else {
      if (l.tipo === 'Receita') pEntrou += valor;
      else if (l.tipo === 'Despesa') pSaiu += valor;
    }
  });

  movimentosPeriodo.forEach((m) => {
    if (movimentosJaNoFinanceiro.has(String(m.id))) return;
    const conta = contasById[m.conta_id];
    if (!contaUsaRegraCaixaPDV(conta)) return;
    const valor = Number(m.valor || 0);
    if (m.tipo === 'Reforço') {
      entrou += valor;
      return;
    }
    if (!isMovimentoTransferenciaCaixaPDV(m)) return;
    totalTransferencias += valor;
    if (contaNoFiltro(m.conta_id)) transfOut += valor;
  });

  return {
    entrou: roundToTwoDecimals(entrou),
    saiu: roundToTwoDecimals(saiu),
    saldo: roundToTwoDecimals(entrou - saiu + transfIn - transfOut),
    pEntrou: roundToTwoDecimals(pEntrou),
    pSaiu: roundToTwoDecimals(pSaiu),
    saldoPrev: roundToTwoDecimals(entrou + pEntrou - saiu - pSaiu + transfIn - transfOut),
    totalTransferencias: roundToTwoDecimals(totalTransferencias),
    vencidos: roundToTwoDecimals(vencidos),
    qtdVencidos,
  };
}

/**
 * Totais do grupo no Fluxo.
 * Transferências (recolhimento/fechamento) entram no líquido do dia mas fora de receita/despesa operacional.
 */
export function totaisGrupoFluxoCaixa(items = [], contasById = {}) {
  let r = 0;
  let d = 0;
  let transfIn = 0;
  let transfOut = 0;

  items.forEach((l) => {
    const conta = contasById[l.conta_financeira_id];
    const cartaoCreditoPendente =
      l.forma_pagamento_tipo === 'Cartão Crédito' && l.status_conciliacao === 'Pendente';
    const isPago = l.status === 'Pago' || !!l.data_pagamento;
    const valor = Number(l.valor || 0);

    if (l.origem === 'movimento' || (l.conta_id && !l.conta_financeira_id)) {
      if (l.tipo === 'Reforço') r += valor;
      else if (isMovimentoTransferenciaCaixaPDV(l)) transfOut += valor;
      return;
    }

    if (isTransferenciaEntreContas(l)) {
      if (l.tipo === 'Receita') transfIn += valor;
      else if (l.tipo === 'Despesa') transfOut += valor;
      return;
    }

    const participaSaldo = lancamentoParticipaSaldoConta(conta, l);
    if (!participaSaldo && !cartaoCreditoPendente) return;
    if (l.tipo === 'Receita' && (isPago || cartaoCreditoPendente)) r += valor;
    if (l.tipo === 'Despesa' && isPago) d += valor;
  });

  const liquido = r - d + transfIn - transfOut;
  return {
    r: roundToTwoDecimals(r),
    d: roundToTwoDecimals(d),
    transfIn: roundToTwoDecimals(transfIn),
    transfOut: roundToTwoDecimals(transfOut),
    liquido: roundToTwoDecimals(liquido),
  };
}
