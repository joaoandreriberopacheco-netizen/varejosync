/**
 * Escala tipográfica P38 — corpo mínimo 14px (1rem), DIN 1451, maiores em rem proporcional.
 * CSS: src/styles/p38-typography.css + tailwind.config.js fontSize
 */

/** Corpo / micro (piso) */
export const P38_TYPE_MIN = '1rem';

/** Passos acima do corpo (html = calc(14px * var(--app-font-scale))) */
export const p38TypeScale = {
  min: P38_TYPE_MIN,
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
};
