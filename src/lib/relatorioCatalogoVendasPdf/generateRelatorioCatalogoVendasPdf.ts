import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import {
  prepareCatalogSalesReportDocument,
  stockQuantTexto,
  velocityQuantTexto,
} from './prepareCatalogSalesReportRows';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';

const ENXUTO_LINE_W = 0.12;
const ROW_RULE_W = 0.07;
const ENXUTO = {
  black: [0, 0, 0] as [number, number, number],
  muted: [72, 72, 72] as [number, number, number],
  line: [110, 110, 110] as [number, number, number],
  rowRule: [210, 210, 210] as [number, number, number],
};

const FONT = {
  title: 13,
  kpi: 9.8,
  colHdr: 7.4,
  row: 8.8,
  footer: 9,
};

const DESC_LINE_LEAD = 4.5;
const COL_HDR_BLOCK = 9;
const TABLE_TOP_CONTINUATION = 14;
const LEVEL_INDENT = 4.2;

const fmtN = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const safe = (text: unknown) => normalizePdfText(text);

function splitDescriptionLines(
  doc: jsPDF,
  pdfFontFamily: string,
  text: string,
  maxW: number,
) {
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  const lines = doc.splitTextToSize(safe(text), maxW) as string[];
  return lines.length ? lines : [''];
}

function treeLevelLabel(treeLevel: number) {
  if (treeLevel <= 1) return 'nível 1';
  if (treeLevel >= 99) return 'todos os níveis';
  return `nível ${treeLevel}`;
}

