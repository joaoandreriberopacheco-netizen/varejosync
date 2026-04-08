import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function FreteCaixaCard({ valor = 0 }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-50 dark:bg-orange-900/20 shadow-sm">
          <ShoppingCart className="w-5 h-5 text-orange-500 dark:text-orange-400" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block">Valor de caixa</span>
          <span className="text-xs text-gray-500 dark:text-gray-500">Movimentação</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}