/**
 * Gera SQL de seed para public.catalogo_interface (árvore módulos → páginas).
 * Executar: node scripts/generate-catalogo-interface-seed.mjs
 * Saída: supabase/seeds/generated_catalogo_interface.sql
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** Raiz já criada no seed.sql piloto — encaixa o catálogo completo por baixo */
const ROOT_ID = 'cat_piloto_raiz';

/** Chaves de pages.config.js (export PAGES) — manter alinhado ao router */
const PAGE_KEYS = [
  'Agefin',
  'AnexoCompartilhado',
  'Armazenagem',
  'AtualizarBoletoRecorrente',
  'AuditoriaEstoque',
  'AuditoriaEstoqueV2',
  'AutoAtendimento',
  'CaixasAtivos',
  'Campanhas',
  'Compras',
  'ConferenciaEditor',
  'ConferenciaEntrada',
  'ConferenciaEstoque',
  'ConferenciaItens',
  'ConferenciaVolumes',
  'Configuracoes',
  'ContasFinanceiras',
  'ControleCaixasAtivos',
  'ControleEntregas',
  'Dashboard',
  'DashboardCaixa',
  'DashboardVendedor',
  'DevolucaoTroca',
  'DiscriminarVolumes',
  'EdicaoMassivaCustos',
  'EditarProdutosEmMassa',
  'EstimativaEmbalagensIA',
  'Estoque',
  'ExclusaoDocumentos',
  'Expedicao',
  'ExtratoConta',
  'Financeiro',
  'FinanceiroAprovacoes',
  'FinanceiroModulo',
  'FluxoCaixa',
  'Home',
  'HubLogistico',
  'ImportacaoProdutos',
  'InterfaceSeparador',
  'Intervenientes',
  'LogsAutenticacao',
  'LancamentoAnexos',
  'Manual',
  'MapaFuncionalidades',
  'Operacoes',
  'OtimizacaoEstoqueIA',
  'PDV',
  'PDVAuditoria',
  'PainelGerente',
  'Produtos',
  'ReimpressaoDocumentos',
  'RelatorioMargem',
  'RelatorioPerformance',
  'Relatorios',
  'TabelasPreco',
  'Terceiros',
  'TurnosFechados',
  'Veiculos',
  'Vendas',
  'VendasGestao',
  'VendasPerdidas',
];

/** Módulo: id estável, stable_code, título, ordem, lista de page keys */
const MODULES = [
  {
    id: 'cvi_mod_geral',
    stable_code: 'CAT-MOD-GERAL',
    titulo: 'Visão geral e painéis',
    ordem: 0,
    pages: ['Home', 'Dashboard', 'DashboardCaixa', 'DashboardVendedor', 'PainelGerente'],
  },
  {
    id: 'cvi_mod_vendas',
    stable_code: 'CAT-MOD-VENDAS',
    titulo: 'Vendas',
    ordem: 1,
    pages: ['PDV', 'Vendas', 'VendasGestao', 'VendasPerdidas', 'DevolucaoTroca', 'AutoAtendimento', 'Campanhas', 'TabelasPreco'],
  },
  {
    id: 'cvi_mod_compras',
    stable_code: 'CAT-MOD-COMPRAS',
    titulo: 'Compras e conferência',
    ordem: 2,
    pages: [
      'Compras',
      'ConferenciaEditor',
      'ConferenciaEntrada',
      'ConferenciaEstoque',
      'ConferenciaItens',
      'ConferenciaVolumes',
      'InterfaceSeparador',
      'DiscriminarVolumes',
    ],
  },
  {
    id: 'cvi_mod_estoque',
    stable_code: 'CAT-MOD-ESTOQUE',
    titulo: 'Estoque e produtos',
    ordem: 3,
    pages: [
      'Estoque',
      'Produtos',
      'ImportacaoProdutos',
      'AuditoriaEstoque',
      'AuditoriaEstoqueV2',
      'OtimizacaoEstoqueIA',
      'EditarProdutosEmMassa',
      'EdicaoMassivaCustos',
      'EstimativaEmbalagensIA',
      'ExclusaoDocumentos',
    ],
  },
  {
    id: 'cvi_mod_financeiro',
    stable_code: 'CAT-MOD-FINANCEIRO',
    titulo: 'Financeiro e caixa',
    ordem: 4,
    pages: [
      'Financeiro',
      'FinanceiroModulo',
      'FinanceiroAprovacoes',
      'FluxoCaixa',
      'ContasFinanceiras',
      'ExtratoConta',
      'LancamentoAnexos',
      'Agefin',
      'AtualizarBoletoRecorrente',
      'TurnosFechados',
      'CaixasAtivos',
      'ControleCaixasAtivos',
      'PDVAuditoria',
    ],
  },
  {
    id: 'cvi_mod_logistica',
    stable_code: 'CAT-MOD-LOGISTICA',
    titulo: 'Logística',
    ordem: 5,
    pages: ['HubLogistico', 'Expedicao', 'Veiculos', 'ControleEntregas', 'Armazenagem', 'ReimpressaoDocumentos'],
  },
  {
    id: 'cvi_mod_config',
    stable_code: 'CAT-MOD-CONFIG',
    titulo: 'Configuração e cadastros',
    ordem: 6,
    pages: [
      'Configuracoes',
      'Terceiros',
      'Intervenientes',
      'Operacoes',
      'Manual',
      'MapaFuncionalidades',
      'LogsAutenticacao',
      'AnexoCompartilhado',
    ],
  },
  {
    id: 'cvi_mod_relatorios',
    stable_code: 'CAT-MOD-RELATORIOS',
    titulo: 'Relatórios',
    ordem: 7,
    pages: ['Relatorios', 'RelatorioMargem', 'RelatorioPerformance'],
  },
];

