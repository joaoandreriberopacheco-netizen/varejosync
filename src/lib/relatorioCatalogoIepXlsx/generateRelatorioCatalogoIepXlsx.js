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
    { header: 'LUCRO 90D (R$)', key: 'lucro_90d', width: 14 },
    { header: 'LUCRO REF GLOBAL (R$)', key: 'lucro_ref', width: 19 },
    { header: 'LUCRO TOTAL GLOBAL 90D (R$)', key: 'lucro_total_global', width: 21 },
    { header: 'PART LUCRO GLOBAL %', key: 'part_lucro_global_pct', width: 16 },
    { header: 'LUCRO NORM', key: 'lucro_norm', width: 10 },
    { header: 'PART NORM', key: 'part_norm', width: 10 },
    { header: 'PESO LUCRO', key: 'peso_lucro', width: 10 },
    { header: 'PESO PART', key: 'peso_part', width: 10 },
    { header: 'CONTR LUCRO', key: 'contr_lucro', width: 11 },
    { header: 'CONTR PART', key: 'contr_part', width: 11 },
    { header: 'SCORE BASE', key: 'score_base', width: 11 },
    { header: 'COEF CONFIANÇA', key: 'coef_conf', width: 14 },
    { header: 'CONF. ÍNDICE', key: 'conf_idx', width: 11 },
    { header: 'CONF. SIMB', key: 'conf_simb', width: 10 },
    { header: 'QTD 90D (VITRINE)', key: 'qtd_vitrine', width: 18 },
    { header: 'UN VITRINE', key: 'un_vitrine', width: 12 },
    { header: 'PEDIDOS 90D', key: 'pedidos_90d', width: 12 },
    { header: 'SEMANAS ATIVAS', key: 'semanas_ativas', width: 14 },
    { header: 'CONC. MAIOR PEDIDO %', key: 'conc_maior_pedido_pct', width: 18 },
    { header: 'MOV. CONTEXTUAL', key: 'mov_contextual', width: 14 },
    { header: 'LIMITE MOV Q1', key: 'mov_q1', width: 12 },
    { header: 'LIMITE MOV Q3', key: 'mov_q3', width: 12 },
    { header: 'COMP PED', key: 'comp_ped', width: 10 },
    { header: 'COMP SEM', key: 'comp_sem', width: 10 },
    { header: 'COMP MOV', key: 'comp_mov', width: 10 },
    { header: 'COMP CONC', key: 'comp_conc', width: 11 },
    { header: 'COMP QTD', key: 'comp_qtd', width: 10 },
    { header: 'M.N2', key: 'n2', width: 10 },
  ];

  ws.addRow([safe(`Curva ABC / IEP · ${generatedAt}`)]);
  ws.addRow([safe(`IEP auditável: bruto + referência + coeficiente + componentes · Perfis: TOP, ESP, NEU, CAR${filtersSummary ? ` · Filtros: ${filtersSummary}` : ''}`)]);

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
    const memoria = produto?.iep_memoria_confianca || {};
    const comp = memoria?.componentes || {};
    const limites = memoria?.limitesMovimento || {};
    const memoriaIndice = produto?.iep_memoria_indice || {};
    const ind = memoriaIndice?.indicadores || {};
    const lucroIdx = ind?.lucroRelativo || {};
    const partIdx = ind?.participacaoGlobal || {};
    ws.addRow({
      produto: safe(produto?.nome || '—'),
      abc: abcdText(produto?.abcd),
      iep: iepDisplayText(produto),
      perfil: perfilText(produto?.iep_codigo_comportamento),
      lucro_90d: Number.isFinite(Number(produto?.iep_lucro_90d)) ? Number(produto?.iep_lucro_90d) : null,
      lucro_ref: Number.isFinite(Number(produto?.iep_lucro_ref_global)) ? Number(produto?.iep_lucro_ref_global) : null,
      lucro_total_global:
        Number.isFinite(Number(produto?.iep_lucro_total_global_90d)) ? Number(produto?.iep_lucro_total_global_90d) : null,
      part_lucro_global_pct:
        Number.isFinite(Number(produto?.iep_participacao_lucro_pct)) ? Number(produto?.iep_participacao_lucro_pct) : null,
      lucro_norm: Number.isFinite(Number(lucroIdx?.normalizado)) ? Number(lucroIdx?.normalizado) : null,
      part_norm: Number.isFinite(Number(partIdx?.normalizado)) ? Number(partIdx?.normalizado) : null,
      peso_lucro: Number.isFinite(Number(lucroIdx?.peso)) ? Number(lucroIdx?.peso) : null,
      peso_part: Number.isFinite(Number(partIdx?.peso)) ? Number(partIdx?.peso) : null,
      contr_lucro: Number.isFinite(Number(lucroIdx?.contribuicao)) ? Number(lucroIdx?.contribuicao) : null,
      contr_part: Number.isFinite(Number(partIdx?.contribuicao)) ? Number(partIdx?.contribuicao) : null,
      score_base: Number.isFinite(Number(produto?.iep_score_base)) ? Math.round(Number(produto?.iep_score_base)) : null,
      coef_conf: Number.isFinite(Number(produto?.iep_coef_confianca)) ? Number(produto?.iep_coef_confianca) : null,
      conf_idx: Number.isFinite(Number(produto?.iep_confianca_indice)) ? Number(produto?.iep_confianca_indice) : null,
      conf_simb: safe(produto?.iep_confianca_simbolo || '—'),
      qtd_vitrine:
        Number.isFinite(Number(produto?.iep_quantidade_vitrine_90d))
          ? Number(produto?.iep_quantidade_vitrine_90d)
          : null,
      un_vitrine: safe(produto?.iep_unidade_vitrine || '—'),
      pedidos_90d: Number.isFinite(Number(memoria?.pedidos)) ? Number(memoria?.pedidos) : null,
      semanas_ativas: Number.isFinite(Number(memoria?.semanas)) ? Number(memoria?.semanas) : null,
      conc_maior_pedido_pct:
        Number.isFinite(Number(memoria?.maxPedidoSharePct)) ? Number(memoria?.maxPedidoSharePct) : null,
      mov_contextual:
        Number.isFinite(Number(memoria?.movimentoContextual)) ? Number(memoria?.movimentoContextual) : null,
      mov_q1: Number.isFinite(Number(limites?.low)) ? Number(limites?.low) : null,
      mov_q3: Number.isFinite(Number(limites?.high)) ? Number(limites?.high) : null,
      comp_ped: Number.isFinite(Number(comp?.pedidosNorm)) ? Number(comp?.pedidosNorm) : null,
      comp_sem: Number.isFinite(Number(comp?.semanasNorm)) ? Number(comp?.semanasNorm) : null,
      comp_mov: Number.isFinite(Number(comp?.movimentoContextual)) ? Number(comp?.movimentoContextual) : null,
      comp_conc: Number.isFinite(Number(comp?.concentracaoNorm)) ? Number(comp?.concentracaoNorm) : null,
      comp_qtd: Number.isFinite(Number(comp?.quantidadeNorm)) ? Number(comp?.quantidadeNorm) : null,
      n2: Number.isFinite(Number(produto?.iep_score_nivel_2)) ? Math.round(Number(produto?.iep_score_nivel_2)) : null,
    });
  }

  for (let i = 4; i <= ws.rowCount; i += 1) {
    const row = ws.getRow(i);
    row.getCell('A').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('B').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('C').alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell('D').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('E').alignment = { vertical: 'middle', horizontal: 'right' }; // lucro 90d
    row.getCell('F').alignment = { vertical: 'middle', horizontal: 'right' }; // lucro ref
    row.getCell('G').alignment = { vertical: 'middle', horizontal: 'right' }; // lucro total global
    row.getCell('H').alignment = { vertical: 'middle', horizontal: 'right' }; // participação global
    row.getCell('I').alignment = { vertical: 'middle', horizontal: 'right' }; // lucro norm
    row.getCell('J').alignment = { vertical: 'middle', horizontal: 'right' }; // part norm
    row.getCell('K').alignment = { vertical: 'middle', horizontal: 'right' }; // peso lucro
    row.getCell('L').alignment = { vertical: 'middle', horizontal: 'right' }; // peso part
    row.getCell('M').alignment = { vertical: 'middle', horizontal: 'right' }; // contrib lucro
    row.getCell('N').alignment = { vertical: 'middle', horizontal: 'right' }; // contrib part
    row.getCell('O').alignment = { vertical: 'middle', horizontal: 'right' }; // score base
    row.getCell('P').alignment = { vertical: 'middle', horizontal: 'right' }; // coef
    row.getCell('Q').alignment = { vertical: 'middle', horizontal: 'right' }; // conf idx
    row.getCell('R').alignment = { vertical: 'middle', horizontal: 'center' }; // conf simb
    row.getCell('S').alignment = { vertical: 'middle', horizontal: 'right' }; // qtd vitrine
    row.getCell('T').alignment = { vertical: 'middle', horizontal: 'center' }; // un vitrine
    row.getCell('U').alignment = { vertical: 'middle', horizontal: 'right' }; // pedidos
    row.getCell('V').alignment = { vertical: 'middle', horizontal: 'right' }; // semanas
    row.getCell('W').alignment = { vertical: 'middle', horizontal: 'right' }; // concentração
    row.getCell('X').alignment = { vertical: 'middle', horizontal: 'right' }; // mov contextual
    row.getCell('Y').alignment = { vertical: 'middle', horizontal: 'right' }; // q1
    row.getCell('Z').alignment = { vertical: 'middle', horizontal: 'right' }; // q3
    row.getCell('AA').alignment = { vertical: 'middle', horizontal: 'right' }; // comp ped
    row.getCell('AB').alignment = { vertical: 'middle', horizontal: 'right' }; // comp sem
    row.getCell('AC').alignment = { vertical: 'middle', horizontal: 'right' }; // comp mov
    row.getCell('AD').alignment = { vertical: 'middle', horizontal: 'right' }; // comp conc
    row.getCell('AE').alignment = { vertical: 'middle', horizontal: 'right' }; // comp qtd
    row.getCell('AF').alignment = { vertical: 'middle', horizontal: 'right' }; // n2
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    data: buffer,
    version: CATALOG_IEP_XLSX_BUILD,
    rowCount: rows.length,
  };
}
