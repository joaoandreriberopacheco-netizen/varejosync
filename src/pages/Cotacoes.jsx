import React from 'react';
import CotacoesManager from '@/components/compras/CotacoesManager';

export default function CotacoesPage() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-glacial">
            Cotações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comparação de preços e fornecedores
          </p>
        </div>
        <CotacoesManager />
      </div>
    </div>
  );
}