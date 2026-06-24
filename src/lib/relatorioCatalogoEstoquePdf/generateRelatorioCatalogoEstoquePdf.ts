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

/** Espelho do enxuto de compras: embarque → ABCD, pedido → grupo, produto → SKU. */
const INDENT = {
  abcd: 0,
  abcdLine: 5,
  grupo: 7.5,
  produto: 14,
};

const FONT = {
  title: 13,
  kpi: 9.5,
  grupo: 10.5,
  grupoMeta: 8.5,
  grupoHdr: 9,
  grupoNome: 10,
  colHdr: 8.5,
  nome: 10,
  footer: 8.5,
};

/** Colunas por espaçamento (sem linhas verticais entre colunas). */
const COLS = {
  estoque: 2,
  unidade: 13,
  descricao: 22,
  vlCompra: 95,
  custo: 120,
  venda: 145,
  invent: 170,
};

const DESC_TO_VAL_GAP_MM = 12;
const VS = 1.12;

const fmtR = (n: number) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const safe = (text: unknown) => normalizePdfText(text);
const moeda = (valor = 0) => `R$ ${fmtR(Number(valor) || 0)}`;
const moedaSemSimbolo = (valor: number) => fmtR(Number(valor) || 0);
const moedaOuTraco = (valor: number) => (Number.isFinite(Number(valor)) && Number(valor) > 0 ? moedaSemSimbolo(valor) : '—');
const moedaOuTracoMuted = (valor: number, muted = true) => {
  const t = Number.isFinite(Number(valor)) && Number(valor) > 0 ? `~${moedaSemSimbolo(valor)}` : '—';
  return { text: t, muted };
};

function estoqueParts(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  if (apresent) {
    return { qtd: fmtN(apresent.quantidade), un: apresent.sigla };
  }
  return {
    qtd: fmtN(produto?.estoque_atual),
    un: String(produto?.unidade_principal || 'UN').toUpperCase(),
  };
}

