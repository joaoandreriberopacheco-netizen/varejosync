/**
 * Regras alinhadas à Tabela de Preços / OrcamentoSheet (TabelaPrecosConsulta).
 * O preço de referência comercial é sempre preco_venda_padrao × fator da tabela.
 * O piso de venda é esse valor — não o custo calculado.
 */

export function calcularPrecoVendaTabela(produto, tabelaPreco) {
  if (!produto) return 0;
  const base = Number(produto.preco_venda_padrao || 0);
  if (!tabelaPreco) return base;
  return base * (tabelaPreco.fator_ajuste || 1);
}

/** Alias semântico: piso mínimo permitido para o unitário (política de preço da tabela). */
export function getPrecoMinimoUnitarioVenda(produto, tabelaPreco) {
  return calcularPrecoVendaTabela(produto, tabelaPreco);
}
