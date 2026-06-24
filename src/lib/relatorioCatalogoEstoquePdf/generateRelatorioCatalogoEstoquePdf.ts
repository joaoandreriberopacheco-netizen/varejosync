import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { lineValorCustoTotal } from '@/lib/catalogStockTotals';
import { prepareCatalogStockReportDocument } from './prepareCatalogStockReportRows';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';

const ENXUTO_LINE_W = 0.12;
const ENXUTO = {
  black: [0, 0, 0] as [number, number, number],
  muted: [72, 72, 72] as [number, number, number],
  faint: [130, 130, 130] as [number, number, number],
  line: [110, 110, 110] as [number, number, number],
};

const FONT = {
  title: 13,
  kpi: 9.8,
  grupo: 11,
  grupoMeta: 9,
  colHdr: 9.2,
  row: 10,
  footer: 9,
};

/** Recuos e mind map (descricaoProduto aplicado só na coluna nome). */
const INDENT = {
  abcd: 0,
  abcdLine: 5,
  descricaoProduto: 9,
};

const BRANCH_LEN = 2.4;

const fmtR = (n: number) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const safe = (text: unknown) => normalizePdfText(text);
const moeda = (valor = 0) => `R$ ${fmtR(Number(valor) || 0)}`;
const moedaSemSimbolo = (valor: number) => fmtR(Number(valor) || 0);
const moedaOuTraco = (valor: number) =>
  Number.isFinite(Number(valor)) && Number(valor) > 0 ? moedaSemSimbolo(valor) : '—';

function estoqueLinha(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  if (apresent) return `${fmtN(apresent.quantidade)} ${apresent.sigla}`;
  const qtd = fmtN(produto?.estoque_atual);
  const un = String(produto?.unidade_principal || 'UN').toUpperCase();
  return `${qtd} ${un}`;
}

function truncateOneLine(doc, text: string, maxW: number) {
  const lines = doc.splitTextToSize(safe(text), maxW);
  let line = lines[0] || '';
  if (lines.length > 1 && line.length > 2) {
    line = `${line.slice(0, Math.max(0, line.length - 1))}…`;
  }
  return line;
}

