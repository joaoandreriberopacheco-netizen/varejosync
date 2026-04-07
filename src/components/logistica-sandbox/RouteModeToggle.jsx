import React from 'react';
import { Waves } from 'lucide-react';

const options = [
  { value: 'Fluvial', icon: Waves },
];

export default function RouteModeToggle({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-nowrap transition-all ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-600 dark:bg-gray-900 dark:text-gray-300'}`}
          >
            <Icon className="w-4 h-4" />
            <span>{option.value}</span>
          </button>
        );
      })}
    </div>
  );
}