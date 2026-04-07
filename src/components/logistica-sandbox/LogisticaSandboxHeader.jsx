import React from 'react';
import { Anchor } from 'lucide-react';

export default function LogisticaSandboxHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-sm flex items-center justify-center">
          <Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Compras · Logística</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white font-glacial mt-1">Itinerário Fluvial</h1>
        </div>
      </div>
    </div>
  );
}