import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safe = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÀÁÂÃÄ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/[Ç]/g, 'C');
};

const fmtDate = (d) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
};

const fmtCur = (v) => {
  const n = parseFloat(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Largura da página em unidades de texto (Courier 9pt ~2.1mm/char @ 72dpi)
const SEP = '-----------------------------------------------------------------------';
const ML = 12;   // margem esquerda mm
const PW = 185;  // largura útil mm (210 - 12 - 13)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nao autorizado' }, { status: 401 });

    const { pedido_id } = await req.json();
    if (!pedido_id) return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    if (!pedidos?.length) return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    const pedido = pedidos[0];

    const fornecedor = pedido.fornecedor_id
      ? await base44.asServiceRole.entities.Terceiro.get(pedido.fornecedor_id).catch(() => null)
      : null;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    const LH = 4.8;  // line height mm
    let y = 12;

    const checkPage = (extra = 0) => {
      if (y + extra > 280) { doc.addPage(); y = 12; }
    };

    // Linha simples
    const L = (txt) => {
      checkPage();
      doc.text(safe(txt), ML, y);
      y += LH;
    };

    const SEP_LINE = () => L(SEP);

    // Linha com wrap na coluna esquerda e valor fixo direita, top-aligned
    // labelW: largura da coluna de label em mm
    const LV = (label, valor, labelW = 130) => {
      const wrappedLabel = doc.splitTextToSize(safe(label), labelW);
      checkPage(wrappedLabel.length * LH);
      const startY = y;
      // Escreve label com wrap
      wrappedLabel.forEach((l, i) => {
        doc.text(l, ML, startY + i * LH);
      });
      // Valor alinhado à direita, na primeira linha
      doc.text(safe(valor), ML + PW, startY, { align: 'right' });
      y = startY + wrappedLabel.length * LH;
    };

    const W = 210;

    // Título centralizado
    doc.text('PEDIDO DE COMPRA', W / 2, y, { align: 'center' }); y += LH;
    doc.text(safe(pedido.numero || 'N/A'), W / 2, y, { align: 'center' }); y += LH;
    SEP_LINE();

    // Dados gerais
    L('DADOS GERAIS');
    SEP_LINE();
    LV(`Fornecedor      : ${safe(fornecedor?.nome || pedido.fornecedor_nome || '-')}`, '');
    LV(`Status          : ${safe(pedido.status || '-')}`, '');
    LV(`Status Financ.  : ${safe(pedido.status_aprovacao_financeira || 'Pendente')}`, '');
    LV(`Criado em       : ${fmtDate(pedido.created_date)}`, '');
    LV(`Criado por      : ${safe(pedido.created_by || user.email)}`, '');
    LV(`Prev. Entrega   : ${fmtDate(pedido.data_prevista_entrega)}`, '');
    if (pedido.tags?.length) LV(`Tags            : ${safe(pedido.tags.join(', '))}`, '');
    SEP_LINE();

    // Itens
    L('ITENS DO PEDIDO');
    SEP_LINE();

    // Cabeçalho da tabela
    const COL_QTD = ML + 110;
    const COL_UNIT = ML + 135;
    const COL_TOT = ML + PW;
    doc.text('PRODUTO', ML, y);
    doc.text('QTD', COL_QTD, y);
    doc.text('UNIT', COL_UNIT, y);
    doc.text('TOTAL', COL_TOT, y, { align: 'right' });
    y += LH;
    SEP_LINE();

    const NOME_MAX_W = 105; // mm para nome do produto

    (pedido.itens || []).forEach((item) => {
      const nomeLines = doc.splitTextToSize(safe(item.produto_nome || '-'), NOME_MAX_W);
      checkPage(nomeLines.length * LH);
      const rowY = y;
      nomeLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));
      // Valores na primeira linha, alinhados
      doc.text(String(item.quantidade || 0), COL_QTD, rowY);
      doc.text(fmtCur(item.custo_unitario || item.custo_final_unitario || 0), COL_UNIT, rowY);
      doc.text(fmtCur(item.total || 0), COL_TOT, rowY, { align: 'right' });
      y = rowY + nomeLines.length * LH;
    });

    SEP_LINE();

    // Totais
    const totalItens = (pedido.itens || []).reduce((s, i) => s + (i.total || 0), 0);
    const frete = parseFloat(pedido.valor_frete) || 0;
    const desconto = parseFloat(pedido.valor_desconto) || 0;
    LV('Subtotal Itens', fmtCur(totalItens));
    if (frete) LV('Frete', fmtCur(frete));
    if (desconto) LV('Desconto', '-' + fmtCur(desconto));
    LV('TOTAL DO PEDIDO', fmtCur(pedido.valor_total || totalItens + frete - desconto));
    SEP_LINE();

    // Financeiro
    L('FINANCEIRO');
    SEP_LINE();
    LV(`Forma Pgto      : ${safe(pedido.forma_pagamento_compra || pedido.forma_pagamento || '-')}`, '');
    LV(`1o Vencimento   : ${fmtDate(pedido.data_primeiro_vencimento || pedido.primeiro_vencimento)}`, '');
    if ((pedido.num_parcelas || 0) > 1) LV(`Parcelas        : ${pedido.num_parcelas}x a cada ${pedido.intervalo_parcelas_dias || 30} dias`, '');
    if (pedido.data_aprovacao_financeira) LV(`Aprovado em     : ${fmtDate(pedido.data_aprovacao_financeira)}`, '');
    if (pedido.motivo_rejeicao_financeira) {
      LV(`Rejeitado em    : ${fmtDate(pedido.data_rejeicao_financeira)}`, '');
      LV(`Motivo          : ${safe(pedido.motivo_rejeicao_financeira)}`, '');
    }
    SEP_LINE();

    // Logistica
    L('LOGISTICA');
    SEP_LINE();
    LV(`NF Emitida      : ${pedido.nfe_emitida ? 'Sim' : 'Pendente'}`, '');
    LV(`Manifesto Conf. : ${pedido.manifesto_conferido ? 'Sim' : 'Pendente'}`, '');
    LV(`Conferencia     : ${pedido.conferencia_id ? 'Realizada' : 'Pendente'}`, '');
    if (pedido.data_despacho) LV(`Despachado em   : ${fmtDate(pedido.data_despacho)}`, '');
    if (pedido.data_chegada) LV(`Chegada em      : ${fmtDate(pedido.data_chegada)}`, '');
    if (pedido.tem_divergencias) LV('ATENCAO: Divergencias na conferencia', '');
    SEP_LINE();

    // Observacoes
    if (pedido.observacoes) {
      L('OBSERVACOES');
      SEP_LINE();
      const obsLines = doc.splitTextToSize(safe(pedido.observacoes), PW);
      obsLines.forEach(l => L(l));
      SEP_LINE();
    }

    // Pendencias
    if (pedido.solicitacao_edicao_motivo) {
      L('PENDENCIAS');
      SEP_LINE();
      LV(`Solic. Edicao   : ${fmtDate(pedido.solicitacao_edicao_data)} por ${safe(pedido.solicitacao_edicao_solicitante)}`, '');
      LV(`Motivo          : ${safe(pedido.solicitacao_edicao_motivo)}`, '');
      SEP_LINE();
    }

    if (pedido.data_conclusao) {
      L('CONCLUSAO');
      SEP_LINE();
      LV(`Concluido em    : ${fmtDate(pedido.data_conclusao)}`, '');
      SEP_LINE();
    }

    // Assinaturas
    checkPage(20);
    y += 8;
    doc.text('____________________________', ML, y);
    doc.text('____________________________', 110, y);
    y += LH;
    doc.text('Responsavel pela Compra', ML, y);
    doc.text('Gestor de Compras', 110, y);
    y += LH;
    doc.text('Data: ___/___/______', ML, y);
    doc.text('Data: ___/___/______', 110, y);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${safe(pedido.numero || 'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('ERRO:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', message: error.message }, { status: 500 });
  }
});