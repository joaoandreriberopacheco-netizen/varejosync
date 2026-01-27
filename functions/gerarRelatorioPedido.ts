import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safeText = (text) => {
  if (!text) return '';
  return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return 'R$ 0,00';
  const num = parseFloat(value);
  return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const formatDate = (dateString) => {
  if (!dateString) return 'Pendente';
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return 'Pendente';
  }
};

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
      return Response.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    
    if (!pedidos || pedidos.length === 0) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    
    const pedido = pedidos[0];
    const fornecedor = await base44.asServiceRole.entities.Terceiro.get(pedido.fornecedor_id);

    const doc = new jsPDF();
    doc.setFont('helvetica');

    let y = 15;

    // Timeline gráfica no topo
    const stages = [
      { key: 'Rascunho', label: 'Rascunho', x: 30 },
      { key: 'Aprovado', label: 'Aprovado', x: 70 },
      { key: 'Despachado', label: 'Despachado', x: 110 },
      { key: 'Entregue', label: 'Entregue', x: 150 },
      { key: 'Concluido', label: 'Concluido', x: 190 }
    ];

    const getStageIndex = (status, aprovacao) => {
      if (status === 'Cancelado') return -1;
      if (status === 'Rascunho' || status === 'Enviado') return 0;
      if (aprovacao === 'Aprovado') return 1;
      if (status === 'Despachado') return 2;
      if (status === 'Em Transito' || status === 'Aguardando Recepcao') return 3;
      if (status === 'Pendencias') return 3;
      if (status === 'Concluido') return 4;
      return 0;
    };

    const currentIndex = getStageIndex(pedido.status, pedido.status_aprovacao_financeira);

    // Desenhar timeline
    doc.setFontSize(8);
    stages.forEach((stage, idx) => {
      const isCompleted = idx <= currentIndex;
      
      // Linha conectando ao próximo
      if (idx < stages.length - 1) {
        doc.setDrawColor(isCompleted ? 50 : 200);
        doc.setLineWidth(0.8);
        doc.line(stage.x + 4, y, stages[idx + 1].x - 4, y);
      }
      
      // Círculo do estágio
      doc.setFillColor(isCompleted ? 50 : 220);
      doc.circle(stage.x, y, 4, 'F');
      
      // Label
      doc.setTextColor(isCompleted ? 0 : 150);
      doc.setFontSize(7);
      const textWidth = doc.getTextWidth(safeText(stage.label));
      doc.text(safeText(stage.label), stage.x - textWidth / 2, y - 7);
      
      // Data ou status
      doc.setFontSize(6);
      let dateText = 'Pendente';
      if (idx === 0 && pedido.created_date) {
        dateText = formatDate(pedido.created_date).substring(0, 5);
      } else if (isCompleted && idx === currentIndex) {
        dateText = formatDate(new Date()).substring(0, 5);
      }
      const dateWidth = doc.getTextWidth(safeText(dateText));
      doc.text(safeText(dateText), stage.x - dateWidth / 2, y + 5);
    });

    doc.setTextColor(0);
    y += 15;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('PEDIDO DE COMPRA'), 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(14);
    doc.text(safeText(pedido.numero || 'N/A'), 105, y, { align: 'center' });
    y += 15;

    doc.setFont('helvetica', 'normal');

    // DADOS GERAIS
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('DADOS GERAIS'), 10, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Fornecedor: ${fornecedor?.nome || pedido.fornecedor_nome}`), 10, y);
    y += 5;
    doc.text(safeText(`Status: ${pedido.status || 'Rascunho'}`), 10, y);
    y += 5;
    doc.text(safeText(`Status Financeiro: ${pedido.status_aprovacao_financeira || 'Pendente'}`), 10, y);
    y += 5;
    doc.text(safeText(`Criado em: ${formatDate(pedido.created_date)}`), 10, y);
    y += 5;
    doc.text(safeText(`Criado por: ${pedido.created_by || user.email}`), 10, y);
    y += 5;
    doc.text(safeText(`Data Prevista Entrega: ${formatDate(pedido.data_prevista_entrega)}`), 10, y);
    y += 10;

    // ITENS DO PEDIDO
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('ITENS DO PEDIDO'), 10, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 1, 190, 6, 'F');
    doc.text(safeText('Produto'), 12, y + 3.5);
    doc.text(safeText('Qtd'), 130, y + 3.5, { align: 'right' });
    doc.text(safeText('Custo Unit.'), 160, y + 3.5, { align: 'right' });
    doc.text(safeText('Total'), 198, y + 3.5, { align: 'right' });
    y += 6;
    
    doc.setFont('helvetica', 'normal');

    pedido.itens?.forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.text(safeText(item.produto_nome), 12, y + 3);
      doc.text(safeText(item.quantidade?.toString() || '0'), 130, y + 3, { align: 'right' });
      doc.text(safeText(formatCurrency(item.custo_final_unitario || 0)), 160, y + 3, { align: 'right' });
      doc.text(safeText(formatCurrency(item.total || 0)), 198, y + 3, { align: 'right' });
      y += 6;
    });
    y += 5;

    // Totais
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(`VALOR TOTAL: ${formatCurrency(pedido.valor_total)}`), 198, y, { align: 'right' });
    y += 12;

    // FINANCEIRO
    doc.setFontSize(11);
    doc.text(safeText('FINANCEIRO'), 10, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Forma de Pagamento: ${pedido.forma_pagamento_compra || 'Pendente'}`), 10, y);
    y += 5;
    doc.text(safeText(`Primeiro Vencimento: ${formatDate(pedido.data_primeiro_vencimento)}`), 10, y);
    y += 7;
    
    doc.setFontSize(8);
    doc.text(safeText('Nenhum lancamento financeiro gerado ainda.'), 10, y);
    y += 12;

    // LOGÍSTICA
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('LOGISTICA'), 10, y);
    y += 7;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Supermanifesto: ${pedido.supermanifesto_id ? 'Vinculado' : 'Pendente'}`), 10, y);
    y += 5;
    doc.text(safeText(`Volumes: ${pedido.qtd_volumes || 0} ${pedido.tipo_volume || 'Caixas'}`), 10, y);
    y += 5;
    doc.text(safeText(`Peso Total: ${pedido.peso_total_kg || 0} kg`), 10, y);
    y += 5;
    doc.text(safeText(`NF Emitida: ${pedido.nfe_emitida ? 'Sim' : 'Pendente'}`), 10, y);
    y += 5;
    doc.text(safeText(`Manifesto Conferido: ${pedido.manifesto_conferido ? 'Sim' : 'Pendente'}`), 10, y);
    y += 5;
    doc.text(safeText(`Conferencia: ${pedido.conferencia_id ? 'Realizada' : 'Pendente'}`), 10, y);
    y += 15;

    // Linhas de assinatura
    doc.setLineWidth(0.3);
    doc.line(10, y, 90, y);
    doc.line(120, y, 200, y);
    y += 5;
    
    doc.setFontSize(8);
    doc.text(safeText('Responsavel pela Compra'), 10, y);
    doc.text(safeText('Gestor de Compras'), 120, y);
    y += 7;
    doc.text(safeText(`Data: ____/____/________`), 10, y);
    doc.text(safeText(`Data: ____/____/________`), 120, y);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_compra_${pedido.numero}.pdf`,
      },
    });

  } catch (error) {
    console.error('ERRO:', error);
    return Response.json({
      error: 'Erro ao gerar relatório',
      message: error.message
    }, { status: 500 });
  }
});