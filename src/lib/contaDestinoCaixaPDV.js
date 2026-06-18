import { roundToTwoDecimals } from '@/lib/financialUtils';

/**
 * Conta financeira que recebe recolhimentos e o dinheiro do fechamento do caixa PDV.
 * Definida em Configurações → Financeiro → Contas (flag is_caixa_geral).
 */
export function resolveContaDestinoCaixaPDV(contas = []) {
  return contas.find((c) => c.is_caixa_geral === true && c.ativo !== false) ?? null;
}

function dataHojeIso() {
  return new Date().toISOString().slice(0, 10);
}

async function carregarContaFinanceira(base44, contaId) {
  if (!contaId) return null;
  const rows = await base44.entities.ContasFinanceiras.filter({ id: contaId });
  return rows?.[0] ?? null;
}

/** Par Despesa/Receita no fluxo de caixa (espelha transferência manual). */
async function registrarLancamentosTransferenciaCaixaPDV(
  base44,
  { contaOrigem, contaDestino, valor, descricao, movimentoId }
) {
  const amount = roundToTwoDecimals(valor);
  if (!contaOrigem?.id || !contaDestino?.id || amount <= 0) return;

  const hoje = dataHojeIso();
  const ref = movimentoId
    ? { referencia_tipo: 'MovimentosCaixa', referencia_id: movimentoId }
    : {};
  const base = {
    valor: amount,
    data_vencimento: hoje,
    data_pagamento: hoje,
    status: 'Pago',
    status_conciliacao: 'N/A',
    categoria: 'Transferência entre Contas',
    ...ref,
  };

  await base44.entities.LancamentoFinanceiro.create({
    tipo: 'Despesa',
    descricao,
    conta_financeira_id: contaOrigem.id,
    conta_financeira_nome: contaOrigem.nome,
    observacoes: descricao,
    ...base,
  });

  await base44.entities.LancamentoFinanceiro.create({
    tipo: 'Receita',
    descricao: `Entrada de ${contaOrigem.nome}: ${descricao}`,
    conta_financeira_id: contaDestino.id,
    conta_financeira_nome: contaDestino.nome,
    observacoes: descricao,
    ...base,
  });
}

/** Credita valor na conta destino. */
export async function creditarContaDestinoCaixaPDV(base44, contaDestino, valor) {
  const amount = roundToTwoDecimals(valor);
  if (!contaDestino?.id || amount <= 0) return;
  const contaFresh = await carregarContaFinanceira(base44, contaDestino.id);
  const base = contaFresh ?? contaDestino;
  await base44.entities.ContasFinanceiras.update(contaDestino.id, {
    saldo_atual: roundToTwoDecimals((base.saldo_atual || 0) + amount),
  });
}

/** Recolhimento durante o turno: debita PDV, credita destino e registra no fluxo de caixa. */
export async function transferirRecolhimentoCaixaPDV({
  base44,
  contaOrigem,
  contaDestino,
  valor,
  descricao,
  movimentoId,
}) {
  const amount = roundToTwoDecimals(valor);
  if (!contaOrigem?.id || !contaDestino?.id || amount <= 0) return;

  const origemFresh = (await carregarContaFinanceira(base44, contaOrigem.id)) ?? contaOrigem;
  await base44.entities.ContasFinanceiras.update(contaOrigem.id, {
    saldo_atual: roundToTwoDecimals(Math.max(0, (origemFresh.saldo_atual || 0) - amount)),
  });
  await creditarContaDestinoCaixaPDV(base44, contaDestino, amount);
  await registrarLancamentosTransferenciaCaixaPDV(base44, {
    contaOrigem: origemFresh,
    contaDestino,
    valor: amount,
    descricao,
    movimentoId,
  });
}

/**
 * Fechamento: lê o saldo_atual real do caixa PDV, transfere tudo para a conta destino
 * e zera a conta do PDV (alinha financeiro com o turno encerrado).
 */
export async function transferirDinheiroFechamentoCaixaPDV({
  base44,
  contaCaixaPDV,
  contaDestino,
  descricao,
  movimentoId,
}) {
  if (!contaCaixaPDV?.id) return { saldoRestante: 0, valorTransferido: 0 };

  const origemFresh = (await carregarContaFinanceira(base44, contaCaixaPDV.id)) ?? contaCaixaPDV;
  const saldoRestante = roundToTwoDecimals(origemFresh.saldo_atual || 0);

  if (saldoRestante > 0) {
    if (!contaDestino?.id) {
      throw new Error(
        'Conta destino do caixa PDV não configurada. Vá em Configurações → Financeiro → Contas.'
      );
    }
    await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
    await creditarContaDestinoCaixaPDV(base44, contaDestino, saldoRestante);
    await registrarLancamentosTransferenciaCaixaPDV(base44, {
      contaOrigem: origemFresh,
      contaDestino,
      valor: saldoRestante,
      descricao,
      movimentoId,
    });
  } else {
    await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
  }

  return { saldoRestante, valorTransferido: saldoRestante };
}
