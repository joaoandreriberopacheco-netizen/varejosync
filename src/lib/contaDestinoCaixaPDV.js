import { roundToTwoDecimals } from '@/lib/financialUtils';

/**
 * Conta financeira que recebe recolhimentos e o dinheiro do fechamento do caixa PDV.
 * Definida em Configurações → Financeiro → Contas (flag is_caixa_geral).
 */
export function resolveContaDestinoCaixaPDV(contas = []) {
  return contas.find((c) => c.is_caixa_geral === true && c.ativo !== false) ?? null;
}

/** Credita valor na conta destino (recolhimento parcial durante o turno). */
export async function creditarContaDestinoCaixaPDV(base44, contaDestino, valor) {
  const amount = roundToTwoDecimals(valor);
  if (!contaDestino?.id || amount <= 0) return;
  await base44.entities.ContasFinanceiras.update(contaDestino.id, {
    saldo_atual: roundToTwoDecimals((contaDestino.saldo_atual || 0) + amount),
  });
}

/** Zera o caixa PDV e credita o dinheiro conferido na conta destino (fechamento). */
export async function transferirDinheiroFechamentoCaixaPDV({
  base44,
  contaCaixaPDV,
  contaDestino,
  dinheiroConferido,
}) {
  const amount = roundToTwoDecimals(dinheiroConferido);
  if (!contaDestino?.id || !contaCaixaPDV?.id || amount <= 0) return;
  await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
  await creditarContaDestinoCaixaPDV(base44, contaDestino, amount);
}
