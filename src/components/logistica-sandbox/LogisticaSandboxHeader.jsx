import React from 'react';
import { Anchor, CalendarDays, Route } from 'lucide-react';

export default function LogisticaSandboxHeader() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-sm flex items-center justify-center">
          <Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100 font-glacial">Itinerário Fluvial</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Ambiente isolado para modelar rotas e previsibilidade</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><Route className="w-3.5 h-3.5" /> Rotas</div>
          <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">2</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><Anchor className="w-3.5 h-3.5" /> Embarcações</div>
          <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">20</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><CalendarDays className="w-3.5 h-3.5" /> Ciclo</div>
          <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">21 dias</div>
        </div>
      </div>
    </div>
  );
}