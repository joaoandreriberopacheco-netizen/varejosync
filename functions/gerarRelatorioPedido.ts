import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return Response.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    // Buscar pedido
    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];

    // Buscar dados relacionados
    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      referencia_id: pedido_id,
      referencia_tipo: 'PedidoCompra'
    });

    const divergencias = await base44.asServiceRole.entities.DivergenciaCompra.filter({
      pedido_compra_id: pedido_id
    });

    let supermanifesto = null;
    if (pedido.supermanifesto_id) {
      const manifestos = await base44.asServiceRole.entities.Supermanifesto.filter({ id: pedido.supermanifesto_id });
      if (manifestos && manifestos.length > 0) {
        supermanifesto = manifestos[0];
      }
    }

    // Criar PDF
    const doc = new jsPDF();
    let y = 20;

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('PEDIDO DE COMPRA', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(pedido.numero || 'N/A', 105, y, { align: 'center' });
    y += 15;

    // Dados Gerais
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS GERAIS', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Fornecedor: ${pedido.fornecedor_nome || 'N/A'}`, 14, y);
    y += 6;
    doc.text(`Status: ${pedido.status || 'N/A'}`, 14, y);
    y += 6;
    doc.text(`Criado em: ${pedido.created_date ? new Date(pedido.created_date).toLocaleDateString('pt-BR') : 'N/A'}`, 14, y);
    y += 6;
    doc.text(`Criado por: ${pedido.created_by || 'N/A'}`, 14, y);
    y += 6;

    if (pedido.data_aprovacao_financeira) {
      doc.text(`Aprovação Financeira: ${new Date(pedido.data_aprovacao_financeira).toLocaleDateString('pt-BR')}`, 14, y);
      y += 6;
    }
    if (pedido.data_despacho) {
      doc.text(`Despacho: ${new Date(pedido.data_despacho).toLocaleDateString('pt-BR')}`, 14, y);
      y += 6;
    }
    if (pedido.data_chegada) {
      doc.text(`Chegada: ${new Date(pedido.data_chegada).toLocaleDateString('pt-BR')}`, 14, y);
      y += 6;
    }
    if (pedido.data_conclusao) {
      doc.text(`Conclusão: ${new Date(pedido.data_conclusao).toLocaleDateString('pt-BR')}`, 14, y);
      y += 6;
    }

    y += 4;

    // Itens
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Produto', 14, y);
    doc.text('Qtd', 120, y);
    doc.text('Custo Unit.', 145, y);
    doc.text('Total', 175, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    if (pedido.itens && pedido.itens.length > 0) {
      pedido.itens.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(item.produto_nome?.substring(0, 40) || 'N/A', 14, y);
        doc.text(String(item.quantidade || 0), 120, y);
        doc.text(`R$ ${(item.custo_unitario || 0).toFixed(2)}`, 145, y);
        doc.text(`R$ ${(item.total || 0).toFixed(2)}`, 175, y);
        y += 6;
      });
    }

    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: R$ ${(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 145, y);
    y += 10;

    // Financeiro
    if (lancamentos.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text('FINANCEIRO', 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.text('Descrição', 14, y);
      doc.text('Vencimento', 110, y);
      doc.text('Status', 150, y);
      doc.text('Valor', 175, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      lancamentos.forEach((lanc) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(lanc.descricao?.substring(0, 30) || 'N/A', 14, y);
        doc.text(lanc.data_vencimento ? new Date(lanc.data_vencimento).toLocaleDateString('pt-BR') : 'N/A', 110, y);
        doc.text(lanc.status || 'N/A', 150, y);
        doc.text(`R$ ${(lanc.valor || 0).toFixed(2)}`, 175, y);
        y += 6;
      });
      y += 6;
    }

    // Logística
    if (supermanifesto || pedido.qtd_volumes) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('LOGÍSTICA', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      if (supermanifesto) {
        doc.text(`Supermanifesto: ${supermanifesto.numero}`, 14, y);
        y += 6;
        doc.text(`Transportadora: ${supermanifesto.transportadora_nome}`, 14, y);
        y += 6;
        doc.text(`ETA: ${supermanifesto.eta ? new Date(supermanifesto.eta).toLocaleString('pt-BR') : 'N/A'}`, 14, y);
        y += 6;
      }
      if (pedido.qtd_volumes) {
        doc.text(`Volumes: ${pedido.qtd_volumes} ${pedido.tipo_volume || ''}`, 14, y);
        y += 6;
      }
      if (pedido.peso_total_kg) {
        doc.text(`Peso Total: ${pedido.peso_total_kg} kg`, 14, y);
        y += 6;
      }
      y += 4;
    }

    // Conferência
    if (divergencias.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('RESULTADO DA CONFERÊNCIA', 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.text('Produto', 14, y);
      doc.text('Tipo', 100, y);
      doc.text('Esperado', 135, y);
      doc.text('Recebido', 165, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      divergencias.forEach((div) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(div.produto_nome?.substring(0, 30) || 'N/A', 14, y);
        doc.text(div.tipo || 'N/A', 100, y);
        doc.text(String(div.quantidade_esperada || 0), 135, y);
        doc.text(String(div.quantidade_recebida || 0), 165, y);
        y += 6;
      });
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${pedido.numero || 'compra'}.pdf`
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});