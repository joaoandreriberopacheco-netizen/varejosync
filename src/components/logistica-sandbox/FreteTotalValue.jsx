import React from 'react';
import { DollarSign } from 'lucide-react';

export default function FreteTotalValue({ eventos = [] }) {
  const totalValue = eventos.reduce((sum, evento) => {
    // Soma o valor do LancamentoFinanceiro vinculado (conta de frete)
    return sum + (evento.lancamento_financeiro_valor || 0);
  }, 0);

  return (
    <div className="flex items-center justify-center py-2">
      <span className="text-base font-semibold text-gray-900 dark:text-white">
        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
}