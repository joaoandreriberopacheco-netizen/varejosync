import React from 'react';
import { CheckSquare, Square, TrendingUp } from 'lucide-react';
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
import ProdutosTreeByCategoryToggle from '@/components/produtos/ProdutosTreeByCategoryToggle';
import { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import { cn } from '@/components/utils';

export default function SugestaoCompraDesktopToolbar({
  filteredCount,
  selectedCount,
  allSelected,
  someSelected,
  onSelectAllVisible,
  columnSort,
  onSortColumn,
  groupByCategory,
  onGroupByCategoryChange,
  treeLevel,
  onTreeLevelChange,
}) {
  const currentSortColumn = SUGESTAO_COMPRA_SORT_COLUMNS.find((c) => c.id === columnSort.column)
    || SUGESTAO_COMPRA_SORT_COLUMNS[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/25 dark:bg-muted/15 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Button
          type="button"
          variant={allSelected ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'h-10 rounded-xl gap-2 text-sm font-medium shrink-0',
            allSelected && 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500',
          )}
          onClick={() => onSelectAllVisible?.(!allSelected)}
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 shrink-0" />
          ) : (
            <Square className="w-4 h-4 shrink-0" />
          )}
          {allSelected
            ? `Desmarcar visíveis (${filteredCount})`
            : `Selecionar visíveis (${filteredCount})`}
        </Button>
        {someSelected && !allSelected ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedCount} de {filteredCount} marcados
          </span>
        ) : null}
        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={() => onSelectAllVisible?.(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Limpar seleção
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs gap-1.5 rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 rotate-90" />
              <span className="max-w-[160px] truncate">
                {currentSortColumn.label}
                {columnSort.direction === 'desc' ? ' ↓' : ' ↑'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Ordenar por coluna</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SUGESTAO_COMPRA_SORT_COLUMNS.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onClick={() => onSortColumn(col.id)}
                className={columnSort.column === col.id ? 'font-semibold' : ''}
              >
                {col.label}
                {columnSort.column === col.id
                  ? (columnSort.direction === 'desc' ? ' (maior primeiro)' : ' (menor primeiro)')
                  : ''}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ProdutosTreeByCategoryToggle
          checked={groupByCategory}
          onChange={onGroupByCategoryChange}
          className="h-9"
        />
        <div className="flex items-center gap-1 rounded-xl bg-card/80 dark:bg-card/40 border border-border/30 px-2 h-9">
          <span className="text-[10px] text-muted-foreground">nível</span>
          <LevelControl level={treeLevel} onChange={onTreeLevelChange} />
        </div>
      </div>
    </div>
  );
}

export function SugestaoCompraDesktopSelectHeader({
  allSelected,
  someSelected,
  onSelectAllVisible,
}) {
  return (
    <Checkbox
      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
      onCheckedChange={(checked) => onSelectAllVisible?.(checked === true)}
      className="h-5 w-5 border-2 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
      aria-label="Selecionar todos os itens visíveis"
      title="Selecionar visíveis"
    />
  );
}
