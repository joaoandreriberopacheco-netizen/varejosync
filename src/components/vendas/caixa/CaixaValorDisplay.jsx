import React from 'react';
import { p38Accent } from '@/lib/p38ThemeSurfaces';

/** Mesmo padrão de `ListaLancamentos` / Fluxo de Caixa */
export function formatCaixaR(v) {
  return `R$ ${(Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SIGN_CLASS = {
  success: p38Accent.success.text,
  danger: p38Accent.danger.text,
  info: p38Accent.info.text,
};

const SIZE_CLASS = {
  sm: 'text-base font-semibold',
  md: 'text-lg font-semibold',
  lg: 'text-2xl font-bold',
};

/**
 * @param {'success'|'danger'|'info'|'neutral'} tone
 * @param {boolean} signed — exibe +/− (como fluxo de caixa)
 */
export default function CaixaValorDisplay({
  valor,
  tone = 'neutral',
  signed = true,
  size = 'md',
  className = '',
}) {
  const n = Math.abs(Number(valor) || 0);
  const sizeCls = SIZE_CLASS[size] || SIZE_CLASS.md;

  if (tone === 'neutral' || !signed) {
    return (
      <span className={`tabular-nums ${sizeCls} ${className}`}>
        {formatCaixaR(n)}
      </span>
    );
  }

  const isEntrada = tone === 'success' || tone === 'info';
  const sign = isEntrada ? '+' : '−';
  const signClass = tone === 'info'
    ? SIGN_CLASS.info
    : isEntrada
      ? SIGN_CLASS.success
      : SIGN_CLASS.danger;

  return (
    <span className={`tabular-nums ${sizeCls} ${className}`}>
      <span className={signClass}>{sign}</span>
      {formatCaixaR(n)}
    </span>
  );
}
