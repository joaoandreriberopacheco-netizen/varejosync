import React from 'react';
import { Waves, BadgeDollarSign, Ship } from 'lucide-react';

const tabs = [
  { value: 'Fluvial', icon: Waves, label: 'Fluvial' },
  { value: 'Fretes', icon: BadgeDollarSign, label: 'Fretes' },
  { value: 'Boats', icon: Ship, label: 'Barcos' },
];

export default function ItinerarioMobileTopTabs({ value, onChange }) {
  return (
    <div className="sticky top-0 z-20 -mx-3 px-3 py-3 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = value === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`min-w-0 rounded-2xl px-2 py-3 shadow-sm transition-all ${active ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-300'}`}
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-[11px] leading-none truncate">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}