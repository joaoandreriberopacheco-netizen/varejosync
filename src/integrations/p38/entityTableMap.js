/**
 * Mapeamento Entidade (PascalCase Base44) → tabela `public.*` no Supabase.
 *
 * Dois modos suportados:
 *  - `'columns'` (default): a tabela tem colunas dedicadas para os campos. O front
 *    grava/filtra coluna a coluna (comportamento das migrations 001–006).
 *  - `'jsonb'`: a tabela usa `id, created_at, updated_at, created_by, dados jsonb` +
 *    algumas colunas indexadas para filtros frequentes. Tudo que não tiver coluna
 *    dedicada é serializado em `dados` automaticamente pelo supabaseEntityLayer
 *    (escrita) e re-hidratado na leitura.
 *
 * Aceita string (modo `'columns'`) por retrocompatibilidade.
 */
export const ENTITY_TO_TABLE = {
  // === Núcleo (modo 'columns', migrations 001–006) ===
  LancamentoFinanceiro: { table: 'lancamento_financeiro', mode: 'columns' },
  Terceiro: { table: 'terceiro', mode: 'columns' },
  Produto: { table: 'produto', mode: 'columns' },
  PedidoVenda: { table: 'pedido_venda', mode: 'columns' },
  PedidoCompra: { table: 'pedido_compra', mode: 'columns' },
  MovimentacaoEstoque: { table: 'movimentacao_estoque', mode: 'columns' },
  ContasFinanceiras: { table: 'contas_financeiras', mode: 'columns' },
  FormasDePagamento: { table: 'formas_de_pagamento', mode: 'columns' },
  TabelaPreco: { table: 'tabela_preco', mode: 'columns' },
  TurnoCaixa: { table: 'turno_caixa', mode: 'columns' },
  Embarque: { table: 'embarque', mode: 'columns' },
  ContaRecorrente: { table: 'conta_recorrente', mode: 'columns' },
  ContaPrevista: { table: 'conta_prevista', mode: 'columns' },
  CategoriaProduto: { table: 'categoria_produto', mode: 'columns' },
  CategoriaFinanceira: { table: 'categoria_financeira', mode: 'columns' },
  AgendaLogistica: { table: 'agenda_logistica', mode: 'columns' },
  MovimentosCaixa: { table: 'movimentos_caixa', mode: 'columns' },
  TargetFlare: { table: 'target_flare', mode: 'columns' },
  CatalogoInterface: { table: 'catalogo_interface', mode: 'columns' },

  // Alias usado em código antigo: `base44.entities.Categoria` → mapa pra categoria_produto.
  Categoria: { table: 'categoria_produto', mode: 'columns' },

  // === Estendidas (modo 'jsonb', migration 007) ===
  // Cada uma tem `dados jsonb` + algumas colunas que o app costuma filtrar (ver migration).
  AnexoDocumento: { table: 'anexo_documento', mode: 'jsonb' },
  Area: { table: 'area', mode: 'jsonb' },
  AutorizacaoEstorno: {
    table: 'autorizacao_estorno',
    mode: 'jsonb',
    columns: ['pedido_venda_id', 'status']
  },
  AvisosAuto: { table: 'avisos_auto', mode: 'jsonb' },
  Campanha: { table: 'campanha', mode: 'jsonb' },
  ComprovanteTemplate: { table: 'comprovante_template', mode: 'jsonb' },
  ConferenciaCompra: {
    table: 'conferencia_compra',
    mode: 'jsonb',
    columns: ['pedido_compra_id', 'status']
  },
  ConferenciaEstoque: {
    table: 'conferencia_estoque',
    mode: 'jsonb',
    columns: ['status']
  },
  ConfigAutoAtendimento: { table: 'config_auto_atendimento', mode: 'jsonb' },
  ConfiguracoesEstoque: { table: 'configuracoes_estoque', mode: 'jsonb' },
  ConfiguracoesVenda: { table: 'configuracoes_venda', mode: 'jsonb' },
  ConsumoInterno: { table: 'consumo_interno', mode: 'jsonb', columns: ['status'] },
  Cotacao: { table: 'cotacao', mode: 'jsonb', columns: ['status'] },
  DadosEmpresa: { table: 'dados_empresa', mode: 'jsonb', columns: ['ativo'] },
  DestinacaoConsumoInterno: { table: 'destinacao_consumo_interno', mode: 'jsonb' },
  DevolucaoTroca: {
    table: 'devolucao_troca',
    mode: 'jsonb',
    columns: ['pedido_venda_id', 'status']
  },
  DivergenciaCompra: {
    table: 'divergencia_compra',
    mode: 'jsonb',
    columns: ['pedido_compra_id', 'embarque_id']
  },
  EventoEditorLayout: { table: 'evento_editor_layout', mode: 'jsonb' },
  EventoLogisticoSandbox: { table: 'evento_logistico_sandbox', mode: 'jsonb' },
  EventosLogisticos: { table: 'eventos_logisticos', mode: 'jsonb' },
  ImportacaoLog: { table: 'importacao_log', mode: 'jsonb' },
  Interveniente: { table: 'interveniente', mode: 'jsonb' },
  LayoutTemplate: { table: 'layout_template', mode: 'jsonb' },
  LoteEstoque: {
    table: 'lote_estoque',
    mode: 'jsonb',
    columns: ['produto_id', 'numero_lote', 'data_validade']
  },
  ManifestoEntrada: {
    table: 'manifesto_entrada',
    mode: 'jsonb',
    columns: ['supermanifesto_id', 'status']
  },
  Maquininha: { table: 'maquininha', mode: 'jsonb', columns: ['ativa'] },
  OrdemSeparacao: {
    table: 'ordem_separacao',
    mode: 'jsonb',
    columns: ['pedido_venda_id', 'status']
  },
  PerfilDeAcesso: { table: 'perfil_de_acesso', mode: 'jsonb', columns: ['nome'] },
  PoliticasDesconto: { table: 'politicas_desconto', mode: 'jsonb' },
  ProtocoloEntrega: {
    table: 'protocolo_entrega',
    mode: 'jsonb',
    columns: ['agenda_id', 'status']
  },
  RascunhoPedidoVenda: {
    table: 'rascunho_pedido_venda',
    mode: 'jsonb',
    columns: ['vendedor_id', 'cliente_id', 'status']
  },
  ResponsavelConsumoInterno: { table: 'responsavel_consumo_interno', mode: 'jsonb' },
  StatusPedidoCompra: { table: 'status_pedido_compra', mode: 'jsonb' },
  Supermanifesto: { table: 'supermanifesto', mode: 'jsonb' },
  Tarefa: {
    table: 'tarefa',
    mode: 'jsonb',
    columns: ['status', 'assignee_id', 'referencia_id']
  },
  TransicaoPedidoCompra: {
    table: 'transicao_pedido_compra',
    mode: 'jsonb',
    columns: ['pedido_compra_id', 'tipo', 'usuario_id']
  },
  Transportadora: { table: 'transportadora', mode: 'jsonb', columns: ['nome', 'ativo'] },
  // `User` (auth) é tratado pelo supabaseAdapter; quando alguém faz `User.list/filter/get`
  // a leitura cai aqui — tabela `usuario` (lookup auxiliar) com email indexado.
  User: { table: 'usuario', mode: 'jsonb', columns: ['email', 'full_name', 'role'] },
  Usuario: { table: 'usuario', mode: 'jsonb', columns: ['email', 'full_name', 'role'] },
  ValeCompra: { table: 'vale_compra', mode: 'jsonb', columns: ['cliente_id', 'status'] },
  VendaPerdida: { table: 'venda_perdida', mode: 'jsonb', columns: ['motivo', 'vendedor_id'] }
};

/**
 * Resolve uma entrada do mapa para o formato canônico { table, mode, columns }.
 * Aceita string (legado) ou objeto. Retorna null quando a entidade não está mapeada.
 */
export function resolveEntityMapping(entityName) {
  const raw = ENTITY_TO_TABLE[entityName];
  if (!raw) return null;
  if (typeof raw === 'string') {
    return { table: raw, mode: 'columns', columns: null };
  }
  return {
    table: raw.table,
    mode: raw.mode || 'columns',
    columns: Array.isArray(raw.columns) ? raw.columns : null
  };
}

export function isEntityLinkedToSupabase(entityName) {
  return Boolean(ENTITY_TO_TABLE[entityName]);
}
