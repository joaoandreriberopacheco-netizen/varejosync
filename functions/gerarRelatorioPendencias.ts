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
    
    // Buscar divergencias
    const divergencias = await base44.asServiceRole.entities.DivergenciaCompra.filter({
      pedido_compra_id: pedido_id
    });
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RELATORIO DE PENDENCIAS', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(safeText(pedido.numero || 'N/A'), 105, 30, { align: 'center' });
    
    // Info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let y = 45;
    doc.text(`Fornecedor: ${safeText(pedido.fornecedor_nome || 'N/A')}`, 14, y);
    y += 7;
    doc.text(`Status: ${safeText(pedido.status || 'N/A')}`, 14, y);
    y += 10;
    
    // Divergencias
    doc.setFont(undefined, 'bold');
    doc.text('DIVERGENCIAS ENCONTRADAS', 14, y);
    y += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    if (divergencias && divergencias.length > 0) {
      divergencias.forEach((div, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`${idx + 1}. ${safeText(div.produto_nome || 'Produto')}`, 14, y);
        y += 5;
        doc.text(`   Tipo: ${safeText(div.tipo_divergencia || 'N/A')}`, 14, y);
        y += 5;
        doc.text(`   Qtd Pedida: ${div.qtd_pedida || 0} | Qtd Recebida: ${div.qtd_recebida || 0}`, 14, y);
        y += 5;
        doc.text(`   Status: ${safeText(div.status || 'N/A')}`, 14, y);
        y += 5;
        if (div.observacao) {
          doc.text(`   Obs: ${safeText(div.observacao)}`, 14, y);
          y += 5;
        }
        y += 3;
      });
    } else {
      doc.text('Nenhuma divergencia encontrada', 14, y);
    }
    
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pendencias_${safeText(pedido.numero || 'compra')}.pdf`
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