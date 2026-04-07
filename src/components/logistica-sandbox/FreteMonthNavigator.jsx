import React from 'react';
import { ChevronLeft, ChevronRight, Ship } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FreteMonthNavigator({ currentMonth, onPrev, onNext }) {
  const label = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Button onClick={onPrev} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-700">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-0">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <Ship className="w-3.5 h-3.5" /> Fretes
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{label}</p>
        </div>
        <Button onClick={onNext} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-700">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}