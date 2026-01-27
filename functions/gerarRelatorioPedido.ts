import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

const safeText = (text) => {
  if (!text) return '';
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

const formatCurrency = (value) => {
  if (!value) return 'R$ 0,00';
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const pedido_id = body?.pedido_id;

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    }
    
    const pedido = pedidos[0];
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PEDIDO DE COMPRA', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(safeText(pedido.numero || 'N/A'), 105, 30, { align: 'center' });
    
    // Info basica
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    let y = 45;
    
    doc.text(`Fornecedor: ${safeText(pedido.fornecedor_nome || 'N/A')}`, 14, y);
    y += 7;
    doc.text(`Status: ${safeText(pedido.status || 'N/A')}`, 14, y);
    y += 7;
    doc.text(`Data Emissao: ${formatDate(pedido.created_date)}`, 14, y);
    y += 7;
    doc.text(`Entrega Prevista: ${formatDate(pedido.data_prevista_entrega)}`, 14, y);
    y += 10;
    
    // Itens
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', 14, y);
    y += 7;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    if (pedido.itens && pedido.itens.length > 0) {
      pedido.itens.forEach((item, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`${idx + 1}. ${safeText(item.produto_nome || 'Produto')}`, 14, y);
        y += 5;
        doc.text(`   Qtd: ${item.quantidade || 0} | Preco: ${formatCurrency(item.custo_unitario)} | Total: ${formatCurrency(item.total)}`, 14, y);
        y += 8;
      });
    } else {
      doc.text('Nenhum item cadastrado', 14, y);
      y += 7;
    }
    
    // Total
    y += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: ${formatCurrency(pedido.valor_total)}`, 14, y);
    
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${safeText(pedido.numero || 'compra')}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      error: 'Erro ao gerar relatorio',
      details: error.message
    }, { status: 500 });
  }
});