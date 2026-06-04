import React from 'react';

export const isCadastroIncompleto = (produto) => {
  const checks = {
    semCategoria: !produto.categoria_nome,
    semFornecedor: !produto.fornecedor_padrao_id,
    semPrecoVenda: !produto.preco_venda_padrao || produto.preco_venda_padrao <= 0,
    semCodigoBarras: !produto.codigo_barras,
    semImagem: !produto.imagem_url,
  };
  const totalIncompleto = Object.values(checks).filter(Boolean).length;
  return { incompleto: totalIncompleto > 0, totalIncompleto, checks };
};

export const getStockStatusIndicator = (produto) => {
  if (!produto.ativo) {
    return <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><div className="w-2 h-2 bg-muted rounded-full" /> Inativo</div>;
  }
  const estoque = produto.estoque_atual || 0;
  const minimo = produto.estoque_minimo || 0;

  if (estoque <= 0) {
    return <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs"><div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" /> Crítico</div>;
  }
  if (estoque <= minimo / 2) {
    return <div className="flex items-center gap-1.5 text-red-500 dark:text-red-300 text-xs"><div className="w-2 h-2 bg-red-500 rounded-full" /> Crítico</div>;
  }
  if (estoque <= minimo) {
    return <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-300 text-xs"><div className="w-2 h-2 bg-orange-500 rounded-full" /> Baixo</div>;
  }
  return <div className="flex items-center gap-1.5 text-green-500 dark:text-green-300 text-xs"><div className="w-2 h-2 bg-green-500 rounded-full" /> OK</div>;
};