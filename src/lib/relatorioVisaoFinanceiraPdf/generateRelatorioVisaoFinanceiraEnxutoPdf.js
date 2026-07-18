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
 * PDF A4 em duas colunas estilo jornal: preenche a 1ª coluna de cima a baixo,
 * depois continua no topo da 2ª coluna na mesma página.
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
  const pageBottom = pageH - 12;
  const topY = 12;

  const colGap = 5;
  const colW = (contentW - colGap) / 2;
  const colXs = [margin, margin + colW + colGap];
  const centerX = colXs[0] + colW + colGap / 2;

  let col = 0;
  let y = topY;
  let pageStartY = topY;
  const colBottom = [topY, topY];

  const setFont = (style = 'normal', size = 9, color = COLOR.black) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const strokeH = (yPos, x0, x1, color = COLOR.lightLine, width = 0.07) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x0, yPos, x1, yPos);
  };

  const strokeV = (y0, y1, color = COLOR.line, width = 0.15) => {
    if (y1 <= y0 + 1) return;
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(centerX, y0, centerX, y1);
  };

  const syncColBottom = () => {
    colBottom[col] = Math.max(colBottom[col], y);
  };

  const finalizePage = () => {
    const lineEnd = Math.max(colBottom[0], colBottom[1]);
    strokeV(pageStartY, lineEnd);
  };

  const newPage = (header) => {
    finalizePage();
    doc.addPage();
    col = 0;
    y = topY;
    pageStartY = topY;
    colBottom[0] = topY;
    colBottom[1] = topY;
    if (header) {
      setFont('bold', 8, COLOR.muted);
      doc.text(safe(header), colXs[0], y);
      y += 3.8;
      colBottom[0] = y;
      strokeH(y - 1, colXs[0], colXs[0] + colW, COLOR.lightLine, 0.06);
      y += 2;
      colBottom[0] = y;
    }
  };

  const nextColumn = () => {
    syncColBottom();
    if (col === 0) {
      col = 1;
      y = pageStartY;
    } else {
      newPage(`VISAO FINANCEIRA - ${competenciaLabel} - CONTINUACAO`);
    }
  };

  const ensureSpace = (needed) => {
    if (y + needed <= pageBottom) return;
    nextColumn();
    if (y + needed > pageBottom) {
      newPage(`VISAO FINANCEIRA - ${competenciaLabel} - CONTINUACAO`);
    }
  };

  const colX = () => colXs[col];
  const colWidth = () => colW;

  const advance = (dy) => {
    y += dy;
    syncColBottom();
  };

  const textBlock = (text, { style = 'normal', size = 9, color = COLOR.black, lineH = 4 } = {}) => {
    setFont(style, size, color);
    const lines = doc.splitTextToSize(safe(text), colWidth());
    const height = Math.max(lineH, lines.length * lineH);
    ensureSpace(height);
    lines.forEach((line, index) => doc.text(line, colX(), y + index * lineH));
    advance(height);
    return height;
  };

  const textLineValor = (label, value, { prefix = '', bold = false, size = FONT.resumo } = {}) => {
    const lineH = 4.2;
    ensureSpace(lineH + 3);
    const rowY = y;
    setFont(bold ? 'bold' : 'normal', size, bold ? COLOR.black : COLOR.muted);
    const labelLines = doc.splitTextToSize(safe(label), colWidth() * 0.58);
    labelLines.forEach((line, index) => doc.text(line, colX(), rowY + index * lineH));
    setFont(bold ? 'bold' : 'normal', size + 0.15, COLOR.black);
    doc.text(safe(`${prefix}${value}`), colX() + colWidth(), rowY, { align: 'right' });
    const blockH = Math.max(lineH, labelLines.length * lineH) + 1.6;
    strokeH(rowY + blockH, colX(), colX() + colWidth());
    advance(blockH + 1.4);
  };

  const sectionTitle = (title) => {
    advance(2);
    textBlock(title.toUpperCase(), { style: 'bold', size: 9.5, color: COLOR.muted, lineH: 4.2 });
  };

  const hRule = (color = COLOR.line, width = 0.14) => {
    ensureSpace(3);
    strokeH(y, colX(), colX() + colWidth(), color, width);
    advance(3);
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
    const height = Math.max(
      8,
      nomeLines.length * titleLH + (detalheLines.length ? detalheLines.length * detailLH + 1.2 : 0) + 2.4,
    );

    return { nomeLines, detalheLines, titleLH, detailLH, height };
  };

  const drawItem = (item, options = {}) => {
    const valueW = Math.min(24, colWidth() * 0.36);
    const descW = Math.max(16, colWidth() - valueW - 1.5);
    const layout = buildItemLayout(item, descW, options);
    ensureSpace(layout.height + 3);

    const rowY = y;
    setFont('normal', FONT.itemTitle);
    layout.nomeLines.forEach((line, index) => {
      doc.text(line, colX(), rowY + index * layout.titleLH);
    });

    setFont('bold', FONT.itemValue);
    doc.text(moeda(item.valor), colX() + colWidth(), rowY, { align: 'right' });

    if (layout.detalheLines.length) {
      const detalheY = rowY + layout.nomeLines.length * layout.titleLH + 0.6;
      setFont('normal', FONT.itemDetail, COLOR.muted);
      layout.detalheLines.forEach((line, index) => {
        doc.text(line, colX(), detalheY + index * layout.detailLH);
      });
    }

    advance(layout.height + 0.8);
    strokeH(y, colX(), colX() + colWidth());
    advance(2.2);
  };

  const drawItensLista = (items, options = {}) => {
    for (const item of items || []) drawItem(item, options);
  };

  const drawSubgrupo = (label, subtotal) => {
    ensureSpace(6);
    setFont('bold', 9.2, COLOR.muted);
    doc.text(safe(`> ${label}`), colX(), y);
    doc.text(moeda(subtotal), colX() + colWidth(), y, { align: 'right' });
    advance(4.8);
  };

  const drawGrupoHeader = (grupo) => {
    ensureSpace(14);
    strokeH(y, colX(), colX() + colWidth(), COLOR.line, 0.15);
    advance(3);
    setFont('bold', FONT.grupo);
    doc.text(safe(String(grupo.label || '').toUpperCase()), colX(), y);
    doc.text(moeda(grupo.subtotal), colX() + colWidth(), y, { align: 'right' });
    advance(4.5);
    strokeH(y, colX(), colX() + colWidth(), COLOR.line, 0.15);
    advance(4);
  };

  const drawGrupoExplodido = (grupo) => {
    drawGrupoHeader(grupo);

    if (grupo.layout === 'vencimento_ou_centro') {
      if (agrupamentoFixas === 'centro_custo') {
        for (const centro of grupo.porCentro || []) {
          drawSubgrupo(centro.label, centro.subtotal);
          drawItensLista(centro.items, { modoVencimento: true, mostrarDetalhe: false });
        }
      } else {
        const items = (grupo.porVencimento || []).flatMap((bloco) => bloco.items);
        drawItensLista(items, { modoVencimento: true, mostrarDetalhe: false });
      }
      advance(2);
      return;
    }

    if (grupo.layout === 'provisoes_colapsaveis') {
      for (const item of grupo.items || []) {
        if (item.colapsavel) {
          drawSubgrupo(item.nome, item.valor);
          if (provisoesExpandidas[item.id]) {
            drawItensLista(item.filhos, { mostrarDetalhe: false });
          }
        } else {
          drawItem(item);
        }
      }
      advance(2);
      return;
    }

    if (grupo.layout === 'centro_categoria') {
      for (const centro of grupo.porCentroCategoria || []) {
        drawSubgrupo(centro.label, centro.subtotal);
        for (const categoria of centro.categorias || []) {
          drawSubgrupo(categoria.label, categoria.subtotal);
          drawItensLista(categoria.items, { mostrarDetalhe: false });
        }
      }
      advance(2);
      return;
    }

    if (grupo.layout === 'vencimento' || grupo.layout === 'lista') {
      if (grupo.vazio) {
        textBlock(
          grupo.id === 'fixas_nao_mensais'
            ? 'Nenhuma conta anual/trimestral cadastrada no Planejamento Financeiro.'
            : 'Nenhum boleto ocasional, frete ou compra com vencimento neste mes.',
          { size: 8.5, color: COLOR.muted, lineH: 3.8 },
        );
        return;
      }
      const items =
        grupo.layout === 'vencimento'
          ? (grupo.porVencimento || []).flatMap((bloco) => bloco.items)
          : (grupo.lista || []).flatMap((bloco) => bloco.items);
      drawItensLista(items, {
        modoVencimento: grupo.layout === 'vencimento',
        mostrarDetalhe: grupo.layout !== 'vencimento',
      });
      advance(2);
      return;
    }

    for (const centro of grupo.centros || []) {
      drawSubgrupo(centro.label, centro.subtotal);
      for (const categoria of centro.categorias || []) {
        drawSubgrupo(categoria.label, categoria.subtotal);
        drawItensLista(categoria.items);
      }
    }
    advance(2);
  };

  // —— Conteúdo (fluxo jornal desde o título) ——
  textBlock('Relatorio Visao Financeira - ENXUTO', { style: 'bold', size: 14, lineH: 5.5 });
  textBlock('A4 compacto  |  planejamento, compromissos e capacidade de compra  |  DIN 1451', {
    size: 8.5,
    color: COLOR.muted,
    lineH: 3.6,
  });
  textBlock(`Competencia: ${competenciaLabel}`, { style: 'bold', size: 10.5, lineH: 4.5 });
  textBlock(`Gerado em ${generatedAt}`, { size: 8.5, color: COLOR.muted, lineH: 3.6 });
  hRule();
  advance(1);

  textBlock('RESUMO', { style: 'bold', size: 10.5, lineH: 4.5 });
  textLineValor('Lucro bruto', moeda(resumo.lucroBruto), { prefix: '+ ', bold: true });

  sectionTitle('Despesas planejadas por camada');
  textLineValor('Contas fixas (recorrentes)', moeda(resumo.fixasRecorrentes), { prefix: '- ' });
  textLineValor('Folha de pagamento', moeda(resumo.folha), { prefix: '- ' });
  textLineValor('Budgets', moeda(resumo.budgets), { prefix: '- ' });
  if (number(resumo.pontuaisExtraPlano) > 0) {
    textLineValor('Pauta do mes (fora do plano fixo)', moeda(resumo.pontuaisExtraPlano), { prefix: '- ' });
  }
  textLineValor('Total operacional', moeda(resumo.totalOperacional), { prefix: '- ', bold: true });
  textLineValor('Resultado operacional', moeda(resumo.resultadoOperacional), { prefix: '= ', bold: true });

  sectionTitle('Provisoes mensais');
  textLineValor('Provisao anuais/trimestrais', moeda(resumo.anuaisDiluido), { prefix: '- ' });
  if (number(resumo.naoMensaisEquivalenteAnual) > 0) {
    textBlock(`Equivalente anual no cadastro: ${moeda(resumo.naoMensaisEquivalenteAnual)}`, {
      size: 8.5,
      color: COLOR.muted,
      lineH: 3.6,
    });
  }
  textLineValor('Provisoes de folha', moeda(resumo.provisoesFolha), { prefix: '- ' });
  textLineValor('Total com provisoes', moeda(resumo.totalComProvisoes), { prefix: '- ', bold: true });
  textLineValor('Resultado com provisoes', moeda(resumo.resultadoComProvisoes), { prefix: '= ', bold: true });

  sectionTitle('Capacidade de compra');
  textLineValor('CMV vendido (base)', moeda(resumo.capacidadeCompraBase), { prefix: '+ ' });
  textLineValor('Fretes agendados no mes', moeda(resumo.fretesAgendados), { prefix: '- ' });
  textLineValor('Disponivel para novas compras', moeda(resumo.capacidadeCompraDisponivel), {
    prefix: '= ',
    bold: true,
  });

  if (number(resumo.pontuais) > 0 || number(resumo.anuaisVencimentoMes) > 0) {
    sectionTitle('Desembolso conhecido no mes');
    if (number(resumo.pontuais) > 0) {
      textLineValor('Pauta do mes (vencimentos)', moeda(resumo.pontuais), { prefix: '- ' });
    }
    if (number(resumo.anuaisVencimentoMes) > 0) {
      textLineValor('Vencimentos nao mensais (integral)', moeda(resumo.anuaisVencimentoMes), { prefix: '- ' });
    }
    textLineValor('Total desembolso', moeda(resumo.totalDesembolsoMes), { prefix: '- ', bold: true });
    textLineValor('Saldo apos compromissos', moeda(resumo.resultadoDesembolso), { prefix: '= ', bold: true });
  }

  if (number(margemDetalhe?.receita_liquida) > 0) {
    textBlock(
      `Base do lucro bruto: receita liquida ${moeda(margemDetalhe.receita_liquida)} - CMV ${moeda(
        margemDetalhe.custo_total,
      )}`,
      { size: 8.5, color: COLOR.muted, lineH: 3.6 },
    );
  }

  advance(2);
  hRule();
  textBlock('PLANO EXPLODIDO', { style: 'bold', size: 12, lineH: 5 });
  advance(1);

  for (const grupo of grupos) {
    drawGrupoExplodido(grupo);
  }

  advance(2);
  hRule();
  textBlock('TOTAIS FINAIS', { style: 'bold', size: 10, lineH: 4.5 });
  const finais = [
    ['Total operacional', resumo.totalOperacional],
    ['Provisoes mensais', resumo.totalProvisoesMensais],
    ['Total com provisoes', resumo.totalComProvisoes],
    ['Desembolso conhecido', resumo.totalDesembolsoMes],
    ['Capacidade de compra apos fretes', resumo.capacidadeCompraDisponivel],
  ];
  finais.forEach(([label, value]) => {
    textLineValor(label, moeda(value));
  });

  if (anexoNaoMensais?.itens?.length > 0 || (Array.isArray(anexoNaoMensais) && anexoNaoMensais.length > 0)) {
    const itensAnexo = Array.isArray(anexoNaoMensais?.itens) ? anexoNaoMensais.itens : anexoNaoMensais;
    const totalProvisao =
      Number(anexoNaoMensais?.totalProvisaoMensal) ||
      itensAnexo.reduce((acc, item) => acc + (Number(item.provisaoMensal) || 0), 0);
    const totalAnual =
      Number(anexoNaoMensais?.totalEquivalenteAnual) ||
      itensAnexo.reduce((acc, item) => acc + (Number(item.equivalenteAnual) || 0), 0);

    advance(3);
    hRule();
    textBlock('ANEXO - CONTAS ANUAIS E NAO MENSAIS', { style: 'bold', size: 11, lineH: 4.8 });
    textBlock(
      'IPTU, IPVA, alvaras e demais contas com recorrencia maior que mensal. Provisao mensal = parcela diluida.',
      { size: 8.5, color: COLOR.muted, lineH: 3.6 },
    );
    advance(1);

    for (const item of itensAnexo) {
      const titulo = `${item.frequencia || ''} · ${item.nome || ''}`.trim();
      const detalhe = [
        `Prov./mes: ${moeda(item.provisaoMensal)}`,
        `Parcela: ${moeda(item.valorParcela)}`,
        item.venceNesteMes ? 'Vence neste mes' : '',
      ]
        .filter(Boolean)
        .join(' · ');
      drawItem(
        {
          nome: titulo,
          valor: item.provisaoMensal,
          detalhe,
          entraNoTotal: true,
        },
        { mostrarDetalhe: true },
      );
    }

    textLineValor('Total provisao mensal', moeda(totalProvisao), { bold: true });
    textLineValor('Equivalente anual no cadastro', moeda(totalAnual));
  }

  finalizePage();

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    setFont('normal', 7, COLOR.muted);
    doc.text(safe(`Visao Financeira | ${competenciaLabel}`), margin, pageH - 5);
    doc.text(`${page}/${pageCount}`, right, pageH - 5, { align: 'right' });
  }

  return {
    data: doc.output('arraybuffer'),
    version: 'visao_financeira_enxuto_a4_v5',
  };
}
