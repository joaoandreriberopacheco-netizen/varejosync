import React, { useEffect } from 'react';
import PDVVendedor from '@/components/vendas/PDVVendedor';
import PDVCaixa from '@/components/vendas/PDVCaixa';
import PDVSupermercado from '@/components/vendas/PDVSupermercado';

export default function PDVPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'vendedor';

  // Renderizar em tela cheia
  if (mode === 'vendedor') {
    return <PDVVendedor />;
  }

  if (mode === 'caixa') {
    return <PDVCaixa />;
  }

  if (mode === 'supermercado') {
    return <PDVSupermercado />;
  }

  // Fallback
  return <PDVVendedor />;
}