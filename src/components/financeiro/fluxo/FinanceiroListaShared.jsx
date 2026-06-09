import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';

export const formatFinanceiroValor = (v) =>
  `R$ ${(Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Cabeçalho de grupo colapsável — Fluxo de Caixa e Contas Abertas. */
export function FinanceiroGrupo({
  label,
  labelClassName,
  receitas = 0,
  despesas = 0,
  children,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const liquido = receitas - despesas;

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group mb-0.5 flex w-full min-w-0 items-center justify-between gap-2 border-b border-border/50 px-1 py-1.5 dark:border-white/10"
      >
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/75 sm:tracking-widest',
            labelClassName,
          )}
        >
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {receitas > 0 && (
            <span className="text-[11px] font-semibold tabular-nums text-[#4A5D23] dark:text-[#a4ce33]">
              +{formatFinanceiroValor(receitas)}
            </span>
          )}
          {despesas > 0 && (
            <span className="text-[11px] font-semibold tabular-nums text-red-600 dark:text-red-400">
              −{formatFinanceiroValor(despesas)}
            </span>
          )}
          <span
            className={cn(
              'text-[11px] font-bold tabular-nums',
              liquido >= 0 ? 'text-[#4A5D23] dark:text-[#a4ce33]' : 'text-red-600 dark:text-red-400',
            )}
          >
            {liquido >= 0 ? '+' : '−'}
            {formatFinanceiroValor(Math.abs(liquido))}
          </span>
          <ChevronRight
            className={cn('h-3 w-3 text-foreground/50 transition-transform', open && 'rotate-90')}
          />
        </div>
      </button>
      {open && (
        <P38MobileLineList className="block md:!block rounded-lg">
          {children}
        </P38MobileLineList>
      )}
    </div>
  );
}

export function FinanceiroListaEstado({
  loading,
  vazio,
  vazioMensagem,
  vazioIcon: VazioIcon,
  children,
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (vazio) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card py-12 dark:border-white/10 dark:bg-[#26262e]/40">
        {VazioIcon && <VazioIcon className="h-9 w-9 text-muted-foreground/40" />}
        <p className="text-sm text-muted-foreground">{vazioMensagem}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-2 overflow-x-hidden pb-2 md:pb-0">
      {children}
    </div>
  );
}
