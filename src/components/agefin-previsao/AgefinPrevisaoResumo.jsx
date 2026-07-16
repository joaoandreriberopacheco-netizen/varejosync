import React from 'react';
import FinanceiroResumoBar from '@/components/financeiro/fluxo/FinanceiroResumoBar';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { cn } from '@/lib/utils';

export default function AgefinPrevisaoResumo({
  totais,
  count,
  competenciaLabel,
  countPlanejamento = 0,
  mesFuturo = false,
}) {
  const chips = [];

  if (countPlanejamento > 0) {
    chips.push(
      <span key="plan" className="inline-flex items-center gap-0.5">
        <FinanceiroSummaryChip className="text-cyan-800 dark:text-cyan-300">
          {countPlanejamento} em planejamento
        </FinanceiroSummaryChip>
        <P38HelpPopover label="Ajuda: modo planejamento" side="bottom" align="end" size="sm">
          <p className="font-medium text-foreground">Modo planejamento</p>
          <p className="text-muted-foreground">
            Valores estimados a partir das contas cadastradas, mesmo antes de abrir o mês.
          </p>
          <p className="text-muted-foreground">
            {mesFuturo
              ? 'Este mês ainda não precisa estar aberto para consultar os valores.'
              : 'Abra o mês quando quiser gerar as contas; depois edite valor e vencimento à mão e vincule o boleto se quiser.'}
          </p>
        </P38HelpPopover>
      </span>,
    );
  }
  if (totais?.comBoleto > 0) {
    chips.push(
      <FinanceiroSummaryChip key="pdf" className="text-emerald-800 dark:text-emerald-300">
        {totais.comBoleto} com boleto
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.semBoleto > 0) {
    chips.push(
      <FinanceiroSummaryChip key="auto" className="text-amber-800 dark:text-amber-300">
        {totais.semBoleto} sem boleto
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.vencidas > 0) {
    chips.push(
      <FinanceiroSummaryChip key="venc" className="text-red-800 dark:text-red-300">
        {totais.vencidas} vencida(s)
      </FinanceiroSummaryChip>,
    );
  }

  return (
    <div className={cn(P38_KPI_SHELL, 'space-y-2')}>
      <FinanceiroResumoBar
        receitas={0}
        despesas={totais?.total || 0}
        variacao={-(totais?.total || 0)}
        saldo={totais?.total || 0}
        saldoComSinal
        periodoLabel={competenciaLabel}
        receitasLabel="—"
        despesasLabel="Previsto"
        variacaoLabel="Total mês"
        saldoLabel="Comprometido"
      />
      <FinanceiroListaMeta count={count} chips={chips} />
    </div>
  );
}
