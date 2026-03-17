import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { format } from 'npm:date-fns';
import { ptBR } from 'npm:date-fns/locale';

const safe = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÀÁÂÃÄ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/[Ç]/g, 'C');
};

const fmtDate = (d) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
};

const fmtCur = (v) => {
  const n = parseFloat(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const SEP = '-----------------------------------------------------------------------';

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
    doc.setFontSize(9);

    const W = 210;
    const ML = 14;
    const MR = 196;
    let y = 14;

    const line = (txt, indent = 0) => {
      const maxW = MR - ML - indent;
      const lines = doc.splitTextToSize(safe(txt), maxW);
      lines.forEach(l => {
        if (y > 278) { doc.addPage(); y = 14; }
        doc.text(l, ML + indent, y);
        y += 5;
      });
    };

    const sep = () => { line(SEP); };

    // Titulo
    const titulo = safe('PEDIDO DE COMPRA');
    const num = safe(pedido.numero || 'N/A');
    doc.text(titulo, W / 2, y, { align: 'center' }); y += 5;
    doc.text(num, W / 2, y, { align: 'center' }); y += 5;
    sep();

    // Dados gerais
    line('DADOS GERAIS');
    sep();
    line(`Fornecedor      : ${safe(fornecedor?.nome || pedido.fornecedor_nome || '-')}`);
    line(`Status          : ${safe(pedido.status || '-')}`);
    line(`Status Financ.  : ${safe(pedido.status_aprovacao_financeira || 'Pendente')}`);
    line(`Criado em       : ${fmtDate(pedido.created_date)}`);
    line(`Criado por      : ${safe(pedido.created_by || user.email)}`);
    line(`Prev. Entrega   : ${fmtDate(pedido.data_prevista_entrega)}`);
    if (pedido.tags?.length) line(`Tags            : ${safe(pedido.tags.join(', '))}`);
    sep();

    // Itens
    line('ITENS DO PEDIDO');
    sep();
    line(`${'PRODUTO'.padEnd(38)} ${'QTD'.padStart(6)} ${'UNIT'.padStart(12)} ${'TOTAL'.padStart(12)}`);
    sep();

    (pedido.itens || []).forEach((item, i) => {
      const nome = safe(item.produto_nome || '-').substring(0, 37);
      const qty = String(item.quantidade || 0).padStart(6);
      const unit = fmtCur(item.custo_unitario || item.custo_final_unitario).padStart(12);
      const tot = fmtCur(item.total).padStart(12);
      line(`${nome.padEnd(38)} ${qty} ${unit} ${tot}`);
    });
    sep();

    const totalItens = (pedido.itens || []).reduce((s, i) => s + (i.total || 0), 0);
    const frete = parseFloat(pedido.valor_frete) || 0;
    const desconto = parseFloat(pedido.valor_desconto) || 0;
    line(`${'Subtotal Itens'.padEnd(38)} ${fmtCur(totalItens).padStart(31)}`);
    if (frete) line(`${'Frete'.padEnd(38)} ${fmtCur(frete).padStart(31)}`);
    if (desconto) line(`${'Desconto'.padEnd(38)} ${('-' + fmtCur(desconto)).padStart(31)}`);
    line(`${'TOTAL DO PEDIDO'.padEnd(38)} ${fmtCur(pedido.valor_total || totalItens + frete - desconto).padStart(31)}`);
    sep();

    // Financeiro
    line('FINANCEIRO');
    sep();
    line(`Forma Pgto      : ${safe(pedido.forma_pagamento_compra || pedido.forma_pagamento || '-')}`);
    line(`1o Vencimento   : ${fmtDate(pedido.data_primeiro_vencimento || pedido.primeiro_vencimento)}`);
    if (pedido.num_parcelas > 1) {
      line(`Parcelas        : ${pedido.num_parcelas}x a cada ${pedido.intervalo_parcelas_dias || 30} dias`);
    }
    if (pedido.data_aprovacao_financeira) line(`Aprovado em     : ${fmtDate(pedido.data_aprovacao_financeira)}`);
    if (pedido.motivo_rejeicao_financeira) {
      line(`Rejeitado em    : ${fmtDate(pedido.data_rejeicao_financeira)}`);
      line(`Motivo Rejeicao : ${safe(pedido.motivo_rejeicao_financeira)}`, 4);
    }
    sep();

    // Logistica
    line('LOGISTICA');
    sep();
    line(`NF Emitida      : ${pedido.nfe_emitida ? 'Sim' : 'Pendente'}`);
    line(`Manifesto Conf. : ${pedido.manifesto_conferido ? 'Sim' : 'Pendente'}`);
    line(`Conferencia     : ${pedido.conferencia_id ? 'Realizada' : 'Pendente'}`);
    if (pedido.data_despacho) line(`Despachado em   : ${fmtDate(pedido.data_despacho)}`);
    if (pedido.data_chegada) line(`Chegada em      : ${fmtDate(pedido.data_chegada)}`);
    if (pedido.tem_divergencias) line('ATENCAO: Divergencias na conferencia');
    sep();

    // Observacoes
    if (pedido.observacoes) {
      line('OBSERVACOES');
      sep();
      line(pedido.observacoes);
      sep();
    }

    // Pendencias
    if (pedido.solicitacao_edicao_motivo || pedido.motivo_rejeicao_financeira) {
      line('PENDENCIAS');
      sep();
      if (pedido.solicitacao_edicao_motivo) {
        line(`Solic. Edicao   : ${fmtDate(pedido.solicitacao_edicao_data)} por ${safe(pedido.solicitacao_edicao_solicitante)}`);
        line(`Motivo          : ${safe(pedido.solicitacao_edicao_motivo)}`, 4);
      }
      sep();
    }

    // Conclusao
    if (pedido.data_conclusao) {
      line('CONCLUSAO');
      sep();
      line(`Concluido em    : ${fmtDate(pedido.data_conclusao)}`);
      sep();
    }

    // Assinaturas
    y += 8;
    if (y > 255) { doc.addPage(); y = 14; }
    doc.text('____________________________', ML, y);
    doc.text('____________________________', 110, y);
    y += 5;
    doc.text('Responsavel pela Compra', ML, y);
    doc.text('Gestor de Compras', 110, y);
    y += 5;
    doc.text('Data: ___/___/______', ML, y);
    doc.text('Data: ___/___/______', 110, y);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=pedido_${safe(pedido.numero || 'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('ERRO:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', message: error.message }, { status: 500 });
  }
});