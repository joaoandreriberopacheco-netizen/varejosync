import React from 'react';
import { CalendarDays, ArrowDownUp, Clock3 } from 'lucide-react';

const viewOptions = [
  { value: 'saida_manaus', label: 'Saída de Manaus' },
  { value: 'chegada_manaus', label: 'Chegada em Manaus' },
  { value: 'chegada_tabatinga', label: 'Chegada em Tabatinga' },
];

const horizonOptions = [
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
];

export default function TimelineViewControls({ viewMode, onViewModeChange, horizonDays, onHorizonDaysChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
          <ArrowDownUp className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visualização</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Escolha o marco principal e até quando quer ver</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CalendarDays className="w-4 h-4" /> Marco principal
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {viewOptions.map((option) => {
            const active = option.value === viewMode;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-nowrap transition-all ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock3 className="w-4 h-4" /> Janela de tempo
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {horizonOptions.map((option) => {
            const active = String(horizonDays) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onHorizonDaysChange(Number(option.value))}
                className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-nowrap transition-all ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}