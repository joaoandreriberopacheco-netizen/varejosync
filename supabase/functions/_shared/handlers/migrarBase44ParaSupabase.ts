// Port automático de base44/functions/migrarBase44ParaSupabase/entry.ts
import type { createP38Client } from '../p38Client.ts';

/**
 * migrarBase44ParaSupabase
 * ─────────────────────────────────────────────────────────────────
 * Lê dados do Base44 e insere no Supabase. Estratégia JSONB-first uniforme:
 * cada tabela tem (id, dados jsonb, created_by, created_at, updated_at).
 * Todos os campos do Base44 vão em `dados`, preservando o shape completo.
 * As migrations 001..016 podem ser corridas depois para promover colunas.
 *
 * Parâmetros (body JSON):
 *   entities   string[]  — entidades a migrar (omitir = todas)
 *   batch_size number    — registos por lote (default: 100)
 *   dry_run    boolean   — só conta, não escreve (default: false)
 *   upsert     boolean   — upsert por id (default: true)
 *   skip_existing boolean — pula entidades que já têm dados (default: false)
 *
 * Requer secrets: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

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
  ConfigAutoAtendimento: 'config_auto_atendimento',
  ConfiguracoesEstoque: 'configuracoes_estoque',
  ConfiguracoesVenda: 'configuracoes_venda',
  ConsumoInterno: 'consumo_interno',
  Cotacao: 'cotacao',
  DadosEmpresa: 'dados_empresa',
  DestinacaoConsumoInterno: 'destinacao_consumo_interno',
  DevolucaoTroca: 'devolucao_troca',
  DivergenciaCompra: 'divergencia_compra',
  EventoEditorLayout: 'evento_editor_layout',
  EventoLogisticoSandbox: 'evento_logistico_sandbox',
  EventosLogisticos: 'eventos_logisticos',
  FolhaPrevisaoModelo: 'folha_previsao_modelo',
  FolhaPrevisaoCompetencia: 'folha_previsao_competencia',
  AgefinSerieModelo: 'agefin_serie_modelo',
  AgefinSerieCompetencia: 'agefin_serie_competencia',
  BudgetModelo: 'budget_modelo',
  BudgetCompetencia: 'budget_competencia',
  FolhaCentroCusto: 'folha_centro_custo',
  AgendaItem: 'agenda_item',
  ImportacaoLog: 'importacao_log',
  Interveniente: 'interveniente',
  LayoutTemplate: 'layout_template',
  LoteEstoque: 'lote_estoque',
  ManifestoEntrada: 'manifesto_entrada',
  Maquininha: 'maquininha',
  OrdemSeparacao: 'ordem_separacao',
  PerfilDeAcesso: 'perfil_de_acesso',
  PoliticasDesconto: 'politicas_desconto',
  ProtocoloEntrega: 'protocolo_entrega',
  RascunhoPedidoVenda: 'rascunho_pedido_venda',
  ResponsavelConsumoInterno: 'responsavel_consumo_interno',
  StatusPedidoCompra: 'status_pedido_compra',
  Supermanifesto: 'supermanifesto',
  Tarefa: 'tarefa',
  TransicaoPedidoCompra: 'transicao_pedido_compra',
  Transportadora: 'transportadora',
  User: 'usuario',
  Usuario: 'usuario',
  ValeCompra: 'vale_compra',
  VendaPerdida: 'venda_perdida',
  Campanha: 'campanha',
  AvisosAuto: 'avisos_auto',
};

const ALL_ENTITIES = Object.keys(ENTITY_TABLE_MAP);
const TOP_LEVEL = new Set(['id', 'created_at', 'updated_at', 'created_by', 'dados']);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Empacota um row do Base44 no shape JSONB-first: id/datas top-level, resto em dados. */
function packRow(row, entityName) {
  const dados = {};
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (k === 'created_date') { out.created_at = out.created_at || v; continue; }
    if (k === 'updated_date') { out.updated_at = out.updated_at || v; continue; }
    if (TOP_LEVEL.has(k)) { out[k] = v; continue; }
    // renomes para alinhar com colunas dedicadas (quando promovidas depois)
    if (entityName === 'TargetFlare' && (k === 'line' || k === 'column')) {
      dados[k === 'line' ? 'flare_line' : 'flare_column'] = v;
      continue;
    }
    if (entityName === 'PedidoVenda' && k === 'valor_total') {
      dados.total = v;
      continue;
    }
    dados[k] = v;
  }
  if (!out.id && row?.id) out.id = row.id;
  if (Object.keys(dados).length > 0) out.dados = dados;
  return out;
}

async function migrateEntity(base44SR, supabase, entityName, tableName, opts) {
  const { batchSize, dryRun, upsert } = opts;
  const result = { entity: entityName, table: tableName, read: 0, written: 0, skipped: 0, errors: [] };

  let allRows = [];
  let skip = 0;
  const PAGE = 200;
  while (true) {
    let page;
    try {
      page = await base44SR.entities[entityName].list('-created_date', PAGE, skip);
    } catch (e) {
      result.errors.push(`leitura: ${e.message || e}`);
      break;
    }
    if (!page || page.length === 0) break;
    allRows = allRows.concat(page);
    if (page.length < PAGE) break;
    skip += PAGE;
    await sleep(250);
  }
  result.read = allRows.length;

  if (dryRun || allRows.length === 0) return result;

  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize).map((r) => packRow(r, entityName));
    let res;
    try {
      res = upsert
        ? await supabase.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
        : await supabase.from(tableName).insert(batch);
    } catch (e) {
      result.errors.push(`lote ${Math.floor(i / batchSize) + 1}: ${e.message || e}`);
      continue;
    }
    if (res.error) result.errors.push(`lote ${Math.floor(i / batchSize) + 1}: ${res.error.message}`);
    else result.written += batch.length;
    await sleep(120);
  }
  return result;
}

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  // base44 injetado por servePorted
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: apenas admins podem executar migrações.' }, { status: 403 });
  }

  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ error: 'Secrets SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios.' }, { status: 400 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = await req.json().catch(() => ({}));
  const entitiesToMigrate = Array.isArray(body.entities) && body.entities.length > 0
    ? body.entities.filter((e) => ENTITY_TABLE_MAP[e])
    : ALL_ENTITIES;
  const batchSize = Number(body.batch_size) || 100;
  const dryRun = Boolean(body.dry_run);
  const upsert = body.upsert !== false;
  const skipExisting = Boolean(body.skip_existing);

  const base44SR = base44.asServiceRole;
  const results = [];
  const startedAt = Date.now();

  for (const entityName of entitiesToMigrate) {
    const tableName = ENTITY_TABLE_MAP[entityName];
    if (skipExisting && !dryRun) {
      const { count } = await supabase.from(tableName).select('id', { count: 'exact', head: true });
      if (count > 0) {
        results.push({ entity: entityName, table: tableName, read: 0, written: 0, skipped: count, errors: [], note: 'já tem dados — pulado' });
        continue;
      }
    }
    const res = await migrateEntity(base44SR, supabase, entityName, tableName, { batchSize, dryRun, upsert });
    results.push(res);
    await sleep(300);
  }

  const totalRead = results.reduce((s, r) => s + r.read, 0);
  const totalWritten = results.reduce((s, r) => s + r.written, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return Response.json({
    dry_run: dryRun, upsert,
    entities_requested: entitiesToMigrate.length,
    total_read: totalRead, total_written: totalWritten, total_errors: totalErrors,
    elapsed_ms: Date.now() - startedAt, results
  });
}
