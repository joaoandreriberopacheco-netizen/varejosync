#!/usr/bin/env node
/**
 * Gera supabase/migrations/009_promote_extended_to_columns.sql a partir de
 * scripts/.cache/inferred-entity-fields.json.
 *
 * Para cada entidade estendida (modo 'jsonb' na migration 007), adiciona
 * uma coluna por campo descoberto (com tipo inferido pelo nome), promove
 * `dados->>'X'` para a coluna e remove a chave de `dados`. Adiciona índices
 * nos campos efetivamente filtrados.
 *
 * Atualiza também src/integrations/p38/entityTableMap.js para mode='columns'
 * com a lista de colunas certa (saída via stdout — copiamos manualmente).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT = path.resolve(ROOT, 'scripts/.cache/inferred-entity-fields.json');
const OUTPUT_SQL = path.resolve(ROOT, 'supabase/migrations/009_promote_extended_to_columns.sql');
const OUTPUT_MAP = path.resolve(ROOT, 'scripts/.cache/entityTableMap.fragment.txt');

// Mapeamento Entidade -> tabela snake_case (espelha o entityTableMap atual; só as
// estendidas que vamos promover entram aqui).
const EXTENDED = {
  AnexoDocumento: 'anexo_documento',
  Area: 'area',
  AutorizacaoEstorno: 'autorizacao_estorno',
  AvisosAuto: 'avisos_auto',
  Campanha: 'campanha',
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
  ValeCompra: 'vale_compra',
  VendaPerdida: 'venda_perdida'
};

const META_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'created_by', 'created_date', 'updated_date']);
const RESERVED_FILTER_OPS = new Set(['$or', '$and', '$gte', '$lte', '$gt', '$lt', '$ne']);

// Campos com tratamento explícito (sobrescreve heurística).
const TYPE_OVERRIDES = {
  // booleanos
  ativo: 'boolean',
  ativa: 'boolean',
  is_default: 'boolean',
  tem_divergencias: 'boolean',
  teve_atraso: 'boolean',
  teve_avarias: 'boolean',
  // arrays/objetos
  tags: 'jsonb',
  numeros_serie: 'jsonb',
  itens: 'jsonb',
  itens_conferidos: 'jsonb',
  itens_devolvidos: 'jsonb',
  itens_embarcados: 'jsonb',
  itens_recebidos: 'jsonb',
  pagamentos: 'jsonb',
  fornecedores: 'jsonb',
  respostas: 'jsonb',
  pedidos_compra_ids: 'jsonb',
  pedidos_vinculados: 'jsonb',
  ocorrencias_conferencia: 'jsonb',
  fotos_urls: 'jsonb',
  fotos_mercadoria: 'jsonb',
  embarques_registrados: 'jsonb',
  volumes: 'jsonb',
  volumes_conferidos: 'jsonb',
  blocks_config: 'jsonb',
  sequencia_blocos: 'jsonb',
  dados_evento: 'jsonb',
  snapshot_dados: 'jsonb',
  caixas_pdv_autorizados_ids: 'jsonb',
  vendas_ids: 'jsonb',
  movimentos_ids: 'jsonb',
  despesas_ids: 'jsonb',
  cancelamentos_rastro: 'jsonb',
  unidades_alternativas: 'jsonb',
  metadados: 'jsonb',
  // datas (calendário)
  data_vencimento: 'date',
  data_pagamento: 'date',
  data_fim: 'date',
  data_inicio: 'date',
  data_validade: 'date',
  data_emissao: 'date',
  data_entrega: 'date',
  data_nascimento: 'date',
  data_agendada: 'date',
  data_referencia: 'date',
  data_registro: 'date',
  data_entrada_no_lote: 'date',
  data_prevista: 'date',
  data_prevista_entrega: 'date',
  data_fim_recorrencia: 'date',
  data_liquidacao_efetiva: 'date',
  data_liquidacao_prevista: 'date',
  periodo_referencia: 'date',
  data_abertura: 'timestamptz',
  data_fechamento: 'timestamptz',
  data_conclusao: 'timestamptz',
  data_chegada: 'timestamptz',
  data_despacho: 'timestamptz',
  data_aprovacao_financeira: 'timestamptz',
  data_rejeicao_financeira: 'timestamptz',
  data_resolucao: 'timestamptz',
  data_hora_conclusao: 'timestamptz',
  data_conferencia: 'timestamptz',
  data_conferencia_volumes: 'timestamptz',
  data_transicao: 'timestamptz',
  data_desfeita: 'timestamptz',
  data_retorno: 'timestamptz',
  reabertura_data: 'timestamptz',
  solicitacao_edicao_data: 'timestamptz',
  eta: 'timestamptz',
  // numéricos
  dia_vencimento: 'integer',
  parcela_atual: 'integer',
  parcela_numero: 'integer',
  parcela_total: 'integer',
  numero_parcelas_total: 'integer',
  casas_decimais: 'integer',
  tempo_reposicao_dias: 'integer',
  parcelas_max: 'integer',
  prazo_recebimento_dias: 'integer',
  contagem_volumes_ok: 'integer',
  quantidade_itens: 'integer',
  // textos/json explícitos
  tipo_autenticacao: 'text',
  resolution_precision: 'text',
  veredito_conformidade: 'text',
  saida_referencia: 'text'
};

function inferType(field) {
  const f = field.toLowerCase();
  if (TYPE_OVERRIDES[f]) return TYPE_OVERRIDES[f];

  // booleans
  if (
    f.startsWith('is_') ||
    f.startsWith('tem_') ||
    f === 'ativo' ||
    f === 'ativa' ||
    f.endsWith('_default') ||
    f === 'preco_livre' ||
    f === 'controla_serial' ||
    f === 'controla_lote' ||
    f === 'controla_validade' ||
    f === 'is_caixa_pdv' ||
    f === 'is_caixa_geral' ||
    f === 'is_recorrente' ||
    f === 'is_custo_mercadoria' ||
    f === 'nfe_emitida' ||
    f === 'valor_desatualizado' ||
    f === 'tem_anexo' ||
    f === 'tem_boleto' ||
    f === 'tem_comprovante'
  ) {
    return 'boolean';
  }

  // datas/timestamps por prefixo
  if (f.startsWith('data_')) return 'date';
  if (f === 'eta') return 'timestamptz';

  // arrays/objetos por sufixo/nome (catch-all razoável)
  if (
    f.endsWith('_ids') ||
    f.endsWith('_url') && false /* url é text, não array */ ||
    f.endsWith('_urls') ||
    f.endsWith('_serie') ||
    f === 'extras'
  ) {
    return 'jsonb';
  }

  // numéricos por prefixo
  if (
    f.startsWith('valor') ||
    f.startsWith('total') ||
    f.startsWith('saldo') ||
    f.startsWith('preco') ||
    f.startsWith('quantidade') ||
    f.startsWith('peso') ||
    f.startsWith('custo') ||
    f.startsWith('taxa') ||
    f.startsWith('desconto') ||
    f === 'subtotal' ||
    f === 'fator_ajuste' ||
    f === 'percentual_desconto_maximo' ||
    f === 'percentual_valor_embarcado' ||
    f === 'volume_cm3' ||
    f === 'unidades_por_pacote' ||
    f === 'estoque_minimo' ||
    f === 'estoque_maximo' ||
    f === 'estoque_ideal' ||
    f === 'estoque_avariado' ||
    f === 'estoque_atual' ||
    f === 'recebimentos_dinheiro' ||
    f === 'recebimentos_pix' ||
    f === 'recebimentos_credito' ||
    f === 'recebimentos_debito' ||
    f === 'recebimentos_vale_troca' ||
    f === 'dinheiro_conferido' ||
    f === 'diferenca' ||
    f === 'confidence' ||
    f === 'ordem'
  ) {
    return 'numeric';
  }

  // catch-all: text
  return 'text';
}

