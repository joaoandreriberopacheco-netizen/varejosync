import React from 'react';
import { Search, X, SlidersHorizontal, Clock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { P38_CHIP_ACTIVE, P38_FIELD_SURFACE, P38_FILTROS_STICKY, P38_SEARCH } from './financeiroP38';

const iconBtnBase = cn(
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90',
  P38_FIELD_SURFACE,
);

/**
 * Busca + ícones ao lado: filtros (sliders) e atalho de conciliação pendente (relógio + badge).
 */
export default function FinanceiroFiltrosShell({
  search,
  onSearch,
  searchPlaceholder = 'Buscar...',
  filtersOpen,
  onFiltersOpenChange,
  hasActiveFilters,
  conciliacaoPendente = 0,
  pendentes = false,
  onPendentesToggle,
  children,
}) {
  const badgeLabel =
    conciliacaoPendente > 99 ? '99+' : conciliacaoPendente > 0 ? String(conciliacaoPendente) : null;

  return (
    <Collapsible
      open={filtersOpen}
      onOpenChange={onFiltersOpenChange}
      className={cn(
        'min-w-0',
        P38_FILTROS_STICKY,
        filtersOpen && 'border-b border-border/40 dark:border-white/10 md:border-b-0',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className={cn('flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2.5', P38_SEARCH)}>
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            autoComplete="off"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground placeholder:truncate sm:text-sm"
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
            aria-expanded={filtersOpen}
            className={cn(iconBtnBase, filtersOpen && 'ring-1 ring-border/60')}
          >
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            {hasActiveFilters && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#4a5240] dark:bg-[#a4ce33]" />
            )}
          </button>
        </CollapsibleTrigger>

        {onPendentesToggle && (
          <button
            type="button"
            aria-label="Aguardando conciliação"
            aria-pressed={pendentes}
            title="Filtrar aguardando conciliação"
            onClick={() => onPendentesToggle(!pendentes)}
            className={cn(
              iconBtnBase,
              pendentes && P38_CHIP_ACTIVE,
            )}
          >
            <Clock className={cn('h-4 w-4', pendentes ? '' : 'text-muted-foreground')} />
            {badgeLabel && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm">
                {badgeLabel}
              </span>
            )}
          </button>
        )}
      </div>

      <CollapsibleContent className={cn('mt-1.5 rounded-xl px-3 py-2.5', P38_FIELD_SURFACE)}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
