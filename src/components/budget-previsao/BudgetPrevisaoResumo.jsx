import React from 'react';
import FinanceiroResumoBar from '@/components/financeiro/fluxo/FinanceiroResumoBar';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { cn } from '@/lib/utils';

export default function BudgetPrevisaoResumo({ totais, competenciaLabel }) {
  const consumo =
    totais?.orcado > 0 ? Math.min(100, Math.round((totais.realizado / totais.orcado) * 100)) : 0;

  const chips = [];
  if (totais?.acima > 0) {
    chips.push(
      <FinanceiroSummaryChip key="acima" className="text-red-800 dark:text-red-300">
        {totais.acima} acima do orçado
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.atencao > 0) {
    chips.push(
      <FinanceiroSummaryChip key="atencao" className="text-amber-800 dark:text-amber-300">
        {totais.atencao} em atenção
      </FinanceiroSummaryChip>,
    );
  }

  return (
    <div className={cn(P38_KPI_SHELL, 'space-y-2.5')}>
      {competenciaLabel && (
        <p className="text-[10px] font-medium uppercase tracking-wide text-foreground/40 dark:text-foreground/45 px-0.5">
          {competenciaLabel}
        </p>
      )}

      <FinanceiroResumoBar
        variant="balancoDia"
        receitas={totais?.orcado || 0}
        despesas={totais?.realizado || 0}
        variacao={totais?.saldo || 0}
        saldo={totais?.saldo || 0}
        saldoComSinal
        periodoLabel={competenciaLabel}
        labels={{
          receitas: 'Orçado',
          despesas: 'Realizado',
          saldo: 'Saldo',
        }}
      />

      <div className="space-y-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
            {consumo}% consumido
          </span>
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                consumo > 100 ? 'bg-red-500' : consumo >= 80 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
              style={{ width: `${Math.min(100, consumo)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.length > 0 && (
            <FinanceiroListaMeta summaryChips={chips} total={0} totalLabel="" />
          )}
          <P38HelpPopover label="Ajuda: acompanhamento de budgets" side="bottom" align="end" size="sm">
            <p className="font-medium text-foreground">Orçado × Realizado</p>
            <p className="text-muted-foreground">
              O orçado é calculado a partir da sua estimativa (dia, semana, ciclo ou mês).
              O realizado soma despesas <strong className="text-foreground">pagas</strong> no Fluxo com a mesma categoria.
            </p>
          </P38HelpPopover>
        </div>
      </div>

      {totais?.count > 0 && (
        <p className="text-[11px] text-muted-foreground px-0.5">
          {totais.count} budget(s) · saldo {formatFinanceiroValor(totais.saldo)}
        </p>
      )}
    </div>
  );
}
