import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { P38_ACCENT } from './financeiroP38';
import {
  FinanceiroKpiItem,
  FinanceiroKpiSaldo,
  FinanceiroKpiStrip,
  formatKpiValor,
} from './FinanceiroKpiInline';

export default function KpiExtratoConta({ kpis, layout = 'card', saldoLabel = 'Saldo na conta' }) {
  const taxa = kpis.entradas > 0 ? (kpis.saidas / kpis.entradas * 100).toFixed(0) : 0;

  return (
    <FinanceiroKpiStrip
      layout={layout}
      footer={
        <div className="space-y-1 border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground dark:border-white/10">
          {kpis.saldoPeriodo != null && (
            <p>
              Resultado do período:{' '}
              <span className="font-semibold tabular-nums text-foreground">
                {kpis.saldoPeriodo >= 0 ? '+' : '−'}
                {formatKpiValor(Math.abs(kpis.saldoPeriodo))}
              </span>
            </p>
          )}
          {kpis.entradas > 0 && (
            <p className="text-[9px] opacity-80">
              Proporção saídas ÷ entradas no período: {taxa}% (a barrinha trava em 100%).
            </p>
          )}
          <p className="text-[9px] opacity-80">
            &quot;{saldoLabel}&quot; é o total na conta; &quot;Hoje&quot; na lista é só o movimento daquele dia.
          </p>
        </div>
      }
    >
      <FinanceiroKpiItem
        layout={layout}
        icon={TrendingUp}
        iconClass={P38_ACCENT}
        label="Entradas"
        value={formatKpiValor(kpis.entradas)}
      />
      <FinanceiroKpiItem
        layout={layout}
        icon={TrendingDown}
        iconClass="text-foreground/50"
        label="Saídas"
        value={formatKpiValor(kpis.saidas)}
      />
      <FinanceiroKpiSaldo
        layout={layout}
        label={saldoLabel}
        value={
          <>
            {kpis.saldo >= 0 ? '+' : '−'}
            {formatKpiValor(Math.abs(kpis.saldo))}
          </>
        }
        percent={taxa}
        positive={kpis.saldo >= 0}
      />
    </FinanceiroKpiStrip>
  );
}
