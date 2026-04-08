import React from 'react';
import { DollarSign } from 'lucide-react';

export default function FreteResumoCard({ totalFretes, totalValor, totalComConta, totalSemConta }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total de carga</span>
      </div>
      <p className="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {(totalValor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}