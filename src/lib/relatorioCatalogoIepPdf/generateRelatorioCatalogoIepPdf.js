import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import { enrichProdutosComAbcdAoVivo } from '@/lib/catalogAbcdEnrichment';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';
const ENXUTO = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  rowRule: [210, 210, 210],
};
const FONT = {
  title: 13,
  subtitle: 8.6,
  colHdr: 7.4,
  row: 8.4,
  footer: 8.5,
};
const ROW_H = 5.8;
const ROW_GAP = 1.1;
const ROW_STEP = ROW_H + ROW_GAP;

const safe = (text) => normalizePdfText(text);

export const CATALOG_IEP_PDF_BUILD = 'curva_abc_produto_v2';

export function prepareCatalogIepReportRows(
  produtos = [],
  itensPorProduto = {},
  sortOrder = 'abcd_desc',
) {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const enriched = enrichProdutosComAbcdAoVivo(list, itensPorProduto);
  return [...enriched].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
}

function scoreText(value) {
  const num = Number(value);
  if (value == null || !Number.isFinite(num)) return '—';
  return String(Math.round(num));
}

function abcdText(letter) {
  const value = String(letter || '').toUpperCase().trim();
  return value || '—';
}

export async function generateRelatorioCatalogoIepPdf(payload = {}) {
  const {
    produtos = [],
    itensPorProduto = {},
    pedidos: _legacyPedidos,
    filters_summary: filtersSummary = '',
    sort_order: sortOrder = 'abcd_desc',
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  } = payload;

  const rows = prepareCatalogIepReportRows(produtos, itensPorProduto, sortOrder);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 8;
  const CW = pageW - M * 2;
  const tableRight = M + CW;

  const colAbc = tableRight - 12;
  const colIep = colAbc - 16;
  const colN1 = colIep - 16;
  const colN2 = colN1 - 16;
  const descEnd = colN2 - 4;

  let y = 14;

  const strokeLine = (x0, y0, x1, y1, color = ENXUTO.line, width = 0.12) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x0, y0, x1, y1);
  };

  const ensureSpace = (needed = ROW_STEP) => {
    if (y + needed <= pageH - 12) return;
    doc.addPage();
    y = 14;
    drawColumnHeaders();
  };

  const drawColumnHeaders = () => {
    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.colHdr);
    doc.setTextColor(...ENXUTO.muted);
    doc.text('PRODUTO', M, y);
    doc.text('ABC', colAbc, y, { align: 'right' });
    doc.text('IEP', colIep, y, { align: 'right' });
    doc.text('M.N1', colN1, y, { align: 'right' });
    doc.text('M.N2', colN2, y, { align: 'right' });
    y += 3.2;
    strokeLine(M, y, tableRight, y, ENXUTO.line);
    y += 3.6;
  };

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Curva ABC / IEP', M, y);
  y += 5.5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.subtitle);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(safe(`Gerado em ${generatedAt} · ${rows.length} produto(s) · janela 90 dias`), M, y);
  y += 4.2;

  if (filtersSummary) {
    const filterLines = doc.splitTextToSize(safe(`Filtros: ${filtersSummary}`), CW);
    doc.text(filterLines, M, y);
    y += filterLines.length * 3.6 + 1.5;
  }

  drawColumnHeaders();

  for (const produto of rows) {
    ensureSpace(ROW_STEP + 2);
    const nome = safe(produto?.nome || '—');
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...ENXUTO.black);

    const nameLines = doc.splitTextToSize(nome, descEnd - M);
    const lineCount = Math.max(1, nameLines.length);
    const blockH = lineCount * 3.8;
    const baseline = y + ROW_H * 0.72;

    nameLines.forEach((line, idx) => {
      doc.text(line, M, baseline + idx * 3.8);
    });

    doc.text(abcdText(produto?.abcd), colAbc, baseline, { align: 'right' });
    doc.text(scoreText(produto?.iep_score), colIep, baseline, { align: 'right' });
    doc.text(scoreText(produto?.iep_score_nivel_1), colN1, baseline, { align: 'right' });
    doc.text(scoreText(produto?.iep_score_nivel_2), colN2, baseline, { align: 'right' });

    y += Math.max(ROW_STEP, blockH + ROW_GAP);
    strokeLine(M, y - ROW_GAP * 0.35, tableRight, y - ROW_GAP * 0.35, ENXUTO.rowRule, 0.07);
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.footer);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(
      safe(`${CATALOG_IEP_PDF_BUILD} · Página ${page}/${pageCount}`),
      pageW / 2,
      pageH - 5,
      { align: 'center' },
    );
  }

  return {
    data: doc.output('arraybuffer'),
    version: CATALOG_IEP_PDF_BUILD,
    rowCount: rows.length,
  };
}
