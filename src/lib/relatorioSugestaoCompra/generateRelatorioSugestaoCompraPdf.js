import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  CURVA_LABELS,
  prepareSugestaoCompraReportGroups,
  summarizeSugestaoCompraReportGroups,
} from '@/lib/relatorioSugestaoCompra/reportData';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_PDF_BUILD = 'sugestao_compra_abcd_pdf_v1';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';
const PAGE_W = 297;
const M = 10;
const CW = PAGE_W - M * 2;

const ENXUTO = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  rowRule: [220, 220, 220],
  section: [240, 240, 240],
};

const FONT = {
  title: 13,
  subtitle: 8.5,
  section: 10,
  colHdr: 7.2,
  row: 7.6,
  footer: 8,
};

const COL = {
  produto: M,
  tipo: M + 78,
  estoque: M + 92,
  media: M + 118,
  proj: M + 142,
  qtd: M + 166,
  forn: M + 188,
};
const TABLE_RIGHT = M + CW;

function measureRowHeight(doc, row, fontFamily) {
  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  const nameLines = doc.splitTextToSize(row.produto, COL.tipo - COL.produto - 2);
  const fornLines = doc.splitTextToSize(row.fornecedor, TABLE_RIGHT - COL.forn - 2);
  const lines = Math.max(nameLines.length, fornLines.length, 1);
  return 3.2 + lines * 3.6;
}

function estimateDocumentHeight(doc, fontFamily, { byCurve, filtersSummary, generatedAt, totalRows }) {
  let height = 16;
  height += 6;
  height += 5;
  if (filtersSummary) height += 6;
  height += 8;
  height += 6 + byCurve.length * 5.5 + 8;
  height += 10;

  for (const { rows } of byCurve) {
    height += 8;
    height += 6;
    for (const row of rows) {
      height += measureRowHeight(doc, row, fontFamily) + 0.8;
    }
    height += 4;
  }

  height += 12;
  return Math.max(120, Math.ceil(height + 8));
}

function drawTableHeader(doc, fontFamily, y) {
  doc.setFont(fontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.colHdr);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('PRODUTO', COL.produto, y);
  doc.text('TIPO', COL.tipo, y);
  doc.text('ESTOQUE', COL.estoque, y, { align: 'right' });
  doc.text('MÉD. 30D', COL.media, y, { align: 'right' });
  doc.text('P.FUT.', COL.proj, y, { align: 'right' });
  doc.text('QTD SUG.', COL.qtd, y, { align: 'right' });
  doc.text('FORNECEDOR', COL.forn, y);
  const lineY = y + 1.8;
  doc.setDrawColor(...ENXUTO.line);
  doc.setLineWidth(0.12);
  doc.line(M, lineY, TABLE_RIGHT, lineY);
  return lineY + 4.2;
}

function drawDataRow(doc, fontFamily, row, y) {
  const rowH = measureRowHeight(doc, row, fontFamily);
  const baseline = y + 3.2;

  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  doc.setTextColor(...ENXUTO.black);

  const nameLines = doc.splitTextToSize(row.produto, COL.tipo - COL.produto - 2);
  nameLines.forEach((line, idx) => {
    doc.text(line, COL.produto, baseline + idx * 3.6);
  });

  doc.text(row.tipo, COL.tipo, baseline);
  doc.text(row.estoque, COL.estoque, baseline, { align: 'right' });
  doc.text(row.media_30d, COL.media, baseline, { align: 'right' });
  doc.text(row.projecao, COL.proj, baseline, { align: 'right' });
  doc.text(row.qtd_sugerida, COL.qtd, baseline, { align: 'right' });

  const fornLines = doc.splitTextToSize(row.fornecedor, TABLE_RIGHT - COL.forn - 2);
  fornLines.forEach((line, idx) => {
    doc.text(line, COL.forn, baseline + idx * 3.6);
  });

  const bottom = y + rowH;
  doc.setDrawColor(...ENXUTO.rowRule);
  doc.setLineWidth(0.06);
  doc.line(M, bottom, TABLE_RIGHT, bottom);
  return bottom + 0.8;
}

export async function generateRelatorioSugestaoCompraPdf(payload = {}) {
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

  const probe = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fontFamily = await registerJsPdfDin1451Fonts(probe);
  const pageH = estimateDocumentHeight(probe, fontFamily, {
    byCurve,
    filtersSummary,
    generatedAt,
    totalRows,
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAGE_W, pageH],
  });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  let y = 14;

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Sugestão de compra por curva ABCD', M, y);
  y += 6;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(safe(`Gerado em ${generatedAt} · ${totalRows} item(ns) visíveis na tela`), M, y);
  y += 5;

  if (filtersSummary) {
    const filterLines = doc.splitTextToSize(safe(`Filtros: ${filtersSummary}`), CW);
    doc.text(filterLines, M, y);
    y += filterLines.length * 3.8 + 2;
  }

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.section);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Resumo por curva', M, y);
  y += 5.5;

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.colHdr);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('CURVA', M, y);
  doc.text('ITENS', M + 24, y);
  doc.text('QTD SUG. (BASE)', M + 48, y);
  y += 4;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  doc.setTextColor(...ENXUTO.black);
  for (const { letter, rows, qtdBase } of byCurve) {
    doc.text(letter, M, y);
    doc.text(String(rows.length), M + 24, y);
    doc.text(String(Math.round(qtdBase)), M + 48, y);
    y += 4.2;
  }
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.text('TOTAL', M, y);
  doc.text(String(totalRows), M + 24, y);
  doc.text(String(Math.round(totalQtdBase)), M + 48, y);
  y += 8;

  for (const { letter, rows } of byCurve) {
    doc.setFillColor(...ENXUTO.section);
    doc.rect(M, y - 3.5, CW, 7, 'F');
    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.section);
    doc.setTextColor(...ENXUTO.black);
    doc.text(
      safe(`${CURVA_LABELS[letter] || `Curva ${letter}`} · ${rows.length} item(ns)`),
      M + 2,
      y + 1.2,
    );
    y += 8;

    y = drawTableHeader(doc, pdfFontFamily, y);
    for (const row of rows) {
      y = drawDataRow(doc, pdfFontFamily, row, y);
    }
    y += 4;
  }

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.footer);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(safe(`${SUGESTAO_COMPRA_PDF_BUILD} · página contínua (sem quebras)`), PAGE_W / 2, pageH - 5, {
    align: 'center',
  });

  return {
    data: doc.output('arraybuffer'),
    version: SUGESTAO_COMPRA_PDF_BUILD,
    rowCount: totalRows,
  };
}
