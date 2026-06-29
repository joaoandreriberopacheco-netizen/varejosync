import { jsPDF } from "jspdf";
import { registerJsPdfDin1451Fonts, normalizePdfText } from "@/lib/jspdfNotoFont";
import { formatEstoqueApresentacao, getCatalogoComercialView } from "@/lib/productUnits";
import { roundToTwoDecimals } from "@/lib/financialUtils";
import { prepareCatalogStockReportDocument } from "./prepareCatalogStockReportRows";
const PDF_FONT_BOLD = "bold";
const PDF_FONT_NORMAL = "normal";
const ENXUTO_LINE_W = 0.12;
const ROW_RULE_W = 0.07;
const ENXUTO = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  rowRule: [210, 210, 210]
};
const FONT = {
  title: 13,
  kpi: 9.8,
  colHdr: 7.6,
  row: 9,
  footer: 9
};
const DESC_LINE_LEAD = 4.5;
const COL_HDR_BLOCK = 9;
const TABLE_TOP_CONTINUATION = 14;
const fmtR = (n) => (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;
const safe = (text) => normalizePdfText(text);
const moeda = (valor = 0) => `R$ ${fmtR(Number(valor) || 0)}`;
const moedaSemSimbolo = (valor) => fmtR(Number(valor) || 0);
const moedaOuTraco = (valor) => Number.isFinite(Number(valor)) && Number(valor) > 0 ? moedaSemSimbolo(valor) : "\u2014";
function quantidadeComercial(produto) {
  const apresent = formatEstoqueApresentacao(produto);
  if (apresent) {
    return {
      quantidade: apresent.quantidade,
      texto: `${fmtN(apresent.quantidade)} ${apresent.sigla}`
    };
  }
  const qtd = Number(produto?.estoque_atual) || 0;
  const un = String(produto?.unidade_principal || "UN").toUpperCase();
  return { quantidade: qtd, texto: `${fmtN(qtd)} ${un}` };
}
function linhaComercialPdf(produto) {
  const cat = getCatalogoComercialView(produto);
  const { quantidade, texto: quantTexto } = quantidadeComercial(produto);
  const vCompra = roundToTwoDecimals(cat.valorCompraNaEmbalagem);
  const custoCalc = roundToTwoDecimals(cat.custoNaEmbalagem);
  const custosExtras = roundToTwoDecimals(custoCalc - vCompra);
  const custoTotal = roundToTwoDecimals(quantidade * custoCalc);
  const preco = roundToTwoDecimals(cat.precoVenda);
  const vendaTotal = roundToTwoDecimals(quantidade * preco);
  return {
    quantTexto,
    vCompra,
    custosExtras,
    custoCalc,
    custoTotal,
    markup: cat.markupSobreCustoPct,
    preco,
    vendaTotal
  };
}
function splitDescriptionLines(doc, pdfFontFamily, text, maxW) {
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(FONT.row);
  const lines = doc.splitTextToSize(safe(text), maxW);
  return lines.length ? lines : [""];
}
async function generateRelatorioCatalogoEstoquePdf(payload = {}) {
  const {
    produtos = [],
    filters_summary: filtersSummary = "",
    totals = {},
    layout_mode: layoutMode = "tree",
    tree_level: treeLevel = 1,
    sort_order: sortOrder = "az",
    group_by_category: groupByCategory = false,
    generated_at: generatedAt = (/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
  } = payload;
  const documento = prepareCatalogStockReportDocument({
    produtos,
    layoutMode,
    treeLevel: Number(treeLevel) || 1,
    sortOrder,
    groupByCategory: Boolean(groupByCategory)
  });
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pdfFontFamily = await registerJsPdfDin1451Fonts(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 6;
  const CW = pageW - M * 2;
  const QUANT_COL_W = 17;
  const GUTTER_W = 5;
  const descStart = M + 4;
  const vendRight = M + CW;
  const quantRight = M + 90;
  const quantLeft = quantRight - QUANT_COL_W;
  const descEnd = quantLeft - GUTTER_W;
  const divider = descEnd + GUTTER_W / 2;
  const VALUE_COL_STEP = (vendRight - quantRight) / 7;
  const valueColX = (index) => quantRight + VALUE_COL_STEP * (index + 1);
  const X = {
    desc: descStart,
    divider,
    quant: quantRight,
    vCompra: valueColX(0),
    custos: valueColX(1),
    soma: valueColX(2),
    custoTot: valueColX(3),
    markup: valueColX(4),
    preco: valueColX(5),
    vendTot: vendRight
  };
  const ROW_H = 6.1;
  const ROW_GAP = 1.15;
  const ROW_STEP = ROW_H + ROW_GAP;
  const BASELINE_RATIO = 0.72;
  const CATEGORY_AREA_GAP = 4.2;
  const CATEGORY_DESC_INDENT = 1.8;
  const SKU_DESC_INDENT = 5.5;
  let y = 16;
  let dividerStartY = 0;
  let dividerStartPage = 1;
  const strokeLine = (x0, y0, x1, y1, color = ENXUTO.line, width = ENXUTO_LINE_W) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x0, y0, x1, y1);
  };
  const drawRowSeparator = (yLine) => {
    strokeLine(descStart, yLine, vendRight, yLine, ENXUTO.rowRule, ROW_RULE_W);
  };
  const drawVerticalDivider = (x, yStart, yEnd, startPage, endPage) => {
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
  const drawColumnHeaders = (topY) => {
    const line1 = topY + 3.2;
    const line2 = topY + 6.8;
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.colHdr);
    doc.setTextColor(...ENXUTO.muted);
    doc.text("QUANT", X.quant, line1, { align: "right" });
    doc.text("V.COMPRA", X.vCompra, line1, { align: "right" });
    doc.text("CUSTOS", X.custos, line1, { align: "right" });
    doc.text("SOMA", X.soma, line1, { align: "right" });
    doc.text("C.TOTAL", X.custoTot, line1, { align: "right" });
    doc.text("MK%", X.markup, line1, { align: "right" });
    doc.text("PRECO", X.preco, line1, { align: "right" });
    doc.text("V.TOTAL", X.vendTot, line1, { align: "right" });
    doc.setFontSize(FONT.colHdr - 0.4);
    doc.text("frete+", X.custos, line2, { align: "right" });
    doc.text("calc.", X.soma, line2, { align: "right" });
    doc.text("qtdxc", X.custoTot, line2, { align: "right" });
    doc.text("venda", X.preco, line2, { align: "right" });
    doc.text("qtdxp", X.vendTot, line2, { align: "right" });
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
  const descMaxW = (descX = X.desc) => Math.max(20, descEnd - descX - 1);
  const rowBaselines = (drawY, lineCount, extraH) => {
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
      descFirstBaseline: midY - descSpan / 2 + textLift * 0.35
    };
  };
  const drawValueColumns = (baselineY, vals) => {
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...ENXUTO.black);
    doc.text(vals.quantTexto, X.quant, baselineY, { align: "right" });
    doc.text(moedaOuTraco(vals.vCompra), X.vCompra, baselineY, { align: "right" });
    doc.text(moedaOuTraco(vals.custosExtras), X.custos, baselineY, { align: "right" });
    doc.text(moedaOuTraco(vals.custoCalc), X.soma, baselineY, { align: "right" });
    doc.text(vals.custoTotal > 0 ? moedaSemSimbolo(vals.custoTotal) : "\u2014", X.custoTot, baselineY, {
      align: "right"
    });
    doc.text(
      vals.markup > 0 && vals.preco > 0 ? fmtPct(vals.markup) : "\u2014",
      X.markup,
      baselineY,
      { align: "right" }
    );
    doc.text(moedaOuTraco(vals.preco), X.preco, baselineY, { align: "right" });
    doc.text(vals.vendaTotal > 0 ? moedaSemSimbolo(vals.vendaTotal) : "\u2014", X.vendTot, baselineY, {
      align: "right"
    });
  };
  const drawSkuRow = (y0, descricao, vals, descX = X.desc) => {
    const descLines = splitDescriptionLines(doc, pdfFontFamily, descricao, descMaxW(descX));
    const lineCount = descLines.length;
    const extraH = (lineCount - 1) * DESC_LINE_LEAD;
    const rowStep = ROW_STEP + extraH;
    y = y0;
    ensureTableSpace(rowStep + 1);
    const drawY = y;
    const { valuesBaseline, descFirstBaseline } = rowBaselines(drawY, lineCount, extraH);
    drawValueColumns(valuesBaseline, vals);
    doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
    doc.setTextColor(...ENXUTO.black);
    for (let i = 0; i < lineCount; i += 1) {
      doc.text(descLines[i], descX, descFirstBaseline + i * DESC_LINE_LEAD);
    }
    drawRowSeparator(drawY + rowStep - ROW_GAP * 0.35);
    return drawY + rowStep;
  };
  const subtotalVals = (catTotals) => {
    const totalCompra = roundToTwoDecimals(Number(catTotals?.totalCompra) || 0);
    const totalCusto = roundToTwoDecimals(Number(catTotals?.totalCusto) || 0);
    const totalVenda = roundToTwoDecimals(Number(catTotals?.totalVenda) || 0);
    const count = Number(catTotals?.count) || 0;
    return {
      quantTexto: count > 0 ? `${count} SKU(s)` : "\u2014",
      vCompra: 0,
      custosExtras: 0,
      custoCalc: 0,
      custoTotal: totalCusto,
      markup: 0,
      preco: 0,
      vendaTotal: totalVenda,
      inventarioCompra: totalCompra
    };
  };
  const drawCategoryGroupRow = (y0, label, catTotals, { addTopGap = false } = {}) => {
    y = y0;
    if (addTopGap) {
      y += CATEGORY_AREA_GAP;
    }
    ensureTableSpace(ROW_STEP + 1);
    const drawY = y;
    const baseline = drawY + ROW_H * BASELINE_RATIO;
    const vals = subtotalVals(catTotals);
    const categoryDescX = X.desc + CATEGORY_DESC_INDENT;
    drawValueColumns(baseline, vals);
    doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
    doc.setFontSize(FONT.row);
    doc.setTextColor(...ENXUTO.black);
    doc.text(safe(label), categoryDescX, baseline);
    drawRowSeparator(drawY + ROW_STEP - ROW_GAP * 0.35);
    return drawY + ROW_STEP;
  };
  doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
  doc.setFontSize(FONT.title);
  doc.setTextColor(...ENXUTO.black);
  doc.text("Relatorio de estoque \u2014 ENXUTO", M, y);
  y += 5.5;
  doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
  doc.setFontSize(8);
  doc.setTextColor(...ENXUTO.muted);
  doc.text("A4   SKUs A-Z   custo e venda por quantidade   DIN 1451", M, y);
  y += 4.5;
  if (documento.groupByCategory) {
    doc.text("Agrupado por categoria \xB7 totais na linha da \xE1rea \xB7 layout v7", M, y);
    y += 4.2;
  }
  doc.setFontSize(8.8);
  doc.text(safe(`${produtos?.length ?? 0} SKU(s)`), M, y);
  y += 4.2;
  if (filtersSummary) {
    doc.text(doc.splitTextToSize(safe(filtersSummary), CW)[0] || "-", M, y);
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
  doc.text(`Invent. custo: ${moeda(tCusto)}`, M + 62, y);
  doc.setTextColor(...ENXUTO.muted);
  doc.text(`Invent. venda: ${moeda(tVenda)}`, M + CW, y, { align: "right" });
  y += 8;
  if (!documento.rows?.length) {
    doc.setTextColor(...ENXUTO.muted);
    doc.text("Nenhum produto encontrado com os filtros actuais.", M, y);
  } else {
    dividerStartPage = doc.internal.getNumberOfPages();
    dividerStartY = y;
    beginTablePage();
    let categoryIndex = 0;
    for (const row of documento.rows) {
      if (row.type === "group") {
        y = drawCategoryGroupRow(
          y,
          String(row.label || "Sem categoria"),
          row.totals || {},
          { addTopGap: categoryIndex > 0 }
        );
        categoryIndex += 1;
        continue;
      }
      if (row.type === "category_subtotal") continue;
      if (row.type !== "sku") continue;
      const p = row.produto;
      const nome = p?.codigo_interno ? `${p.nome || "\u2014"}  ${p.codigo_interno}` : p.nome || "\u2014";
      const vals = linhaComercialPdf(p);
      const skuDescX = documento.groupByCategory ? X.desc + SKU_DESC_INDENT : X.desc;
      y = drawSkuRow(y, nome, vals, skuDescX);
    }
    drawVerticalDivider(
      X.divider,
      dividerStartY,
      y,
      dividerStartPage,
      doc.internal.getNumberOfPages()
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
  doc.text("Totais filtrados \u2014 estoque x valor de compra, custo ou venda.", M, y);
  y += 4;
  doc.setTextColor(...ENXUTO.black);
  doc.text(`Compra: ${moeda(tCompra)}   Custo: ${moeda(tCusto)}   Venda: ${moeda(tVenda)}`, M, y);
  const pdfBytes = doc.output("arraybuffer");
  return { data: pdfBytes, version: "enxuto_colunas_custo_venda_v7_categoria_header" };
}
export {
  generateRelatorioCatalogoEstoquePdf
};
