import React from 'react';
import { DollarSign } from 'lucide-react';

export default function FreteTotalValue({ eventos = [] }) {
  const totalValue = eventos.reduce((sum, evento) => {
    return sum + (evento.valor_total_carga || 0);
  }, 0);

  return (
    <div className="flex items-center justify-center py-2">
      <span className="text-base font-semibold text-foreground">
        {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
    </div>
  );
}