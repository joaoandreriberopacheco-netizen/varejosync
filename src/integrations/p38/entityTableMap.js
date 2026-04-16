/**
 * Mapeamento Entidade (PascalCase Base44) → tabela `public.*` no Supabase.
 * Só entidades que existem nas migrações locais entram no datalink híbrido.
 */
export const ENTITY_TO_TABLE = {
  LancamentoFinanceiro: 'lancamento_financeiro',
  Terceiro: 'terceiro',
  Produto: 'produto',
  PedidoVenda: 'pedido_venda',
  PedidoCompra: 'pedido_compra',
  MovimentacaoEstoque: 'movimentacao_estoque',
  ContasFinanceiras: 'contas_financeiras',
  FormasDePagamento: 'formas_de_pagamento',
  TabelaPreco: 'tabela_preco',
  TurnoCaixa: 'turno_caixa',
  Embarque: 'embarque',
  ContaRecorrente: 'conta_recorrente',
  ContaPrevista: 'conta_prevista',
  CategoriaProduto: 'categoria_produto',
  CategoriaFinanceira: 'categoria_financeira',
  AgendaLogistica: 'agenda_logistica',
  MovimentosCaixa: 'movimentos_caixa',
  TargetFlare: 'target_flare',
  CatalogoInterface: 'catalogo_interface'
};

export function isEntityLinkedToSupabase(entityName) {
  return Boolean(ENTITY_TO_TABLE[entityName]);
}
