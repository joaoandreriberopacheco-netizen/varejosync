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

const SEP = '-----------------------------------------------------------------------';
const ML = 12;
const PW = 185;

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

    const divergencias = await base44.asServiceRole.entities.DivergenciaCompra.filter({ pedido_compra_id: pedido_id });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    const LH = 4.8;
    let y = 12;
    const W = 210;

    const checkPage = (extra = 0) => { if (y + extra > 280) { doc.addPage(); y = 12; } };
    const L = (txt) => { checkPage(); doc.text(safe(txt), ML, y); y += LH; };
    const SEP_LINE = () => L(SEP);

    // Helper: label + valor alinhado à direita
    const LV = (label, valor = '') => {
      const labelLines = doc.splitTextToSize(safe(label), PW - 40);
      checkPage(labelLines.length * LH);
      const rowY = y;
      labelLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));
      if (valor) doc.text(safe(valor), ML + PW, rowY, { align: 'right' });
      y = rowY + labelLines.length * LH;
    };

    // Helper: nome com wrap, qtds alinhados à direita na 1ª linha
    const LRow = (nome, qtds) => {
      const nomeLines = doc.splitTextToSize(safe(nome), 100);
      checkPage(nomeLines.length * LH);
      const rowY = y;
      nomeLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));
      doc.text(safe(qtds), ML + PW, rowY, { align: 'right' });
      y = rowY + nomeLines.length * LH;
    };

    doc.text('RELATORIO DE PENDENCIAS', W / 2, y, { align: 'center' }); y += LH;
    doc.text(safe(pedido.numero || 'N/A'), W / 2, y, { align: 'center' }); y += LH;
    SEP_LINE();
    L(`Fornecedor : ${safe(pedido.fornecedor_nome || '-')}`);
    L(`Status     : ${safe(pedido.status || '-')}`);
    L(`Gerado em  : ${fmtDate(new Date())}`);
    SEP_LINE();

    if (pedido.solicitacao_edicao_motivo) {
      L('SOLICITACAO DE EDICAO');
      SEP_LINE();
      L(`Data       : ${fmtDate(pedido.solicitacao_edicao_data)}`);
      L(`Solicitante: ${safe(pedido.solicitacao_edicao_solicitante || '-')}`);
      L('Motivo     :');
      const motLines = doc.splitTextToSize(safe(pedido.solicitacao_edicao_motivo), PW - 12);
      motLines.forEach(l => { checkPage(); doc.text(l, ML + 12, y); y += LH; });
      SEP_LINE();
    }

    if (pedido.motivo_rejeicao_financeira) {
      L('REJEICAO FINANCEIRA');
      SEP_LINE();
      L(`Data       : ${fmtDate(pedido.data_rejeicao_financeira)}`);
      L('Motivo     :');
      const rejLines = doc.splitTextToSize(safe(pedido.motivo_rejeicao_financeira), PW - 12);
      rejLines.forEach(l => { checkPage(); doc.text(l, ML + 12, y); y += LH; });
      SEP_LINE();
    }

    L('DIVERGENCIAS DE CONFERENCIA');
    SEP_LINE();
    if (divergencias?.length) {
      // Cabeçalho
      doc.text('PRODUTO', ML, y);
      doc.text('PED / REC / PEND', ML + PW, y, { align: 'right' });
      y += LH;
      SEP_LINE();
      divergencias.forEach((div) => {
        const pend = (div.qtd_pedida || 0) - (div.qtd_recebida || 0);
        LRow(
          `${safe(div.produto_nome || '-')} (${safe(div.tipo_divergencia || '-')})`,
          `${div.qtd_pedida || 0} / ${div.qtd_recebida || 0} / ${pend}`
        );
        if (div.observacao) {
          const obsLines = doc.splitTextToSize(safe('  Obs: ' + div.observacao), PW - 8);
          obsLines.forEach(l => { checkPage(); doc.text(l, ML + 4, y); y += LH; });
        }
      });
    } else {
      L('Nenhuma divergencia registrada');
    }
    SEP_LINE();

    // Itens com pendencia de vinculacao
    const itensPendentes = (pedido.itens || []).filter(i => (i.quantidade_vinculada || 0) < (i.quantidade || 0));
    if (itensPendentes.length) {
      L('ITENS COM PENDENCIA DE VINCULACAO');
      SEP_LINE();
      doc.text('PRODUTO', ML, y);
      doc.text('PED / VINC / PEND', ML + PW, y, { align: 'right' });
      y += LH;
      SEP_LINE();
      itensPendentes.forEach(item => {
        const pendente = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
        LRow(
          safe(item.produto_nome || '-'),
          `${item.quantidade} / ${item.quantidade_vinculada || 0} / ${pendente}`
        );
      });
      SEP_LINE();
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pendencias_${safe(pedido.numero || 'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', details: error.message }, { status: 500 });
  }
});