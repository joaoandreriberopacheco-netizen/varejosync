import React from 'react';
import { X } from 'lucide-react';
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
  hasActiveFilters,
  onLimparFiltros,
  summaryChips,
  extraActions,
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
  );
}
