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

const moeda = (valor = 0) =>
  `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const percentual = (valor = 0) =>
  `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const dataFmt = (valor) => {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('pt-BR');
};

const custoCalculadoProduto = (produto = {}) =>
  (Number(produto.valor_compra) || 0)
  + (Number(produto.custo_frete_padrao) || 0)
  + (Number(produto.custo_imposto1_padrao) || 0)
  + (Number(produto.custo_imposto2_padrao) || 0)
  + (Number(produto.custo_outros_padrao) || 0)
  - (Number(produto.desconto_compra_padrao) || 0);

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 5) => {
  const lines = doc.splitTextToSize(safe(text || '-'), maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
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

    // Carregar produtos para lookup de custo/venda
    const produtoIds = [...new Set(
      pedidos.flatMap((p) => (p.itens || []).map((i) => i.produto_id).filter(Boolean))
    )];
    const produtos = produtoIds.length ? await base44.asServiceRole.entities.Produto.list() : [];
    const produtosMap = Object.fromEntries((produtos || []).map((p) => [p.id, p]));

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
        if (isMobile) {
          // repete faixa lateral teal em novas páginas
          doc.setFillColor(...C.teal);
          doc.rect(0, 0, 2, pageH, 'F');
        }
        y = 14;
      }
    };

    // ════════════════════════════════════════════════════════════════════════
    //  HEADER
    // ════════════════════════════════════════════════════════════════════════
    const drawHeader = () => {
      if (isMobile) {
        // Faixa lateral teal em toda a altura da primeira página
        doc.setFillColor(...C.teal);
        doc.rect(0, 0, 2, pageH, 'F');

        // Cabeçalho escuro
        doc.setFillColor(...C.dark);
        doc.rect(2, 0, pageW - 2, 30, 'F');

        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(11);
        doc.setTextColor(...C.white);
        doc.text('Pedidos de Compra', M + 2, 12);

        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.5);
        doc.setTextColor(...C.mutedLight);
        const filtroLine = doc.splitTextToSize(safe(filtros_desc), CW - 4)[0];
        doc.text(filtroLine, M + 2, 18.5);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M + 2, 23.5);

        // Linha separadora teal
        doc.setFillColor(...C.teal);
        doc.rect(2, 28.5, pageW - 2, 1.5, 'F');

        y = 36;
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
      const titulo = version === 'expandida' ? 'Relatorio expandido de compras' : 'Relatorio compacto de compras';
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
        { label: 'Pedidos',         value: String(kpis.totalPedidos || pedidos.length || 0) },
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
      doc.text(safe(pedido.numero || 'Sem numero'), M + 5, y + 7);
      doc.setFontSize(9.5);
      doc.text(safe(pedido.fornecedor_nome || 'Sem fornecedor'), M + 40, y + 7);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      doc.text(`Emissao: ${dataFmt(pedido.data_emissao || pedido.created_date)}`, M + 5, y + 13);
      doc.text(`Entrega: ${dataFmt(pedido.data_prevista_entrega)}`, M + 58, y + 13);
      doc.text(`Status: ${pedido.status || '-'}`, M + 105, y + 13);
      doc.text(`Total: ${moeda(pedido.valor_total)}`, M + 155, y + 13);
      y += 26;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: header expandido do pedido
    // ════════════════════════════════════════════════════════════════════════
    const drawPedidoHeaderExpandido = (pedido) => {
      ensureSpace(34);
      const sc = getStatusColors(pedido.status);
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 28, 4, 4, 'F');
      doc.setFillColor(...sc.dot);
      doc.circle(M + 5, y + 6.5, 1.3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.text);
      doc.text(safe(pedido.numero || 'Sem numero'), M + 9, y + 8);
      doc.setFontSize(9.5);
      doc.text(safe(pedido.fornecedor_nome || 'Sem fornecedor'), M + 9, y + 14);
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + 9, y + 17, 33, 6.2, 3, 3, 'F');
      doc.setFontSize(7.1);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(pedido.status || '-'), M + 12, y + 21.2);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Emissao ${dataFmt(pedido.data_emissao || pedido.created_date)}`, M + 48, y + 20);
      doc.text(`Entrega ${dataFmt(pedido.data_prevista_entrega)}`, M + 92, y + 20);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      doc.text(moeda(pedido.valor_total), M + CW - 4, y + 10, { align: 'right' });
      const totalLinhas = (pedido.itens || []).length;
      const totalQtd = (pedido.itens || []).reduce((a, i) => a + (Number(i.quantidade) || 0), 0);
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
      drawPedidoHeaderCompacto(pedido);
      const embarque = (pedido.embarques_registrados || [])[0] || null;
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`Transportadora: ${safe(embarque?.transportadora_nome || 'Sem transportador')}`, M + 2, y);
      doc.text(`ETA: ${safe(embarque?.eta ? dataFmt(embarque.eta) : 'Sem ETA')}`, M + 78, y);
      doc.text(`Itens: ${(pedido.itens || []).length}`, M + 134, y);
      y += 5;
      y = addWrappedText(doc, pedido.observacoes || pedido.historico || '-', M + 2, y, CW - 4, 4) + 4;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  DESKTOP: layout expandido
    // ════════════════════════════════════════════════════════════════════════
    const drawExpandido = (pedido) => {
      drawPedidoHeaderExpandido(pedido);
      const itens = pedido.itens || [];
      let totCusto = 0, totVenda = 0;

      ensureSpace(12);
      doc.setFillColor(...C.soft);
      doc.roundedRect(TM, y, TW, 8, 2, 2, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(5.8);
      doc.setTextColor(...C.muted);
      ['DESCRICAO','LIQ.','FRETE','OUTROS','CUSTO','VLR UN.','TOTAL','VENDA','MARKUP'].forEach((h, i) => {
        doc.text(h, TM + [2,54,69,84,101,118,136,154,171][i], y + 5);
      });
      y += 10;

      itens.forEach((item, idx) => {
        const prod = produtosMap[item.produto_id] || {};
        const qtd = Number(item.quantidade) || 0;
        const liq = Number(item.custo_unitario) || Number(prod.valor_compra) || 0;
        const frete = Number(prod.custo_frete_padrao) || 0;
        const outros = (Number(prod.custo_imposto1_padrao) || 0) + (Number(prod.custo_imposto2_padrao) || 0) + (Number(prod.custo_outros_padrao) || 0);
        const custo = Number(prod.preco_custo_calculado) || custoCalculadoProduto(prod);
        const venda = Number(prod.preco_venda_padrao) || 0;
        const totalLiq = qtd * liq;
        const totalCusto = qtd * custo;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
        totCusto += totalCusto;
        totVenda += qtd * venda;

        ensureSpace(8);
        if (idx % 2 === 0) {
          doc.setFillColor(...C.rowAlt);
          doc.roundedRect(TM, y - 1, TW, 7, 1.5, 1.5, 'F');
        }
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.6);
        doc.setTextColor(...C.text);
        const nome = doc.splitTextToSize(safe(item.produto_nome || prod.nome || '-'), 50)[0];
        doc.text(nome, TM + 2, y + 3.5);
        doc.text(moeda(liq),       TM + 54,  y + 3.5);
        doc.text(moeda(frete),     TM + 69,  y + 3.5);
        doc.text(moeda(outros),    TM + 84,  y + 3.5);
        doc.text(moeda(custo),     TM + 101, y + 3.5);
        doc.text(moeda(liq),       TM + 118, y + 3.5);
        doc.text(moeda(totalLiq),  TM + 136, y + 3.5);
        doc.text(moeda(venda),     TM + 154, y + 3.5);
        doc.text(percentual(mk),   TM + 171, y + 3.5);
        y += 8;
      });

      ensureSpace(16);
      const sc = getStatusColors(pedido.status);
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M, y, CW, 14, 3, 3, 'F');
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(8);
      doc.setTextColor(...sc.pillText);
      doc.text(`Compra total: ${moeda(totCusto)}`,   M + 4,   y + 5.5);
      doc.text(`Venda total: ${moeda(totVenda)}`,    M + 72,  y + 5.5);
      doc.text(`Margem bruta: ${moeda(totVenda - totCusto)}`, M + 136, y + 5.5);
      y += 18;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  MOBILE: card com alma
    // ════════════════════════════════════════════════════════════════════════
    const drawMobileCard = (pedido) => {
      const itens = pedido.itens || [];
      let totCusto = 0, totVenda = 0;
      const sc = getStatusColors(pedido.status);

      ensureSpace(36);

      // ── Cabeçalho do card ──────────────────────────────────────────────
      // Fundo cinza suave
      doc.setFillColor(...C.soft);
      doc.roundedRect(M, y, CW, 24, 3, 3, 'F');

      // Barra colorida de status (esquerda)
      doc.setFillColor(...sc.dot);
      doc.roundedRect(M, y, 2.5, 24, 1.5, 1.5, 'F');

      // Número do pedido — topo esquerda
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.text(safe(pedido.numero || '-'), M + 5, y + 5);

      // Status pill — topo direita
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + CW - 28, y + 1.5, 26, 5.5, 2.5, 2.5, 'F');
      doc.setFontSize(5);
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(pedido.status || '-'), M + CW - 15, y + 5.3, { align: 'center' });

      // Fornecedor — nome em destaque
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(8.5);
      doc.setTextColor(...C.dark);
      const fornLine = doc.splitTextToSize(safe(pedido.fornecedor_nome || 'Sem fornecedor'), CW - 10)[0];
      doc.text(fornLine, M + 5, y + 12);

      // Valor total — direita em destaque
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(8);
      doc.setTextColor(...C.tealDark);
      doc.text(moeda(pedido.valor_total), M + CW, y + 12, { align: 'right' });

      // Datas
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(5.2);
      doc.setTextColor(...C.muted);
      doc.text(`Emissao: ${dataFmt(pedido.data_emissao || pedido.created_date)}`, M + 5, y + 17.5);
      doc.text(`Entrega: ${dataFmt(pedido.data_prevista_entrega)}`, M + 5, y + 21.5);
      doc.text(`${itens.length} item(ns)`, M + CW, y + 21.5, { align: 'right' });

      y += 27;

      // ── Itens do pedido ────────────────────────────────────────────────
      itens.forEach((item, idx) => {
        const prod = produtosMap[item.produto_id] || {};
        const qtd = Number(item.quantidade) || 0;
        const custo = Number(prod.preco_custo_calculado) || custoCalculadoProduto(prod);
        const venda = Number(prod.preco_venda_padrao) || 0;
        const tCusto = qtd * custo;
        const tVenda = qtd * venda;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
        totCusto += tCusto;
        totVenda += tVenda;

        ensureSpace(16);

        // fundo alternado
        if (idx % 2 === 0) {
          doc.setFillColor(...C.rowAlt);
          doc.roundedRect(M, y, CW, 14, 2, 2, 'F');
        }

        // Nome
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(6);
        doc.setTextColor(...C.text);
        const nomeProd = doc.splitTextToSize(safe(item.produto_nome || prod.nome || '-'), CW - 25)[0];
        doc.text(nomeProd, M + 2, y + 4.5);

        // Venda total — direita alinhada verticalmente ao centro
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(6.5);
        doc.setTextColor(...C.tealDark);
        doc.text(moeda(tVenda), M + CW, y + 4.5, { align: 'right' });

        // Detalhe: qtd · custo · markup
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5);
        doc.setTextColor(...C.muted);
        doc.text(`${qtd.toLocaleString('pt-BR')} un  |  custo ${moeda(custo)}  |  mk ${percentual(mk)}`, M + 2, y + 9.5);

        // Custo total linha
        doc.setFontSize(4.8);
        doc.text(`custo total ${moeda(tCusto)}`, M + 2, y + 13.5);

        y += 16;
      });

      // ── Rodapé do card: totais ─────────────────────────────────────────
      ensureSpace(20);
      doc.setFillColor(...C.dark);
      doc.roundedRect(M, y, CW, 17, 2.5, 2.5, 'F');

      // Labels
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
      doc.setFontSize(5.2);
      doc.setTextColor(...C.mutedLight);
      doc.text('Custo total', M + 3, y + 5);
      doc.text('Venda total', M + 3, y + 9.5);
      doc.text('Margem bruta', M + 3, y + 14);

      // Valores
      doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
      doc.setFontSize(6.5);
      doc.setTextColor(...C.white);
      doc.text(moeda(totCusto), M + CW, y + 5, { align: 'right' });
      doc.text(moeda(totVenda), M + CW, y + 9.5, { align: 'right' });

      const margem = totVenda - totCusto;
      doc.setTextColor(margem >= 0 ? 52 : 252, margem >= 0 ? 211 : 100, margem >= 0 ? 153 : 100);
      doc.text(moeda(margem), M + CW, y + 14, { align: 'right' });

      y += 22;
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
        // Separador de grupo estilo mobile
        doc.setFillColor(...C.teal);
        doc.rect(M, y, 2.5, 7, 'F');
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_BOLD);
        doc.setFontSize(7);
        doc.setTextColor(...C.dark);
        doc.text(safe(grupo.label || '-'), M + 6, y + 5);
        doc.setFont(PDF_FONT_FAMILY, PDF_FONT_NORMAL);
        doc.setFontSize(5.2);
        doc.setTextColor(...C.muted);
        doc.text(`${(grupo.pedidos || []).length} pedidos`, M + CW, y + 5, { align: 'right' });
        y += 11;
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