import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

// Helper para decodificar caracteres especiais do português
function decodeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã /g, 'à')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ã/g, 'Ã')
    .replace(/Â°/g, 'º');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { pedido_id } = await req.json();
    
    if (!pedido_id) {
      return Response.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    const [pedidos] = await Promise.all([
      base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id })
    ]);

    const pedido = pedidos[0];
    if (!pedido) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const produtos = await base44.asServiceRole.entities.Produto.list();
    
    // Análise de impacto nos preços
    const analise = {
      produtosAfetados: 0,
      aumentosPreco: [],
      reducoesPreco: [],
      impactoMedio: 0,
      impactoTotal: 0
    };

    pedido.itens.forEach(item => {
      const produto = produtos.find(p => p.id === item.produto_id);
      if (!produto) return;

      const custoAtual = produto.preco_custo_calculado || produto.valor_compra || 0;
      const novoCusto = item.custo_final_unitario || item.custo_unitario || 0;
      const diferenca = novoCusto - custoAtual;
      const percentual = custoAtual > 0 ? (diferenca / custoAtual) * 100 : 0;

      if (Math.abs(diferenca) > 0.01) {
        analise.produtosAfetados++;
        
        const impacto = {
          nome: item.produto_nome,
          custoAtual,
          novoCusto,
          diferenca,
          percentual,
          precoVendaAtual: produto.preco_venda_padrao || 0,
          novoPrecoVenda: novoCusto * (1 + (produto.preco_venda_percentual || 40) / 100)
        };

        if (diferenca > 0) {
          analise.aumentosPreco.push(impacto);
        } else {
          analise.reducoesPreco.push(impacto);
        }

        analise.impactoTotal += Math.abs(diferenca) * item.quantidade;
      }
    });

    if (analise.produtosAfetados > 0) {
      analise.impactoMedio = analise.impactoTotal / analise.produtosAfetados;
    }

    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('RELATÓRIO DE IMPACTO DE PRECIFICAÇÃO', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Pedido: ${pedido.numero || 'N/A'}`, 20, y);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, y);
    y += 15;

    // Resumo Executivo
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMO EXECUTIVO', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    if (analise.produtosAfetados === 0) {
      doc.text('• Nenhuma alteração de custo detectada neste pedido', 25, y);
      y += 6;
      doc.text('• Os preços de venda atuais permanecem inalterados', 25, y);
    } else {
      doc.text(`• Produtos afetados: ${analise.produtosAfetados}`, 25, y);
      y += 6;
      doc.text(`• Aumentos de custo: ${analise.aumentosPreco.length} produto(s)`, 25, y);
      y += 6;
      doc.text(`• Reduções de custo: ${analise.reducoesPreco.length} produto(s)`, 25, y);
      y += 6;
      doc.text(`• Impacto médio por produto: R$ ${analise.impactoMedio.toFixed(2)}`, 25, y);
      y += 6;
      doc.text(`• Impacto total estimado: R$ ${analise.impactoTotal.toFixed(2)}`, 25, y);
    }
    
    y += 12;

    if (analise.aumentosPreco.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('PRODUTOS COM AUMENTO DE CUSTO', 20, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Produto', 20, y);
      doc.text('Custo Atual', 100, y);
      doc.text('Novo Custo', 130, y);
      doc.text('Variação', 160, y);
      doc.text('% Impacto', 185, y);
      y += 5;

      doc.setFont(undefined, 'normal');
      analise.aumentosPreco.forEach(item => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        const nome = item.nome.length > 45 ? item.nome.substring(0, 45) + '...' : item.nome;
        doc.text(nome, 20, y);
        doc.text(`R$ ${item.custoAtual.toFixed(2)}`, 100, y);
        doc.text(`R$ ${item.novoCusto.toFixed(2)}`, 130, y);
        doc.setTextColor(200, 0, 0);
        doc.text(`+R$ ${item.diferenca.toFixed(2)}`, 160, y);
        doc.text(`+${item.percentual.toFixed(1)}%`, 185, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      });

      y += 10;
    }

    if (analise.reducoesPreco.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('PRODUTOS COM REDUÇÃO DE CUSTO', 20, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Produto', 20, y);
      doc.text('Custo Atual', 100, y);
      doc.text('Novo Custo', 130, y);
      doc.text('Variação', 160, y);
      doc.text('% Impacto', 185, y);
      y += 5;

      doc.setFont(undefined, 'normal');
      analise.reducoesPreco.forEach(item => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        const nome = item.nome.length > 45 ? item.nome.substring(0, 45) + '...' : item.nome;
        doc.text(nome, 20, y);
        doc.text(`R$ ${item.custoAtual.toFixed(2)}`, 100, y);
        doc.text(`R$ ${item.novoCusto.toFixed(2)}`, 130, y);
        doc.setTextColor(0, 150, 0);
        doc.text(`-R$ ${Math.abs(item.diferenca).toFixed(2)}`, 160, y);
        doc.text(`${item.percentual.toFixed(1)}%`, 185, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      });

      y += 10;
    }

    // Recomendações
    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RECOMENDAÇÕES', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    if (analise.aumentosPreco.length > 0) {
      doc.text('• Revisar preços de venda dos produtos com aumento de custo', 25, y);
      y += 6;
      doc.text('• Comunicar aumentos ao time comercial antes de atualizar', 25, y);
      y += 6;
      doc.text('• Avaliar impacto na competitividade dos produtos afetados', 25, y);
      y += 6;
    }
    
    if (analise.reducoesPreco.length > 0) {
      doc.text('• Considerar manter preços atuais para melhorar margem', 25, y);
      y += 6;
      doc.text('• Avaliar oportunidades de promoções estratégicas', 25, y);
      y += 6;
    }

    doc.text('• Atualizar sistema de gestão após conferência da mercadoria', 25, y);
    y += 10;

    // Assinatura
    y += 10;
    doc.setFontSize(10);
    doc.text('_'.repeat(40), 20, y);
    doc.text('_'.repeat(40), 120, y);
    y += 5;
    doc.text('Responsável pela Compra', 30, y);
    doc.text('Gestor Comercial', 135, y);

    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Relatorio_Precificacao_${pedido.numero}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ 
      error: 'Erro ao gerar relatório',
      details: error.message 
    }, { status: 500 });
  }
});