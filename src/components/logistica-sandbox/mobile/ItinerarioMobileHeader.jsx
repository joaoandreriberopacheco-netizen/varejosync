import React from 'react';
import { Anchor } from 'lucide-react';

export default function ItinerarioMobileHeader() {
  return (
    <div className="flex items-center gap-3 px-1 pt-1">
      <div className="w-11 h-11 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
        <Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Compras · Logística</p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial truncate">Itinerário Fluvial</h1>
      </div>
    </div>
  );
}