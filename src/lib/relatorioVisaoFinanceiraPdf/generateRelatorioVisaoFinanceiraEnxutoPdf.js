import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';

const COLOR = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  lightLine: [210, 210, 210],
};

const safe = (value) => normalizePdfText(value);
const number = (value) => Number(value) || 0;
const moeda = (value) =>
  `R$ ${number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function itemObservacao(item) {
  if (item?.coberturaBudget) return `Coberto pelo budget ${item.coberturaBudget}`;
  if (item?.entraNoTotal === false) return 'Informativo - nao soma novamente';
  if (item?.destaque) return 'Compromisso do mes';
  return '';
}

/**
 * PDF A4 compacto inspirado no relatório enxuto de compras.
 * Consome os totais e agrupamentos já calculados pela Visão Financeira.
 */
export async function generateRelatorioVisaoFinanceiraEnxutoPdf(payload = {}) {
  const {
    competenciaLabel = '',
    resumo = {},
    margemDetalhe = {},
    grupos = [],
    generatedAt = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  } = payload;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const font = await registerJsPdfDin1451Fonts(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentW = pageW - margin * 2;
  const right = pageW - margin;
  const bottom = pageH - 10;
  let y = 13;

  const setFont = (style = 'normal', size = 9, color = COLOR.black) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const rule = (atY, color = COLOR.line, width = 0.12, x0 = margin, x1 = right) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x0, atY, x1, atY);
  };

  const addPage = () => {
    doc.addPage();
    y = 13;
    setFont('bold', 8, COLOR.muted);
    doc.text(safe(`VISAO FINANCEIRA - ${competenciaLabel} - CONTINUACAO`), margin, y);
    y += 4;
    rule(y, COLOR.lightLine, 0.08);
    y += 4;
  };

  const ensureSpace = (height = 8) => {
    if (y + height > bottom) addPage();
  };

  setFont('bold', 14);
  doc.text('Relatorio Visao Financeira - ENXUTO', margin, y);
  y += 5;
  setFont('normal', 8, COLOR.muted);
  doc.text('A4 compacto  |  planejamento, compromissos e capacidade de compra  |  DIN 1451', margin, y);
  y += 4;
  setFont('bold', 10);
  doc.text(safe(`Competencia: ${competenciaLabel}`), margin, y);
  setFont('normal', 8, COLOR.muted);
  doc.text(safe(`Gerado em ${generatedAt}`), right, y, { align: 'right' });
  y += 5;
  rule(y);
  y += 5;

  setFont('bold', 9.5);
  doc.text('CAPACIDADE DE COMPRA', margin, y);
  y += 4;
  const capacidadeCols = [
    ['CMV vendido', resumo.capacidadeCompraBase],
    ['Fretes reservados', resumo.fretesAgendados],
    ['Disponivel para compras', resumo.capacidadeCompraDisponivel],
  ];
  const colW = contentW / capacidadeCols.length;
  capacidadeCols.forEach(([label, value], index) => {
    const x = margin + index * colW;
    setFont('normal', 7.5, COLOR.muted);
    doc.text(safe(label).toUpperCase(), x, y);
    setFont('bold', 10.5);
    doc.text(moeda(value), x, y + 4.2);
  });
  y += 10;
  setFont('normal', 7.8, COLOR.muted);
  doc.text('Fretes reduzem a capacidade de compra, sem alterar o lucro bruto.', margin, y);
  y += 5;
  rule(y, COLOR.lightLine, 0.08);
  y += 5;

  const resumoRows = [
    ['Lucro bruto', resumo.lucroBruto],
    ['Fixas recorrentes', resumo.fixasRecorrentes],
    ['Folha', resumo.folha],
    ['Budgets', resumo.budgets],
    ['Pontuais fora do plano', resumo.pontuaisExtraPlano],
    ['Total operacional', resumo.totalOperacional],
    ['Provisao mensal - contas anuais', resumo.anuaisDiluido],
    ['Provisoes da folha', resumo.provisoesFolha],
    ['Total com provisoes', resumo.totalComProvisoes],
    ['Compromissos pontuais / parcelados', resumo.pontuais],
    ['Desembolso conhecido no mes', resumo.totalDesembolsoMes],
    ['Resultado com provisoes', resumo.resultadoComProvisoes],
    ['Saldo bruto apos compromissos', resumo.resultadoDesembolso],
  ];

  setFont('bold', 9.5);
  doc.text('RESUMO EXECUTIVO', margin, y);
  y += 4;
  resumoRows.forEach(([label, value], index) => {
    ensureSpace(5);
    const bold = [
      'Total operacional',
      'Total com provisoes',
      'Desembolso conhecido no mes',
      'Resultado com provisoes',
      'Saldo bruto apos compromissos',
    ].includes(label);
    setFont(bold ? 'bold' : 'normal', 8.5, bold ? COLOR.black : COLOR.muted);
    doc.text(safe(label), margin + 2, y);
    setFont(bold ? 'bold' : 'normal', 8.8, COLOR.black);
    doc.text(moeda(value), right, y, { align: 'right' });
    y += 4;
    if (index < resumoRows.length - 1) rule(y - 1.5, COLOR.lightLine, 0.06, margin + 2, right);
  });

  if (number(margemDetalhe?.receita_liquida) > 0) {
    ensureSpace(7);
    y += 1;
    setFont('normal', 7.8, COLOR.muted);
    doc.text(
      safe(
        `Base do lucro bruto: receita liquida ${moeda(margemDetalhe.receita_liquida)} - CMV ${moeda(
          margemDetalhe.custo_total,
        )}`,
      ),
      margin + 2,
      y,
    );
    y += 5;
  }

  y += 2;
  rule(y);
  y += 5;
  setFont('bold', 10.5);
  doc.text('PLANO EXPLODIDO', margin, y);
  y += 5;

  for (const grupo of grupos) {
    ensureSpace(12);
    setFont('bold', 9.5);
    doc.text(safe(String(grupo.label || '').toUpperCase()), margin, y);
    doc.text(moeda(grupo.subtotal), right, y, { align: 'right' });
    y += 3;
    rule(y, COLOR.line, 0.12);
    y += 4;

    for (const centro of grupo.centros || []) {
      ensureSpace(10);
      setFont('bold', 8.8);
      doc.text(safe(`> ${centro.label}`), margin + 2, y);
      doc.text(moeda(centro.subtotal), right, y, { align: 'right' });
      y += 4;

      for (const categoria of centro.categorias || []) {
        ensureSpace(9);
        setFont('bold', 8.2, COLOR.muted);
        doc.text(safe(`> ${categoria.label}`), margin + 7, y);
        doc.text(moeda(categoria.subtotal), right, y, { align: 'right' });
        y += 4;

        for (const item of categoria.items || []) {
          const nomeX = margin + 13;
          const valueW = 40;
          const descW = contentW - (nomeX - margin) - valueW - 3;
          setFont('normal', 8.2);
          const nomeLines = doc.splitTextToSize(safe(item.nome || 'Sem descricao'), descW);
          const detalhe = [item.detalhe, itemObservacao(item)].filter(Boolean).join(' | ');
          setFont('normal', 7.2, COLOR.muted);
          const detalheLines = detalhe ? doc.splitTextToSize(safe(detalhe), descW) : [];
          const lineHeight = 3.2;
          const rowHeight = Math.max(5.5, nomeLines.length * lineHeight + detalheLines.length * 2.8 + 1);
          ensureSpace(rowHeight + 1.5);

          setFont('normal', 8.2);
          nomeLines.forEach((line, index) => doc.text(line, nomeX, y + index * lineHeight));
          setFont('bold', 8.4);
          doc.text(moeda(item.valor), right, y, { align: 'right' });

          if (detalheLines.length) {
            const detalheY = y + nomeLines.length * lineHeight;
            setFont('normal', 7.2, COLOR.muted);
            detalheLines.forEach((line, index) => doc.text(line, nomeX, detalheY + index * 2.8));
          }

          if (item.valorSecundario != null) {
            setFont('normal', 6.9, COLOR.muted);
            doc.text(
              safe(`${item.valorSecundarioLabel || 'Complemento'}: ${moeda(item.valorSecundario)}`),
              right,
              y + 3.2,
              { align: 'right' },
            );
          }

          y += rowHeight;
          rule(y - 1, COLOR.lightLine, 0.06, nomeX, right);
        }
        y += 1;
      }
      y += 1.5;
    }
    y += 3;
  }

  ensureSpace(27);
  rule(y);
  y += 5;
  setFont('bold', 9.5);
  doc.text('TOTAIS FINAIS', margin, y);
  y += 4;
  const finais = [
    ['Total operacional', resumo.totalOperacional],
    ['Provisoes mensais', resumo.totalProvisoesMensais],
    ['Total com provisoes', resumo.totalComProvisoes],
    ['Desembolso conhecido', resumo.totalDesembolsoMes],
    ['Capacidade de compra apos fretes', resumo.capacidadeCompraDisponivel],
  ];
  finais.forEach(([label, value]) => {
    setFont('normal', 8.5, COLOR.muted);
    doc.text(safe(label), margin + 2, y);
    setFont('bold', 8.8);
    doc.text(moeda(value), right, y, { align: 'right' });
    y += 4;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setFont('normal', 7, COLOR.muted);
    doc.text(safe(`Visao Financeira | ${competenciaLabel}`), margin, pageH - 5);
    doc.text(`${page}/${pageCount}`, right, pageH - 5, { align: 'right' });
  }

  return {
    data: doc.output('arraybuffer'),
    version: 'visao_financeira_enxuto_a4_v1',
  };
}
