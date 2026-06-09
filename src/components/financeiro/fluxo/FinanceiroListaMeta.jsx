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

/** Meta compacta acima da lista — contagem, conciliação e filtros numa faixa fina. */
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
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <p className="shrink-0 text-[11px] text-muted-foreground">
          {total} {totalLabel}
        </p>
        {conciliacaoPendente > 0 && onConciliacaoClick && (
          <button
            type="button"
            onClick={onConciliacaoClick}
            className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground/90"
          >
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">{conciliacaoPendente} conciliação</span>
            <span className="shrink-0 font-semibold">→</span>
          </button>
        )}
      </div>

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
  );
}
