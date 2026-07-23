import { normalizePdfText } from '@/lib/jspdfNotoFont';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import {
  formatSugestaoEstoqueLinha,
  formatSugestaoQuantidadeVitrine,
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

  const estoqueTexto = estoqueFmt.secondary
    ? `${estoqueFmt.primary} (${estoqueFmt.secondary})`
    : estoqueFmt.primary;

  return {
    produto: safe(linha?.label || produto?.nome || '—'),
    tipo: linha?.tipo === 'grupo' ? 'Família' : 'SKU',
    estoque: safe(estoqueTexto || '—'),
    media_30d: safe(sugestao.media_30d_texto || '—'),
    projecao: safe(sugestao.projecao_estoque_30d_texto || '—'),
    qtd_sugerida: safe(qtdFmt || '—'),
    qtd_sugerida_base: qtdBase,
    unidade: safe(qtdDisp?.unidade || '—'),
    fornecedor: safe(resolveFornecedorNome(linha, ctx)),
    abcd: String(getLinhaAbcdLetter(linha) || 'E').toUpperCase(),
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
