import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Commita os 4 arquivos de migration docs para o GitHub.
 * POST — admin only.
 *
 * Usa o connector GitHub autorizado (OAuth token).
 * Env vars: FLARE_GITHUB_OWNER, FLARE_GITHUB_REPO, FLARE_GITHUB_BRANCH
 */

const FILES = [
  { path: 'docs/migration/ENTITIES_MANIFEST.json',   localPath: 'ENTITIES_MANIFEST' },
  { path: 'docs/migration/AUTOMATIONS_MANIFEST.json', localPath: 'AUTOMATIONS_MANIFEST' },
  { path: 'docs/migration/FUNCTIONS_MANIFEST.json',   localPath: 'FUNCTIONS_MANIFEST' },
  { path: 'docs/migration/MIGRATION_CHECKLIST.md',    localPath: 'MIGRATION_CHECKLIST' },
];

// Conteúdo inline dos manifestos (evita import de ficheiros locais — Deno não suporta)
function getFileContent(localPath) {
  const contents = {
    ENTITIES_MANIFEST: JSON.stringify({
  "schema_version": "1.0.0",
  "generated_at": "2026-04-15T00:00:00Z",
  "source": "base44",
  "app_id": "68a91b1a009497f8d44af37e",
  "built_in_fields": {
    "note": "All entities automatically include these fields — do NOT redeclare in schema",
    "fields": [
      { "name": "id", "type": "string", "pg_type": "TEXT PRIMARY KEY" },
      { "name": "created_date", "type": "string (ISO8601)", "pg_type": "TIMESTAMPTZ DEFAULT NOW()" },
      { "name": "updated_date", "type": "string (ISO8601)", "pg_type": "TIMESTAMPTZ DEFAULT NOW()" },
      { "name": "created_by", "type": "string (email)", "pg_type": "TEXT" }
    ]
  },
  "entities": [
    {
      "name": "LancamentoFinanceiro",
      "description": "Lançamentos financeiros (receitas e despesas)",
      "required": ["tipo", "descricao", "valor", "conta_financeira_id", "data_vencimento"],
      "relations": [
        { "field": "terceiro_id", "references": "Terceiro.id" },
        { "field": "forma_pagamento_id", "references": "FormasDePagamento.id" },
        { "field": "categoria_id", "references": "CategoriaFinanceira.id" },
        { "field": "conta_financeira_id", "references": "ContasFinanceiras.id" },
        { "field": "turno_caixa_id", "references": "TurnoCaixa.id" },
        { "field": "grupo_lancamento_id", "references": "group_id (self-ref, recorrência/parcelamento)" },
        { "field": "pedido_compra_vinculado_id", "references": "PedidoCompra.id" }
      ],
      "fields": [
        { "name": "tipo", "type": "enum", "values": ["Receita","Despesa"], "pg_type": "TEXT NOT NULL CHECK (tipo IN ('Receita','Despesa'))" },
        { "name": "descricao", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "terceiro_id", "type": "string", "pg_type": "TEXT" },
        { "name": "terceiro_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "valor", "type": "number", "pg_type": "NUMERIC(15,2) NOT NULL" },
        { "name": "valor_liquido", "type": "number", "pg_type": "NUMERIC(15,2)" },
        { "name": "data_vencimento", "type": "date", "pg_type": "DATE NOT NULL" },
        { "name": "data_pagamento", "type": "date", "pg_type": "DATE" },
        { "name": "data_liquidacao_prevista", "type": "date", "pg_type": "DATE" },
        { "name": "data_liquidacao_efetiva", "type": "date", "pg_type": "DATE" },
        { "name": "status", "type": "enum", "values": ["Em Aberto","Pago","Vencido","Cancelado"], "default": "Em Aberto", "pg_type": "TEXT NOT NULL DEFAULT 'Em Aberto'" },
        { "name": "status_conciliacao", "type": "enum", "values": ["N/A","Pendente","Conciliado","Ajustado","Discrepância"], "default": "N/A", "pg_type": "TEXT DEFAULT 'N/A'" },
        { "name": "forma_pagamento", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "forma_pagamento_id", "type": "string", "pg_type": "TEXT" },
        { "name": "forma_pagamento_tipo", "type": "enum", "values": ["Dinheiro","PIX","Cartão Débito","Cartão Crédito","Boleto","Transferência"], "pg_type": "TEXT" },
        { "name": "categoria", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "categoria_id", "type": "string", "pg_type": "TEXT" },
        { "name": "tags", "type": "array<string>", "pg_type": "TEXT[]" },
        { "name": "conta_financeira_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "conta_financeira_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "turno_caixa_id", "type": "string", "pg_type": "TEXT" },
        { "name": "referencia_id", "type": "string", "pg_type": "TEXT" },
        { "name": "referencia_tipo", "type": "enum", "values": ["PedidoVenda","PedidoCompra","Agendamento","Conciliacao","Manual"], "pg_type": "TEXT" },
        { "name": "referencia_numero", "type": "string", "pg_type": "TEXT" },
        { "name": "conciliacao_grupo_id", "type": "string", "pg_type": "TEXT" },
        { "name": "observacoes", "type": "string", "pg_type": "TEXT" },
        { "name": "is_recorrente", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "frequencia_recorrencia", "type": "enum", "values": ["Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual","Parcelado"], "pg_type": "TEXT" },
        { "name": "numero_parcelas_total", "type": "number", "pg_type": "INT" },
        { "name": "parcela_atual", "type": "number", "pg_type": "INT" },
        { "name": "grupo_lancamento_id", "type": "string", "pg_type": "TEXT" },
        { "name": "data_fim_recorrencia", "type": "date", "pg_type": "DATE" },
        { "name": "is_custo_mercadoria", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "pedido_compra_vinculado_id", "type": "string", "pg_type": "TEXT" },
        { "name": "pedido_compra_vinculado_numero", "type": "string", "pg_type": "TEXT", "cache": true }
      ]
    },
    {
      "name": "Terceiro",
      "description": "Clientes e fornecedores",
      "required": ["nome", "tipo"],
      "relations": [],
      "fields": [
        { "name": "codigo_interno", "type": "string", "pg_type": "TEXT UNIQUE" },
        { "name": "nome", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "cpf_cnpj", "type": "string", "pg_type": "TEXT" },
        { "name": "email", "type": "string (email)", "pg_type": "TEXT" },
        { "name": "telefone", "type": "string", "pg_type": "TEXT" },
        { "name": "endereco", "type": "string", "pg_type": "TEXT" },
        { "name": "bairro", "type": "string", "pg_type": "TEXT" },
        { "name": "cidade", "type": "string", "pg_type": "TEXT" },
        { "name": "estado", "type": "string", "pg_type": "TEXT" },
        { "name": "cep", "type": "string", "pg_type": "TEXT" },
        { "name": "tipo", "type": "enum", "values": ["Cliente","Fornecedor","Ambos"], "pg_type": "TEXT NOT NULL" },
        { "name": "perfil", "type": "enum", "values": ["Pessoa Física","Profissional/Instalador","Empresa/Loja","Construtora/Obra"], "pg_type": "TEXT" },
        { "name": "data_nascimento", "type": "date", "pg_type": "DATE" },
        { "name": "observacoes", "type": "string", "pg_type": "TEXT" },
        { "name": "ativo", "type": "boolean", "default": true, "pg_type": "BOOLEAN DEFAULT TRUE" }
      ]
    },
    {
      "name": "Produto",
      "description": "Catálogo de produtos e serviços com hierarquia de nomenclatura",
      "required": ["campo_hierarquico_1", "preco_venda_padrao", "tipo"],
      "relations": [
        { "field": "categoria_id", "references": "CategoriaProduto.id" },
        { "field": "area_id", "references": "Area.id" },
        { "field": "fornecedor_padrao_id", "references": "Terceiro.id" }
      ],
      "fields": [
        { "name": "codigo_interno", "type": "string", "pg_type": "TEXT UNIQUE" },
        { "name": "codigo_barras", "type": "string", "pg_type": "TEXT" },
        { "name": "campo_hierarquico_1", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "campo_hierarquico_2", "type": "string", "pg_type": "TEXT" },
        { "name": "campo_hierarquico_3", "type": "string", "pg_type": "TEXT" },
        { "name": "campo_hierarquico_4", "type": "string", "pg_type": "TEXT" },
        { "name": "campo_hierarquico_5", "type": "string", "pg_type": "TEXT" },
        { "name": "nome", "type": "string", "pg_type": "TEXT", "note": "computed from campos hierárquicos" },
        { "name": "categoria_id", "type": "string", "pg_type": "TEXT" },
        { "name": "categoria_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "area_id", "type": "string", "pg_type": "TEXT" },
        { "name": "area_codigo", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "marca", "type": "string", "pg_type": "TEXT" },
        { "name": "imagem_url", "type": "string", "pg_type": "TEXT" },
        { "name": "tags", "type": "array<string>", "pg_type": "TEXT[]" },
        { "name": "tipo", "type": "enum", "values": ["Produto","Serviço"], "default": "Produto", "pg_type": "TEXT NOT NULL DEFAULT 'Produto'" },
        { "name": "abcd", "type": "enum", "values": ["A","B","C","D"], "pg_type": "TEXT" },
        { "name": "preco_livre", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "casas_decimais", "type": "number", "default": 0, "pg_type": "INT DEFAULT 0" },
        { "name": "valor_compra", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "preco_venda_padrao", "type": "number", "pg_type": "NUMERIC(15,4) NOT NULL" },
        { "name": "preco_venda_tipo", "type": "enum", "values": ["numerico","percentual"], "default": "percentual", "pg_type": "TEXT DEFAULT 'percentual'" },
        { "name": "preco_venda_percentual", "type": "number", "default": 40, "pg_type": "NUMERIC(8,2) DEFAULT 40" },
        { "name": "preco_custo_calculado", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "estoque_atual", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "estoque_minimo", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "estoque_ideal", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "estoque_maximo", "type": "number", "default": 0, "pg_type": "NUMERIC(15,4) DEFAULT 0" },
        { "name": "unidade_principal", "type": "string", "default": "UN", "pg_type": "TEXT DEFAULT 'UN'" },
        { "name": "unidades_por_pacote", "type": "number", "default": 1, "pg_type": "NUMERIC(10,4) DEFAULT 1" },
        { "name": "unidades_alternativas", "type": "array<object>", "pg_type": "JSONB DEFAULT '[]'" },
        { "name": "controla_serial", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "controla_lote", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "controla_validade", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "ativo", "type": "boolean", "default": true, "pg_type": "BOOLEAN DEFAULT TRUE" }
      ]
    },
    {
      "name": "PedidoVenda",
      "description": "Pedidos de venda, PDV e orçamentos",
      "required": ["itens", "valor_total"],
      "relations": [
        { "field": "cliente_id", "references": "Terceiro.id" },
        { "field": "vendedor_id", "references": "User.id" },
        { "field": "tabela_preco_id", "references": "TabelaPreco.id" },
        { "field": "turno_caixa_id", "references": "TurnoCaixa.id" }
      ],
      "fields": [
        { "name": "numero", "type": "string", "pg_type": "TEXT UNIQUE" },
        { "name": "cliente_id", "type": "string", "pg_type": "TEXT" },
        { "name": "cliente_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "vendedor_id", "type": "string", "pg_type": "TEXT" },
        { "name": "tipo", "type": "enum", "values": ["PDV","Pedido","Orçamento"], "pg_type": "TEXT" },
        { "name": "status", "type": "enum", "values": ["Orçamento","Aguardando Caixa","Financeiro OK","Em Separação","Em Rota de Entrega","Pedido Concluído","Cancelado"], "default": "Orçamento", "pg_type": "TEXT NOT NULL DEFAULT 'Orçamento'" },
        { "name": "metodo_entrega", "type": "enum", "values": ["Delivery","Retirada"], "pg_type": "TEXT" },
        { "name": "turno_caixa_id", "type": "string", "pg_type": "TEXT" },
        { "name": "itens", "type": "array<object>", "pg_type": "JSONB NOT NULL DEFAULT '[]'" },
        { "name": "subtotal", "type": "number", "pg_type": "NUMERIC(15,2)" },
        { "name": "valor_desconto", "type": "number", "default": 0, "pg_type": "NUMERIC(15,2) DEFAULT 0" },
        { "name": "valor_frete", "type": "number", "default": 0, "pg_type": "NUMERIC(15,2) DEFAULT 0" },
        { "name": "valor_total", "type": "number", "pg_type": "NUMERIC(15,2) NOT NULL" },
        { "name": "pagamentos", "type": "array<object>", "pg_type": "JSONB DEFAULT '[]'" },
        { "name": "data_entrega", "type": "date", "pg_type": "DATE" },
        { "name": "observacoes", "type": "string", "pg_type": "TEXT" }
      ]
    },
    {
      "name": "PedidoCompra",
      "description": "Pedidos de compra ao fornecedor",
      "required": ["fornecedor_id", "itens"],
      "relations": [
        { "field": "fornecedor_id", "references": "Terceiro.id" },
        { "field": "conta_pagamento_id", "references": "ContasFinanceiras.id" }
      ],
      "fields": [
        { "name": "numero", "type": "string", "pg_type": "TEXT UNIQUE" },
        { "name": "fornecedor_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "fornecedor_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "data_emissao", "type": "date", "pg_type": "DATE" },
        { "name": "status", "type": "enum", "values": ["Rascunho","Aguardando Aprovação Financeira","Aprovado"], "default": "Rascunho", "pg_type": "TEXT NOT NULL DEFAULT 'Rascunho'" },
        { "name": "itens", "type": "array<object>", "pg_type": "JSONB NOT NULL DEFAULT '[]'" },
        { "name": "valor_total", "type": "number", "pg_type": "NUMERIC(15,2)" },
        { "name": "observacoes", "type": "string", "pg_type": "TEXT" }
      ]
    },
    {
      "name": "MovimentacaoEstoque",
      "description": "Entradas e saídas de estoque",
      "required": ["produto_id", "tipo", "quantidade"],
      "relations": [{ "field": "produto_id", "references": "Produto.id" }],
      "fields": [
        { "name": "produto_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "produto_nome", "type": "string", "pg_type": "TEXT", "cache": true },
        { "name": "tipo", "type": "enum", "values": ["Entrada","Saída"], "pg_type": "TEXT NOT NULL" },
        { "name": "motivo", "type": "enum", "values": ["Compra","Venda","Ajuste de Inventário","Consumo Interno","Perda","Doação","Transferência","Devolução"], "pg_type": "TEXT" },
        { "name": "quantidade", "type": "number", "pg_type": "NUMERIC(15,4) NOT NULL" },
        { "name": "custo_unitario", "type": "number", "pg_type": "NUMERIC(15,4)" },
        { "name": "referencia_tipo", "type": "string", "pg_type": "TEXT" },
        { "name": "referencia_id", "type": "string", "pg_type": "TEXT" },
        { "name": "observacoes", "type": "string", "pg_type": "TEXT" }
      ]
    },
    {
      "name": "ContasFinanceiras",
      "description": "Contas bancárias, caixas físicos, carteiras digitais",
      "required": ["nome", "tipo"],
      "fields": [
        { "name": "nome", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "tipo", "type": "enum", "values": ["Caixa Físico","Conta Bancária","Carteira Digital","Poupança","Investimento"], "pg_type": "TEXT NOT NULL" },
        { "name": "is_caixa_geral", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "is_caixa_pdv", "type": "boolean", "default": false, "pg_type": "BOOLEAN DEFAULT FALSE" },
        { "name": "saldo_inicial", "type": "number", "default": 0, "pg_type": "NUMERIC(15,2) DEFAULT 0" },
        { "name": "saldo_atual", "type": "number", "default": 0, "pg_type": "NUMERIC(15,2) DEFAULT 0" },
        { "name": "ativo", "type": "boolean", "default": true, "pg_type": "BOOLEAN DEFAULT TRUE" }
      ]
    },
    {
      "name": "FormasDePagamento",
      "description": "Métodos de pagamento com taxas e destino",
      "required": ["nome", "tipo", "conta_destino_id"],
      "fields": [
        { "name": "nome", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "tipo", "type": "enum", "values": ["Dinheiro","PIX","Cartão Débito","Cartão Crédito","Boleto","Transferência"], "pg_type": "TEXT NOT NULL" },
        { "name": "conta_destino_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "prazo_recebimento_dias", "type": "number", "default": 0, "pg_type": "INT DEFAULT 0" },
        { "name": "valor_taxa", "type": "number", "default": 0, "pg_type": "NUMERIC(8,4) DEFAULT 0" },
        { "name": "ativo", "type": "boolean", "default": true, "pg_type": "BOOLEAN DEFAULT TRUE" }
      ]
    },
    {
      "name": "TurnoCaixa",
      "description": "Turnos de operação do caixa PDV",
      "required": ["conta_caixa_pdv_id", "data_abertura", "saldo_inicial"],
      "fields": [
        { "name": "numero", "type": "string", "pg_type": "TEXT UNIQUE" },
        { "name": "conta_caixa_pdv_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "data_abertura", "type": "datetime", "pg_type": "TIMESTAMPTZ NOT NULL" },
        { "name": "saldo_inicial", "type": "number", "pg_type": "NUMERIC(15,2) NOT NULL" },
        { "name": "data_fechamento", "type": "datetime", "pg_type": "TIMESTAMPTZ" },
        { "name": "saldo_final", "type": "number", "pg_type": "NUMERIC(15,2)" },
        { "name": "status", "type": "enum", "values": ["Aberto","Fechado"], "default": "Aberto", "pg_type": "TEXT NOT NULL DEFAULT 'Aberto'" }
      ]
    },
    {
      "name": "ContaRecorrente",
      "description": "Template de despesas recorrentes",
      "required": ["nome_despesa", "terceiro_id", "categoria_financeira_id", "valor_previsto", "frequencia", "dia_vencimento"],
      "fields": [
        { "name": "nome_despesa", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "terceiro_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "categoria_financeira_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "valor_previsto", "type": "number", "pg_type": "NUMERIC(15,2) NOT NULL" },
        { "name": "frequencia", "type": "enum", "values": ["Mensal","Bimestral","Trimestral","Semestral","Anual"], "pg_type": "TEXT NOT NULL" },
        { "name": "dia_vencimento", "type": "number", "pg_type": "INT NOT NULL" },
        { "name": "ativa", "type": "boolean", "default": true, "pg_type": "BOOLEAN DEFAULT TRUE" }
      ]
    },
    {
      "name": "ContaPrevista",
      "description": "Contas previstas geradas por ContaRecorrente ou manualmente",
      "required": ["descricao", "terceiro_id", "categoria_financeira_id", "valor", "data_vencimento", "natureza"],
      "fields": [
        { "name": "descricao", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "terceiro_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "categoria_financeira_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "valor", "type": "number", "pg_type": "NUMERIC(15,2) NOT NULL" },
        { "name": "data_vencimento", "type": "date", "pg_type": "DATE NOT NULL" },
        { "name": "natureza", "type": "enum", "values": ["Parcelado","Único","Recorrente"], "pg_type": "TEXT NOT NULL" },
        { "name": "conta_recorrente_id", "type": "string", "pg_type": "TEXT" },
        { "name": "status", "type": "enum", "values": ["Pendente","Boleto Anexado","Pago","Cancelado"], "default": "Pendente", "pg_type": "TEXT NOT NULL DEFAULT 'Pendente'" }
      ]
    },
    {
      "name": "Embarque",
      "description": "Embarques logísticos vinculados a pedidos de compra",
      "required": ["pedido_compra_id", "numero", "tipo"],
      "fields": [
        { "name": "pedido_compra_id", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "numero", "type": "string", "pg_type": "TEXT NOT NULL" },
        { "name": "tipo", "type": "enum", "values": ["Embarque","Necessidade"], "pg_type": "TEXT NOT NULL DEFAULT 'Embarque'" },
        { "name": "status", "type": "enum", "values": ["Pendente","Despachado","Concluído"], "default": "Pendente", "pg_type": "TEXT DEFAULT 'Pendente'" },
        { "name": "eta", "type": "datetime", "pg_type": "TIMESTAMPTZ" },
        { "name": "itens", "type": "array<object>", "pg_type": "JSONB DEFAULT '[]'" }
      ]
    },
    {
      "name": "TargetFlare",
      "description": "Alvos do Modo Flare — bugs/melhorias apontados na UI",
      "required": ["status","file_path","line","column","source_location_raw","component_name","briefing","action_briefing","confidence"],
      "relations": [],
      "lifecycle": ["pending","in_progress","ready_for_verify","resolved","reopened","ignored"]
    }
  ]
}, null, 2),

    AUTOMATIONS_MANIFEST: JSON.stringify({
  "schema_version": "1.0.0",
  "generated_at": "2026-04-15T00:00:00Z",
  "source": "base44",
  "note": "All automations listed here. 'is_active: false' = paused. Equivalent in Supabase: pg_cron (scheduled) + triggers (entity) + webhooks (connector).",
  "automations": [
    {
      "id": "69defa6a3d4ae8f27610f865",
      "name": "Flare: Export para GitHub",
      "type": "entity",
      "is_active": true,
      "entity": "TargetFlare",
      "events": ["create", "update"],
      "function": "exportFlareToGithub",
      "trigger_conditions": { "logic": "and", "conditions": [{ "field": "data.briefing", "operator": "is_not_empty" }] },
      "description": "Exporta fila TargetFlare pendentes como JSON para GitHub quando briefing está preenchido.",
      "supabase_equivalent": "CREATE TRIGGER trg_flare_export AFTER INSERT OR UPDATE ON target_flare FOR EACH ROW WHEN (NEW.briefing IS NOT NULL AND NEW.briefing != '') EXECUTE FUNCTION edge_fn_export_flare_to_github();"
    },
    {
      "id": "69d82cf6461872d4ff75501f",
      "name": "Sincronizar estoque por movimentação",
      "type": "entity",
      "is_active": true,
      "entity": "MovimentacaoEstoque",
      "events": ["create", "update", "delete"],
      "function": "sincronizarEstoquePorMovimentacao",
      "trigger_conditions": null,
      "stats": { "total_runs": 164, "success_rate": "100%" },
      "description": "Mantém estoque_atual em Produto sincronizado via movimentações.",
      "supabase_equivalent": "CREATE TRIGGER trg_sync_estoque AFTER INSERT OR UPDATE OR DELETE ON movimentacao_estoque FOR EACH ROW EXECUTE FUNCTION edge_fn_sincronizar_estoque();"
    },
    {
      "id": "69d2c8b223535e9b00aade7c",
      "name": "Sincronizar ContaPrevista → LancamentoFinanceiro",
      "type": "entity",
      "is_active": true,
      "entity": "ContaPrevista",
      "events": ["update"],
      "function": "sincronizarContaPrevia",
      "trigger_conditions": { "logic": "and", "conditions": [
        { "field": "changed_fields", "operator": "contains", "value": "status" },
        { "field": "data.status", "operator": "equals", "value": "Pago" }
      ]},
      "description": "Quando ContaPrevista.status muda para 'Pago', cria LancamentoFinanceiro correspondente.",
      "supabase_equivalent": "CREATE TRIGGER trg_sync_conta_previa AFTER UPDATE ON conta_prevista FOR EACH ROW WHEN (OLD.status != 'Pago' AND NEW.status = 'Pago') EXECUTE FUNCTION edge_fn_sincronizar_conta_previa();"
    },
    {
      "id": "69d33c8aa177ed6a21dd4700",
      "name": "Excluir vínculos ao apagar conta recorrente",
      "type": "entity",
      "is_active": true,
      "entity": "ContaRecorrente",
      "events": ["delete"],
      "function": "sincronizarExclusaoContaRecorrente",
      "trigger_conditions": null,
      "description": "Remove ContasPrevistas e LancamentosFinanceiros vinculados quando ContaRecorrente é excluída.",
      "supabase_equivalent": "CREATE TRIGGER trg_delete_recorrente AFTER DELETE ON conta_recorrente FOR EACH ROW EXECUTE FUNCTION edge_fn_excluir_vinculados_recorrente();"
    },
    {
      "id": "69c2b62cee127334968f7e29",
      "name": "Sincronizar deleção de movimentos de caixa",
      "type": "entity",
      "is_active": false,
      "entity": "LancamentoFinanceiro",
      "events": ["delete"],
      "function": "sincronizarDelecaoLancamentos",
      "description": "INATIVO. Sincronizava deleção de lançamentos relacionados a MovimentosCaixa.",
      "stats": { "total_runs": 12, "success_rate": "100%" }
    },
    {
      "id": "69be3ff014187cf035c2eb79",
      "name": "Gerar Lançamentos Cartão - Meia-noite",
      "type": "scheduled",
      "is_active": true,
      "schedule": "daily at 05:00 UTC (02:00 Rio Branco -03:00)",
      "function": "gerarLancamentosCartao",
      "description": "Processa PagamentoCartaoDetalhe com status Pendente e gera LancamentosFinanceiros de receita + despesa de taxa.",
      "stats": { "total_runs": 24, "success_rate": "100%" },
      "supabase_equivalent": "SELECT cron.schedule('gerar-lancamentos-cartao', '0 5 * * *', $$ SELECT net.http_post(url:='https://your-project.supabase.co/functions/v1/gerarLancamentosCartao') $$);"
    },
    {
      "id": "69d2c8b223535e9b00aade7d",
      "name": "Gerar ContasPrevistas Recorrentes (1º do mês)",
      "type": "scheduled",
      "is_active": true,
      "schedule": "cron: 0 6 1 * * (1st of month at 06:00 UTC)",
      "function": "gerarContasPrevistasRecorrentes",
      "description": "Gera contas previstas dos próximos 3 meses a partir das ContasRecorrentes ativas.",
      "supabase_equivalent": "SELECT cron.schedule('gerar-contas-previstas', '0 6 1 * *', $$ SELECT net.http_post(url:='https://your-project.supabase.co/functions/v1/gerarContasPrevistasRecorrentes') $$);"
    },
    {
      "id": "69d56a289195b6a1d64eb1fb",
      "name": "Atualizar viagens transportadoras",
      "type": "scheduled",
      "is_active": true,
      "schedule": "monthly on day 1 at 00:10 UTC",
      "function": "atualizarViagensTransportadoras",
      "description": "Sincroniza dados de viagens de transportadoras mensalmente.",
      "supabase_equivalent": "SELECT cron.schedule('atualizar-viagens', '10 0 1 * *', $$ SELECT net.http_post(url:='https://your-project.supabase.co/functions/v1/atualizarViagensTransportadoras') $$);"
    },
    {
      "id": "69be3ecd02871f7b9ebd963b",
      "name": "Gerar Lançamentos de Cartão (duplicata)",
      "type": "scheduled",
      "is_active": true,
      "schedule": "daily at 05:00 UTC",
      "function": "gerarLancamentosCartao",
      "note": "DUPLICATE of 69be3ff0 — same function, same schedule. Review before migration."
    }
  ],
  "migration_notes": {
    "entity_triggers": "Use Supabase PostgreSQL triggers + Edge Functions.",
    "scheduled": "Use pg_cron extension. Call Edge Functions via net.http_post.",
    "changed_fields_condition": "In Supabase triggers, implement manually: compare OLD.field != NEW.field in trigger function body.",
    "payload_too_large": "Not applicable in Supabase — trigger has direct access to full row data."
  }
}, null, 2),

    FUNCTIONS_MANIFEST: JSON.stringify({
  "schema_version": "1.0.0",
  "generated_at": "2026-04-15T00:00:00Z",
  "source": "base44",
  "runtime": "Deno Deploy (Base44 managed)",
  "invoke_contract": {
    "from_frontend": "import { fnName } from '@/functions/fnName'; const res = await fnName(payload);",
    "from_backend": "await base44.functions.invoke('fnName', payload);",
    "auth": "All functions receive the caller's auth context via createClientFromRequest(req).",
    "supabase_equivalent": "supabase.functions.invoke('fn-name', { body: payload })"
  },
  "functions": [
    { "name": "processarVendaCaixa", "description": "Processa venda PDV: valida turno, cria LancamentosFinanceiros, atualiza estoque, fecha venda.", "entities_written": ["LancamentoFinanceiro","MovimentacaoEstoque","PedidoVenda","TurnoCaixa","PagamentoCartaoDetalhe"], "critical": true },
    { "name": "sincronizarEstoquePorMovimentacao", "description": "Recalcula estoque_atual em Produto.", "entities_written": ["Produto"], "trigger": "entity automation on MovimentacaoEstoque", "critical": true },
    { "name": "gerarLancamentosCartao", "description": "Processa PagamentoCartaoDetalhe pendentes, gera LancamentosFinanceiros.", "trigger": "scheduled daily 05:00 UTC", "critical": true },
    { "name": "gerarContasPrevistasRecorrentes", "description": "Gera ContasPrevistas dos próximos 3 meses.", "trigger": "scheduled 1st of month 06:00 UTC", "critical": true },
    { "name": "sincronizarContaPrevia", "description": "Quando ContaPrevista.status → 'Pago', cria LancamentoFinanceiro.", "trigger": "entity automation on ContaPrevista update", "critical": true },
    { "name": "sincronizarExclusaoContaRecorrente", "description": "Remove ContasPrevistas e Lançamentos ao deletar ContaRecorrente.", "critical": false },
    { "name": "sincronizarDelecaoLancamentos", "description": "INATIVO. Sincronizava deleção de lançamentos de MovimentosCaixa.", "is_active": false, "critical": false },
    { "name": "gerarNumeroSequencial", "description": "Gera número sequencial formatado (PC-00001, PV-00001, etc.).", "critical": true, "note": "Used by many functions. Migrate first." },
    { "name": "cancelarLancamentoFinanceiro", "description": "Cancela LancamentoFinanceiro e reverte saldo.", "critical": true },
    { "name": "auditarSaldosContas", "description": "Recalcula saldo_atual de todas ContasFinanceiras.", "admin_only": true, "critical": true },
    { "name": "enviarFinanceiroLote", "description": "Marca múltiplos LancamentosFinanceiros como pagos em lote.", "critical": true },
    { "name": "gerarExtratoFluxoCaixa", "description": "Gera extrato de fluxo de caixa filtrado por período/conta.", "critical": false },
    { "name": "gerarRelatorioMargem", "description": "Calcula margem bruta por produto/período.", "critical": false },
    { "name": "gerarRelatorioPedidosCompra", "description": "Relatório consolidado de pedidos de compra.", "critical": false },
    { "name": "importarProdutos", "description": "Importa produtos em massa de XLS/CSV.", "admin_only": true, "integrations_used": ["Core.ExtractDataFromUploadedFile"], "critical": false },
    { "name": "importarPedidosCompra", "description": "Importa pedidos de compra de planilha.", "admin_only": true, "critical": false },
    { "name": "recalcularEstoqueProduto", "description": "Recalcula estoque_atual de produto(s).", "admin_only": true, "critical": true },
    { "name": "gerenciarPin", "description": "Cria, valida e gerencia PINs de autenticação.", "critical": true, "note": "PIN stored as hash. Port hashing exactly." },
    { "name": "listarAnexos", "description": "Lista AnexoDocumento por referência.", "critical": false },
    { "name": "deletarAnexo", "description": "Remove AnexoDocumento e arquivo do storage.", "critical": false },
    { "name": "imprimirCupomTermico", "description": "Gera HTML/PDF de cupom térmico.", "critical": false },
    { "name": "exportFlareToGithub", "description": "Exporta TargetFlares pendentes como JSON para GitHub.", "integrations_used": ["github connector"], "required_secrets": ["FLARE_GITHUB_OWNER","FLARE_GITHUB_REPO","FLARE_GITHUB_BRANCH"], "critical": false },
    { "name": "atualizarStatusLancamentos", "description": "Atualiza status de LancamentosFinanceiros vencidos.", "critical": true },
    { "name": "zerarEntidade", "description": "Apaga todos os registros de uma entidade (admin only).", "admin_only": true, "critical": false },
    { "name": "convidarUsuarios", "description": "Convida usuários para a app via email.", "admin_only": true, "integrations_used": ["Core.SendEmail"], "critical": false },
    { "name": "uploadAnexoDrive", "description": "Upload de arquivo para Google Drive.", "integrations_used": ["googledrive connector"], "critical": false },
    { "name": "calcularIEP", "description": "Calcula Índice de Eficiência de Pedidos.", "critical": false },
    { "name": "commitMigrationManifests", "description": "Commita os manifestos de migração (entities, automations, functions, checklist) para o GitHub.", "admin_only": true, "critical": false }
  ],
  "integrations_used_summary": {
    "Core.InvokeLLM": { "supabase_equivalent": "Direct OpenAI/Anthropic API call", "migration_effort": "low" },
    "Core.UploadFile": { "supabase_equivalent": "supabase.storage.from('bucket').upload(path, file)", "migration_effort": "low" },
    "Core.ExtractDataFromUploadedFile": { "supabase_equivalent": "LlamaParse API or xlsx/csv parsing in Edge Function", "migration_effort": "medium" },
    "Core.SendEmail": { "supabase_equivalent": "Resend API — drop-in replacement", "migration_effort": "low" },
    "github_connector": { "supabase_equivalent": "Direct GitHub API calls with PAT in Supabase Vault", "migration_effort": "low" },
    "googledrive_connector": { "supabase_equivalent": "Google Drive API with OAuth2", "migration_effort": "medium" }
  }
}, null, 2),

    MIGRATION_CHECKLIST: `# Migration Checklist — Base44 → Supabase/PostgreSQL
> Auto-generated: 2026-04-15 | Schema: 1.0.0

## Status Legend
- \`[ ]\` Not started
- \`[x]\` Done
- \`[~]\` In progress
- \`[!]\` Blocked / needs decision

---

## Phase 0 — Data Export (do FIRST)
- [ ] Run \`exportAllEntities\` function to dump all production data as JSON
- [ ] Confirm all entities are present in export
- [ ] Export storage files from \`AnexoDocumento.arquivo_url\`
- [ ] Backup exported JSON to GitHub at \`docs/migration/data-exports/\`
- [ ] Document production record counts per entity

---

## Phase 1 — Schema (PostgreSQL DDL)
See \`ENTITIES_MANIFEST.json\` for full field specs.

### Core Tables (critical path)
- [ ] \`lancamento_financeiro\`
- [ ] \`terceiro\`
- [ ] \`produto\`
- [ ] \`pedido_venda\`
- [ ] \`pedido_compra\`
- [ ] \`movimentacao_estoque\`
- [ ] \`contas_financeiras\`
- [ ] \`formas_de_pagamento\`
- [ ] \`turno_caixa\`

### Reference Tables
- [ ] \`categoria_produto\`
- [ ] \`categoria_financeira\`
- [ ] \`tabela_preco\`
- [ ] \`area\`

### Operational Tables
- [ ] \`embarque\`
- [ ] \`conta_recorrente\`
- [ ] \`conta_prevista\`
- [ ] \`movimentos_caixa\`
- [ ] \`agenda_logistica\`
- [ ] \`target_flare\`

### Schema Notes
- All \`id\` fields: \`TEXT PRIMARY KEY\` (Base44 uses string UUIDs)
- JSONB columns: \`itens\`, \`pagamentos\`, \`volumes_detalhados\`, \`unidades_alternativas\`
- Arrays: \`TEXT[]\` for \`tags\`, \`vendas_ids\`, etc.

---

## Phase 2 — Backend Functions → Edge Functions
See \`FUNCTIONS_MANIFEST.json\` for full list.

### Priority 1 — Critical
- [ ] \`gerarNumeroSequencial\` — migrate first, used everywhere
- [ ] \`processarVendaCaixa\`
- [ ] \`sincronizarEstoquePorMovimentacao\`
- [ ] \`cancelarLancamentoFinanceiro\`
- [ ] \`auditarSaldosContas\`
- [ ] \`gerenciarPin\`
- [ ] \`atualizarStatusLancamentos\`
- [ ] \`gerarLancamentosCartao\`
- [ ] \`recalcularEstoqueProduto\`

### Priority 2 — Important
- [ ] \`gerarContasPrevistasRecorrentes\`
- [ ] \`sincronizarContaPrevia\`
- [ ] \`sincronizarExclusaoContaRecorrente\`
- [ ] \`enviarFinanceiroLote\`

### Priority 3 — Operational
- [ ] \`importarProdutos\`
- [ ] \`gerarExtratoFluxoCaixa\`
- [ ] \`imprimirCupomTermico\`
- [ ] \`listarAnexos\` / \`deletarAnexo\`

### Base44 → Supabase Pattern Map
| Base44 | Supabase |
|---|---|
| \`createClientFromRequest(req)\` | \`createClient(URL, ANON_KEY, { headers: { Authorization } })\` |
| \`base44.auth.me()\` | \`supabase.auth.getUser(token)\` |
| \`base44.entities.X.list()\` | \`supabase.from('x').select('*')\` |
| \`base44.entities.X.create(data)\` | \`supabase.from('x').insert(data).select().single()\` |
| \`base44.entities.X.update(id, data)\` | \`supabase.from('x').update(data).eq('id', id)\` |
| \`base44.entities.X.delete(id)\` | \`supabase.from('x').delete().eq('id', id)\` |
| \`base44.asServiceRole.entities.X\` | \`createClient(URL, SERVICE_ROLE_KEY).from('x')\` |
| \`base44.integrations.Core.SendEmail\` | \`resend.emails.send(...)\` |
| \`base44.integrations.Core.UploadFile\` | \`supabase.storage.from('bucket').upload(...)\` |
| \`base44.integrations.Core.InvokeLLM\` | \`openai.chat.completions.create(...)\` |

---

## Phase 3 — Automations → Triggers + pg_cron
See \`AUTOMATIONS_MANIFEST.json\`.

### Entity Triggers
- [ ] \`sincronizarEstoquePorMovimentacao\` → trigger on \`movimentacao_estoque\`
- [ ] \`sincronizarContaPrevia\` → trigger on \`conta_prevista\` WHERE status = 'Pago'
- [ ] \`sincronizarExclusaoContaRecorrente\` → trigger on \`conta_recorrente\` AFTER DELETE
- [ ] \`exportFlareToGithub\` → trigger on \`target_flare\` WHERE briefing IS NOT NULL

### Scheduled (pg_cron)
- [ ] \`gerarLancamentosCartao\` → \`0 5 * * *\`
- [ ] \`gerarContasPrevistasRecorrentes\` → \`0 6 1 * *\`
- [ ] \`atualizarViagensTransportadoras\` → \`10 0 1 * *\`

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
\`\`\`

---

## Phase 4 — Auth
- [ ] Map Base44 users to Supabase Auth (email as identifier)
- [ ] Migrate \`User.role\` to custom claims or \`profiles\` table
- [ ] Port PIN auth (\`gerenciarPin\`) — verify hash algorithm
- [ ] Implement \`created_by\` via RLS trigger (\`auth.email()\`)

---

## Phase 5 — Storage
- [ ] Create bucket: \`anexos\`
- [ ] Create bucket: \`produtos-imagens\`
- [ ] Create bucket: \`comprovantes\`
- [ ] Migrate files from Base44 URLs to Supabase Storage

---

## Phase 6 — Frontend
- [ ] Replace \`base44\` client → \`supabase\` client
- [ ] Replace \`base44.entities.X\` calls → \`supabase.from('x')\`
- [ ] Replace \`base44.functions.invoke()\` → \`supabase.functions.invoke()\`
- [ ] Port real-time: \`base44.entities.X.subscribe()\` → \`supabase.channel().on('postgres_changes',...)\`

---

## Phase 7 — CI/CD
- [ ] GitHub Actions: \`supabase db push\` + \`supabase functions deploy\` on merge to main
- [ ] Add Supabase secrets to GitHub Secrets

---

## Post-Migration Validation
\`\`\`sql
SELECT 'lancamento_financeiro', COUNT(*) FROM lancamento_financeiro
UNION ALL SELECT 'terceiro', COUNT(*) FROM terceiro
UNION ALL SELECT 'produto', COUNT(*) FROM produto
UNION ALL SELECT 'pedido_venda', COUNT(*) FROM pedido_venda
UNION ALL SELECT 'pedido_compra', COUNT(*) FROM pedido_compra;
\`\`\`

## Known Risks
| Risk | Impact | Mitigation |
|---|---|---|
| JSONB \`itens\` denormalized | High | Migrate as JSONB first, normalize later |
| \`estoque_atual\` is computed | High | Recalculate from MovimentacaoEstoque after import |
| PIN hash unknown | High | Read \`functions/gerenciarPin\` source before migration |
| \`saldo_atual\` is computed | High | Run \`auditarSaldosContas\` after data import |
| Duplicate automation \`gerarLancamentosCartao\` | Medium | Create only one pg_cron job |`
  };
  return contents[localPath] || null;
}

async function commitFile(headers, owner, repo, branch, filePath, content) {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Check if file exists to get SHA
  let sha = null;
  const getResp = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (getResp.ok) {
    const existing = await getResp.json();
    sha = existing.sha;
  }

  const body = {
    message: `docs(migration): sync manifests [${new Date().toISOString().slice(0,16)}Z]`,
    content: encoded,
    branch,
    ...(sha ? { sha } : {}),
  };

  const putResp = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!putResp.ok) {
    const err = await putResp.text();
    throw new Error(`GitHub ${putResp.status} for ${filePath}: ${err}`);
  }

  const result = await putResp.json();
  return result.commit?.sha?.slice(0, 8);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only.' }, { status: 403 });
    }

    const owner  = Deno.env.get('FLARE_GITHUB_OWNER');
    const repo   = Deno.env.get('FLARE_GITHUB_REPO');
    const branch = Deno.env.get('FLARE_GITHUB_BRANCH') || 'main';

    if (!owner || !repo) {
      return Response.json({ error: 'Configure FLARE_GITHUB_OWNER e FLARE_GITHUB_REPO.' }, { status: 500 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const results = [];
    for (const file of FILES) {
      const content = getFileContent(file.localPath);
      if (!content) {
        results.push({ path: file.path, status: 'skipped', reason: 'no content' });
        continue;
      }
      const commitSha = await commitFile(headers, owner, repo, branch, file.path, content);
      results.push({ path: file.path, status: 'committed', sha: commitSha });
    }

    return Response.json({
      success: true,
      owner,
      repo,
      branch,
      committed_at: new Date().toISOString(),
      files: results,
    });

  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});