import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function safeText(text) {
  if (!text) return '';
  return String(text);
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
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const pedido_id = body?.pedido_id;
    
    if (!pedido_id) {
      return Response.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    const pedido = pedidos[0];
    
    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const produtos = await base44.asServiceRole.entities.Produto.list();
    
    const analise = {
      produtosAfetados: 0,
      aumentosPreco: [],
      reducoesPreco: [],
      impactoTotal: 0
    };

    if (pedido.itens && Array.isArray(pedido.itens)) {
      pedido.itens.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (!produto) return;

        const custoAtual = produto.preco_custo_calculado || produto.valor_compra || 0;
        const novoCusto = item.custo_final_unitario || item.custo_unitario || 0;
        const diferenca = novoCusto - custoAtual;

        if (Math.abs(diferenca) > 0.01) {
          analise.produtosAfetados++;
          const impacto = {
            nome: item.produto_nome,
            custoAtual,
            novoCusto,
            diferenca
          };

          if (diferenca > 0) {
            analise.aumentosPreco.push(impacto);
          } else {
            analise.reducoesPreco.push(impacto);
          }

          analise.impactoTotal += Math.abs(diferenca) * (item.quantidade || 0);
        }
      });
    }

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('ANALISE DE PRECIFICACAO', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Pedido: ${safeText(pedido.numero)}`, 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    if (analise.produtosAfetados === 0) {
      doc.text('Nenhuma alteracao de custo detectada', 25, y);
    } else {
      doc.text(`Produtos afetados: ${analise.produtosAfetados}`, 25, y);
      y += 6;
      doc.text(`Impacto total: ${safeCurrency(analise.impactoTotal)}`, 25, y);
    }

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Precificacao_${pedido.numero}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error.message, error.stack);
    return Response.json({ error: 'Erro ao gerar relatório', details: error.message }, { status: 500 });
  }
});