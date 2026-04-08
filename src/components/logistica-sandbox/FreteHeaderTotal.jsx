import React from 'react';

export default function FreteHeaderTotal({ periodo, totalValor }) {
  return (
    <div className="w-full space-y-2 md:space-y-3">
      {/* Período - maior no desktop, normal no mobile */}
      <div className="text-center">
        <p className="text-sm md:text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {periodo}
        </p>
      </div>
      
      {/* Total - sem container, centralizado */}
      <div className="text-center">
        <p className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-glacial">
          R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}