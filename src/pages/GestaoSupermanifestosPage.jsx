import React from 'react';
import GestaoSupermanifestos from '@/components/compras/GestaoSupermanifestos';

export default function GestaoSupermanifestosPage() {
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-2 py-2 md:py-4">
      <div className="px-4 md:px-0 pb-4">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white font-glacial">Supermanifestos</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Consolidação de cargas e volumes</p>
      </div>
      <GestaoSupermanifestos />
    </div>
  );
}