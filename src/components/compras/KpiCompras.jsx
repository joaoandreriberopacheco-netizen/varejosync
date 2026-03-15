import React from 'react';
import { ShoppingCart, AlertCircle, TrendingUp } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function KpiCompras({ kpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 md:p-4">
        <p className="text-[0.65rem] md:text-[0.7rem] font-semibold uppercase tracking-widest text-gray-400">Total de Pedidos</p>
        <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-2">{kpis.total}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 md:p-4">
        <p className="text-[0.65rem] md:text-[0.7rem] font-semibold uppercase tracking-widest text-gray-400">Valor Total</p>
        <p className="text-sm md:text-base font-bold text-gray-900 dark:text-white mt-2 truncate">{R(kpis.valorTotal)}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 md:p-4">
        <p className="text-[0.65rem] md:text-[0.7rem] font-semibold uppercase tracking-widest text-gray-400">Pendentes</p>
        <p className="text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400 mt-2">{kpis.pendentes}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 md:p-4">
        <p className="text-[0.65rem] md:text-[0.7rem] font-semibold uppercase tracking-widest text-gray-400">Atrasados</p>
        <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 mt-2">{kpis.atrasados}</p>
      </div>
    </div>
  );
}