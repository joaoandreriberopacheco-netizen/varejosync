import { jsPDF } from 'jspdf';
import { normalizePdfText, registerJsPdfNotoFonts } from '@/lib/jspdfNotoFont';
import {
  calcularRelatorioFolhaPorCentroCusto,
  formatCompetenciaLabel,
  formatCurrency,
} from '@/lib/folhaPrevisaoCalculos';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_MM = 14;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
const BLACK = [0, 0, 0];
const GRAY = [80, 80, 80];

const FONT_TITLE = 15;
const FONT_SUBTITLE = 9;
const FONT_SECTION = 11;
const FONT_HEADER = 8.5;
const FONT_BODY = 9;
const FONT_TOTAL = 9.5;

const LINE_H = 4.8;
const LINE_H_SECTION = 6.5;
const GAP_SECTION = 5;

const COL_NOME_W = 92;
const COL_TIPO_W = 28;
const COL_VALOR_W = CONTENT_W_MM - COL_NOME_W - COL_TIPO_W;

function ensurePageSpace(doc, y, neededMm) {
  if (y + neededMm <= PAGE_H_MM - MARGIN_MM) return y;
  doc.addPage('a4', 'portrait');
  return MARGIN_MM;
}

function drawTableHeader(doc, fontFamily, y) {
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(FONT_HEADER);
  doc.setTextColor(...GRAY);
  doc.text('Nome', MARGIN_MM, y);
  doc.text('Tipo', MARGIN_MM + COL_NOME_W, y);
  doc.text('Média/mês', MARGIN_MM + COL_NOME_W + COL_TIPO_W + COL_VALOR_W, y, { align: 'right' });
  y += LINE_H * 0.6;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_MM, y, MARGIN_MM + CONTENT_W_MM, y);
  return y + LINE_H;
}

function drawPersonRow(doc, fontFamily, y, pessoa) {
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(FONT_BODY);
  doc.setTextColor(...BLACK);

  const nome = normalizePdfText(pessoa.nome);
  const tipo = normalizePdfText(pessoa.tipoLabel);
  const valor = formatCurrency(pessoa.mediaMensal);

  const nomeLines = doc.splitTextToSize(nome, COL_NOME_W - 2);
  const rowH = Math.max(LINE_H, nomeLines.length * LINE_H);

  doc.text(nomeLines, MARGIN_MM, y);
  doc.text(tipo, MARGIN_MM + COL_NOME_W, y);
  doc.text(valor, MARGIN_MM + COL_NOME_W + COL_TIPO_W + COL_VALOR_W, y, { align: 'right' });

  return y + rowH;
}

function drawSubtotalRow(doc, fontFamily, y, label, valor) {
  y += 1;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.15);
  doc.line(MARGIN_MM + COL_NOME_W, y - 1.5, MARGIN_MM + CONTENT_W_MM, y - 1.5);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(FONT_TOTAL);
  doc.setTextColor(...BLACK);
  doc.text(normalizePdfText(label), MARGIN_MM + COL_NOME_W, y);
  doc.text(formatCurrency(valor), MARGIN_MM + CONTENT_W_MM, y, { align: 'right' });
  return y + LINE_H_SECTION;
}

