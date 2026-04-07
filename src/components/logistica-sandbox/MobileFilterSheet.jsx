import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function MobileFilterSheet({ children }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-2xl border-0 shadow-sm bg-gray-800 hover:bg-gray-700 text-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 gap-2 justify-center">
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-white dark:bg-gray-900 px-4 py-5 max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-4" />
        <div className="space-y-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}