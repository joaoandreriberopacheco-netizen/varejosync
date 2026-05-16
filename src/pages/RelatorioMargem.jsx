import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, Calendar, ArrowUpDown, FilterX, X, HelpCircle, ChevronDown, Type, TrendingUp, DollarSign, Percent, Scale } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import CalendarPopup from '@/components/relatorios/CalendarPopup';
import TagSearchPopup from '@/components/relatorios/TagSearchPopup';
import { resolveCommercialDisplay } from '@/lib/productUnits';

import AuditableMetricTooltip from '@/components/relatorios/AuditableMetricTooltip';

export default function RelatorioMargemVendas() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(false);
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

         // IMPORTANTE: Usar SEMPRE o custo ATUAL do produto, nunca do momento da venda
         const custoCalculado = product.preco_custo_calculado || (
           (product.valor_compra || 0) +
           (product.custo_frete_padrao || 0) +
           (product.custo_imposto1_padrao || 0) +
           (product.custo_imposto2_padrao || 0) +
           (product.custo_outros_padrao || 0) -
           (product.desconto_compra_padrao || 0)
         );

         if (!reportMap[prodId]) {
          const unidadeInicial = resolveCommercialDisplay(product, 0, item.unidade_medida || product?.unidade_principal || 'UN');
           reportMap[prodId] = {
             codigo_interno: product.codigo_interno,
             nome: product.nome,
             categoria: product.categoria_nome,
            unidade_exibicao: unidadeInicial.unidade || 'UN',
             vendas_count: 0,
             quantidade_vendida: 0,
             total_recebido: 0,
             total_desconto_venda: 0,
             custo_unitario_cadastro: custoCalculado
           };
         }

         const entry = reportMap[prodId];
        const quantidadeBase = Number(item.quantidade_base ?? (item.quantidade * (item.fator_conversao || 1)) ?? item.quantidade ?? 0) || 0;
        const quantidadeResolvida = resolveCommercialDisplay(product, quantidadeBase, item.unidade_medida || product?.unidade_principal || 'UN');
         entry.vendas_count += 1;
        entry.quantidade_vendida += quantidadeResolvida.quantidade;
        entry.unidade_exibicao = quantidadeResolvida.unidade || entry.unidade_exibicao || 'UN';
         entry.total_recebido += item.total;
         // Registrar o desconto do pedido (para cada venda, não proporcional por item neste cálculo)
         entry.total_desconto_venda += (sale.valor_desconto || 0) / (sale.itens?.length || 1);
       });
     });

    let sorted = Object.values(reportMap).map(item => {
       const custo_total = item.custo_unitario_cadastro * item.quantidade_vendida;
       const receita_liquida = item.total_recebido - item.total_desconto_venda;
       const lucro_total = receita_liquida - custo_total;
       const valor_unitario_medio = item.total_recebido / item.quantidade_vendida;
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

    // Group by category
    if (groupByCategory) {
      const grouped = {};
      sorted.forEach(item => {
        const cat = item.categoria || 'Sem categoria';
        if (!grouped[cat]) {
          grouped[cat] = { category: cat, items: [], totals: { total_recebido: 0, custo_total: 0, lucro_total: 0, quantidade_vendida: 0 } };
        }
        grouped[cat].items.push(item);
        grouped[cat].totals.total_recebido += (item.total_recebido || 0);
        grouped[cat].totals.custo_total += (item.custo_total || 0);
        grouped[cat].totals.lucro_total += (item.lucro_total || 0);
        grouped[cat].totals.quantidade_vendida += (item.quantidade_vendida || 0);
      });
      return Object.values(grouped);
    }

    return sorted;
  }, [sales, products, dateRange, searchTerm, sortField, sortOrder, selectedTags, groupByCategory]);

  const totals = useMemo(() => {
    if (!processedData.length) return { quantidade_vendida: 0, total_recebido: 0, total_desconto_venda: 0, receita_liquida: 0, custo_total: 0, lucro_total: 0 };

    if (groupByCategory) {
      return processedData.reduce((acc, group) => {
        const desconto = group.items.reduce((d, item) => d + (item.total_desconto_venda || 0), 0);
        return {
          quantidade_vendida: acc.quantidade_vendida + (group.totals?.quantidade_vendida || 0),
          total_recebido: acc.total_recebido + (group.totals?.total_recebido || 0),
          total_desconto_venda: acc.total_desconto_venda + desconto,
          receita_liquida: acc.receita_liquida + (group.totals?.receita_liquida || 0),
          custo_total: acc.custo_total + (group.totals?.custo_total || 0),
          lucro_total: acc.lucro_total + (group.totals?.lucro_total || 0)
        };
      }, { quantidade_vendida: 0, total_recebido: 0, total_desconto_venda: 0, receita_liquida: 0, custo_total: 0, lucro_total: 0 });
    }
    const desconto = processedData.reduce((d, item) => d + (item.total_desconto_venda || 0), 0);
    return processedData.reduce((acc, item) => ({
      quantidade_vendida: acc.quantidade_vendida + (item.quantidade_vendida || 0),
      total_recebido: acc.total_recebido + (item.total_recebido || 0),
      total_desconto_venda: desconto,
      receita_liquida: acc.receita_liquida + (item.receita_liquida || 0),
      custo_total: acc.custo_total + (item.custo_total || 0),
      lucro_total: acc.lucro_total + (item.lucro_total || 0)
    }), { quantidade_vendida: 0, total_recebido: 0, total_desconto_venda: desconto, receita_liquida: 0, custo_total: 0, lucro_total: 0 });
  }, [processedData, groupByCategory]);

  const totalMargem = totals.receita_liquida > 0 ? (totals.lucro_total / totals.receita_liquida) * 100 : 0;
  const totalMarkup = totals.custo_total > 0 ? (totals.lucro_total / totals.custo_total) * 100 : 0;
  const lucro_bruto = totals.total_recebido - totals.custo_total;

  const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val) => `${val.toFixed(2)}%`;

  const exportToCSV = () => {
    const headers = "Codigo;Produto;Categoria;Qtd Vendida;Unidade;Valor Medio;Total Recebido;Custo Unit;Custo Total;Lucro Total;Margem %;Markup %\n";
    const rows = processedData.map(row => 
      `${row.codigo_interno};${row.nome};${row.categoria};${row.quantidade_vendida};${row.unidade_exibicao || 'UN'};${row.valor_unitario_medio.toFixed(2)};${row.total_recebido.toFixed(2)};${row.custo_unitario_cadastro.toFixed(2)};${row.custo_total.toFixed(2)};${row.lucro_total.toFixed(2)};${row.margem_percentual.toFixed(2)};${row.markup_percentual.toFixed(2)}`
    ).join("\n");
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
      alert('Selecione um período antes de exportar');
      return;
    }

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

    const flatRows = groupByCategory
      ? processedData.flatMap((group) => [
          { isCategoryHeader: true, nome: group.category },
          ...group.items,
          {
            ...group.totals,
            nome: `Subtotal — ${group.category}`,
            isSubtotal: true,
            margem_percentual:
              group.totals.total_recebido > 0
                ? (group.totals.lucro_total / group.totals.total_recebido) * 100
                : 0,
          },
        ])
      : processedData;

    const dataRows = flatRows.filter((r) => !r.isCategoryHeader);
    const showCodigo = dataRows.some(
      (r) => !r.isSubtotal && String(r.codigo_interno || '').trim().length > 0
    );

    const colWidths = showCodigo
      ? { codigo: 14, desc: 58, qtd: 16, receita: 22, custo: 22, lucro: 22, margem: 14 }
      : { desc: 72, qtd: 16, receita: 22, custo: 22, lucro: 22, margem: 14 };

    const colKeys = showCodigo
      ? ['codigo', 'desc', 'qtd', 'receita', 'custo', 'lucro', 'margem']
      : ['desc', 'qtd', 'receita', 'custo', 'lucro', 'margem'];

    const colX = {};
    let xAcc = margin;
    colKeys.forEach((key) => {
      colX[key] = xAcc;
      xAcc += colWidths[key];
    });
    const colRight = (key) => colX[key] + colWidths[key];

    let pageNumber = 1;
    let yPos = margin;
    let zebraIndex = 0;

    const setColor = (rgb) => pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setFill = (rgb) => pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    const setDraw = (rgb) => pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

    const drawFooter = () => {
      const itemCount = groupByCategory
        ? processedData.reduce((n, g) => n + g.items.length, 0)
        : processedData.length;
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
        { label: 'Margem', value: formatPctPdf(totalMargem), highlight: true },
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
      pdf.setFontSize(7);
      setColor(colors.muted);
      const headerY = yPos + 4.6;

      if (showCodigo) {
        pdf.text('CÓD.', colX.codigo + 1, headerY);
      }
      pdf.text('DESCRIÇÃO', colX.desc + 1, headerY);
      pdf.text('QTD', colRight.qtd - 1, headerY, { align: 'right' });
      pdf.text('RECEITA', colRight.receita - 1, headerY, { align: 'right' });
      pdf.text('CUSTO', colRight.custo - 1, headerY, { align: 'right' });
      pdf.text('LUCRO', colRight.lucro - 1, headerY, { align: 'right' });
      pdf.text('MARGEM', colRight.margem - 1, headerY, { align: 'right' });

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

    const getRowMargem = (row) => {
      if (row.margem_percentual != null && !Number.isNaN(row.margem_percentual)) {
        return row.margem_percentual;
      }
      const receita = row.receita_liquida ?? row.total_recebido ?? 0;
      return receita > 0 ? ((row.lucro_total || 0) / receita) * 100 : 0;
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
        pdf.text(String(row.nome || 'Sem categoria'), colX.desc + 1, yPos + 4.2);
        yPos += catH;
        return;
      }

      const descPad = 2;
      const descLines = pdf.splitTextToSize(
        row.isSubtotal ? String(row.nome || 'Subtotal') : String(row.nome || '—'),
        colWidths.desc - descPad
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

      if (showCodigo && !isSubtotal) {
        const codigo = String(row.codigo_interno || '').trim();
        if (codigo) {
          pdf.text(codigo, colX.codigo + 1, textY, { maxWidth: colWidths.codigo - 2 });
        }
      }

      descLines.forEach((line, idx) => {
        pdf.text(line, colX.desc + 1, textY + idx * lineHeight);
      });

      const qtdStr = isSubtotal
        ? formatNumPdf(row.quantidade_vendida || 0)
        : `${formatNumPdf(row.quantidade_vendida || 0)} ${row.unidade_exibicao || 'UN'}`;
      pdf.text(qtdStr, colRight.qtd - 1, textY, { align: 'right' });

      pdf.text(formatNumPdf(row.total_recebido || 0), colRight.receita - 1, textY, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      setColor(colors.muted);
      pdf.text(formatNumPdf(row.custo_total || 0), colRight.custo - 1, textY, { align: 'right' });

      pdf.setFont('helvetica', isSubtotal ? 'bold' : 'normal');
      setColor(colors.profit);
      pdf.text(formatNumPdf(row.lucro_total || 0), colRight.lucro - 1, textY, { align: 'right' });

      setColor(isSubtotal ? colors.profit : colors.text);
      pdf.text(formatPctPdf(getRowMargem(row)), colRight.margem - 1, textY, { align: 'right' });

      yPos += rowHeight;
    };

    drawReportHeader();
    drawSummaryKpis();
    drawTableHeader();
    flatRows.forEach(drawDataRow);
    drawFooter();

    pdf.save('relatorio_margem.pdf');
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
    setGroupByCategory(false);
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
            {(searchTerm || selectedTags.length > 0 || groupByCategory) && (
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
                    placeholder="Produto ou código..."
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
                    allTags={allTags}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                    onClose={() => {}}
                  />
                </div>
              )}



              {/* Group Toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Exibição</label>
                <button
                  onClick={() => setGroupByCategory(!groupByCategory)}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    groupByCategory
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {groupByCategory ? '✓ Agrupar por Categoria' : 'Agrupar por Categoria'}
                </button>
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

        {/* Calendar Popup Modal */}
        {showCalendar && (
          <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40 p-3 md:p-4">
            <div className="w-full max-w-[720px] rounded-[28px] bg-white dark:bg-gray-900 p-3 md:p-5 shadow-2xl">
              <CalendarPopup
                dateRange={dateRange}
                setDateRange={setDateRange}
                onClose={() => setShowCalendar(false)}
                isModal={true}
              />
            </div>
          </div>
        )}

        {/* Summary Cards - Markup Destacado */}
         <div className="px-3 md:px-6 py-2.5 md:py-6 space-y-2 md:space-y-3">
           {/* Markup Principal - Destaque */}
           <div className="p-3 md:p-5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
             <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1.5">Markup</p>
             <p className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white">{formatPercent(totalMarkup)}</p>
             <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-300 mt-1.5">Ganho s/ custo</p>
           </div>

           {/* Grid com outras métricas */}
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
               label="CUSTO"
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
             <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
               <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">MARGEM</p>
               <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{formatPercent(totalMargem)}</p>
             </div>
           </div>
           </div>

           {/* Sort Control - Below KPIs */}
           <div className="px-3 md:px-6 py-2.5 flex gap-2 items-center">
            {/* Critério Selecionado - Icon Only */}
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Critério de ordenação">
                    {sortField === 'nome' && <Type className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'lucro_total' && <DollarSign className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'total_recebido' && <TrendingUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'markup_percentual' && <Percent className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                    {sortField === 'margem_percentual' && <Scale className="w-4 h-4 text-gray-700 dark:text-gray-300" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem onClick={() => { setSortField('nome'); setSortOrder('asc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    <span>Nome</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('lucro_total'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Lucro</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('total_recebido'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Receita</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('markup_percentual'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    <span>Markup %</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('margem_percentual'); setSortOrder('desc'); }} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    <span>Margem %</span>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400">CÓDIGO</th>
                      <th 
                        onClick={() => {
                          if (sortField === 'nome') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('nome');
                            setSortOrder('asc');
                          }
                        }}
                        className="text-left py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                        DESCRIÇÃO {sortField === 'nome' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        onClick={() => {
                          if (sortField === 'quantidade_vendida') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('quantidade_vendida');
                            setSortOrder('desc');
                          }
                        }}
                        className="text-center py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                        QUANTIDADE {sortField === 'quantidade_vendida' && (sortOrder === 'asc' ? '↑' : '↓')}
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
                        className="text-right py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                        className="text-right py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
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
                       className="text-center py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                       MARKUP {sortField === 'markup_percentual' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                       onClick={() => {
                         if (sortField === 'margem_percentual') {
                           setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                         } else {
                           setSortField('margem_percentual');
                           setSortOrder('desc');
                         }
                       }}
                       className="text-center py-3 px-4 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300"
                      >
                       MARGEM {sortField === 'margem_percentual' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      </tr>
                  </thead>
                  <tbody>
                    {groupByCategory ? (
                      processedData.map((group) => (
                        <React.Fragment key={group.category}>
                          {/* Category Header */}
                          <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <td colSpan="7" className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                              {group.category}
                            </td>
                          </tr>
                          {/* Items */}
                          {group.items.map((row) => (
                            <tr key={row.codigo_interno} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                              <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{row.codigo_interno}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{row.nome}</td>
                              <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white font-semibold">{row.quantidade_vendida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {row.unidade_exibicao || 'UN'}</td>
                              <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</td>
                              <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatMoney(row.custo_total)}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</td>
                              <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">{formatPercent(row.markup_percentual)}</td>
                              <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">{formatPercent(row.margem_percentual)}</td>
                            </tr>
                          ))}
                          {/* Subtotal Row */}
                          <tr className="bg-gray-50 dark:bg-gray-800/30 border-b-2 border-gray-200 dark:border-gray-700 font-semibold">
                            <td colSpan="2" className="py-3 px-4 text-sm text-gray-900 dark:text-white">SUBTOTAL</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white">{group.totals.quantidade_vendida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatMoney(group.totals.total_recebido)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatMoney(group.totals.custo_total)}</td>
                            <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">{formatMoney(group.totals.lucro_total)}</td>
                            <td className="py-3 px-4 text-sm text-center text-green-600 dark:text-green-400 font-semibold">{formatPercent((group.totals.lucro_total / group.totals.custo_total) * 100)}</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white">{formatPercent((group.totals.lucro_total / group.totals.total_recebido) * 100)}</td>
                            </tr>
                        </React.Fragment>
                      ))
                    ) : (
                      processedData.map((row) => (
                        <tr key={row.codigo_interno || row.nome} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">{row.codigo_interno}</td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">{row.nome}</td>
                          <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white font-semibold">{row.quantidade_vendida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {row.unidade_exibicao || 'UN'}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatMoney(row.custo_total)}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</td>
                          <td className="py-3 px-4 text-sm text-center font-semibold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</td>
                          <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">{formatPercent(row.margem_percentual)}</td>
                          </tr>
                          ))
                          )}
                          </tbody>
                          </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-1.5">
                {groupByCategory ? (
                  processedData.map((group) => (
                    <div key={group.category}>
                      <div className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-xs font-semibold text-gray-900 dark:text-white">
                        {group.category}
                      </div>
                      {group.items.map((row) => (
                        <div key={row.codigo_interno} className="p-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 font-medium truncate">{row.codigo_interno} • {row.nome}</p>
                          <div className="grid grid-cols-3 gap-1.5 text-xs">
                            <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Qtd</p><p className="font-bold text-gray-900 dark:text-white">{row.quantidade_vendida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {row.unidade_exibicao || 'UN'}</p></div>
                            <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Markup</p><p className="font-bold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</p></div>
                            <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Lucro</p><p className="font-bold text-green-600 dark:text-green-400 truncate">{formatMoney(row.lucro_total)}</p></div>
                          </div>
                          </div>
                          ))}
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold">
                          <p className="text-gray-900 dark:text-white truncate">Markup: {formatPercent((group.totals.lucro_total / group.totals.custo_total) * 100)} | Lucro: {formatMoney(group.totals.lucro_total)}</p>
                          </div>
                    </div>
                  ))
                ) : (
                  processedData.map((row) => (
                    <div key={row.codigo_interno} className="p-2 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-1.5 font-medium truncate">{row.codigo_interno} • {row.nome}</p>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                         <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Qtd</p><p className="font-bold text-gray-900 dark:text-white">{row.quantidade_vendida.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {row.unidade_exibicao || 'UN'}</p></div>
                         <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Markup</p><p className="font-bold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</p></div>
                         <div><p className="text-gray-500 dark:text-gray-400 text-[10px]">Lucro</p><p className="font-bold text-green-600 dark:text-green-400 truncate">{formatMoney(row.lucro_total)}</p></div>
                       </div>
                       <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">Margem: {formatPercent(row.margem_percentual)}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 md:mt-6 p-3 md:p-4 text-xs text-gray-600 dark:text-gray-400">
                {processedData.length} produtos
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