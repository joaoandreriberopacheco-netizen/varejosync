import React from 'react';
import VisaoFinanceiraPlano from '@/components/config/VisaoFinanceiraPlano';

export default function VisaoFinanceiraPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-xl font-medium text-foreground">Visão Financeira</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visão consolidada e analítica das despesas planejadas do negócio
        </p>
      </div>

      <VisaoFinanceiraPlano />
    </div>
  );
}
