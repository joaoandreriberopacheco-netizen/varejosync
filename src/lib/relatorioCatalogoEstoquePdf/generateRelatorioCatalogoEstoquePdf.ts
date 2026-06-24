import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { lineValorCustoTotal } from '@/lib/catalogStockTotals';
import { prepareCatalogStockReportRows } from './prepareCatalogStockReportRows';

const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';

const ENXUTO_LINE_W = 0.12;
const ENXUTO = {
  black: [0, 0, 0] as [number, number, number],
  muted: [72, 72, 72] as [number, number, number],
  line: [110, 110, 110] as [number, number, number],
};

const fmtR = (n: number) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const safe = (text: unknown) => normalizePdfText(text);

function printEstoqueCell(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  const qtd = apresent ? apresent.quantidade : produto.estoque_atual;
  const un = apresent ? apresent.sigla : produto.unidade_principal || 'UN';
  return `${fmtN(qtd)} ${un}`;
}

function printGroupEstoque(row) {
  if (row.estoqueTotal != null && row.estoqueTotal > 0) {
    return fmtN(row.estoqueTotal);
  }
  return '—';
}

function printPreco(valor: number) {
  if (!(valor > 0)) return '—';
  return fmtR(valor);
}

function produtoLastro(produto) {
  return lineValorCustoTotal(produto);
}

type ColDef = { key: string; label: string; w: number; align: 'left' | 'right' };

