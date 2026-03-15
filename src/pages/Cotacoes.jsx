import React from 'react';
import CotacoesManager from '@/components/compras/CotacoesManager';

export default function CotacoesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Cotações
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comparação de preços e fornecedores
          </p>
        </div>
        <CotacoesManager />
      </div>
    </div>
  );
}