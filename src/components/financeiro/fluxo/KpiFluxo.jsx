import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { P38_ACCENT } from './financeiroP38';
import {
  FinanceiroKpiItem,
  FinanceiroKpiSaldo,
  FinanceiroKpiStrip,
  formatKpiValor,
} from './FinanceiroKpiInline';

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  return (
    <FinanceiroKpiStrip
      footer={
        kpis.totalTransferencias > 0 ? (
          <div className="flex items-center gap-2 border-t border-border/40 pt-1.5 dark:border-white/10">
            <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 text-[9px] uppercase tracking-wide text-muted-foreground">Transferências</p>
            <p className="text-xs font-semibold tabular-nums text-foreground">{formatKpiValor(kpis.totalTransferencias)}</p>
          </div>
        ) : null
      }
    >
      <FinanceiroKpiItem
        icon={TrendingUp}
        iconClass={P38_ACCENT}
        label="Receitas"
        value={formatKpiValor(kpis.entrou)}
        sub={kpis.pEntrou > 0 ? `+${formatKpiValor(kpis.pEntrou)} prev.` : null}
      />
      <FinanceiroKpiItem
        icon={TrendingDown}
        iconClass="text-red-500 dark:text-red-400"
        label="Despesas"
        value={formatKpiValor(kpis.saiu)}
        sub={kpis.pSaiu > 0 ? `+${formatKpiValor(kpis.pSaiu)} prev.` : null}
      />
      <FinanceiroKpiSaldo
        value={
          <>
            {kpis.saldo >= 0 ? '+' : '−'}
            {formatKpiValor(Math.abs(kpis.saldo))}
          </>
        }
        percent={taxa}
        positive={kpis.saldo >= 0}
      />
      {kpis.vencidos > 0 && (
        <FinanceiroKpiItem
          icon={AlertTriangle}
          iconClass="text-red-500 dark:text-red-400"
          label="Vencidos"
          value={
            <>
              <span className="text-red-600 dark:text-red-400">−</span>
              {formatKpiValor(kpis.vencidos)}
            </>
          }
          sub={`${kpis.qtdVencidos} lç.`}
        />
      )}
    </FinanceiroKpiStrip>
  );
}
