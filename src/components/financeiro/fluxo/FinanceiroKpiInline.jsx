import React from 'react';
import { cn } from '@/lib/utils';
import { P38_ACCENT, P38_KPI_SHELL } from './financeiroP38';

export const formatKpiValor = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export function FinanceiroKpiItem({ icon: Icon, iconClass, label, value, sub, valueClass = 'text-foreground', className }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0', className)}>
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[8px] uppercase tracking-wide text-muted-foreground sm:text-[9px]">
        {Icon && <Icon className={cn('h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3', iconClass)} />}
        {label}
      </span>
      <span className={cn('text-xs font-semibold leading-none tabular-nums sm:text-[13px] md:text-sm', valueClass)}>{value}</span>
      {sub && <span className="whitespace-nowrap text-[8px] text-muted-foreground sm:text-[9px]">{sub}</span>}
    </div>
  );
}

export function FinanceiroKpiSaldo({ label = 'Saldo', value, percent, positive, className }) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 sm:gap-x-1.5', className)}>
      <span className="shrink-0 whitespace-nowrap text-[8px] uppercase tracking-wide text-muted-foreground sm:text-[9px]">{label}</span>
      <span className={cn('text-xs font-semibold leading-none tabular-nums sm:text-[13px] md:text-sm', positive ? P38_ACCENT : 'text-foreground/80')}>
        {value}
      </span>
      <div className="flex min-w-[3rem] items-center gap-1 sm:min-w-[3.5rem]">
        <div className="h-1 w-8 overflow-hidden rounded-full bg-secondary/80 dark:bg-[#383e47] sm:w-12">
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
            : 'grid grid-cols-2 gap-x-2 gap-y-2 sm:gap-x-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-1',
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
