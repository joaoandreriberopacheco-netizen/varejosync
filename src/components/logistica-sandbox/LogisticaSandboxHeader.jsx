import React from 'react';
import { Anchor, CalendarDays, Route } from 'lucide-react';

export default function LogisticaSandboxHeader({ totalEventos = 0 }) {
  return (
    <div className="space-y-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ordenação principal</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sempre pela saída de Manaus</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><Route className="w-3.5 h-3.5" /> Rotas</div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">2</div>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><Anchor className="w-3.5 h-3.5" /> Eventos</div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{totalEventos}</div>
          </div>
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs"><CalendarDays className="w-3.5 h-3.5" /> Ciclo</div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">21 dias</div>
          </div>
        </div>
      </div>
    </div>
  );
}