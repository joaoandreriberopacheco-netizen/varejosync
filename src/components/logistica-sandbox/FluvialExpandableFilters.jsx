import React from 'react';
import { ChevronUp, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';

export default function FluvialExpandableFilters({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
  periodRange,
  onPeriodRangeChange,
  simulationDate,
  onSimulationDateChange,
}) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 px-3 md:hidden pointer-events-none">
      <div className="mx-auto max-w-4xl pointer-events-auto">
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
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-2xl bg-white/10 text-white hover:bg-white/15"
                >
                  <ChevronUp className={`w-4 h-4 transition-transform ${open ? '' : 'rotate-180'}`} />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="px-3 pb-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                <TimelineViewControls
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                />
                <TimelinePeriodPicker range={periodRange} onChange={onPeriodRangeChange} />
                <TimelineDatePicker value={simulationDate} onChange={onSimulationDateChange} />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}