import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle, Wallet } from 'lucide-react';
import { P38_ACCENT } from './financeiroP38';
import {
  FinanceiroKpiItem,
  FinanceiroKpiSaldo,
  FinanceiroKpiStrip,
  formatKpiValor,
} from './FinanceiroKpiInline';

export default function KpiFluxo({ kpis, layout = 'card' }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;
  const isStack = layout === 'stack';

  return (
    <FinanceiroKpiStrip
      layout={layout}
      footer={
        kpis.saldoContas != null || kpis.totalTransferencias > 0 ? (
          <div className="space-y-1.5 border-t border-border/40 pt-1.5 dark:border-white/10">
            {kpis.saldoContas != null && (
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 text-[9px] uppercase tracking-wide text-muted-foreground">Saldo em contas</p>
                <p className="text-xs font-semibold tabular-nums text-foreground">{formatKpiValor(kpis.saldoContas)}</p>
              </div>
            )}
            {kpis.totalTransferencias > 0 && (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 text-[9px] uppercase tracking-wide text-muted-foreground">Transferências</p>
                <p className="text-xs font-semibold tabular-nums text-foreground">{formatKpiValor(kpis.totalTransferencias)}</p>
              </div>
            )}
          </div>
        ) : null
      }
    >
      <FinanceiroKpiItem
        layout={layout}
        icon={TrendingUp}
        iconClass={P38_ACCENT}
        label="Receitas"
        value={formatKpiValor(kpis.entrou)}
        sub={!isStack && kpis.pEntrou > 0 ? `+${formatKpiValor(kpis.pEntrou)} prev.` : null}
      />
      <FinanceiroKpiItem
        layout={layout}
        icon={TrendingDown}
        iconClass="text-foreground/50"
        label="Despesas"
        value={formatKpiValor(kpis.saiu)}
        sub={!isStack && kpis.pSaiu > 0 ? `+${formatKpiValor(kpis.pSaiu)} prev.` : null}
      />
      <FinanceiroKpiSaldo
        layout={layout}
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
          layout={layout}
          icon={AlertTriangle}
          iconClass="text-amber-600 dark:text-amber-400"
          label="Vencidos"
          value={
            <>
              <span className="text-amber-600 dark:text-amber-400">−</span>
              {formatKpiValor(kpis.vencidos)}
            </>
          }
          sub={kpis.qtdVencidos > 0 ? `${kpis.qtdVencidos} lç.` : null}
        />
      )}
    </FinanceiroKpiStrip>
  );
}
