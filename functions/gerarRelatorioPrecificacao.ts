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
    if (ids.length) {
      produtos = await base44.asServiceRole.entities.Produto.filter({ id: { $in: ids } });
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);

    const W = 210;
    const ML = 14;
    const MR = 196;
    let y = 14;

    const line = (txt, indent = 0) => {
      const lines = doc.splitTextToSize(safe(txt), MR - ML - indent);
      lines.forEach(l => {
        if (y > 278) { doc.addPage(); y = 14; }
        doc.text(l, ML + indent, y);
        y += 5;
      });
    };
    const sep = () => line(SEP);

    doc.text('ANALISE DE PRECIFICACAO', W / 2, y, { align: 'center' }); y += 5;
    doc.text(safe(pedido.numero || 'N/A'), W / 2, y, { align: 'center' }); y += 5;
    sep();
    line(`Fornecedor : ${safe(pedido.fornecedor_nome || '-')}`);
    sep();
    line('COMPARATIVO DE CUSTOS');
    sep();
    line(`${'PRODUTO'.padEnd(35)} ${'ATUAL'.padStart(12)} ${'NOVO'.padStart(12)} ${'DELTA'.padStart(10)}`);
    sep();

    (pedido.itens || []).forEach((item) => {
      const produto = produtos.find(p => p.id === item.produto_id);
      const atual = produto?.valor_compra || 0;
      const novo = item.custo_unitario || 0;
      const delta = novo - atual;
      const pct = atual > 0 ? ((delta / atual) * 100).toFixed(1) : '0.0';
      const sinal = delta > 0 ? '+' : '';
      const nome = safe(item.produto_nome || '-').substring(0, 34).padEnd(35);
      line(`${nome} ${fmtCur(atual).padStart(12)} ${fmtCur(novo).padStart(12)} ${(sinal + pct + '%').padStart(10)}`);

      const qtd = item.quantidade || 0;
      const totalAtual = atual * qtd;
      const totalNovo = novo * qtd;
      const diffTotal = totalNovo - totalAtual;
      line(`  Qtd: ${qtd}  Total atual: ${fmtCur(totalAtual)}  Total novo: ${fmtCur(totalNovo)}  Impacto: ${fmtCur(diffTotal)}`, 4);
    });

    sep();

    const totalAtualGeral = (pedido.itens || []).reduce((s, item) => {
      const prod = produtos.find(p => p.id === item.produto_id);
      return s + ((prod?.valor_compra || 0) * (item.quantidade || 0));
    }, 0);
    const totalNovoPedido = pedido.valor_total || 0;
    line(`${'Total Anterior'.padEnd(38)} ${fmtCur(totalAtualGeral).padStart(25)}`);
    line(`${'Total Novo Pedido'.padEnd(38)} ${fmtCur(totalNovoPedido).padStart(25)}`);
    line(`${'Variacao Total'.padEnd(38)} ${fmtCur(totalNovoPedido - totalAtualGeral).padStart(25)}`);
    sep();

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