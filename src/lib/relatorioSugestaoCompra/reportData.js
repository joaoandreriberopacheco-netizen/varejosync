import { normalizePdfText } from '@/lib/jspdfNotoFont';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import { buildProjecaoEstoque30d } from '@/lib/calcularSugestaoCompraVelocidade';
import { formatCatalogSalesQuantity } from '@/lib/catalogSalesVelocity';
import {
  formatSugestaoEstoqueLinha,
  formatSugestaoQuantidadeVitrine,
  produtoSnapshotVitrineCompra,
  resolveSugestaoEstoqueEfetivoBase,
  resolveSugestaoQuantidadeVitrine,
} from '@/lib/sugestaoCompraVitrineDisplay';

const safe = (text) => normalizePdfText(text);

export const CURVA_ORDER = ['A', 'B', 'C', 'D', 'E'];

export const CURVA_LABELS = {
  A: 'Curva A — alta relevância',
  B: 'Curva B',
  C: 'Curva C',
  D: 'Curva D',
  E: 'Curva E / sem venda',
};

export const REPORT_NIVEL_OPTIONS = [
  { value: '0', label: 'Sem agrupamento' },
  { value: '1', label: 'Nível 1 — grupo' },
  { value: '2', label: 'Nível 2 — tipo' },
  { value: '3', label: 'Nível 3' },
  { value: '4', label: 'Nível 4' },
  { value: '5', label: 'Nível 5 — modelo' },
];

function resolveFornecedorNome(linha, ctx = {}) {
  const id = typeof ctx.resolveFornecedorId === 'function' ? ctx.resolveFornecedorId(linha) : '';
  if (!id) return '—';
  const fromMap = ctx.fornecedorNomeById?.[id];
  if (fromMap) return fromMap;
  const fromList = (ctx.fornecedores || []).find((f) => f.id === id);
  return fromList?.nome || id;
}

function resolveQuantidadeBase(linha, ctx = {}) {
  if (typeof ctx.quantidadeBaseLinha === 'function') {
    return Number(ctx.quantidadeBaseLinha(linha)) || 0;
  }
  return Number(linha?.sugestao?.quantidade_sugerida_base) || 0;
}

export function getHierarquiaGroupLabel(produto = {}, nivel = 0) {
  const n = Number(nivel);
  if (!n || n < 1 || n > 5) return '';
  const parts = [
    produto?.campo_hierarquico_1,
    produto?.campo_hierarquico_2,
    produto?.campo_hierarquico_3,
    produto?.campo_hierarquico_4,
    produto?.campo_hierarquico_5,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!parts.length) return '(sem hierarquia)';
  const depth = Math.min(n, parts.length);
  return parts.slice(0, depth).join(' > ');
}

export function formatReportGroupLabel(label = '') {
  return safe(String(label || '(sem hierarquia)').replace(/\s*›\s*/g, ' > '));
}

function formatMediaGrupo(produto, mediaDiaTotal) {
  const snap = produtoSnapshotVitrineCompra(produto);
  const media30Base = Math.max(0, Number(mediaDiaTotal) || 0) * 30;
  const disp = resolveSugestaoQuantidadeVitrine(produto, media30Base);
  return formatCatalogSalesQuantity(disp.quantidade, disp.unidade, { tilde: true }) || '—';
}

function formatProjecaoGrupo(produto, estoqueBaseTotal, mediaDiaTotal) {
  const snap = produtoSnapshotVitrineCompra(produto);
  const proj = buildProjecaoEstoque30d(snap, estoqueBaseTotal, mediaDiaTotal);
  return safe(proj?.projecao_estoque_30d_texto || '—');
}

export function aggregateReportRowMetrics(rows = [], ctx = {}) {
  if (!rows.length) return null;
  const representativo = rows[0]?._produto || {};
  const mediaDiaTotal = rows.reduce((sum, row) => sum + (Number(row.media_dia) || 0), 0);
  const estoqueBaseTotal = rows.reduce((sum, row) => sum + (Number(row.estoque_base) || 0), 0);
  const qtdBase = rows.reduce((sum, row) => sum + (Number(row.qtd_sugerida_base) || 0), 0);

  return {
    itens: rows.length,
    media_30d: safe(formatMediaGrupo(representativo, mediaDiaTotal)),
    projecao: formatProjecaoGrupo(representativo, estoqueBaseTotal, mediaDiaTotal),
    qtd_sugerida: safe(formatSugestaoQuantidadeVitrine(representativo, qtdBase) || '—'),
    estoque_total: safe(formatSugestaoQuantidadeVitrine(representativo, estoqueBaseTotal) || '—'),
    qtd_sugerida_base: qtdBase,
    media_dia: mediaDiaTotal,
    estoque_base: estoqueBaseTotal,
    _produto: representativo,
  };
}

export function buildAggregatedGroupReportRow(label, groupRows = [], ctx = {}) {
  const metrics = aggregateReportRowMetrics(groupRows, ctx);
  if (!metrics) return null;

  const representativo = metrics._produto || {};
  const qtdDisp = resolveSugestaoQuantidadeVitrine(representativo, metrics.qtd_sugerida_base);

  return {
    produto: formatReportGroupLabel(label),
    tipo: '',
    estoque_total: metrics.estoque_total,
    estoque_pedidos: '',
    estoque: metrics.estoque_total,
    media_30d: metrics.media_30d,
    media_dia: metrics.media_dia,
    estoque_base: metrics.estoque_base,
    projecao: metrics.projecao,
    qtd_sugerida: metrics.qtd_sugerida,
    qtd_sugerida_base: metrics.qtd_sugerida_base,
    unidade: safe(qtdDisp?.unidade || '—'),
    fornecedor: '—',
    abcd: String(groupRows[0]?.abcd || 'E').toUpperCase(),
    grupo_hierarquia: safe(label),
    _produto: representativo,
    _isGroupAggregate: true,
  };
}

