// Port automático de base44/functions/gerarExtratoFluxoCaixa/entry.ts
import type { createP38Client } from '../p38Client.ts';

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

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { grupos = [], filtros_desc = '', kpis = {} } = await req.json();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 14;
    let y = 14;

    const line = (color = [220,220,220]) => { doc.setDrawColor(...color); doc.line(M, y, W - M, y); y += 3; };
    const newPage = () => { doc.addPage(); y = 14; };
    const checkY = (h) => { if (y + h > 275) newPage(); };

    // Header
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    doc.text(safe('VAREJOSYNC'), M, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.text(safe('Extrato de Fluxo de Caixa'), M, y + 5);
    doc.text(safe(new Date().toLocaleString('pt-BR')), W - M, y + 5, { align: 'right' });
    y += 10;
    line();

    // Filtros
    if (filtros_desc) {
      doc.setFontSize(8);
      doc.text(safe(`Periodo/Filtros: ${filtros_desc}`), M, y);
      y += 5;
      line();
    }

    // KPIs de resumo
    doc.setFontSize(8);
    doc.setFont('courier', 'bold');
    doc.text(safe(`Entrou: ${fmt(kpis.entrou)}`), M, y);
    doc.text(safe(`Saiu: ${fmt(kpis.saiu)}`), W / 2, y);
    y += 5;
    const saldo = (kpis.entrou || 0) - (kpis.saiu || 0);
    if (saldo < 0) doc.setTextColor(180, 60, 60);
    doc.text(safe(`Saldo do Periodo: ${fmt(saldo)}`), M, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    line();

    // Colunas
    const colData  = M;
    const colDesc  = M + 22;
    const colConta = M + 95;
    const colSaldo = W - M;

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text('DATA', colData, y);
    doc.text('DESCRICAO', colDesc, y);
    doc.text('CONTA', colConta, y);
    doc.text('VALOR / SALDO', colSaldo, y, { align: 'right' });
    y += 2;
    line([200,200,200]);

    // Grupos cronológicos
    for (const grupo of grupos) {
      checkY(12);

      // Header do grupo
      doc.setFillColor(245, 245, 245);
      doc.rect(M, y - 1, W - 2*M, 6, 'F');
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(safe(grupo.label.toUpperCase()), M + 1, y + 3);

      const saldoAcum = grupo.totais?.saldoAcumulado ?? grupo.saldoAcumulado;
      if (saldoAcum !== null && saldoAcum !== undefined) {
        doc.setFont('courier', 'bold');
        if (saldoAcum < 0) doc.setTextColor(180, 60, 60);
        else doc.setTextColor(40, 120, 80);
        doc.text(safe(`Saldo acum: ${fmt(saldoAcum)}`), W - M - 1, y + 3, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
      y += 7;

      // Lançamentos do grupo
      for (const l of (grupo.items || [])) {
        checkY(8);
        const isR = l.tipo === 'Receita';
        const isTransf = l.tipo === 'Transferencia' || l.tipo === 'Transferência';
        const pago = l.status === 'Pago';
        const prev = !pago && l.status !== 'Cancelado';
        const val = Math.abs(l.valor || 0);
        const sinal = isTransf ? '±' : (isR ? '+' : '-');
        const data = l.data_pagamento || l.data_vencimento;

        if (prev) doc.setTextColor(160, 160, 160);
        else if (isR) doc.setTextColor(40, 120, 80);
        else if (isTransf) doc.setTextColor(80, 80, 180);
        else doc.setTextColor(180, 60, 60);

        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.text(safe(fmtDate(data)), colData, y);
        doc.text(safe((l.descricao || '-').slice(0, 38)), colDesc, y);
        doc.text(safe((l.conta_financeira_nome || '-').slice(0, 18)), colConta, y);
        doc.setFont('courier', 'bold');
        doc.text(`${sinal}${fmt(val)}${prev ? ' (prev)' : ''}`, colSaldo, y, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        doc.setFont('courier', 'normal');
        y += 5;
      }

      // Linha separadora entre grupos
      doc.setDrawColor(230,230,230);
      doc.line(M, y, W - M, y);
      y += 3;
    }

    // Rodapé
    checkY(12);
    y += 2;
    line();
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.text(safe(`Total Entrou: ${fmt(kpis.entrou || 0)}`), M, y); y += 5;
    doc.text(safe(`Total Saiu:   ${fmt(kpis.saiu || 0)}`), M, y); y += 5;
    doc.setFontSize(9);
    const saldoFinal = (kpis.entrou || 0) - (kpis.saiu || 0);
    if (saldoFinal < 0) doc.setTextColor(180, 60, 60);
    doc.text(safe(`Saldo do Periodo: ${fmt(saldoFinal)}`), M, y);
    doc.setTextColor(0,0,0);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Nao e documento fiscal', W / 2, 290, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=ExtratoFluxoCaixa.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
