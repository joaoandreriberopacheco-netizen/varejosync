import React from 'react';
import { Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FinanceiroSummaryChip({ children, className }) {
  return (
    <span
      className={cn(
        'rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-[#383e47] dark:text-foreground/80',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Contagens e alertas acima da lista — fora do painel de KPIs. */
export default function FinanceiroListaMeta({
  total,
  totalLabel = 'lançamentos',
  conciliacaoPendente = 0,
  onConciliacaoClick,
  hasActiveFilters,
  onLimparFiltros,
  summaryChips,
  extraActions,
}) {
  return (
    <div className="min-w-0 space-y-2">
      {conciliacaoPendente > 0 && onConciliacaoClick && (
        <button
          type="button"
          onClick={onConciliacaoClick}
          className="flex w-full items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-left text-xs text-foreground/90 dark:border-white/10 dark:bg-[#26262e]/80 hover:bg-secondary/80 dark:hover:bg-[#383e47]/60 transition-colors"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            {conciliacaoPendente} aguardando conciliação
          </span>
          <span className="shrink-0 font-semibold text-muted-foreground">Ver →</span>
        </button>
      )}

      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="shrink-0 text-[11px] text-muted-foreground">
          {total} {totalLabel}
        </p>
        {(summaryChips || extraActions || (hasActiveFilters && onLimparFiltros)) && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
            {summaryChips}
            {extraActions}
            {hasActiveFilters && onLimparFiltros && (
              <button
                type="button"
                onClick={onLimparFiltros}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground/90"
              >
                <X className="h-3 w-3" /> Limpar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
