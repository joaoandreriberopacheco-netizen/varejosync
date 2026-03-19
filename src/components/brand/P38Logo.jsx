import React from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/a972c4ea7_Semttulo2.png';
const LOGO_VERTICAL_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/b901a6773_AdobeExpress-file1.png';
const ICON_ONLY_URL = 'https://media.base44.com/images/public/68a91b1a009497f8d44af37e/46a482fd7_image.png';

/**
 * P38 Logo com suporte a múltiplas variantes
 * 
 * Variantes:
 * - 'horizontal': Logo completa (raio + P38 + ERP) em uma linha
 * - 'vertical': Logo empilhada (raio, P38, ERP) centralizado
 * - 'icon-only': Apenas o raio/ícone
 * 
 * Cores:
 * - Claro: cinza escuro/preto
 * - Escuro: cinza claro/branco
 */
export default function P38Logo({
  variant = 'horizontal',
  size = 'md',
  className = ''
}) {
  // Icon-only (raio sozinho)
  if (variant === 'icon-only') {
    const sizes = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-16'
    };
    const h = sizes[size] || sizes.md;

    return (
      <img
        src={ICON_ONLY_URL}
        alt="P38"
        className={`${h} w-auto object-contain select-none
          mix-blend-multiply dark:mix-blend-normal dark:invert
          ${className}`}
        draggable={false} />);


  }

  // Vertical (empilhado)
  if (variant === 'vertical') {
    const sizes = {
      sm: 'h-20',
      md: 'h-28',
      lg: 'h-36'
    };
    const h = sizes[size] || sizes.md;

    return null;









  }

  // Horizontal (padrão)
  const sizes = {
    xs: 'h-8',
    sm: 'h-12',
    md: 'h-16',
    lg: 'h-20',
    xl: 'h-24',
    xxl: 'h-32'
  };
  const h = sizes[size] || sizes.md;

  return (
    <img
      src={LOGO_URL}
      alt="P38 ERP"
      className={`${h} w-auto object-contain select-none
        mix-blend-multiply dark:mix-blend-normal dark:invert
        ${className}`}
      draggable={false} />);


}