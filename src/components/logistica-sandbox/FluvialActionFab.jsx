import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sliders, Calendar, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FluvialActionFab({ 
  onScrollToToday,
  onOpenFilters,
  embarqueLinkFilter = 'todos',
  onEmbarqueLinkFilterChange
}) {
  const [open, setOpen] = useState(false);

  const handleScrollToToday = () => {
    onScrollToToday();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800 dark:text-slate-200 p38-bottom-fab1"
      >
        <Sliders className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold">Opções</SheetTitle>
          </SheetHeader>
          <div className="pt-6 space-y-3">
            <Button
              onClick={handleScrollToToday}
              variant="outline"
              className="w-full justify-start gap-3 h-12 rounded-2xl"
            >
              <Calendar className="w-5 h-5" />
              <span>Ir para Hoje</span>
            </Button>
            <div className="rounded-2xl bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="w-3.5 h-3.5" />
                Vínculo de embarque
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ id: 'todos', label: 'Todas' }, { id: 'com_vinculo', label: 'Com vínculo' }, { id: 'sem_vinculo', label: 'Sem vínculo' }].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onEmbarqueLinkFilterChange?.(mode.id)}
                    className={`rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
                      embarqueLinkFilter === mode.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'bg-transparent text-muted-foreground'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => {
                onOpenFilters();
                setOpen(false);
              }}
              variant="outline"
              className="w-full justify-start gap-3 h-12 rounded-2xl"
            >
              <Sliders className="w-5 h-5" />
              <span>Filtros</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}