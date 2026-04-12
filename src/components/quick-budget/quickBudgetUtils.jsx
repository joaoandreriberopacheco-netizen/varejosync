import React from 'react';
import { calcularPrecoVendaTabela } from '@/lib/orcamentoPrecoTabela';

export function formatCurrency(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getProductSearchText(produto) {
  return [
    produto.nome,
    produto.codigo_interno,
    produto.codigo_barras,
    produto.campo_hierarquico_1,
    produto.campo_hierarquico_2,
    produto.campo_hierarquico_3,
    produto.campo_hierarquico_4,
    produto.campo_hierarquico_5,
    produto.marca,
  ].filter(Boolean).join(' ').toLowerCase();
}

/** Piso e referência: preço de venda da tabela (não custo). */
export function getMinimumPrice(produto, tabelaPreco) {
  return calcularPrecoVendaTabela(produto, tabelaPreco);
}

/** Preço de tabela aplicado ao produto (mesmo que piso comercial). */
export function getFullPrice(produto, tabelaPreco) {
  return calcularPrecoVendaTabela(produto, tabelaPreco);
}

/** Mesma lógica que SkuCard em TabelaPrecosConsulta (lista riscada + preço da tabela). */
export function PrecoVendaTabelaLinhas({ produto, tabelaPreco, finalClassName = 'text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums', labelBottom }) {
  const precoFinal = calcularPrecoVendaTabela(produto, tabelaPreco);
  const precoOriginal = Number(produto?.preco_venda_padrao || 0);
  const temAjuste = tabelaPreco && tabelaPreco.fator_ajuste !== 1;
  return (
    <>
      {temAjuste && precoOriginal > 0 && (
        <div className="text-xs text-gray-400 line-through whitespace-nowrap tabular-nums">
          {formatCurrency(precoOriginal)}
        </div>
      )}
      {precoFinal > 0 && (
        <div className={`whitespace-nowrap ${finalClassName}`}>
          {formatCurrency(precoFinal)}
        </div>
      )}
      {labelBottom != null && labelBottom !== false && (
        <p className="text-xs text-gray-400">{labelBottom}</p>
      )}
    </>
  );
}

export function buildQuickBudgetItem(produto, tabelaPreco) {
  const precoTabela = calcularPrecoVendaTabela(produto, tabelaPreco);
  const quantidade = 1;
  const precoLista = Number(produto.preco_venda_padrao || 0);
  const temAjusteTabela = !!(tabelaPreco && tabelaPreco.fator_ajuste !== 1);
  return {
    produto_id: produto.id,
    produto_nome: produto.nome,
    codigo_interno: produto.codigo_interno || '',
    estoque_atual: Number(produto.estoque_atual || 0),
    preco_cheio: precoTabela,
    preco_minimo: precoTabela,
    preco_unitario: precoTabela,
    preco_venda_lista: precoLista,
    tem_ajuste_tabela: temAjusteTabela,
    preco_livre: !!produto.preco_livre,
    desconto: 0,
    quantidade,
    total: precoTabela * quantidade,
  };
}

export function recalculateItem(item) {
  const quantidade = Math.max(Number(item.quantidade || 0), 1);
  const desconto = Math.max(Number(item.desconto || 0), 0);
  const precoMin = Number(item.preco_minimo || 0);
  const precoBase = Number(item.preco_unitario || 0);
  const preco = Math.max(precoBase, precoMin);
  const subtotal = quantidade * preco;
  return {
    ...item,
    quantidade,
    desconto,
    preco_unitario: preco,
    total: Math.max(subtotal - desconto, 0),
  };
}

export function matchesProduct(produto, query) {
  if (!query?.trim()) return true;
  const searchable = getProductSearchText(produto);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((word) => searchable.includes(word));
}

export function getBudgetSummary(items) {
  const subtotal = items.reduce((sum, item) => sum + ((Number(item.quantidade) || 0) * (Number(item.preco_unitario) || 0)), 0);
  const desconto = items.reduce((sum, item) => sum + (Number(item.desconto) || 0), 0);
  return {
    subtotal,
    desconto,
    total: Math.max(subtotal - desconto, 0),
    quantidadeItens: items.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0),
  };
}
