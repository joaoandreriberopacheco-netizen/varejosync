import React from 'react';
import { SlidersHorizontal, X, Link2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';

export default function FluvialBottomFilterSheet({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  periodRange,
  onPeriodRangeChange,
  onlyLinked = false,
  linkedStatus = 'todos',
  onLinkedStatusChange,
  onOnlyLinkedChange,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-[#111827]/98 px-3 pb-5 pt-3 text-white shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/15" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 shadow-sm">
              <SlidersHorizontal className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Filtros</p>
              <p className="truncate text-sm font-medium text-white">Visualização fluvial</p>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-2xl bg-white/10 text-white hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-2 rounded-3xl bg-white/5 p-2.5 shadow-sm">
            <button
              type="button"
              onClick={() => onOnlyLinkedChange?.(!onlyLinked)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm shadow-sm ${onlyLinked ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}
            >
              <span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Apenas vinculados</span>
              <span>{onlyLinked ? 'Ligado' : 'Todos'}</span>
            </button>
            {onlyLinked ? (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => onLinkedStatusChange?.('todos')} className={`rounded-2xl px-3 py-2 text-xs shadow-sm ${linkedStatus === 'todos' ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}>Todos</button>
                <button type="button" onClick={() => onLinkedStatusChange?.('ativos')} className={`rounded-2xl px-3 py-2 text-xs shadow-sm ${linkedStatus === 'ativos' ? 'bg-lime-300 text-slate-900' : 'bg-white/10 text-white'}`}>Ativos</button>
                <button type="button" onClick={() => onLinkedStatusChange?.('concluidos')} className={`rounded-2xl px-3 py-2 text-xs shadow-sm ${linkedStatus === 'concluidos' ? 'bg-gray-300 text-slate-900' : 'bg-white/10 text-white'}`}>Concluídos</button>
              </div>
            ) : null}
          </div>

          <TimelineViewControls viewMode={viewMode} onViewModeChange={onViewModeChange} />
          <TimelinePeriodPicker range={periodRange} onChange={onPeriodRangeChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}