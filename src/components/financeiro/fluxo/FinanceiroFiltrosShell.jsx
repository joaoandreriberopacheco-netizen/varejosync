import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { P38_SEARCH } from './financeiroP38';

/**
 * Busca + ícone sliders que expande filtros — sem faixa nem rodapé extra.
 */
export default function FinanceiroFiltrosShell({
  search,
  onSearch,
  searchPlaceholder = 'Buscar...',
  filtersOpen,
  onFiltersOpenChange,
  hasActiveFilters,
  children,
}) {
  return (
    <Collapsible open={filtersOpen} onOpenChange={onFiltersOpenChange} className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className={cn('flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5', P38_SEARCH)}>
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

        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label="Filtros"
            className={cn(
              'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              P38_SEARCH,
              filtersOpen && 'ring-1 ring-[#4a5240]/40 dark:ring-[#a4ce33]/40',
            )}
          >
            <SlidersHorizontal className="h-4 w-4 text-foreground/90" />
            {hasActiveFilters && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#4a5240] dark:bg-[#a4ce33]" />
            )}
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-2 rounded-xl border border-border/40 bg-card/50 px-3 py-3 dark:border-white/10 dark:bg-[#26262e]/60">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
