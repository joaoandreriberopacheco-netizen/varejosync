import ExcelJS from 'exceljs';
import { normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  CURVA_LABELS,
  prepareSugestaoCompraReportGroups,
  summarizeSugestaoCompraReportGroups,
} from '@/lib/relatorioSugestaoCompra/reportData';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_XLSX_BUILD = 'sugestao_compra_abcd_xlsx_v1';

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
  const { totalRows, totalQtdBase, byCurve } = summarizeSugestaoCompraReportGroups(groups);

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

  for (const { letter, rows, qtdBase } of byCurve) {
    resumo.addRow({ curva: letter, itens: rows.length, qtd_base: qtdBase });
  }
  resumo.addRow({ curva: 'TOTAL', itens: totalRows, qtd_base: totalQtdBase });

  for (const { letter, rows } of byCurve) {
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

export {
  mapSugestaoCompraLinhaToReportRow,
  prepareSugestaoCompraReportGroups,
} from '@/lib/relatorioSugestaoCompra/reportData';
