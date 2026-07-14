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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lancamentos = [], filtros_desc = '', kpis = {} } = await req.json();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    let y = 14;

    const line = () => { doc.setDrawColor(220,220,220); doc.line(M, y, W - M, y); y += 3; };
    const newPage = () => { doc.addPage(); y = 14; };
    const checkY = (h) => { if (y + h > 275) newPage(); };

    // Header
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text(safe('VAREJOSYNC'), M, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text(safe('Relatorio de Contas em Aberto'), M, y + 5);
    doc.text(safe(new Date().toLocaleString('pt-BR')), W - M, y + 5, { align: 'right' });
    y += 10;
    line();

    // Filtros
    if (filtros_desc) {
      doc.setFontSize(8);
      doc.setFont('courier', 'normal');
      doc.text(safe(`Filtros: ${filtros_desc}`), M, y);
      y += 5;
      line();
    }

    // KPIs
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text(safe(`A Receber: ${fmt(kpis.aReceber)}`), M, y);
    doc.text(safe(`A Pagar: ${fmt(kpis.aPagar)}`), W / 2, y);
    y += 5;
    doc.text(safe(`Saldo Projetado: ${fmt(kpis.saldoProjetado)}`), M, y);
    if (kpis.vencidas > 0) {
      doc.setTextColor(200, 50, 50);
      doc.text(safe(`Vencidas: ${fmt(kpis.vencidas)}`), W / 2, y);
      doc.setTextColor(0, 0, 0);
    }
    y += 5;
    line();

    // Cabeçalho da tabela
    const colVenc = M;
    const colDesc = M + 28;
    const colValor = W - M;

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text('VENCIMENTO', colVenc, y);
    doc.text('DESCRICAO / COMPETENCIA', colDesc, y);
    doc.text('VALOR', colValor, y, { align: 'right' });
    y += 2;
    line();

    // Linhas
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);

    for (const l of lancamentos) {
      checkY(10);
      const venc = fmtDate(l.data_vencimento);
      const pago = l.status === 'Pago';
      const isR = l.tipo === 'Receita';
      const val = Math.abs(l.valor || 0);
      const sinal = isR ? '+' : '-';
      const tags = (l.tags || []).join(', ');
      const descFull = safe(l.descricao || '-');
      const sub = safe([l.categoria, tags].filter(Boolean).join(' | '));

      if (pago) doc.setTextColor(120, 160, 120);
      else if (!isR && l.data_vencimento && l.data_vencimento < new Date().toISOString().slice(0,10)) doc.setTextColor(180, 60, 60);
      else doc.setTextColor(50, 50, 50);

      doc.text(venc, colVenc, y);
      doc.text(descFull.slice(0, 52), colDesc, y);
      doc.setFont('courier', 'bold');
      doc.text(`${sinal}${fmt(val)}`, colValor, y, { align: 'right' });
      doc.setFont('courier', 'normal');

      if (sub) {
        y += 4;
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(6.5);
        doc.text(sub.slice(0, 70), colDesc, y);
        doc.setFontSize(7.5);
      }
      if (pago) {
        doc.text('PAGO', colVenc, y + (sub ? 0 : 4));
      }
      doc.setTextColor(0, 0, 0);
      y += 6;
      doc.setDrawColor(240, 240, 240);
      doc.line(M, y - 2, W - M, y - 2);
    }

    // Totais
    checkY(14);
    y += 2;
    line();
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(safe(`Total A Receber: ${fmt(kpis.aReceber)}`), M, y); y += 5;
    doc.text(safe(`Total A Pagar:   ${fmt(kpis.aPagar)}`), M, y); y += 5;
    doc.setFontSize(9);
    doc.text(safe(`Saldo Projetado: ${fmt(kpis.saldoProjetado)}`), M, y);

    // Rodapé
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Nao e documento fiscal', W / 2, 290, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=ContasAbertas.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});