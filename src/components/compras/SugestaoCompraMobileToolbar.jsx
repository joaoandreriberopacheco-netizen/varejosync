import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  RefreshCw,
  RotateCw,
  SlidersHorizontal,
  Table2,
  TrendingUp,
} from 'lucide-react';
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
  viewMode = 'cards',
  onViewModeChange,
  showRotateHint = false,
}) {
  const currentColumn = SUGESTAO_COMPRA_SORT_COLUMNS.find((c) => c.id === columnSort.column)
    || SUGESTAO_COMPRA_SORT_COLUMNS[0];
  const SortIcon = columnSort.direction === 'desc' ? ArrowDown : ArrowUp;

  return (
    <div className="sticky top-0 z-30 -mx-0.5 px-0.5 py-2 space-y-2 bg-background/95 backdrop-blur-sm border-b border-border/30">
      {showRotateHint ? (
        <button
          type="button"
          onClick={() => onViewModeChange?.('table')}
          className="w-full flex items-center gap-2 rounded-xl border border-teal-200/80 bg-teal-50/80 dark:bg-teal-950/30 dark:border-teal-800/50 px-3 py-2 text-left"
        >
          <RotateCw className="w-4 h-4 shrink-0 text-teal-700 dark:text-teal-300" />
          <span className="text-[11px] leading-snug text-teal-900 dark:text-teal-100">
            <span className="font-medium">Compare colunas:</span>
            {' '}
            gire o celular na horizontal ou toque aqui para ver em tabela.
          </span>
        </button>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        <div className="shrink-0 inline-flex rounded-full border border-border/30 bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange?.('cards')}
            className={cn(
              'inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium transition-colors',
              viewMode === 'cards'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange?.('table')}
            className={cn(
              'inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            Tabela
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleSomenteAbaixo}
          className={cn(
            'shrink-0 h-8 px-2.5 rounded-full text-[11px] font-medium border transition-colors',
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
            'shrink-0 h-9 px-3 rounded-full text-xs font-medium border transition-colors',
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
              className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium bg-muted/50 text-foreground/85 border border-border/30"
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
            'shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium border border-border/30',
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
          className="shrink-0 h-8 w-8 rounded-full bg-muted/50"
          onClick={onRefresh}
          disabled={isLoading}
          title="Atualizar"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 min-h-[36px] text-[11px] text-muted-foreground cursor-pointer">
          <Checkbox checked={allSelected} onCheckedChange={onSelectAll} className="h-4 w-4" />
          <span>
            Selecionar {filteredCount}
            {selectedCount > 0 ? ` · ${selectedCount} marcados` : ''}
          </span>
        </label>
      </div>
    </div>
  );
}
