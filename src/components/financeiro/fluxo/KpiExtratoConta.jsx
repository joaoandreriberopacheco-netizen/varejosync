import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { P38_ACCENT } from './financeiroP38';
import {
  FinanceiroKpiItem,
  FinanceiroKpiSaldo,
  FinanceiroKpiStrip,
  formatKpiValor,
} from './FinanceiroKpiInline';

export default function KpiExtratoConta({ kpis, layout = 'card', saldoLabel = 'Saldo' }) {
  const taxa = kpis.entradas > 0 ? (kpis.saidas / kpis.entradas * 100).toFixed(0) : 0;

  return (
    <FinanceiroKpiStrip layout={layout}>
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
