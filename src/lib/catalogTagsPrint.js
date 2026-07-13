import { jsPDF } from 'jspdf';

export const CATALOG_TAG_WIDTH_MM = 43;
export const CATALOG_TAG_HEIGHT_MM = 48;
export const CATALOG_TAGS_PER_PAGE = 20;

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const COLUMNS = 4;
const ROWS = 5;
const GAP_MM = 4;
const GRID_WIDTH_MM = COLUMNS * CATALOG_TAG_WIDTH_MM + (COLUMNS - 1) * GAP_MM;
const GRID_HEIGHT_MM = ROWS * CATALOG_TAG_HEIGHT_MM + (ROWS - 1) * GAP_MM;
const START_X_MM = (A4_WIDTH_MM - GRID_WIDTH_MM) / 2;
const START_Y_MM = (A4_HEIGHT_MM - GRID_HEIGHT_MM) / 2;

export const getCatalogTagCode = (produto) => {
  const codigo = produto?.codigo_interno || produto?.codigo_barras || '';
  return String(codigo || '').trim();
};

export const getCatalogTagDescription = (produto) => {
  const descricao = produto?.nome || '';
  return String(descricao || '').trim();
};

const normalizePdfText = (value) =>
  String(value ?? '')
    .normalize('NFC')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...');

function fitDescription(doc, description, maxWidth) {
  let fontSize = 10.5;
  let lines = [];

  while (fontSize >= 7.5) {
    doc.setFontSize(fontSize);
    lines = doc.splitTextToSize(description, maxWidth);
    if (lines.length <= 4) break;
    fontSize -= 0.5;
  }

  if (lines.length > 4) {
    lines = lines.slice(0, 4);
    let lastLine = String(lines[3] || '');
    while (lastLine.length > 1 && doc.getTextWidth(`${lastLine}...`) > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[3] = `${lastLine.trimEnd()}...`;
  }

  return { fontSize, lines };
}

function drawCatalogTag(doc, produto, x, y) {
  const description = normalizePdfText(getCatalogTagDescription(produto) || 'SEM DESCRIÇÃO');
  const code = normalizePdfText(getCatalogTagCode(produto) || 'SEM CÓDIGO');
  const centerX = x + CATALOG_TAG_WIDTH_MM / 2;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, CATALOG_TAG_WIDTH_MM, CATALOG_TAG_HEIGHT_MM, 2.8, 2.8, 'S');

  doc.setDrawColor(100, 100, 100);
  doc.setLineDashPattern([0.7, 0.7], 0);
  doc.circle(centerX, y + 5, 1.65, 'S');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  const { fontSize, lines } = fitDescription(doc, description, CATALOG_TAG_WIDTH_MM - 7);
  const lineHeightMm = fontSize * 0.3528 * 1.12;
  const descriptionAreaTop = y + 12;
  const descriptionAreaHeight = 23;
  const textHeight = lines.length * lineHeightMm;
  const firstBaseline = descriptionAreaTop + (descriptionAreaHeight - textHeight) / 2 + lineHeightMm * 0.78;

  doc.setTextColor(17, 24, 39);
  doc.setFontSize(fontSize);
  lines.forEach((line, index) => {
    doc.text(String(line), centerX, firstBaseline + index * lineHeightMm, { align: 'center' });
  });

  doc.setDrawColor(205, 205, 205);
  doc.setLineWidth(0.15);
  doc.line(x + 6, y + 38, x + CATALOG_TAG_WIDTH_MM - 6, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  const codeText = `CÓD. ${code}`;
  const codeLines = doc.splitTextToSize(codeText, CATALOG_TAG_WIDTH_MM - 7).slice(0, 2);
  const codeStartY = codeLines.length > 1 ? y + 41.5 : y + 43;
  codeLines.forEach((line, index) => {
    doc.text(String(line), centerX, codeStartY + index * 3.2, { align: 'center' });
  });
}

export function generateCatalogTagsPdf({ products = [], filtrosResumo = '' } = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Nenhum produto para gerar etiquetas.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: 'Etiquetas do catálogo',
    subject: normalizePdfText(filtrosResumo || 'Produtos filtrados do catálogo'),
    creator: 'P38 ERP',
  });

  products.forEach((produto, index) => {
    if (index > 0 && index % CATALOG_TAGS_PER_PAGE === 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageIndex = index % CATALOG_TAGS_PER_PAGE;
    const column = pageIndex % COLUMNS;
    const row = Math.floor(pageIndex / COLUMNS);
    const x = START_X_MM + column * (CATALOG_TAG_WIDTH_MM + GAP_MM);
    const y = START_Y_MM + row * (CATALOG_TAG_HEIGHT_MM + GAP_MM);
    drawCatalogTag(doc, produto, x, y);
  });

  return doc.output('blob');
}
