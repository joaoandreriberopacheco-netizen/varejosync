import React from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/a972c4ea7_Semttulo2.png';

/**
 * Logo P38 ERP usando a imagem original.
 * - Modo claro: mix-blend-mode multiply elimina o fundo branco
 * - Modo escuro: invert torna a logo branca
 * 
 * size: 'sm' | 'md' | 'lg'
 */
export default function P38Logo({ size = 'md', className = '', variant }) {
  const heights = {
    sm: 'h-6',
    md: 'h-9',
    lg: 'h-14',
  };
  const h = heights[size] || heights.md;

  return (
    <img
      src={LOGO_URL}
      alt="P38 ERP"
      className={`${h} w-auto object-contain select-none
        mix-blend-multiply dark:mix-blend-normal dark:invert
        ${className}`}
      draggable={false}
    />
  );
}