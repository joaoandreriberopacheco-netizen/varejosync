import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function safeText(text) {
  if (!text) return '';
  return String(text);
}

function safeDate(dateStr) {
  if (!dateStr) return 'Pendente';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Pendente';
    return date.toLocaleDateString('pt-BR');
  } catch {
    return 'Pendente';
  }
}

function safeCurrency(value) {
  const num = Number(value) || 0;
  return `R$ ${num.toFixed(2)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const pedido_id = body?.pedido_id;

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];

    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('PEDIDO DE COMPRA', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(safeText(pedido.numero || 'N/A'), 105, y, { align: 'center' });
    y += 15;

    // Dados Gerais
    doc.setFontSize(14);
    doc.text('DADOS GERAIS', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Fornecedor: ${safeText(pedido.fornecedor_nome)}`, 14, y);
    y += 6;
    doc.text(`Status: ${safeText(pedido.status)}`, 14, y);
    y += 6;
    doc.text(`Criado em: ${safeDate(pedido.created_date)}`, 14, y);
    y += 6;
    doc.text(`Entrega prevista: ${safeDate(pedido.data_prevista_entrega)}`, 14, y);
    y += 10;

    // Itens
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.text('Produto', 14, y);
    doc.text('Qtd', 120, y);
    doc.text('Custo Un.', 145, y);
    doc.text('Total', 175, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    if (pedido.itens && Array.isArray(pedido.itens)) {
      pedido.itens.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(safeText(item.produto_nome).substring(0, 40), 14, y);
        doc.text(String(item.quantidade || 0), 120, y);
        doc.text(safeCurrency(item.custo_unitario), 145, y);
        doc.text(safeCurrency(item.total), 175, y);
        y += 6;
      });
    }

    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: ${safeCurrency(pedido.valor_total)}`, 145, y);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${pedido.numero || 'compra'}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error.message, error.stack);
    return Response.json({ error: 'Erro ao gerar relatório', details: error.message }, { status: 500 });
  }
});