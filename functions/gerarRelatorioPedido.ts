import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[ÀÁÂÃÄÅ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/[Ç]/g, 'C')
    .replace(/[Ñ]/g, 'N');
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return 'R$ 0,00';
  const num = parseFloat(value);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return '-';
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
    doc.setFontSize(10);

    let y = 15;

    // Timeline grafica no topo
    const stages = [
      { key: 'Rascunho', label: 'Rascunho', x: 30 },
      { key: 'Aprovado', label: 'Aprovado', x: 72 },
      { key: 'Despachado', label: 'Despachado', x: 114 },
      { key: 'Entregue', label: 'Entregue', x: 156 },
      { key: 'Concluido', label: 'Concluido', x: 198 }
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

    // Desenhar timeline com icones
    doc.setFontSize(8);
    stages.forEach((stage, idx) => {
      const isCompleted = idx <= currentIndex;
      
      // Linha conectando ao proximo
      if (idx < stages.length - 1) {
        doc.setDrawColor(isCompleted ? 80 : 200);
        doc.setLineWidth(0.8);
        doc.line(stage.x + 4, y + 3, stages[idx + 1].x - 4, y + 3);
      }
      
      // Circulo do estagio
      if (isCompleted) {
        doc.setFillColor(70, 70, 70);
        doc.setDrawColor(70, 70, 70);
      } else {
        doc.setFillColor(220, 220, 220);
        doc.setDrawColor(200, 200, 200);
      }
      doc.circle(stage.x, y + 3, 4, 'FD');
      
      // Label acima
      doc.setTextColor(isCompleted ? 0 : 150);
      doc.setFontSize(8);
      const textWidth = doc.getTextWidth(safeText(stage.label));
      doc.text(safeText(stage.label), stage.x - textWidth / 2, y - 2);
      
      // Data ou status abaixo
      doc.setFontSize(7);
      doc.setTextColor(isCompleted ? 0 : 150);
      let dateText = 'Pendente';
      if (idx === 0 && pedido.created_date) {
        dateText = formatDate(pedido.created_date).substring(0, 5);
      } else if (isCompleted && idx === currentIndex) {
        dateText = formatDate(new Date()).substring(0, 5);
      }
      const dateWidth = doc.getTextWidth(safeText(dateText));
      doc.text(safeText(dateText), stage.x - dateWidth / 2, y + 10);
    });

    doc.setTextColor(0);
    y += 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('PEDIDO DE COMPRA'), 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(pedido.numero || 'N/A'), 105, y, { align: 'center' });
    y += 12;

    // Secao DADOS GERAIS
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('DADOS GERAIS'), 10, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Fornecedor: ${fornecedor?.nome || pedido.fornecedor_nome || 'N/A'}`), 10, y);
    y += 6;
    doc.text(safeText(`Status: ${pedido.status || 'N/A'}`), 10, y);
    y += 6;
    doc.text(safeText(`Status Financeiro: ${pedido.status_aprovacao_financeira || 'Pendente'}`), 10, y);
    y += 6;
    doc.text(safeText(`Criado em: ${formatDate(pedido.created_date)}`), 10, y);
    y += 6;
    doc.text(safeText(`Criado por: ${pedido.created_by || user.email}`), 10, y);
    y += 6;
    doc.text(safeText(`Data Prevista Entrega: ${formatDate(pedido.data_prevista_entrega) || 'Pendente'}`), 10, y);
    y += 10;

    // Secao ITENS DO PEDIDO
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('ITENS DO PEDIDO'), 10, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(230, 230, 230);
    doc.rect(10, y, 190, 7, 'F');
    doc.text(safeText('Produto'), 12, y + 5);
    doc.text(safeText('Qtd'), 120, y + 5);
    doc.text(safeText('Custo Un.'), 145, y + 5);
    doc.text(safeText('Total'), 175, y + 5);
    y += 7;

    pedido.itens?.forEach(item => {
      if (y > 265) {
        doc.addPage();
        y = 20;
        doc.setFontSize(10);
        doc.setFillColor(230, 230, 230);
        doc.rect(10, y, 190, 7, 'F');
        doc.text(safeText('Produto'), 12, y + 5);
        doc.text(safeText('Qtd'), 120, y + 5);
        doc.text(safeText('Custo Un.'), 145, y + 5);
        doc.text(safeText('Total'), 175, y + 5);
        y += 7;
      }
      doc.text(safeText(item.produto_nome || ''), 12, y + 5);
      doc.text(safeText(item.quantidade?.toString() || '0'), 120, y + 5);
      doc.text(safeText(formatCurrency(item.custo_unitario || item.custo_final_unitario)), 145, y + 5);
      doc.text(safeText(formatCurrency(item.total)), 175, y + 5);
      y += 7;
    });
    y += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(safeText(`VALOR TOTAL: ${formatCurrency(pedido.valor_total)}`), 120, y);
    y += 12;

    // Secao FINANCEIRO
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('FINANCEIRO'), 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Forma de Pagamento: ${pedido.forma_pagamento || 'Pendente'}`), 10, y);
    y += 6;
    doc.text(safeText(`Primeiro Vencimento: ${formatDate(pedido.primeiro_vencimento) || 'Pendente'}`), 10, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(safeText('Nenhum lancamento financeiro gerado ainda.'), 10, y);
    y += 12;

    // Secao LOGISTICA
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText('LOGISTICA'), 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(`Supermanifesto: ${pedido.supermanifesto_id ? 'Vinculado' : 'Pendente'}`), 10, y);
    y += 6;
    doc.text(safeText(`Volumes: ${pedido.qtd_volumes || 0} ${pedido.tipo_volume || 'Caixas'}`), 10, y);
    y += 6;
    doc.text(safeText(`Peso Total: ${pedido.peso_total_kg || 0} kg`), 10, y);
    y += 6;
    doc.text(safeText(`NF Emitida: ${pedido.nfe_emitida ? 'Sim' : 'Pendente'}`), 10, y);
    y += 6;
    doc.text(safeText(`Manifesto Conferido: ${pedido.manifesto_conferido ? 'Sim' : 'Pendente'}`), 10, y);
    y += 6;
    doc.text(safeText(`Conferencia: ${pedido.conferencia_id ? 'Realizada' : 'Pendente'}`), 10, y);
    y += 15;

    // Linhas de assinatura
    doc.setLineWidth(0.5);
    doc.line(10, y, 90, y);
    doc.line(120, y, 200, y);
    y += 5;
    doc.setFontSize(9);
    doc.text(safeText('Responsavel pela Compra'), 10, y);
    doc.text(safeText('Gestor de Compras'), 120, y);
    y += 8;
    doc.text(safeText('Data: ____/____/________'), 10, y);
    doc.text(safeText('Data: ____/____/________'), 120, y);

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