import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  CURVA_LABELS,
  prepareSugestaoCompraReportGroups,
  summarizeSugestaoCompraReportGroups,
} from '@/lib/relatorioSugestaoCompra/reportData';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_PDF_BUILD = 'sugestao_compra_abcd_pdf_v2';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';
const M = 10;
const FOOTER_H = 10;
const TOP_Y = 14;

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

function buildColumnLayout(pageW) {
  const cw = pageW - M * 2;
  return {
    produto: M,
    tipo: M + 78,
    estoque: M + 92,
    media: M + 118,
    proj: M + 142,
    qtd: M + 166,
    forn: M + 188,
    tableRight: M + cw,
  };
}

function measureRowHeight(doc, row, fontFamily, col) {
  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  const nameLines = doc.splitTextToSize(row.produto, col.tipo - col.produto - 2);
  const fornLines = doc.splitTextToSize(row.fornecedor, col.tableRight - col.forn - 2);
  const lines = Math.max(nameLines.length, fornLines.length, 1);
  return 3.2 + lines * 3.6;
}

function drawTableHeader(doc, fontFamily, y, col) {
  doc.setFont(fontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.colHdr);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('PRODUTO', col.produto, y);
  doc.text('TIPO', col.tipo, y);
  doc.text('ESTOQUE', col.estoque, y, { align: 'right' });
  doc.text('MÉD. 30D', col.media, y, { align: 'right' });
  doc.text('P.FUT.', col.proj, y, { align: 'right' });
  doc.text('QTD SUG.', col.qtd, y, { align: 'right' });
  doc.text('FORNECEDOR', col.forn, y);
  const lineY = y + 1.8;
  doc.setDrawColor(...ENXUTO.line);
  doc.setLineWidth(0.12);
  doc.line(M, lineY, col.tableRight, lineY);
  return lineY + 4.2;
}

function drawDataRow(doc, fontFamily, row, y, col) {
  const rowH = measureRowHeight(doc, row, fontFamily, col);
  const baseline = y + 3.2;

  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  doc.setTextColor(...ENXUTO.black);

  const nameLines = doc.splitTextToSize(row.produto, col.tipo - col.produto - 2);
  nameLines.forEach((line, idx) => {
    doc.text(line, col.produto, baseline + idx * 3.6);
  });

  doc.text(row.tipo, col.tipo, baseline);
  doc.text(row.estoque, col.estoque, baseline, { align: 'right' });
  doc.text(row.media_30d, col.media, baseline, { align: 'right' });
  doc.text(row.projecao, col.proj, baseline, { align: 'right' });
  doc.text(row.qtd_sugerida, col.qtd, baseline, { align: 'right' });

  const fornLines = doc.splitTextToSize(row.fornecedor, col.tableRight - col.forn - 2);
  fornLines.forEach((line, idx) => {
    doc.text(line, col.forn, baseline + idx * 3.6);
  });

  const bottom = y + rowH;
  doc.setDrawColor(...ENXUTO.rowRule);
  doc.setLineWidth(0.06);
  doc.line(M, bottom, col.tableRight, bottom);
  return bottom + 0.8;
}

function drawSectionTitle(doc, fontFamily, letter, rowCount, y, col) {
  doc.setFillColor(...ENXUTO.section);
  doc.rect(M, y - 3.5, col.tableRight - M, 7, 'F');
  doc.setFont(fontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.section);
  doc.setTextColor(...ENXUTO.black);
  doc.text(
    safe(`${CURVA_LABELS[letter] || `Curva ${letter}`} · ${rowCount} item(ns)`),
    M + 2,
    y + 1.2,
  );
  return y + 8;
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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const col = buildColumnLayout(pageW);

  let y = TOP_Y;
  let activeTableHeader = null;

  const bottomLimit = () => pageH - FOOTER_H;

  const ensureSpace = (needed) => {
    if (y + needed <= bottomLimit()) return;
    doc.addPage();
    y = TOP_Y;
    if (typeof activeTableHeader === 'function') {
      y = activeTableHeader();
    }
  };

  const startTable = () => {
    activeTableHeader = () => drawTableHeader(doc, pdfFontFamily, y, col);
    y = activeTableHeader();
  };

  const stopTable = () => {
    activeTableHeader = null;
  };

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
    const filterLines = doc.splitTextToSize(safe(`Filtros: ${filtersSummary}`), pageW - M * 2);
    doc.text(filterLines, M, y);
    y += filterLines.length * 3.8 + 2;
  }

  ensureSpace(28);
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
    ensureSpace(5);
    doc.text(letter, M, y);
    doc.text(String(rows.length), M + 24, y);
    doc.text(String(Math.round(qtdBase)), M + 48, y);
    y += 4.2;
  }
  ensureSpace(5);
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.text('TOTAL', M, y);
  doc.text(String(totalRows), M + 24, y);
  doc.text(String(Math.round(totalQtdBase)), M + 48, y);
  y += 8;

  for (const { letter, rows } of byCurve) {
    ensureSpace(18);
    y = drawSectionTitle(doc, pdfFontFamily, letter, rows.length, y, col);
    startTable();

    for (const row of rows) {
      const rowH = measureRowHeight(doc, row, pdfFontFamily, col) + 0.8;
      ensureSpace(rowH);
      y = drawDataRow(doc, pdfFontFamily, row, y, col);
    }

    stopTable();
    y += 3;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.footer);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(
      safe(`${SUGESTAO_COMPRA_PDF_BUILD} · Página ${page}/${pageCount}`),
      pageW / 2,
      pageH - 5,
      { align: 'center' },
    );
  }

  return {
    data: doc.output('arraybuffer'),
    version: SUGESTAO_COMPRA_PDF_BUILD,
    rowCount: totalRows,
  };
}
