// Port automático de base44/functions/gerarRelatorioPendencias/entry.ts
import type { createP38Client } from '../p38Client.ts';

import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safe = (t) => {
  if (!t) return '';
  return String(t)
    .replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
    .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[ÈÉÊË]/g,'E').replace(/[ÌÍÎÏ]/g,'I')
    .replace(/[ÒÓÔÕÖ]/g,'O').replace(/[ÙÚÛÜ]/g,'U').replace(/[Ç]/g,'C');
};

const fmtDate = (d) => { if (!d) return '-'; try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; } };

const ML = 14;
const MR = 14;
const PW = 210 - ML - MR;
const FS = 10;
const LH = 5.0;
const LABEL_W = 44;

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nao autorizado' }, { status: 401 });

    const { pedido_id } = await req.json();
    if (!pedido_id) return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    if (!pedidos?.length) return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    const pedido = pedidos[0];

    const divergencias = await base44.asServiceRole.entities.DivergenciaCompra.filter({ pedido_compra_id: pedido_id }).catch(() => []);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(FS);
    let y = 16;

    const checkPage = (extra = 0) => {
      if (y + extra > 277) { doc.addPage(); doc.setFont('courier','normal'); doc.setFontSize(FS); y = 16; }
    };

    const line = (txt, x = ML) => { checkPage(); doc.text(safe(txt), x, y); y += LH; };

    const hline = () => {
      checkPage();
      doc.setDrawColor(180,180,180);
      doc.line(ML, y - 1, ML + PW, y - 1);
      y += 1.5;
    };

    const boldLine = (txt) => { doc.setFont('courier','bold'); checkPage(); doc.text(safe(txt), ML, y); doc.setFont('courier','normal'); y += LH; };

    const labelVal = (lbl, val) => {
      const valLines = doc.splitTextToSize(safe(val), PW - LABEL_W - 2);
      checkPage(valLines.length * LH);
      const rowY = y;
      doc.setFont('courier','bold');
      doc.text(safe(lbl), ML, rowY);
      doc.setFont('courier','normal');
      valLines.forEach((l, i) => doc.text(l, ML + LABEL_W, rowY + i * LH));
      y = rowY + valLines.length * LH;
    };

    // Nome com wrap, qtds alinhados à direita 1a linha
    const rowDivergencia = (nome, qtds) => {
      const nomeLines = doc.splitTextToSize(safe(nome), PW - 55);
      checkPage(nomeLines.length * LH);
      const rowY = y;
      nomeLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));
      doc.text(safe(qtds), ML + PW, rowY, { align: 'right' });
      y = rowY + nomeLines.length * LH;
    };

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    doc.setFont('courier','bold');
    doc.setFontSize(12);
    doc.text('RELATORIO DE PENDENCIAS', ML + PW / 2, y, { align: 'center' }); y += LH + 1;
    doc.setFontSize(10);
    doc.text(safe(pedido.numero || 'N/A'), ML + PW / 2, y, { align: 'center' }); y += LH;
    doc.setFont('courier','normal');
    doc.setFontSize(FS);
    hline();

    labelVal('Fornecedor', safe(pedido.fornecedor_nome || '-'));
    labelVal('Status',     safe(pedido.status || '-'));
    labelVal('Gerado em',  fmtDate(new Date()));
    y += 1;
    hline();

    // ── Solicitação de Edição ─────────────────────────────────────────────────
    if (pedido.solicitacao_edicao_motivo) {
      boldLine('SOLICITACAO DE EDICAO');
      hline();
      labelVal('Data',       fmtDate(pedido.solicitacao_edicao_data));
      labelVal('Solicitante',safe(pedido.solicitacao_edicao_solicitante || '-'));
      labelVal('Motivo',     safe(pedido.solicitacao_edicao_motivo));
      y += 1; hline();
    }

    // ── Rejeição Financeira ───────────────────────────────────────────────────
    if (pedido.motivo_rejeicao_financeira) {
      boldLine('REJEICAO FINANCEIRA');
      hline();
      labelVal('Data',  fmtDate(pedido.data_rejeicao_financeira));
      labelVal('Motivo',safe(pedido.motivo_rejeicao_financeira));
      y += 1; hline();
    }

    // ── Divergências de Conferência ───────────────────────────────────────────
    boldLine('DIVERGENCIAS DE CONFERENCIA');
    hline();
    if (divergencias?.length) {
      // Cabeçalho colunas
      doc.setFont('courier','bold');
      doc.text('PRODUTO',           ML,      y);
      doc.text('PED / REC / PEND',  ML + PW, y, { align: 'right' });
      doc.setFont('courier','normal');
      y += LH;
      hline();

      divergencias.forEach((div) => {
        const pend = (div.qtd_pedida || 0) - (div.qtd_recebida || 0);
        rowDivergencia(
          `${safe(div.produto_nome || '-')}  [${safe(div.tipo_divergencia || '-')}]`,
          `${div.qtd_pedida||0} / ${div.qtd_recebida||0} / ${pend}`
        );
        if (div.observacao) {
          const obsLines = doc.splitTextToSize(safe('Obs: ' + div.observacao), PW - 6);
          obsLines.forEach(l => { checkPage(); doc.text(l, ML + 4, y); y += LH; });
        }
      });
    } else {
      line('Nenhuma divergencia registrada');
    }
    y += 1; hline();

    // ── Itens com pendência de vinculação ─────────────────────────────────────
    const itensPendentes = (pedido.itens || []).filter(i => (i.quantidade_vinculada || 0) < (i.quantidade || 0));
    if (itensPendentes.length) {
      boldLine('ITENS COM PENDENCIA DE VINCULACAO');
      hline();
      doc.setFont('courier','bold');
      doc.text('PRODUTO',           ML,      y);
      doc.text('PED / VINC / PEND', ML + PW, y, { align: 'right' });
      doc.setFont('courier','normal');
      y += LH;
      hline();

      itensPendentes.forEach(item => {
        const pendente = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
        rowDivergencia(
          safe(item.produto_nome || '-'),
          `${item.quantidade} / ${item.quantidade_vinculada||0} / ${pendente}`
        );
      });
      y += 1; hline();
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pendencias_${safe(pedido.numero||'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', details: error.message }, { status: 500 });
  }
}
