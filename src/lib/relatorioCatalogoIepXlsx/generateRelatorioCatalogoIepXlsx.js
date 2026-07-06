import ExcelJS from 'exceljs';
import { normalizePdfText } from '@/lib/jspdfNotoFont';
import { enrichProdutosComIep } from '@/lib/calcularIepProdutos';
import { compareProdutosForCatalogSort } from '@/lib/catalogProdutoPerformance';

const safe = (text) => normalizePdfText(text);

export const CATALOG_IEP_XLSX_BUILD = 'curva_abc_iep_xlsx_v1';

function iepDisplayText(produto) {
  const explicit = String(produto?.iep_score_exibicao || '').trim();
  if (explicit) return explicit;
  const num = Number(produto?.iep_score);
  if (!Number.isFinite(num)) return '—';
  const suffix = String(produto?.iep_confianca_simbolo || '').trim();
  return `${Math.round(num)}${suffix}`;
}

function abcdText(letter) {
  const value = String(letter || '').toUpperCase().trim();
  return value || '—';
}

function perfilText(value) {
  const code = String(value || '').toUpperCase().trim();
  return code || '—';
}

export function prepareCatalogIepReportRows(produtos = [], pedidos = [], sortOrder = 'iep_score_desc') {
  const list = (produtos || []).filter((p) => p && typeof p === 'object');
  const enriched = enrichProdutosComIep(list, pedidos || []);
  return [...enriched].sort((a, b) => compareProdutosForCatalogSort(a, b, sortOrder));
}

export async function generateRelatorioCatalogoIepXlsx(payload = {}) {
  const {
    produtos = [],
    pedidos = [],
    filters_summary: filtersSummary = '',
    sort_order: sortOrder = 'iep_score_desc',
    generated_at: generatedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  } = payload;

  const rows = prepareCatalogIepReportRows(produtos, pedidos, sortOrder);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'VarejoSync';
  const ws = wb.addWorksheet('Curva_ABC_IEP', { views: [{ state: 'frozen', ySplit: 3 }] });

  ws.columns = [
    { header: 'PRODUTO', key: 'produto', width: 44 },
    { header: 'ABC', key: 'abc', width: 8 },
    { header: 'IEP', key: 'iep', width: 10 },
    { header: 'PERFIL', key: 'perfil', width: 10 },
    { header: 'QTD 90D (VITRINE)', key: 'qtd_vitrine', width: 18 },
    { header: 'UN VITRINE', key: 'un_vitrine', width: 12 },
    { header: 'M.N2', key: 'n2', width: 10 },
  ];

  ws.addRow([safe(`Curva ABC / IEP · ${generatedAt}`)]);
  ws.addRow([safe(`IEP: score com confiabilidade (++/+/-) · Perfis: TOP, ESP, NEU, CAR${filtersSummary ? ` · Filtros: ${filtersSummary}` : ''}`)]);

  const headerRow = ws.getRow(3);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF374151' } },
      left: { style: 'thin', color: { argb: 'FF374151' } },
      bottom: { style: 'thin', color: { argb: 'FF374151' } },
      right: { style: 'thin', color: { argb: 'FF374151' } },
    };
  });

  for (const produto of rows) {
    ws.addRow({
      produto: safe(produto?.nome || '—'),
      abc: abcdText(produto?.abcd),
      iep: iepDisplayText(produto),
      perfil: perfilText(produto?.iep_codigo_comportamento),
      qtd_vitrine:
        Number.isFinite(Number(produto?.iep_quantidade_vitrine_90d))
          ? Number(produto?.iep_quantidade_vitrine_90d)
          : null,
      un_vitrine: safe(produto?.iep_unidade_vitrine || '—'),
      n2: Number.isFinite(Number(produto?.iep_score_nivel_2)) ? Math.round(Number(produto?.iep_score_nivel_2)) : null,
    });
  }

  for (let i = 4; i <= ws.rowCount; i += 1) {
    const row = ws.getRow(i);
    row.getCell('A').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('B').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('C').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('D').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('E').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('F').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('G').alignment = { vertical: 'middle', horizontal: 'right' };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    data: buffer,
    version: CATALOG_IEP_XLSX_BUILD,
    rowCount: rows.length,
  };
}