const COLS: ColDef[] = [
  { key: 'produto', label: 'Produto / grupo', w: 58, align: 'left' },
  { key: 'estoque', label: 'Estoque', w: 22, align: 'right' },
  { key: 'vlCompra', label: 'Vl. compra', w: 22, align: 'right' },
  { key: 'custo', label: 'Custo', w: 22, align: 'right' },
  { key: 'venda', label: 'Venda', w: 22, align: 'right' },
  { key: 'invent', label: 'Invent. R$', w: 24, align: 'right' },
];

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

  const prepared = prepareCatalogStockReportRows({
    produtos: produtos as never[],
    layoutMode: layoutMode as string,
    treeLevel: Number(treeLevel) || 1,
    sortOrder: sortOrder as string,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 10;
  const tableW = COLS.reduce((s, c) => s + c.w, 0);
  const tableX = M + Math.max(0, (pageW - M * 2 - tableW) / 2);

  const colX: number[] = [];
  let cx = tableX;
  COLS.forEach((col) => {
    colX.push(cx);
    cx += col.w;
  });

  const ROW_H = 4.4;
  const HDR_H = 5.2;
  const BODY_FS = 6.4;
  const HDR_FS = 6.2;
  const TITLE_FS = 11;
  const META_FS = 7.2;

  let y = 14;

  const strokeLine = (x0: number, y0: number, x1: number, y1: number, color = ENXUTO.line) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(ENXUTO_LINE_W);
    doc.line(x0, y0, x1, y1);
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 10) {
      doc.addPage();
      y = 12;
      drawColumnHeader();
    }
  };

  const drawColumnHeader = () => {
    const top = y;
    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(HDR_FS);
    doc.setTextColor(...ENXUTO.muted);
    COLS.forEach((col, i) => {
      doc.rect(colX[i], top, col.w, HDR_H);
      const tx = col.align === 'right' ? colX[i] + col.w - 1.2 : colX[i] + 1.2;
      doc.text(safe(col.label), tx, top + 3.6, { align: col.align });
    });
    strokeLine(tableX, top + HDR_H, tableX + tableW, top + HDR_H, ENXUTO.black);
    y = top + HDR_H;
  };

  const drawRow = (cells: string[], { bold = false, indentMm = 0 } = {}) => {
    ensureSpace(ROW_H + 0.5);
    const top = y;
    doc.setFont(pdfFontFamily, bold ? PDF_FONT_BOLD : PDF_FONT_NORMAL);
    doc.setFontSize(BODY_FS);
    doc.setTextColor(...ENXUTO.black);

    COLS.forEach((col, i) => {
      doc.rect(colX[i], top, col.w, ROW_H);
      const pad = 1.2;
      const tx = col.align === 'right' ? colX[i] + col.w - pad : colX[i] + pad + (i === 0 ? indentMm : 0);
      const maxW = col.w - pad * 2 - (i === 0 ? indentMm : 0);
      let text = safe(cells[i] ?? '');
      if (i === 0 && text.length > 0) {
        const lines = doc.splitTextToSize(text, Math.max(8, maxW));
        text = lines[0] || text;
        if (lines.length > 1 && text.length > 3) {
          text = `${text.slice(0, Math.max(0, text.length - 1))}…`;
        }
      }
      doc.text(text, tx, top + 3.1, { align: col.align });
    });

    y = top + ROW_H;
  };

  // ── Cabeçalho do documento ───────────────────────────────────────────────
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(TITLE_FS);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Relatorio de estoque', M, y);
  y += 5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(META_FS);
  doc.setTextColor(...ENXUTO.muted);
  const modoLabel = prepared.mode === 'plana' ? 'Lista plana' : 'Hierarquia';
  doc.text(
    safe(`${modoLabel} · ${(produtos as unknown[])?.length ?? 0} SKU(s) · Emitido em ${generatedAt}`),
    M,
    y,
  );
  y += 3.8;

  if (filtersSummary) {
    const filtros = doc.splitTextToSize(safe(`Filtros: ${filtersSummary}`), pageW - M * 2);
    filtros.slice(0, 2).forEach((line) => {
      doc.text(line, M, y);
      y += 3.4;
    });
  }

  const tCompra = roundToTwoDecimals(Number(totals.totalCompra) || 0);
  const tCusto = roundToTwoDecimals(Number(totals.totalCusto) || 0);
  const tVenda = roundToTwoDecimals(Number(totals.totalVenda) || 0);
  doc.text(
    safe(`Invent. compra: R$ ${fmtR(tCompra)}   Invent. custo: R$ ${fmtR(tCusto)}   Invent. venda: R$ ${fmtR(tVenda)}`),
    M,
    y,
  );
  y += 5;
  strokeLine(M, y, pageW - M, y, ENXUTO.black);
  y += 4;

  drawColumnHeader();

  if (prepared.mode === 'plana') {
    const list = prepared.produtos || [];
    if (!list.length) {
      drawRow(['Nenhum produto encontrado.', '—', '—', '—', '—', '—']);
    } else {
      list.forEach((p) => {
        const cat = getCatalogoComercialView(p);
        const nome = p.codigo_interno ? `${p.nome || '—'} ${p.codigo_interno}` : (p.nome || '—');
        drawRow([
          nome,
          printEstoqueCell(p),
          printPreco(cat.valorCompraNaEmbalagem),
          printPreco(cat.custoNaEmbalagem),
          printPreco(cat.precoVenda),
          produtoLastro(p) > 0 ? fmtR(produtoLastro(p)) : '—',
        ]);
      });
    }
  } else {
    const rows = prepared.rows || [];
    if (!rows.length) {
      drawRow(['Nenhum produto encontrado.', '—', '—', '—', '—', '—']);
    } else {
      rows.forEach((row) => {
        if (row.type === 'group') {
          const level = row.level ?? 1;
          const indentMm = Math.max(0, level - 1) * 2.5;
          drawRow(
            [
              `${row.label} (${row.count})`,
              printGroupEstoque(row),
              row.valorCompraMedio > 0 ? `~${fmtR(row.valorCompraMedio)}` : '—',
              row.custoMedio > 0 ? `~${fmtR(row.custoMedio)}` : '—',
              row.precoMedio > 0 ? `~${fmtR(row.precoMedio)}` : '—',
              row.lastroTotal > 0 ? fmtR(row.lastroTotal) : '—',
            ],
            { bold: true, indentMm },
          );
          return;
        }

        const p = row.produto;
        const cat = getCatalogoComercialView(p);
        const level = row.level ?? 1;
        const indentMm = Math.max(0, level - 1) * 2.5;
        const nome = p.codigo_interno ? `${p.nome || '—'} ${p.codigo_interno}` : (p.nome || '—');
        const lastro = row.lastro > 0 ? row.lastro : produtoLastro(p);
        drawRow(
          [
            nome,
            printEstoqueCell(p),
            printPreco(cat.valorCompraNaEmbalagem),
            printPreco(cat.custoNaEmbalagem),
            printPreco(cat.precoVenda),
            lastro > 0 ? fmtR(lastro) : '—',
          ],
          { indentMm },
        );
      });
    }
  }

  ensureSpace(14);
  y += 2;
  strokeLine(M, y, pageW - M, y, ENXUTO.black);
  y += 4;
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(META_FS);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Totais dos SKUs filtrados: estoque x valor de compra, custo total ou preco de venda.', M, y);
  doc.setTextColor(...ENXUTO.black);
  doc.text(`R$ ${fmtR(tCompra)}`, pageW - M, y, { align: 'right' });
  y += 3.6;
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Inventario (custo)', pageW - M - 42, y, { align: 'right' });
  doc.setTextColor(...ENXUTO.black);
  doc.text(`R$ ${fmtR(tCusto)}`, pageW - M, y, { align: 'right' });
  y += 3.6;
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Inventario (venda)', pageW - M - 42, y, { align: 'right' });
  doc.setTextColor(...ENXUTO.black);
  doc.text(`R$ ${fmtR(tVenda)}`, pageW - M, y, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');
  return { data: pdfBytes, version: 'enxuto' };
}
