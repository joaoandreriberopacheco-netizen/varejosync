import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

const safe = (texto) => String(texto || '').replace(/[\u0080-\uFFFF]/g, (c) => {
  const map = {
    'á':'a','à':'a','â':'a','ã':'a','ä':'a',
    'Á':'A','À':'A','Â':'A','Ã':'A','Ä':'A',
    'é':'e','è':'e','ê':'e','ë':'e',
    'É':'E','È':'E','Ê':'E','Ë':'E',
    'í':'i','ì':'i','î':'i','ï':'i',
    'Í':'I','Ì':'I','Î':'I','Ï':'I',
    'ó':'o','ò':'o','ô':'o','õ':'o','ö':'o',
    'Ó':'O','Ò':'O','Ô':'O','Õ':'O','Ö':'O',
    'ú':'u','ù':'u','û':'u','ü':'u',
    'Ú':'U','Ù':'U','Û':'U','Ü':'U',
    'ç':'c','Ç':'C','ñ':'n','Ñ':'N',
    'ª':'a','º':'o','°':'o',
    '–':'-','—':'-','…':'...','•':'-','→':'->',
    '“':'"','”':'"','‘':"'",'’':"'"
  };
  return map[c] || '?';
});

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
  const lines = doc.splitTextToSize(safe(text || '-'), maxWidth);
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
      grupos = [],
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
      doc.text(safe(version === 'expandida' ? 'Relatório Expandido de Compras' : 'Relatório Compacto de Compras'), margin + 6, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(safe(filtros_desc), margin + 6, y + 14);
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
        doc.text(safe(String(card.value)), x + 4, y + 13);
      });
      doc.setFont('helvetica', 'normal');
      y += 24;
    };

    const drawGroupSummary = () => {
      if (!Array.isArray(grupos) || grupos.length === 0) return;
      ensureSpace(20);
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Agrupamentos do relatório', margin, y);
      y += 5;

      grupos.forEach((grupo, index) => {
        const totalGrupo = (grupo.pedidos || []).reduce((acc, pedido) => acc + (Number(pedido.valor_pendente_entrega ?? pedido.valor_total) || 0), 0);
        ensureSpace(8);
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, y - 1.5, contentWidth, 6.5, 2, 2, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(31, 41, 55);
        doc.text(safe(grupo.label || '-'), margin + 3, y + 2.5);
        doc.text(`${(grupo.pedidos || []).length} pedidos`, margin + 122, y + 2.5);
        doc.text(moeda(totalGrupo), margin + contentWidth - 3, y + 2.5, { align: 'right' });
        y += 7;
      });

      y += 4;
    };

    const drawPedidoHeader = (pedido) => {
      ensureSpace(30);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
      doc.setTextColor(17, 24, 39);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(safe(String(pedido.numero || 'Sem número')), margin + 5, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(safe(String(pedido.fornecedor_nome || 'Sem fornecedor')), margin + 40, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99);
      doc.text(`Emissão: ${data(pedido.data_emissao || pedido.created_date)}`, margin + 5, y + 13);
      doc.text(`Entrega: ${data(pedido.data_prevista_entrega)}`, margin + 58, y + 13);
      doc.text(`Status: ${pedido.status || '-'}`, margin + 105, y + 13);
      doc.text(`Total: ${moeda(pedido.valor_total)}`, margin + 155, y + 13);
      y += 26;
    };

    const drawPedidoHeaderExpandido = (pedido) => {
      ensureSpace(34);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'F');
      doc.setFillColor(34, 197, 94);
      doc.circle(margin + 5, y + 6.5, 1.3, 'F');
      doc.setTextColor(17, 24, 39);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(safe(String(pedido.numero || 'Sem número')), margin + 9, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(safe(String(pedido.fornecedor_nome || 'Sem fornecedor')), margin + 9, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`Status ${pedido.status || '-'}`, margin + 9, y + 20);
      doc.text(`Emissão ${data(pedido.data_emissao || pedido.created_date)}`, margin + 48, y + 20);
      doc.text(`Entrega ${data(pedido.data_prevista_entrega)}`, margin + 92, y + 20);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(moeda(pedido.valor_total), margin + contentWidth - 4, y + 10, { align: 'right' });
      const totalLinhas = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
      const totalQtd = Array.isArray(pedido.itens) ? pedido.itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) : 0;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${totalLinhas} itens · ${totalQtd.toLocaleString('pt-BR')} un.`, margin + contentWidth - 4, y + 16, { align: 'right' });
      y += 32;
    };

    const drawCompacto = (pedido) => {
      drawPedidoHeader(pedido);
      const embarque = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados[0] : null;
      const observacao = pedido.observacoes || pedido.historico || '-';
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Transportadora: ${safe(embarque?.transportadora_nome || 'Sem transportador')}`, margin + 2, y);
      doc.text(`ETA: ${safe(embarque?.eta ? data(embarque.eta) : 'Sem ETA')}`, margin + 78, y);
      doc.text(`Itens: ${Array.isArray(pedido.itens) ? pedido.itens.length : 0}`, margin + 134, y);
      y += 5;
      y = addWrappedText(doc, observacao, margin + 2, y, contentWidth - 4, 4) + 4;
    };

    const drawExpandido = (pedido) => {
      drawPedidoHeaderExpandido(pedido);
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      let subtotalCompra = 0;
      let subtotalVenda = 0;

      ensureSpace(12);
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.text('DESCRICAO', margin + 2, y + 5);
      doc.text('LIQ.', margin + 58, y + 5);
      doc.text('FRETE', margin + 74, y + 5);
      doc.text('OUTROS', margin + 90, y + 5);
      doc.text('CALC.', margin + 108, y + 5);
      doc.text('VLR UN.', margin + 126, y + 5);
      doc.text('TOTAL', margin + 145, y + 5);
      doc.text('VENDA', margin + 164, y + 5);
      doc.text('MKP', margin + 184, y + 5);
      y += 10;

      itens.forEach((item, index) => {
        const produto = produtosMap[item.produto_id] || {};
        const quantidade = Number(item.quantidade) || 0;
        const precoCompraLiquido = Number(item.custo_unitario) || Number(produto.valor_compra) || 0;
        const custoFrete = Number(produto.custo_frete_padrao) || 0;
        const outrosCustos = (Number(produto.custo_imposto1_padrao) || 0) + (Number(produto.custo_imposto2_padrao) || 0) + (Number(produto.custo_outros_padrao) || 0);
        const custoCalculado = Number(produto.preco_custo_calculado) || custoCalculadoProduto(produto);
        const valorUnitarioVenda = Number(produto.preco_venda_padrao) || 0;
        const valorCompraTotal = quantidade * precoCompraLiquido;
        const markup = precoCompraLiquido > 0 ? ((valorUnitarioVenda - precoCompraLiquido) / precoCompraLiquido) * 100 : 0;

        subtotalCompra += valorCompraTotal;
        subtotalVenda += quantidade * valorUnitarioVenda;

        ensureSpace(8);
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, y - 1, contentWidth, 7, 1.5, 1.5, 'F');
        }

        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.6);
        const nomeItem = doc.splitTextToSize(safe(String(item.produto_nome || produto.nome || 'Item sem nome')), 54)[0];
        doc.text(nomeItem, margin + 2, y + 3.5);
        doc.text(moeda(precoCompraLiquido), margin + 58, y + 3.5);
        doc.text(moeda(custoFrete), margin + 74, y + 3.5);
        doc.text(moeda(outrosCustos), margin + 90, y + 3.5);
        doc.text(moeda(custoCalculado), margin + 108, y + 3.5);
        doc.text(moeda(precoCompraLiquido), margin + 126, y + 3.5);
        doc.text(moeda(valorCompraTotal), margin + 145, y + 3.5);
        doc.text(moeda(valorUnitarioVenda), margin + 164, y + 3.5);
        doc.text(percentual(markup), margin + 184, y + 3.5);
        y += 8;
      });

      ensureSpace(18);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Compra total: ${moeda(subtotalCompra)}`, margin + 4, y + 5.5);
      doc.text(`Venda total: ${moeda(subtotalVenda)}`, margin + 72, y + 5.5);
      doc.text(`Margem bruta: ${moeda(subtotalVenda - subtotalCompra)}`, margin + 136, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Formato expandido com leitura condensada por item.', margin + 4, y + 10.5);
      y += 18;
    };

    drawHeader();
    drawKpis();
    drawGroupSummary();

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