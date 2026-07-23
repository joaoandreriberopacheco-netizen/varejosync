import React from 'react';
import { ArrowDown, ArrowUp, RefreshCw, SlidersHorizontal, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const CHIP_ACTIVE =
  'bg-teal-600 text-white border-teal-600 dark:bg-teal-500 dark:border-teal-500';
const CHIP_IDLE = 'bg-muted/50 text-muted-foreground border-border/30';

export default function SugestaoCompraQuickChips({
  somenteAbaixoPontoFuturo,
  onToggleSomenteAbaixo,
  considerarPedidosAprovadosEstoque,
  onToggleConsiderarPedidos,
  columnSort,
  onSortColumn,
  onGerarRelatorio,
  gerandoRelatorio,
  filteredCount = 0,
  activeFilterCount = 0,
  onOpenFilters,
  onRefresh,
  isLoading,
  size = 'sm',
}) {
  const currentColumn = SUGESTAO_COMPRA_SORT_COLUMNS.find((c) => c.id === columnSort.column)
    || SUGESTAO_COMPRA_SORT_COLUMNS[0];
  const SortIcon = columnSort.direction === 'desc' ? ArrowDown : ArrowUp;
  const chipClass = size === 'md'
    ? 'h-9 px-3 rounded-full text-xs font-medium border transition-colors'
    : 'h-8 px-2.5 rounded-full text-[11px] font-medium border transition-colors';

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
      <button
        type="button"
        onClick={onToggleSomenteAbaixo}
        className={cn(chipClass, somenteAbaixoPontoFuturo ? CHIP_ACTIVE : CHIP_IDLE)}
      >
        Com sugestão
      </button>
      <button
        type="button"
        onClick={onToggleConsiderarPedidos}
        className={cn(chipClass, considerarPedidosAprovadosEstoque ? CHIP_ACTIVE : CHIP_IDLE)}
      >
        Incluir pedidos
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 font-medium border',
              chipClass,
              'bg-muted/50 text-foreground/85 border-border/30',
            )}
          >
            <TrendingUp className={size === 'md' ? 'w-4 h-4 rotate-90' : 'w-3.5 h-3.5 rotate-90'} />
            {currentColumn.label}
            <SortIcon className={size === 'md' ? 'w-3.5 h-3.5 opacity-70' : 'w-3 h-3 opacity-70'} />
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={gerandoRelatorio || filteredCount === 0}
            className={cn(
              'inline-flex items-center gap-1 font-medium border border-border/30',
              chipClass,
              gerandoRelatorio || filteredCount === 0
                ? 'bg-muted/30 text-muted-foreground/60'
                : 'bg-muted/50 text-muted-foreground',
            )}
          >
            <FileSpreadsheet className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            {gerandoRelatorio ? 'Gerando...' : 'Relatório'}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs">Exportar visíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onGerarRelatorio?.('pdf')}>
            PDF (A4)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onGerarRelatorio?.('xlsx')}>
            Excel (.xlsx)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {onOpenFilters ? (
        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(
            'inline-flex items-center gap-1 font-medium border border-border/30',
            chipClass,
            activeFilterCount > 0
              ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200'
              : 'bg-muted/50 text-muted-foreground',
          )}
        >
          <SlidersHorizontal className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          Filtros
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      ) : null}
      {onRefresh ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-full bg-muted/50 shrink-0',
            size === 'md' ? 'h-9 w-9' : 'h-8 w-8',
          )}
          onClick={onRefresh}
          disabled={isLoading}
          title="Atualizar"
        >
          <RefreshCw className={cn(
            'text-muted-foreground',
            size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5',
            isLoading && 'animate-spin',
          )}
          />
        </Button>
      ) : null}
    </div>
  );
}