function groupEstoqueParts(row) {
  if (row.estoqueTotal != null && row.estoqueTotal > 0) {
    return { qtd: fmtN(row.estoqueTotal), un: '' };
  }
  return { qtd: '—', un: '' };
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
  const M = 9;
  const CW = pageW - M * 2;

  let y = 16;

  const strokeEnxutoLine = (x0: number, y0: number, x1: number, y1: number, color = ENXUTO.line) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(ENXUTO_LINE_W);
    doc.line(x0, y0, x1, y1);
  };

  const strokeEnxutoBlackLine = (x0: number, y0: number, x1: number, y1: number) =>
    strokeEnxutoLine(x0, y0, x1, y1, ENXUTO.black);

  const drawVerticalSpan = (x: number, yStart: number, yEnd: number, startPage: number, endPage: number) => {
    const topPad = 14;
    const bottomPad = 10;
    const savedPage = doc.internal.getNumberOfPages();
    for (let page = startPage; page <= endPage; page += 1) {
      doc.setPage(page);
      const segTop = page === startPage ? yStart : topPad;
      const segBottom = page === endPage ? yEnd : pageH - bottomPad;
      if (segBottom > segTop + 0.5) {
        strokeEnxutoBlackLine(x, segTop, x, segBottom);
      }
    }
    doc.setPage(savedPage);
  };

  const ensureSpace = (needed = 12) => {
    if (y + needed > pageH - 10) {
      doc.addPage();
      y = 14;
    }
  };

  const tableXForLevel = (depth = 0) => M + INDENT.produto + Math.max(0, depth) * 3;
  const layoutForDepth = (depth = 0) => {
    const tableX = tableXForLevel(depth);
    const itemMl = tableX + 14;
    const nomeMaxW = Math.max(18, tableX + COLS.vlCompra - itemMl - DESC_TO_VAL_GAP_MM);
    return {
      tableX,
      itemMl,
      nomeMaxW,
      lineX: tableX + 11.5,
      qtdColRight: tableX + 10.5,
    };
  };

  const drawColumnHeaders = (tableX: number, baselineY: number) => {
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.colHdr);
    doc.setTextColor(...ENXUTO.muted);
    doc.text('EST.', tableX + COLS.estoque, baselineY);
    doc.text('UN', tableX + COLS.unidade, baselineY);
    doc.text('VL. COMPRA', tableX + COLS.vlCompra, baselineY, { align: 'right' });
    doc.text('CUSTO', tableX + COLS.custo, baselineY, { align: 'right' });
    doc.text('VENDA', tableX + COLS.venda, baselineY, { align: 'right' });
    doc.text('INVENT.', tableX + COLS.invent, baselineY, { align: 'right' });
  };

  const drawValueColumns = (
    tableX: number,
    baselineY: number,
    values: {
      vlCompra: string;
      custo: string;
      venda: string;
      invent: string;
    },
    { muted = false, fontSize = FONT.nome } = {},
  ) => {
    doc.setFont(pdfFontFamily, muted ? PDF_FONT_NORMAL : PDF_FONT_BOLD);
    doc.setFontSize(fontSize);
    doc.setTextColor(...(muted ? ENXUTO.faint : ENXUTO.black));
    doc.text(values.vlCompra, tableX + COLS.vlCompra, baselineY, { align: 'right' });
    doc.text(values.custo, tableX + COLS.custo, baselineY, { align: 'right' });
    doc.text(values.venda, tableX + COLS.venda, baselineY, { align: 'right' });
    doc.text(values.invent, tableX + COLS.invent, baselineY, { align: 'right' });
  };

  const measureSkuRow = (nome: string, depth = 0) => {
    const cfg = layoutForDepth(depth);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.nome);
    const nomeLinhas = doc.splitTextToSize(safe(nome), cfg.nomeMaxW);
    const nomeLineStep = 3.85 * VS;
    const nomeTop = 3.4 * VS;
    const rowBlockH = nomeTop + Math.max(0, nomeLinhas.length - 1) * nomeLineStep + 4.6 * VS + 1.2 * VS;
    return { cfg, nomeLinhas, nomeLineStep, nomeTop, rowBlockH };
  };

  const drawSkuRow = (
    produto,
    row: { level?: number; lastro?: number },
    depth = 0,
    y0: number,
  ) => {
    const cat = getCatalogoComercialView(produto);
    const { qtd, un } = estoqueParts(produto);
    const nome = produto?.nome || '—';
    const measured = measureSkuRow(nome, depth);
    const { cfg, nomeLinhas, nomeLineStep, nomeTop, rowBlockH } = measured;
    const branchY = y0 + 2.8 * VS;
    const valoresY = nomeTop;

    strokeEnxutoLine(cfg.lineX, y0, cfg.lineX, y0 + rowBlockH);
    strokeEnxutoLine(cfg.lineX, branchY, cfg.lineX + 2.4, branchY);

    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.nome);
    doc.setTextColor(...ENXUTO.black);
    doc.text(qtd, cfg.qtdColRight, y0 + nomeTop + 1.2, { align: 'right' });
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(un, cfg.qtdColRight, y0 + nomeTop + 4.6, { align: 'right' });

    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.nome);
    doc.setTextColor(...ENXUTO.black);
    nomeLinhas.forEach((line, li) => {
      doc.text(line, cfg.itemMl, y0 + nomeTop + li * nomeLineStep);
    });

    const lastro = produtoLastro(produto, row?.lastro);
    drawValueColumns(
      cfg.tableX,
      y0 + valoresY,
      {
        vlCompra: moedaOuTraco(cat.valorCompraNaEmbalagem),
        custo: moedaOuTraco(cat.custoNaEmbalagem),
        venda: moedaOuTraco(cat.precoVenda),
        invent: lastro > 0 ? moedaSemSimbolo(lastro) : '—',
      },
      { muted: false },
    );

    return rowBlockH;
  };

  const drawGroupRow = (row, depth = 0, y0: number) => {
    const cfg = layoutForDepth(depth);
    const rowH = 5.2 * VS;
    const baseline = y0 + 3.8;
    const grupoX = M + INDENT.grupo + Math.max(0, depth) * 3;
    const { qtd } = groupEstoqueParts(row);

    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.grupoNome);
    doc.setTextColor(...ENXUTO.black);
    const label = `${row.label || '—'} (${row.count ?? 0})`;
    const labelLines = doc.splitTextToSize(safe(label), cfg.nomeMaxW);
    doc.text(labelLines[0] || label, grupoX, baseline);

    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.grupoHdr);
    doc.setTextColor(...ENXUTO.faint);
    doc.text(qtd, cfg.qtdColRight, baseline, { align: 'right' });

    const vl = moedaOuTracoMuted(row.valorCompraMedio);
    const cu = moedaOuTracoMuted(row.custoMedio);
    const ve = moedaOuTracoMuted(row.precoMedio);
    const inv =
      row.lastroTotal > 0 ? { text: `~${moedaSemSimbolo(row.lastroTotal)}`, muted: true } : { text: '—', muted: true };

    drawValueColumns(
      cfg.tableX,
      baseline,
      { vlCompra: vl.text, custo: cu.text, venda: ve.text, invent: inv.text },
      { muted: true, fontSize: FONT.grupoHdr },
    );

    return rowH;
  };

  // ── Cabeçalho global ─────────────────────────────────────────────────────
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text('Relatorio de estoque — ENXUTO', M, y);
  y += 5.5;

  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(8);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('A4 compacto   agrupado por ABCD   mind map vertical   DIN 1451', M, y);
  y += 4.5;

  const modoLabel = documento.mode === 'plana' ? 'Lista plana' : 'Hierarquia';
  doc.setFontSize(8.8);
  doc.text(safe(`${modoLabel} · ${(produtos as unknown[])?.length ?? 0} SKU(s)`), M, y);
  y += 4.2;
  if (filtersSummary) {
    const filtros = doc.splitTextToSize(safe(filtersSummary), CW);
    doc.text(filtros[0] || '-', M, y);
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
  doc.text(`SKUs: ${(produtos as unknown[])?.length ?? 0}`, M, y);
  doc.text(`Invent. compra: ${moeda(tCompra)}`, M + 52, y);
  doc.text(`Invent. custo: ${moeda(tCusto)}`, M + 108, y);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(`Invent. venda: ${moeda(tVenda)}`, M + CW, y, { align: 'right' });
  y += 8;

  if (!documento.groups.length) {
    doc.setTextColor(...ENXUTO.muted);
    doc.text('Nenhum produto encontrado com os filtros actuais.', M, y);
  }

  for (const grupo of documento.groups) {
    ensureSpace(16);
    y += 3;
    const blockTop = y;
    const blockStartPage = doc.internal.getNumberOfPages();
    const abcdX = M + INDENT.abcd;

    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.grupo);
    doc.setTextColor(...ENXUTO.black);
    doc.text(safe(grupo.label), abcdX, y + 3.5);

    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.grupoMeta);
    doc.setTextColor(...ENXUTO.muted);
    doc.text(
      safe(`${grupo.produtos.length} SKU(s)   Invent.: ${moeda(grupo.totals.totalCusto)}`),
      M + CW,
      y + 3.5,
      { align: 'right' },
    );
    y += 8;

    const tableX = tableXForLevel(0);
    const colHdrY = y + 4.2;
    drawColumnHeaders(tableX, colHdrY);
    y += 8.5;

    const rows = grupo.rows || [];
    if (!rows.length) {
      ensureSpace(8);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(FONT.grupoMeta);
      doc.setTextColor(...ENXUTO.muted);
      doc.text('Nenhum item nesta classe.', M + INDENT.grupo, y);
      y += 6;
    } else {
      for (const row of rows) {
        if (row.type === 'group') {
          const depth = Math.max(0, (row.level ?? 1) - 1);
          const rowH = drawGroupRow(row, depth, y);
          ensureSpace(rowH);
          y += rowH;
          continue;
        }

        const p = row.produto;
        const depth = Math.max(0, (row.level ?? 1) - 1);
        const measured = measureSkuRow(p?.nome || '—', depth);
        ensureSpace(measured.rowBlockH + 2);
        const rowH = drawSkuRow(p, row, depth, y);
        y += rowH;
      }
    }

    const blockEndPage = doc.internal.getNumberOfPages();
    drawVerticalSpan(M + INDENT.abcdLine, blockTop, y, blockStartPage, blockEndPage);
    y += 6;
  }

  ensureSpace(12);
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.footer);
  doc.setTextColor(...ENXUTO.muted);
  doc.text('Totais filtrados — estoque x valor de compra, custo ou venda.', M, y);
  y += 4;
  doc.setTextColor(...ENXUTO.black);
  doc.text(`Compra: ${moeda(tCompra)}   Custo: ${moeda(tCusto)}   Venda: ${moeda(tVenda)}`, M, y);

  const pdfBytes = doc.output('arraybuffer');
  return { data: pdfBytes, version: 'enxuto_abcd' };
}
