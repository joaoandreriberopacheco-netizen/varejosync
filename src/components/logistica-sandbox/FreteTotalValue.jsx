import React from 'react';
import { DollarSign } from 'lucide-react';

export default function FreteTotalValue({ eventos = [] }) {
  const totalValue = eventos.reduce((sum, evento) => {
    return sum + (evento.valor_total_carga || 0);
  }, 0);

  return (
    <div className="flex items-center gap-2 justify-center py-2">
      <DollarSign className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      <span className="text-xs text-gray-500 dark:text-gray-400">Total:</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
}