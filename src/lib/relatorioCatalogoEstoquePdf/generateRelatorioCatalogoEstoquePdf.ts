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

/** Recuo só na descrição por nível hierárquico (colunas de valor inalteradas). */
const INDENT = {
  abcd: 0,
  abcdLine: 5,
  /** mm por nível na árvore (só descrição). */
  nivelMm: 4,
  /** Folga após o ramo do mind map antes do nome do SKU. */
  aposMindMap: 3,
};

const BRANCH_LEN = 3;
/** Espaçamento entre linhas quando a descrição quebra. */
const DESC_LINE_LEAD = 4.15;

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

function splitDescriptionLines(
  doc: jsPDF,
  pdfFontFamily: string,
  text: string,
  maxW: number,
  descBold: boolean,
) {
  doc.setFont(pdfFontFamily, descBold ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  const lines = doc.splitTextToSize(safe(text), maxW) as string[];
  return lines.length ? lines : [''];
}

function descIndentForLevel(level = 1) {
  const depth = Math.max(0, (level ?? 1) - 1);
  return INDENT.aposMindMap + depth * INDENT.nivelMm;
}

function produtoLastro(produto, rowLastro?: number) {
  if (Number.isFinite(rowLastro) && rowLastro > 0) return rowLastro;
  return lineValorCustoTotal(produto);
}

export async function generateRelatorioCatalogoEstoquePdf(payload: Record<string, unknown> = {}) {
  const {
    produtos = [],
    filters_summary: filtersSummary = '',
    totals = {},
    layout_mode: layoutMode = 'tree',
    tree_level: treeLevel = 1,
    sort_order: sortOrder = 'az',
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  } = payload as {
    produtos?: unknown[];
    filters_summary?: string;
    totals?: { totalCompra?: number; totalCusto?: number; totalVenda?: number };
    layout_mode?: string;
    tree_level?: number;
    sort_order?: string;
    generated_at?: string;
  };

  const documento = prepareCatalogStockReportDocument({
    produtos: produtos as never[],
    layoutMode: layoutMode as string,
    treeLevel: Number(treeLevel) || 1,
    sortOrder: sortOrder as string,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 8;
  const CW = pageW - M * 2;

  /** Estoque | linha mind map | descrição (recuo) | valores à direita. */
  const X = {
    estoque: M + 17,
    mindMapLine: M + 20.5,
    descricao: M + 28,
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
    const descX = X.descricao + descIndent;
    const descLines = splitDescriptionLines(doc, pdfFontFamily, descricao, descMaxW(descX), descBold);
    const lineCount = descLines.length;
    const extraH = (lineCount - 1) * DESC_LINE_LEAD;
    const rowStep = ROW_STEP + extraH;

    y = y0;
    ensureSpace(rowStep + 1);
    const drawY = y;
    const firstBaseline = drawY + ROW_H * BASELINE_RATIO;
    const rowBottom = drawY + ROW_H + extraH;

    if (mindMap) {
      const branchY = drawY + ROW_H * 0.5;
      strokeLine(X.mindMapLine, drawY, X.mindMapLine, rowBottom);
      strokeLine(X.mindMapLine, branchY, X.mindMapLine + BRANCH_LEN, branchY);
    }

    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...(muted ? ENXUTO.faint : ENXUTO.black));
    doc.text(estoqueText, X.estoque, firstBaseline, { align: 'right' });

    drawValueColumns(firstBaseline, values, { muted });

    doc.setFont(pdfFontFamily, descBold ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setTextColor(...(muted ? ENXUTO.muted : ENXUTO.black));
    for (let i = 0; i < lineCount; i += 1) {
      doc.text(descLines[i], descX, firstBaseline + i * DESC_LINE_LEAD);
    }

    return drawY + rowStep;
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
  doc.text('A4 compacto   ABCD por familia (nivel 2)   recuo na descricao   DIN 1451', M, y);
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
    y = drawFlatRow(y, {
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

    for (const row of grupo.rows || []) {
      if (row.type !== 'sku') continue;

      const p = row.produto;
      const cat = getCatalogoComercialView(p);
      const lastro = produtoLastro(p, row.lastro);
      const level = row.level ?? 1;
      const nome = p?.codigo_interno
        ? `${p.nome || '—'}  ${p.codigo_interno}`
        : (p.nome || '—');

      y = drawFlatRow(y, {
        estoqueText: estoqueLinha(p),
        descricao: nome,
        descIndent: descIndentForLevel(level),
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
  return { data: pdfBytes, version: 'enxuto_abcd_familia_n2_wrap' };
}
