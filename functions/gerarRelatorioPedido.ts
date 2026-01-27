import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safeText = (text) => {
  if (!text) return '';
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
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

    doc.setFontSize(16);
    doc.text(safeText(`Pedido de Compra - ${pedido.numero || 'N/A'}`), 10, y);
    y += 10;

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