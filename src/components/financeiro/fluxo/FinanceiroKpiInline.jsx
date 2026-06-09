import React from 'react';
import { cn } from '@/lib/utils';
import { P38_ACCENT, P38_KPI_SHELL } from './financeiroP38';

export const formatKpiValor = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function FinanceiroKpiItem({ icon: Icon, iconClass, label, value, sub, valueClass = 'text-foreground' }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={cn('h-3 w-3 shrink-0', iconClass)} />}
        {label}
      </span>
      <span className={cn('text-[13px] font-semibold leading-none tabular-nums sm:text-sm', valueClass)}>{value}</span>
      {sub && <span className="whitespace-nowrap text-[9px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function FinanceiroKpiSaldo({ label = 'Saldo', value, percent, positive }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="shrink-0 whitespace-nowrap text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-[13px] font-semibold leading-none tabular-nums sm:text-sm', positive ? P38_ACCENT : 'text-red-600 dark:text-red-400')}>
        {value}
      </span>
      <div className="flex min-w-[3.5rem] items-center gap-1">
        <div className="h-1 w-10 overflow-hidden rounded-full bg-secondary/80 dark:bg-[#383e47] sm:w-12">
          <div
            className="h-full rounded-full bg-[#4a5240] transition-all dark:bg-[#a4ce33]"
            style={{ width: `${Math.min(Number(percent), 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{percent}%</span>
      </div>
    </div>
  );
}

export function FinanceiroKpiStrip({ children, footer }) {
  return (
    <div className={cn(P38_KPI_SHELL, 'space-y-1.5')}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 md:flex-nowrap md:justify-between md:gap-x-4">
        {children}
      </div>
      {footer}
    </div>
  );
}
