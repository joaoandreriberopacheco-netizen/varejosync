import React, { useMemo } from 'react';

export default function FreteTotalValue({ eventos = [] }) {
  const totalValue = useMemo(() => {
    // Somar apenas eventos com conta a pagar vinculada
    return eventos.reduce((sum, evento) => 
      sum + (evento.tem_conta_frete ? (evento.valor_total_carga || 0) : 0), 0
    );
  }, [eventos]);

  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="text-center space-y-1 py-6">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {mesAtual}
      </div>
      <div className="text-4xl font-bold text-gray-900 dark:text-white">
        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </div>
    </div>
  );
}