export function mapSugestaoCompraLinhaToReportRow(linha, ctx = {}) {
  const produto = linha?.produto || linha?.skus?.[0] || {};
  const sugestao = linha?.sugestao || {};
  const incluirPedidos = ctx.incluirPedidosAprovados === true;

  const estoqueFmt = formatSugestaoEstoqueLinha(produto, sugestao, {
    incluirPedidosAprovados: incluirPedidos,
    quantidadePendente: linha?.quantidade_pendente,
  });

  const qtdBase = resolveQuantidadeBase(linha, ctx);
  const qtdDisp = resolveSugestaoQuantidadeVitrine(produto, qtdBase);
  const qtdFmt = formatSugestaoQuantidadeVitrine(produto, qtdBase);
  const { estoqueBase: estoqueBaseNum } = resolveSugestaoEstoqueEfetivoBase(produto, sugestao, {
    incluirPedidosAprovados: incluirPedidos,
    quantidadePendente: linha?.quantidade_pendente,
  });

  let estoquePedidos = '';
  if (estoqueFmt.secondary) {
    estoquePedidos = safe(estoqueFmt.secondary);
  }

  const mediaDia = Number(sugestao.media_dia) || 0;

  return {
    produto: safe(linha?.label || produto?.nome || '—'),
    tipo: linha?.tipo === 'grupo' ? 'Família' : 'SKU',
    estoque_total: safe(estoqueFmt.primary || '—'),
    estoque_pedidos: estoquePedidos,
    estoque: safe(
      estoqueFmt.secondary
        ? `${estoqueFmt.primary}\n${estoqueFmt.secondary}`
        : estoqueFmt.primary || '—',
    ),
    media_30d: safe(sugestao.media_30d_texto || '—'),
    media_dia: mediaDia,
    estoque_base: estoqueBaseNum,
    projecao: safe(sugestao.projecao_estoque_30d_texto || '—'),
    qtd_sugerida: safe(qtdFmt || '—'),
    qtd_sugerida_base: qtdBase,
    unidade: safe(qtdDisp?.unidade || '—'),
    fornecedor: safe(resolveFornecedorNome(linha, ctx)),
    abcd: String(getLinhaAbcdLetter(linha) || 'E').toUpperCase(),
    grupo_hierarquia: safe(getHierarquiaGroupLabel(produto, ctx.agruparNivel)),
    _produto: produto,
  };
}

export function prepareSugestaoCompraReportGroups(linhas = [], ctx = {}) {
  const groups = new Map(CURVA_ORDER.map((letter) => [letter, []]));

  for (const linha of linhas || []) {
    const row = mapSugestaoCompraLinhaToReportRow(linha, ctx);
    const letter = CURVA_ORDER.includes(row.abcd) ? row.abcd : 'E';
    groups.get(letter).push(row);
  }

  for (const letter of CURVA_ORDER) {
    groups.get(letter).sort((a, b) => a.produto.localeCompare(b.produto, 'pt-BR'));
  }

  return groups;
}

export function summarizeSugestaoCompraReportGroups(groups) {
  let totalRows = 0;
  let totalQtdBase = 0;
  const byCurve = [];

  for (const letter of CURVA_ORDER) {
    const rows = groups.get(letter) || [];
    if (!rows.length) continue;
    const qtdBase = rows.reduce((sum, row) => sum + (Number(row.qtd_sugerida_base) || 0), 0);
    totalRows += rows.length;
    totalQtdBase += qtdBase;
    byCurve.push({ letter, rows, qtdBase });
  }

  return { totalRows, totalQtdBase, byCurve };
}

function groupRowsByHierarquia(rows = [], ctx = {}) {
  const byGrupo = new Map();
  for (const row of rows) {
    const key = row.grupo_hierarquia || '(sem hierarquia)';
    if (!byGrupo.has(key)) byGrupo.set(key, []);
    byGrupo.get(key).push(row);
  }

  return [...byGrupo.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, groupRows]) => {
      const metrics = aggregateReportRowMetrics(groupRows, ctx);
      const aggregatedRow = buildAggregatedGroupReportRow(label, groupRows, ctx);
      return {
        label,
        metrics,
        skuCount: groupRows.length,
        rows: aggregatedRow ? [aggregatedRow] : [],
      };
    });
}

export function prepareSugestaoCompraReportSections(linhas = [], ctx = {}, options = {}) {
  const agruparNivel = Number(options.agruparNivel) || 0;
  const reportCtx = { ...ctx, agruparNivel };
  const groups = prepareSugestaoCompraReportGroups(linhas, reportCtx);
  const summary = summarizeSugestaoCompraReportGroups(groups);

  const sections = summary.byCurve.map(({ letter, rows, qtdBase }) => {
    if (!agruparNivel) {
      return {
        letter,
        qtdBase,
        skuCount: rows.length,
        blocks: [{ label: null, metrics: null, skuCount: rows.length, rows }],
      };
    }

    return {
      letter,
      qtdBase,
      skuCount: rows.length,
      blocks: groupRowsByHierarquia(rows, reportCtx),
    };
  });

  return { ...summary, sections, agruparNivel };
}
