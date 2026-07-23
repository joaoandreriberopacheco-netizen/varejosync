import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  CURVA_LABELS,
  prepareSugestaoCompraReportSections,
} from '@/lib/relatorioSugestaoCompra/reportData';

const safe = (text) => normalizePdfText(text);

export const SUGESTAO_COMPRA_PDF_BUILD = 'sugestao_compra_abcd_pdf_v3';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';
const M = 12;
const FOOTER_H = 12;
const TOP_Y = 16;
const LINE_H = 4.4;

const ENXUTO = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  rowRule: [220, 220, 220],
  section: [240, 240, 240],
  group: [248, 248, 248],
};

const FONT = {
  title: 15,
  subtitle: 10,
  section: 11.5,
  group: 9.8,
  colHdr: 9,
  row: 9.2,
  rowSmall: 8.2,
  footer: 8.5,
};

function buildColumnLayout(pageW) {
  const tableRight = pageW - M;
  return {
    produto: M,
    produtoW: 68,
    estoque: M + 70,
    pedidos: M + 92,
    media: M + 124,
    proj: M + 144,
    qtd: M + 162,
    forn: M + 176,
    tableRight,
  };
}

function splitLines(doc, text, width, fontSize) {
  if (!text) return [];
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(safe(String(text)), width);
}

function measureRowHeight(doc, row, fontFamily, col) {
  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  const blocks = [
    splitLines(doc, row.produto, col.produtoW - 2, FONT.row),
    splitLines(doc, row.estoque_pedidos, 28, FONT.rowSmall),
    splitLines(doc, row.fornecedor, col.tableRight - col.forn - 2, FONT.row),
  ];
  const lines = Math.max(...blocks.map((b) => b.length), 1);
  return 3.6 + lines * LINE_H;
}

function drawTableHeader(doc, fontFamily, y, col) {
  doc.setFont(fontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.colHdr);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('PRODUTO', col.produto, y);
  doc.text('EST.', col.estoque, y, { align: 'right' });
  doc.text('FÍS.+PED.', col.pedidos, y);
  doc.text('MÉD.30D', col.media, y, { align: 'right' });
  doc.text('P.FUT.', col.proj, y, { align: 'right' });
  doc.text('QTD', col.qtd, y, { align: 'right' });
  doc.text('FORNECEDOR', col.forn, y);
  const lineY = y + 2;
  doc.setDrawColor(...ENXUTO.line);
  doc.setLineWidth(0.12);
  doc.line(M, lineY, col.tableRight, lineY);
  return lineY + 4.8;
}

function drawTextBlock(doc, lines, x, y, align = 'left') {
  lines.forEach((line, idx) => {
    doc.text(line, x, y + idx * LINE_H, { align });
  });
  return lines.length;
}

function drawDataRow(doc, fontFamily, row, y, col) {
  const rowH = measureRowHeight(doc, row, fontFamily, col);
  const baseline = y + 3.6;

  doc.setFont(fontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  doc.setTextColor(...ENXUTO.black);

  const nameLines = splitLines(doc, row.produto, col.produtoW - 2, FONT.row);
  drawTextBlock(doc, nameLines, col.produto, baseline);

  doc.text(row.estoque_total || '—', col.estoque, baseline, { align: 'right' });

  if (row.estoque_pedidos) {
    doc.setFontSize(FONT.rowSmall);
    doc.setTextColor(...ENXUTO.muted);
    const pedLines = splitLines(doc, row.estoque_pedidos, 28, FONT.rowSmall);
    drawTextBlock(doc, pedLines, col.pedidos, baseline);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...ENXUTO.black);
  }

  doc.text(row.media_30d, col.media, baseline, { align: 'right' });
  doc.text(row.projecao, col.proj, baseline, { align: 'right' });
  doc.text(row.qtd_sugerida, col.qtd, baseline, { align: 'right' });

  const fornLines = splitLines(doc, row.fornecedor, col.tableRight - col.forn - 2, FONT.row);
  drawTextBlock(doc, fornLines, col.forn, baseline);

  const bottom = y + rowH;
  doc.setDrawColor(...ENXUTO.rowRule);
  doc.setLineWidth(0.06);
  doc.line(M, bottom, col.tableRight, bottom);
  return bottom + 1;
}

