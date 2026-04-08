import React from 'react';
import { ChevronUp, ListFilter, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';

export default function FluvialExpandableFilters_UNUSED({
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
    <div className="md:hidden">
      <div className="mx-auto max-w-4xl">
        <Collapsible open={open} onOpenChange={onOpenChange}>
          <div className="rounded-[28px] bg-[#111827]/95 dark:bg-[#111827]/95 shadow-2xl backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-sm">
                  <ListFilter className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Filtros</p>
                  <p className="text-sm font-medium text-white truncate">Visualização fluvial</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onOpenChange(!open)}
                className="h-10 w-10 rounded-2xl bg-white/10 text-white hover:bg-white/15"
              >
                <ChevronUp className={`w-4 h-4 transition-transform ${open ? '' : 'rotate-180'}`} />
              </Button>
            </div>

            <CollapsibleContent className="px-3 pb-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                <div className="rounded-3xl bg-white/5 p-3 shadow-sm space-y-2">
                  <button
                    type="button"
                    onClick={() => onOnlyLinkedChange?.(!onlyLinked)}
                    className={`w-full flex items-center justify-between gap-3 rounded-2xl text-sm shadow-sm px-3 py-2.5 ${onlyLinked ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}
                  >
                    <span className="flex items-center gap-2"><Link2 className="w-4 h-4" /> Apenas vinculados</span>
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
                <TimelineViewControls
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                />
                <TimelinePeriodPicker range={periodRange} onChange={onPeriodRangeChange} />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}