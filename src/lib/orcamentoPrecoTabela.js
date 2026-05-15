/**
 * Regras alinhadas à Tabela de Preços / OrcamentoSheet (TabelaPrecosConsulta).
 * O preço de referência comercial é sempre preco_venda_padrao × fator da tabela.
 * O piso de venda é esse valor — não o custo calculado.
 */

import { buildSaleUnitOptions, pickDefaultSaleUnit } from '@/lib/productUnits';

export function calcularPrecoVendaTabela(produto, tabelaPreco) {
  if (!produto) return 0;
  const base = Number(produto.preco_venda_padrao || 0);
  if (!tabelaPreco) return base;
  return base * (tabelaPreco.fator_ajuste || 1);
}

/** Multiplicador da tabela aplicado sobre o cadastro (para escalar embalagens alternativas). */
export function getTabelaPriceMultiplier(produto, tabelaPreco) {
  const precoTabela = calcularPrecoVendaTabela(produto, tabelaPreco);
  const padrao = Number(produto?.preco_venda_padrao || 0);
  if (precoTabela > 0 && padrao > 0) return precoTabela / padrao;
  return tabelaPreco?.fator_ajuste || 1;
}

/** Opções de venda + vitrine (`unidade_vitrine`) com preços já na tabela selecionada. */
export function getSaleUnitContextForTabela(produto, tabelaPreco) {
  const priceMultiplier = getTabelaPriceMultiplier(produto, tabelaPreco);
  const unitOptions = buildSaleUnitOptions(produto, priceMultiplier);
  const unidadeDefault = pickDefaultSaleUnit(produto, priceMultiplier) || unitOptions[0] || null;
  const precoSelecionado = unidadeDefault?.valor_unitario ?? calcularPrecoVendaTabela(produto, tabelaPreco);
  return { unitOptions, unidadeDefault, precoSelecionado, priceMultiplier };
}

/** Preço unitário na embalagem escolhida (tabela × fator da embalagem). */
export function getPrecoUnitarioNaUnidade(produto, tabelaPreco, unitOption) {
  if (unitOption?.valor_unitario != null) {
    return Number(unitOption.valor_unitario) || 0;
  }
  return calcularPrecoVendaTabela(produto, tabelaPreco);
}

/** Alias semântico: piso mínimo permitido para o unitário (política de preço da tabela). */
export function getPrecoMinimoUnitarioVenda(produto, tabelaPreco, unitOption = null) {
  return getPrecoUnitarioNaUnidade(produto, tabelaPreco, unitOption);
}
