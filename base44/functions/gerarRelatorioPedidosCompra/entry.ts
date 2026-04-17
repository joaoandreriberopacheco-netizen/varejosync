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
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const loadFontBase64 = async (url, cacheKey) => {
  if (fontCache[cacheKey]) return fontCache[cacheKey];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro ao carregar fonte ${cacheKey}`);
  const base64 = arrayBufferToBase64(await response.arrayBuffer());
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
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-');
};

const toTitleCase = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
};

const STATUS_PROGRESS = {
  'Rascunho': 1, 'Aguardando Liberacao': 2, 'Aprovado': 3,
  'Despachado': 4, 'Em Recepcao': 4, 'Em Conferencia': 4,
  'Pendencia': 3, 'Devolvido': 2, 'Concluido': 5, 'Cancelado': 0,
};
const getStatusProgress = (status) => {
  const key = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  return STATUS_PROGRESS[key] ?? 1;
};

const moeda = (valor = 0) =>
  `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moedaSemSimbolo = (valor = 0) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentual = (valor = 0) =>
  `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const dataFmt = (valor) => {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
};

const normalizarStatusRelatorio = (status) => {
  if (status === 'Aguardando Liberação Financeira' || status === 'Aguardando Aprovação Financeira') return 'Aguardando Pagamento';
  return status || '-';
};

const getPedidoNumeroRelatorio = (pedido) => safe(pedido._display_code || pedido.numero || 'Sem numero');
const getFornecedorRelatorio = (pedido) => safe(pedido._display_fornecedor || pedido.fornecedor_nome || 'Sem fornecedor');
const getDataRelatorio = (pedido) => pedido._display_date || pedido.data_prevista_entrega || pedido.data_emissao || pedido.created_date;
const getQuantidadeRelatorio = (pedido) => {
  const itens = pedido._display_itens || pedido.itens || [];
  return itens.reduce((a, i) => a + (Number(i.quantidade_embarcada) || Number(i.quantidade_pedida) || Number(i.quantidade) || 0), 0);
};
const getItensRelatorio = (pedido) => pedido._display_itens || pedido.itens || [];
const getTransportadoraRelatorio = (pedido) => pedido._embarque?.transportadora_nome || 'Sem transportadora';
const getEtaRelatorio = (pedido) => pedido._embarque?.eta || null;
const getOrdinalRelatorio = (pedido) => pedido._display_ordinal || pedido._embarque?.numero || '#01';
const isNecessidadeRelatorio = (pedido) => !!pedido._is_necessidade || pedido._embarque?.tipo === 'Necessidade';
const getQuantidadeEfetivaItem = (item = {}) =>
  Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || Number(item.quantidade) || 0;

const getValorUnitarioEfetivoItem = (item = {}, produto = {}) => {
  const custoFinalUnitario = Number(item.custo_final_unitario);
  if (Number.isFinite(custoFinalUnitario)) return custoFinalUnitario;

  const custoUnitario = Number(item.custo_unitario);
  const descontoOuAcrescimo = Number(item.valor_desconto_item);
  if (Number.isFinite(custoUnitario) && Number.isFinite(descontoOuAcrescimo)) {
    return custoUnitario - descontoOuAcrescimo;
  }

  const totalItem = Number(item.total);
  const qtd = getQuantidadeEfetivaItem(item);
  if (Number.isFinite(totalItem) && qtd > 0) return totalItem / qtd;

  if (Number.isFinite(custoUnitario)) return custoUnitario;
  return Number(produto.valor_compra) || 0;
};

const getTotalItensAjustadoPedido = (pedido, produtosMap = {}) => {
  const itens = getItensRelatorio(pedido);
  return itens.reduce((acc, item) => {
    const produto = produtosMap[item.produto_id] || {};
    const qtd = getQuantidadeEfetivaItem(item);
    const valorUnitarioEfetivo = getValorUnitarioEfetivoItem(item, produto);
    return acc + (qtd * valorUnitarioEfetivo);
  }, 0);
};

const getValorRelatorio = (pedido, produtosMap = {}) => {
  const totalItensAjustado = getTotalItensAjustadoPedido(pedido, produtosMap);
  if (totalItensAjustado > 0) return totalItensAjustado;
  return Number(pedido._display_valor ?? pedido.valor_pendente_entrega ?? pedido.valor_total ?? 0);
};

const custoCalculadoProduto = (produto = {}) =>
  (Number(produto.valor_compra) || 0)
  + (Number(produto.custo_frete_padrao) || 0)
  + (Number(produto.custo_imposto1_padrao) || 0)
  + (Number(produto.custo_imposto2_padrao) || 0)
  + (Number(produto.custo_outros_padrao) || 0)
  - (Number(produto.desconto_compra_padrao) || 0);

const TEXT_VERTICAL_SCALE = 1.75;
const EXPANDED_ITEMS_TABLE_FONT_SIZE = 8.25; // ~11px visual size in the generated PDF
const EXPANDED_ITEMS_TABLE_HEADER_FONT_SIZE = 7;
const EXPANDED_ITEMS_TABLE_HEADER_HEIGHT = 12;
const EXPANDED_ITEMS_TABLE_ROW_HEIGHT = 7.25;
const EXPANDED_ITEMS_TABLE_TEXT_Y = 3.9;
const EXPANDED_ITEMS_TABLE_COLUMNS = {
  qtd: 2,
  descricao: 14,
  vlrUnit: 74,
  frete: 91,
  outros: 108,
  custo: 125,
  total: 142,
  venda: 159,
  markup: 173,
};
/** Margem horizontal (mm) entre fim da coluna descrição e coluna VLR. UN. (evita sobreposição ao imprimir). */
const EXPANDED_DESC_TO_VLR_GAP_MM = 9;

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
  const lines = doc.splitTextToSize(safe(text || '-'), maxWidth);
  doc.text(lines, x, y, { charSpace: 0, horizontalScale: 100 });
  return y + (lines.length * lineHeight * TEXT_VERTICAL_SCALE);
};

const STATUS_PDF_COLORS = {
  'Rascunho':              { dot: [209,213,219], pillBg: [243,244,246], pillText: [107,114,128] },
  'Aguardando Liberacao':  { dot: [203,213,225], pillBg: [241,245,249], pillText: [71,85,105]   },
  'Aprovado':              { dot: [52,211,153],  pillBg: [236,253,245], pillText: [4,120,87]    },
  'Despachado':            { dot: [34,211,238],  pillBg: [236,254,255], pillText: [14,116,144]  },
  'Em Transito':           { dot: [56,189,248],  pillBg: [240,249,255], pillText: [3,105,161]   },
  'Pendencia':             { dot: [251,146,60],  pillBg: [255,247,237], pillText: [194,65,12]   },
  'Devolvido':             { dot: [251,113,133], pillBg: [255,241,242], pillText: [190,24,93]   },
  'Concluido':             { dot: [16,185,129],  pillBg: [236,253,245], pillText: [4,120,87]    },
  'Cancelado':             { dot: [209,213,219], pillBg: [243,244,246], pillText: [156,163,175] },
};

const getStatusColors = (status) => {
  const key = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  return STATUS_PDF_COLORS[key] || STATUS_PDF_COLORS['Rascunho'];
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const {
      pedidos = [],
      version = 'compacta',
      filtros_desc = 'Pedidos filtrados na tela',
      kpis = {},
      grupos = [],
    } = payload;

    const isMobile = version === 'expandida_mobile';

    // Carregar apenas produtos realmente usados no relatório
    const produtoIds = [...new Set(
      pedidos.flatMap((p) => (p._display_itens || p.itens || []).map((i) => i.produto_id).filter(Boolean))
    )];
    const produtos = produtoIds.length ? await Promise.all(produtoIds.map((id) => base44.asServiceRole.entities.Produto.get(id).catch(() => null))) : [];
    const produtosMap = Object.fromEntries((produtos || []).filter(Boolean).map((p) => [p.id, p]));

    // ── Criação do documento ─────────────────────────────────────────────────
    const MOBILE_W = 100; // mm — largura estilo smartphone
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isMobile ? [MOBILE_W, 297] : 'a4',
    });
    await registerPdfFonts(doc);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = isMobile ? 5 : 12;          // margem
    const TM = isMobile ? 5 : 18;         // margem tabela
    const CW = pageW - M * 2;             // content width
    const TW = pageW - TM * 2;            // table width

    const C = {
      text:      [31,  41,  55],
      muted:     [107, 114, 128],
      mutedLight:[156, 163, 175],
      panel:     [248, 250, 252],
      soft:      [243, 244, 246],
      rowAlt:    [249, 250, 251],
      dark:      [17,  24,  39],
      white:     [255, 255, 255],
      teal:      [45,  212, 191],
      tealDark:  [15,  118, 110],
    };

    let y = 16;

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageH - 10) {
        doc.addPage();
        y = 14;
      }
    };

    const scaledHeight = (value) => value * TEXT_VERTICAL_SCALE;

    // ════════════════════════════════════════════════════════════════════════
    //  HEADER
    // ════════════════════════════════════════════════════════════════════════
    const drawHeader = () => {
      if (isMobile) {
        // Header limpo — sem fundo escuro
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(11);
        doc.setTextColor(...C.text);
        doc.text('Pedidos de Compra', M, 12);

        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.2);
        doc.setTextColor(...C.muted);
        const filtroLine = doc.splitTextToSize(safe(filtros_desc), CW)[0];
        doc.text(filtroLine, M, 17.5);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M, 22);

        // Linha separadora sutil cinza
        doc.setFillColor(...C.soft);
        doc.rect(M, 25, CW, 0.5, 'F');

        y = 30;
        return;
      }

      // Desktop header
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 26, 4, 4, 'F');
      doc.setFillColor(...C.teal);
      doc.roundedRect(M + 5, y + 5, 2.4, 10, 1.2, 1.2, 'F');
      doc.setTextColor(...C.text);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(16);
      const titulo = version === 'expandida' ? 'Relatorio expandido de embarques' : 'Relatorio compacto de embarques';
      doc.text(safe(titulo), M + 11, y + 9);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(safe(filtros_desc), M + 11, y + 15);
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M + 11, y + 21);
      y += 32;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  KPIs
    // ════════════════════════════════════════════════════════════════════════
    const drawKpis = () => {
      const cards = [
        { label: 'Embarques',       value: String(kpis.totalPedidos || pedidos.length || 0) },
        { label: 'Total pendente',  value: moeda(kpis.totalGeral || 0) },
        { label: 'Em aberto',       value: moeda(kpis.totalEmAberto || 0) },
        { label: 'Pago/nao entregue', value: moeda(kpis.totalPagoNaoEntregue || 0) },
      ];

      if (isMobile) {
        const colW = (CW - 3) / 2;
        for (let i = 0; i < cards.length; i += 2) {
          ensureSpace(16);
          [0, 1].forEach((col) => {
            const card = cards[i + col];
            if (!card) return;
            const cx = M + col * (colW + 3);
            doc.setFillColor(...C.soft);
            doc.roundedRect(cx, y, colW, 13, 2, 2, 'F');
            doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
            doc.setFontSize(5);
            doc.setTextColor(...C.muted);
            doc.text(safe(card.label), cx + 3, y + 4.5);
            doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
            doc.setFontSize(7);
            doc.setTextColor(...C.dark);
            doc.text(safe(String(card.value)), cx + 3, y + 10);
          });
          y += 15;
        }
        y += 2;
        return;
      }

      const gap = 4;
      const cw = (CW - gap * 3) / 4;
      cards.forEach((card, i) => {
        const x = M + (cw + gap) * i;
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(x, y, cw, 18, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(...C.muted);
        doc.text(card.label, x + 4, y + 6);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(10);
        doc.setTextColor(...C.dark);
        doc.text(safe(String(card.value)), x + 4, y + 13);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      });
      y += 24;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  GROUP SUMMARY (desktop only)
    // ════════════════════════════════════════════════════════════════════════
    const drawGroupSummary = () => {
      if (isMobile || !Array.isArray(grupos) || grupos.length === 0) return;
      ensureSpace(20);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text('Agrupamento aplicado na tela', M, y);
      y += 5;
      grupos.forEach((grupo, idx) => {
        const total = (grupo.pedidos || []).reduce((a, p) => a + (Number(p.valor_pendente_entrega ?? p.valor_total) || 0), 0);
        ensureSpace(8);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(M, y - 1.5, CW, 6.5, 2, 2, 'F');
        }
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(7.5);
        doc.setTextColor(...C.text);
        doc.text(safe(grupo.label || '-'), M + 3, y + 2.5);
        doc.text(`${(grupo.pedidos || []).length} pedidos`, M + 122, y + 2.5);
        doc.text(moeda(total), M + CW - 3, y + 2.5, { align: 'right' });
        y += 7;
      });
      y += 4;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: header compacto do pedido
    // ════════════════════════════════════════════════════════════════════════
    const drawPedidoHeaderCompacto = (pedido) => {
      ensureSpace(30);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(M, y, CW, 22, 3, 3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.dark);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 5, y + 7);
      doc.setFontSize(9.5);
      doc.text(getFornecedorRelatorio(pedido), M + 40, y + 7);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data: ${dataFmt(getDataRelatorio(pedido))}`, M + 5, y + 13);
      doc.text(`ETA: ${dataFmt(getEtaRelatorio(pedido))}`, M + 58, y + 13);
      doc.text(`Status: ${normalizarStatusRelatorio(pedido._display_status || pedido.status)}`, M + 105, y + 13);
      doc.text(`Total: ${moeda(getValorRelatorio(pedido))}`, M + 155, y + 13);
      y += 26;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: header expandido do pedido
    // ════════════════════════════════════════════════════════════════════════
    const drawPedidoHeaderExpandido = (pedido) => {
      ensureSpace(34);
      const sc = getStatusColors(normalizarStatusRelatorio(pedido._display_status || pedido.status));
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 28, 4, 4, 'F');
      doc.setFillColor(...sc.dot);
      doc.circle(M + 5, y + 6.5, 1.3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.text);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 9, y + 8);
      doc.setFontSize(9.5);
      doc.text(getFornecedorRelatorio(pedido), M + 9, y + 14);
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + 9, y + 17, 33, 6.2, 3, 3, 'F');
      doc.setFontSize(7.1);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(normalizarStatusRelatorio(pedido._display_status || pedido.status)), M + 12, y + 21.2);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data ${dataFmt(getDataRelatorio(pedido))}`, M + 48, y + 20);
      doc.text(`ETA ${dataFmt(getEtaRelatorio(pedido))}`, M + 92, y + 20);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      doc.text(moeda(getValorRelatorio(pedido)), M + CW - 4, y + 10, { align: 'right' });
      const totalLinhas = (pedido._display_itens || pedido.itens || []).length;
      const totalQtd = getQuantidadeRelatorio(pedido);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`${totalLinhas} itens - ${totalQtd.toLocaleString('pt-BR')} un.`, M + CW - 4, y + 16, { align: 'right' });
      y += 32;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: layout compacto
    // ════════════════════════════════════════════════════════════════════════
    const drawCompacto = (pedido) => {
      const isPendencia = (pedido.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'Pendencia';
      const itensTela = getItensRelatorio(pedido);
      const pedidoParaHeader = {
        ...pedido,
        valor_total: getValorRelatorio(pedido)
      };
      drawPedidoHeaderCompacto(pedidoParaHeader);
      const embarque = pedido._embarque || (pedido.embarques_registrados || [])[0] || null;
      const itensEfetivos = itensTela;
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`Transportadora: ${safe(getTransportadoraRelatorio(pedido))}`, M + 2, y);
      doc.text(`ETA: ${safe(dataFmt(getEtaRelatorio(pedido)))}`, M + 78, y);
      doc.text(`${getOrdinalRelatorio(pedido)} · ${itensEfetivos.length} itens${isPendencia ? ' pend.' : ''}`, M + 134, y);
      y += 5;
      y = addWrappedText(doc, pedido.observacoes || pedido.historico || '-', M + 2, y, CW - 4, 4) + 4;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: layout expandido
    // ════════════════════════════════════════════════════════════════════════
    const drawExpandido = (pedido) => {
      const isPendencia = (pedido.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'Pendencia';
      let itens = getItensRelatorio(pedido).map((item) => ({
        ...item,
        _qtdEfetiva: Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || Number(item.quantidade) || 0
      }));

      // Cabeçalho com valor ajustado
      ensureSpace(34);
      const sc = getStatusColors(normalizarStatusRelatorio(pedido._display_status || pedido.status));
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 28, 4, 4, 'F');
      doc.setFillColor(...sc.dot);
      doc.circle(M + 5, y + 6.5, 1.3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.text);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 9, y + 8);
      doc.setFontSize(9.5);
      doc.text(getFornecedorRelatorio(pedido), M + 9, y + 14);
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + 9, y + 17, 33, 6.2, 3, 3, 'F');
      doc.setFontSize(7.1);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(normalizarStatusRelatorio(pedido._display_status || pedido.status)), M + 12, y + 21.2);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data ${dataFmt(getDataRelatorio(pedido))}`, M + 48, y + 20);
      doc.text(`ETA ${dataFmt(getEtaRelatorio(pedido))}`, M + 92, y + 20);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      // Total do pedido no relatório expandido: valor unitário x quantidade.
      // Custo permanece apenas como informação para análise de margem/markup.
      const valorExp = itens.reduce((a, i) => {
        const prod = produtosMap[i.produto_id] || {};
        const valorUnitario = getValorUnitarioEfetivoItem(i, prod);
        return a + (i._qtdEfetiva * valorUnitario);
      }, 0);
      doc.text(moeda(valorExp), M + CW - 4, y + 10, { align: 'right' });
      const totalQtdExp = itens.reduce((a, i) => a + i._qtdEfetiva, 0);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`${itens.length} itens${isPendencia ? ' pend.' : ''} - ${totalQtdExp.toLocaleString('pt-BR')} un.`, M + CW - 4, y + 16, { align: 'right' });
      y += 32;

      let totCusto = 0, totVenda = 0;

      ensureSpace(scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT + 2));
      doc.setFillColor(...C.soft);
      doc.roundedRect(TM, y, TW, scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT), 2, 2, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(EXPANDED_ITEMS_TABLE_HEADER_FONT_SIZE);
      doc.setTextColor(...C.text);
      doc.text('QTD', TM + EXPANDED_ITEMS_TABLE_COLUMNS.qtd, y + scaledHeight(7));
      doc.text('DESCRICAO', TM + EXPANDED_ITEMS_TABLE_COLUMNS.descricao, y + scaledHeight(7));
      doc.text(['VLR. UN.', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.vlrUnit, y + scaledHeight(5.2), { align: 'right' });
      doc.text(['FRETE', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.frete, y + scaledHeight(5.2), { align: 'right' });
      doc.text(['OUTROS', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.outros, y + scaledHeight(5.2), { align: 'right' });
      doc.text(['CUSTO', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.custo, y + scaledHeight(5.2), { align: 'right' });
      doc.text(['TOTAL', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.total, y + scaledHeight(5.2), { align: 'right' });
      doc.text(['VENDA', '(R$)'], TM + EXPANDED_ITEMS_TABLE_COLUMNS.venda, y + scaledHeight(5.2), { align: 'right' });
      doc.text('MARKUP', TM + EXPANDED_ITEMS_TABLE_COLUMNS.markup, y + scaledHeight(7), { align: 'right' });
      y += scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT + 2);

      itens.forEach((item, idx) => {
        const prod = produtosMap[item.produto_id] || {};
        const qtd = item._qtdEfetiva;
        const liq = getValorUnitarioEfetivoItem(item, prod);
        const frete = Number(prod.custo_frete_padrao) || 0;
        const outros = (Number(prod.custo_imposto1_padrao) || 0) + (Number(prod.custo_imposto2_padrao) || 0) + (Number(prod.custo_outros_padrao) || 0);
        // Regra do PDF expandido: custo unitário baseia-se no valor unitário + custos informados.
        const custo = liq + frete + outros;
        const venda = Number(prod.preco_venda_padrao) || 0;
        const totalLiq = qtd * liq;
        const totalCusto = qtd * custo;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
        totCusto += totalCusto;
        totVenda += qtd * venda;

        // splitTextToSize deve usar o MESMO fontSize do desenho — senão a largura calculada fica errada e o texto invade VLR. UN.
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(EXPANDED_ITEMS_TABLE_FONT_SIZE);
        const descMaxW = Math.max(
          18,
          EXPANDED_ITEMS_TABLE_COLUMNS.vlrUnit -
            EXPANDED_ITEMS_TABLE_COLUMNS.descricao -
            EXPANDED_DESC_TO_VLR_GAP_MM
        );
        const nomeLinhas = doc.splitTextToSize(
          safe(item.produto_nome || prod.nome || '-'),
          descMaxW
        );
        const descLineStep = scaledHeight(3.7);
        const firstDescY = y + scaledHeight(3.5);
        const rowHeight = Math.max(
          EXPANDED_ITEMS_TABLE_ROW_HEIGHT,
          3.4 + nomeLinhas.length * 2.55
        );
        ensureSpace(scaledHeight(rowHeight));
        if (idx % 2 === 0) {
          doc.setFillColor(...C.rowAlt);
          doc.roundedRect(TM, y - 1, TW, scaledHeight(rowHeight - 1), 1.5, 1.5, 'F');
        }
        doc.setTextColor(...C.text);
        doc.text(String(qtd.toLocaleString('pt-BR')), TM + 2, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y));
        nomeLinhas.forEach((line, li) => {
          doc.text(line, TM + EXPANDED_ITEMS_TABLE_COLUMNS.descricao, firstDescY + li * descLineStep);
        });
        doc.text(moedaSemSimbolo(liq),       TM + EXPANDED_ITEMS_TABLE_COLUMNS.vlrUnit, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(moedaSemSimbolo(frete),     TM + EXPANDED_ITEMS_TABLE_COLUMNS.frete, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(moedaSemSimbolo(outros),    TM + EXPANDED_ITEMS_TABLE_COLUMNS.outros, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(moedaSemSimbolo(custo),     TM + EXPANDED_ITEMS_TABLE_COLUMNS.custo, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(moedaSemSimbolo(totalLiq),  TM + EXPANDED_ITEMS_TABLE_COLUMNS.total, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(moedaSemSimbolo(venda),     TM + EXPANDED_ITEMS_TABLE_COLUMNS.venda, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        doc.text(percentual(mk),   TM + EXPANDED_ITEMS_TABLE_COLUMNS.markup, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y), { align: 'right' });
        y += scaledHeight(rowHeight);
      });

      ensureSpace(scaledHeight(22));
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(M, y + scaledHeight(1), M + CW, y + scaledHeight(1));
      y += scaledHeight(4);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.text);
      doc.text(`Custo total (itens): ${moeda(totCusto)}`, M + 2, y + scaledHeight(3.5));
      doc.text(`Valor de venda total (referência): ${moeda(totVenda)}`, M + 2, y + scaledHeight(9));
      y += scaledHeight(12);
      doc.setFontSize(6.2);
      doc.setTextColor(...C.mutedLight);
      doc.text('Relatório gerado pelo VarejoSync.', M + 2, y + scaledHeight(2.5));
      y += scaledHeight(8);
    };

    // ════════════════════════════════════════════════════════════════════════
    //  MOBILE: card limpo modo claro
    // ════════════════════════════════════════════════════════════════════════
    const ITEM_ML = M + 6;   // indentação dos itens
    const ITEM_CW = CW - 6;  // largura dos itens
    const LINE_X = M + 1.5;  // x da linha hierárquica vertical
    const SLATE900 = [15, 23, 42];
    const SLATE700 = [51, 65, 85];
    const SLATE500 = [100, 116, 139];
    const MOBILE_ITEMS_FONT_SCALE = 1.15;
    const MOBILE_ITEMS_VERTICAL_SCALE = 1.6;

    // Barra de progresso multi-segmento
    const drawProgressBar = (status, barY) => {
      const level = getStatusProgress(status);
      const totalSegs = 5;
      const segW = (CW - (totalSegs - 1) * 1) / totalSegs;
      const sc = getStatusColors(status);
      for (let s = 0; s < totalSegs; s++) {
        const sx = M + s * (segW + 1);
        doc.setFillColor(...(s < level ? sc.dot : [220, 225, 230]));
        doc.roundedRect(sx, barY, segW, 1.5, 0.75, 0.75, 'F');
      }
    };

    // Colunas fixas para alinhar quantidade verticalmente
    const QTD_RIGHT_X = ITEM_ML + 13; // right-align da quantidade
    const UN_X = ITEM_ML + 14;         // início da unidade
    const NOME_X = ITEM_ML + 23;       // início do nome (após UN max)

    const fmtQtd = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const drawMobileCard = (pedido) => {
      const isPendencia = (pedido.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'Pendencia';
      const statusRelatorio = normalizarStatusRelatorio(pedido._display_status || pedido.status);
      const sc = getStatusColors(statusRelatorio);

      // Para Pendência: filtrar apenas itens com quantidade pendente
      let itens = getItensRelatorio(pedido).map((item) => ({
        ...item,
        _qtdMostrada: Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || Number(item.quantidade) || 0
      }));

      ensureSpace(32);

      // ── Cabeçalho ──────────────────────────────────────────────
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 28, 2.5, 2.5, 'F');

      // LED dot
      doc.setFillColor(...sc.dot);
      doc.circle(M + 4.5, y + 6, 2, 'F');

      // Número do pedido
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(6);
      doc.setTextColor(...SLATE500);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 9, y + 6.8);

      // Status pill direita
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + CW - 30, y + 2, 28, 7, 3.5, 3.5, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(statusRelatorio), M + CW - 16, y + 6.8, { align: 'center' });

      // Fornecedor
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.setTextColor(...SLATE900);
      const fornLine = doc.splitTextToSize(getFornecedorRelatorio(pedido), CW - 8)[0];
      doc.text(fornLine, M + 3, y + 15);

      // Valor (pendente para Pendencia, total para outros)
      doc.setFontSize(8.5);
      const valorHeader = isPendencia
        ? moeda(itens.reduce((a, i) => {
            const prod = produtosMap[i.produto_id] || {};
            const cu = getValorUnitarioEfetivoItem(i, prod);
            return a + (i._qtdMostrada * cu);
          }, 0))
        : moeda(getValorRelatorio(pedido, produtosMap));
      doc.text(valorHeader, M + CW - 2, y + 15, { align: 'right' });

      // Datas + contagem
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(6);
      doc.setTextColor(...SLATE500);
      const countLabel = isNecessidadeRelatorio(pedido)
        ? `${itens.length} item(ns) pendente(s)`
        : `${itens.length} item(ns)`;
      doc.text(
        `${dataFmt(getDataRelatorio(pedido))}  -  ${dataFmt(getEtaRelatorio(pedido))}  ·  ${getOrdinalRelatorio(pedido)}  ·  ${countLabel}`,
        M + 3, y + 21.5
      );

      // Barra de progresso
      drawProgressBar(pedido.status, y + 25);
      y += 31;

      // ── Itens ─────────────────────────────────────────────────────
      const totalItens = itens.length;
      itens.forEach((item, idx) => {
        const prod = produtosMap[item.produto_id] || {};
        const qtd = item._qtdMostrada;
        const un = safe(item.unidade_medida || prod.unidade_principal || 'UN');
        const precoCompra = getValorUnitarioEfetivoItem(item, prod);
        const custo = Number(prod.preco_custo_calculado) || custoCalculadoProduto(prod);
        const venda = Number(prod.preco_venda_padrao) || 0;
        const tCusto = qtd * custo;
        const tVenda = qtd * venda;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;

        ensureSpace(16 * MOBILE_ITEMS_VERTICAL_SCALE);
        const rowH = 15 * MOBILE_ITEMS_VERTICAL_SCALE;
        const branchY = y + (5 * MOBILE_ITEMS_VERTICAL_SCALE);
        const lineWidth = 3.5;
        const primaryLineY = y + (6 * MOBILE_ITEMS_VERTICAL_SCALE);
        const secondaryLineY = y + (12 * MOBILE_ITEMS_VERTICAL_SCALE);
        const extraLineStep = 4.5 * MOBILE_ITEMS_VERTICAL_SCALE;
        const isLast = idx === totalItens - 1;

        // Linha vertical hierárquica — mais fina e muito escura (slate-900)
        doc.setFillColor(...SLATE900);
        doc.rect(LINE_X, y, 0.15, isLast ? rowH - branchY + y : rowH, 'F');
        doc.rect(LINE_X, branchY, lineWidth, 0.15, 'F');

        // LINHA Única: QTD (right-align coluna fixa) | UN | Nome | Total
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(7.5 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE900);

        // Qtd right-aligned numa coluna fixa
        doc.text(fmtQtd(qtd), QTD_RIGHT_X, primaryLineY, { align: 'right' });

        // UN
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(7 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE700);
        doc.text(un, UN_X, primaryLineY);

        // Nome do produto — Title Case, pode quebrar linha
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(7 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE700);
        const nomeLinhas = doc.splitTextToSize(
          toTitleCase(safe(item.produto_nome || prod.nome || '-')),
          M + CW - NOME_X - 24
        );
        // Renderiza nome na linha 1 (junto com qtd/un/total)
        doc.text(nomeLinhas[0], NOME_X, primaryLineY);
        // Linhas extras do nome (se houver quebra)
        if (nomeLinhas.length > 1) {
          for (let nl = 1; nl < nomeLinhas.length; nl++) {
            doc.text(nomeLinhas[nl], NOME_X, primaryLineY + nl * extraLineStep);
          }
        }
        const nomeExtraH = Math.max(0, (nomeLinhas.length - 1) * extraLineStep);

        // Total do item (custo) — right aligned, bold
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(7.5 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE900);
        doc.text(moeda(tCusto), M + CW - 2, primaryLineY, { align: 'right' });

        // Linha 2: Compra | Custo | Venda | Mk
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.5 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE500);
        doc.text(
          `Compra ${moeda(precoCompra)}  ·  Custo ${moeda(custo)}  ·  Venda ${moeda(venda)}  ·  Mk ${percentual(mk)}`,
          NOME_X, secondaryLineY + nomeExtraH
        );

        y += rowH + nomeExtraH;
      });

      y += 4; // espaço entre pedidos
    };

    // ════════════════════════════════════════════════════════════════════════
    //  RENDER PRINCIPAL
    // ════════════════════════════════════════════════════════════════════════
    drawHeader();
    drawKpis();
    drawGroupSummary();

    const renderPedido = (pedido) => {
      if (isMobile)              return drawMobileCard(pedido);
      if (version === 'expandida') return drawExpandido(pedido);
      return drawCompacto(pedido);
    };

    const renderGrupo = (grupo) => {
      ensureSpace(14);
      if (isMobile) {
        // Separador de grupo: fundo escuro estilo sidebar
        y += 3;
        doc.setFillColor(...SLATE900);
        doc.rect(M, y, CW, 0.25, 'F');
        y += 2;
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(6);
        doc.setTextColor(...SLATE900);
        doc.text(safe(grupo.label || '-'), M, y + 5);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.5);
        doc.setTextColor(...SLATE500);
        doc.text(`${(grupo.pedidos || []).length} pedido(s)`, M + CW, y + 5, { align: 'right' });
        y += 10;
      } else {
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(8.5);
        doc.setTextColor(...C.muted);
        doc.text(safe(grupo.label || '-'), M, y);
        y += 4;
      }
      (grupo.pedidos || []).forEach(renderPedido);
    };

    if (Array.isArray(grupos) && grupos.length > 0) {
      grupos.forEach(renderGrupo);
    } else {
      pedidos.forEach(renderPedido);
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