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
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg dark:bg-gray-800 dark:text-slate-200 hover:shadow-xl transition-shadow"
      >
        <Sliders className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold">Filtros da Timeline</SheetTitle>
          </SheetHeader>
          <div className="pt-4 space-y-4">
            {/* View Mode */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Modo de Visualização
              </label>
              <div className="space-y-2">
                {viewModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onViewModeChange(mode.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      viewMode === mode.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Date */}
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Data de Simulação
              </label>
              <Input
                type="date"
                value={simulationDate}
                onChange={(e) => {
                  onSimulationDateChange(e.target.value);
                  setOpen(false);
                }}
                className="text-sm"
              />
            </div>

            {/* Quick Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSimulationDateChange(format(new Date(), 'yyyy-MM-dd'));
                  setOpen(false);
                }}
                className="w-full text-xs"
              >
                Ir para Hoje
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}