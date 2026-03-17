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

    const divergencias = await base44.asServiceRole.entities.DivergenciaCompra.filter({
      pedido_compra_id: pedido_id,
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    const W = 210;
    const ML = 14;
    const MR = 196;
    let y = 14;

    const line = (txt, indent = 0) => {
      const lines = doc.splitTextToSize(safe(txt), MR - ML - indent);
      lines.forEach(l => {
        if (y > 278) { doc.addPage(); y = 14; }
        doc.text(l, ML + indent, y);
        y += 5;
      });
    };
    const sep = () => line(SEP);

    doc.text('RELATORIO DE PENDENCIAS', W / 2, y, { align: 'center' }); y += 5;
    doc.text(safe(pedido.numero || 'N/A'), W / 2, y, { align: 'center' }); y += 5;
    sep();
    line(`Fornecedor : ${safe(pedido.fornecedor_nome || '-')}`);
    line(`Status     : ${safe(pedido.status || '-')}`);
    line(`Gerado em  : ${fmtDate(new Date())}`);
    sep();

    // Solicitacao de edicao
    if (pedido.solicitacao_edicao_motivo) {
      line('SOLICITACAO DE EDICAO');
      sep();
      line(`Data       : ${fmtDate(pedido.solicitacao_edicao_data)}`);
      line(`Solicitante: ${safe(pedido.solicitacao_edicao_solicitante || '-')}`);
      line(`Motivo     :`);
      line(pedido.solicitacao_edicao_motivo, 4);
      sep();
    }

    // Rejeicao financeira
    if (pedido.motivo_rejeicao_financeira) {
      line('REJEICAO FINANCEIRA');
      sep();
      line(`Data       : ${fmtDate(pedido.data_rejeicao_financeira)}`);
      line(`Motivo     :`);
      line(pedido.motivo_rejeicao_financeira, 4);
      sep();
    }

    // Divergencias de conferencia
    line('DIVERGENCIAS DE CONFERENCIA');
    sep();
    if (divergencias?.length) {
      divergencias.forEach((div, idx) => {
        line(`${idx + 1}. ${safe(div.produto_nome || '-')}`);
        line(`   Tipo          : ${safe(div.tipo_divergencia || '-')}`, 4);
        line(`   Qtd Pedida    : ${div.qtd_pedida || 0}  Qtd Recebida: ${div.qtd_recebida || 0}`, 4);
        line(`   Status        : ${safe(div.status || '-')}`, 4);
        if (div.observacao) line(`   Obs           : ${safe(div.observacao)}`, 4);
        sep();
      });
    } else {
      line('Nenhuma divergencia registrada');
      sep();
    }

    // Itens com pendencia de vinculacao
    const itensPendentes = (pedido.itens || []).filter(i => !i.quantidade_vinculada || i.quantidade_vinculada < i.quantidade);
    if (itensPendentes.length) {
      line('ITENS COM PENDENCIA DE VINCULACAO');
      sep();
      itensPendentes.forEach(item => {
        const pendente = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
        line(`${safe(item.produto_nome || '-')}`);
        line(`   Pedido: ${item.quantidade}  Vinculado: ${item.quantidade_vinculada || 0}  Pendente: ${pendente}`, 4);
      });
      sep();
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