import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

const safeText = (text) => {
  if (!text) return '';
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('ANALISE DE PRECIFICACAO', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(safeText(pedido.numero || 'N/A'), 105, 30, { align: 'center' });
    
    // Info
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let y = 45;
    doc.text(`Fornecedor: ${safeText(pedido.fornecedor_nome || 'N/A')}`, 14, y);
    y += 10;
    
    // Itens
    doc.setFont(undefined, 'bold');
    doc.text('COMPARATIVO DE CUSTOS', 14, y);
    y += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    if (pedido.itens && pedido.itens.length > 0) {
      const produtoIds = pedido.itens.map(i => i.produto_id).filter(Boolean);
      let produtos = [];
      
      if (produtoIds.length > 0) {
        produtos = await base44.asServiceRole.entities.Produto.filter({
          id: { $in: produtoIds }
        });
      }
      
      pedido.itens.forEach((item, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        const produto = produtos.find(p => p.id === item.produto_id);
        const custoAtual = produto?.valor_compra || 0;
        const custoNovo = item.custo_unitario || 0;
        const diferenca = custoNovo - custoAtual;
        const percentual = custoAtual > 0 ? ((diferenca / custoAtual) * 100) : 0;
        
        doc.text(`${idx + 1}. ${safeText(item.produto_nome || 'Produto')}`, 14, y);
        y += 5;
        doc.text(`   Custo Atual: ${formatCurrency(custoAtual)} | Novo: ${formatCurrency(custoNovo)}`, 14, y);
        y += 5;
        
        if (diferenca !== 0) {
          const sinal = diferenca > 0 ? '+' : '';
          doc.text(`   Diferenca: ${sinal}${formatCurrency(diferenca)} (${sinal}${percentual.toFixed(1)}%)`, 14, y);
        } else {
          doc.text(`   Sem alteracao`, 14, y);
        }
        y += 8;
      });
    }
    
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=precificacao_${safeText(pedido.numero || 'compra')}.pdf`
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