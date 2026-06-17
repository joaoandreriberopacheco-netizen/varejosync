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
  await base44.entities.ContasFinanceiras.update(contaDestino.id, {
    saldo_atual: roundToTwoDecimals((contaDestino.saldo_atual || 0) + amount),
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

  await base44.entities.ContasFinanceiras.update(contaOrigem.id, {
    saldo_atual: roundToTwoDecimals(Math.max(0, (contaOrigem.saldo_atual || 0) - amount)),
  });
  await creditarContaDestinoCaixaPDV(base44, contaDestino, amount);
  await registrarLancamentosTransferenciaCaixaPDV(base44, {
    contaOrigem,
    contaDestino,
    valor: amount,
    descricao,
    movimentoId,
  });
}

/** Fechamento: zera caixa PDV, credita destino e registra no fluxo de caixa. */
export async function transferirDinheiroFechamentoCaixaPDV({
  base44,
  contaCaixaPDV,
  contaDestino,
  dinheiroConferido,
  descricao,
  movimentoId,
}) {
  const amount = roundToTwoDecimals(dinheiroConferido);
  if (!contaDestino?.id || !contaCaixaPDV?.id || amount <= 0) return;

  await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
  await creditarContaDestinoCaixaPDV(base44, contaDestino, amount);
  await registrarLancamentosTransferenciaCaixaPDV(base44, {
    contaOrigem: contaCaixaPDV,
    contaDestino,
    valor: amount,
    descricao,
    movimentoId,
  });
}
