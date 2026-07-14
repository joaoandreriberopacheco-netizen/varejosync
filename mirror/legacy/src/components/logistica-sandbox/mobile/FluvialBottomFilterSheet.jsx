import React from 'react';
import { SlidersHorizontal, X, Link2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';

export default function FluvialBottomFilterSheet({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  periodRange,
  onPeriodRangeChange,
  simulationDate,
  onSimulationDateChange,
  onlyLinked = false,
  linkedStatus = 'todos',
  onLinkedStatusChange,
  onOnlyLinkedChange,
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-muted/95 backdrop-blur-sm px-4 pb-6 pt-4 text-white shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-card/20" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card/10 shadow-sm">
              <SlidersHorizontal className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Filtros & Simulador</p>
              <p className="truncate text-sm font-medium text-white">Visualização fluvial</p>
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-2xl bg-card/10 text-white hover:bg-card/15"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-2">
          {/* Simulador */}
          <div className="space-y-2 rounded-3xl bg-indigo-500/15 p-3 shadow-sm border border-indigo-400/20">
            <label className="block text-xs uppercase tracking-[0.16em] text-indigo-200 font-medium">
              Simulador de Data
            </label>
            <input autoComplete="off"
              type="date"
              className="w-full rounded-2xl bg-card/8 border border-white/15 shadow-sm px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:bg-card/12 focus:border-indigo-400/50"
            />
          </div>

          {/* Filtros */}
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-[0.16em] text-white/60 font-medium">Filtros</label>
            <div className="space-y-2 rounded-3xl bg-card/5 p-3 shadow-sm">
              <button
                type="button"
                onClick={() => onOnlyLinkedChange?.(!onlyLinked)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm shadow-sm transition-colors ${
                  onlyLinked
                    ? 'bg-card text-foreground font-medium'
                    : 'bg-card/10 text-white/80 hover:bg-card/15'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Apenas vinculados
                </span>
                <span className="text-xs opacity-75">{onlyLinked ? 'Ligado' : 'Todos'}</span>
              </button>
              {onlyLinked ? (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onLinkedStatusChange?.('todos')}
                    className={`rounded-2xl px-3 py-2.5 text-xs shadow-sm transition-colors ${
                      linkedStatus === 'todos'
                        ? 'bg-card text-foreground font-medium'
                        : 'bg-card/10 text-white/70 hover:bg-card/15'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => onLinkedStatusChange?.('ativos')}
                    className={`rounded-2xl px-3 py-2.5 text-xs shadow-sm transition-colors ${
                      linkedStatus === 'ativos'
                        ? 'bg-lime-400 text-foreground font-medium'
                        : 'bg-card/10 text-white/70 hover:bg-card/15'
                    }`}
                  >
                    Ativos
                  </button>
                  <button
                    type="button"
                    onClick={() => onLinkedStatusChange?.('concluidos')}
                    className={`rounded-2xl px-3 py-2.5 text-xs shadow-sm transition-colors ${
                      linkedStatus === 'concluidos'
                        ? 'bg-muted text-foreground font-medium'
                        : 'bg-card/10 text-white/70 hover:bg-card/15'
                    }`}
                  >
                    Concluídos
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* View Mode e Period */}
          <TimelineViewControls viewMode={viewMode} onViewModeChange={onViewModeChange} />
          <TimelinePeriodPicker range={periodRange} onChange={onPeriodRangeChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}