import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileFilterSheet({ open, onOpenChange }) {
  return (
    <Button
      type="button"
      onClick={() => onOpenChange?.(!open)}
      className="h-11 rounded-2xl border-0 shadow-sm bg-gray-800 hover:bg-gray-700 text-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 gap-2 justify-center"
    >
      <SlidersHorizontal className="w-4 h-4" />
      Filtros
    </Button>
  );
}