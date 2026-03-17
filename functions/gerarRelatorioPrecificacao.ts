import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const safe = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c')
    .replace(/[ÀÁÂÃÄ]/g, 'A').replace(/[ÈÉÊË]/g, 'E').replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O').replace(/[ÙÚÛÜ]/g, 'U').replace(/[Ç]/g, 'C');
};

const fmtCur = (v) => {
  const n = parseFloat(v) || 0;
  return 'R$ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const SEP = '-----------------------------------------------------------------------';
const ML = 12;
const PW = 185;

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

    let produtos = [];
    const ids = (pedido.itens || []).map(i => i.produto_id).filter(Boolean);
    if (ids.length) produtos = await base44.asServiceRole.entities.Produto.filter({ id: { $in: ids } });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    const LH = 4.8;
    let y = 12;
    const W = 210;

    const checkPage = (extra = 0) => { if (y + extra > 280) { doc.addPage(); y = 12; } };
    const L = (txt) => { checkPage(); doc.text(safe(txt), ML, y); y += LH; };
    const SEP_LINE = () => L(SEP);

    // Colunas da tabela de itens
    // PRODUTO (wrap) | ATUAL | NOVO | DELTA
    const COL_ATUAL = ML + 105; // início coluna ATUAL
    const COL_NOVO  = ML + 135;
    const COL_DELTA = ML + PW;
    const NOME_MAX_W = 100;

    doc.text('ANALISE DE PRECIFICACAO', W / 2, y, { align: 'center' }); y += LH;
    doc.text(safe(pedido.numero || 'N/A'), W / 2, y, { align: 'center' }); y += LH;
    SEP_LINE();
    L(`Fornecedor : ${safe(pedido.fornecedor_nome || '-')}`);
    SEP_LINE();

    L('COMPARATIVO DE CUSTOS');
    SEP_LINE();

    // Cabeçalho
    doc.text('PRODUTO', ML, y);
    doc.text('ATUAL', COL_ATUAL, y);
    doc.text('NOVO', COL_NOVO, y);
    doc.text('DELTA', COL_DELTA, y, { align: 'right' });
    y += LH;
    SEP_LINE();

    (pedido.itens || []).forEach((item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      const atual = produto?.valor_compra || 0;
      const novo = item.custo_unitario || 0;
      const delta = novo - atual;
      const pct = atual > 0 ? ((delta / atual) * 100).toFixed(1) : '0.0';
      const sinal = delta > 0 ? '+' : '';

      const nomeLines = doc.splitTextToSize(safe(item.produto_nome || '-'), NOME_MAX_W);
      checkPage((nomeLines.length + 1) * LH);
      const rowY = y;

      // Nome com wrap
      nomeLines.forEach((l, i) => doc.text(l, ML, rowY + i * LH));

      // Valores na primeira linha
      doc.text(fmtCur(atual), COL_ATUAL, rowY);
      doc.text(fmtCur(novo), COL_NOVO, rowY);
      doc.text(sinal + pct + '%', COL_DELTA, rowY, { align: 'right' });
      y = rowY + nomeLines.length * LH;

      // Linha de detalhe qtd/impacto
      const qtd = item.quantidade || 0;
      const totalAtual = atual * qtd;
      const totalNovo = novo * qtd;
      const diffTotal = totalNovo - totalAtual;
      const detLine = `  Qtd: ${qtd}  Total atual: ${fmtCur(totalAtual)}  Total novo: ${fmtCur(totalNovo)}  Impacto: ${fmtCur(diffTotal)}`;
      const detLines = doc.splitTextToSize(safe(detLine), PW);
      checkPage(detLines.length * LH);
      detLines.forEach(l => { doc.text(l, ML, y); y += LH; });
    });

    SEP_LINE();

    const totalAtualGeral = (pedido.itens || []).reduce((s, item) => {
      const prod = produtos.find(p => p.id === item.produto_id);
      return s + ((prod?.valor_compra || 0) * (item.quantidade || 0));
    }, 0);
    const totalNovoPedido = pedido.valor_total || 0;

    // Totais com alinhamento direita
    const LV = (label, valor) => {
      checkPage();
      doc.text(safe(label), ML, y);
      doc.text(safe(valor), ML + PW, y, { align: 'right' });
      y += LH;
    };
    LV('Total Anterior', fmtCur(totalAtualGeral));
    LV('Total Novo Pedido', fmtCur(totalNovoPedido));
    LV('Variacao Total', fmtCur(totalNovoPedido - totalAtualGeral));
    SEP_LINE();

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=precificacao_${safe(pedido.numero || 'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', details: error.message }, { status: 500 });
  }
});