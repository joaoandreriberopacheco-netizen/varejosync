import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function safeText(text) {
  if (!text) return '';
  return String(text);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const pedido_id = body?.pedido_id;
    
    if (!pedido_id) {
      return Response.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    const [pedidos, divergencias] = await Promise.all([
      base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id }),
      base44.asServiceRole.entities.DivergenciaCompra.filter({ pedido_compra_id: pedido_id })
    ]);

    const pedido = pedidos[0];
    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (!divergencias || divergencias.length === 0) {
      return Response.json({ error: 'Nenhuma pendência encontrada' }, { status: 404 });
    }

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('RELATORIO DE PENDENCIAS', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Pedido: ${safeText(pedido.numero)}`, 20, y);
    y += 6;
    doc.text(`Fornecedor: ${safeText(pedido.fornecedor_nome)}`, 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('DIVERGENCIAS', 20, y);
    y += 8;

    divergencias.forEach((div, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${safeText(div.produto_nome)}`, 20, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Tipo: ${safeText(div.tipo_divergencia)}`, 25, y);
      y += 5;
      doc.text(`Status: ${safeText(div.status)}`, 25, y);
      y += 8;
    });

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Pendencias_${pedido.numero}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error.message, error.stack);
    return Response.json({ error: 'Erro ao gerar relatório', details: error.message }, { status: 500 });
  }
});