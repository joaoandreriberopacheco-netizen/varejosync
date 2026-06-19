import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKpiValor } from './FinanceiroKpiInline';

function KpiSegment({ icon: Icon, value, valueClass, iconClass }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 tabular-nums text-[11px] font-semibold md:text-xs',
        valueClass,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0 md:h-4 md:w-4', iconClass ?? valueClass)} aria-hidden />
      {value}
    </span>
  );
}

/** Faixa única — Fluxo de Caixa (receitas, despesas, variação, saldo em contas). */
export default function KpiFluxoBar({ kpis }) {
  const variacao = kpis.saldo ?? 0;
  const variacaoPos = variacao >= 0;
  const posClass = 'text-[#4A5D23] dark:text-[#a4ce33]';
  const negClass = 'text-red-600 dark:text-red-400';

  return (
    <div
      className="flex min-w-0 items-center gap-2 pb-0.5 md:gap-3 md:overflow-x-auto md:pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
      title={`Receitas ${formatKpiValor(kpis.entrou)} · Despesas ${formatKpiValor(kpis.saiu)} · Variação ${variacaoPos ? '+' : '−'}${formatKpiValor(Math.abs(variacao))} · Saldo ${formatKpiValor(kpis.saldoContas)}`}
    >
      <KpiSegment icon={TrendingUp} value={formatKpiValor(kpis.entrou)} valueClass={posClass} />
      <span className="shrink-0 text-muted-foreground/35" aria-hidden>
        ·
      </span>
      <KpiSegment icon={TrendingDown} value={`−${formatKpiValor(kpis.saiu)}`} valueClass={negClass} />
      <span className="hidden shrink-0 text-muted-foreground/35 md:inline" aria-hidden>
        ·
      </span>
      <span className="hidden md:contents">
        <KpiSegment
          icon={ArrowUpDown}
          value={`${variacaoPos ? '+' : '−'}${formatKpiValor(Math.abs(variacao))}`}
          valueClass={variacaoPos ? posClass : negClass}
        />
      </span>
      {kpis.saldoContas != null && (
        <>
          <span className="shrink-0 text-muted-foreground/35" aria-hidden>
            ·
          </span>
          <KpiSegment
            icon={Wallet}
            value={formatKpiValor(kpis.saldoContas)}
            valueClass="text-foreground"
            iconClass="text-foreground/70"
          />
        </>
      )}
    </div>
  );
}
