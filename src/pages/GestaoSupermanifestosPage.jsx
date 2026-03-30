import React from 'react';
import GestaoSupermanifestos from '@/components/compras/GestaoSupermanifestos';

export default function GestaoSupermanifestosPage() {
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-2 py-2 md:py-3">
      <div className="px-3 md:px-0 pb-3">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm px-4 py-3">
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white font-glacial leading-tight">Supermanifestos</h1>
          <p className="text-[11px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5">Consolidação compacta de cargas e volumes</p>
        </div>
      </div>
      <GestaoSupermanifestos />
    </div>
  );
}