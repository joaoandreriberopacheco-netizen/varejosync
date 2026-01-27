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

    let y = 20;

    // Timeline gráfica no topo
    const stages = [
      { key: 'Rascunho', label: 'Rascunho', x: 30 },
      { key: 'Aprovado', label: 'Aprovado', x: 70 },
      { key: 'Despachado', label: 'Despachado', x: 110 },
      { key: 'Entregue', label: 'Entregue', x: 150 },
      { key: 'Concluído', label: 'Concluído', x: 190 }
    ];

    const getStageIndex = (status, aprovacao) => {
      if (status === 'Cancelado') return -1;
      if (status === 'Rascunho' || status === 'Enviado') return 0;
      if (aprovacao === 'Aprovado') return 1;
      if (status === 'Despachado') return 2;
      if (status === 'Em Trânsito' || status === 'Aguardando Recepção') return 3;
      if (status === 'Pendências') return 3;
      if (status === 'Concluído') return 4;
      return 0;
    };

    const currentIndex = getStageIndex(pedido.status, pedido.status_aprovacao_financeira);

    // Desenhar timeline
    doc.setFontSize(8);
    stages.forEach((stage, idx) => {
      const isCompleted = idx <= currentIndex;
      
      // Linha conectando ao próximo
      if (idx < stages.length - 1) {
        doc.setDrawColor(isCompleted ? 60 : 200);
        doc.setLineWidth(0.5);
        doc.line(stage.x + 3, y, stages[idx + 1].x - 3, y);
      }
      
      // Círculo do estágio
      doc.setFillColor(isCompleted ? 60 : 220);
      doc.circle(stage.x, y, 3, 'F');
      
      // Label
      doc.setTextColor(isCompleted ? 60 : 150);
      const textWidth = doc.getTextWidth(safeText(stage.label));
      doc.text(safeText(stage.label), stage.x - textWidth / 2, y - 6);
      
      // Data ou status
      doc.setFontSize(7);
      let dateText = 'Pendente';
      if (idx === 0 && pedido.created_date) {
        dateText = formatDate(pedido.created_date).substring(0, 5);
      } else if (isCompleted && idx === currentIndex) {
        dateText = formatDate(new Date()).substring(0, 5);
      }
      const dateWidth = doc.getTextWidth(safeText(dateText));
      doc.text(safeText(dateText), stage.x - dateWidth / 2, y + 6);
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    y += 20;

    doc.setFontSize(16);
    doc.text(safeText(`PEDIDO DE COMPRA`), 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(14);
    doc.text(safeText(pedido.numero || 'N/A'), 105, y, { align: 'center' });
    y += 12;

    doc.setFontSize(10);
    doc.text(safeText(`Data Emissão: ${formatDate(pedido.created_date)}`), 10, y);
    y += 7;
    doc.text(safeText(`Data Prev. Entrega: ${formatDate(pedido.data_prevista_entrega)}`), 10, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(safeText('Fornecedor:'), 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(safeText(`Nome: ${fornecedor?.nome || pedido.fornecedor_nome}`), 10, y);
    y += 7;
    if (fornecedor?.cpf_cnpj) {
      doc.text(safeText(`CPF/CNPJ: ${fornecedor.cpf_cnpj}`), 10, y);
      y += 7;
    }
    if (fornecedor?.telefone) {
      doc.text(safeText(`Telefone: ${fornecedor.telefone}`), 10, y);
      y += 7;
    }
    if (fornecedor?.email) {
      doc.text(safeText(`Email: ${fornecedor.email}`), 10, y);
      y += 10;
    }

    doc.setFontSize(12);
    doc.text(safeText('Itens do Pedido:'), 10, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFillColor(230, 230, 230);
    doc.rect(10, y, 190, 7, 'F');
    doc.text(safeText('Produto'), 12, y + 5);
    doc.text(safeText('Qtd'), 100, y + 5);
    doc.text(safeText('Custo Un.'), 120, y + 5);
    doc.text(safeText('Total'), 175, y + 5);
    y += 7;

    pedido.itens?.forEach(item => {
      if (y > 280) {
        doc.addPage();
        y = 20;
        doc.setFontSize(10);
        doc.setFillColor(230, 230, 230);
        doc.rect(10, y, 190, 7, 'F');
        doc.text(safeText('Produto'), 12, y + 5);
        doc.text(safeText('Qtd'), 100, y + 5);
        doc.text(safeText('Custo Un.'), 120, y + 5);
        doc.text(safeText('Total'), 175, y + 5);
        y += 7;
      }
      doc.text(safeText(item.produto_nome), 12, y + 5);
      doc.text(safeText(item.quantidade?.toString() || '0'), 100, y + 5);
      doc.text(safeText(formatCurrency(item.custo_final_unitario)), 120, y + 5);
      doc.text(safeText(formatCurrency(item.total)), 175, y + 5);
      y += 7;
    });
    y += 5;

    doc.setFontSize(12);
    doc.text(safeText(`Valor Itens: ${formatCurrency(pedido.valor_itens)}`), 140, y);
    y += 7;
    doc.text(safeText(`Frete: ${formatCurrency(pedido.valor_frete)}`), 140, y);
    y += 7;
    doc.text(safeText(`Desconto: ${formatCurrency(pedido.valor_desconto)}`), 140, y);
    y += 7;
    doc.setFontSize(14);
    doc.text(safeText(`Valor Total: ${formatCurrency(pedido.valor_total)}`), 140, y);
    y += 10;

    if (pedido.observacoes) {
      doc.setFontSize(10);
      doc.text(safeText('Observações:'), 10, y);
      y += 5;
      doc.text(safeText(pedido.observacoes), 10, y, { maxWidth: 190 });
    }

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