function tituloPagina(key) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

function escapeSql(s) {
  return String(s).replace(/'/g, "''");
}

function collectAssigned() {
  const set = new Set();
  for (const m of MODULES) for (const p of m.pages) set.add(p);
  return set;
}

function main() {
  const assigned = collectAssigned();
  const unassigned = PAGE_KEYS.filter((k) => !assigned.has(k));

  const lines = [];
  lines.push('-- Gerado por scripts/generate-catalogo-interface-seed.mjs — não editar à mão.');
  lines.push('-- Requer migração 004_catalogo_interface.sql e nó raiz cat_piloto_raiz (seed.sql).');
  lines.push('');
  lines.push('insert into public.catalogo_interface (');
  lines.push('  id, stable_code, parent_id, kind, titulo, descricao, ordem,');
  lines.push('  page_key, lifecycle_status, metadados');
  lines.push(') values');

  const values = [];

  for (const mod of MODULES) {
    values.push(
      `  ('${mod.id}', '${escapeSql(mod.stable_code)}', '${ROOT_ID}', 'modulo', '${escapeSql(mod.titulo)}', 'Módulo do catálogo de interface', ${mod.ordem}, null, 'ativo', '{}'::jsonb)`
    );
    let o = 0;
    for (const pk of mod.pages) {
      const id = `cvi_pg_${pk}`;
      const sc = `CAT-PG-${pk.replace(/[^A-Za-z0-9]/g, '_')}`;
      values.push(
        `  ('${id}', '${escapeSql(sc)}', '${mod.id}', 'pagina', '${escapeSql(tituloPagina(pk))}', 'Rota: ${escapeSql(pk)}', ${o++}, '${escapeSql(pk)}', 'ativo', '{}'::jsonb)`
      );
    }
  }

  if (unassigned.length > 0) {
    const modOutros = {
      id: 'cvi_mod_outros',
      stable_code: 'CAT-MOD-OUTROS',
      titulo: 'Outras telas',
      ordem: 99,
    };
    values.push(
      `  ('${modOutros.id}', '${modOutros.stable_code}', '${ROOT_ID}', 'modulo', '${escapeSql(modOutros.titulo)}', 'Páginas não classificadas noutros módulos', ${modOutros.ordem}, null, 'ativo', '{}'::jsonb)`
    );
    let o = 0;
    for (const pk of unassigned) {
      const id = `cvi_pg_${pk}`;
      const sc = `CAT-PG-${pk.replace(/[^A-Za-z0-9]/g, '_')}`;
      values.push(
        `  ('${id}', '${escapeSql(sc)}', '${modOutros.id}', 'pagina', '${escapeSql(tituloPagina(pk))}', 'Rota: ${escapeSql(pk)}', ${o++}, '${escapeSql(pk)}', 'ativo', '{}'::jsonb)`
      );
    }
  }

  lines.push(values.join(',\n'));
  lines.push('on conflict (id) do nothing;');

  const outDir = join(root, 'supabase', 'seeds');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'generated_catalogo_interface.sql');
  writeFileSync(outFile, lines.join('\n'), 'utf8');

  const jsonOut = join(root, 'docs', 'migration', 'catalogo_interface_bootstrap.json');
  const json = {
    version: 1,
    root_id: ROOT_ID,
    generated_at: new Date().toISOString(),
    modules: MODULES.map((m) => ({ ...m, pages: [...m.pages] })),
    unassigned_if_any: unassigned,
  };
  writeFileSync(jsonOut, JSON.stringify(json, null, 2), 'utf8');

  console.log('Escrito:', outFile);
  console.log('Resumo:', jsonOut);
  console.log('Módulos:', MODULES.length, '| Páginas:', PAGE_KEYS.length, unassigned.length ? `| Outros: ${unassigned.length}` : '');
}

main();
