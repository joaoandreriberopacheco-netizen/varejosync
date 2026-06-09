import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

import { P38_ACCENT, P38_KPI_SHELL } from './financeiroP38';

const kpiShell = P38_KPI_SHELL;

function KpiCell({ icon: Icon, iconClass, label, value, sub, valueClass = 'text-foreground' }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 flex min-w-0 items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={`h-3 w-3 shrink-0 ${iconClass || ''}`} />}
        <span className="truncate">{label}</span>
      </p>
      <p className={`text-[13px] font-semibold leading-tight tabular-nums sm:text-sm ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;
  const gridClass = kpis.vencidos > 0
    ? 'grid-cols-2 md:grid-cols-4'
    : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`${kpiShell} space-y-2`}>
      <div className={`grid min-w-0 gap-x-3 gap-y-2 ${gridClass}`}>
        <KpiCell
          icon={TrendingUp}
          iconClass={P38_ACCENT}
          label="Receitas"
          value={R(kpis.entrou)}
          sub={kpis.pEntrou > 0 ? `+${R(kpis.pEntrou)} prev.` : null}
        />
        <KpiCell
          icon={TrendingDown}
          iconClass="text-red-500 dark:text-red-400"
          label="Despesas"
          value={R(kpis.saiu)}
          sub={kpis.pSaiu > 0 ? `+${R(kpis.pSaiu)} prev.` : null}
        />
        <div className="min-w-0">
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">Saldo</p>
          <p className="text-[13px] font-semibold leading-tight tabular-nums sm:text-sm">
            <span className={kpis.saldo >= 0 ? P38_ACCENT : 'text-red-600 dark:text-red-400'}>
              {kpis.saldo >= 0 ? '+' : '−'}
            </span>
            {R(Math.abs(kpis.saldo))}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary/80 dark:bg-[#383e47]">
              <div
                className="h-full rounded-full bg-[#4a5240] transition-all dark:bg-[#a4ce33]"
                style={{ width: `${Math.min(Number(taxa), 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{taxa}%</span>
          </div>
        </div>
        {kpis.vencidos > 0 && (
          <KpiCell
            icon={AlertTriangle}
            iconClass="text-red-500 dark:text-red-400"
            label="Vencidos"
            value={
              <>
                <span className="text-red-600 dark:text-red-400">−</span>
                {R(kpis.vencidos)}
              </>
            }
            sub={`${kpis.qtdVencidos} lç.`}
            valueClass="text-foreground"
          />
        )}
      </div>

      {kpis.totalTransferencias > 0 && (
        <div className="flex items-center gap-2 border-t border-border/40 pt-2 dark:border-white/10">
          <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-[9px] uppercase tracking-wide text-muted-foreground">Transferências</p>
          <p className="text-xs font-semibold tabular-nums text-foreground">{R(kpis.totalTransferencias)}</p>
        </div>
      )}
    </div>
  );
}
