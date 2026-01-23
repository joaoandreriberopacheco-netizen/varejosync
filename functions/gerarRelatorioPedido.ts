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

    // Timeline no topo
    const timeline = [
      { label: 'Rascunho', date: pedido.created_date },
      { label: 'Aprovado', date: pedido.data_aprovacao_financeira },
      { label: 'Despachado', date: pedido.data_despacho },
      { label: 'Entregue', date: pedido.data_chegada },
      { label: 'Concluído', date: pedido.data_conclusao }
    ];

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    let xPos = 20;
    timeline.forEach((stage, idx) => {
      doc.text(stage.label, xPos, y);
      if (stage.date) {
        doc.text(new Date(stage.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), xPos, y + 4);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text('Pendente', xPos, y + 4);
        doc.setTextColor(0, 0, 0);
      }
      xPos += 37;
    });
    y += 12;

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
    doc.text(`Fornecedor: ${pedido.fornecedor_nome || 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Status: ${pedido.status || 'Rascunho'}`, 14, y);
    y += 6;
    doc.text(`Status Financeiro: ${pedido.status_aprovacao_financeira || 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Criado em: ${pedido.created_date ? new Date(pedido.created_date).toLocaleDateString('pt-BR') : 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Criado por: ${pedido.created_by || 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Data Prevista Entrega: ${pedido.data_prevista_entrega ? new Date(pedido.data_prevista_entrega).toLocaleDateString('pt-BR') : 'Pendente'}`, 14, y);
    y += 6;
    
    if (pedido.observacoes) {
      doc.text(`Observações: ${pedido.observacoes}`, 14, y);
      y += 6;
    }
    
    if (pedido.tags && pedido.tags.length > 0) {
      doc.text(`Tags: ${pedido.tags.join(', ')}`, 14, y);
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
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('FINANCEIRO', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Forma de Pagamento: ${pedido.forma_pagamento_compra || 'Pendente'}`, 14, y);
    y += 6;
    
    if (pedido.forma_pagamento_compra === 'Parcelado') {
      doc.text(`Número de Parcelas: ${pedido.num_parcelas || 'Pendente'}`, 14, y);
      y += 6;
      doc.text(`Intervalo: ${pedido.intervalo_parcelas_dias || 'Pendente'} dias`, 14, y);
      y += 6;
    }
    
    doc.text(`Primeiro Vencimento: ${pedido.data_primeiro_vencimento ? new Date(pedido.data_primeiro_vencimento).toLocaleDateString('pt-BR') : 'Pendente'}`, 14, y);
    y += 6;
    
    if (pedido.condicoes_pagamento) {
      doc.text(`Condições: ${pedido.condicoes_pagamento}`, 14, y);
      y += 6;
    }
    y += 4;

    if (lancamentos.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
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
        doc.text(lanc.data_vencimento ? new Date(lanc.data_vencimento).toLocaleDateString('pt-BR') : 'Pendente', 110, y);
        doc.text(lanc.status || 'Pendente', 150, y);
        doc.text(`R$ ${(lanc.valor || 0).toFixed(2)}`, 175, y);
        y += 6;
      });
    } else {
      doc.text('Nenhum lançamento financeiro gerado ainda.', 14, y);
      y += 6;
    }
    y += 6;

    // Logística
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
      doc.text(`ETA: ${supermanifesto.eta ? new Date(supermanifesto.eta).toLocaleString('pt-BR') : 'Pendente'}`, 14, y);
      y += 6;
      doc.text(`Status: ${supermanifesto.status || 'Pendente'}`, 14, y);
      y += 6;
    } else {
      doc.text('Supermanifesto: Pendente', 14, y);
      y += 6;
    }
    
    doc.text(`Volumes: ${pedido.qtd_volumes || 0} ${pedido.tipo_volume || 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Peso Total: ${pedido.peso_total_kg || 0} kg`, 14, y);
    y += 6;
    doc.text(`NF Emitida: ${pedido.nfe_emitida ? 'Sim' : 'Pendente'}`, 14, y);
    y += 6;
    doc.text(`Manifesto Conferido: ${pedido.manifesto_conferido ? 'Sim' : 'Pendente'}`, 14, y);
    y += 8;

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
      y += 6;
    } else {
      doc.text('Conferência: Pendente', 14, y);
      y += 8;
    }

    // Assinaturas
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('_'.repeat(40), 14, y);
    doc.text('_'.repeat(40), 115, y);
    y += 5;
    doc.text('Responsável pela Compra', 20, y);
    doc.text('Gestor de Compras', 130, y);
    y += 10;
    doc.text('Data: ____/____/________', 20, y);
    doc.text('Data: ____/____/________', 115, y);

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