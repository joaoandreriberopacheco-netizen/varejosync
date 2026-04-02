import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

const moeda = (valor = 0) => `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const percentual = (valor = 0) => `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const data = (valor) => {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
};

const custoCalculadoProduto = (produto = {}) => {
  return (Number(produto.valor_compra) || 0)
    + (Number(produto.custo_frete_padrao) || 0)
    + (Number(produto.custo_imposto1_padrao) || 0)
    + (Number(produto.custo_imposto2_padrao) || 0)
    + (Number(produto.custo_outros_padrao) || 0)
    - (Number(produto.desconto_compra_padrao) || 0);
};

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
  const lines = doc.splitTextToSize(String(text || '-'), maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      pedidos = [],
      version = 'compacta',
      filtros_desc = 'Pedidos filtrados na tela',
      kpis = {},
    } = payload;

    const produtoIds = [...new Set(
      pedidos.flatMap((pedido) => Array.isArray(pedido.itens) ? pedido.itens.map((item) => item.produto_id).filter(Boolean) : [])
    )];

    const produtos = produtoIds.length
      ? await base44.asServiceRole.entities.Produto.list()
      : [];

    const produtosMap = Object.fromEntries((produtos || []).map((produto) => [produto.id, produto]));

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - (margin * 2);
    let y = 16;

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageHeight - 12) {
        doc.addPage();
        y = 16;
      }
    };

    const drawHeader = () => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, 26, 4, 4, 'F');
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(version === 'expandida' ? 'Relatório Expandido de Compras' : 'Relatório Compacto de Compras', margin + 6, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(filtros_desc, margin + 6, y + 14);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin + 6, y + 19);
      y += 32;
    };

    const drawKpis = () => {
      const cards = [
        { label: 'Pedidos', value: String(kpis.totalPedidos || pedidos.length || 0) },
        { label: 'Total pendente', value: moeda(kpis.totalGeral || 0) },
        { label: 'Em aberto', value: moeda(kpis.totalEmAberto || 0) },
        { label: 'Pago não entregue', value: moeda(kpis.totalPagoNaoEntregue || 0) },
      ];

      const gap = 4;
      const cardWidth = (contentWidth - (gap * 3)) / 4;
      cards.forEach((card, index) => {
        const x = margin + ((cardWidth + gap) * index);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, cardWidth, 18, 3, 3, 'F');
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(8);
        doc.text(card.label, x + 4, y + 6);
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(String(card.value), x + 4, y + 13);
      });
      doc.setFont('helvetica', 'normal');
      y += 24;
    };

    const drawPedidoHeader = (pedido) => {
      ensureSpace(30);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${pedido.numero || 'Sem número'} · ${pedido.fornecedor_nome || 'Sem fornecedor'}`, margin + 5, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text(`Emissão: ${data(pedido.data_emissao || pedido.created_date)}`, margin + 5, y + 13);
      doc.text(`Entrega: ${data(pedido.data_prevista_entrega)}`, margin + 58, y + 13);
      doc.text(`Status: ${pedido.status || '-'}`, margin + 105, y + 13);
      doc.text(`Total: ${moeda(pedido.valor_total)}`, margin + 155, y + 13);
      y += 26;
    };

    const drawCompacto = (pedido) => {
      drawPedidoHeader(pedido);
      const observacao = pedido.observacoes || pedido.historico || '-';
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      y = addWrappedText(doc, observacao, margin + 2, y, contentWidth - 4, 4.5) + 3;
    };

    const drawExpandido = (pedido) => {
      drawPedidoHeader(pedido);
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      let subtotalCompra = 0;
      let subtotalVenda = 0;

      itens.forEach((item, index) => {
        const produto = produtosMap[item.produto_id] || {};
        const custoCalculado = Number(produto.preco_custo_calculado) || custoCalculadoProduto(produto);
        const precoVenda = Number(produto.preco_venda_padrao) || 0;
        const markup = Number(produto.preco_venda_percentual) || 0;
        const quantidade = Number(item.quantidade) || 0;
        const custoPedido = Number(item.custo_unitario) || 0;
        const valorCompra = Number(produto.valor_compra) || custoPedido;
        subtotalCompra += quantidade * custoCalculado;
        subtotalVenda += quantidade * precoVenda;

        ensureSpace(44);
        doc.setFillColor(index % 2 === 0 ? 251 : 247, index % 2 === 0 ? 251 : 247, index % 2 === 0 ? 251 : 247);
        doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F');

        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(item.produto_nome || produto.nome || 'Item sem nome', margin + 4, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(107, 114, 128);
        doc.text(`Qtd ${quantidade} ${item.unidade_medida || produto.unidade_principal || 'UN'}`, margin + 4, y + 11);
        doc.text(`Custo pedido ${moeda(custoPedido)}`, margin + 45, y + 11);
        doc.text(`Valor compra ${moeda(valorCompra)}`, margin + 92, y + 11);
        doc.text(`Custo calc. ${moeda(custoCalculado)}`, margin + 142, y + 11);

        doc.text(`Frete ${moeda(produto.custo_frete_padrao || 0)}`, margin + 4, y + 17);
        doc.text(`Imp.1 ${moeda(produto.custo_imposto1_padrao || 0)}`, margin + 45, y + 17);
        doc.text(`Imp.2 ${moeda(produto.custo_imposto2_padrao || 0)}`, margin + 92, y + 17);
        doc.text(`Outros ${moeda(produto.custo_outros_padrao || 0)}`, margin + 142, y + 17);

        doc.text(`Desconto ${moeda(produto.desconto_compra_padrao || 0)}`, margin + 4, y + 23);
        doc.text(`Preço venda ${moeda(precoVenda)}`, margin + 45, y + 23);
        doc.text(`Markup ${percentual(markup)}`, margin + 92, y + 23);
        doc.text(`Total venda ${moeda(quantidade * precoVenda)}`, margin + 142, y + 23);

        y += 40;
      });

      ensureSpace(20);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, contentWidth, 16, 3, 3, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Total comercial estimado (custo): ${moeda(subtotalCompra)}`, margin + 4, y + 6.5);
      doc.text(`Total comercial estimado (venda): ${moeda(subtotalVenda)}`, margin + 4, y + 12);
      y += 20;
    };

    drawHeader();
    drawKpis();

    pedidos.forEach((pedido) => {
      if (version === 'expandida') {
        drawExpandido(pedido);
      } else {
        drawCompacto(pedido);
      }
    });

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-pedidos-${version}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});