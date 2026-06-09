import React from 'react';
import { cn } from '@/lib/utils';
import { P38_ACCENT, P38_KPI_SHELL } from './financeiroP38';

export const formatKpiValor = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function FinanceiroKpiItem({ icon: Icon, iconClass, label, value, sub, valueClass = 'text-foreground', className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 md:flex-row md:flex-wrap md:items-baseline md:gap-x-1.5 md:gap-y-0', className)}>
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] uppercase tracking-wide text-foreground/55 md:text-muted-foreground">
        {Icon && <Icon className={cn('h-3 w-3 shrink-0', iconClass)} />}
        {label}
      </span>
      <span className={cn('text-[13px] font-semibold leading-tight tabular-nums md:text-sm', valueClass)}>{value}</span>
      {sub && (
        <span className="whitespace-nowrap text-[9px] text-foreground/45 md:text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}

export function FinanceiroKpiSaldo({ label = 'Saldo', value, percent, positive, className }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-1.5 md:gap-y-0.5', className)}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="shrink-0 whitespace-nowrap text-[9px] uppercase tracking-wide text-foreground/55 md:text-muted-foreground">{label}</span>
        <span className={cn('text-[13px] font-semibold leading-tight tabular-nums md:text-sm', positive ? P38_ACCENT : 'text-foreground/80')}>
          {value}
        </span>
      </div>
      <div className="flex w-full min-w-0 items-center gap-1.5 md:w-auto md:min-w-[3.5rem]">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary/80 dark:bg-[#383e47] md:w-12 md:flex-none">
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

export function FinanceiroKpiStrip({ children, footer, embedded = false }) {
  return (
    <div className={cn(embedded ? 'min-w-0 md:py-0.5' : P38_KPI_SHELL, !embedded && 'space-y-1.5')}>
      <div
        className={cn(
          'min-w-0',
          embedded
            ? 'hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex md:gap-x-4'
            : 'grid grid-cols-2 gap-x-3 gap-y-2.5 py-0.5 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-1 md:py-0',
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
