import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

/** Escala só no eixo Y (glifos mais altos, largura inalterada). PDF Tm: sx=1, sy>1. */
const PDF_GLYPH_STRETCH_Y = 1.1;

/**
 * Aplica alongamento vertical no texto do PDF via matriz interna do jsPDF (não aumenta fontSize).
 * Preserva options.angle se já for uma Matrix (ex.: rotação customizada).
 */
const patchPdfTextVerticalStretch = (doc) => {
  const PdfMatrix = jsPDF.API?.Matrix;
  if (!PdfMatrix) return;
  const origText = doc.text.bind(doc);
  doc.text = function (text, x, y, options, transform) {
    if (options != null && typeof options === 'object' && options.angle instanceof PdfMatrix) {
      return origText(text, x, y, options, transform);
    }
    const stretch = new PdfMatrix(1, 0, 0, PDF_GLYPH_STRETCH_Y, 0, 0);
    if (options != null && typeof options === 'object' && !Array.isArray(options)) {
      return origText(text, x, y, { ...options, angle: stretch }, transform);
    }
    return origText(text, x, y, { angle: stretch }, transform);
  };
};

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

/** Retorna true se NotoSans foi registrada; em falha de rede/CDN usa Helvetica e retorna false. */
const registerPdfFonts = async (doc): Promise<boolean> => {
  try {
    const [regularBase64, boldBase64] = await Promise.all([
      loadFontBase64(NOTO_REGULAR_URL, 'regular'),
      loadFontBase64(NOTO_BOLD_URL, 'bold'),
    ]);
    doc.addFileToVFS('NotoSans-Regular.ttf', regularBase64);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.addFileToVFS('NotoSans-Bold.ttf', boldBase64);
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
    doc.setFont('NotoSans', PDF_FONT_NORMAL);
    return true;
  } catch (err) {
    console.error('gerarRelatorioPedidosCompra: falha ao carregar Noto Sans, usando Helvetica:', err);
    doc.setFont('helvetica', PDF_FONT_NORMAL);
    return false;
  }
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

/** Segmentos preenchidos (1–5) alinhados ao fluxo da tela (getBorrowedStatus / status exibido). */
const STATUS_PROGRESS = {
  'Rascunho': 1,
  'Aguardando': 2,
  'Aguardando Liberacao': 2,
  'Aguardando Liberacao Financeira': 2,
  'Aguardando Aprovacao Financeira': 2,
  'Aguardando Pagamento': 2,
  'Aprovado': 3,
  'Pendencia': 3,
  'Despachado': 4,
  'Em Recepcao': 4,
  'Em Conferencia': 4,
  'Em Transito': 4,
  'Concluido': 5,
  'Devolvido': 2,
  'Cancelado': 0,
};
const normalizeStatusProgressKey = (status) =>
  String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const getStatusProgress = (status) => {
  const key = normalizeStatusProgressKey(status);
  return STATUS_PROGRESS[key] ?? 1;
};

/** Alinha quantidade e sigla ao contracto de embalagens / unidade comercial (espelho de @/lib/productUnits). */
const PDF_NN = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const PDF_NORM_CODE = (v) => String(v ?? '').trim().toUpperCase();
const PDF_IS_SHOW = (p) => p?.unidade_show_ativa !== false;
const PDF_NORM_ALTS = (p) =>
  (Array.isArray(p?.unidades_alternativas) ? p.unidades_alternativas : [])
    .filter((x) => x?.unidade && x?.ativo !== false)
    .map((x) => ({
      unidade: PDF_NORM_CODE(x.unidade),
      fator_conversao: PDF_NN(x.fator_conversao, 1),
      rotulo: typeof x.rotulo === 'string' ? x.rotulo.trim() : '',
      ativo: x.ativo !== false,
    }));
const PDF_RESOLVE_PRIMARY = (p, fallbackUnit = 'UN') => {
  const alts = PDF_NORM_ALTS(p);
  const f1 = alts.filter((a) => PDF_NN(a.fator_conversao, 0) === 1);
  const princAtual = PDF_NORM_CODE(p?.unidade_principal);
  if (f1.length === 1) return f1[0].unidade;
  if (f1.length > 1) {
    const m = f1.find((a) => a.unidade === princAtual);
    return m?.unidade || f1[0].unidade;
  }
  return princAtual || PDF_NORM_CODE(fallbackUnit) || 'UN';
};
const PDF_BUILD_PURCHASE_OPTS = (p) => {
  const up = PDF_RESOLVE_PRIMARY(p, 'UN');
  const custoBase = PDF_NN(p?.valor_compra, 0);
  const princ = { unidade: up, fator_conversao: 1, valor_unitario: custoBase, is_primary: true };
  const alts = PDF_NORM_ALTS(p).map((x) => ({
    unidade: x.unidade,
    fator_conversao: x.fator_conversao,
    valor_unitario: custoBase * x.fator_conversao,
    is_primary: false,
    rotulo: x.rotulo,
  }));
  const seen = new Set();
  const out = [princ, ...alts].filter((o) => {
    if (!o.unidade || seen.has(o.unidade)) return false;
    seen.add(o.unidade);
    return true;
  });
  return out;
};
const PDF_RESOLVE_COMMERCIAL = (p, fallbackUnit = 'UN') => {
  const opts = PDF_BUILD_PURCHASE_OPTS(p);
  if (!opts.length) return PDF_NORM_CODE(fallbackUnit) || 'UN';
  const rPrimary = PDF_RESOLVE_PRIMARY(p, opts[0]?.unidade || fallbackUnit);
  if (!PDF_IS_SHOW(p)) return rPrimary || PDF_NORM_CODE(fallbackUnit) || 'UN';
  const valids = new Set(opts.map((o) => o.unidade));
  const pris = [p?.unidade_apresentacao_default, p?.unidade_show_comercial, rPrimary, fallbackUnit];
  for (const pr of pris) {
    const c = PDF_NORM_CODE(pr);
    if (c && valids.has(c)) return c;
  }
  return opts[0]?.unidade || PDF_NORM_CODE(fallbackUnit) || 'UN';
};
const PDF_RESOLVE_COMMERCIAL_DISPLAY = (product, quantityBase, fallbackUnit = 'UN') => {
  if (!PDF_IS_SHOW(product)) {
    const u = PDF_RESOLVE_PRIMARY(product, fallbackUnit);
    return { unidade: u, fator_conversao: 1, quantidade: PDF_NN(quantityBase, 0) };
  }
  const u = PDF_RESOLVE_COMMERCIAL(product, fallbackUnit);
  const opts = PDF_BUILD_PURCHASE_OPTS(product);
  const option = opts.find((o) => o.unidade === u) || opts[0] || null;
  const f = PDF_NN(option?.fator_conversao, 1) || 1;
  const qb = PDF_NN(quantityBase, 0);
  const quantidade = f > 0 ? qb / f : qb;
  return { unidade: u, fator_conversao: f, quantidade };
};
const PDF_PDV_PREFERIDO = (produto, item) => {
  const op = PDF_BUILD_PURCHASE_OPTS(produto);
  const principal = PDF_NORM_CODE(produto?.unidade_principal) || 'UN';
  const raw = [produto?.unidade_apresentacao_default, item?.unidade_apresentacao_default, produto?.unidade_show_comercial, item?.unidade_show_comercial, item?.unidade_medida, 'UN']
    .map((v) => PDF_NORM_CODE(v))
    .filter(Boolean);
  const mapA = (raw) => (raw === 'CAIXA' || raw === 'CAIXAS' ? 'CX' : raw === 'M²' || raw === 'M2' || raw === 'METRO QUADRADO' ? 'M2' : raw);
  for (const c of raw) {
    const a = mapA(c);
    if (op.find((o) => o.unidade === a)) return a;
  }
  const naoP = op.find((o) => o.unidade !== principal);
  return naoP?.unidade || principal;
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
  return itens.reduce((a, i) => a + (Number(i.quantidade) || Number(i.quantidade_embarcada) || Number(i.quantidade_pedida) || 0), 0);
};
const getItensRelatorio = (pedido) => pedido._display_itens || pedido.itens || [];
/** Ordem alfabética estável por descrição do item (ou nome do produto em cache). */
const sortItensAlfabeticamente = (itens, produtosMap) =>
  [...itens].sort((a, b) => {
    const na = String(a?.produto_nome || produtosMap[a?.produto_id]?.nome || '').toLocaleLowerCase('pt-BR');
    const nb = String(b?.produto_nome || produtosMap[b?.produto_id]?.nome || '').toLocaleLowerCase('pt-BR');
    return na.localeCompare(nb, 'pt-BR', { sensitivity: 'base' });
  });
const getTransportadoraRelatorio = (pedido) => pedido._embarque?.transportadora_nome || 'Sem transportadora';
const getEtaRelatorio = (pedido) => pedido._embarque?.eta || null;
const getOrdinalRelatorio = (pedido) => pedido._display_ordinal || pedido._embarque?.numero || '#01';
const isNecessidadeRelatorio = (pedido) => !!pedido._is_necessidade || pedido._embarque?.tipo === 'Necessidade';
const getQuantidadeEfetivaItem = (item = {}) =>
  Number(item.quantidade) || Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || 0;

const getPercentualAjustePedido = (pedido = {}) => {
  const percentualDireto = Number(pedido.percentual_desconto);
  if (Number.isFinite(percentualDireto) && percentualDireto !== 0) return percentualDireto;

  const valorDesconto = Number(pedido.valor_desconto);
  const valorItens = Number(pedido.valor_itens);
  if (Number.isFinite(valorDesconto) && Number.isFinite(valorItens) && valorItens > 0) {
    return (valorDesconto / valorItens) * 100;
  }

  return 0;
};

const hasAjusteManualNoItem = (item = {}, baseUnit = 0) => {
  const descontoOuAcrescimo = Number(item.valor_desconto_item);
  if (Number.isFinite(descontoOuAcrescimo) && descontoOuAcrescimo !== 0) return true;

  const custoFinalUnitario = Number(item.custo_final_unitario);
  if (Number.isFinite(custoFinalUnitario) && Math.abs(custoFinalUnitario - baseUnit) > 0.01) return true;

  const qtd = getQuantidadeEfetivaItem(item);
  const totalItem = Number(item.total);
  if (Number.isFinite(totalItem) && qtd > 0) {
    const unitFromTotal = totalItem / qtd;
    if (Math.abs(unitFromTotal - baseUnit) > 0.01) return true;
  }

  return false;
};

const getValorUnitarioEfetivoItem = (item = {}, produto = {}, pedido = {}) => {
  const custoUnitario = Number(item.custo_unitario);
  const baseUnit = Number.isFinite(custoUnitario) ? custoUnitario : (Number(produto.valor_compra) || 0);
  const percentualAjustePedido = getPercentualAjustePedido(pedido);
  const multiplicadorPedido = 1 - (percentualAjustePedido / 100);
  const temAjusteManualItem = hasAjusteManualNoItem(item, baseUnit);

  const custoFinalUnitario = Number(item.custo_final_unitario);
  if (Number.isFinite(custoFinalUnitario) && custoFinalUnitario > 0) {
    return temAjusteManualItem ? custoFinalUnitario : (baseUnit * multiplicadorPedido);
  }

  // Regra principal: o cálculo final do item sempre prevalece.
  // Assim, qualquer desconto/acréscimo aplicado no formulário (inclusive via %) é refletido no relatório.
  const totalItem = Number(item.total ?? item.valor_total_item ?? item.valor_total);
  const qtd = getQuantidadeEfetivaItem(item);
  if (Number.isFinite(totalItem) && qtd > 0) {
    const unitFromTotal = totalItem / qtd;
    if (temAjusteManualItem) return unitFromTotal;
    // Lista/catálogo zerado mas linha com total: usar o derivado da linha (evita colunas zeradas no PDF)
    if (!Number.isFinite(baseUnit) || baseUnit <= 0) return unitFromTotal * multiplicadorPedido;
    return baseUnit * multiplicadorPedido;
  }

  const descontoOuAcrescimo = Number(item.valor_desconto_item);
  if (Number.isFinite(custoUnitario) && Number.isFinite(descontoOuAcrescimo)) {
    const unitComAjusteItem = custoUnitario - descontoOuAcrescimo;
    return temAjusteManualItem ? unitComAjusteItem : (unitComAjusteItem * multiplicadorPedido);
  }

  if (Number.isFinite(custoUnitario)) return custoUnitario * multiplicadorPedido;
  return (Number(produto.valor_compra) || 0) * multiplicadorPedido;
};

/** Converte custo unitário para a unidade comercial exibida (embalagem). */
const getValorUnitarioComercialItem = (item = {}, produto = {}, pedido = {}) => {
  const fatorComercial = Number(item.fator_conversao) || 1;
  const totalLinha = Number(
    item.total ?? item.valor_total_item ?? item.valor_total ?? 0,
  );
  const qtdComm =
    Number(item._qtdEfetiva) ||
    Number(item._qtdMostrada) ||
    Number(item.quantidade) ||
    Number(item.quantidade_embarcada) ||
    Number(item.quantidade_pedida) ||
    0;

  // Preço já na unidade comercial da linha (espelha o que a tela mostra)
  if (Number.isFinite(totalLinha) && totalLinha > 0 && qtdComm > 0) {
    return totalLinha / qtdComm;
  }

  const qtdBase = Number(item.quantidade_base);
  const totalItem = Number(item.total ?? item.valor_total_item ?? 0);
  if (Number.isFinite(totalItem) && totalItem > 0 && qtdBase > 0) {
    const unitBase = totalItem / qtdBase;
    return unitBase * fatorComercial;
  }
  const unitFallback = getValorUnitarioEfetivoItem(item, produto, pedido);
  return unitFallback * fatorComercial;
};

const getTotalItensAjustadoPedido = (pedido, produtosMap = {}) => {
  const itens = getItensRelatorio(pedido);
  return itens.reduce((acc, item) => {
    const produto = produtosMap[item.produto_id] || {};
    const qtd = getQuantidadeEfetivaItem(item);
    const valorUnitarioEfetivo = getValorUnitarioEfetivoItem(item, produto, pedido);
    return acc + (qtd * valorUnitarioEfetivo);
  }, 0);
};

const getValorRelatorio = (pedido, produtosMap = {}) => {
  const valorConhecidoPedido = Number(pedido._display_valor ?? pedido.valor_pendente_entrega ?? pedido.valor_total);
  if (Number.isFinite(valorConhecidoPedido) && valorConhecidoPedido > 0) return valorConhecidoPedido;

  const totalItensAjustado = getTotalItensAjustadoPedido(pedido, produtosMap);
  if (totalItensAjustado > 0) return totalItensAjustado;
  return 0;
};

const custoCalculadoProduto = (produto = {}) =>
  (Number(produto.valor_compra) || 0)
  + (Number(produto.custo_frete_padrao) || 0)
  + (Number(produto.custo_imposto1_padrao) || 0)
  + (Number(produto.custo_imposto2_padrao) || 0)
  + (Number(produto.custo_outros_padrao) || 0)
  - (Number(produto.desconto_compra_padrao) || 0);

/** Custos na linha do pedido costumam existir só em `pedido.itens`, não em `_display_itens`. */
const findLinhaPedidoOriginal = (pedido = {}, item = {}) => {
  const pid = item.produto_id;
  if (!pid) return {};
  const itens = pedido.itens || [];
  const linhas = itens.filter((i) => i.produto_id === pid);
  return linhas[0] || {};
};

const sumOutrosCamposItem = (o = {}) =>
  (Number(o.custo_outros) || 0) +
  (Number(o.custo_imposto1) || 0) +
  (Number(o.custo_imposto2) || 0);

/** Frete unitário na mesma base da tabela expandida (unidade comercial da linha). */
const resolveFreteUnitarioExpanded = (item = {}, prod = {}, pedido = {}, fatorComercial = 1) => {
  const linha = findLinhaPedidoOriginal(pedido, item);
  const merged = { ...linha, ...item };
  const qComm =
    Number(item._qtdEfetiva ?? item.quantidade ?? merged.quantidade) || 0;

  const direto = Number(
    merged.frete_unitario ?? merged.valor_frete_unitario ?? merged.valor_frete,
  );
  if (Number.isFinite(direto)) return direto;

  const ft = Number(merged.frete_total);
  if (Number.isFinite(ft) && qComm > 0) return ft / qComm;

  const qLinha = Number(linha.quantidade) || 0;
  const ftLinha = Number(linha.frete_total);
  if (Number.isFinite(ftLinha) && qLinha > 0) return ftLinha / qLinha;

  return (Number(prod.custo_frete_padrao) || 0) * fatorComercial;
};

const resolveOutrosUnitarioExpanded = (item = {}, prod = {}, pedido = {}, fatorComercial = 1) => {
  const linha = findLinhaPedidoOriginal(pedido, item);
  const merged = { ...linha, ...item };
  const qComm =
    Number(item._qtdEfetiva ?? item.quantidade ?? merged.quantidade) || 0;

  const temChavesImp = ['custo_outros', 'custo_imposto1', 'custo_imposto2'].some(
    (k) => merged[k] !== undefined && merged[k] !== null,
  );
  if (temChavesImp) return sumOutrosCamposItem(merged);

  const ot = Number(item.outros_total ?? linha.outros_total ?? merged.outros_total);
  if (Number.isFinite(ot) && qComm > 0) return ot / qComm;

  const qLinha = Number(linha.quantidade) || 0;
  const otLinha = Number(linha.outros_total);
  if (Number.isFinite(otLinha) && qLinha > 0) return otLinha / qLinha;

  return (
    ((Number(prod.custo_imposto1_padrao) || 0) +
      (Number(prod.custo_imposto2_padrao) || 0) +
      (Number(prod.custo_outros_padrao) || 0)) *
    fatorComercial
  );
};

const TEXT_VERTICAL_SCALE = 1.75;
const EXPANDED_ITEMS_TABLE_FONT_SIZE = 8.25; // ~11px visual size in the generated PDF
const EXPANDED_ITEMS_TABLE_HEADER_FONT_SIZE = 7;
const EXPANDED_ITEMS_TABLE_HEADER_HEIGHT = 12;
const EXPANDED_ITEMS_TABLE_ROW_HEIGHT = 8.85;
/** Espaço extra vertical dentro da linha de produto (multilinha descrição). */
const EXPANDED_ITEMS_ROW_DESC_PAD_MM = 1.15;
const EXPANDED_ITEMS_TABLE_TEXT_Y = 4.35;
/** Ancoras X (mm a partir de TM) para texto alinhado à direita; última coluna ≤ TW (evita extravasar a área da tabela). */
const EXPANDED_ITEMS_TABLE_COLUMNS = {
  qtd: 2,
  unidade: 13,
  descricao: 22,
  vlrUnit: 78,
  frete: 93,
  outros: 109,
  custo: 125,
  total: 141,
  venda: 157,
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
  'Aguardando':            { dot: [203,213,225], pillBg: [241,245,249], pillText: [71,85,105]   },
  'Aguardando Liberacao':  { dot: [203,213,225], pillBg: [241,245,249], pillText: [71,85,105]   },
  'Aguardando Liberacao Financeira': { dot: [203,213,225], pillBg: [241,245,249], pillText: [71,85,105] },
  'Aguardando Pagamento':  { dot: [203,213,225], pillBg: [241,245,249], pillText: [71,85,105]   },
  'Aprovado':              { dot: [52,211,153],  pillBg: [236,253,245], pillText: [4,120,87]    },
  'Despachado':            { dot: [34,211,238],  pillBg: [236,254,255], pillText: [14,116,144]  },
  'Em Recepcao':           { dot: [34,211,238],  pillBg: [236,254,255], pillText: [14,116,144]  },
  'Em Conferencia':        { dot: [34,211,238],  pillBg: [236,254,255], pillText: [14,116,144]  },
  'Em Transito':           { dot: [56,189,248],  pillBg: [240,249,255], pillText: [3,105,161]   },
  'Pendencia':             { dot: [251,146,60],  pillBg: [255,247,237], pillText: [194,65,12]   },
  'Devolvido':             { dot: [251,113,133], pillBg: [255,241,242], pillText: [190,24,93]   },
  'Concluido':             { dot: [16,185,129],  pillBg: [236,253,245], pillText: [4,120,87]    },
  'Cancelado':             { dot: [209,213,219], pillBg: [243,244,246], pillText: [156,163,175] },
};

const getStatusColors = (status) => {
  const key = normalizeStatusProgressKey(status);
  return STATUS_PDF_COLORS[key] || STATUS_PDF_COLORS['Rascunho'];
};

const normalizeReportVersion = (version) => {
  if (version === 'mobile_com_alma') return 'expandida_mobile';
  if (version === 'compacta') return 'expandida';
  if (version === 'expandida_mobile') return 'expandida_mobile';
  if (version === 'expandida') return 'expandida';
  return 'expandida';
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
    const normalizedVersion = normalizeReportVersion(version);

    const isMobile = normalizedVersion === 'expandida_mobile';

    // Carregar apenas produtos realmente usados no relatório
    const produtoIds = [...new Set(
      pedidos.flatMap((p) => (p._display_itens || p.itens || []).map((i) => i.produto_id).filter(Boolean))
    )];
    const produtos = produtoIds.length ? await Promise.all(produtoIds.map((id) => base44.asServiceRole.entities.Produto.get(id).catch(() => null))) : [];
    const produtosMap = Object.fromEntries((produtos || []).filter(Boolean).map((p) => [p.id, p]));

    // ── Criação do documento ─────────────────────────────────────────────────
    const MOBILE_W = 100; // mm — largura estilo smartphone
    // Mobile: página alta (uma coluna “infinita”) para rolar no leitor PDF com menos quebras abruptas
    const MOBILE_PAGE_H = 1200;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isMobile ? [MOBILE_W, MOBILE_PAGE_H] : 'a4',
    });
    const usarNoto = await registerPdfFonts(doc);
    const pdfFontFamily = usarNoto ? 'NotoSans' : 'helvetica';
    patchPdfTextVerticalStretch(doc);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = isMobile ? 5 : 9;           // margem página (reduz faixa lateral)
    const TM = isMobile ? 5 : 11;        // inset da tabela de itens (mais largura útil)
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
      const bottomPad = isMobile ? 4 : 10;
      if (y + needed > pageH - bottomPad) {
        doc.addPage();
        y = 14;
      }
    };

    const scaledHeight = (value) => value * TEXT_VERTICAL_SCALE;

    /** Barra de status (1–5 segmentos) — reutiliza desktop e mobile. */
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

    // ════════════════════════════════════════════════════════════════════════
    //  HEADER
    // ════════════════════════════════════════════════════════════════════════
    const drawHeader = () => {
      if (isMobile) {
        // Header mobile: hierarquia clara, filtros em até 3 linhas, tipografia legível no celular
        let hy = 12;
        doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
        doc.setFontSize(12);
        doc.setTextColor(...C.text);
        doc.text('Embarques', M, hy);
        hy += 5;

        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text('Relatório para celular', M, hy);
        hy += 4.2;

        const filtrosLinhas = doc.splitTextToSize(safe(filtros_desc || '-'), CW);
        const maxFiltroLinhas = Math.min(3, filtrosLinhas.length);
        for (let fi = 0; fi < maxFiltroLinhas; fi++) {
          doc.text(filtrosLinhas[fi], M, hy);
          hy += 3.9;
        }
        hy += 1;
        doc.setFontSize(6.2);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, M, hy);
        hy += 4.5;

        doc.setFillColor(...C.soft);
        doc.rect(M, hy, CW, 0.5, 'F');
        hy += 2.5;
        y = hy;
        return;
      }

      // Desktop header
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 26, 4, 4, 'F');
      doc.setFillColor(...C.teal);
      doc.roundedRect(M + 5, y + 5, 2.4, 10, 1.2, 1.2, 'F');
      doc.setTextColor(...C.text);
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(16);
      const titulo = normalizedVersion === 'expandida_mobile'
        ? 'Relatorio mobile de embarques'
        : 'Relatorio expandido de embarques';
      doc.text(safe(titulo), M + 11, y + 9);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
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
        { label: 'Pedidos na lista', value: String(kpis.totalPedidos || pedidos.length || 0) },
        { label: 'Total pendente',   value: moeda(kpis.totalGeral || 0) },
        { label: 'Em aberto',        value: moeda(kpis.totalEmAberto || 0) },
        { label: 'Pago / nao entregue', value: moeda(kpis.totalPagoNaoEntregue || 0) },
      ];

      if (isMobile) {
        const colW = (CW - 3) / 2;
        const cardH = 14.5;
        for (let i = 0; i < cards.length; i += 2) {
          ensureSpace(18);
          [0, 1].forEach((col) => {
            const card = cards[i + col];
            if (!card) return;
            const cx = M + col * (colW + 3);
            doc.setFillColor(...C.soft);
            doc.roundedRect(cx, y, colW, cardH, 2, 2, 'F');
            doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
            doc.setFontSize(6);
            doc.setTextColor(...C.muted);
            doc.text(safe(card.label), cx + 3, y + 5);
            doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
            doc.setFontSize(8.5);
            doc.setTextColor(...C.dark);
            doc.text(safe(String(card.value)), cx + 3, y + 11.5);
          });
          y += 16.5;
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
        doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
        doc.setFontSize(10);
        doc.setTextColor(...C.dark);
        doc.text(safe(String(card.value)), x + 4, y + 13);
        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      });
      y += 24;
    };

    // ════════════════════════════════════════════════════════════════════════
    //  GROUP SUMMARY (desktop only)
    // ════════════════════════════════════════════════════════════════════════
    const drawGroupSummary = () => {
      if (isMobile || !Array.isArray(grupos) || grupos.length === 0) return;
      ensureSpace(20);
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text('Agrupamento aplicado na tela', M, y);
      y += 5;
      grupos.forEach((grupo, idx) => {
        const total = (grupo.pedidos || []).reduce((a, p) => a + getValorRelatorio(p, produtosMap), 0);
        ensureSpace(8);
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(M, y - 1.5, CW, 6.5, 2, 2, 'F');
        }
        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
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
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.dark);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 5, y + 7);
      doc.setFontSize(9.5);
      doc.text(getFornecedorRelatorio(pedido), M + 40, y + 7);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data: ${dataFmt(getDataRelatorio(pedido))}`, M + 5, y + 13);
      doc.text(`ETA: ${dataFmt(getEtaRelatorio(pedido))}`, M + 58, y + 13);
      doc.text(`Status: ${normalizarStatusRelatorio(pedido._display_status || pedido.status)}`, M + 105, y + 13);
      doc.text(`Total: ${moeda(getValorRelatorio(pedido, produtosMap))}`, M + 155, y + 13);
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
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
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
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data ${dataFmt(getDataRelatorio(pedido))}`, M + 48, y + 20);
      doc.text(`ETA ${dataFmt(getEtaRelatorio(pedido))}`, M + 92, y + 20);
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      doc.text(moeda(getValorRelatorio(pedido, produtosMap)), M + CW - 4, y + 10, { align: 'right' });
      const totalLinhas = (pedido._display_itens || pedido.itens || []).length;
      const totalQtd = getQuantidadeRelatorio(pedido);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
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
        valor_total: getValorRelatorio(pedido, produtosMap)
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
      const stPedido = pedido._display_status || pedido.status;
      // Ordem alfabética + quantidade/sigla na unidade comercial (alinhado a embalagens / productUnits)
      const itens = sortItensAlfabeticamente(getItensRelatorio(pedido), produtosMap).map((item) => {
        const prod = produtosMap[item.produto_id] || {};
        const fatorItem = Number(item.fator_conversao) || 1;
        const qtdCompra = Number(item.quantidade) || Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || 0;
        const qBase = Number(item.quantidade_base) > 0 ? Number(item.quantidade_base) : qtdCompra * fatorItem;
        const pdvPref = PDF_PDV_PREFERIDO(prod, item);
        const snap = { ...prod, unidade_show_ativa: true, unidade_apresentacao_default: pdvPref };
        const res = PDF_RESOLVE_COMMERCIAL_DISPLAY(snap, qBase, item.unidade_medida || prod.unidade_principal || 'UN');
        return {
          ...item,
          quantidade: res.quantidade,
          quantidade_embarcada: res.quantidade,
          quantidade_pedida: res.quantidade,
          unidade_medida: res.unidade,
          fator_conversao: res.fator_conversao,
          quantidade_base: qBase,
          _qtdEfetiva: res.quantidade,
        };
      });

      // Cabeçalho + barra de progresso + 1ª linha da tabela na mesma página
      const minPedidoH =
        32 +
        4.5 +
        scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT + 2) +
        scaledHeight(EXPANDED_ITEMS_TABLE_ROW_HEIGHT + 2) +
        14;
      if (y + minPedidoH > pageH - 12) {
        doc.addPage();
        y = 14;
      }

      const sc = getStatusColors(normalizarStatusRelatorio(stPedido));
      doc.setFillColor(...C.panel);
      doc.roundedRect(M, y, CW, 28, 4, 4, 'F');
      doc.setFillColor(...sc.dot);
      doc.circle(M + 5, y + 6.5, 1.3, 'F');
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(11);
      doc.setTextColor(...C.text);
      doc.text(getPedidoNumeroRelatorio(pedido), M + 9, y + 8);
      doc.setFontSize(9.5);
      doc.text(getFornecedorRelatorio(pedido), M + 9, y + 14);
      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + 9, y + 17, 33, 6.2, 3, 3, 'F');
      doc.setFontSize(7.1);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(normalizarStatusRelatorio(stPedido)), M + 12, y + 21.2);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Data ${dataFmt(getDataRelatorio(pedido))}`, M + 48, y + 20);
      doc.text(`ETA ${dataFmt(getEtaRelatorio(pedido))}`, M + 92, y + 20);
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      // Total do pedido no relatório expandido: valor unitário x quantidade.
      // Custo permanece apenas como informação para análise de margem/markup.
      const valorExp = getValorRelatorio(pedido, produtosMap);
      doc.text(moeda(valorExp), M + CW - 4, y + 10, { align: 'right' });
      const totalQtdExp = itens.reduce((a, i) => a + i._qtdEfetiva, 0);
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`${itens.length} itens${isPendencia ? ' pend.' : ''} - ${totalQtdExp.toLocaleString('pt-BR')} (un. comerc.)`, M + CW - 4, y + 16, { align: 'right' });
      y += 32;

      drawProgressBar(stPedido, y);
      y += 4.5;

      let totCusto = 0, totVenda = 0;

      ensureSpace(scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT + 2));
      doc.setFillColor(...C.soft);
      doc.roundedRect(TM, y, TW, scaledHeight(EXPANDED_ITEMS_TABLE_HEADER_HEIGHT), 2, 2, 'F');
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(EXPANDED_ITEMS_TABLE_HEADER_FONT_SIZE);
      doc.setTextColor(...C.text);
      doc.text('QTD', TM + EXPANDED_ITEMS_TABLE_COLUMNS.qtd, y + scaledHeight(7));
      doc.text('UN', TM + EXPANDED_ITEMS_TABLE_COLUMNS.unidade, y + scaledHeight(7));
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
        const fatorComercial = Number(item.fator_conversao) || 1;
        const liq = getValorUnitarioComercialItem(item, prod, pedido);
        const frete = resolveFreteUnitarioExpanded(item, prod, pedido, fatorComercial);
        const outros = resolveOutrosUnitarioExpanded(item, prod, pedido, fatorComercial);
        // Regra do PDF expandido: custo unitário baseia-se no valor unitário + custos informados.
        const custo = liq + frete + outros;
        const venda = (Number(prod.preco_venda_padrao) || 0) * fatorComercial;
        const totalLiq = qtd * liq;
        const totalCusto = qtd * custo;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
        totCusto += totalCusto;
        totVenda += qtd * venda;

        // splitTextToSize deve usar o MESMO fontSize do desenho — senão a largura calculada fica errada e o texto invade VLR. UN.
        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
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
        const descLineStep = scaledHeight(3.85);
        const firstDescY = y + scaledHeight(4);
        const rowHeight = Math.max(
          EXPANDED_ITEMS_TABLE_ROW_HEIGHT,
          4.6 + nomeLinhas.length * 2.72 + EXPANDED_ITEMS_ROW_DESC_PAD_MM,
        );
        ensureSpace(scaledHeight(rowHeight));
        if (idx % 2 === 0) {
          doc.setFillColor(...C.rowAlt);
          doc.roundedRect(TM, y - 1.25, TW, scaledHeight(rowHeight - 0.9), 1.5, 1.5, 'F');
        }
        doc.setTextColor(...C.text);
        doc.text(String((Number(qtd) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })), TM + 2, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y));
        doc.text(safe(item.unidade_medida || prod.unidade_principal || 'UN'), TM + EXPANDED_ITEMS_TABLE_COLUMNS.unidade, y + scaledHeight(EXPANDED_ITEMS_TABLE_TEXT_Y));
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
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
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
    const ITEM_ML = M + 14.8; // texto do item (à direita da qtd + linha)
    const LINE_X = M + 12.5;  // linha vertical — quantidade à esquerda
    const QTD_COL_RIGHT = M + 11.5; // fim da coluna numérica (antes da linha)
    const SLATE900 = [15, 23, 42];
    const SLATE700 = [51, 65, 85];
    const SLATE500 = [100, 116, 139];
    const MOBILE_ITEMS_FONT_SCALE = 1.05;
    const MOBILE_ITEMS_VERTICAL_SCALE = 1.35;

    const NOME_X = ITEM_ML;
    const NOME_MAX_W = M + CW - NOME_X - 3;

    const fmtQtd = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /** Altura de um bloco de item (mesma fórmula do `forEach` de itens) — y0=0 dá a altura absoluta da linha. */
    const computeMobileItemRowBlockH = (pedido, item, y0 = 0) => {
      const prod = produtosMap[item.produto_id] || {};
      const qtd = item._qtdMostrada;
      const un = safe(item.unidade_medida || prod.unidade_principal || 'UN');
      const fatorComercial = Number(item.fator_conversao) || 1;
      const precoCompra = getValorUnitarioComercialItem(item, prod, pedido);
      const custoBase = Number(prod.preco_custo_calculado) || custoCalculadoProduto(prod);
      const custo = custoBase * fatorComercial;
      const tCompra = qtd * precoCompra;

      const vs = MOBILE_ITEMS_VERTICAL_SCALE;
      const nomeLineStep = 3.85 * vs;
      const auxDetailStep = 3.15 * vs;
      const gapNomeDetalhe = 3 * vs;
      const margemLinhaInferiorItem = 2.2 * vs;

      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(7 * MOBILE_ITEMS_FONT_SCALE);
      const nomeLinhas = doc.splitTextToSize(
        toTitleCase(safe(item.produto_nome || prod.nome || '-')),
        NOME_MAX_W
      );
      const nomeTop = y0 + 3.4 * vs;
      const lastNomeBaseline = nomeTop + Math.max(0, nomeLinhas.length - 1) * nomeLineStep;

      doc.setFontSize(5.65 * MOBILE_ITEMS_FONT_SCALE);
      const fatorItem = Number(item.fator_conversao) || 1;
      const qBase =
        item.quantidade_base != null && item.quantidade_base !== ''
          ? Number(item.quantidade_base)
          : (Number(qtd) || 0) * fatorItem;
      const upPrincipal = prod.unidade_principal || '';
      let equivSuf = '';
      if (
        upPrincipal &&
        (fatorItem !== 1 || String(un).toUpperCase() !== String(upPrincipal).toUpperCase())
      ) {
        equivSuf = ` · Equiv. ${fmtQtd(qBase)} ${upPrincipal} (base)`;
      }
      const auxValores1 = `Total ${moeda(tCompra)} · ${un} · Comp. ${moeda(precoCompra)} · Custo ${moeda(custo)}${equivSuf}`;
      const auxValoresLinhas = doc.splitTextToSize(auxValores1, NOME_MAX_W);
      const detAux1 = lastNomeBaseline + gapNomeDetalhe;
      const detAux2 = detAux1 + auxValoresLinhas.length * auxDetailStep;
      return detAux2 + auxDetailStep + margemLinhaInferiorItem - y0;
    };

    const drawMobileCard = (pedido) => {
      const isPendencia = (pedido.status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'Pendencia';
      const statusRelatorio = normalizarStatusRelatorio(pedido._display_status || pedido.status);
      const sc = getStatusColors(statusRelatorio);

      let itens = sortItensAlfabeticamente(getItensRelatorio(pedido), produtosMap).map((item) => {
        const prod = produtosMap[item.produto_id] || {};
        const fatorItem = Number(item.fator_conversao) || 1;
        const qtdCompra = Number(item.quantidade) || Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || 0;
        const qBase = Number(item.quantidade_base) > 0 ? Number(item.quantidade_base) : qtdCompra * fatorItem;
        const pdvPref = PDF_PDV_PREFERIDO(prod, item);
        const snap = { ...prod, unidade_show_ativa: true, unidade_apresentacao_default: pdvPref };
        const res = PDF_RESOLVE_COMMERCIAL_DISPLAY(snap, qBase, item.unidade_medida || prod.unidade_principal || 'UN');
        return {
          ...item,
          quantidade: res.quantidade,
          unidade_medida: res.unidade,
          fator_conversao: res.fator_conversao,
          quantidade_base: qBase,
          _qtdMostrada: res.quantidade,
        };
      });

      const valorHeader = isPendencia
        ? moeda(itens.reduce((a, i) => {
            const prod = produtosMap[i.produto_id] || {};
            const cu = getValorUnitarioComercialItem(i, prod, pedido);
            return a + (i._qtdMostrada * cu);
          }, 0))
        : moeda(getValorRelatorio(pedido, produtosMap));

      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(6.5);
      const codigoLinhas = doc.splitTextToSize(safe(getPedidoNumeroRelatorio(pedido)), CW - 34).slice(0, 2);
      const codigoLineStep = 3.8;
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(9);
      const fornLines = doc.splitTextToSize(getFornecedorRelatorio(pedido), CW - 6).slice(0, 3);
      const countLabel = isNecessidadeRelatorio(pedido)
        ? `${itens.length} item(ns) pendente(s)`
        : `${itens.length} item(ns)`;
      const metaTexto = `${dataFmt(getDataRelatorio(pedido))} · ETA ${dataFmt(getEtaRelatorio(pedido))} · ${getOrdinalRelatorio(pedido)} · ${countLabel}`;
      const metaLines = doc.splitTextToSize(metaTexto, CW - 6).slice(0, 2);

      const fornLineStep = 4;
      const fornBlock = fornLines.length * fornLineStep;
      const totalRowH = 5.5;
      const metaLineStep = 3.6;
      const metaBlock = metaLines.length * metaLineStep;
      const progH = 4;
      const cardPadBottom = 3;
      const codeY0 = 6.5;
      const codeBlockH = codigoLinhas.length * codigoLineStep;
      const gapCodeForn = 3;
      const cardHeight = codeY0 + codeBlockH + gapCodeForn + fornBlock + totalRowH + metaBlock + progH + cardPadBottom;

      // Mesma ideia do desktop (minPedidoH): cabeçalho do pedido + 1.ª linha de itens na mesma página
      const minPrimeiroItemH = itens.length > 0 ? computeMobileItemRowBlockH(pedido, itens[0], 0) : 0;
      ensureSpace(cardHeight + 3 + minPrimeiroItemH + 6);

      const cardTop = y;

      doc.setFillColor(...C.panel);
      doc.roundedRect(M, cardTop, CW, cardHeight, 2.5, 2.5, 'F');

      doc.setFillColor(...sc.dot);
      doc.circle(M + 4.5, cardTop + 6, 2, 'F');

      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE500);
      codigoLinhas.forEach((line, ci) => {
        doc.text(line, M + 10, cardTop + codeY0 + ci * codigoLineStep);
      });

      doc.setFillColor(...sc.pillBg);
      doc.roundedRect(M + CW - 30, cardTop + 2, 28, 7, 3.5, 3.5, 'F');
      doc.setFontSize(6);
      doc.setTextColor(...sc.pillText);
      doc.text(safe(statusRelatorio), M + CW - 16, cardTop + 6.8, { align: 'center' });

      let cy = cardTop + codeY0 + codeBlockH + gapCodeForn;
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.setTextColor(...SLATE900);
      fornLines.forEach((line, fl) => {
        doc.text(line, M + 3, cy + fl * fornLineStep);
      });
      cy += fornBlock + 1;

      // Total com rótulo explícito
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(6);
      doc.setTextColor(...SLATE500);
      doc.text('Total', M + 3, cy);
      doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
      doc.setFontSize(9);
      doc.setTextColor(...SLATE900);
      doc.text(valorHeader, M + CW - 3, cy, { align: 'right' });
      cy += totalRowH;

      // Metadados (até 2 linhas)
      doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
      doc.setFontSize(6);
      doc.setTextColor(...SLATE500);
      metaLines.forEach((line, ml) => {
        doc.text(line, M + 3, cy + ml * metaLineStep);
      });
      cy += metaBlock + 1;

      drawProgressBar(pedido._display_status || pedido.status, cy);
      y = cardTop + cardHeight + 3;

      // ── Itens ─────────────────────────────────────────────────────
      itens.forEach((item) => {
        const prod = produtosMap[item.produto_id] || {};
        const qtd = item._qtdMostrada;
        const un = safe(item.unidade_medida || prod.unidade_principal || 'UN');
        const fatorComercial = Number(item.fator_conversao) || 1;
        const precoCompra = getValorUnitarioComercialItem(item, prod, pedido);
        const custoBase = Number(prod.preco_custo_calculado) || custoCalculadoProduto(prod);
        const custo = custoBase * fatorComercial;
        const venda = (Number(prod.preco_venda_padrao) || 0) * fatorComercial;
        const tCompra = qtd * precoCompra;
        const tVenda = qtd * venda;
        const mk = custo > 0 ? ((venda - custo) / custo) * 100 : 0;

        const vs = MOBILE_ITEMS_VERTICAL_SCALE;
        const lineWidth = 2.5;
        const nomeLineStep = 3.85 * vs;
        const auxDetailStep = 3.15 * vs;
        const gapNomeDetalhe = 3 * vs;
        const margemLinhaInferiorItem = 2.2 * vs;

        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(7 * MOBILE_ITEMS_FONT_SCALE);
        const nomeLinhas = doc.splitTextToSize(
          toTitleCase(safe(item.produto_nome || prod.nome || '-')),
          NOME_MAX_W
        );
        const nomeTop = y + 3.4 * vs;
        const lastNomeBaseline = nomeTop + Math.max(0, nomeLinhas.length - 1) * nomeLineStep;

        doc.setFontSize(5.65 * MOBILE_ITEMS_FONT_SCALE);
        const fatorItem = Number(item.fator_conversao) || 1;
        const qBase =
          item.quantidade_base != null && item.quantidade_base !== ''
            ? Number(item.quantidade_base)
            : (Number(qtd) || 0) * fatorItem;
        const upPrincipal = prod.unidade_principal || '';
        let equivSuf = '';
        if (
          upPrincipal &&
          (fatorItem !== 1 || String(un).toUpperCase() !== String(upPrincipal).toUpperCase())
        ) {
          equivSuf = ` · Equiv. ${fmtQtd(qBase)} ${upPrincipal} (base)`;
        }
        const auxValores1 = `Total ${moeda(tCompra)} · ${un} · Comp. ${moeda(precoCompra)} · Custo ${moeda(custo)}${equivSuf}`;
        const auxValoresLinhas = doc.splitTextToSize(auxValores1, NOME_MAX_W);
        const auxValores2 = `Venda ${moeda(venda)} · Mk ${percentual(mk)}`;

        const detAux1 = lastNomeBaseline + gapNomeDetalhe;
        const detAux2 = detAux1 + auxValoresLinhas.length * auxDetailStep;
        const rowBlockH = detAux2 + auxDetailStep + margemLinhaInferiorItem - y;
        const branchY = y + 2.8 * vs;

        ensureSpace(rowBlockH + 6);

        doc.setFillColor(203, 213, 225);
        doc.rect(LINE_X, y, 0.12, rowBlockH, 'F');
        doc.rect(LINE_X, branchY, lineWidth, 0.12, 'F');

        doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
        doc.setFontSize(6.8 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE900);
        doc.text(fmtQtd(qtd), QTD_COL_RIGHT, nomeTop + 1.2, { align: 'right' });
        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(5.9 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE700);
        doc.text(un, QTD_COL_RIGHT, nomeTop + 4.6, { align: 'right' });

        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(7 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE700);
        nomeLinhas.forEach((line, li) => {
          doc.text(line, NOME_X, nomeTop + li * nomeLineStep);
        });

        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(5.65 * MOBILE_ITEMS_FONT_SCALE);
        doc.setTextColor(...SLATE500);
        auxValoresLinhas.forEach((line, ai) => {
          doc.text(line, NOME_X, detAux1 + ai * auxDetailStep);
        });
        doc.text(auxValores2, NOME_X, detAux2);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(ITEM_ML, y + rowBlockH, M + CW, y + rowBlockH);

        y += rowBlockH;
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
      return drawExpandido(pedido);
    };

    const renderGrupo = (grupo) => {
      ensureSpace(14);
      if (isMobile) {
        y += 2;
        const bandH = 9;
        ensureSpace(bandH + 4);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(M, y, CW, bandH, 2, 2, 'F');
        doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
        doc.setFontSize(6.5);
        doc.setTextColor(...SLATE900);
        doc.text(safe(grupo.label || '-'), M + 3, y + 5.5);
        doc.setFont(pdfFontFamily, PDF_FONT_NORMAL);
        doc.setFontSize(5.8);
        doc.setTextColor(...SLATE500);
        doc.text(`${(grupo.pedidos || []).length} pedido(s)`, M + CW - 3, y + 5.5, { align: 'right' });
        y += bandH + 3;
      } else {
        doc.setFont(pdfFontFamily, PDF_FONT_BOLD);
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
        'Content-Disposition': `attachment; filename="relatorio-pedidos-${normalizedVersion}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});