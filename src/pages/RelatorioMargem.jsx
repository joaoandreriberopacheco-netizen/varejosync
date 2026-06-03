import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, FilterX, X, ChevronDown, ChevronRight, Type, TrendingUp, DollarSign, Percent, Package, BarChart3, Wallet } from 'lucide-react';
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import CalendarPopup from '@/components/relatorios/CalendarPopup';
import TagSearchPopup from '@/components/relatorios/TagSearchPopup';
import { resolveCommercialDisplay, resolveCustoTotalUnitBaseProduto, formatCommercialQuantity } from '@/lib/productUnits';
import { registerJsPdfNotoFonts, normalizePdfText } from '@/lib/jspdfNotoFont';

import AuditableMetricTooltip from '@/components/relatorios/AuditableMetricTooltip';

const PDF_COL_GAP_MM = 2;

/** Paleta alinhada a `gerarRelatorioPedidosComprav2` (relat?rio expandido de embarques). */
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

/** Larguras fixas (mm); descri??o ocupa o restante de contentWidth menos os gaps. */
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

/** Coluna UN: folhas usam sigla; grupos s? quando todas as folhas coincidem, sen?o ??? */
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

const MARGIN_INDENT_GROUP = 14;
const MARGIN_INDENT_PRODUTO = 8;
const MARGIN_INDENT_GROUP_MOBILE = 10;
const MARGIN_INDENT_PRODUTO_MOBILE = 6;

