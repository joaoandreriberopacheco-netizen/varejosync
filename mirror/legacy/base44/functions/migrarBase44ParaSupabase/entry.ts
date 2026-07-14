/**
 * migrarBase44ParaSupabase
 * ─────────────────────────────────────────────────────────────────
 * Lê dados do Base44 e insere no Supabase (migração única / incremental).
 *
 * Parâmetros (body JSON):
 *   entities   string[]  — lista de entidades a migrar (ex: ["Produto","Terceiro"])
 *                          omitir = migra TODAS as entidades mapeadas
 *   batch_size number    — registos por lote (default: 50)
 *   dry_run    boolean   — apenas conta registos, não escreve (default: false)
 *   upsert     boolean   — usa upsert por id em vez de insert (default: true)
 *   skip_existing boolean — ignora entidades que já têm dados no Supabase (default: false)
 *
 * Requer secrets:
 *   VITE_SUPABASE_URL        ou  SUPABASE_URL
 *   VITE_SUPABASE_SERVICE_KEY ou  SUPABASE_SERVICE_KEY
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Mapeamento Entidade → tabela (deve estar em sync com entityTableMap.js) ──
const ENTITY_TABLE_MAP = {
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
  CatalogoInterface: 'catalogo_interface',
  AnexoDocumento: 'anexo_documento',
  Area: 'area',
  AutorizacaoEstorno: 'autorizacao_estorno',
  ComprovanteTemplate: 'comprovante_template',
  ConferenciaCompra: 'conferencia_compra',
  ConferenciaEstoque: 'conferencia_estoque',
  ConsumoInterno: 'consumo_interno',
  Cotacao: 'cotacao',
  DestinacaoConsumoInterno: 'destinacao_consumo_interno',
  DevolucaoTroca: 'devolucao_troca',
  DivergenciaCompra: 'divergencia_compra',
  EventosLogisticos: 'eventos_logisticos',
  Interveniente: 'interveniente',
  LayoutTemplate: 'layout_template',
  ManifestoEntrada: 'manifesto_entrada',
  Maquininha: 'maquininha',
  OrdemSeparacao: 'ordem_separacao',
  ProtocoloEntrega: 'protocolo_entrega',
  RascunhoPedidoVenda: 'rascunho_pedido_venda',
  ResponsavelConsumoInterno: 'responsavel_consumo_interno',
  Supermanifesto: 'supermanifesto',
  Tarefa: 'tarefa',
  Transportadora: 'transportadora',
  ValeCompra: 'vale_compra',
  VendaPerdida: 'venda_perdida',
  Campanha: 'campanha',
  ConfiguracoesEstoque: 'configuracoes_estoque',
  ConfiguracoesVenda: 'configuracoes_venda',
  DadosEmpresa: 'dados_empresa',
  PerfilDeAcesso: 'perfil_de_acesso',
  PoliticasDesconto: 'politicas_desconto',
  StatusPedidoCompra: 'status_pedido_compra',
  // Entidades canônicas de itens
  PedidoCompraItem: 'pedido_compra_item',
  PedidoVendaItem: 'pedido_venda_item',
  EmbarqueItem: 'embarque_item',
  ConferenciaItem: 'conferencia_item',
};

const ALL_ENTITIES = Object.keys(ENTITY_TABLE_MAP);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeRow(row, entityName) {
  const out = { ...row };
  // Normaliza datas legacy do Base44
  if (out.created_date && !out.created_at) out.created_at = out.created_date;
  if (out.updated_date && !out.updated_at) out.updated_at = out.updated_date;
  delete out.created_date;
  delete out.updated_date;

  // Fix TargetFlare — campos com nome reservado no Postgres
  if (entityName === 'TargetFlare') {
    if ('line' in out) { out.flare_line = out.line; delete out.line; }
    if ('column' in out) { out.flare_column = out.column; delete out.column; }
  }
  // PedidoVenda — alias valor_total → total
  if (entityName === 'PedidoVenda' && out.valor_total != null) {
    out.total = out.valor_total;
    delete out.valor_total;
  }
  return out;
}

async function migrateEntity(base44SR, supabase, entityName, tableName, opts) {
  const { batchSize, dryRun, upsert } = opts;
  const result = { entity: entityName, table: tableName, read: 0, written: 0, skipped: 0, errors: [] };

  // ── 1. Ler todos os registos do Base44 (paginado) ──
  let allRows = [];
  let skip = 0;
  const PAGE = 200;
  while (true) {
    const page = await base44SR.entities[entityName].list('-created_date', PAGE, skip);
    if (!page || page.length === 0) break;
    allRows = allRows.concat(page);
    if (page.length < PAGE) break;
    skip += PAGE;
    await sleep(300);
  }
  result.read = allRows.length;

  if (dryRun || allRows.length === 0) return result;

  // ── 2. Normalizar e escrever em lotes no Supabase ──
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize).map((r) => normalizeRow(r, entityName));

    let res;
    if (upsert) {
      res = await supabase.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
    } else {
      res = await supabase.from(tableName).insert(batch);
    }

    if (res.error) {
      result.errors.push(`lote ${i / batchSize + 1}: ${res.error.message}`);
    } else {
      result.written += batch.length;
    }

    await sleep(150);
  }

  return result;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: apenas admins podem executar migrações.' }, { status: 403 });
  }

  // ── Supabase client (service role) ──
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({
      error: 'Secrets SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios. Configure em Dashboard → Code → Environment Variables.'
    }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = await req.json().catch(() => ({}));
  const entitiesToMigrate = Array.isArray(body.entities) && body.entities.length > 0
    ? body.entities.filter((e) => ENTITY_TABLE_MAP[e])
    : ALL_ENTITIES;
  const batchSize = Number(body.batch_size) || 50;
  const dryRun = Boolean(body.dry_run);
  const upsert = body.upsert !== false; // default true
  const skipExisting = Boolean(body.skip_existing);

  const base44SR = base44.asServiceRole;
  const results = [];
  const startedAt = Date.now();

  for (const entityName of entitiesToMigrate) {
    const tableName = ENTITY_TABLE_MAP[entityName];

    // Se skip_existing, verifica se já há dados
    if (skipExisting && !dryRun) {
      const { count } = await supabase.from(tableName).select('id', { count: 'exact', head: true });
      if (count > 0) {
        results.push({ entity: entityName, table: tableName, read: 0, written: 0, skipped: count, errors: [], note: 'já tem dados — pulado' });
        continue;
      }
    }

    const res = await migrateEntity(base44SR, supabase, entityName, tableName, { batchSize, dryRun, upsert });
    results.push(res);

    // Throttle entre entidades para não sobrecarregar
    await sleep(500);
  }

  const totalRead = results.reduce((s, r) => s + r.read, 0);
  const totalWritten = results.reduce((s, r) => s + r.written, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return Response.json({
    dry_run: dryRun,
    upsert,
    entities_requested: entitiesToMigrate.length,
    total_read: totalRead,
    total_written: totalWritten,
    total_errors: totalErrors,
    elapsed_ms: Date.now() - startedAt,
    results
  });
});