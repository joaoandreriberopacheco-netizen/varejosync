import { roundToTwoDecimals } from '@/lib/financialUtils';
import { calcularSaldosTodasContas } from '@/lib/saldoContaFinanceira';

/**
 * Persiste `saldo_atual` alinhado a `calcularSaldoContaFinanceira` (mesma regra do Fluxo e Caixas).
 */
export async function sincronizarSaldosContasFinanceiras(
  base44,
  { contas = [], lancamentos = [], movimentos = [], contaIds = [] } = {},
) {
  const ids = [...new Set((contaIds || []).filter(Boolean))];
  if (!ids.length || !contas.length) return;

  const saldos = calcularSaldosTodasContas(contas, lancamentos, movimentos);

  await Promise.all(
    ids.map((id) => {
      const saldo = saldos[id];
      if (saldo == null) return Promise.resolve();
      return base44.entities.ContasFinanceiras.update(id, {
        saldo_atual: roundToTwoDecimals(saldo),
      });
    }),
  );
}

/** Recarrega dados e persiste saldos — mesma regra do Fluxo e Caixas. */
export async function sincronizarSaldosAposAlteracao(base44, contaIds = []) {
  const ids = [...new Set((contaIds || []).filter(Boolean))];
  if (!ids.length) return;

  const [contas, lancamentos, movimentos] = await Promise.all([
    base44.entities.ContasFinanceiras.list(),
    base44.entities.LancamentoFinanceiro.list(),
    base44.entities.MovimentosCaixa.list(),
  ]);

  await sincronizarSaldosContasFinanceiras(base44, {
    contas,
    lancamentos,
    movimentos,
    contaIds: ids,
  });
}