export async function generateFolhaPessoasPorCentroPdf({
  modelos = [],
  centrosRegistrados = [],
  colaboradoresMap = {},
  competenciaInicio = null,
  filtroVinculoLabel = 'Todos',
  filtrarModelo = null,
  meses = 12,
  relatorio: relatorioInformado = null,
  titulo = 'Folha — Relatório por centro de custo',
  avisoSimulacao = false,
  comparativo = null,
} = {}) {
  const relatorio =
    relatorioInformado ||
    calcularRelatorioFolhaPorCentroCusto({
      modelos,
      centrosRegistrados,
      colaboradoresMap,
      competenciaInicio,
      meses,
      filtrarModelo,
    });

  if (!relatorio.secoes.length) {
    throw new Error(
      avisoSimulacao
        ? 'Nenhuma pessoa restou na simulação para gerar o PDF.'
        : 'Nenhuma pessoa cadastrada para gerar o PDF.',
    );
  }

  const geradoEm = new Date().toLocaleString('pt-BR');
  const periodoLabel = `${formatCompetenciaLabel(relatorio.competenciaInicio)} → ${formatCompetenciaLabel(
    (() => {
      const [y, m] = relatorio.competenciaInicio.split('-').map(Number);
      const d = new Date(y, m - 1 + relatorio.meses - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })(),
  )}`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: normalizePdfText(titulo),
    subject: avisoSimulacao
      ? 'Simulação de cortes e reduções (não altera cadastro)'
      : `Média mensal em ${meses} meses (${filtroVinculoLabel})`,
    creator: 'P38 ERP',
  });

  const fontFamily = await registerJsPdfNotoFonts(doc);
  let y = MARGIN_MM;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(...BLACK);
  doc.text(normalizePdfText(titulo), MARGIN_MM, y);
  y += LINE_H_SECTION + 1;

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(FONT_SUBTITLE);
  doc.setTextColor(...GRAY);
  if (avisoSimulacao) {
    doc.text('SIMULAÇÃO — não altera o cadastro real da folha', MARGIN_MM, y);
    y += LINE_H;
  }
  doc.text(
    `Projeção ${relatorio.meses} meses (${periodoLabel}) · ${relatorio.resumo.totalPessoas} pessoa(s)`,
    MARGIN_MM,
    y,
  );
  y += LINE_H;
  doc.text(`Gerado em ${normalizePdfText(geradoEm)}`, MARGIN_MM, y);
  y += LINE_H;
  if (!relatorioInformado && !avisoSimulacao) {
    doc.text(`Filtro: ${normalizePdfText(filtroVinculoLabel)}`, MARGIN_MM, y);
    y += LINE_H;
  }

  if (comparativo) {
    const linhasComp = [
      comparativo.totalAntes != null
        ? `Média mensal antes: ${formatCurrency(comparativo.totalAntes)}`
        : null,
      comparativo.economiaMensal > 0
        ? `Economia mensal estimada: ${formatCurrency(comparativo.economiaMensal)}`
        : null,
      comparativo.pessoasCortadas > 0
        ? `Pessoas cortadas na simulação: ${comparativo.pessoasCortadas}`
        : null,
      comparativo.pessoasAntes != null && comparativo.pessoasDepois != null
        ? `Equipe: ${comparativo.pessoasAntes} → ${comparativo.pessoasDepois}`
        : null,
    ].filter(Boolean);
    for (const linha of linhasComp) {
      doc.text(normalizePdfText(linha), MARGIN_MM, y);
      y += LINE_H;
    }
  }

  y += LINE_H_SECTION;

  for (const secao of relatorio.secoes) {
    y = ensurePageSpace(doc, y, LINE_H_SECTION + LINE_H * 2);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(FONT_SECTION);
    doc.setTextColor(...BLACK);
    doc.text(normalizePdfText(secao.titulo), MARGIN_MM, y);
    y += LINE_H_SECTION;

    y = ensurePageSpace(doc, y, LINE_H * 2);
    y = drawTableHeader(doc, fontFamily, y);

    for (const pessoa of secao.pessoas) {
      y = ensurePageSpace(doc, y, LINE_H * 2);
      y = drawPersonRow(doc, fontFamily, y, pessoa);
    }

    y = ensurePageSpace(doc, y, LINE_H_SECTION + 2);
    y = drawSubtotalRow(doc, fontFamily, y, `Subtotal ${secao.titulo}`, secao.subtotalMediaMensal);
    y += GAP_SECTION;
  }

  y = ensurePageSpace(doc, y, LINE_H_SECTION * 5);
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_MM, y, MARGIN_MM + CONTENT_W_MM, y);
  y += LINE_H_SECTION;

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(FONT_SECTION);
  doc.setTextColor(...BLACK);
  doc.text('Resumo geral', MARGIN_MM, y);
  y += LINE_H_SECTION;

  const resumoLinhas = [
    ['Total médio mensal (todos os centros)', relatorio.resumo.totalMediaMensal],
    ['Total 13º salário (12 meses)', relatorio.resumo.totalDecimo],
    ['Total férias (12 meses)', relatorio.resumo.totalFerias],
  ];

  doc.setFontSize(FONT_BODY);
  for (const [label, valor] of resumoLinhas) {
    y = ensurePageSpace(doc, y, LINE_H + 1);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(...BLACK);
    doc.text(normalizePdfText(label), MARGIN_MM, y);
    doc.setFont(fontFamily, 'bold');
    doc.text(formatCurrency(valor), MARGIN_MM + CONTENT_W_MM, y, { align: 'right' });
    y += LINE_H + 1.2;
  }

  return doc.output('blob');
}
