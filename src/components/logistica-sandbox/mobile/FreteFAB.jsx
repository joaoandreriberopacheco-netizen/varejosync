import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sliders } from 'lucide-react';
import FreteFilterTabs from '@/components/logistica-sandbox/FreteFilterTabs';

export default function FreteFAB({ 
  selectedFilter = 'todos',
  onFilterChange 
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-card text-foreground/90 shadow-lg transition-shadow hover:shadow-xl dark:bg-muted dark:text-muted-foreground p38-bottom-fab2"
      >
        <Sliders className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 bg-card">
          <SheetHeader>
            <SheetTitle className="text-sm font-semibold text-foreground">Filtrar Fretes</SheetTitle>
          </SheetHeader>
          <div className="pt-4">
            <FreteFilterTabs 
              selectedFilter={selectedFilter}
              onFilterChange={(filter) => {
                onFilterChange(filter);
                setOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}