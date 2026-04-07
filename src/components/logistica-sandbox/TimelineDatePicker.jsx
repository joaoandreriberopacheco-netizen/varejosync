import React from 'react';
import { CalendarDays } from 'lucide-react';

export default function TimelineDatePicker({ value, onChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Simulador</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Ver situação em uma data projetada</p>
        </div>
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-gray-50 dark:bg-gray-700 border-0 shadow-sm px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
      />
    </div>
  );
}