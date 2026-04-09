import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const summary = body?.summary || {};

    if (items.length === 0) {
      return Response.json({ error: 'Carrinho vazio' }, { status: 400 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 180],
    });

    const formatCurrency = (value) => `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const pageWidth = 80;
    const margin = 6;
    const contentWidth = pageWidth - margin * 2;
    let y = 10;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(4, 4, 72, 172, 4, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Orçamento Rápido', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    items.forEach((item) => {
      const nameLines = doc.splitTextToSize(String(item.produto_nome || 'Item'), contentWidth - 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(nameLines, margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const detailY = y + (nameLines.length * 4) + 1;
      doc.text(`${Number(item.quantidade || 0)} x ${formatCurrency(item.preco_unitario)}`, margin, detailY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(item.total), pageWidth - margin, detailY, { align: 'right' });

      y = detailY + 7;
    });

    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Itens', margin, y);
    doc.text(String(summary.quantidadeItens || 0), pageWidth - margin, y, { align: 'right' });
    y += 5;

    doc.text('Subtotal', margin, y);
    doc.text(formatCurrency(summary.subtotal), pageWidth - margin, y, { align: 'right' });
    y += 5;

    if (Number(summary.desconto || 0) > 0) {
      doc.text('Desconto', margin, y);
      doc.text(formatCurrency(summary.desconto), pageWidth - margin, y, { align: 'right' });
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Total', margin, y + 2);
    doc.text(formatCurrency(summary.total), pageWidth - margin, y + 2, { align: 'right' });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=orcamento-mobile.pdf'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});