export async function generateRelatorioCatalogoEstoquePdf(payload: Record<string, unknown> = {}) {
  const {
    produtos = [],
    filters_summary: filtersSummary = '',
    totals = {},
    sort_order: sortOrder = 'az',
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  } = payload as {
    produtos?: unknown[];
    filters_summary?: string;
    totals?: { totalCompra?: number; totalCusto?: number; totalVenda?: number };
    sort_order?: string;
    generated_at?: string;
  };

  const documento = prepareCatalogStockReportDocument({
    produtos: produtos as never[],
    sortOrder: sortOrder as string,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 8;
  const CW = pageW - M * 2;

  /** Valores à direita; descrição ocupa o miolo largo da página. */
  const X = {
    line: 11,
    estoque: M + 22,
    descricao: M + 24,
    vlCompra: M + CW - 58,
    custo: M + CW - 40,
    venda: M + CW - 22,
    invent: M + CW,
  };

  const ROW_H = 5.4;
  const ROW_GAP = 0.55;
  const ROW_STEP = ROW_H + ROW_GAP;
  const BASELINE_RATIO = 0.72;

  let y = 16;

  const strokeLine = (x0: number, y0: number, x1: number, y1: number, color = ENXUTO.line) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(ENXUTO_LINE_W);
    doc.line(x0, y0, x1, y1);
  };

  const strokeBlack = (x0: number, y0: number, x1: number, y1: number) =>
    strokeLine(x0, y0, x1, y1, ENXUTO.black);

  const drawVerticalSpan = (x: number, yStart: number, yEnd: number, startPage: number, endPage: number) => {
    const topPad = 14;
    const bottomPad = 10;
    const savedPage = doc.internal.getNumberOfPages();
    for (let page = startPage; page <= endPage; page += 1) {
      doc.setPage(page);
      const segTop = page === startPage ? yStart : topPad;
      const segBottom = page === endPage ? yEnd : pageH - bottomPad;
      if (segBottom > segTop + 0.5) strokeBlack(x, segTop, x, segBottom);
    }
    doc.setPage(savedPage);
  };

  const ensureSpace = (needed = ROW_STEP + 1) => {
    if (y + needed > pageH - 10) {
      doc.addPage();
      y = 14;
    }
  };

  const descMaxW = (descX: number) => Math.max(16, X.vlCompra - descX - 6);

  const drawColumnHeaders = (baselineY: number) => {
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.colHdr);
    doc.setTextColor(...ENXUTO.muted);
    doc.text('ESTOQUE', X.estoque, baselineY, { align: 'right' });
    doc.text('VL. COMPRA', X.vlCompra, baselineY, { align: 'right' });
    doc.text('CUSTO', X.custo, baselineY, { align: 'right' });
    doc.text('VENDA', X.venda, baselineY, { align: 'right' });
    doc.text('INVENT.', X.invent, baselineY, { align: 'right' });
  };

  const drawValueColumns = (
    baselineY: number,
    values: { vlCompra: string; custo: string; venda: string; invent: string },
    { muted = false } = {},
  ) => {
    doc.setFont(pdfFontFamily, muted ? PDF_FONT_NORMAL : PDF_FONT_BOLD);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...(muted ? ENXUTO.faint : ENXUTO.black));
    doc.text(values.vlCompra, X.vlCompra, baselineY, { align: 'right' });
    doc.text(values.custo, X.custo, baselineY, { align: 'right' });
    doc.text(values.venda, X.venda, baselineY, { align: 'right' });
    doc.text(values.invent, X.invent, baselineY, { align: 'right' });
  };

  const drawFlatRow = (
    y0: number,
    {
      estoqueText,
      descricao,
      descIndent = 0,
      values,
      muted = false,
      mindMap = false,
      descBold = false,
    }: {
      estoqueText: string;
      descricao: string;
      descIndent?: number;
      values: { vlCompra: string; custo: string; venda: string; invent: string };
      muted?: boolean;
      mindMap?: boolean;
      descBold?: boolean;
    },
  ) => {
    const baseline = y0 + ROW_H * BASELINE_RATIO;
    const descX = X.descricao + descIndent;
    const lineX = M + X.line + descIndent;

    if (mindMap) {
      const branchY = y0 + ROW_H * 0.5;
      strokeLine(lineX, y0, lineX, y0 + ROW_H);
      strokeLine(lineX, branchY, lineX + BRANCH_LEN, branchY);
    }

    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...(muted ? ENXUTO.faint : ENXUTO.black));
    doc.text(estoqueText, X.estoque, baseline, { align: 'right' });

    doc.setFont(pdfFontFamily, descBold ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setTextColor(...(muted ? ENXUTO.muted : ENXUTO.black));
    doc.text(truncateOneLine(doc, descricao, descMaxW(descX)), descX, baseline);

    drawValueColumns(baseline, values, { muted });
    return ROW_STEP;
  };

  // ── Cabeçalho ────────────────────────────────────────────────────────────
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Relatorio de estoque — ENXUTO', M, y);
  y += 5.5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(8);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('A4 compacto   agrupado por ABCD   lista plana   DIN 1451', M, y);
  y += 4.5;

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

  const tCompra = roundToTwoDecimals(Number(totals.totalCompra) || 0);
  const tCusto = roundToTwoDecimals(Number(totals.totalCusto) || 0);
  const tVenda = roundToTwoDecimals(Number(totals.totalVenda) || 0);

  doc.setFontSize(FONT.kpi);
  doc.setTextColor(...ENXUTO.black);
  doc.text(`Invent. compra: ${moeda(tCompra)}`, M, y);
  doc.text(`Invent. custo: ${moeda(tCusto)}`, M + 68, y);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(`Invent. venda: ${moeda(tVenda)}`, M + CW, y, { align: 'right' });
  y += 8;

  if (!documento.groups.length) {
    doc.setTextColor(...ENXUTO.muted);
    doc.text('Nenhum produto encontrado com os filtros actuais.', M, y);
  }

  for (const grupo of documento.groups) {
    ensureSpace(20);
    y += 3;
    const blockTop = y;
    const blockStartPage = doc.internal.getNumberOfPages();

    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.grupo);
    doc.setTextColor(...ENXUTO.black);
    doc.text(safe(grupo.label), M + INDENT.abcd, y + 3.5);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.grupoMeta);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(
      safe(`${grupo.produtos.length} SKU(s)`),
      M + CW,
      y + 3.5,
      { align: 'right' },
    );
    y += 7;

    drawColumnHeaders(y + 4);
    y += 7.5;

    const agg = grupo.agg || {};
    const estoqueResumo =
      agg.estoqueTotal > 0 ? fmtN(agg.estoqueTotal) : '—';
    ensureSpace(ROW_STEP);
    y += drawFlatRow(y, {
      estoqueText: estoqueResumo,
      descricao: `${grupo.label} — resumo (${grupo.produtos.length})`,
      descIndent: 0,
      muted: true,
      descBold: true,
      values: {
        vlCompra: agg.valorCompraMedio > 0 ? `~${moedaSemSimbolo(agg.valorCompraMedio)}` : '—',
        custo: agg.custoMedio > 0 ? `~${moedaSemSimbolo(agg.custoMedio)}` : '—',
        venda: agg.precoMedio > 0 ? `~${moedaSemSimbolo(agg.precoMedio)}` : '—',
        invent: grupo.totals.totalCusto > 0 ? `~${moedaSemSimbolo(grupo.totals.totalCusto)}` : '—',
      },
    });

    for (const produto of grupo.produtos) {
      ensureSpace(ROW_STEP);
      const cat = getCatalogoComercialView(produto);
      const lastro = lineValorCustoTotal(produto);
      const nome = produto?.codigo_interno
        ? `${produto.nome || '—'}  ${produto.codigo_interno}`
        : (produto.nome || '—');

      y += drawFlatRow(y, {
        estoqueText: estoqueLinha(produto),
        descricao: nome,
        descIndent: INDENT.descricaoProduto,
        mindMap: true,
        values: {
          vlCompra: moedaOuTraco(cat.valorCompraNaEmbalagem),
          custo: moedaOuTraco(cat.custoNaEmbalagem),
          venda: moedaOuTraco(cat.precoVenda),
          invent: lastro > 0 ? moedaSemSimbolo(lastro) : '—',
        },
      });
    }

    drawVerticalSpan(M + INDENT.abcdLine, blockTop, y + ROW_H, blockStartPage, doc.internal.getNumberOfPages());
    y += 6;
  }

  ensureSpace(10);
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.footer);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Totais filtrados — estoque x valor de compra, custo ou venda.', M, y);
  y += 4;
  doc.setTextColor(...ENXUTO.black);
  doc.text(`Compra: ${moeda(tCompra)}   Custo: ${moeda(tCusto)}   Venda: ${moeda(tVenda)}`, M, y);

  const pdfBytes = doc.output('arraybuffer');
  return { data: pdfBytes, version: 'enxuto_abcd_plano' };
}
