import React from 'react';
import FinanceiroResumoBar from '@/components/financeiro/fluxo/FinanceiroResumoBar';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { cn } from '@/lib/utils';

export default function FolhaPrevisaoResumo({ totais, count, competenciaLabel }) {
  const chips = [];

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
