import ExcelJS from 'exceljs';
import { normalizePdfText } from '@/lib/jspdfNotoFont';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import {
  formatSugestaoEstoqueLinha,
  formatSugestaoQuantidadeVitrine,
  resolveSugestaoQuantidadeVitrine,
} from '@/lib/sugestaoCompraVitrineDisplay';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_XLSX_BUILD = 'sugestao_compra_abcd_xlsx_v1';

const CURVA_ORDER = ['A', 'B', 'C', 'D', 'E'];

const DATA_COLUMNS = [
  { header: 'PRODUTO', key: 'produto', width: 42 },
  { header: 'TIPO', key: 'tipo', width: 10 },
  { header: 'ESTOQUE', key: 'estoque', width: 16 },
  { header: 'MÉDIA 30D', key: 'media_30d', width: 14 },
  { header: 'P.FUT.', key: 'projecao', width: 14 },
  { header: 'QTD SUG.', key: 'qtd_sugerida', width: 12 },
  { header: 'UN', key: 'unidade', width: 8 },
  { header: 'FORNECEDOR', key: 'fornecedor', width: 28 },
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

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF374151' } },
      left: { style: 'thin', color: { argb: 'FF374151' } },
      bottom: { style: 'thin', color: { argb: 'FF374151' } },
      right: { style: 'thin', color: { argb: 'FF374151' } },
    };
  });
}

function addDataSheet(ws, { title, subtitle, rows }) {
  ws.columns = DATA_COLUMNS;
  ws.addRow([safe(title)]);
  ws.addRow([safe(subtitle)]);

  const headerRow = ws.addRow(DATA_COLUMNS.map((col) => col.header));
  styleHeaderRow(headerRow);

  for (const row of rows) {
    ws.addRow({
      produto: row.produto,
      tipo: row.tipo,
      estoque: row.estoque,
      media_30d: row.media_30d,
      projecao: row.projecao,
      qtd_sugerida: row.qtd_sugerida,
      unidade: row.unidade,
      fornecedor: row.fornecedor,
    });
  }

  for (let i = 4; i <= ws.rowCount; i += 1) {
    const row = ws.getRow(i);
    row.getCell('produto').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('tipo').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('estoque').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('media_30d').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('projecao').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('qtd_sugerida').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('unidade').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('fornecedor').alignment = { vertical: 'middle', horizontal: 'left' };
  }

  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

const CURVA_LABELS = {
  A: 'Curva A — alta relevância',
  B: 'Curva B',
  C: 'Curva C',
  D: 'Curva D',
  E: 'Curva E / sem venda',
};

export async function generateRelatorioSugestaoCompraXlsx(payload = {}) {
  const {
    linhas = [],
    ctx = {},
    filters_summary: filtersSummary = '',
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  } = payload;

  const groups = prepareSugestaoCompraReportGroups(linhas, ctx);
  const totalRows = [...groups.values()].reduce((sum, rows) => sum + rows.length, 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'VarejoSync';

  const resumo = wb.addWorksheet('Resumo', { views: [{ state: 'frozen', ySplit: 3 }] });
  resumo.columns = [
    { header: 'CURVA', key: 'curva', width: 10 },
    { header: 'ITENS', key: 'itens', width: 10 },
    { header: 'QTD SUG. (BASE)', key: 'qtd_base', width: 18 },
  ];
  resumo.addRow([safe(`Sugestão de compra por curva ABCD · ${generatedAt}`)]);
  resumo.addRow([
    safe(
      `${totalRows} item(ns) visíveis na tela${filtersSummary ? ` · Filtros: ${filtersSummary}` : ''}`,
    ),
  ]);
  const resumoHeader = resumo.addRow(['CURVA', 'ITENS', 'QTD SUG. (BASE)']);
  styleHeaderRow(resumoHeader);

  let totalQtdBase = 0;
  for (const letter of CURVA_ORDER) {
    const rows = groups.get(letter) || [];
    if (!rows.length) continue;
    const qtdBase = rows.reduce((sum, row) => sum + (Number(row.qtd_sugerida_base) || 0), 0);
    totalQtdBase += qtdBase;
    resumo.addRow({ curva: letter, itens: rows.length, qtd_base: qtdBase });
  }
  resumo.addRow({ curva: 'TOTAL', itens: totalRows, qtd_base: totalQtdBase });

  for (const letter of CURVA_ORDER) {
    const rows = groups.get(letter) || [];
    if (!rows.length) continue;
    const ws = wb.addWorksheet(`Curva_${letter}`, { views: [{ state: 'frozen', ySplit: 3 }] });
    addDataSheet(ws, {
      title: `${CURVA_LABELS[letter] || `Curva ${letter}`} · ${rows.length} item(ns)`,
      subtitle: safe(
        `Estoque, média 30d, ponto futuro e quantidade sugerida (vitrine)${filtersSummary ? ` · ${filtersSummary}` : ''}`,
      ),
      rows,
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    data: buffer,
    version: SUGESTAO_COMPRA_XLSX_BUILD,
    rowCount: totalRows,
  };
}