/** Corpo: entrelinha +50% (?1,5) e padding +20% (?1,2) em rela??o ao layout compacto anterior. */
const BODY_LINE_HEIGHT_MULT = 1.5;
const BODY_PAD_MULT = 1.2;

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
  const indentPx =
    (level - 1) * MARGIN_INDENT_GROUP_MOBILE + (isGroup ? 4 : MARGIN_INDENT_PRODUTO_MOBILE);
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

  const rowPadLeft = 24 + indentPx;
  const rowBase = `border-b border-gray-100 dark:border-gray-800 border-l-2 ${accentBorder} py-5 pr-6 min-w-0 max-w-full touch-pan-y`;

  if (isGroup || isSubtotal) {
    const bgClass = isSubtotal
      ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
      : 'bg-slate-50/80 dark:bg-slate-800/35';
    const inner = (
      <>
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {!isLeaf && !isSubtotal ? (
            <ChevronRight
              className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <span
              lang="pt-BR"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-100 truncate"
            >
              {titulo}
              {row.count != null ? (
                <span className="ml-1 font-medium text-gray-500 dark:text-gray-400 normal-case">
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
          </div>
        </div>
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
      <p
        lang="pt-BR"
        className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 break-words"
        style={{ lineHeight: `${1.375 * BODY_LINE_HEIGHT_MULT}` }}
      >
        {titulo}
      </p>
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
         // Registrar o desconto do pedido (para cada venda, n?o proporcional por item neste c?lculo)
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

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sorted = sorted.filter(item => 
        item.nome?.toLowerCase?.().includes(term) || 
        item.codigo_interno?.toLowerCase?.().includes(term)
      );
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

  const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val) => `${val.toFixed(2)}%`;

  const exportToCSV = () => {
    const flat = exportRows.length ? exportRows : processedData;
    const headers =
      'Produto;Categoria;Quant;Un;Preco Un Medio;Receita Total;Custo Total;Lucro;Markup %\n';
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

  const exportToPDF = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um per?odo antes de exportar');
      return;
    }

    if (!processedData.length) {
      toast.error('N?o h? dados para exportar no per?odo selecionado');
      return;
    }

    try {
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
    const rowMinHeightGroup = 6 * BODY_LINE_HEIGHT_MULT;
    const rowPadV = 1.2 * BODY_PAD_MULT;
    const textBaseline = 3.5 * BODY_PAD_MULT;
    const pdfIndentGroupMm = 3;
    const pdfIndentProdutoMm = 1.6;
    const groupCardInset = 2 * BODY_PAD_MULT;
    const descPad = 2 * BODY_PAD_MULT;
    const rowGapGroup = 1.6 * BODY_PAD_MULT;
    const descGroupOffset = 2.5 * BODY_PAD_MULT;

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
          `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} ? ${itemCount} produto(s)`
        ),
        margin,
        footerY
      );
      pdf.text(normalizePdfText(`P?gina ${pageNumber}`), pageWidth - margin, footerY, {
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
      pdf.text(normalizePdfText('Relat?rio de Margem de Vendas'), margin + 11, yPos + 9.5);

      pdf.setFontSize(8.5);
      setColor(C.muted);
      pdf.text(
        normalizePdfText(
          `Per?odo: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
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
        { label: 'Receita l?quida', value: formatNumPdf(totals.receita_liquida), accent: false },
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
      pdf.text(normalizePdfText('Valores monet?rios em reais (R$).'), margin, yPos);
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
      pdf.text(normalizePdfText('DESCRI????O'), colXAbs.desc + 1, headerY);
      pdf.text(normalizePdfText('PRE??O UN'), colRightAbs.precoMedio - 1, headerY, { align: 'right' });
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
      const descIndent = isGroup
        ? 1 + (treeRow.level - 1) * pdfIndentGroupMm
        : 1 + (treeRow.level - 1) * pdfIndentGroupMm + pdfIndentProdutoMm;
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

      const rowX = margin + (isGroup ? groupCardInset : 0);
      const rowW = contentWidth - (isGroup ? groupCardInset * 2 : 0);

      if (isGroup) {
        setFill(C.panel);
        pdf.roundedRect(rowX, yPos, rowW, rowHeight, 3, 3, 'F');
        setFill(C.teal);
        pdf.roundedRect(
          rowX + 3 * BODY_PAD_MULT,
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
      drawDescColumn(descLines, descX + (isGroup ? descGroupOffset : 0), descMaxW, textY);
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
      console.error('Erro ao gerar PDF do relat?rio de margem', error);
      const devDetail = import.meta.env.DEV && error?.message ? ` (${error.message})` : '';
      toast.error(`N?o foi poss?vel gerar o PDF. Tente novamente.${devDetail}`);
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

  const handleClearFilters = () => {
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
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-950 md:min-h-screen md:overflow-x-hidden">
      <div className="max-w-full mx-auto min-w-0 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-3 md:px-6 md:py-4 md:sticky md:top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <Link to="/Relatorios">
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0">
                  <ArrowLeft className="w-4 md:w-5 h-4 md:h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base md:text-2xl font-glacial font-semibold text-gray-900 dark:text-white truncate">Relat?rio de Margem</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Rentabilidade por produto
                  {periodLabel ? (
                    <span className="block sm:inline mt-0.5 sm:mt-0 text-gray-400 dark:text-gray-500 truncate">
                      <span className="sm:hidden">Per?odo: </span>
                      <span className="hidden sm:inline"> ? </span>
                      {periodLabel}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-700 dark:text-gray-200 flex-shrink-0" title="Op??es de impress?o">
                    <Printer className="w-4 md:w-5 h-4 md:h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700 text-sm">
                  <DropdownMenuItem onClick={exportToPDF} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Button - PDV Style */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowFilterDrawer(true)}
              className="flex items-center gap-2 px-4 min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-xs md:text-sm font-medium"
              title="Filtros"
            >
              <FilterX className="w-4 h-4" />
              Filtros
            </button>
            {(searchTerm || selectedTags.length > 0 || treeLevel !== 99) && (
              <button
                onClick={handleClearFilters}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Limpar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Drawer - PDV Style */}
        <Drawer open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-gray-900 px-4 pb-8 max-h-[85vh] flex flex-col">
            <DrawerHeader className="px-0 pb-3 text-left sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800">
              <DrawerTitle className="font-glacial text-gray-900 dark:text-white text-lg">Filtros e Configura??es</DrawerTitle>
            </DrawerHeader>

            <div className="space-y-5 overflow-y-auto pt-1">
              {/* Per?odo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Per?odo</label>
                
                {/* Atalhos R?pidos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mb-3">
                  <button
                    onClick={() => {
                      const today = new Date();
                      setDateRange({ from: today, to: today });
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const thirtyDaysAgo = subDays(today, 30);
                      setDateRange({ from: thirtyDaysAgo, to: today });
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    30 dias
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    M?s atual
                  </button>
                </div>

                {/* Calend?rio Personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Customizado</label>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {dateRange.from ? `${format(dateRange.from, 'dd/MM')} - ${dateRange.to ? format(dateRange.to, 'dd/MM') : '...'}` : 'Selecionar per?odo'}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Buscar Produto</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input autoComplete="off" 
                    type="text" 
                    placeholder="Nome do produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-base md:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Tags</label>
                  <TagSearchPopup
                    variant="inline"
                    allTags={allTags}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                    onClose={() => {}}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  N?vel da ?rvore
                </label>
                <div className="overflow-x-auto pb-1 [&_button]:!min-h-9 [&_button]:!min-w-9">
                  <LevelControl level={treeLevel} onChange={setTreeLevel} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Calend?rio acima do Drawer (portal no body ??? drawer usa z-[310]) */}
        {showCalendar &&
          createPortal(
            <>
              <button
                type="button"
                aria-label="Fechar calend?rio"
                className="fixed inset-0 z-[320] cursor-default bg-black/50"
                onClick={() => setShowCalendar(false)}
              />
              <div className="fixed inset-0 z-[330] flex items-end md:items-center justify-center pointer-events-none p-3 md:p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Selecionar per?odo"
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

<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain overscroll-x-none touch-pan-y pb-[var(--p38-scroll-pad-below-nav)] md:overflow-visible md:flex-none md:pb-0">
                {/* Resumo ? mesma linguagem do PDF */}
         <div className="px-3 md:px-6 py-2.5 md:py-5 min-w-0 max-w-full overflow-x-hidden">
           <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 md:mb-3 italic">
             Valores monet?rios em reais (R$).
           </p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
             <AuditableMetricTooltip
               className="!p-4 md:!p-4 !bg-[#fafafa] dark:!bg-gray-800/60 !border-gray-100 [&_p:last-child]:!font-normal"
               icon={TrendingUp}
               label="RECEITA L?QUIDA"
               value={formatMoney(totals.receita_liquida)}
               auditData={{
                 'Receita Bruta': formatMoney(totals.total_recebido),
                 'Menos Descontos': `- ${formatMoney(totals.total_desconto_venda)}`,
                 'Receita L?quida': formatMoney(totals.receita_liquida)
               }}
             />
             <AuditableMetricTooltip
               className="!p-4 md:!p-4 !bg-[#fafafa] dark:!bg-gray-800/60 !border-gray-100 [&_p:last-child]:!font-normal"
               icon={Wallet}
               label="CUSTO TOTAL"
               value={formatMoney(totals.custo_total)}
               auditData={{
                 'Custo Total': formatMoney(totals.custo_total)
               }}
             />
             <AuditableMetricTooltip
               className="!p-4 md:!p-4 !bg-[#fafafa] dark:!bg-gray-800/60 !border-gray-100 [&_p:last-child]:!font-normal"
               icon={DollarSign}
               label="LUCRO"
               value={formatMoney(totals.lucro_total)}
               auditData={{
                 'Receita L?quida': formatMoney(totals.receita_liquida),
                 'Menos Custos': `- ${formatMoney(totals.custo_total)}`,
                 'Lucro L?quido': formatMoney(totals.lucro_total)
               }}
             />
             <AuditableMetricTooltip
               className="!p-4 md:!p-4 !bg-emerald-50/80 dark:!bg-emerald-950/20 !border-emerald-100 [&_p:last-child]:!font-normal"
               icon={Percent}
               variant="profit"
               label="MARKUP"
               value={formatPercent(totalMarkup)}
             />
           </div>
           </div>

           {/* Toolbar */}
           <div className="px-3 md:mx-6 mb-1.5 md:mb-2 rounded-xl md:rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 shadow-sm py-2.5 md:px-3 md:py-2.5 min-w-0 max-w-full">
             <div className="flex flex-wrap items-center gap-2 min-w-0 [&_button]:!min-h-9 [&_button]:!min-w-9 md:[&_button]:!min-h-6 md:[&_button]:!min-w-6">
            <div className="hidden md:contents">
            <LevelControl level={treeLevel} onChange={setTreeLevel} />
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0" />
            </div>
            {/* Crit?rio Selecionado - Icon Only */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition" title="Crit?rio de ordena??o">
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
                    <span>Descri??o</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('quantidade_vendida'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Quant</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('valor_unitario_medio'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Pre?o un m?dio</span>
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

            {/* Seta para dire??o */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 flex-shrink-0 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition"
              title="Alternar dire??o"
            >
              <ChevronDown className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition ${
                sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
             </div>
           </div>

           {/* Table - Desktop Table / Mobile Cards */}
        <div className="p-3 md:p-6 min-w-0 max-w-full overflow-x-hidden" id="relatorio-table">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40">
              <Loader2 className="w-9 h-9 animate-spin text-gray-400 mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Carregando relat?rio???</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aguarde enquanto calculamos as margens</p>
            </div>
          ) : processedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block min-w-0 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 shadow-sm">
                <table className="w-full text-sm table-fixed">
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
                  <thead className="sticky top-0 z-[1] bg-gray-800 dark:bg-gray-900 backdrop-blur-sm">
                    <tr className="border-b border-gray-700 dark:border-gray-600">
                      <th
                        onClick={() => {
                          if (sortField === 'quantidade_vendida') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('quantidade_vendida');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-center py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        QUANT {sortField === 'quantidade_vendida' && (sortOrder === 'asc' ? '???' : '???')}
                      </th>
                      <th className="text-center py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200">
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
                        className="text-left py-3 px-3 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        DESCRI????O {sortField === 'nome' && (sortOrder === 'asc' ? '???' : '???')}
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
                        className="text-right py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        PRE??O UN {sortField === 'valor_unitario_medio' && (sortOrder === 'asc' ? '???' : '???')}
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
                        className="text-right py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        RECEITA {sortField === 'total_recebido' && (sortOrder === 'asc' ? '???' : '???')}
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
                        className="text-right py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        CUSTO {sortField === 'custo_total' && (sortOrder === 'asc' ? '???' : '???')}
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
                        className="text-right py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                        LUCRO {sortField === 'lucro_total' && (sortOrder === 'asc' ? '???' : '???')}
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
                       className="text-right py-3 px-2 text-[11px] font-medium uppercase tracking-wide text-gray-200 cursor-pointer hover:text-white"
                      >
                       MARKUP {sortField === 'markup_percentual' && (sortOrder === 'asc' ? '???' : '???')}
                      </th>
                      </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((treeRow, rowIdx) => {
                      if (treeRow.type === 'group') {
                        const indent = (treeRow.level - 1) * MARGIN_INDENT_GROUP;
                        const isExpanded = expandedKeys.has(treeRow.key);
                        const isLeaf = treeRow.isLeafGroup;
                        const showGroupMetrics = treeRow.showMetrics !== false;
                        return (
                          <tr
                            key={treeRow.key}
                            onClick={isLeaf ? undefined : () => handleToggleGroup(treeRow.key)}
                            className={`border-b border-gray-100 dark:border-gray-800 bg-slate-50/80 dark:bg-slate-800/30 ${
                              isLeaf ? '' : 'cursor-pointer hover:bg-slate-100/90 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td
                              className="py-3 px-2.5 text-sm text-center tabular-nums font-semibold text-gray-900 dark:text-white"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatQuant(treeRow.quantidade_vendida, treeRow.unidade_exibicao) : ''}
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-center text-gray-600 dark:text-gray-400"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics
                                ? formatMarginTreeUnidade(treeRow, { isGroup: true })
                                : ''}
                            </td>
                            <td
                              lang="pt-BR"
                              className="py-3.5 px-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide break-words min-w-0 border-l-4 border-slate-300 dark:border-slate-600"
                              style={{ paddingLeft: 14.4 + indent, lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!isLeaf && (
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`}
                                  />
                                )}
                                {isLeaf && <span className="w-3.5 flex-shrink-0" />}
                                <span className="truncate">{treeRow.label}</span>
                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 normal-case flex-shrink-0">
                                  ({treeRow.count})
                                </span>
                              </div>
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-white"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.valor_unitario_medio) : ''}
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-white"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.total_recebido) : ''}
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-600 dark:text-gray-400"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.custo_total) : ''}
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatMoney(treeRow.lucro_total) : ''}
                            </td>
                            <td
                              className="py-3 px-2.5 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                              style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                            >
                              {showGroupMetrics ? formatPercent(treeRow.markup_percentual) : ''}
                            </td>
                          </tr>
                        );
                      }

                      const row = treeRow.item;
                      const descIndent =
                        (treeRow.level - 1) * MARGIN_INDENT_GROUP + MARGIN_INDENT_PRODUTO;
                      return (
                        <tr
                          key={treeRow.key}
                            className={`border-b border-gray-100/80 dark:border-gray-800/80 transition-colors ${
                            rowIdx % 2 === 1
                              ? 'bg-gray-50/60 dark:bg-gray-800/30'
                              : 'bg-white dark:bg-gray-900/10'
                          } hover:bg-gray-100/70 dark:hover:bg-gray-800/50`}
                        >
                          <td
                            className="py-3 px-2.5 text-sm text-center tabular-nums text-gray-900 dark:text-white font-semibold"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatQuant(row.quantidade_vendida, row.unidade_exibicao)}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-center text-gray-600 dark:text-gray-400"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {row.unidade_exibicao || 'UN'}
                          </td>
                          <td
                            lang="pt-BR"
                            className={`py-3.5 px-3.5 text-sm text-gray-900 dark:text-white font-medium hyphens-auto break-words min-w-0 ${
                              treeRow.level > 1 ? 'border-l-2 border-gray-200 dark:border-gray-700' : ''
                            }`}
                            style={{ paddingLeft: descIndent, lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {row.nome}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-white"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatMoney(row.valor_unitario_medio)}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-900 dark:text-white"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatMoney(row.total_recebido)}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-right tabular-nums text-gray-600 dark:text-gray-400"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatMoney(row.custo_total)}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatMoney(row.lucro_total)}
                          </td>
                          <td
                            className="py-3 px-2.5 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400"
                            style={{ lineHeight: BODY_LINE_HEIGHT_MULT }}
                          >
                            {formatPercent(row.markup_percentual)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                          </table>
              </div>

              {/* Mobile ? mesmas colunas do PDF */}
              <div className="md:hidden min-w-0 max-w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
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

              <div className="mt-4 md:mt-6 flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <Package className="w-3.5 h-3.5" />
                  {productCount} produto{productCount === 1 ? '' : 's'}
                </span>
              </div>
            </>
          ) : (
            <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">Nenhum dado no per?odo</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Ajuste o per?odo ou os filtros para ver produtos com vendas e margem.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
