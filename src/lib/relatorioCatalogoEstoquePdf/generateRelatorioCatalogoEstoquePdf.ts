import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { lineValorCustoTotal } from '@/lib/catalogStockTotals';
import { prepareCatalogStockReportDocument } from './prepareCatalogStockReportRows';
import { aggregateEstoqueDisplay, collectSkus } from '@/components/produtos/treegrid/useTreeGrid';

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

const INDENT = {
  /** mm por nível na árvore (espinha + recuo da descrição). */
  nivelMm: 4,
};

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

function groupEstoqueText(row: Record<string, unknown>) {
  const skus = row.node ? collectSkus(row.node as never) : [];
  const disp = aggregateEstoqueDisplay(skus);
  if (disp.mode === 'display' || disp.mode === 'base') {
    return `${fmtN(disp.quantidade)} ${disp.sigla}`;
  }
  if (disp.quantidade > 0) return fmtN(disp.quantidade);
  const total = Number(row.estoqueTotal);
  return total > 0 ? fmtN(total) : '—';
}

function familySummaryValues(row: Record<string, unknown>) {
  const valorCompra = Number(row.valorCompraMedio) || 0;
  const custo = Number(row.custoMedio) || 0;
  const venda = Number(row.precoMedio) || 0;
  const lastro = Number(row.lastroTotal) || 0;
  return {
    vlCompra: valorCompra > 0 ? `~${moedaSemSimbolo(valorCompra)}` : '—',
    custo: custo > 0 ? `~${moedaSemSimbolo(custo)}` : '—',
    venda: venda > 0 ? `~${moedaSemSimbolo(venda)}` : '—',
    invent: lastro > 0 ? `~${moedaSemSimbolo(lastro)}` : '—',
  };
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
  return Math.max(0, (level ?? 1) - 1) * INDENT.nivelMm;
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

  /** Estoque (esq.) | espinha mind map | descrição | valores (dir.). */
  const X = {
    estoque: M + 20,
    mindMapBase: M + 23,
    descricao: M + 30,
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

  const ensureSpace = (needed = ROW_STEP + 1) => {
    if (y + needed > pageH - 10) {
      doc.addPage();
      y = 14;
    }
  };

  const spineX = (level: number) => X.mindMapBase + descIndentForLevel(level);

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

  const drawMindMapConnectors = (
    drawY: number,
    rowBottom: number,
    level: number,
    nextLevel: number | null,
    descX: number,
  ) => {
    const branchY = drawY + ROW_H * 0.5;
    const continues = (L: number) => nextLevel != null && nextLevel >= L;

    for (let L = 1; L <= level; L += 1) {
      const x = spineX(L);
      const yEnd = continues(L) ? rowBottom + ROW_GAP : rowBottom;
      strokeLine(x, drawY, x, yEnd);
      if (L === level) {
        strokeLine(x, branchY, Math.max(x + 1.5, descX - 1), branchY);
      }
    }
  };

  const drawReportRow = (
    y0: number,
    {
      kind,
      level = 1,
      nextLevel = null,
      estoqueText = '',
      descricao,
      values,
      muted = false,
      descBold = false,
      mindMap = false,
    }: {
      kind: 'family' | 'sku';
      level?: number;
      nextLevel?: number | null;
      estoqueText?: string;
      descricao: string;
      values?: { vlCompra: string; custo: string; venda: string; invent: string };
      muted?: boolean;
      descBold?: boolean;
      mindMap?: boolean;
    },
  ) => {
    const descX = X.descricao + descIndentForLevel(level);
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
      drawMindMapConnectors(drawY, rowBottom, level, nextLevel, descX);
    }

    const showData = kind === 'family' || kind === 'sku';
    if (showData && estoqueText) {
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(FONT.row);
      doc.setTextColor(...(muted ? ENXUTO.faint : ENXUTO.black));
      doc.text(estoqueText, X.estoque, firstBaseline, { align: 'right' });
    }

    if (showData && values) {
      drawValueColumns(firstBaseline, values, { muted });
    }

    doc.setFont(pdfFontFamily, descBold ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
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
  doc.text('A4 compacto   hierarquia por familia   resumo nas familias   DIN 1451', M, y);
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

  if (!documento.rows?.length) {
    doc.setTextColor(...ENXUTO.muted);
    doc.text('Nenhum produto encontrado com os filtros actuais.', M, y);
  } else {
    ensureSpace(12);
    drawColumnHeaders(y + 4);
    y += 7.5;

    const treeRows = documento.rows.filter((row) => row.type === 'group' || row.type === 'sku');
    for (let i = 0; i < treeRows.length; i += 1) {
      const row = treeRows[i];
      const next = treeRows[i + 1];
      const nextLevel = next ? (next.level ?? 1) : null;
      const level = row.level ?? 1;

      if (row.type === 'group') {
        const count = row.count ?? 0;
        y = drawReportRow(y, {
          kind: 'family',
          level,
          nextLevel,
          estoqueText: groupEstoqueText(row),
          descricao: count > 0 ? `${row.label || '—'} (${count})` : (row.label || '—'),
          mindMap: true,
          muted: true,
          descBold: true,
          values: familySummaryValues(row),
        });
        continue;
      }

      const p = row.produto;
      const cat = getCatalogoComercialView(p);
      const lastro = produtoLastro(p, row.lastro);
      const nome = p?.codigo_interno
        ? `${p.nome || '—'}  ${p.codigo_interno}`
        : (p.nome || '—');

      y = drawReportRow(y, {
        kind: 'sku',
        level,
        nextLevel,
        estoqueText: estoqueLinha(p),
        descricao: nome,
        mindMap: true,
        values: {
          vlCompra: moedaOuTraco(cat.valorCompraNaEmbalagem),
          custo: moedaOuTraco(cat.custoNaEmbalagem),
          venda: moedaOuTraco(cat.precoVenda),
          invent: lastro > 0 ? moedaSemSimbolo(lastro) : '—',
        },
      });
    }
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
  return { data: pdfBytes, version: 'enxuto_familia_resumo' };
}
