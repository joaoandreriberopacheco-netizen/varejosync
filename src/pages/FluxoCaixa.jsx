import React from 'react';
import FluxoCaixaTabV2 from '../components/financeiro/FluxoCaixaTabV2';

export default function FluxoCaixaPage() {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200">Fluxo de Caixa</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Movimentações, receitas e despesas</p>
      </div>
      <FluxoCaixaTabV2 />
    </div>
  );
}