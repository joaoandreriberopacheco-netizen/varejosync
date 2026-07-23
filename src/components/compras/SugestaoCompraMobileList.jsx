import React from 'react';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import SugestaoCompraLinhaMobile from '@/components/compras/SugestaoCompraLinhaMobile';

export default function SugestaoCompraMobileList({
  linhas = [],
  selectedItems = {},
  onToggleSelected,
  sugestaoDisplayLinha,
  onQuantidadeLinhaChange,
  renderFornecedorSelect,
}) {
  return (
    <P38MobileLineList allViewports className="rounded-lg border border-border/40 overflow-hidden bg-card">
      {linhas.map((linha, index) => (
        <SugestaoCompraLinhaMobile
          key={linha.id}
          linha={linha}
          disp={sugestaoDisplayLinha?.(linha)}
          selecionado={!!selectedItems[linha.id]}
          onToggleSelecionado={(checked) => onToggleSelected?.(linha.id, checked)}
          onQuantidadeLinhaChange={onQuantidadeLinhaChange}
          fornecedorSelect={renderFornecedorSelect?.(linha)}
          striped={index % 2 === 1}
        />
      ))}
    </P38MobileLineList>
  );
}