export async function generateRelatorioCatalogoVendasPdf(payload: Record<string, unknown> = {}) {
  const {
    produtos = [],
    pedidos = [],
    filters_summary: filtersSummary = '',
    layout_mode: layoutMode = 'tree',
    tree_level: treeLevel = 1,
    sort_order: sortOrder = 'az',
    group_by_category: groupByCategory = false,
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  } = payload as {
    produtos?: unknown[];
    pedidos?: unknown[];
    filters_summary?: string;
    layout_mode?: string;
    tree_level?: number;
    sort_order?: string;
    group_by_category?: boolean;
    generated_at?: string;
  };

  const documento = prepareCatalogSalesReportDocument({
    produtos: produtos as never[],
    pedidos: pedidos as never[],
    layoutMode: layoutMode as string,
    treeLevel: Number(treeLevel) || 1,
    sortOrder: sortOrder as string,
    groupByCategory: Boolean(groupByCategory),
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 6;
  const CW = pageW - M * 2;

  const descStart = M + 4;
  const tableRight = M + CW;
  const quantRight = M + 88;
  const v30Right = M + 118;
  const v60Right = M + 148;
  const mediaRight = tableRight;
  const divider = descStart + (quantRight - descStart) * 0.62;

  const X = {
    desc: descStart,
    divider,
    quant: quantRight,
    v30: v30Right,
    v60: v60Right,
    media: mediaRight,
  };

  const ROW_H = 6.1;
  const ROW_GAP = 1.15;
  const ROW_STEP = ROW_H + ROW_GAP;
  const BASELINE_RATIO = 0.72;

  let y = 16;
  let dividerStartY = 0;
  let dividerStartPage = 1;

  const strokeLine = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color = ENXUTO.line,
    width = ENXUTO_LINE_W,
  ) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x0, y0, x1, y1);
  };

  const drawRowSeparator = (yLine: number) => {
    strokeLine(descStart, yLine, tableRight, yLine, ENXUTO.rowRule, ROW_RULE_W);
  };

  const drawVerticalDivider = (
    x: number,
    yStart: number,
    yEnd: number,
    startPage: number,
    endPage: number,
  ) => {
    const bottomPad = 10;
    const savedPage = doc.internal.getNumberOfPages();
    for (let page = startPage; page <= endPage; page += 1) {
      doc.setPage(page);
      const segTop = page === startPage ? yStart : TABLE_TOP_CONTINUATION;
      const segBottom = page === endPage ? yEnd : pageH - bottomPad;
      if (segBottom > segTop + 0.5) strokeLine(x, segTop, x, segBottom);
    }
    doc.setPage(savedPage);
  };

  const drawColumnHeaders = (topY: number) => {
    const line1 = topY + 3.2;
    const line2 = topY + 6.8;
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.colHdr);
    doc.setTextColor(...ENXUTO.muted);

    doc.text('QUANT', X.quant, line1, { align: 'right' });
    doc.text('V.30D', X.v30, line1, { align: 'right' });
    doc.text('V.60D', X.v60, line1, { align: 'right' });
    doc.text('M.DIA', X.media, line1, { align: 'right' });

    doc.setFontSize(FONT.colHdr - 0.4);
    doc.text('+ UN', X.quant, line2, { align: 'right' });
    doc.text('30 dias', X.v30, line2, { align: 'right' });
    doc.text('60 dias', X.v60, line2, { align: 'right' });
    doc.text('média', X.media, line2, { align: 'right' });
  };

  const beginTablePage = () => {
    drawColumnHeaders(y);
    y += COL_HDR_BLOCK;
  };

  const ensureTableSpace = (needed = ROW_STEP + 1) => {
    if (y + needed > pageH - 10) {
      doc.addPage();
      y = TABLE_TOP_CONTINUATION;
      beginTablePage();
    }
  };

  const descMaxW = (descX = X.desc) => Math.max(20, X.divider - descX - 1);

  const rowBaselines = (drawY: number, lineCount: number, extraH: number) => {
    const cellH = ROW_H + extraH;
    if (lineCount <= 1) {
      const baseline = drawY + ROW_H * BASELINE_RATIO;
      return { valuesBaseline: baseline, descFirstBaseline: baseline };
    }
    const midY = drawY + cellH / 2;
    const textLift = FONT.row * 0.36;
    const descSpan = (lineCount - 1) * DESC_LINE_LEAD;
    return {
      valuesBaseline: midY + textLift * 0.35,
      descFirstBaseline: midY - descSpan / 2 + textLift * 0.35,
    };
  };

  const drawValueColumns = (
    baselineY: number,
    produto: Record<string, unknown> | null,
    velocity: { qtd30?: number; qtd60?: number; mediaDiaria?: number; unidade?: string | null },
    { isGroup = false } = {},
  ) => {
    doc.setFont(pdfFontFamily, isGroup ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...ENXUTO.black);

    const stock = produto ? stockQuantTexto(produto) : { texto: isGroup ? '—' : '—' };
    const v30 = velocityQuantTexto({ qtd: velocity?.qtd30, unidade: velocity?.unidade }, { showUnit: true });
    const v60 = velocityQuantTexto({ qtd: velocity?.qtd60, unidade: velocity?.unidade }, { showUnit: true });
    const media = velocityQuantTexto(
      { qtd: velocity?.mediaDiaria, unidade: velocity?.unidade },
      { showUnit: true },
    );

    doc.text(stock.texto, X.quant, baselineY, { align: 'right' });
    doc.text(v30 || '—', X.v30, baselineY, { align: 'right' });
    doc.text(v60 || '—', X.v60, baselineY, { align: 'right' });
    doc.text(media || '—', X.media, baselineY, { align: 'right' });
  };

  const drawDataRow = (
    y0: number,
    descricao: string,
    produto: Record<string, unknown> | null,
    velocity: { qtd30?: number; qtd60?: number; mediaDiaria?: number; unidade?: string | null },
    { level = 1, isGroup = false } = {},
  ) => {
    const descX = X.desc + Math.max(0, level - 1) * LEVEL_INDENT;
    const descLines = splitDescriptionLines(doc, pdfFontFamily, descricao, descMaxW(descX));
    const lineCount = descLines.length;
    const extraH = (lineCount - 1) * DESC_LINE_LEAD;
    const rowStep = ROW_STEP + extraH;

    y = y0;
    ensureTableSpace(rowStep + 1);
    const drawY = y;
    const { valuesBaseline, descFirstBaseline } = rowBaselines(drawY, lineCount, extraH);

    drawValueColumns(valuesBaseline, produto, velocity, { isGroup });

    doc.setFont(pdfFontFamily, isGroup ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setTextColor(...ENXUTO.black);
    for (let i = 0; i < lineCount; i += 1) {
      doc.text(descLines[i], descX, descFirstBaseline + i * DESC_LINE_LEAD);
    }

    drawRowSeparator(drawY + rowStep - ROW_GAP * 0.35);
    return drawY + rowStep;
  };

  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Relatorio de vendas — ENXUTO', M, y);
  y += 5.5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(8);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('A4   estoque + vendas 30/60 dias   média diária   DIN 1451', M, y);
  y += 4.5;

  const modeLabel = documento.mode === 'plana'
    ? 'Lista plana A-Z'
    : documento.groupByCategory
      ? `Agrupado por categoria · ${treeLevelLabel(documento.treeLevel)}`
      : `Hierarquia do catálogo · ${treeLevelLabel(documento.treeLevel)}`;
  doc.text(modeLabel, M, y);
  y += 4.2;

  doc.setFontSize(8.8);
  doc.text(safe(`${(produtos as unknown[])?.length ?? 0} SKU(s)`), M, y);
  y += 4.2;
  if (filtersSummary) {
    doc.text(doc.splitTextToSize(safe(filtersSummary), CW)[0] || '-', M, y);
    y += 4.2;
  }
  doc.setFontSize(8.2);
  doc.text(`Gerado em ${generatedAt}`, M, y);
  y += 5;

  const totalV30 = Object.values(documento.velocityMap || {}).reduce(
    (s, v) => s + (Number((v as { qtd30?: number }).qtd30) || 0),
    0,
  );
  const totalV60 = Object.values(documento.velocityMap || {}).reduce(
    (s, v) => s + (Number((v as { qtd60?: number }).qtd60) || 0),
    0,
  );

  doc.setFontSize(FONT.kpi);
  doc.setTextColor(...ENXUTO.black);
  doc.text(`Vendas 30d: ${fmtN(totalV30)} un.`, M, y);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(`Vendas 60d: ${fmtN(totalV60)} un.`, M + CW, y, { align: 'right' });
  y += 8;

  if (!documento.rows?.length) {
    doc.setTextColor(...ENXUTO.muted);
    doc.text('Nenhum produto encontrado com os filtros actuais.', M, y);
  } else {
    dividerStartPage = doc.internal.getNumberOfPages();
    dividerStartY = y;
    beginTablePage();

    for (const row of documento.rows) {
      if (row.type === 'group') {
        const label = String(row.label || '—');
        const countSuffix = row.skuCount ? `  (${row.skuCount} SKU)` : '';
        y = drawDataRow(
          y,
          `${label}${countSuffix}`,
          null,
          row.velocity || {},
          { level: row.level || 1, isGroup: true },
        );
        continue;
      }
      if (row.type !== 'sku') continue;
      const p = row.produto as Record<string, unknown>;
      const nome = p?.codigo_interno
        ? `${p.nome || '—'}  ${p.codigo_interno}`
        : String(p?.nome || '—');
      y = drawDataRow(y, nome, p, row.velocity || {}, { level: row.level || 1, isGroup: false });
    }

    drawVerticalDivider(
      X.divider,
      dividerStartY,
      y,
      dividerStartPage,
      doc.internal.getNumberOfPages(),
    );
  }

  const FOOTER_BLOCK_H = 10;
  if (y + FOOTER_BLOCK_H > pageH - M) {
    doc.addPage();
    y = TABLE_TOP_CONTINUATION;
  }
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.footer);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Filtros do catálogo · hierarquia conforme seleção na tela.', M, y);

  const pdfBytes = doc.output('arraybuffer');
  return { data: pdfBytes, version: 'enxuto_vendas_30_60_media_v1' };
}
