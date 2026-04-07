import React from 'react';
import { BadgeDollarSign, CircleDollarSign } from 'lucide-react';

export default function FreteResumoCard({ totalFretes, totalComConta, totalSemConta }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <span className="text-[10px] uppercase tracking-wide">Fretes</span>
          <BadgeDollarSign className="w-4 h-4" />
        </div>
        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{totalFretes}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
          <span className="text-[10px] uppercase tracking-wide">Com conta</span>
          <CircleDollarSign className="w-4 h-4" />
        </div>
        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{totalComConta}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
          <span className="text-[10px] uppercase tracking-wide">Sem conta</span>
          <CircleDollarSign className="w-4 h-4" />
        </div>
        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{totalSemConta}</p>
      </div>
    </div>
  );
}