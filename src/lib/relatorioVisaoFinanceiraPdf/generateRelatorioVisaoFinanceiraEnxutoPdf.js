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

function tituloItemVencimento(item) {
  if (item.dataVencimentoLabel) return `${item.dataVencimentoLabel} · ${item.nome || 'Sem descricao'}`;
  return item.nome || 'Sem descricao';
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
    anexoNaoMensais = [],
    opcoesExplodido = {},
    generatedAt = new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  } = payload;

  const agrupamentoFixas = opcoesExplodido.agrupamentoFixas || 'vencimento';
  const provisoesExpandidas = opcoesExplodido.provisoesExpandidas || {};

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

  const addPage = (titulo = 'CONTINUACAO') => {
    doc.addPage();
    y = 13;
    setFont('bold', 8, COLOR.muted);
    doc.text(safe(`VISAO FINANCEIRA - ${competenciaLabel} - ${titulo}`), margin, y);
    y += 4;
    rule(y, COLOR.lightLine, 0.08);
    y += 4;
  };

  const ensureSpace = (height = 8) => {
    if (y + height > bottom) addPage();
  };

  const drawResumoLinha = (label, value, { prefix = '', bold = false } = {}) => {
    ensureSpace(5);
    setFont(bold ? 'bold' : 'normal', 8.5, bold ? COLOR.black : COLOR.muted);
    doc.text(safe(label), margin + 2, y);
    setFont(bold ? 'bold' : 'normal', 8.8, COLOR.black);
    doc.text(safe(`${prefix}${moeda(value)}`), right, y, { align: 'right' });
    y += 4;
    rule(y - 1.5, COLOR.lightLine, 0.06, margin + 2, right);
  };

  const drawSecao = (titulo) => {
    ensureSpace(6);
    setFont('bold', 8.5, COLOR.muted);
    doc.text(safe(titulo.toUpperCase()), margin + 2, y);
    y += 4;
  };

  const drawItemLinha = (item, { indent = 13, modoVencimento = false, mostrarDetalhe = true } = {}) => {
    const nomeX = margin + indent;
    const valueW = 40;
    const descW = contentW - (nomeX - margin) - valueW - 3;
    const titulo = modoVencimento ? tituloItemVencimento(item) : item.nome || 'Sem descricao';
    const detalhe = mostrarDetalhe ? [item.detalhe, itemObservacao(item)].filter(Boolean).join(' | ') : itemObservacao(item);

    setFont('normal', 8.2);
    const nomeLines = doc.splitTextToSize(safe(titulo), descW);
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

    if (item.valorSecundario != null && mostrarDetalhe) {
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
  };

  const drawSubgrupo = (label, subtotal, indent = 2) => {
    ensureSpace(8);
    setFont('bold', 8.2, COLOR.muted);
    doc.text(safe(`> ${label}`), margin + indent, y);
    doc.text(moeda(subtotal), right, y, { align: 'right' });
    y += 4;
  };

  const drawGrupoHeader = (grupo) => {
    ensureSpace(12);
    setFont('bold', 9.5);
    doc.text(safe(String(grupo.label || '').toUpperCase()), margin, y);
    doc.text(moeda(grupo.subtotal), right, y, { align: 'right' });
    y += 3;
    rule(y, COLOR.line, 0.12);
    y += 4;
  };

  const drawItensLista = (items, options = {}) => {
    for (const item of items || []) drawItemLinha(item, options);
  };

  const drawGrupoExplodido = (grupo) => {
    drawGrupoHeader(grupo);

    if (grupo.layout === 'vencimento_ou_centro') {
      if (agrupamentoFixas === 'centro_custo') {
        for (const centro of grupo.porCentro || []) {
          drawSubgrupo(centro.label, centro.subtotal);
          drawItensLista(centro.items, { modoVencimento: true, mostrarDetalhe: false });
          y += 1;
        }
      } else {
        const items = (grupo.porVencimento || []).flatMap((bloco) => bloco.items);
        drawItensLista(items, { modoVencimento: true, mostrarDetalhe: false });
      }
      y += 2;
      return;
    }

    if (grupo.layout === 'provisoes_colapsaveis') {
      for (const item of grupo.items || []) {
        if (item.colapsavel) {
          drawSubgrupo(item.nome, item.valor, 2);
          if (provisoesExpandidas[item.id]) {
            drawItensLista(item.filhos, { indent: 16, mostrarDetalhe: false });
          }
        } else {
          drawItemLinha(item);
        }
      }
      y += 2;
      return;
    }

    if (grupo.layout === 'centro_categoria') {
      for (const centro of grupo.porCentroCategoria || []) {
        drawSubgrupo(centro.label, centro.subtotal);
        for (const categoria of centro.categorias || []) {
          drawSubgrupo(categoria.label, categoria.subtotal, 7);
          drawItensLista(categoria.items, { indent: 13, mostrarDetalhe: false });
          y += 1;
        }
        y += 1;
      }
      y += 2;
      return;
    }

    if (grupo.layout === 'vencimento' || grupo.layout === 'lista') {
      if (grupo.vazio) {
        setFont('normal', 7.8, COLOR.muted);
        doc.text(
          safe('Nenhum boleto ocasional, frete ou compra com vencimento neste mes.'),
          margin + 2,
          y,
        );
        y += 5;
        return;
      }
      const items =
        grupo.layout === 'vencimento'
          ? (grupo.porVencimento || []).flatMap((bloco) => bloco.items)
          : (grupo.lista || []).flatMap((bloco) => bloco.items);
      drawItensLista(items, { modoVencimento: true, mostrarDetalhe: false });
      y += 2;
      return;
    }

    for (const centro of grupo.centros || []) {
      drawSubgrupo(centro.label, centro.subtotal);
      for (const categoria of centro.categorias || []) {
        drawSubgrupo(categoria.label, categoria.subtotal, 7);
        drawItensLista(categoria.items, { indent: 13 });
        y += 1;
      }
      y += 1;
    }
    y += 2;
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
  doc.text('RESUMO', margin, y);
  y += 4;
  drawResumoLinha('Lucro bruto', resumo.lucroBruto, { prefix: '+ ', bold: true });

  drawSecao('Despesas planejadas por camada');
  drawResumoLinha('Contas fixas (recorrentes)', resumo.fixasRecorrentes, { prefix: '- ' });
  drawResumoLinha('Folha de pagamento', resumo.folha, { prefix: '- ' });
  drawResumoLinha('Budgets', resumo.budgets, { prefix: '- ' });
  if (number(resumo.pontuaisExtraPlano) > 0) {
    drawResumoLinha('Pauta do mes (fora do plano fixo)', resumo.pontuaisExtraPlano, { prefix: '- ' });
  }
  drawResumoLinha('Total operacional', resumo.totalOperacional, { prefix: '- ', bold: true });
  drawResumoLinha('Resultado operacional', resumo.resultadoOperacional, { prefix: '= ', bold: true });

  drawSecao('Provisoes mensais');
  drawResumoLinha('Contas nao mensais (provisao)', resumo.anuaisDiluido, { prefix: '- ' });
  drawResumoLinha('Provisoes de folha', resumo.provisoesFolha, { prefix: '- ' });
  drawResumoLinha('Total com provisoes', resumo.totalComProvisoes, { prefix: '- ', bold: true });
  drawResumoLinha('Resultado com provisoes', resumo.resultadoComProvisoes, { prefix: '= ', bold: true });

  drawSecao('Capacidade de compra');
  drawResumoLinha('CMV vendido (base)', resumo.capacidadeCompraBase, { prefix: '+ ' });
  drawResumoLinha('Fretes agendados no mes', resumo.fretesAgendados, { prefix: '- ' });
  drawResumoLinha('Disponivel para novas compras', resumo.capacidadeCompraDisponivel, { prefix: '= ', bold: true });

  if (number(resumo.pontuais) > 0 || number(resumo.anuaisVencimentoMes) > 0) {
    drawSecao('Desembolso conhecido no mes');
    if (number(resumo.pontuais) > 0) {
      drawResumoLinha('Pauta do mes (vencimentos)', resumo.pontuais, { prefix: '- ' });
    }
    if (number(resumo.anuaisVencimentoMes) > 0) {
      drawResumoLinha('Vencimentos nao mensais (integral)', resumo.anuaisVencimentoMes, { prefix: '- ' });
    }
    drawResumoLinha('Total desembolso', resumo.totalDesembolsoMes, { prefix: '- ', bold: true });
    drawResumoLinha('Saldo apos compromissos', resumo.resultadoDesembolso, { prefix: '= ', bold: true });
  }

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
    drawGrupoExplodido(grupo);
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

  if (anexoNaoMensais.length > 0) {
    addPage('ANEXO');
    setFont('bold', 11);
    doc.text('ANEXO - CONTAS NAO MENSAIS', margin, y);
    y += 5;
    setFont('normal', 8, COLOR.muted);
    doc.text(
      safe('Visao das contas anuais, bimestrais, trimestrais e semestrais com provisao mensal.'),
      margin,
      y,
    );
    y += 6;

    const colFreq = margin + 2;
    const colNome = margin + 28;
    const colProv = right - 38;
    const colParcela = right;

    ensureSpace(8);
    setFont('bold', 7.8, COLOR.muted);
    doc.text('FREQ.', colFreq, y);
    doc.text('CONTA', colNome, y);
    doc.text('PROV./MES', colProv, y, { align: 'right' });
    doc.text('PARCELA', colParcela, y, { align: 'right' });
    y += 4;
    rule(y, COLOR.line, 0.1);
    y += 4;

    for (const item of anexoNaoMensais) {
      ensureSpace(7);
      setFont('normal', 7.5, COLOR.muted);
      doc.text(safe(item.frequencia || ''), colFreq, y);
      setFont('normal', 8.2);
      const nomeLines = doc.splitTextToSize(safe(item.nome || ''), colProv - colNome - 4);
      nomeLines.forEach((line, index) => doc.text(line, colNome, y + index * 3));
      doc.text(moeda(item.provisaoMensal), colProv, y, { align: 'right' });
      setFont('normal', 7.5, COLOR.muted);
      doc.text(moeda(item.valorParcela), colParcela, y, { align: 'right' });
      if (item.venceNesteMes) {
        setFont('normal', 6.8, COLOR.muted);
        doc.text('Vence neste mes', colNome, y + 3.2);
      }
      y += Math.max(5.5, nomeLines.length * 3 + (item.venceNesteMes ? 3 : 0));
      rule(y - 1, COLOR.lightLine, 0.06, colFreq, right);
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setFont('normal', 7, COLOR.muted);
    doc.text(safe(`Visao Financeira | ${competenciaLabel}`), margin, pageH - 5);
    doc.text(`${page}/${pageCount}`, right, pageH - 5, { align: 'right' });
  }

  return {
    data: doc.output('arraybuffer'),
    version: 'visao_financeira_enxuto_a4_v2',
  };
}
