import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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
const fmtCur = (v) => { const n = parseFloat(v)||0; return 'R$ '+n.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); };

// ── Layout constants ─────────────────────────────────────────────────────────
const ML  = 14;   // margem esquerda mm
const MR  = 14;   // margem direita mm
const PW  = 210 - ML - MR;  // largura útil = 182mm
const FS  = 10;   // font size pt (Courier New 10pt ≈ typewriter feel)
const LH  = 5.0;  // line height mm

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nao autorizado' }, { status: 401 });

    const { pedido_id } = await req.json();
    if (!pedido_id) return Response.json({ error: 'pedido_id obrigatorio' }, { status: 400 });

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.filter({ id: pedido_id });
    if (!pedidos?.length) return Response.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    const pedido = pedidos[0];

    const fornecedor = pedido.fornecedor_id
      ? await base44.asServiceRole.entities.Terceiro.get(pedido.fornecedor_id).catch(() => null)
      : null;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(FS);

    let y = 16;

    const checkPage = (extra = 0) => {
      if (y + extra > 277) { doc.addPage(); doc.setFont('courier','normal'); doc.setFontSize(FS); y = 16; }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const line = (txt, x = ML) => { checkPage(); doc.text(safe(txt), x, y); y += LH; };

    const hline = () => {
      checkPage();
      doc.setDrawColor(180,180,180);
      doc.line(ML, y - 1, ML + PW, y - 1);
      y += 1.5;
    };

    const boldLine = (txt, x = ML) => {
      doc.setFont('courier','bold');
      checkPage();
      doc.text(safe(txt), x, y);
      doc.setFont('courier','normal');
      y += LH;
    };

    // Linha com label à esquerda e valor à direita, nome com wrap
    const row = (label, valor = '') => {
      const labelLines = doc.splitTextToSize(safe(label), PW - 42);
      checkPage(labelLines.length * LH);
      const startY = y;
      labelLines.forEach((l, i) => doc.text(l, ML, startY + i * LH));
      if (valor) doc.text(safe(valor), ML + PW, startY, { align: 'right' });
      y = startY + labelLines.length * LH;
    };

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    doc.setFont('courier','bold');
    doc.setFontSize(12);
    doc.text('PEDIDO DE COMPRA', ML + PW / 2, y, { align: 'center' }); y += LH + 1;
    doc.setFontSize(10);
    doc.text(safe(pedido.numero || 'N/A'), ML + PW / 2, y, { align: 'center' }); y += LH;
    doc.setFont('courier','normal');
    doc.setFontSize(FS);
    hline();

    // ── Dados Gerais ─────────────────────────────────────────────────────────
    boldLine('DADOS GERAIS');
    hline();

    // Tabela 2 colunas: labels à esquerda, valores recuados
    const dadosGerais = [
      ['Fornecedor',         safe(fornecedor?.nome || pedido.fornecedor_nome || '-')],
      ['Status',             safe(pedido.status || '-')],
      ['Status Financeiro',  safe(pedido.status_aprovacao_financeira || 'Pendente')],
      ['Criado em',          fmtDate(pedido.created_date) + '  por ' + safe(pedido.created_by || user.email)],
      ['Prev. Entrega',      fmtDate(pedido.data_prevista_entrega)],
    ];
    if (pedido.tags?.length) dadosGerais.push(['Tags', safe(pedido.tags.join(', '))]);

    // Calcular largura da coluna label
    const LABEL_W = 44; // mm
    dadosGerais.forEach(([lbl, val]) => {
      const valLines = doc.splitTextToSize(safe(val), PW - LABEL_W - 2);
      checkPage(valLines.length * LH);
      const rowY = y;
      doc.setFont('courier','bold');
      doc.text(safe(lbl), ML, rowY);
      doc.setFont('courier','normal');
      valLines.forEach((l, i) => doc.text(l, ML + LABEL_W, rowY + i * LH));
      y = rowY + valLines.length * LH;
    });

    y += 1;
    hline();

    // ── Itens ────────────────────────────────────────────────────────────────
    boldLine('ITENS DO PEDIDO');
    hline();

    // Cabeçalho da tabela de itens
    const C_QTD  = ML + 112;
    const C_UNIT = ML + 138;
    const C_DISC = ML + 158;
    const C_TOT  = ML + PW;
    const NOME_W = 108;

    doc.setFont('courier','bold');
    doc.text('PRODUTO',   ML,     y);
    doc.text('QTD',       C_QTD,  y);
    doc.text('UNIT',      C_UNIT, y);
    doc.text('DESC',      C_DISC, y);
    doc.text('TOTAL',     C_TOT,  y, { align: 'right' });
    doc.setFont('courier','normal');
    y += LH;
    hline();

    (pedido.itens || []).forEach((item) => {
      const nomeLines = doc.splitTextToSize(safe(item.produto_nome || '-'), NOME_W);
      checkPage(nomeLines.length * LH + 1);
      const rowY = y;
      nomeLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));
      doc.text(String(item.quantidade || 0),                    C_QTD,  rowY);
      doc.text(fmtCur(item.custo_unitario || 0),                C_UNIT, rowY);
      doc.text(item.valor_desconto_item > 0 ? fmtCur(item.valor_desconto_item) : '-', C_DISC, rowY);
      doc.text(fmtCur(item.total || 0),                         C_TOT,  rowY, { align: 'right' });
      y = rowY + nomeLines.length * LH;
    });

    y += 1;
    hline();

    // Totais
    const totalItens = (pedido.itens || []).reduce((s, i) => s + (i.total || 0), 0);
    const frete      = parseFloat(pedido.valor_frete)   || 0;
    const desconto   = parseFloat(pedido.valor_desconto) || 0;

    row('Subtotal Itens',    fmtCur(totalItens));
    if (frete)   row('(+) Frete',     fmtCur(frete));
    if (desconto) row('(-) Desconto', fmtCur(desconto));

    doc.setFont('courier','bold');
    row('TOTAL DO PEDIDO', fmtCur(pedido.valor_total || totalItens + frete - desconto));
    doc.setFont('courier','normal');
    y += 1;
    hline();

    // ── Financeiro ───────────────────────────────────────────────────────────
    boldLine('FINANCEIRO');
    hline();

    const dadosFin = [
      ['Forma de Pgto',   safe(pedido.forma_pagamento_compra || pedido.forma_pagamento || '-')],
      ['1o Vencimento',   fmtDate(pedido.data_primeiro_vencimento || pedido.primeiro_vencimento)],
    ];
    if ((pedido.num_parcelas || 0) > 1) dadosFin.push(['Parcelas', `${pedido.num_parcelas}x a cada ${pedido.intervalo_parcelas_dias || 30} dias`]);
    if (pedido.data_aprovacao_financeira) dadosFin.push(['Aprovado em', fmtDate(pedido.data_aprovacao_financeira)]);
    if (pedido.motivo_rejeicao_financeira) {
      dadosFin.push(['Rejeitado em', fmtDate(pedido.data_rejeicao_financeira)]);
      dadosFin.push(['Motivo Rejeicao', safe(pedido.motivo_rejeicao_financeira)]);
    }
    dadosFin.forEach(([lbl, val]) => {
      const valLines = doc.splitTextToSize(safe(val), PW - LABEL_W - 2);
      checkPage(valLines.length * LH);
      const rowY = y;
      doc.setFont('courier','bold');
      doc.text(safe(lbl), ML, rowY);
      doc.setFont('courier','normal');
      valLines.forEach((l, i) => doc.text(l, ML + LABEL_W, rowY + i * LH));
      y = rowY + valLines.length * LH;
    });
    y += 1;
    hline();

    // ── Logística ────────────────────────────────────────────────────────────
    boldLine('LOGISTICA');
    hline();

    const dadosLog = [
      ['NF Emitida',       pedido.nfe_emitida       ? 'Sim'      : 'Pendente'],
      ['Manifesto Conf.',  pedido.manifesto_conferido ? 'Sim'    : 'Pendente'],
      ['Conferencia',      pedido.conferencia_id      ? 'Realizada' : 'Pendente'],
    ];
    if (pedido.data_despacho) dadosLog.push(['Despachado em',   fmtDate(pedido.data_despacho)]);
    if (pedido.data_chegada)  dadosLog.push(['Chegada em',      fmtDate(pedido.data_chegada)]);
    if (pedido.tem_divergencias) dadosLog.push(['ATENCAO', 'Divergencias na conferencia']);

    dadosLog.forEach(([lbl, val]) => {
      checkPage();
      const rowY = y;
      doc.setFont('courier','bold');
      doc.text(safe(lbl), ML, rowY);
      doc.setFont('courier','normal');
      doc.text(safe(val), ML + LABEL_W, rowY);
      y = rowY + LH;
    });
    y += 1;
    hline();

    // ── Observações ──────────────────────────────────────────────────────────
    if (pedido.observacoes) {
      boldLine('OBSERVACOES');
      hline();
      const obsLines = doc.splitTextToSize(safe(pedido.observacoes), PW);
      obsLines.forEach(l => line(l));
      y += 1;
      hline();
    }

    // ── Conclusão ────────────────────────────────────────────────────────────
    if (pedido.data_conclusao) {
      boldLine('CONCLUSAO');
      hline();
      checkPage(); doc.setFont('courier','bold'); doc.text('Concluido em', ML, y); doc.setFont('courier','normal'); doc.text(fmtDate(pedido.data_conclusao), ML + LABEL_W, y); y += LH;
      y += 1; hline();
    }

    // ── Assinaturas ──────────────────────────────────────────────────────────
    checkPage(24);
    y += 6;
    doc.line(ML, y, ML + 60, y);
    doc.line(ML + 88, y, ML + 88 + 60, y);
    y += LH;
    doc.text('Responsavel pela Compra', ML, y);
    doc.text('Gestor / Financeiro',     ML + 88, y);
    y += LH;
    doc.text('Data: ___/___/______', ML, y);
    doc.text('Data: ___/___/______', ML + 88, y);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${safe(pedido.numero||'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('ERRO:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', message: error.message }, { status: 500 });
  }
});