import ExcelJS from 'exceljs';
import { normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  CURVA_LABELS,
  prepareSugestaoCompraReportSections,
} from '@/lib/relatorioSugestaoCompra/reportData';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_XLSX_BUILD = 'sugestao_compra_abcd_xlsx_v2';

const DATA_COLUMNS = [
  { header: 'PRODUTO', key: 'produto', width: 40 },
  { header: 'TIPO', key: 'tipo', width: 10 },
  { header: 'ESTOQUE', key: 'estoque_total', width: 12 },
  { header: 'FÍS.+PED.', key: 'estoque_pedidos', width: 18 },
  { header: 'MÉDIA 30D', key: 'media_30d', width: 12 },
  { header: 'P.FUT.', key: 'projecao', width: 12 },
  { header: 'QTD SUG.', key: 'qtd_sugerida', width: 12 },
  { header: 'UN', key: 'unidade', width: 8 },
  { header: 'FORNECEDOR', key: 'fornecedor', width: 26 },
];

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

function styleGroupRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  });
}

function addDataSheet(ws, { title, subtitle, sections }) {
  ws.columns = DATA_COLUMNS;
  ws.addRow([safe(title)]);
  ws.addRow([safe(subtitle)]);

  const headerRow = ws.addRow(DATA_COLUMNS.map((col) => col.header));
  styleHeaderRow(headerRow);

  for (const block of sections) {
    if (block.label && block.metrics) {
      const groupRow = ws.addRow({
        produto: safe(`${block.label} · méd. ${block.metrics.media_30d} · P.fut. ${block.metrics.projecao} · qtd ${block.metrics.qtd_sugerida}`),
      });
      styleGroupRow(groupRow);
    }

    for (const row of block.rows) {
      ws.addRow({
        produto: row.produto,
        tipo: row.tipo,
        estoque_total: row.estoque_total,
        estoque_pedidos: row.estoque_pedidos,
        media_30d: row.media_30d,
        projecao: row.projecao,
        qtd_sugerida: row.qtd_sugerida,
        unidade: row.unidade,
        fornecedor: row.fornecedor,
      });
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 3 }];
}

export async function generateRelatorioSugestaoCompraXlsx(payload = {}) {
  const {
    linhas = [],
    ctx = {},
    filters_summary: filtersSummary = '',
    agrupar_nivel: agruparNivel = 0,
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  } = payload;

  const { totalRows, totalQtdBase, sections, agruparNivel: nivel } =
    prepareSugestaoCompraReportSections(linhas, ctx, { agruparNivel });

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
      `${totalRows} item(ns)${nivel ? ` · agrupado nível ${nivel}` : ''}${filtersSummary ? ` · Filtros: ${filtersSummary}` : ''}`,
    ),
  ]);
  const resumoHeader = resumo.addRow(['CURVA', 'ITENS', 'QTD SUG. (BASE)']);
  styleHeaderRow(resumoHeader);

  for (const section of sections) {
    const count = section.blocks.reduce((n, b) => n + b.rows.length, 0);
    resumo.addRow({ curva: section.letter, itens: count, qtd_base: section.qtdBase });
  }
  resumo.addRow({ curva: 'TOTAL', itens: totalRows, qtd_base: totalQtdBase });

  for (const section of sections) {
    const count = section.blocks.reduce((n, b) => n + b.rows.length, 0);
    const ws = wb.addWorksheet(`Curva_${section.letter}`, { views: [{ state: 'frozen', ySplit: 3 }] });
    addDataSheet(ws, {
      title: `${CURVA_LABELS[section.letter] || `Curva ${section.letter}`} · ${count} item(ns)`,
      subtitle: safe(
        `Estoque separado de físico+pedidos${filtersSummary ? ` · ${filtersSummary}` : ''}`,
      ),
      sections: section.blocks,
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
  prepareSugestaoCompraReportSections,
} from '@/lib/relatorioSugestaoCompra/reportData';
