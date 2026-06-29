import React from 'react';
import { useLocation } from 'react-router-dom';
import PDVCaixa from '@/components/vendas/PDVCaixa';
import { readPDVCaixaInitialFromSearch } from '@/lib/pdvQuickAccessNavigate';

export default function PDVCaixaPage() {
  const location = useLocation();
  const { initialActiveTab, initialVendasView } = readPDVCaixaInitialFromSearch(location.search);

  return (
    <PDVCaixa
      key={`${initialActiveTab}-${initialVendasView}`}
      initialActiveTab={initialActiveTab}
      initialVendasView={initialVendasView}
    />
  );
}