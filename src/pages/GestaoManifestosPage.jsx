import React from 'react';
import GestaoManifestos from '@/components/compras/GestaoManifestos';

export default function GestaoManifestosPage() {
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-2 py-2 md:py-4">
      <div className="px-4 md:px-0 pb-4">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white font-glacial">Manifestos de Entrada</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Controle de manifestos e romaneios</p>
      </div>
      <GestaoManifestos />
    </div>
  );
}