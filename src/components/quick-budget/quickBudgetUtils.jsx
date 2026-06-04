import React from 'react';
import { getPrecoUnitarioNaUnidade, getSaleUnitContextForTabela } from '@/lib/orcamentoPrecoTabela';
import { buildSaleUnitOptions, calculateBaseQuantity, getItemUnitKey } from '@/lib/productUnits';

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

export function getQuickBudgetUnitContext(produto, tabelaPreco) {
  return getSaleUnitContextForTabela(produto, tabelaPreco);
}

/** Piso e referência: preço de venda da tabela na embalagem (não custo). */
export function getMinimumPrice(produto, tabelaPreco, unitOption = null) {
  return getPrecoUnitarioNaUnidade(produto, tabelaPreco, unitOption);
}

/** Preço de tabela aplicado ao produto na embalagem escolhida. */
export function getFullPrice(produto, tabelaPreco, unitOption = null) {
  return getPrecoUnitarioNaUnidade(produto, tabelaPreco, unitOption);
}

/**
 * Lista (cadastro) riscada quando a tabela aplica fator ≠ 1; valor em destaque = piso na tabela.
 * variant="quickBudget" alinha à direita em coluna compacta (lista de busca).
 */
export function PrecoVendaTabelaLinhas({
  produto,
  tabelaPreco,
  unitOption = null,
  finalClassName = 'text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums',
  labelBottom,
  variant = 'default',
}) {
  const ctx = getQuickBudgetUnitContext(produto, tabelaPreco);
  const unit = unitOption || ctx.unidadeDefault;
  const precoFinal = getPrecoUnitarioNaUnidade(produto, tabelaPreco, unit);
  const listaOpts = buildSaleUnitOptions(produto, 1);
  const listaUnit = listaOpts.find((o) => o.unidade === unit?.unidade) || listaOpts[0];
  const precoOriginal = Number(listaUnit?.valor_unitario ?? produto?.preco_venda_padrao ?? 0);
  const sigla = unit?.unidade || listaUnit?.unidade || produto?.unidade_principal || 'UN';
  const temAjuste = tabelaPreco && tabelaPreco.fator_ajuste !== 1;
  const qb = variant === 'quickBudget';

  const precos = (
    <>
      {temAjuste && precoOriginal > 0 && (
        <div className="text-xs text-muted-foreground line-through tabular-nums whitespace-nowrap">
          {formatCurrency(precoOriginal)}
        </div>
      )}
      {precoFinal > 0 && (
        <div className={`tabular-nums whitespace-nowrap ${finalClassName}`}>
          {formatCurrency(precoFinal)}
          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/{sigla}</span>
        </div>
      )}
    </>
  );

  return (
    <>
      {qb ? (
        <div className="flex flex-col items-end justify-center gap-0.5">{precos}</div>
      ) : (
        precos
      )}
      {labelBottom != null && labelBottom !== false && (
        <p className="text-xs text-muted-foreground">{labelBottom}</p>
      )}
    </>
  );
}

export function buildQuickBudgetItem(produto, tabelaPreco, unitOption = null) {
  const ctx = getQuickBudgetUnitContext(produto, tabelaPreco);
  const unitPick = unitOption || ctx.unidadeDefault || {
    unidade: String(produto.unidade_principal || 'UN').trim().toUpperCase(),
    fator_conversao: 1,
    valor_unitario: ctx.precoSelecionado,
  };
  const sigla = unitPick.unidade || 'UN';
  const precoTabela = getPrecoUnitarioNaUnidade(produto, tabelaPreco, unitPick);
  const quantidade = 1;
  const listaOpts = buildSaleUnitOptions(produto, 1);
  const listaUnit = listaOpts.find((o) => o.unidade === sigla) || listaOpts[0];
  const precoLista = Number(listaUnit?.valor_unitario ?? produto.preco_venda_padrao ?? 0);
  const temAjusteTabela = !!(tabelaPreco && tabelaPreco.fator_ajuste !== 1);
  const fator = Number(unitPick.fator_conversao) || 1;
  const quantidadeBase = calculateBaseQuantity(quantidade, fator);
  return {
    produto_id: produto.id,
    produto_nome: produto.nome,
    codigo_interno: produto.codigo_interno || '',
    estoque_atual: Number(produto.estoque_atual || 0),
    item_key: getItemUnitKey(produto.id, sigla),
    preco_cheio: precoTabela,
    preco_minimo: precoTabela,
    preco_unitario: precoTabela,
    preco_venda_lista: precoLista,
    tem_ajuste_tabela: temAjusteTabela,
    preco_livre: !!produto.preco_livre,
    desconto: 0,
    quantidade,
    unidade: sigla,
    unidade_medida: sigla,
    unidade_sigla: sigla,
    fator_conversao: fator,
    quantidade_base: quantidadeBase,
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
  const fator = Number(item.fator_conversao) || 1;
  return {
    ...item,
    quantidade,
    desconto,
    preco_unitario: preco,
    quantidade_base: calculateBaseQuantity(quantidade, fator),
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
