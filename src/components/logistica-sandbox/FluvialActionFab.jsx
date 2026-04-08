import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sliders, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FluvialActionFab({ 
  onScrollToToday,
  onOpenFilters
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
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg dark:bg-gray-800 dark:text-slate-200 hover:shadow-xl transition-shadow"
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