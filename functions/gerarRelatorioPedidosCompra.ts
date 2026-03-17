import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';

const safe = (s) => (s || '').replace(/[\u0080-\uFFFF]/g, (c) => {
  const map = { 'ã':'a','â':'a','á':'a','à':'a','ä':'a','Ã':'A','Â':'A','Á':'A','À':'A','é':'e','ê':'e','è':'e','É':'E','Ê':'E','í':'i','Í':'I','ó':'o','ô':'o','õ':'o','Ó':'O','Ô':'O','Õ':'O','ú':'u','Ú':'U','ü':'u','ç':'c','Ç':'C','ñ':'n','–':'-','—':'-','"':'"','"':'"',};
  return map[c] || '?';
});

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('pt-BR');
};

const STATUS_CORES = {
  'Rascunho': [240, 240, 240],
  'Aguardando Liberação': [255, 250, 205],
  'Aprovado': [200, 255, 200],
  'Despachado': [200, 220, 255],
  'Em Recepção': [220, 200, 255],
  'Pendência': [255, 220, 150],
  'Devolvido': [255, 200, 200],
  'Concluído': [180, 255, 180],
  'Cancelado': [255, 180, 180],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { grupos = [], filtros_desc = '', kpis = {} } = await req.json();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 12;
    let y = 12;

    const line = (color = [220,220,220]) => { doc.setDrawColor(...color); doc.line(M, y, W - M, y); y += 2.5; };
    const newPage = () => { doc.addPage(); y = 12; };
    const checkY = (h) => { if (y + h > 275) newPage(); };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(safe('PEDIDOS DE COMPRA'), M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(safe(new Date().toLocaleString('pt-BR')), W - M, y, { align: 'right' });
    y += 8;
    line();

    // Filtros
    if (filtros_desc) {
      doc.setFontSize(8);
      doc.text(safe(`Filtros: ${filtros_desc}`), M, y);
      y += 4;
      line();
    }

    // KPIs resumo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(safe(`Total de Pedidos: ${kpis.totalPedidos || 0}`), M, y);
    doc.text(safe(`Total em Aberto: ${fmt(kpis.totalEmAberto || 0)}`), W / 2, y);
    y += 5;
    doc.text(safe(`Total Geral: ${fmt(kpis.totalGeral || 0)}`), M, y);
    y += 4;
    line();

    // Headers de coluna
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const colNum = M;
    const colForn = M + 25;
    const colStatus = M + 85;
    const colData = M + 115;
    const colValor = W - M;

    doc.text('PEDIDO', colNum, y);
    doc.text('FORNECEDOR', colForn, y);
    doc.text('STATUS', colStatus, y);
    doc.text('DATA', colData, y);
    doc.text('VALOR', colValor, y, { align: 'right' });
    y += 2.5;
    line([180,180,180]);

    // Grupos cronológicos
    for (const grupo of grupos) {
      checkY(10);

      // Header do grupo (data/label)
      doc.setFillColor(240, 240, 240);
      doc.rect(M, y - 1, W - 2*M, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(safe(grupo.label?.toUpperCase() || 'SEM DATA'), M + 1, y + 3);
      y += 6;

      // Pedidos do grupo
      for (const pedido of (grupo.pedidos || [])) {
        checkY(6);
        
        const statusCor = STATUS_CORES[pedido.status] || [240, 240, 240];
        doc.setFillColor(...statusCor);
        doc.rect(colStatus - 1, y - 2.5, 25, 5, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);

        doc.text(safe(pedido.numero?.slice(-8) || '-'), colNum, y);
        doc.text(safe((pedido.fornecedor_nome || '-').slice(0, 18)), colForn, y);
        doc.text(safe(pedido.status || '-'), colStatus, y);
        doc.text(safe(fmtDate(pedido.data_prevista_entrega || pedido.created_date)), colData, y);
        doc.setFont('helvetica', 'bold');
        doc.text(safe(fmt(pedido.valor_total || 0)), colValor, y, { align: 'right' });

        y += 5;
      }

      y += 2;
    }

    // Rodapé
    checkY(12);
    y += 2;
    line();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(safe(`Total Pedidos: ${kpis.totalPedidos || 0}`), M, y);
    y += 5;
    doc.text(safe(`Total Geral: ${fmt(kpis.totalGeral || 0)}`), M, y);
    y += 5;
    doc.text(safe(`Valor em Aberto: ${fmt(kpis.totalEmAberto || 0)}`), M, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Não é documento fiscal', W / 2, 290, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=RelatorioPedidosCompra.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});