function castSqlForJsonbExtract(type) {
  // converte `dados->>'campo'` (sempre text) no tipo desejado
  switch (type) {
    case 'boolean':
      return '::boolean';
    case 'integer':
      return '::integer';
    case 'numeric':
      return '::numeric';
    case 'date':
      return '::date';
    case 'timestamptz':
      return '::timestamptz';
    case 'jsonb':
      return '::jsonb'; // valor já vem JSON-stringified em dados; usamos `dados->'campo'` no select
    case 'text':
    default:
      return null;
  }
}

const inferred = JSON.parse(await readFile(INPUT, 'utf8'));

const lines = [];
lines.push('-- 009_promote_extended_to_columns.sql');
lines.push('-- Gerado por scripts/generate-migration-009.mjs.');
lines.push('-- Promove `dados->>X` -> coluna dedicada para todas as 40 entidades estendidas.');
lines.push('-- Depois desta migration, entityTableMap.js coloca todas em mode=\'columns\'.');
lines.push('');
lines.push('-- Operações são idempotentes: ADD COLUMN IF NOT EXISTS + UPDATE WHERE coluna IS NULL.');
lines.push('-- Repetir a migration não muda o estado.');
lines.push('');

let totalCols = 0;
const fragmentMap = [];

for (const [entity, table] of Object.entries(EXTENDED)) {
  const info = inferred[entity];
  const fields = info?.fields || [];
  const filterFields = info?.filterFields || [];
  const written = info?.writeFields || [];
  // União de fields que merecem coluna física: fields ∪ filters ∪ writes (já é fields).
  const candidates = [...new Set([...fields, ...filterFields, ...written])]
    .filter((f) => !META_COLUMNS.has(f))
    .filter((f) => !RESERVED_FILTER_OPS.has(f))
    .filter((f) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f));

  if (candidates.length === 0) {
    fragmentMap.push(`  ${entity}: { table: '${table}', mode: 'jsonb' },`);
    lines.push(`-- ${entity} (${table}): nenhum campo descoberto; mantém modo JSONB-first.`);
    lines.push('');
    continue;
  }

  lines.push(`-- === ${entity} → public.${table} (${candidates.length} colunas promovidas) ===`);
  const colDefs = [];
  const updateAssignments = [];
  const dadosKeys = [];

  for (const field of candidates) {
    const type = inferType(field);
    colDefs.push(`alter table public.${table} add column if not exists ${field} ${type};`);
    const cast = castSqlForJsonbExtract(type);
    if (type === 'jsonb') {
      // Para jsonb, usamos `dados->'campo'` que já devolve jsonb.
      updateAssignments.push(`${field} = coalesce(${field}, (dados->'${field}'))`);
    } else if (cast) {
      updateAssignments.push(
        `${field} = coalesce(${field}, nullif(dados->>'${field}', '')${cast})`
      );
    } else {
      updateAssignments.push(`${field} = coalesce(${field}, dados->>'${field}')`);
    }
    dadosKeys.push(field);
  }

  totalCols += candidates.length;
  lines.push(...colDefs);
  lines.push('');
  lines.push(`update public.${table} set`);
  lines.push('  ' + updateAssignments.join(',\n  '));
  lines.push('where dados is not null and dados <> \'{}\'::jsonb;');
  lines.push('');

  const dadosKeysQuoted = dadosKeys.map((k) => `'${k}'`).join(', ');
  lines.push(`update public.${table}`);
  lines.push(`  set dados = dados - array[${dadosKeysQuoted}]`);
  lines.push('where dados is not null and dados <> \'{}\'::jsonb;');
  lines.push('');

  for (const f of filterFields.filter((x) => candidates.includes(x))) {
    lines.push(`create index if not exists idx_${table}_${f} on public.${table} (${f});`);
  }
  lines.push('');

  fragmentMap.push(
    `  ${entity}: { table: '${table}', mode: 'columns', columns: [${candidates.map((c) => `'${c}'`).join(', ')}] },`
  );
}

lines.push(`-- Total promovido: ${totalCols} colunas em ${Object.keys(EXTENDED).length} tabelas.`);
await writeFile(OUTPUT_SQL, lines.join('\n'));
console.log(`OK — migration ${path.relative(ROOT, OUTPUT_SQL)} (${totalCols} colunas)`);

await writeFile(
  OUTPUT_MAP,
  '// Cole estas entradas no entityTableMap.js (substitui as 40 estendidas)\n' +
    fragmentMap.join('\n') +
    '\n'
);
console.log(`Fragmento entityTableMap em ${path.relative(ROOT, OUTPUT_MAP)}`);
