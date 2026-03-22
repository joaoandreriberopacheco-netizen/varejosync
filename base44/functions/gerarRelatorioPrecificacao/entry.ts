import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@4.0.0';

const safe = (t) => {
  if (!t) return '';
  return String(t)
    .replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c')
    .replace(/[ÀÁÂÃÄ]/g,'A').replace(/[ÈÉÊË]/g,'E').replace(/[ÌÍÎÏ]/g,'I')
    .replace(/[ÒÓÔÕÖ]/g,'O').replace(/[ÙÚÛÜ]/g,'U').replace(/[Ç]/g,'C');
};

const fmtCur = (v) => { const n = parseFloat(v)||0; return 'R$'+n.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); };

const ML = 14;
const MR = 14;
const PW = 210 - ML - MR;  // 182mm
const FS = 10;
const LH = 5.0;

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

    const ids = (pedido.itens || []).map(i => i.produto_id).filter(Boolean);
    const produtos = ids.length ? await base44.asServiceRole.entities.Produto.filter({ id: { $in: ids } }) : [];

    // Custo detalhado por produto
    let custosDet = [];
    if (ids.length) {
      custosDet = await base44.asServiceRole.entities.CustoDetalhado.filter({ produto_id: { $in: ids } }).catch(() => []);
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('courier','normal');
    doc.setFontSize(FS);
    let y = 16;

    const checkPage = (extra = 0) => {
      if (y + extra > 277) { doc.addPage(); doc.setFont('courier','normal'); doc.setFontSize(FS); y = 16; }
    };

    const hline = () => {
      checkPage();
      doc.setDrawColor(180,180,180);
      doc.line(ML, y - 1, ML + PW, y - 1);
      y += 1.5;
    };

    const boldLine = (txt) => { doc.setFont('courier','bold'); checkPage(); doc.text(safe(txt), ML, y); doc.setFont('courier','normal'); y += LH; };

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    doc.setFont('courier','bold');
    doc.setFontSize(12);
    doc.text('ANALISE DE PRECIFICACAO', ML + PW / 2, y, { align: 'center' }); y += LH + 1;
    doc.setFontSize(10);
    doc.text(safe(pedido.numero || 'N/A'), ML + PW / 2, y, { align: 'center' }); y += LH;
    doc.setFont('courier','normal');
    doc.setFontSize(FS);
    doc.setFont('courier','bold');
    doc.text('Fornecedor:', ML, y);
    doc.setFont('courier','normal');
    doc.text(safe(pedido.fornecedor_nome || '-'), ML + 30, y);
    y += LH;
    hline();

    // ── Tabela de produtos ────────────────────────────────────────────────────
    // Colunas:
    // COD    | NOME DO PRODUTO (wrap)  | CAMPO1..5 | P.VENDA NOVO | P.VENDA ANT
    // Larguras:
    // COD:   12mm  ML
    // NOME:  72mm  ML+14
    // 5 campos hierarquicos: não aparecem como colunas, mas em linha abaixo do nome
    // P. CUSTO NOVO: 24mm
    // P. VENDA NOVO: 24mm
    // P. VENDA ANT:  24mm  (alinhado à direita)

    const C_COD      = ML;
    const C_NOME     = ML + 14;
    const C_CUST_N   = ML + PW - 68;
    const C_VEND_N   = ML + PW - 42;
    const C_VEND_A   = ML + PW;
    const NOME_W     = PW - 14 - 72;   // ~96mm para nome

    boldLine('COMPARATIVO DE CUSTOS E PRECIFICACAO');
    hline();

    // Cabeçalho colunas
    doc.setFont('courier','bold');
    doc.text('COD',      C_COD,    y);
    doc.text('PRODUTO',  C_NOME,   y);
    doc.text('CSTO.N',   C_CUST_N, y);
    doc.text('V.NOVO',   C_VEND_N, y);
    doc.text('V.ANT',    C_VEND_A, y, { align: 'right' });
    doc.setFont('courier','normal');
    y += LH;
    hline();

    let totalCustoAnterior = 0;
    let totalCustoNovo     = 0;
    let totalVendaAnterior = 0;
    let totalVendaNovo     = 0;

    (pedido.itens || []).forEach((item) => {
      const produto = produtos.find(p => p.id === item.produto_id);

      const custoNovo     = item.custo_unitario || item.custo_final_unitario || 0;
      const custoAnterior = produto?.valor_compra || 0;

      // Preço de venda atual (produto) e novo (calculado: custo + margem)
      const pVendaAnterior = produto?.preco_venda_padrao || 0;
      const pctMargem      = produto?.preco_venda_percentual ?? 40;
      const pVendaNovo     = custoNovo > 0
        ? (produto?.preco_venda_tipo === 'percentual' || !produto?.preco_venda_tipo
            ? custoNovo * (1 + pctMargem / 100)
            : pVendaAnterior)
        : pVendaAnterior;

      totalCustoAnterior += custoAnterior;
      totalCustoNovo     += custoNovo;
      totalVendaAnterior += pVendaAnterior;
      totalVendaNovo     += pVendaNovo;

      // Campos hierárquicos com valores atualizados
      const campos = [
        produto?.campo_hierarquico_1,
        produto?.campo_hierarquico_2,
        produto?.campo_hierarquico_3,
        produto?.campo_hierarquico_4,
        produto?.campo_hierarquico_5,
      ].filter(Boolean);

      const nomeCompleto = safe(item.produto_nome || produto?.nome || '-');
      const nomeLines    = doc.splitTextToSize(nomeCompleto, NOME_W);
      const hierLines    = campos.length ? doc.splitTextToSize(campos.join(' | '), NOME_W) : [];
      const totalLines   = nomeLines.length + (hierLines.length > 0 ? hierLines.length + 0.4 : 0);

      checkPage(totalLines * LH + 1);
      const rowY = y;

      // COD
      doc.text(safe(produto?.codigo_interno || '---'), C_COD, rowY);

      // Nome (negrito)
      doc.setFont('courier','bold');
      nomeLines.forEach((l, i) => doc.text(l, C_NOME, rowY + i * LH));
      doc.setFont('courier','normal');

      // Campos hierárquicos em fonte normal abaixo do nome
      if (hierLines.length) {
        const hY = rowY + nomeLines.length * LH;
        doc.setFontSize(8);
        hierLines.forEach((l, i) => doc.text(l, C_NOME + 1, hY + i * LH * 0.85));
        doc.setFontSize(FS);
      }

      // Valores na 1a linha alinhados
      doc.text(fmtCur(custoNovo),     C_CUST_N, rowY);
      doc.text(fmtCur(pVendaNovo),    C_VEND_N, rowY);
      doc.text(fmtCur(pVendaAnterior),C_VEND_A, rowY, { align: 'right' });

      y = rowY + totalLines * LH + 0.5;
    });

    y += 1;
    hline();

    // Totalizadores
    const LABEL_W2 = PW - 72;
    const rowTotal = (lbl, val, bold = false) => {
      if (bold) doc.setFont('courier','bold');
      checkPage();
      doc.text(safe(lbl), ML, y);
      doc.text(safe(val), ML + PW, y, { align: 'right' });
      if (bold) doc.setFont('courier','normal');
      y += LH;
    };

    rowTotal('Total Custo Anterior',   fmtCur(totalCustoAnterior));
    rowTotal('Total Custo Novo',       fmtCur(totalCustoNovo));
    rowTotal('Variacao de Custo',      (totalCustoNovo > totalCustoAnterior ? '+' : '') + fmtCur(totalCustoNovo - totalCustoAnterior));
    y += LH * 0.5;
    rowTotal('Total Preco Venda Ant.', fmtCur(totalVendaAnterior));
    rowTotal('Total Preco Venda Novo', fmtCur(totalVendaNovo), true);
    hline();

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=precificacao_${safe(pedido.numero||'compra')}.pdf`,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: 'Erro ao gerar relatorio', details: error.message }, { status: 500 });
  }
});