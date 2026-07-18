import { jsPDF } from 'jspdf';
import { registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';

const COLOR = {
  black: [0, 0, 0],
  muted: [72, 72, 72],
  line: [110, 110, 110],
  lightLine: [210, 210, 210],
};

const FONT = {
  itemTitle: 10.5,
  itemDetail: 9,
  itemValue: 10.5,
  grupo: 11.5,
  resumo: 9.2,
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

  const ruleVertical = (x, y0, y1, color = COLOR.line, width = 0.14) => {
    if (y1 <= y0) return;
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x, y0, x, y1);
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
    ensureSpace(5.5);
    setFont(bold ? 'bold' : 'normal', FONT.resumo, bold ? COLOR.black : COLOR.muted);
    doc.text(safe(label), margin + 2, y);
    setFont(bold ? 'bold' : 'normal', FONT.resumo + 0.2, COLOR.black);
    doc.text(safe(`${prefix}${moeda(value)}`), right, y, { align: 'right' });
    y += 4.2;
    rule(y, COLOR.lightLine, 0.06, margin + 2, right);
    y += 1.8;
  };

  const drawSecao = (titulo) => {
    ensureSpace(6);
    setFont('bold', 8.5, COLOR.muted);
    doc.text(safe(titulo.toUpperCase()), margin + 2, y);
    y += 4;
  };

  const buildItemLayout = (item, descW, { modoVencimento = false, mostrarDetalhe = true } = {}) => {
    const titulo = modoVencimento ? tituloItemVencimento(item) : item.nome || 'Sem descricao';
    const detalhe = mostrarDetalhe
      ? [item.detalhe, itemObservacao(item)].filter(Boolean).join(' · ')
      : itemObservacao(item);

    setFont('normal', FONT.itemTitle);
    const nomeLines = doc.splitTextToSize(safe(titulo), descW);
    setFont('normal', FONT.itemDetail, COLOR.muted);
    const detalheLines = detalhe ? doc.splitTextToSize(safe(detalhe), descW) : [];

    const titleLH = 4.2;
    const detailLH = 3.8;
    const titleBlock = nomeLines.length * titleLH;
    const detailBlock = detalheLines.length ? detalheLines.length * detailLH + 1 : 0;
    const height = Math.max(8, titleBlock + detailBlock + 2.6);

    return { titulo, detalhe, nomeLines, detalheLines, titleLH, detailLH, height };
  };

  const drawItemLinhaAt = (item, x, width, startY, options = {}) => {
    const valueW = Math.min(24, width * 0.34);
    const descW = Math.max(18, width - valueW - 2);
    const layout = buildItemLayout(item, descW, options);

    setFont('normal', FONT.itemTitle);
    layout.nomeLines.forEach((line, index) => {
      doc.text(line, x, startY + index * layout.titleLH);
    });

    setFont('bold', FONT.itemValue);
    doc.text(moeda(item.valor), x + width, startY, { align: 'right' });

    if (layout.detalheLines.length) {
      const detalheY = startY + layout.nomeLines.length * layout.titleLH + 0.7;
      setFont('normal', FONT.itemDetail, COLOR.muted);
      layout.detalheLines.forEach((line, index) => {
        doc.text(line, x, detalheY + index * layout.detailLH);
      });
    }

    if (item.valorSecundario != null && options.mostrarDetalhe !== false) {
      setFont('normal', 7.8, COLOR.muted);
      doc.text(
        safe(`${item.valorSecundarioLabel || 'Complemento'}: ${moeda(item.valorSecundario)}`),
        x + width,
        startY + layout.titleLH + 0.5,
        { align: 'right' },
      );
    }

    return layout.height;
  };

  const drawItemLinha = (item, options = {}) => {
    const indent = options.indent ?? 2;
    const nomeX = margin + indent;
    const width = right - nomeX;
    ensureSpace(12);
    const rowTop = y;
    const rowHeight = drawItemLinhaAt(item, nomeX, width, rowTop, options);
    y = rowTop + rowHeight + 1.4;
    rule(y, COLOR.lightLine, 0.06, nomeX, right);
    y += 2.4;
  };

  const drawItensLista = (items, options = {}) => {
    const list = items || [];
    if (!list.length) return;

    if (list.length === 1) {
      drawItemLinha(list[0], options);
      return;
    }

    const colGap = 6;
    const colW = (contentW - colGap) / 2;
    const col1X = margin + 2;
    const col2X = margin + 2 + colW + colGap;
    const centerX = col1X + colW + colGap / 2;

    for (let i = 0; i < list.length; i += 2) {
      const left = list[i];
      const rightItem = list[i + 1];
      const valueW = Math.min(26, colW * 0.36);
      const descW = Math.max(18, colW - valueW - 2);
      const hLeft = buildItemLayout(left, descW, options).height;
      const hRight = rightItem ? buildItemLayout(rightItem, descW, options).height : 0;
      const rowHeight = Math.max(hLeft, hRight, 8);

      ensureSpace(rowHeight + 6);
      const rowTop = y;
      drawItemLinhaAt(left, col1X, colW, rowTop, options);
      if (rightItem) drawItemLinhaAt(rightItem, col2X, colW, rowTop, options);

      y = rowTop + rowHeight + 1.6;
      ruleVertical(centerX, rowTop - 0.8, y + 0.4, COLOR.line, 0.16);
      rule(y, COLOR.lightLine, 0.07, col1X, col2X + colW);
      y += 3;
    }
  };

  const drawSubgrupo = (label, subtotal, indent = 2) => {
    ensureSpace(8);
    setFont('bold', 9, COLOR.muted);
    doc.text(safe(`> ${label}`), margin + indent, y);
    doc.text(moeda(subtotal), right, y, { align: 'right' });
    y += 4.5;
  };

  const drawGrupoHeader = (grupo) => {
    ensureSpace(16);
    rule(y, COLOR.line, 0.16);
    y += 3.5;
    setFont('bold', FONT.grupo);
    doc.text(safe(String(grupo.label || '').toUpperCase()), margin, y);
    setFont('bold', FONT.grupo);
    doc.text(moeda(grupo.subtotal), right, y, { align: 'right' });
    y += 4.5;
    rule(y, COLOR.line, 0.16);
    y += 5;
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
          safe(
            grupo.id === 'fixas_nao_mensais'
              ? 'Nenhuma conta anual/trimestral cadastrada no Planejamento Financeiro.'
              : 'Nenhum boleto ocasional, frete ou compra com vencimento neste mes.',
          ),
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
  drawResumoLinha('Provisao anuais/trimestrais', resumo.anuaisDiluido, { prefix: '- ' });
  if (number(resumo.naoMensaisEquivalenteAnual) > 0) {
    ensureSpace(5);
    setFont('normal', 7.5, COLOR.muted);
    doc.text(
      safe(`Equivalente anual no cadastro: ${moeda(resumo.naoMensaisEquivalenteAnual)}`),
      margin + 2,
      y,
    );
    y += 4;
  }
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
  setFont('bold', 12);
  doc.text('PLANO EXPLODIDO', margin, y);
  y += 6;

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

  if (anexoNaoMensais?.itens?.length > 0 || (Array.isArray(anexoNaoMensais) && anexoNaoMensais.length > 0)) {
    const itensAnexo = Array.isArray(anexoNaoMensais?.itens)
      ? anexoNaoMensais.itens
      : anexoNaoMensais;
    const totalProvisao =
      Number(anexoNaoMensais?.totalProvisaoMensal) ||
      itensAnexo.reduce((acc, item) => acc + (Number(item.provisaoMensal) || 0), 0);
    const totalAnual =
      Number(anexoNaoMensais?.totalEquivalenteAnual) ||
      itensAnexo.reduce((acc, item) => acc + (Number(item.equivalenteAnual) || 0), 0);

    addPage('ANEXO');
    setFont('bold', 11);
    doc.text('ANEXO - CONTAS ANUAIS E NAO MENSAIS', margin, y);
    y += 5;
    setFont('normal', 8, COLOR.muted);
    doc.text(
      safe(
        'IPTU, IPVA, alvaras e demais contas com recorrencia maior que mensal. Provisao mensal = parcela diluida.',
      ),
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

    for (const item of itensAnexo) {
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
      y += Math.max(6, nomeLines.length * 3.2 + (item.venceNesteMes ? 3.2 : 0) + 1.4);
      rule(y, COLOR.lightLine, 0.06, colFreq, right);
      y += 2.4;
    }

    ensureSpace(10);
    y += 2;
    rule(y, COLOR.line, 0.1);
    y += 4;
    setFont('bold', 8.5);
    doc.text('Total provisao mensal', colNome, y);
    doc.text(moeda(totalProvisao), colProv, y, { align: 'right' });
    y += 4;
    setFont('normal', 8, COLOR.muted);
    doc.text('Equivalente anual no cadastro', colNome, y);
    doc.text(moeda(totalAnual), colProv, y, { align: 'right' });
    y += 4;
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
    version: 'visao_financeira_enxuto_a4_v4',
  };
}
