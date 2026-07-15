import React from 'react';
import FinanceiroResumoBar from '@/components/financeiro/fluxo/FinanceiroResumoBar';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { cn } from '@/lib/utils';

export default function FolhaPrevisaoResumo({
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
        <P38HelpPopover
          label="Ajuda: modo planejamento"
          side="bottom"
          align="end"
          size="sm"
        >
          <p className="font-medium text-foreground">Modo planejamento</p>
          <p className="text-muted-foreground">
            Você já vê a previsão com base nas pessoas cadastradas, mesmo antes de abrir o mês.
          </p>
          <p className="text-muted-foreground">
            {mesFuturo
              ? 'Este mês ainda não precisa estar aberto para consultar os valores.'
              : 'Abra o mês quando quiser registrar vales e movimentos.'}
          </p>
        </P38HelpPopover>
      </span>,
    );
  }
  if (totais?.totalValesPendentes > 0) {
    chips.push(
      <FinanceiroSummaryChip key="vales" className="text-amber-800 dark:text-amber-300">
        Vale em aberto {formatFinanceiroValor(totais.totalValesPendentes)}
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.totalDecimo > 0) {
    chips.push(
      <FinanceiroSummaryChip key="decimo">
        13º {formatFinanceiroValor(totais.totalDecimo)}
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.totalFerias > 0) {
    chips.push(
      <FinanceiroSummaryChip key="ferias">
        Férias {formatFinanceiroValor(totais.totalFerias)}
      </FinanceiroSummaryChip>,
    );
  }
  if (totais?.desligados > 0) {
    chips.push(
      <FinanceiroSummaryChip key="desligados">
        {totais.desligados} desligado(s)
      </FinanceiroSummaryChip>,
    );
  }

  return (
    <div className={cn(P38_KPI_SHELL, 'space-y-2')}>
      <FinanceiroResumoBar
        receitas={totais?.proventos || 0}
        despesas={totais?.descontos || 0}
        variacao={totais?.liquido || 0}
        saldo={totais?.custoTotalEmpresa || 0}
        saldoComSinal
        periodoLabel={competenciaLabel}
      />
      <FinanceiroListaMeta
        total={count || 0}
        totalLabel="pessoas na folha"
        summaryChips={chips.length ? chips : null}
      />
    </div>
  );
}