function drawSectionTitle(doc, fontFamily, letter, rowCount, y, col, { grouped = false } = {}) {
  doc.setFillColor(...ENXUTO.section);
  doc.rect(M, y - 4, col.tableRight - M, 8, 'F');
  doc.setFont(fontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.section);
  doc.setTextColor(...ENXUTO.black);
  const unitLabel = grouped ? 'grupo(s)' : 'item(ns)';
  doc.text(
    safe(`${CURVA_LABELS[letter] || `Curva ${letter}`} · ${rowCount} ${unitLabel}`),
    M + 2,
    y + 1.4,
  );
  return y + 9;
}

export async function generateRelatorioSugestaoCompraPdf(payload = {}) {
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

  const { totalRows, totalQtdBase, sections, agruparNivel: nivelAgrupamento } =
    prepareSugestaoCompraReportSections(linhas, ctx, { agruparNivel });
  const grouped = Number(nivelAgrupamento) > 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
  y += 7;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(safe(`Gerado em ${generatedAt} · ${totalRows} item(ns) visíveis`), M, y);
  y += 5.5;

  if (Number(agruparNivel) > 0) {
    doc.text(safe(`Agrupado por nível hierárquico ${agruparNivel} (somente totais por grupo)`), M, y);
    y += 5.5;
  }

  if (filtersSummary) {
    const filterLines = doc.splitTextToSize(safe(`Filtros: ${filtersSummary}`), pageW - M * 2);
    doc.text(filterLines, M, y);
    y += filterLines.length * 4.2 + 2;
  }

  ensureSpace(30);
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.section);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Resumo por curva', M, y);
  y += 6;

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.colHdr);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('CURVA', M, y);
  doc.text('ITENS', M + 22, y);
  doc.text('QTD SUG.', M + 42, y);
  y += 4.5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  doc.setTextColor(...ENXUTO.black);
  for (const section of sections) {
    ensureSpace(5.5);
    doc.text(section.letter, M, y);
    doc.text(String(section.skuCount ?? section.blocks.reduce((n, b) => n + (b.skuCount || b.rows.length), 0)), M + 22, y);
    doc.text(String(Math.round(section.qtdBase)), M + 42, y);
    y += 4.8;
  }
  ensureSpace(5.5);
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.text('TOTAL', M, y);
  doc.text(String(totalRows), M + 22, y);
  doc.text(String(Math.round(totalQtdBase)), M + 42, y);
  y += 9;

  for (const section of sections) {
    const rowCount = grouped
      ? section.blocks.length
      : (section.skuCount ?? section.blocks.reduce((n, b) => n + b.rows.length, 0));
    ensureSpace(20);
    y = drawSectionTitle(doc, pdfFontFamily, section.letter, rowCount, y, col, { grouped });
    startTable();

    for (const block of section.blocks) {
      for (const row of block.rows) {
        const rowH = measureRowHeight(doc, row, pdfFontFamily, col) + 1;
        ensureSpace(rowH);
        y = drawDataRow(doc, pdfFontFamily, row, y, col);
      }
    }

    stopTable();
    y += 4;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.footer);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(
      safe(`${SUGESTAO_COMPRA_PDF_BUILD} · A4 retrato · Página ${page}/${pageCount}`),
      pageW / 2,
      pageH - 6,
      { align: 'center' },
    );
  }

  return {
    data: doc.output('arraybuffer'),
    version: SUGESTAO_COMPRA_PDF_BUILD,
    rowCount: totalRows,
  };
}
