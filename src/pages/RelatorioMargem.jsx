import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, FilterX, X, ChevronDown, ChevronRight, Type, TrendingUp, DollarSign, Percent, Package } from 'lucide-react';
import { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import {
  buildMarginTree,
  flattenMarginTree,
  buildExpandedForLevel,
  collectAllMarginLeaves,
} from '@/lib/marginTree';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import CalendarPopup from '@/components/relatorios/CalendarPopup';
import TagSearchPopup from '@/components/relatorios/TagSearchPopup';
import { resolveCommercialDisplay, resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';

import AuditableMetricTooltip from '@/components/relatorios/AuditableMetricTooltip';

const PDF_COL_GAP_MM = 2;

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
  const raw = String(text || '—').trim();
  const lines = [];
  raw.split(/\n/).forEach((paragraph) => {
    const chunk = paragraph.trim();
    if (!chunk) return;
    lines.push(...pdf.splitTextToSize(chunk, maxWidth));
  });
  return lines.length ? lines : ['—'];
}

function formatQuant(val) {
  return (val ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const formatMoneyDisplay = (val) =>
  `R$ ${(val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercentDisplay = (val) => `${(val ?? 0).toFixed(2)}%`;

function MargemCampo({ label, value, align = 'right', muted, profit, className = '' }) {
  const alignClass =
    align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
  const valueClass = profit
    ? 'font-semibold text-green-600 dark:text-green-400'
    : muted
      ? 'text-gray-600 dark:text-gray-400'
      : 'font-medium text-gray-900 dark:text-white';

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
        {label}
      </p>
      <p className={`text-xs tabular-nums ${alignClass} ${valueClass}`}>{value}</p>
    </div>
  );
}

const MARGIN_INDENT_GROUP = 14;
const MARGIN_INDENT_PRODUTO = 8;

function MargemLinhaMobile({ row, variant = 'produto', level = 1 }) {
  const isSubtotal = variant === 'subtotal';
  const isGroup = variant === 'grupo';
  const titulo = isSubtotal ? row.nome || 'Subtotal' : isGroup ? row.label : row.nome;
  const indentPx = isGroup ? (level - 1) * MARGIN_INDENT_GROUP + 12 : (level - 1) * MARGIN_INDENT_GROUP + MARGIN_INDENT_PRODUTO;
  const precoMedio =
    row.valor_unitario_medio ??
    (row.quantidade_vendida > 0 ? (row.total_recebido || 0) / row.quantidade_vendida : 0);
  const markup =
    row.markup_percentual ??
    (row.custo_total > 0 ? ((row.lucro_total || 0) / row.custo_total) * 100 : 0);

  return (
    <div
      className={`p-3 border-b border-gray-100 dark:border-gray-800 ${
        isSubtotal
          ? 'bg-emerald-50/80 dark:bg-emerald-950/20'
          : isGroup
            ? 'bg-slate-50/90 dark:bg-slate-800/40'
            : 'bg-white dark:bg-gray-900/40'
      }`}
    >
      <p
        lang="pt-BR"
        style={{ paddingLeft: indentPx }}
        className={`text-sm break-words hyphens-auto text-justify ${
          isSubtotal || isGroup
            ? 'font-semibold text-gray-900 dark:text-white uppercase tracking-wide'
            : 'font-medium text-gray-900 dark:text-white'
        }`}
      >
        {titulo}
        {isGroup && row.count != null ? (
          <span className="ml-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 normal-case">
            ({row.count})
          </span>
        ) : null}
      </p>
      <div className="mt-2.5 grid grid-cols-4 gap-x-2 gap-y-2">
        <MargemCampo label="QUANT" value={formatQuant(row.quantidade_vendida)} align="center" />
        <MargemCampo
          label="UN"
          value={isSubtotal || isGroup ? '—' : row.unidade_exibicao || 'UN'}
          align="center"
        />
        <MargemCampo
          label="PREÇO UN"
          value={formatMoneyDisplay(precoMedio)}
          className="col-span-2"
        />
        <MargemCampo
          label="RECEITA"
          value={formatMoneyDisplay(row.total_recebido)}
          className="col-span-2"
        />
        <MargemCampo
          label="CUSTO"
          value={formatMoneyDisplay(row.custo_total)}
          muted
          className="col-span-2"
        />
        <MargemCampo
          label="LUCRO"
          value={formatMoneyDisplay(row.lucro_total)}
          profit
          className="col-span-2"
        />
        <MargemCampo
          label="MARKUP"
          value={formatPercentDisplay(markup)}
          profit={!isSubtotal}
          className="col-span-4"
        />
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

  const marginTree = useMemo(() => buildMarginTree(processedData), [processedData]);

  useEffect(() => {
    setExpandedKeys(
      treeLevel === 1 ? new Set() : buildExpandedForLevel(marginTree, treeLevel - 1)
    );
  }, [treeLevel, marginTree]);

  const displayRows = useMemo(
    () => flattenMarginTree(marginTree, expandedKeys),
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

  const exportToPDF = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um período antes de exportar');
      return;
    }

    if (!processedData.length) {
      toast.error('Não há dados para exportar no período selecionado');
      return;
    }

    try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const footerY = pageHeight - 10;
    const rowMinHeight = 5.5;
    const lineHeight = 3.4;

    const colors = {
      text: [31, 41, 55],
      muted: [107, 114, 128],
      border: [229, 231, 235],
      headerBg: [243, 244, 246],
      zebra: [249, 250, 251],
      profit: [22, 163, 74],
      profitBg: [236, 253, 245],
      categoryBg: [241, 245, 249],
    };

    const formatNumPdf = (val) =>
      (val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatPctPdf = (val) => `${(val ?? 0).toFixed(1).replace('.', ',')}%`;

    const flatRows = exportRows.length ? exportRows : processedData;

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
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      setColor(colors.muted);
      pdf.text(
        `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} · ${itemCount} produto(s)`,
        margin,
        footerY
      );
      pdf.text(`Página ${pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
    };

    const drawReportHeader = () => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      setColor(colors.text);
      pdf.text('Relatório de Margem de Vendas', margin, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      setColor(colors.muted);
      pdf.text(
        `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`,
        margin,
        yPos
      );
      yPos += 10;
    };

    const drawSummaryKpis = () => {
      const kpis = [
        { label: 'Receita líquida', value: formatNumPdf(totals.receita_liquida), highlight: false },
        { label: 'Custo total', value: formatNumPdf(totals.custo_total), highlight: false },
        { label: 'Lucro', value: formatNumPdf(totals.lucro_total), highlight: true },
        { label: 'Markup', value: formatPctPdf(totalMarkup), highlight: true },
      ];
      const gap = 3;
      const boxW = (contentWidth - gap * (kpis.length - 1)) / kpis.length;
      const boxH = 16;

      kpis.forEach((kpi, i) => {
        const x = margin + i * (boxW + gap);
        const fill = kpi.highlight ? colors.profitBg : [255, 255, 255];
        setFill(fill);
        setDraw(colors.border);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(x, yPos, boxW, boxH, 1.5, 1.5, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        setColor(colors.muted);
        pdf.text(kpi.label.toUpperCase(), x + 3, yPos + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        setColor(kpi.highlight ? colors.profit : colors.text);
        pdf.text(kpi.value, x + 3, yPos + 11);
      });

      yPos += boxH + 3;
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      setColor(colors.muted);
      pdf.text('Valores monetários em reais (R$).', margin, yPos);
      yPos += 8;
    };

    const drawTableHeader = () => {
      const headerH = 7;
      setFill(colors.headerBg);
      setDraw(colors.border);
      pdf.rect(margin, yPos, contentWidth, headerH, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      setColor(colors.muted);
      const headerY = yPos + 4.6;
      const quantCenter = (colXAbs.quant + colRightAbs.quant) / 2;
      const unCenter = (colXAbs.un + colRightAbs.un) / 2;

      pdf.text('QUANT', quantCenter, headerY, { align: 'center' });
      pdf.text('UN', unCenter, headerY, { align: 'center' });
      pdf.text('DESCRIÇÃO', colXAbs.desc + 1, headerY);
      pdf.text('PREÇO UN', colRightAbs.precoMedio - 1, headerY, { align: 'right' });
      pdf.text('RECEITA', colRightAbs.receita - 1, headerY, { align: 'right' });
      pdf.text('CUSTO', colRightAbs.custo - 1, headerY, { align: 'right' });
      pdf.text('LUCRO', colRightAbs.lucro - 1, headerY, { align: 'right' });
      pdf.text('MARKUP', colRightAbs.markup - 1, headerY, { align: 'right' });

      yPos += headerH;
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

    const drawDataRow = (row) => {
      if (row.isCategoryHeader) {
        const catH = 6;
        ensureSpace(catH);
        setFill(colors.categoryBg);
        setDraw(colors.border);
        pdf.rect(margin, yPos, contentWidth, catH, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        setColor(colors.text);
        pdf.text(String(row.nome || 'Sem categoria'), colXAbs.desc + 1, yPos + 4.2);
        yPos += catH;
        return;
      }

      const descPad = 2;
      const descMaxW = colWidths.desc - descPad;
      const descLines = wrapDescLinesPdf(
        pdf,
        row.isSubtotal ? String(row.nome || 'Subtotal') : String(row.nome || '—'),
        descMaxW
      );
      const rowHeight = Math.max(rowMinHeight, descLines.length * lineHeight + 2);
      ensureSpace(rowHeight);

      const isSubtotal = Boolean(row.isSubtotal);
      const isZebra = !isSubtotal && zebraIndex % 2 === 1;
      zebraIndex += isSubtotal ? 0 : 1;

      if (isSubtotal) {
        setFill(colors.profitBg);
        pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
      } else if (isZebra) {
        setFill(colors.zebra);
        pdf.rect(margin, yPos, contentWidth, rowHeight, 'F');
      }

      setDraw(colors.border);
      pdf.setLineWidth(0.1);
      pdf.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);

      const textY = yPos + 3.8;
      pdf.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
      pdf.setFontSize(7.5);
      setColor(colors.text);

      const quantCenter = (colXAbs.quant + colRightAbs.quant) / 2;
      const unCenter = (colXAbs.un + colRightAbs.un) / 2;

      pdf.text(
        formatNumPdf(row.quantidade_vendida || 0),
        quantCenter,
        textY,
        { align: 'center' }
      );
      if (!isSubtotal) {
        pdf.text(String(row.unidade_exibicao || 'UN'), unCenter, textY, { align: 'center' });
      }

      descLines.forEach((line, idx) => {
        const lineY = textY + idx * lineHeight;
        if (idx < descLines.length - 1) {
          drawJustifiedPdfLine(pdf, line, colXAbs.desc + 1, lineY, descMaxW);
        } else {
          pdf.text(line, colXAbs.desc + 1, lineY);
        }
      });

      pdf.text(formatNumPdf(getRowPrecoMedio(row)), colRightAbs.precoMedio - 1, textY, {
        align: 'right',
      });
      pdf.text(formatNumPdf(row.total_recebido || 0), colRightAbs.receita - 1, textY, {
        align: 'right',
      });
      pdf.setFont('helvetica', 'normal');
      setColor(colors.muted);
      pdf.text(formatNumPdf(row.custo_total || 0), colRightAbs.custo - 1, textY, { align: 'right' });

      pdf.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
      setColor(colors.profit);
      pdf.text(formatNumPdf(row.lucro_total || 0), colRightAbs.lucro - 1, textY, { align: 'right' });

      setColor(isSubtotal ? colors.profit : colors.text);
      pdf.text(formatPctPdf(getRowMarkup(row)), colRightAbs.markup - 1, textY, { align: 'right' });

      yPos += rowHeight;
    };

    drawReportHeader();
    drawSummaryKpis();
    drawTableHeader();
    flatRows.forEach(drawDataRow);
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setTreeLevel(99);
    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="p-3 md:p-6 sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <Link to="/Relatorios">
                <button className="p-1.5 md:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0">
                  <ArrowLeft className="w-4 md:w-5 h-4 md:h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base md:text-2xl font-glacial font-semibold text-gray-900 dark:text-white truncate">Relatório de Margem</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Rentabilidade por produto</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-700 dark:text-gray-200 flex-shrink-0" title="Opções de impressão">
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
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-xs md:text-sm font-medium"
              title="Filtros"
            >
              <FilterX className="w-4 h-4" />
              Filtros
            </button>
            {(searchTerm || selectedTags.length > 0 || treeLevel !== 99) && (
              <button
                onClick={handleClearFilters}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Limpar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Drawer - PDV Style */}
        <Drawer open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-gray-900 px-4 pb-6 max-h-[85vh] flex flex-col">
            <DrawerHeader className="px-0 pb-3 text-left sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800">
              <DrawerTitle className="font-glacial text-gray-900 dark:text-white text-lg">Filtros e Configurações</DrawerTitle>
            </DrawerHeader>

            <div className="space-y-4 overflow-y-auto">
              {/* Período */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Período</label>
                
                {/* Atalhos Rápidos */}
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
                    Mês atual
                  </button>
                </div>

                {/* Calendário Personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Customizado</label>
                  <button
                    onClick={() => setShowCalendar(true)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {dateRange.from ? `${format(dateRange.from, 'dd/MM')} - ${dateRange.to ? format(dateRange.to, 'dd/MM') : '...'}` : 'Selecionar período'}
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
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
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

        {/* Calendário acima do Drawer (portal no body — drawer usa z-[310]) */}
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
                  className="pointer-events-auto w-full max-w-[720px] rounded-[28px] bg-white dark:bg-gray-900 p-3 md:p-5 shadow-2xl"
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

        {/* Resumo — mesma linguagem do PDF */}
         <div className="px-3 md:px-6 py-2.5 md:py-6">
           <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
             Valores monetários em reais (R$).
           </p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
             <AuditableMetricTooltip
               label="RECEITA LÍQUIDA"
               value={formatMoney(totals.receita_liquida)}
               auditData={{
                 'Receita Bruta': formatMoney(totals.total_recebido),
                 'Menos Descontos': `- ${formatMoney(totals.total_desconto_venda)}`,
                 'Receita Líquida': formatMoney(totals.receita_liquida)
               }}
               formatMoney={formatMoney}
             />
             <AuditableMetricTooltip
               label="CUSTO TOTAL"
               value={formatMoney(totals.custo_total)}
               auditData={{
                 'Custo Total': formatMoney(totals.custo_total)
               }}
               formatMoney={formatMoney}
             />
             <AuditableMetricTooltip
               label="LUCRO"
               value={formatMoney(totals.lucro_total)}
               auditData={{
                 'Receita Líquida': formatMoney(totals.receita_liquida),
                 'Menos Custos': `- ${formatMoney(totals.custo_total)}`,
                 'Lucro Líquido': formatMoney(totals.lucro_total)
               }}
               formatMoney={formatMoney}
             />
             <div className="p-2.5 md:p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
               <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5 uppercase">
                 Markup
               </p>
               <p className="text-xs md:text-lg md:text-xl font-semibold text-green-700 dark:text-green-400">
                 {formatPercent(totalMarkup)}
               </p>
             </div>
           </div>
           </div>

           {/* Ordenação e níveis hierárquicos */}
           <div className="px-3 md:px-6 py-2.5 flex flex-wrap gap-2 items-center">
            <LevelControl level={treeLevel} onChange={setTreeLevel} />
            <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            {/* Critério Selecionado - Icon Only */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Critério de ordenação">
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

            {/* Seta para Direção */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Alternar direção"
            >
              <ChevronDown className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition ${
                sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
           </div>

           {/* Table - Desktop Table / Mobile Cards */}
        <div className="p-3 md:p-6" id="relatorio-table">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : processedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block min-w-0 overflow-x-auto">
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
                  <thead className="bg-gray-100 dark:bg-gray-800/80">
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
                        className="text-center py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                        QUANT {sortField === 'quantidade_vendida' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400">
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
                        className="text-left py-3 px-3 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                       className="text-right py-3 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                       MARKUP {sortField === 'markup_percentual' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((treeRow, rowIdx) => {
                      if (treeRow.type === 'group') {
                        const indent = (treeRow.level - 1) * MARGIN_INDENT_GROUP;
                        const isExpanded = expandedKeys.has(treeRow.key);
                        const isLeaf = treeRow.isLeafGroup;
                        return (
                          <tr
                            key={treeRow.key}
                            onClick={isLeaf ? undefined : () => handleToggleGroup(treeRow.key)}
                            className={`border-b border-gray-100 dark:border-gray-800 bg-slate-50/80 dark:bg-slate-800/30 ${
                              isLeaf ? '' : 'cursor-pointer hover:bg-slate-100/90 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-sm text-center tabular-nums font-semibold text-gray-900 dark:text-white">
                              {formatQuant(treeRow.quantidade_vendida)}
                            </td>
                            <td className="py-2.5 px-2 text-sm text-center text-gray-400">—</td>
                            <td
                              lang="pt-BR"
                              className="py-2.5 px-3 text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide break-words min-w-0"
                              style={{ paddingLeft: 12 + indent }}
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
                            <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-900 dark:text-white">
                              {formatMoney(treeRow.valor_unitario_medio)}
                            </td>
                            <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-900 dark:text-white">
                              {formatMoney(treeRow.total_recebido)}
                            </td>
                            <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-600 dark:text-gray-400">
                              {formatMoney(treeRow.custo_total)}
                            </td>
                            <td className="py-2.5 px-2 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                              {formatMoney(treeRow.lucro_total)}
                            </td>
                            <td className="py-2.5 px-2 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                              {formatPercent(treeRow.markup_percentual)}
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
                          className={`border-b border-gray-100 dark:border-gray-800 transition ${
                            rowIdx % 2 === 1
                              ? 'bg-gray-50/90 dark:bg-gray-800/40'
                              : 'bg-white dark:bg-gray-900/20'
                          } hover:bg-gray-100/80 dark:hover:bg-gray-800/60`}
                        >
                          <td className="py-2.5 px-2 text-sm text-center tabular-nums text-gray-900 dark:text-white font-semibold">
                            {formatQuant(row.quantidade_vendida)}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-center text-gray-600 dark:text-gray-400">
                            {row.unidade_exibicao || 'UN'}
                          </td>
                          <td
                            lang="pt-BR"
                            className="py-2.5 px-3 text-sm text-gray-900 dark:text-white font-medium hyphens-auto text-justify break-words min-w-0"
                            style={{ paddingLeft: descIndent }}
                          >
                            {row.nome}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-900 dark:text-white">
                            {formatMoney(row.valor_unitario_medio)}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-900 dark:text-white">
                            {formatMoney(row.total_recebido)}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {formatMoney(row.custo_total)}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                            {formatMoney(row.lucro_total)}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-right tabular-nums font-semibold text-green-600 dark:text-green-400">
                            {formatPercent(row.markup_percentual)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                          </table>
              </div>

              {/* Mobile — mesmas colunas do PDF */}
              <div className="md:hidden rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {displayRows.map((treeRow, rowIdx) =>
                  treeRow.type === 'group' ? (
                    <MargemLinhaMobile
                      key={treeRow.key}
                      variant="grupo"
                      row={treeRow}
                      level={treeRow.level}
                    />
                  ) : (
                    <div
                      key={treeRow.key}
                      className={rowIdx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                    >
                      <MargemLinhaMobile row={treeRow.item} level={treeRow.level} />
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 md:mt-6 p-3 md:p-4 text-xs text-gray-600 dark:text-gray-400">
                {productCount} produto{productCount === 1 ? '' : 's'}
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhum dado encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
