import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

const PDF_FONT_FAMILY = 'NotoSans';
const PDF_FONT_BOLD = 'bold';
const PDF_FONT_NORMAL = 'normal';
const NOTO_REGULAR_URL = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const NOTO_BOLD_URL = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';
const fontCache = { regular: null, bold: null };

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const loadFontBase64 = async (url, cacheKey) => {
  if (fontCache[cacheKey]) return fontCache[cacheKey];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro ao carregar fonte ${cacheKey}`);
  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  fontCache[cacheKey] = base64;
  return base64;
};

const registerPdfFonts = async (doc) => {
  const [regularBase64, boldBase64] = await Promise.all([
    loadFontBase64(NOTO_REGULAR_URL, 'regular'),
    loadFontBase64(NOTO_BOLD_URL, 'bold'),
  ]);

  doc.addFileToVFS('NotoSans-Regular.ttf', regularBase64);
  doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
  doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
  doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
};

const safe = (texto) => {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .normalize('NFC')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '-');
};

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

const STATUS_PDF_COLORS = {
  'Rascunho': { dot: [209, 213, 219], pillBg: [243, 244, 246], pillText: [107, 114, 128] },
  'Aguardando Liberação': { dot: [203, 213, 225], pillBg: [241, 245, 249], pillText: [71, 85, 105] },
  'Aprovado': { dot: [52, 211, 153], pillBg: [236, 253, 245], pillText: [4, 120, 87] },
  'Despachado': { dot: [34, 211, 238], pillBg: [236, 254, 255], pillText: [14, 116, 144] },
  'Em Trânsito': { dot: [56, 189, 248], pillBg: [240, 249, 255], pillText: [3, 105, 161] },
  'Entregue': { dot: [16, 185, 129], pillBg: [236, 253, 245], pillText: [4, 120, 87] },
  'Pendência': { dot: [251, 146, 60], pillBg: [255, 247, 237], pillText: [194, 65, 12] },
  'Devolvido': { dot: [251, 113, 133], pillBg: [255, 241, 242], pillText: [190, 24, 93] },
  'Concluído': { dot: [16, 185, 129], pillBg: [236, 253, 245], pillText: [4, 120, 87] },
  'Cancelado': { dot: [209, 213, 219], pillBg: [243, 244, 246], pillText: [156, 163, 175] },
};

const getStatusPdfColors = (status) => STATUS_PDF_COLORS[status] || STATUS_PDF_COLORS['Rascunho'];

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

    const isMobilePdf = version === 'expandida_mobile';

    const produtoIds = [...new Set(
      pedidos.flatMap((pedido) => Array.isArray(pedido.itens) ? pedido.itens.map((item) => item.produto_id).filter(Boolean) : [])
    )];

    const produtos = produtoIds.length
      ? await base44.asServiceRole.entities.Produto.list()
      : [];

    const produtosMap = Object.fromEntries((produtos || []).map((produto) => [produto.id, produto]));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isMobilePdf ? [180, 72] : 'a4',
    });
    await registerPdfFonts(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = isMobilePdf ? 6 : 12;
    const tableMargin = isMobilePdf ? 6 : 18;
    const contentWidth = pageWidth - (margin * 2);
    const tableWidth = pageWidth - (tableMargin * 2);
    const colors = {
      text: [31, 41, 55],
      muted: [107, 114, 128],
      panel: [248, 250, 252],
      panelSoft: [243, 244, 246],
      rowAlt: [249, 250, 251],
      accent: [45, 212, 191],
      accentSoft: [240, 253, 250],
      accentText: [15, 118, 110],
    };
    let y = 16;

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageHeight - 12) {
        doc.addPage();
        y = 16;
      }
    };

    const drawHeader = () => {
      doc.setFillColor(...colors.panel);
      doc.roundedRect(margin, y, contentWidth, 26, 4, 4, 'F');
      doc.setFillColor(...colors.accent);
      doc.roundedRect(margin + 5, y + 5, 2.4, 10, 1.2, 1.2, 'F');
      doc.setTextColor(...colors.text);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(isMobilePdf ? 10 : 16);
      const titulo = version === 'expandida'
        ? 'Relatório expandido de compras'
        : version === 'expandida_mobile'
          ? 'Relatório mobile de compras'
          : 'Relatório compacto de compras';
      doc.text(safe(titulo), margin + (isMobilePdf ? 5 : 10), y + (isMobilePdf ? 6 : 8));
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(isMobilePdf ? 6 : 9);
      doc.setTextColor(...colors.muted);
      doc.text(safe(filtros_desc), margin + (isMobilePdf ? 5 : 10), y + (isMobilePdf ? 10 : 14));
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin + (isMobilePdf ? 5 : 10), y + (isMobilePdf ? 14 : 19));
      y += isMobilePdf ? 22 : 32;
    };

    const drawKpis = () => {
      const cards = [
        { label: 'Pedidos', value: String(kpis.totalPedidos || pedidos.length || 0) },
        { label: 'Total pendente', value: moeda(kpis.totalGeral || 0) },
        { label: 'Em aberto', value: moeda(kpis.totalEmAberto || 0) },
        { label: 'Pago não entregue', value: moeda(kpis.totalPagoNaoEntregue || 0) },
      ];

      if (isMobilePdf) {
        cards.forEach((card) => {
          ensureSpace(10);
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
          doc.setTextColor(107, 114, 128);
          doc.setFontSize(5.5);
          doc.text(card.label, margin + 3, y + 3.2);
          doc.setTextColor(17, 24, 39);
          doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
          doc.setFontSize(6.5);
          doc.text(safe(String(card.value)), margin + 3, y + 6.5);
          y += 10;
        });
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        y += 2;
        return;
      }

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
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(10);
        doc.text(safe(String(card.value)), x + 4, y + 13);
      });
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      y += 24;
    };

    const drawGroupSummary = () => {
      if (!Array.isArray(grupos) || grupos.length === 0) return;
      ensureSpace(20);
      doc.setTextColor(75, 85, 99);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.text('Agrupamento aplicado na tela', margin, y);
      y += 5;

      grupos.forEach((grupo, index) => {
        const totalGrupo = (grupo.pedidos || []).reduce((acc, pedido) => acc + (Number(pedido.valor_pendente_entrega ?? pedido.valor_total) || 0), 0);
        ensureSpace(8);
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, y - 1.5, contentWidth, 6.5, 2, 2, 'F');
        }
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
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
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.text(safe(String(pedido.numero || 'Sem número')), margin + 5, y + 7);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(9.5);
      doc.text(safe(String(pedido.fornecedor_nome || 'Sem fornecedor')), margin + 40, y + 7);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
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
      const statusColors = getStatusPdfColors(pedido.status);
      doc.setFillColor(...colors.panel);
      doc.roundedRect(margin, y, contentWidth, 28, 4, 4, 'F');
      doc.setFillColor(...statusColors.dot);
      doc.circle(margin + 5, y + 6.5, 1.3, 'F');
      doc.setTextColor(...colors.text);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.text(safe(String(pedido.numero || 'Sem número')), margin + 9, y + 8);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(9.5);
      doc.text(safe(String(pedido.fornecedor_nome || 'Sem fornecedor')), margin + 9, y + 14);
      doc.setFillColor(...statusColors.pillBg);
      doc.roundedRect(margin + 9, y + 17, 33, 6.2, 3, 3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(7.1);
      doc.setTextColor(...statusColors.pillText);
      doc.text(safe(pedido.status || '-'), margin + 12, y + 21.2);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.muted);
      doc.text(`Emissão ${data(pedido.data_emissao || pedido.created_date)}`, margin + 48, y + 20);
      doc.text(`Entrega ${data(pedido.data_prevista_entrega)}`, margin + 92, y + 20);
      doc.setTextColor(...colors.text);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.text(moeda(pedido.valor_total), margin + contentWidth - 4, y + 10, { align: 'right' });
      const totalLinhas = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
      const totalQtd = Array.isArray(pedido.itens) ? pedido.itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) : 0;
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.muted);
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

      if (isMobilePdf) {
        itens.forEach((item, index) => {
          const produto = produtosMap[item.produto_id] || {};
          const quantidade = Number(item.quantidade) || 0;
          const custoCalculado = Number(produto.preco_custo_calculado) || custoCalculadoProduto(produto);
          const valorUnitarioVenda = Number(produto.preco_venda_padrao) || 0;
          const custoCalculadoTotal = quantidade * custoCalculado;
          const vendaTotal = quantidade * valorUnitarioVenda;
          const markup = custoCalculado > 0 ? ((valorUnitarioVenda - custoCalculado) / custoCalculado) * 100 : 0;

          subtotalCompra += custoCalculadoTotal;
          subtotalVenda += vendaTotal;

          ensureSpace(18);
          if (index % 2 === 0) {
            doc.setFillColor(...colors.rowAlt);
            doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
          }

          doc.setTextColor(...colors.text);
          doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
          doc.setFontSize(6.5);
          const nomeItem = doc.splitTextToSize(safe(String(item.produto_nome || produto.nome || 'Item sem nome')), contentWidth - 6)[0];
          doc.text(nomeItem, margin + 3, y + 4);
          doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
          doc.setFontSize(5.3);
          doc.text(`Qtd ${quantidade.toLocaleString('pt-BR')} · Custo ${moeda(custoCalculado)}`, margin + 3, y + 8);
          doc.text(`Venda ${moeda(valorUnitarioVenda)} · Markup ${percentual(markup)}`, margin + 3, y + 11.5);
          doc.text(`Total custo ${moeda(custoCalculadoTotal)} · Venda ${moeda(vendaTotal)}`, margin + 3, y + 15);
          y += 18;
        });

        ensureSpace(18);
        const statusColors = getStatusPdfColors(pedido.status);
        doc.setFillColor(...statusColors.pillBg);
        doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
        doc.setTextColor(...statusColors.pillText);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(6.2);
        doc.text(`Custo calc.: ${moeda(subtotalCompra)}`, margin + 3, y + 4.5);
        doc.text(`Venda: ${moeda(subtotalVenda)}`, margin + 3, y + 8.5);
        doc.text(`Margem bruta: ${moeda(subtotalVenda - subtotalCompra)}`, margin + 3, y + 12.5);
        y += 18;
        return;
      }
      ensureSpace(12);
      doc.setFillColor(...colors.panelSoft);
      doc.roundedRect(tableMargin, y, tableWidth, 8, 2, 2, 'F');
      doc.setTextColor(...colors.muted);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(5.8);
      doc.text('DESCRIÇÃO', tableMargin + 2, y + 5);
      doc.text('LÍQ.', tableMargin + 54, y + 5);
      doc.text('FRETE', tableMargin + 69, y + 5);
      doc.text('OUTROS', tableMargin + 84, y + 5);
      doc.text('CUSTO', tableMargin + 101, y + 5);
      doc.text('VLR UN.', tableMargin + 118, y + 5);
      doc.text('TOTAL', tableMargin + 136, y + 5);
      doc.text('VENDA', tableMargin + 154, y + 5);
      doc.text('MARKUP', tableMargin + 171, y + 5);
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
        const custoCalculadoTotal = quantidade * custoCalculado;
        const markup = custoCalculado > 0 ? ((valorUnitarioVenda - custoCalculado) / custoCalculado) * 100 : 0;

        subtotalCompra += custoCalculadoTotal;
        subtotalVenda += quantidade * valorUnitarioVenda;

        ensureSpace(8);
        if (index % 2 === 0) {
          doc.setFillColor(...colors.rowAlt);
          doc.roundedRect(tableMargin, y - 1, tableWidth, 7, 1.5, 1.5, 'F');
        }

        doc.setTextColor(...colors.text);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.6);
        const nomeItem = doc.splitTextToSize(safe(String(item.produto_nome || produto.nome || 'Item sem nome')), 50)[0];
        doc.text(nomeItem, tableMargin + 2, y + 3.5);
        doc.text(moeda(precoCompraLiquido), tableMargin + 54, y + 3.5);
        doc.text(moeda(custoFrete), tableMargin + 69, y + 3.5);
        doc.text(moeda(outrosCustos), tableMargin + 84, y + 3.5);
        doc.text(moeda(custoCalculado), tableMargin + 101, y + 3.5);
        doc.text(moeda(precoCompraLiquido), tableMargin + 118, y + 3.5);
        doc.text(moeda(valorCompraTotal), tableMargin + 136, y + 3.5);
        doc.text(moeda(valorUnitarioVenda), tableMargin + 154, y + 3.5);
        doc.text(percentual(markup), tableMargin + 171, y + 3.5);
        y += 8;
      });

      ensureSpace(18);
      const statusColors = getStatusPdfColors(pedido.status);
      doc.setFillColor(...statusColors.pillBg);
      doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');
      doc.setTextColor(...statusColors.pillText);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(8);
      doc.text(`Compra total: ${moeda(subtotalCompra)}`, margin + 4, y + 5.5);
      doc.text(`Venda total: ${moeda(subtotalVenda)}`, margin + 72, y + 5.5);
      doc.text(`Margem bruta: ${moeda(subtotalVenda - subtotalCompra)}`, margin + 136, y + 5.5);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7);
      doc.text(`Leitura expandida no padrão visual de ${safe(pedido.status || 'rascunho')}.`, margin + 4, y + 10.5);
      y += 18;
    };

    drawHeader();
    drawKpis();
    drawGroupSummary();

    if (Array.isArray(grupos) && grupos.length > 0) {
      grupos.forEach((grupo) => {
        ensureSpace(14);
        doc.setTextColor(...colors.muted);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(8.5);
        doc.text(safe(grupo.label || '-'), margin, y);
        y += 4;

        (grupo.pedidos || []).forEach((pedido) => {
          if (version === 'expandida' || version === 'expandida_mobile') {
            drawExpandido(pedido);
          } else {
            drawCompacto(pedido);
          }
        });
      });
    } else {
      pedidos.forEach((pedido) => {
        if (version === 'expandida' || version === 'expandida_mobile') {
          drawExpandido(pedido);
        } else {
          drawCompacto(pedido);
        }
      });
    }

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