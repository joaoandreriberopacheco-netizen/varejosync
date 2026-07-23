import React from 'react';
import { ArrowDown, ArrowUp, RefreshCw, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUGESTAO_COMPRA_SORT_COLUMNS } from '@/lib/sugestaoCompraColumnSort';
import { cn } from '@/components/utils';

export default function SugestaoCompraMobileToolbar({
  filteredCount,
  selectedCount,
  allSelected,
  onSelectAll,
  columnSort,
  onSortColumn,
  activeFilterCount,
  onOpenFilters,
  somenteAbaixoPontoFuturo,
  onToggleSomenteAbaixo,
  considerarPedidosAprovadosEstoque,
  onToggleConsiderarPedidos,
  onRefresh,
  isLoading,
}) {
  const currentColumn = SUGESTAO_COMPRA_SORT_COLUMNS.find((c) => c.id === columnSort.column)
    || SUGESTAO_COMPRA_SORT_COLUMNS[0];
  const SortIcon = columnSort.direction === 'desc' ? ArrowDown : ArrowUp;

  return (
    <div className="shrink-0 space-y-2 px-2.5 pt-1 pb-2 w-full min-w-0 max-w-full overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleSomenteAbaixo}
          className={cn(
            'h-8 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
            somenteAbaixoPontoFuturo
              ? 'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500'
              : 'bg-muted/50 text-muted-foreground border-border/30',
          )}
        >
          Com sugestão
        </button>
        <button
          type="button"
          onClick={onToggleConsiderarPedidos}
          className={cn(
            'h-8 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
            considerarPedidosAprovadosEstoque
              ? 'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500'
              : 'bg-muted/50 text-muted-foreground border-border/30',
          )}
        >
          Incluir pedidos
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium bg-muted/50 text-foreground/85 border border-border/30"
            >
              <TrendingUp className="w-3.5 h-3.5 rotate-90" />
              {currentColumn.label}
              <SortIcon className="w-3 h-3 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SUGESTAO_COMPRA_SORT_COLUMNS.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => onSortColumn(col.id)}
                className={columnSort.column === col.id ? 'font-semibold' : ''}
              >
                {col.label}
                {columnSort.column === col.id
                  ? (columnSort.direction === 'desc' ? ' (↓)' : ' (↑)')
                  : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            'inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium border border-border/30',
            activeFilterCount > 0
              ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200'
              : 'bg-muted/50 text-muted-foreground',
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-muted/50"
          onClick={onRefresh}
          disabled={isLoading}
          title="Atualizar"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <label className="inline-flex items-center gap-2 min-h-[32px] text-[11px] text-muted-foreground cursor-pointer">
        <Checkbox checked={allSelected} onCheckedChange={onSelectAll} className="h-4 w-4" />
        <span>
          Selecionar {filteredCount}
          {selectedCount > 0 ? ` · ${selectedCount} marcados` : ''}
        </span>
      </label>
    </div>
  );
}
