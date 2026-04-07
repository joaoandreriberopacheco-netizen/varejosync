import React from 'react';
import { Waves, BadgeDollarSign } from 'lucide-react';

const options = [
  { value: 'Fluvial', icon: Waves },
  { value: 'Fretes', icon: BadgeDollarSign },
];

export default function RouteModeToggle({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`snap-start flex items-center justify-center gap-2 min-w-[132px] px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-nowrap transition-all ${active ? 'bg-gray-700 text-gray-100 dark:bg-gray-700 dark:text-gray-100' : 'bg-gray-900/70 text-gray-300 dark:bg-gray-900 dark:text-gray-400'}`}
          >
            <Icon className="w-4 h-4" />
            <span>{option.value}</span>
          </button>
        );
      })}
    </div>
  );
}