import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function FluvialFAB({ 
  viewMode,
  onViewModeChange,
  simulationDate,
  onSimulationDateChange
}) {
  const [open, setOpen] = useState(false);

  const viewModes = [
    { id: 'saida_manaus', label: 'Saída Manaus' },
    { id: 'chegada_manaus', label: 'Chegada Manaus' },
    { id: 'chegada_tabatinga', label: 'Chegada Tabatinga' }
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-400 hover:shadow-md transition-shadow pdv-button-static"
      >
        <Sliders className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <SheetHeader>
            <SheetTitle className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Filtros da Timeline</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            {/* View Mode */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-2 uppercase tracking-wide">
                Visualização
              </label>
              <div className="space-y-1.5">
                {viewModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onViewModeChange(mode.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                      viewMode === mode.id
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-300 dark:ring-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Date */}
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Data
              </label>
              <Input
                type="date"
                value={simulationDate}
                onChange={(e) => {
                  onSimulationDateChange(e.target.value);
                  setOpen(false);
                }}
                className="text-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={() => {
                  onSimulationDateChange(format(new Date(), 'yyyy-MM-dd'));
                  setOpen(false);
                }}
                className="w-full text-xs px-3 py-2.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Ir para Hoje
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}