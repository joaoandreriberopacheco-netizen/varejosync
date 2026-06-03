import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, X, ChevronDown, ChevronRight, Type, TrendingUp, DollarSign, Percent, Package, BarChart3, SlidersHorizontal } from 'lucide-react';
import { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import {
  buildMarginTree,
  flattenMarginTree,
  buildExpandedForLevel,
  collectAllMarginLeaves,
  formatMarginGroupUnidadeLabel,
} from '@/lib/marginTree';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CalendarPopup from '@/components/relatorios/CalendarPopup';
import TagSearchPopup from '@/components/relatorios/TagSearchPopup';
import { resolveCommercialDisplay, resolveCustoTotalUnitBaseProduto, formatCommercialQuantity } from '@/lib/productUnits';
import { registerJsPdfNotoFonts, registerJsPdfDin1451Fonts, normalizePdfText } from '@/lib/jspdfNotoFont';


const PDF_COL_GAP_MM = 2;
const MOBILE_PDF_W_MM = 100;
const MOBILE_PDF_H_MM = 1200;

function buildMarginFiltrosDesc({ dateRange, searchTerm, selectedTags, treeLevel }) {
  const parts = [];
  if (dateRange?.from && dateRange?.to) {
    parts.push(
      `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
    );
  }
  if (searchTerm?.trim()) parts.push(`Busca: ${searchTerm.trim()}`);
  if (selectedTags?.length) parts.push(`Tags: ${selectedTags.join(', ')}`);
  if (treeLevel !== 99) parts.push(`Nível: ${treeLevel}`);
  return parts.length ? parts.join(' · ') : 'Sem filtros adicionais';
}

/** Paleta alinhada a `gerarRelatorioPedidosComprav2` (relatório expandido de embarques). */
const PDF_EMBARQUES_C = {
  text: [31, 41, 55],
  muted: [107, 114, 128],
  mutedLight: [156, 163, 175],
  panel: [248, 250, 252],
  soft: [243, 244, 246],
  rowAlt: [249, 250, 251],
  dark: [17, 24, 39],
  white: [255, 255, 255],
  teal: [45, 212, 191],
  tealDark: [15, 118, 110],
  kpiBg: [250, 250, 250],
  border: [229, 231, 235],
  profit: [15, 118, 110],
};

/** Larguras fixas (mm); descrição ocupa o restante de contentWidth menos os gaps. */
function buildPdfColumnLayout(contentWidth) {
  const colWidths = {
    quant: 11,
    un: 8,
    precoMedio: 16,
    receita: 16,
    custo: 16,
    lucro: 16,
    markup: 12,
  };
  const colKeys = ['quant', 'un', 'desc', 'precoMedio', 'receita', 'custo', 'lucro', 'markup'];
  const fixedSum = colKeys
    .filter((k) => k !== 'desc')
    .reduce((sum, k) => sum + colWidths[k], 0);
  colWidths.desc = Math.max(
    40,
    contentWidth - fixedSum - PDF_COL_GAP_MM * (colKeys.length - 1)
  );

  const colX = {};
  const colRight = {};
  let xAcc = 0;
  colKeys.forEach((key, idx) => {
    colX[key] = xAcc;
    colRight[key] = xAcc + colWidths[key];
    xAcc += colWidths[key] + (idx < colKeys.length - 1 ? PDF_COL_GAP_MM : 0);
  });

  return { colKeys, colWidths, colX, colRight };
}

function drawJustifiedPdfLine(pdf, line, x, y, maxWidth) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    pdf.text(trimmed, x, y);
    return;
  }
  const wordWidths = words.map((w) => pdf.getTextWidth(w));
  const textWidth = wordWidths.reduce((a, b) => a + b, 0);
  const extra = maxWidth - textWidth;
  if (extra <= 0.5) {
    pdf.text(trimmed, x, y);
    return;
  }
  const space = extra / (words.length - 1);
  let cursor = x;
  words.forEach((word, i) => {
    pdf.text(word, cursor, y);
    cursor += wordWidths[i] + (i < words.length - 1 ? space : 0);
  });
}

function wrapDescLinesPdf(pdf, text, maxWidth) {
  const raw = String(text || '?').trim();
  const lines = [];
  raw.split(/\n/).forEach((paragraph) => {
    const chunk = paragraph.trim();
    if (!chunk) return;
    lines.push(...pdf.splitTextToSize(chunk, maxWidth));
  });
  return lines.length ? lines : ['?'];
}

function formatQuant(val, unitCode) {
  return formatCommercialQuantity(val, unitCode);
}

/** Coluna UN: folhas usam sigla; grupos só quando todas as folhas coincidem, senão "MIX". */
function formatMarginTreeUnidade(row, { isGroup = false } = {}) {
  if (isGroup) return formatMarginGroupUnidadeLabel(row.unidade_exibicao);
  return row.unidade_exibicao || 'UN';
}

const formatMoneyDisplay = (val) =>
  `R$ ${(val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercentDisplay = (val) => `${(val ?? 0).toFixed(2)}%`;

function MargemMetricChip({ label, value, muted, profit }) {
  const valueClass = profit
    ? 'text-green-600 dark:text-green-400 font-semibold'
    : muted
      ? 'text-gray-500 dark:text-gray-400'
      : 'text-gray-900 dark:text-white font-medium';

  return (
    <div className="flex-shrink-0 min-w-[4.25rem] max-w-[5.75rem]">
      <p className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-500 leading-none truncate">
        {label}
      </p>
      <p
        className={`text-[11px] tabular-nums mt-0.5 truncate ${valueClass}`}
        style={{ lineHeight: `${1.25 * BODY_LINE_HEIGHT_MULT}` }}
      >
        {value}
      </p>
    </div>
  );
}

/** Mesmo padrão do catálogo: texto alinhado; seta expansiva fora da coluna do texto. */
const INDENT_GROUP = 14;
const INDENT_GROUP_BASE = 4;
const INDENT_PRODUTO = 8;
const INDENT_GROUP_MOBILE = 10;
const INDENT_GROUP_BASE_MOBILE = 4;
const INDENT_PRODUTO_MOBILE = 6;
const CHEVRON_SLOT_W = 14;
const CHEVRON_GAP = 6;
const CHEVRON_PULL = CHEVRON_SLOT_W + CHEVRON_GAP;
const CHEVRON_GAP_MOBILE = 4;
const CHEVRON_PULL_MOBILE = CHEVRON_SLOT_W + CHEVRON_GAP_MOBILE;

/** Início da coluna de texto (px) — grupos nível 1 alinhados aos solteiros. */
function marginDescTextStart(level, kind = 'produto') {
  const lv = level ?? 1;
  if (kind === 'produto' && lv > 1) {
    return INDENT_PRODUTO + INDENT_GROUP;
  }
  if (kind === 'group' && lv === 1) {
    return INDENT_PRODUTO;
  }
  if (kind === 'group') {
    return INDENT_GROUP_BASE + (lv - 1) * INDENT_GROUP;
  }
  return INDENT_PRODUTO;
}

function marginDescTextStartMobile(level, kind = 'produto') {
  const lv = level ?? 1;
  if (kind === 'produto' && lv > 1) {
    return INDENT_PRODUTO_MOBILE + INDENT_GROUP_MOBILE;
  }
  if (kind === 'group' && lv === 1) {
    return INDENT_PRODUTO_MOBILE;
  }
  if (kind === 'group') {
    return INDENT_GROUP_BASE_MOBILE + (lv - 1) * INDENT_GROUP_MOBILE;
  }
  return INDENT_PRODUTO_MOBILE;
}

function marginDescTextStartPdfMm(level, kind, pdfIndentProdutoMm, pdfIndentGroupMm, pdfIndentGroupBaseMm) {
  const lv = level ?? 1;
  if (kind === 'produto' && lv > 1) {
    return 1 + pdfIndentProdutoMm + pdfIndentGroupMm;
  }
  if (kind === 'group' && lv === 1) {
    return 1 + pdfIndentProdutoMm;
  }
  if (kind === 'group') {
    return 1 + pdfIndentGroupBaseMm + (lv - 1) * pdfIndentGroupMm;
  }
  return 1 + pdfIndentProdutoMm;
}

function MargemDescricaoTexto({
  textStart,
  showChevron = false,
  expanded = false,
  chevronPull = CHEVRON_PULL,
  children,
  className = '',
}) {
  return (
    <div className={`flex items-center min-w-0 ${className}`} style={{ paddingLeft: textStart }}>
      {showChevron ? (
        <span
          className="inline-flex items-center justify-center flex-shrink-0 text-gray-400"
          style={{ width: CHEVRON_SLOT_W, marginLeft: -chevronPull }}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Corpo: entrelinha +50% (~1,5) e padding +20% (~1,2) em relação ao layout compacto anterior. */
const BODY_LINE_HEIGHT_MULT = 1.5;
const BODY_PAD_MULT = 1.2;
const MARGIN_SEARCH_SEPARATOR = ';';

function MargemLinhaMobile({
  row,
  variant = 'produto',
  level = 1,
  isExpanded,
  isLeaf,
  onToggle,
  striped = false,
}) {
  const isSubtotal = variant === 'subtotal';
  const isGroup = variant === 'grupo';
  const titulo = isSubtotal ? row.nome || 'Subtotal' : isGroup ? row.label : row.nome;
  const textStart = marginDescTextStartMobile(level, isGroup ? 'group' : 'produto');
  const precoMedio =
    row.valor_unitario_medio ??
    (row.quantidade_vendida > 0 ? (row.total_recebido || 0) / row.quantidade_vendida : 0);
  const markup =
    row.markup_percentual ??
    (row.custo_total > 0 ? ((row.lucro_total || 0) / row.custo_total) * 100 : 0);
  const canExpand = isGroup && !isLeaf && typeof onToggle === 'function';

  const accentBorder = isSubtotal
    ? 'border-l-emerald-500'
    : isGroup
      ? 'border-l-slate-400 dark:border-l-slate-500'
      : level > 1
        ? 'border-l-gray-200 dark:border-l-gray-700'
        : 'border-l-transparent';

  const rowPadLeft = 24;
  const rowBase = `border-b border-gray-100 dark:border-gray-800 border-l-2 ${accentBorder} py-5 pr-6 min-w-0 max-w-full touch-pan-y`;

  if (isGroup || isSubtotal) {
    const bgClass = isSubtotal
      ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
      : 'bg-slate-50/80 dark:bg-slate-800/35';
    const inner = (
      <>
        <MargemDescricaoTexto
          textStart={textStart}
          showChevron={!isLeaf && !isSubtotal}
          expanded={isExpanded}
          chevronPull={CHEVRON_PULL_MOBILE}
          className="flex-1"
        >
          <span
            lang="pt-BR"
            className="block text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-100 truncate"
          >
            {titulo}
            {row.count != null ? (
              <span className="ml-1 inline-flex h-5 items-center rounded-full border border-gray-200 px-1.5 text-[10px] font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400 normal-case">
                ({row.count})
              </span>
            ) : null}
          </span>
          {isGroup && row.showMetrics !== false ? (
            <p
              className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums normal-case"
              style={{ lineHeight: `${1.25 * BODY_LINE_HEIGHT_MULT}` }}
            >
              <span className="text-gray-700 dark:text-gray-300">
                {formatQuant(row.quantidade_vendida, row.unidade_exibicao)}
              </span>
              {' \u00b7 '}
              {formatMarginTreeUnidade(row, { isGroup: true })}
            </p>
          ) : null}
        </MargemDescricaoTexto>
        {row.showMetrics !== false ? (
          <span className="flex-shrink-0 text-right pl-2">
            <span className="block text-[9px] uppercase text-gray-400 leading-none">Lucro</span>
            <span className="text-xs tabular-nums font-semibold text-green-600 dark:text-green-400">
              {formatMoneyDisplay(row.lucro_total)}
            </span>
          </span>
        ) : null}
      </>
    );

    if (canExpand) {
      return (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className={`w-full max-w-full flex items-center gap-2 text-left min-h-[44px] active:bg-gray-100/80 dark:active:bg-gray-800/50 ${rowBase} ${bgClass}`}
          style={{ paddingLeft: rowPadLeft }}
        >
          {inner}
        </button>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 min-h-[44px] min-w-0 max-w-full ${rowBase} ${bgClass}`}
        style={{ paddingLeft: rowPadLeft }}
      >
        {inner}
      </div>
    );
  }

  const unidade = row.unidade_exibicao || 'UN';

  return (
    <div
      className={`${rowBase} ${striped ? 'bg-gray-50/60 dark:bg-gray-800/25' : 'bg-white dark:bg-gray-900/30'}`}
      style={{ paddingLeft: rowPadLeft }}
    >
      <div style={{ paddingLeft: textStart }}>
        <p
          lang="pt-BR"
          className="text-xs font-normal uppercase text-gray-500 dark:text-gray-400 line-clamp-2 break-words"
          style={{ lineHeight: `${1.375 * BODY_LINE_HEIGHT_MULT}` }}
        >
          {titulo}
        </p>
      </div>
      <p
        className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums truncate"
        style={{ lineHeight: `${1.25 * BODY_LINE_HEIGHT_MULT}` }}
      >
        <span className="text-gray-700 dark:text-gray-300">{formatQuant(row.quantidade_vendida, unidade)}</span>
        {' \u00b7 '}
        {unidade}
        {' \u00b7 '}
        <span className="text-gray-600 dark:text-gray-400">{formatMoneyDisplay(precoMedio)}/un</span>
      </p>
      <div className="mt-2 min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [touch-action:pan-x] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]" onTouchStart={(e) => e.stopPropagation()}>
        <div className="inline-flex gap-3 py-0.5 pr-1">
          <MargemMetricChip label="Receita" value={formatMoneyDisplay(row.total_recebido)} />
          <MargemMetricChip label="Custo" value={formatMoneyDisplay(row.custo_total)} muted />
          <MargemMetricChip label="Lucro" value={formatMoneyDisplay(row.lucro_total)} profit />
          <MargemMetricChip label="Markup" value={formatPercentDisplay(markup)} profit />
        </div>
      </div>
    </div>
  );
}

export default function RelatorioMargemVendas() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [treeLevel, setTreeLevel] = useState(99);
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortField, setSortField] = useState('lucro_total');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all products to get CURRENT costs
      const prods = await base44.entities.Produto.list();
      setProducts(prods);

      const allSales = await base44.entities.PedidoVenda.filter({ tipo: 'PDV' });
      setSales(allSales);

    } catch (error) {
      console.error("Error loading report data", error);
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (!sales.length || !products.length) return [];

    const prodMap = products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const reportMap = {};

    sales.forEach(sale => {
       const saleDate = new Date(sale.created_date);
       if (dateRange?.from && saleDate < dateRange.from) return;
       if (dateRange?.to && saleDate > new Date(dateRange.to.getTime() + 86400000)) return;

       sale.itens?.forEach(item => {
         const prodId = item.produto_id;
         const product = prodMap[prodId];
         if (!product) return;

         // IMPORTANTE: Usar SEMPRE o custo ATUAL do produto (fator-1), nunca do momento da venda
         const custoCalculado = resolveCustoTotalUnitBaseProduto(product);

         if (!reportMap[prodId]) {
          const unidadeInicial = resolveCommercialDisplay(product, 0, item.unidade_medida || product?.unidade_principal || 'UN');
           reportMap[prodId] = {
             produto_id: prodId,
             codigo_interno: product.codigo_interno,
             nome: product.nome,
             categoria: product.categoria_nome,
             tags: product.tags,
             campo_hierarquico_1: product.campo_hierarquico_1,
             campo_hierarquico_2: product.campo_hierarquico_2,
             campo_hierarquico_3: product.campo_hierarquico_3,
             campo_hierarquico_4: product.campo_hierarquico_4,
            unidade_exibicao: unidadeInicial.unidade || 'UN',
             vendas_count: 0,
             quantidade_vendida: 0,
             quantidade_base_vendida: 0,
             total_recebido: 0,
             total_desconto_venda: 0,
             custo_unitario_cadastro: custoCalculado
           };
         }

         const entry = reportMap[prodId];
        const quantidadeBase = Number(item.quantidade_base ?? (item.quantidade * (item.fator_conversao || 1)) ?? item.quantidade ?? 0) || 0;
        const quantidadeResolvida = resolveCommercialDisplay(product, quantidadeBase, item.unidade_medida || product?.unidade_principal || 'UN');
         entry.vendas_count += 1;
        entry.quantidade_base_vendida += quantidadeBase;
        entry.quantidade_vendida += quantidadeResolvida.quantidade;
        entry.unidade_exibicao = quantidadeResolvida.unidade || entry.unidade_exibicao || 'UN';
         entry.total_recebido += item.total;
         // Registrar o desconto do pedido (para cada venda, não proporcional por item neste cálculo)
         entry.total_desconto_venda += (sale.valor_desconto || 0) / (sale.itens?.length || 1);
       });
     });

    let sorted = Object.values(reportMap).map(item => {
       const custo_total = item.custo_unitario_cadastro * item.quantidade_base_vendida;
       const receita_liquida = item.total_recebido - item.total_desconto_venda;
       const lucro_total = receita_liquida - custo_total;
       const valor_unitario_medio =
         item.quantidade_vendida > 0 ? item.total_recebido / item.quantidade_vendida : 0;
       const margem_percentual = receita_liquida > 0 ? (lucro_total / receita_liquida) * 100 : 0;
       const markup_percentual = custo_total > 0 ? (lucro_total / custo_total) * 100 : 0;
       const lucro_marginal = lucro_total / item.quantidade_vendida;

      return {
         ...item,
         custo_total,
         receita_liquida,
         lucro_total,
         valor_unitario_medio,
         margem_percentual,
         markup_percentual,
         lucro_marginal
       };
    });

    // Sort first
    sorted.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Mesmo padrão do catálogo: ";" separa termos que devem aparecer no produto.
    const searchTokens = String(searchTerm || '')
      .split(MARGIN_SEARCH_SEPARATOR)
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
    if (searchTokens.length > 0) {
      sorted = sorted.filter((item) => {
        const haystack = [
          item.nome,
          item.codigo_interno,
          item.categoria,
          item.campo_hierarquico_1,
          item.campo_hierarquico_2,
          item.campo_hierarquico_3,
          item.campo_hierarquico_4,
          ...(Array.isArray(item.tags) ? item.tags : []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return searchTokens.every((term) => haystack.some((value) => value.includes(term)));
      });
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      sorted = sorted.filter(item => {
        if (!item.tags || !Array.isArray(item.tags)) return false;
        return selectedTags.some(tag => item.tags.includes(tag));
      });
    }

    return sorted;
  }, [sales, products, dateRange, searchTerm, sortField, sortOrder, selectedTags]);

  const marginTree = useMemo(
    () => buildMarginTree(Array.isArray(processedData) ? processedData : []),
    [processedData]
  );

  useEffect(() => {
    if (!processedData?.length) {
      setExpandedKeys(new Set());
      return;
    }
    setExpandedKeys(
      treeLevel === 1 ? new Set() : buildExpandedForLevel(marginTree, treeLevel - 1)
    );
  }, [treeLevel, marginTree, processedData?.length]);

  const displayRows = useMemo(
    () => flattenMarginTree(marginTree, expandedKeys ?? new Set()),
    [marginTree, expandedKeys]
  );

  const exportRows = useMemo(
    () => (processedData.length ? collectAllMarginLeaves(marginTree) : []),
    [marginTree, processedData.length]
  );

  const handleToggleGroup = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const totals = useMemo(() => {
    if (!processedData.length) {
      return {
        quantidade_vendida: 0,
        total_recebido: 0,
        total_desconto_venda: 0,
        receita_liquida: 0,
        custo_total: 0,
        lucro_total: 0,
      };
    }
    const desconto = processedData.reduce((d, item) => d + (item.total_desconto_venda || 0), 0);
    return processedData.reduce(
      (acc, item) => ({
        quantidade_vendida: acc.quantidade_vendida + (item.quantidade_vendida || 0),
        total_recebido: acc.total_recebido + (item.total_recebido || 0),
        total_desconto_venda: desconto,
        receita_liquida: acc.receita_liquida + (item.receita_liquida || 0),
        custo_total: acc.custo_total + (item.custo_total || 0),
        lucro_total: acc.lucro_total + (item.lucro_total || 0),
      }),
      {
        quantidade_vendida: 0,
        total_recebido: 0,
        total_desconto_venda: desconto,
        receita_liquida: 0,
        custo_total: 0,
        lucro_total: 0,
      }
    );
  }, [processedData]);

  const totalMarkup = totals.custo_total > 0 ? (totals.lucro_total / totals.custo_total) * 100 : 0;

  const productCount = processedData.length;
  const activeFilterCount = [
    searchTerm.trim(),
    selectedTags.length > 0,
    treeLevel !== 99,
  ].filter(Boolean).length;

  const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val) => `${val.toFixed(2)}%`;

  const exportToCSV = () => {
    const flat = exportRows.length ? exportRows : processedData;
    const headers =
      'Produto;Categoria;Quant;Un;Preço Un Médio;Receita Total;Custo Total;Lucro;Markup %\n';
    const rows = flat
      .map(
        (row) =>
          `${row.nome};${row.categoria};${row.quantidade_vendida};${row.unidade_exibicao || 'UN'};${row.valor_unitario_medio.toFixed(2)};${row.total_recebido.toFixed(2)};${row.custo_total.toFixed(2)};${row.lucro_total.toFixed(2)};${row.markup_percentual.toFixed(2)}`
      )
      .join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_margem.csv");
    document.body.appendChild(link);
    link.click();
  };

  const exportToPDF = async (version = 'a4') => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um período antes de exportar');
      return;
    }

    if (!processedData.length) {
      toast.error('Não há dados para exportar no período selecionado');
      return;
    }

    const isMobilePdf = version === 'expandida_mobile';

    try {
    if (isMobilePdf) {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [MOBILE_PDF_W_MM, MOBILE_PDF_H_MM],
      });
      const pdfFontFamily = await registerJsPdfDin1451Fonts(pdf);
      const setPdfFont = (style = 'normal') => pdf.setFont(pdfFontFamily, style);
      const MOBILE_PDF_FONT_SCALE = 1.12;
      const MOBILE_ROW_GAP = 0.35;
      const MOBILE_HUD = {
        panel: [44, 62, 80],
        panelEdge: [30, 41, 59],
        accent: [220, 38, 38],
        white: [255, 255, 255],
        pillBg: [255, 255, 255],
        pillBorder: [203, 213, 225],
        grid: [226, 232, 240],
      };
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const M = 5;
      const CW = pageW - M * 2;
      const C = PDF_EMBARQUES_C;
      const flatRows = displayRows.length ? displayRows : [];
      const filtrosDesc = buildMarginFiltrosDesc({
        dateRange,
        searchTerm,
        selectedTags,
        treeLevel,
      });

      const formatNumPdf = (val) =>
        (val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatPctPdf = (val) => `${(val ?? 0).toFixed(1).replace('.', ',')}%`;
      const formatMoneyPdf = (val) => `R$ ${formatNumPdf(val)}`;

      const setColor = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      const setFill = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
      const setDraw = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

      let y = 12;
      let mobileTableHeaderOnPage = false;

      const MOBILE_VALUE_ROWS = [
        [
          { key: 'custoUnit', label: 'CUSTO UN' },
          { key: 'precoVenda', label: 'PREÇO VENDA' },
          { key: 'markup', label: 'MK %' },
        ],
        [
          { key: 'custoTotal', label: 'CUSTO TOTAL' },
          { key: 'vendaTotal', label: 'VENDA TOTAL' },
          { key: 'lucro', label: 'LUCRO' },
        ],
      ];

      const ensureSpace = (needed = 20, { repeatTableHeader = true } = {}) => {
        if (y + needed <= pageH - 6) return;
        pdf.addPage();
        y = M + 2;
        mobileTableHeaderOnPage = false;
        if (repeatTableHeader) drawMobileColumnHeaders();
      };

      const getRowMarkup = (row) => {
        if (row.markup_percentual != null && !Number.isNaN(row.markup_percentual)) {
          return row.markup_percentual;
        }
        const custo = row.custo_total ?? 0;
        return custo > 0 ? ((row.lucro_total || 0) / custo) * 100 : 0;
      };

      const getRowPrecoMedio = (row) => {
        if (row.valor_unitario_medio != null && !Number.isNaN(row.valor_unitario_medio)) {
          return row.valor_unitario_medio;
        }
        const qtd = row.quantidade_vendida || 0;
        return qtd > 0 ? (row.total_recebido || 0) / qtd : 0;
      };

      const getRowCustoUnitCalc = (row) => {
        const qtd = row.quantidade_vendida || 0;
        if (qtd > 0 && row.custo_total != null) {
          return (row.custo_total || 0) / qtd;
        }
        return row.custo_unitario_cadastro ?? 0;
      };

      const drawMobileHeader = () => {
        const panelH = 26;
        setFill(MOBILE_HUD.panel);
        pdf.roundedRect(M, y, CW, panelH, 2, 2, 'F');
        setFill(MOBILE_HUD.accent);
        pdf.roundedRect(M + 3, y + 4, 1.2, panelH - 8, 0.6, 0.6, 'F');

        setPdfFont('normal');
        pdf.setFontSize(12.5 * MOBILE_PDF_FONT_SCALE);
        setColor(MOBILE_HUD.white);
        pdf.text(normalizePdfText('MARGEM DE VENDAS'), M + 7, y + 9);

        pdf.setFontSize(6.4 * MOBILE_PDF_FONT_SCALE);
        setColor([186, 198, 214]);
        pdf.text(normalizePdfText('RELATÓRIO TÉCNICO · MOBILE'), M + 7, y + 14.5);

        const filtrosLinhas = pdf.splitTextToSize(normalizePdfText(filtrosDesc), CW - 10).slice(0, 2);
        let fy = y + 18.5;
        filtrosLinhas.forEach((line) => {
          pdf.text(line, M + 7, fy);
          fy += 3.6;
        });

        pdf.setFontSize(5.8 * MOBILE_PDF_FONT_SCALE);
        pdf.text(
          normalizePdfText(`GERADO ${format(new Date(), 'dd/MM/yyyy HH:mm')}`),
          M + CW - 3,
          y + panelH - 3,
          { align: 'right' }
        );

        setDraw(MOBILE_HUD.accent);
        pdf.setLineWidth(0.2);
        pdf.line(M + 3, y + panelH + 1.8, M + CW - 3, y + panelH + 1.8);
        y += panelH + 3.5;
      };

      const drawHudValuePill = (text, colRight, baselineY, colW, fontScale, { accent = false } = {}) => {
        const padX = 1.2;
        const pillH = 4.8;
        const pillW = Math.max(colW - 0.2, 8);
        const x = colRight - pillW;
        const yTop = baselineY - 3.45;
        setFill(accent ? [236, 253, 249] : MOBILE_HUD.pillBg);
        setDraw(accent ? C.profit : MOBILE_HUD.pillBorder);
        pdf.setLineWidth(0.14);
        pdf.roundedRect(x, yTop, pillW, pillH, 1, 1, 'FD');
        setPdfFont('normal');
        pdf.setFontSize(7.4 * fontScale);
        setColor(accent ? C.profit : SLATE900);
        pdf.text(text, colRight - padX, baselineY, { align: 'right' });
      };

      const drawMobileKpis = () => {
        const cards = [
          { label: 'RECEITA LÍQ.', value: formatMoneyPdf(totals.receita_liquida) },
          { label: 'CUSTO TOTAL', value: formatMoneyPdf(totals.custo_total) },
          { label: 'LUCRO', value: formatMoneyPdf(totals.lucro_total), accent: true },
          { label: 'MARKUP', value: formatPctPdf(totalMarkup), accent: true },
        ];
        const colW = (CW - 3) / 2;
        const cardH = 13;
        for (let i = 0; i < cards.length; i += 2) {
          ensureSpace(16);
          [0, 1].forEach((col) => {
            const card = cards[i + col];
            if (!card) return;
            const cx = M + col * (colW + 3);
            setFill([241, 245, 249]);
            pdf.roundedRect(cx, y, colW, cardH, 1.5, 1.5, 'F');
            setDraw(MOBILE_HUD.grid);
            pdf.setLineWidth(0.12);
            pdf.roundedRect(cx, y, colW, cardH, 1.5, 1.5, 'S');
            setPdfFont('normal');
            pdf.setFontSize(5.4 * MOBILE_PDF_FONT_SCALE);
            setColor(SLATE500);
            pdf.text(normalizePdfText(card.label), cx + 2.5, y + 4.5);
            const valW = colW - 5;
            setPdfFont('normal');
            pdf.setFontSize(7.6 * MOBILE_PDF_FONT_SCALE);
            const valText = card.value;
            const tw = pdf.getTextWidth(valText);
            const pillW = Math.min(valW, Math.max(tw + 2.8, 14));
            const pillX = cx + colW - pillW - 2.5;
            setFill(card.accent ? [236, 253, 249] : MOBILE_HUD.white);
            setDraw(card.accent ? C.profit : MOBILE_HUD.pillBorder);
            pdf.roundedRect(pillX, y + 6.2, pillW, 5.2, 1, 1, 'FD');
            setColor(card.accent ? C.profit : SLATE900);
            pdf.text(valText, cx + colW - 3.5, y + 10.2, { align: 'right' });
          });
          y += cardH + 2.5;
        }
        y += 2;
      };

      const SLATE900 = [15, 23, 42];
      const SLATE700 = [51, 65, 85];
      const SLATE500 = [100, 116, 139];
      const SLATE225 = [203, 213, 225];
      const SLATE200 = [226, 232, 240];

      const getMobileRowLayout = () => ({
        itemMl: M + 14.8,
        lineX: M + 12.5,
        qtdColRight: M + 11.5,
        nomeMaxW: M + CW - (M + 14.8) - 3,
        contentRight: M + CW,
        lineWidth: 2.5,
      });

      const buildMobileMarginValueColumns = (itemMl, contentRight, colCount) => {
        const gap = 0.8;
        const count = colCount;
        const colW = (contentRight - itemMl - gap * (count - 1)) / count;
        const colRight = Array.from({ length: count }, (_, idx) => itemMl + (idx + 1) * colW + idx * gap);
        return { colW, colRight, gap, count };
      };

      const drawMobileColumnHeaders = () => {
        if (mobileTableHeaderOnPage) return;
        const cfg = getMobileRowLayout();
        const row1 = buildMobileMarginValueColumns(cfg.itemMl, cfg.contentRight, 3);
        const row2 = buildMobileMarginValueColumns(cfg.itemMl, cfg.contentRight, 3);
        const headerH = 11;

        if (y + headerH + 2 > pageH - 6) {
          pdf.addPage();
          y = M + 2;
        }

        setFill(MOBILE_HUD.panelEdge);
        pdf.roundedRect(M, y, CW, headerH, 1.2, 1.2, 'F');
        setFill(MOBILE_HUD.accent);
        pdf.circle(M + 4, y + headerH / 2, 0.9, 'F');
        setFill(SLATE225);
        pdf.rect(cfg.lineX, y + 1, 0.12, headerH - 2, 'F');

        setPdfFont('normal');
        pdf.setFontSize(5.6 * MOBILE_PDF_FONT_SCALE);
        setColor([203, 213, 225]);
        pdf.text('QTD', cfg.qtdColRight, y + 4.8, { align: 'right' });
        pdf.text('UN', cfg.qtdColRight, y + 8.6, { align: 'right' });

        const headerRow1Y = y + 5.2;
        MOBILE_VALUE_ROWS[0].forEach(({ label }, idx) => {
          pdf.text(normalizePdfText(label), row1.colRight[idx], headerRow1Y, { align: 'right' });
        });
        const headerRow2Y = y + 9.2;
        MOBILE_VALUE_ROWS[1].forEach(({ label }, idx) => {
          pdf.text(normalizePdfText(label), row2.colRight[idx], headerRow2Y, { align: 'right' });
        });

        setDraw(MOBILE_HUD.accent);
        pdf.setLineWidth(0.18);
        pdf.line(M + 3, y + headerH + 0.6, M + CW - 3, y + headerH + 0.6);
        y += headerH + 0.8;
        mobileTableHeaderOnPage = true;
      };

      const drawMobileTabulatedValues = (dataRow, cfg, valoresY, fontScale) => {
        const row1 = buildMobileMarginValueColumns(cfg.itemMl, cfg.contentRight, 3);
        const row2 = buildMobileMarginValueColumns(cfg.itemMl, cfg.contentRight, 3);
        const values = {
          custoUnit: formatNumPdf(getRowCustoUnitCalc(dataRow)),
          precoVenda: formatNumPdf(getRowPrecoMedio(dataRow)),
          markup: formatPctPdf(getRowMarkup(dataRow)),
          custoTotal: formatNumPdf(dataRow.custo_total || 0),
          vendaTotal: formatNumPdf(dataRow.total_recebido || 0),
          lucro: formatNumPdf(dataRow.lucro_total || 0),
        };
        const row2Y = valoresY + 5.2;

        setPdfFont('normal');
        pdf.setFontSize(7.4 * fontScale);
        MOBILE_VALUE_ROWS[0].forEach(({ key }, idx) => {
          drawHudValuePill(values[key], row1.colRight[idx], valoresY, row1.colW, fontScale, {
            accent: key === 'markup',
          });
        });
        MOBILE_VALUE_ROWS[1].forEach(({ key }, idx) => {
          drawHudValuePill(values[key], row2.colRight[idx], row2Y, row2.colW, fontScale, {
            accent: key === 'lucro',
          });
        });
      };

      const measureMarginCompactRow = (dataRow, y0, { isGroup = false, groupLabel = null, showMetrics = true } = {}) => {
        const cfg = getMobileRowLayout();
        const vs = 1.05;
        const fontScale = MOBILE_PDF_FONT_SCALE;
        const nomeLineStep = 3.55 * vs;
        const margemLinhaInferiorItem = 0.55 * vs;
        const gapNomeValores = 1.85 * vs;
        const valoresLineH = 9.8 * vs;

        const unidade = isGroup
          ? formatMarginTreeUnidade(dataRow, { isGroup: true })
          : dataRow.unidade_exibicao || 'UN';
        const qtd = dataRow.quantidade_vendida || 0;

        const nomeText = isGroup
          ? normalizePdfText(
              `${String(groupLabel || dataRow.label || '').toUpperCase()}${dataRow.count != null ? ` (${dataRow.count})` : ''}`
            )
          : normalizePdfText(String(dataRow?.nome || '?'));

        setPdfFont('normal');
        pdf.setFontSize(7.8 * fontScale);
        const nomeLinhas = pdf.splitTextToSize(nomeText, cfg.nomeMaxW).slice(0, 3);
        const nomeTop = y0 + 2.6 * vs;
        const lastNomeBaseline = nomeTop + Math.max(0, nomeLinhas.length - 1) * nomeLineStep;

        if (isGroup && !showMetrics) {
          const rowBlockH = lastNomeBaseline + margemLinhaInferiorItem - y0 + 1.5;
          return { rowBlockH, cfg, vs, fontScale, nomeLinhas, nomeTop, nomeLineStep, isGroup, showMetrics, qtd, unidade };
        }

        const valoresY = lastNomeBaseline + gapNomeValores;
        const rowBlockH = valoresY + valoresLineH + margemLinhaInferiorItem - y0;

        return {
          rowBlockH,
          cfg,
          vs,
          fontScale,
          nomeLinhas,
          nomeTop,
          nomeLineStep,
          valoresY,
          qtd,
          unidade,
          isGroup,
          showMetrics,
        };
      };

      const drawMarginCompactRow = (dataRow, y0, opts = {}) => {
        const measured = measureMarginCompactRow(dataRow, y0, opts);
        const {
          rowBlockH,
          cfg,
          vs,
          fontScale,
          nomeLinhas,
          nomeTop,
          nomeLineStep,
          valoresY,
          qtd,
          unidade,
          isGroup,
          showMetrics,
        } = measured;

        if (isGroup && !showMetrics) {
          setFill(MOBILE_HUD.panelEdge);
          pdf.roundedRect(M, y0, CW, rowBlockH, 1.2, 1.2, 'F');
          setFill(MOBILE_HUD.accent);
          pdf.circle(M + 4, y0 + rowBlockH / 2, 0.8, 'F');
          setPdfFont('normal');
          pdf.setFontSize(7.2 * fontScale);
          setColor(MOBILE_HUD.white);
          nomeLinhas.forEach((line, li) => {
            pdf.text(line, M + 7, nomeTop + li * nomeLineStep);
          });
          setDraw(MOBILE_HUD.grid);
          pdf.setLineWidth(0.12);
          pdf.line(M + 3, y0 + rowBlockH, M + CW - 3, y0 + rowBlockH);
          return rowBlockH;
        }

        const branchY = y0 + 2.4 * vs;
        setFill(MOBILE_HUD.accent);
        pdf.circle(cfg.lineX, y0 + 2.2, 0.65, 'F');
        setFill(SLATE225);
        pdf.rect(cfg.lineX, y0, 0.12, rowBlockH, 'F');
        pdf.rect(cfg.lineX, branchY, cfg.lineWidth, 0.12, 'F');

        setPdfFont('normal');
        pdf.setFontSize(7.4 * fontScale);
        setColor(SLATE900);
        pdf.text(formatCommercialQuantity(qtd, unidade), cfg.qtdColRight, nomeTop + 1.1, {
          align: 'right',
        });
        pdf.setFontSize(6.2 * fontScale);
        setColor(SLATE500);
        pdf.text(normalizePdfText(unidade), cfg.qtdColRight, nomeTop + 4.3, { align: 'right' });

        pdf.setFontSize(7.8 * fontScale);
        setColor(SLATE700);
        nomeLinhas.forEach((line, li) => {
          pdf.text(line, cfg.itemMl, nomeTop + li * nomeLineStep);
        });

        drawMobileTabulatedValues(dataRow, cfg, valoresY, fontScale);

        setDraw(MOBILE_HUD.grid);
        pdf.setLineWidth(0.1);
        pdf.line(cfg.itemMl, y0 + rowBlockH, cfg.contentRight, y0 + rowBlockH);

        return rowBlockH;
      };

      const drawMobileGroupBand = (treeRow) => {
        const rowH = measureMarginCompactRow(treeRow, y, {
          isGroup: true,
          groupLabel: treeRow.label,
          showMetrics: treeRow.showMetrics !== false,
        }).rowBlockH;
        ensureSpace(rowH + 1);
        drawMarginCompactRow(treeRow, y, {
          isGroup: true,
          groupLabel: treeRow.label,
          showMetrics: treeRow.showMetrics !== false,
        });
        y += rowH + MOBILE_ROW_GAP;
      };

      const drawMobileProductRow = (dataRow) => {
        const rowH = measureMarginCompactRow(dataRow, y).rowBlockH;
        ensureSpace(rowH + 1);
        drawMarginCompactRow(dataRow, y);
        y += rowH + MOBILE_ROW_GAP;
      };

      drawMobileHeader();
      drawMobileKpis();
      drawMobileColumnHeaders();
      flatRows.forEach((treeRow) => {
        if (treeRow.type === 'group') {
          drawMobileGroupBand(treeRow);
        } else {
          drawMobileProductRow(treeRow.item);
        }
      });

      ensureSpace(10);
      setPdfFont('normal');
      pdf.setFontSize(6);
      setColor(C.muted);
      pdf.text(
        normalizePdfText(`${productCount} produto(s) no relatório`),
        M,
        y + 4
      );

      const fileDate = format(new Date(), 'yyyy-MM-dd');
      pdf.save(`relatorio_margem_mobile_${fileDate}.pdf`);
      return;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfFontFamily = await registerJsPdfNotoFonts(pdf);
    const setPdfFont = (style = 'normal') => pdf.setFont(pdfFontFamily, style);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const footerY = pageHeight - 10;
    const lineHeight = 2.9 * BODY_LINE_HEIGHT_MULT;
    const rowMinHeightProduct = 4.6 * BODY_LINE_HEIGHT_MULT;
    const rowMinHeightGroup = rowMinHeightProduct;
    const rowPadV = 1.2 * BODY_PAD_MULT;
    const textBaseline = 3.5 * BODY_PAD_MULT;
    const pdfIndentGroupMm = 3;
    const pdfIndentGroupBaseMm = 1.1;
    const pdfIndentProdutoMm = 1.6;
    const descPad = 2 * BODY_PAD_MULT;
    const rowGapGroup = 0;

    const C = PDF_EMBARQUES_C;

    const formatNumPdf = (val) =>
      (val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatPctPdf = (val) => `${(val ?? 0).toFixed(1).replace('.', ',')}%`;

    const flatRows = displayRows.length ? displayRows : [];

    const { colWidths, colX, colRight } = buildPdfColumnLayout(contentWidth);
    const tableOriginX = margin;
    const colXAbs = {};
    const colRightAbs = {};
    Object.keys(colX).forEach((key) => {
      colXAbs[key] = tableOriginX + colX[key];
      colRightAbs[key] = tableOriginX + colRight[key];
    });

    let pageNumber = 1;
    let yPos = margin;
    let zebraIndex = 0;

    const setColor = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setFill = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    const setDraw = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

    const drawFooter = () => {
      const itemCount = productCount;
      setPdfFont('normal');
      pdf.setFontSize(7);
      setColor(C.muted);
      pdf.text(
        normalizePdfText(
          `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} • ${itemCount} produto(s)`
        ),
        margin,
        footerY
      );
      pdf.text(normalizePdfText(`Página ${pageNumber}`), pageWidth - margin, footerY, {
        align: 'right',
      });
    };

    const drawReportHeader = () => {
      const headerH = 24;
      setFill(C.panel);
      pdf.roundedRect(margin, yPos, contentWidth, headerH, 4, 4, 'F');
      setFill(C.teal);
      pdf.roundedRect(margin + 5, yPos + 5.5, 2.4, 11, 1.2, 1.2, 'F');

      setPdfFont('normal');
      pdf.setFontSize(15);
      setColor(C.text);
      pdf.text(normalizePdfText('Relatório de Margem de Vendas'), margin + 11, yPos + 9.5);

      pdf.setFontSize(8.5);
      setColor(C.muted);
      pdf.text(
        normalizePdfText(
          `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
        ),
        margin + 11,
        yPos + 16
      );
      yPos += headerH + 4;
    };

    const drawSegmentAccent = () => {
      const segs = 4;
      const segGap = 1.2;
      const segW = (contentWidth - (segs - 1) * segGap) / segs;
      const barH = 1.5;
      for (let s = 0; s < segs; s++) {
        const sx = margin + s * (segW + segGap);
        setFill(s < 3 ? C.teal : [220, 225, 230]);
        pdf.roundedRect(sx, yPos, segW, barH, 0.75, 0.75, 'F');
      }
      yPos += barH + 4;
    };

    const drawSummaryKpis = () => {
      const kpis = [
        { label: 'Receita líquida', value: formatNumPdf(totals.receita_liquida), accent: false },
        { label: 'Custo total', value: formatNumPdf(totals.custo_total), accent: false },
        { label: 'Lucro', value: formatNumPdf(totals.lucro_total), accent: true },
        { label: 'Markup', value: formatPctPdf(totalMarkup), accent: true },
      ];
      const gap = 4;
      const boxW = (contentWidth - gap * (kpis.length - 1)) / kpis.length;
      const boxH = 20;

      kpis.forEach((kpi, i) => {
        const x = margin + i * (boxW + gap);
        setFill(C.kpiBg);
        pdf.roundedRect(x, yPos, boxW, boxH, 3, 3, 'F');

        setPdfFont('normal');
        pdf.setFontSize(7.5);
        setColor(C.muted);
        pdf.text(normalizePdfText(kpi.label), x + 5, yPos + 7);

        pdf.setFontSize(10);
        setColor(kpi.accent ? C.profit : C.dark);
        pdf.text(kpi.value, x + 5, yPos + 14.5);
      });

      yPos += boxH + 4;
      setPdfFont('normal');
      pdf.setFontSize(6.5);
      setColor(C.mutedLight);
      pdf.text(normalizePdfText('Valores monetários em reais (R$).'), margin, yPos);
      yPos += 6;
    };

    const drawTableHeader = () => {
      const headerH = 8;
      setFill(C.dark);
      pdf.roundedRect(margin, yPos, contentWidth, headerH, 2, 2, 'F');

      setPdfFont('normal');
      pdf.setFontSize(6.5);
      setColor(C.white);
      const headerY = yPos + 5.2;
      const quantCenter = (colXAbs.quant + colRightAbs.quant) / 2;
      const unCenter = (colXAbs.un + colRightAbs.un) / 2;

      pdf.text('QUANT', quantCenter, headerY, { align: 'center' });
      pdf.text('UN', unCenter, headerY, { align: 'center' });
      pdf.text(normalizePdfText('DESCRIÇÃO'), colXAbs.desc + 1, headerY);
      pdf.text(normalizePdfText('PREÇO UN'), colRightAbs.precoMedio - 1, headerY, { align: 'right' });
      pdf.text('RECEITA', colRightAbs.receita - 1, headerY, { align: 'right' });
      pdf.text('CUSTO', colRightAbs.custo - 1, headerY, { align: 'right' });
      pdf.text('LUCRO', colRightAbs.lucro - 1, headerY, { align: 'right' });
      pdf.text('MARKUP', colRightAbs.markup - 1, headerY, { align: 'right' });

      yPos += headerH + 1.2;
    };

    const ensureSpace = (neededHeight) => {
      if (yPos + neededHeight <= footerY - 4) return;
      drawFooter();
      pdf.addPage();
      pageNumber += 1;
      yPos = margin;
      drawTableHeader();
    };

    const getRowMarkup = (row) => {
      if (row.markup_percentual != null && !Number.isNaN(row.markup_percentual)) {
        return row.markup_percentual;
      }
      const custo = row.custo_total ?? 0;
      return custo > 0 ? ((row.lucro_total || 0) / custo) * 100 : 0;
    };

    const getRowPrecoMedio = (row) => {
      if (row.valor_unitario_medio != null && !Number.isNaN(row.valor_unitario_medio)) {
        return row.valor_unitario_medio;
      }
      const qtd = row.quantidade_vendida || 0;
      return qtd > 0 ? (row.total_recebido || 0) / qtd : 0;
    };

    const drawDescColumn = (lines, descX, descMaxW, textY) => {
      lines.forEach((line, idx) => {
        const lineY = textY + idx * lineHeight;
        if (idx < lines.length - 1) {
          drawJustifiedPdfLine(pdf, line, descX, lineY, descMaxW);
        } else {
          pdf.text(line, descX, lineY);
        }
      });
    };

    const drawMetricsRow = (dataRow, textY, { isGroup = false } = {}) => {
      const quantCenter = (colXAbs.quant + colRightAbs.quant) / 2;
      const unCenter = (colXAbs.un + colRightAbs.un) / 2;

      setPdfFont('normal');
      pdf.setFontSize(isGroup ? 7 : 7.5);
      setColor(C.text);
      pdf.text(
        formatCommercialQuantity(dataRow.quantidade_vendida || 0, dataRow.unidade_exibicao),
        quantCenter,
        textY,
        { align: 'center' },
      );
      const unLabel = isGroup
        ? formatMarginTreeUnidade(dataRow, { isGroup: true })
        : formatMarginTreeUnidade(dataRow, { isGroup: false });
      pdf.text(normalizePdfText(unLabel), unCenter, textY, { align: 'center' });

      pdf.text(formatNumPdf(getRowPrecoMedio(dataRow)), colRightAbs.precoMedio - 1, textY, {
        align: 'right',
      });
      pdf.text(formatNumPdf(dataRow.total_recebido || 0), colRightAbs.receita - 1, textY, {
        align: 'right',
      });
      setColor(C.muted);
      pdf.text(formatNumPdf(dataRow.custo_total || 0), colRightAbs.custo - 1, textY, {
        align: 'right',
      });

      setColor(C.profit);
      pdf.text(formatNumPdf(dataRow.lucro_total || 0), colRightAbs.lucro - 1, textY, {
        align: 'right',
      });
      setColor(C.text);
      pdf.text(formatPctPdf(getRowMarkup(dataRow)), colRightAbs.markup - 1, textY, {
        align: 'right',
      });
    };

    const drawTreeRow = (treeRow) => {
      const isGroup = treeRow.type === 'group';
      const showMetrics = !isGroup || treeRow.showMetrics !== false;
      const dataRow = isGroup ? treeRow : treeRow.item;
      const descIndent = marginDescTextStartPdfMm(
        treeRow.level,
        isGroup ? 'group' : 'produto',
        pdfIndentProdutoMm,
        pdfIndentGroupMm,
        pdfIndentGroupBaseMm
      );
      const descX = colXAbs.desc + descIndent;
      const descMaxW = Math.max(8, colWidths.desc - descPad - descIndent);
      const descText = isGroup
        ? normalizePdfText(`${String(treeRow.label || '').toUpperCase()} (${treeRow.count ?? 0})`)
        : normalizePdfText(dataRow?.nome || '?');
      const descLines = wrapDescLinesPdf(pdf, descText, descMaxW);
      const rowMinHeight = isGroup ? rowMinHeightGroup : rowMinHeightProduct;
      const rowHeight = Math.max(rowMinHeight, descLines.length * lineHeight + rowPadV);
      const rowGap = isGroup ? rowGapGroup : 0;

      ensureSpace(rowHeight + rowGap);

      const rowX = margin;
      const rowW = contentWidth;

      if (isGroup) {
        setFill(C.teal);
        pdf.roundedRect(
          margin - 3.2,
          yPos + 2.6 * BODY_PAD_MULT,
          1.2,
          Math.min(rowHeight - 4.8 * BODY_PAD_MULT, 6.5),
          0.6,
          0.6,
          'F'
        );
        setDraw(C.border);
        pdf.setLineWidth(0.15);
        pdf.line(rowX, yPos + rowHeight + 0.4, rowX + rowW, yPos + rowHeight + 0.4);
      } else {
        const isZebra = zebraIndex % 2 === 1;
        zebraIndex += 1;
        if (isZebra) {
          setFill(C.rowAlt);
          pdf.roundedRect(rowX, yPos, rowW, rowHeight, 1.5, 1.5, 'F');
        }
        setDraw(C.border);
        pdf.setLineWidth(0.1);
        pdf.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
      }

      const textY = yPos + textBaseline;
      setPdfFont('normal');
      pdf.setFontSize(7.5);
      setColor(C.text);
      drawDescColumn(descLines, descX, descMaxW, textY);
      if (showMetrics) {
        drawMetricsRow(dataRow, textY, { isGroup });
      }

      yPos += rowHeight + rowGap;
    };

    drawReportHeader();
    drawSegmentAccent();
    drawSummaryKpis();
    drawTableHeader();
    flatRows.forEach(drawTreeRow);
    drawFooter();

    pdf.save('relatorio_margem.pdf');
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório de margem', error);
      const devDetail = import.meta.env.DEV && error?.message ? ` (${error.message})` : '';
      toast.error(`Não foi possível gerar o PDF. Tente novamente.${devDetail}`);
    }
  };

  const allTags = React.useMemo(() => {
    const tags = new Set();
    products.forEach(p => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  const handleApplySearchFilter = useCallback(() => {
    setSearchTerm(searchDraft.trim());
  }, [searchDraft]);

  const handleClearFilters = () => {
    setSearchDraft('');
    setSearchTerm('');
    setSelectedTags([]);
    setTreeLevel(99);
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  };

  const periodLabel =
    dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
      : null;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-white dark:bg-gray-900 md:overflow-x-hidden">
      <div className="max-w-full mx-auto min-w-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-10">
          <div className="w-full min-w-0 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Link to="/Relatorios">
                  <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0">
                    <ArrowLeft className="w-4 md:w-5 h-4 md:h-5 text-gray-700 dark:text-gray-200" />
                  </button>
                </Link>
                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-glacial font-medium text-gray-800 dark:text-gray-100 truncate">Relatório de Margem</h1>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-normal text-gray-500 dark:text-gray-400 min-w-0">
                    <span className="truncate">{productCount} produto{productCount === 1 ? '' : 's'}</span>
                    <span className="truncate">{formatMoney(totals.receita_liquida)} receita</span>
                    <span className="truncate text-gray-400 dark:text-gray-500">{formatMoney(totals.custo_total)} custo</span>
                    <span className="truncate text-emerald-600 dark:text-emerald-400">{formatMoney(totals.lucro_total)} lucro</span>
                    <span className="truncate text-emerald-600 dark:text-emerald-400">{formatPercent(totalMarkup)} markup</span>
                    {periodLabel ? (
                      <span className="truncate text-gray-400 dark:text-gray-500">{periodLabel}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-200 flex items-center justify-center flex-shrink-0" title="Opções de impressão">
                    <Printer className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700 text-sm">
                  <DropdownMenuItem onClick={() => exportToPDF('a4')} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    PDF (A4)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportToPDF('expandida_mobile')}
                    className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    PDF mobile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex gap-2 min-w-0 items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  autoComplete="off"
                  type="text"
                  placeholder="Produto, código, categoria ou tag (use ; para combinar termos)..."
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleApplySearchFilter();
                  }}
                  className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 pr-3 text-gray-700 dark:text-gray-200 shadow-none focus:outline-none focus:ring-0 w-full min-w-0 rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={handleApplySearchFilter}
                className="h-10 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition text-xs font-semibold whitespace-nowrap flex-shrink-0"
                title="Aplicar busca"
              >
                Set Filter
              </button>
              <button
                type="button"
                className={`h-10 w-10 flex-shrink-0 rounded-xl relative flex items-center justify-center ${showFilterDrawer || activeFilterCount > 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
                onClick={() => setShowFilterDrawer((open) => !open)}
                title="Filtros"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="h-10 w-10 flex-shrink-0 rounded-xl text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center justify-center"
                  title="Limpar filtros"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {showFilterDrawer && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 pb-1">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl md:rounded-lg px-3 h-10 md:h-9 md:col-span-2 overflow-x-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Nível da TreeGrid</span>
                  <LevelControl level={treeLevel} onChange={setTreeLevel} />
                </div>
                <button
                  onClick={() => {
                    const today = new Date();
                    setDateRange({ from: today, to: today });
                  }}
                  className="px-3 h-10 md:h-9 rounded-xl md:rounded-lg text-sm md:text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setDateRange({ from: subDays(today, 30), to: today });
                  }}
                  className="px-3 h-10 md:h-9 rounded-xl md:rounded-lg text-sm md:text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  30 dias
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                  }}
                  className="px-3 h-10 md:h-9 rounded-xl md:rounded-lg text-sm md:text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Mês atual
                </button>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="px-3 h-10 md:h-9 rounded-xl md:rounded-lg text-sm md:text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  {dateRange.from ? `${format(dateRange.from, 'dd/MM')} - ${dateRange.to ? format(dateRange.to, 'dd/MM') : '...'}` : 'Selecionar período'}
                </button>
                {allTags.length > 0 && (
                  <div className="md:col-span-6">
                    <TagSearchPopup
                      variant="inline"
                      allTags={allTags}
                      selectedTags={selectedTags}
                      setSelectedTags={setSelectedTags}
                      onClose={() => {}}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendário acima do Drawer (portal no body; drawer usa z-[310]) */}
        {showCalendar &&
          createPortal(
            <>
              <button
                type="button"
                aria-label="Fechar calendário"
                className="fixed inset-0 z-[320] cursor-default bg-black/50"
                onClick={() => setShowCalendar(false)}
              />
              <div className="fixed inset-0 z-[330] flex items-end md:items-center justify-center pointer-events-none p-3 md:p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Selecionar período"
                  className="pointer-events-auto w-full max-w-[820px] rounded-[30px] bg-white dark:bg-gray-900 p-3 shadow-2xl"
                >
                  <CalendarPopup
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    onClose={() => setShowCalendar(false)}
                    isModal={true}
                  />
                </div>
              </div>
            </>,
            document.body
          )}

<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
           {/* Toolbar */}
           <div className="px-3 md:mx-4 mb-2 py-2 min-w-0 max-w-full">
             <div className="flex flex-wrap items-center gap-2 min-w-0 [&_button]:!min-h-9 [&_button]:!min-w-9 md:[&_button]:!min-h-6 md:[&_button]:!min-w-6">
            <div className="hidden md:contents">
            <LevelControl level={treeLevel} onChange={setTreeLevel} />
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />
            </div>
            {/* Critério selecionado - ícone apenas */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition" title="Critério de ordenação">
                    {sortField === 'nome' && <Type className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'lucro_total' && <DollarSign className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'total_recebido' && <TrendingUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'markup_percentual' && <Percent className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'valor_unitario_medio' && <DollarSign className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'quantidade_vendida' && <Package className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'custo_total' && <TrendingUp className="w-4 h-4 text-gray-700 dark:text-gray-300 rotate-180" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem onClick={() => { setSortField('nome'); setSortOrder('asc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <span>Descrição</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('quantidade_vendida'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Quant</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('valor_unitario_medio'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Preço un médio</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('total_recebido'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Receita</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('custo_total'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 rotate-180" />
                    <span>Custo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('lucro_total'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Lucro</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('markup_percentual'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    <span>Markup</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Seta para direção */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition"
              title="Alternar direção"
            >
              <ChevronDown className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition ${
                sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
             </div>
           </div>

           {/* Table - Desktop Table / Mobile Cards */}
        <div className="flex-1 min-h-0 p-3 md:px-4 md:pt-0 md:pb-4 min-w-0 max-w-full overflow-hidden" id="relatorio-table">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40">
              <Loader2 className="w-9 h-9 animate-spin text-gray-400 mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Carregando relatório...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aguarde enquanto calculamos as margens</p>
            </div>
          ) : processedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block h-full min-h-0 min-w-0 overflow-auto overscroll-contain rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col className="w-[72px]" />
                    <col className="w-[52px]" />
                    <col />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-30 bg-white dark:bg-gray-900 backdrop-blur-sm">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th
                        onClick={() => {
                          if (sortField === 'quantidade_vendida') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('quantidade_vendida');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        QUANT {sortField === 'quantidade_vendida' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        UN
                      </th>
                      <th
                        onClick={() => {
                          if (sortField === 'nome') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('nome');
                            setSortOrder('asc');
                          }
                        }}
                        className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        DESCRIÇÃO {sortField === 'nome' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => {
                          if (sortField === 'valor_unitario_medio') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('valor_unitario_medio');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        PREÇO UN {sortField === 'valor_unitario_medio' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (sortField === 'total_recebido') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('total_recebido');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        RECEITA {sortField === 'total_recebido' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (sortField === 'custo_total') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('custo_total');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        CUSTO {sortField === 'custo_total' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (sortField === 'lucro_total') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('lucro_total');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        LUCRO {sortField === 'lucro_total' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                       onClick={() => {
                         if (sortField === 'markup_percentual') {
                           setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                         } else {
                           setSortField('markup_percentual');
                           setSortOrder('desc');
                         }
                       }}
                       className="text-right py-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      >
                       MARKUP {sortField === 'markup_percentual' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((treeRow, rowIdx) => {
                      if (treeRow.type === 'group') {
                        const isExpanded = expandedKeys.has(treeRow.key);
                        const isLeaf = treeRow.isLeafGroup;
                        const showGroupMetrics = treeRow.showMetrics !== false;
                        return (
                          <tr
                            key={treeRow.key}
                            onClick={isLeaf ? undefined : () => handleToggleGroup(treeRow.key)}
                            className={`border-b border-gray-100 dark:border-gray-800 select-none ${
                              isLeaf ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'
                            }`}
                          >
                            <td
                              className="py-1.5 px-2 text-xs text-center tabular-nums font-semibold text-gray-900 dark:text-white"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatQuant(treeRow.quantidade_vendida, treeRow.unidade_exibicao) : ''}
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-center text-gray-600 dark:text-gray-400"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics
                                ? formatMarginTreeUnidade(treeRow, { isGroup: true })
                                : ''}
                            </td>
                            <td
                              lang="pt-BR"
                              className="py-1.5 px-2 text-xs font-semibold text-gray-700 dark:text-gray-100 uppercase tracking-wide min-w-0"
                              style={{ lineHeight: 1.2, minHeight: 46 }}
                            >
                              <MargemDescricaoTexto
                                textStart={marginDescTextStart(treeRow.level, 'group')}
                                showChevron={!isLeaf}
                                expanded={isExpanded}
                              >
                                <span className="flex items-center gap-1 min-w-0 truncate">
                                  <span className="truncate">{treeRow.label}</span>
                                  <span className="h-5 px-1.5 text-[10px] font-medium border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400 rounded-full flex items-center justify-center normal-case flex-shrink-0">
                                    {treeRow.count}
                                  </span>
                                </span>
                              </MargemDescricaoTexto>
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-900 dark:text-white"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.valor_unitario_medio) : ''}
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-900 dark:text-white"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.total_recebido) : ''}
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-600 dark:text-gray-400"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.custo_total) : ''}
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.lucro_total) : ''}
                            </td>
                            <td
                              className="py-1.5 px-2 text-xs text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                              style={{ lineHeight: 1.2 }}
                            >
                              {showGroupMetrics ? formatPercent(treeRow.markup_percentual) : ''}
                            </td>
                          </tr>
                        );
                      }

                      const row = treeRow.item;
                      const descIndent = marginDescTextStart(treeRow.level, 'produto');
                      return (
                        <tr
                          key={treeRow.key}
                            className={`border-b border-gray-50 dark:border-gray-800/50 transition-colors group ${
                            rowIdx % 2 === 1
                              ? 'bg-gray-50/30 dark:bg-gray-800/20'
                              : 'bg-white dark:bg-gray-900'
                          } hover:bg-gray-50/70 dark:hover:bg-gray-800/25`}
                        >
                          <td
                            className="py-1.5 px-2 text-xs text-center tabular-nums text-gray-900 dark:text-white font-semibold"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatQuant(row.quantidade_vendida, row.unidade_exibicao)}
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-center text-gray-600 dark:text-gray-400"
                            style={{ lineHeight: 1.2 }}
                          >
                            {row.unidade_exibicao || 'UN'}
                          </td>
                          <td
                            lang="pt-BR"
                            className="py-1.5 px-2 text-xs font-normal text-gray-500 dark:text-gray-400 uppercase min-w-0"
                            style={{ lineHeight: 1.2, minHeight: 46 }}
                          >
                            <div className="truncate" style={{ paddingLeft: descIndent }}>
                              {row.nome}
                            </div>
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-900 dark:text-white"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatMoney(row.valor_unitario_medio)}
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-900 dark:text-white"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatMoney(row.total_recebido)}
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-right tabular-nums text-gray-600 dark:text-gray-400"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatMoney(row.custo_total)}
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatMoney(row.lucro_total)}
                          </td>
                          <td
                            className="py-1.5 px-2 text-xs text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                            style={{ lineHeight: 1.2 }}
                          >
                            {formatPercent(row.markup_percentual)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                          </table>
              </div>

              {/* Mobile: mesmas colunas do PDF */}
              <div className="md:hidden h-full min-h-0 min-w-0 max-w-full overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 pb-[var(--p38-scroll-pad-below-nav)]">
                {displayRows.map((treeRow, rowIdx) =>
                  treeRow.type === 'group' ? (
                    <MargemLinhaMobile
                      key={treeRow.key}
                      variant="grupo"
                      row={treeRow}
                      level={treeRow.level}
                      isExpanded={expandedKeys.has(treeRow.key)}
                      isLeaf={treeRow.isLeafGroup}
                      onToggle={() => handleToggleGroup(treeRow.key)}
                    />
                  ) : (
                    <MargemLinhaMobile
                      key={treeRow.key}
                      row={treeRow.item}
                      level={treeRow.level}
                      striped={rowIdx % 2 === 1}
                    />
                  )
                )}
              </div>

              <div className="mt-3 flex justify-center flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <Package className="w-3.5 h-3.5" />
                  {productCount} produto{productCount === 1 ? '' : 's'}
                </span>
              </div>
            </>
          ) : (
            <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">Nenhum dado no período</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Ajuste o período ou os filtros para ver produtos com vendas e margem.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
