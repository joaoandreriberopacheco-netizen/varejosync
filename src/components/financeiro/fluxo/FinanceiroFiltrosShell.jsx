import React from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { P38_FILTROS_BOX, P38_SEARCH } from './financeiroP38';

/**
 * Caixa de busca + filtros recolhíveis — padrão único Fluxo de Caixa / Contas Abertas.
 */
export default function FinanceiroFiltrosShell({
  search,
  onSearch,
  searchPlaceholder = 'Buscar...',
  filtersOpen,
  onFiltersOpenChange,
  hasActiveFilters,
  onLimparFiltros,
  totalLabel,
  summaryChips = null,
  footerActions = null,
  children,
}) {
  return (
    <div className={P38_FILTROS_BOX}>
      <div className="p-2">
        <div className={cn('flex h-10 min-w-0 items-center gap-2 rounded-lg px-2.5', P38_SEARCH)}>
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            autoComplete="off"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          {search && (
            <button type="button" onClick={() => onSearch('')} aria-label="Limpar busca">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={onFiltersOpenChange}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 border-t border-border/40 px-3 py-2 text-left transition-colors hover:bg-secondary/30 dark:border-white/10 dark:hover:bg-[#383e47]/40"
          >
            <div className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/90">Filtros</span>
              {hasActiveFilters && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a5240] dark:bg-[#a4ce33]" />
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                filtersOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/40 px-3 py-3 dark:border-white/10">
          {children}
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col gap-2 border-t border-border/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        <p className="shrink-0 text-[11px] text-muted-foreground">{totalLabel}</p>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {summaryChips}
          {footerActions}
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
      </div>
    </div>
  );
}

/** Chip resumo quando filtros estão recolhidos. */
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
