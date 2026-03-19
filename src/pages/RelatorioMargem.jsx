import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, Calendar, ArrowUpDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CalendarPopup from '@/components/relatorios/CalendarPopup';
import TagSearchPopup from '@/components/relatorios/TagSearchPopup';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTagPopup, setShowTagPopup] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all products to get current costs and details
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

        if (!reportMap[prodId]) {
          reportMap[prodId] = {
            codigo_interno: product.codigo_interno,
            nome: product.nome,
            categoria: product.categoria_nome,
            vendas_count: 0,
            quantidade_vendida: 0,
            total_recebido: 0,
            custo_unitario_cadastro: product.preco_custo_calculado || 0,
            total_descontos: 0
          };
        }

        const entry = reportMap[prodId];
        entry.vendas_count += 1;
        entry.quantidade_vendida += item.quantidade;
        entry.total_recebido += item.total; // Assuming item.total is net (after discount)
        
        // If item.total already includes discount, we might need to calculate discount if not stored explicitly
        // Assuming item structure has preco_unitario_praticado (net) or discount field.
        // For simplicity, let's assume item.total is final.
      });
    });

    let sorted = Object.values(reportMap).map(item => {
      const custo_total = item.custo_unitario_cadastro * item.quantidade_vendida;
      const lucro_total = item.total_recebido - custo_total;
      const valor_unitario_medio = item.total_recebido / item.quantidade_vendida;
      const margem_percentual = item.total_recebido > 0 ? (lucro_total / item.total_recebido) * 100 : 0;
      const markup_percentual = custo_total > 0 ? (lucro_total / custo_total) * 100 : 0;
      const lucro_marginal = lucro_total / item.quantidade_vendida;

      return {
        ...item,
        custo_total,
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
    if (!processedData.length) return { quantidade_vendida: 0, total_recebido: 0, custo_total: 0, lucro_total: 0 };
    
    if (groupByCategory) {
      return processedData.reduce((acc, group) => ({
        quantidade_vendida: acc.quantidade_vendida + (group.totals?.quantidade_vendida || 0),
        total_recebido: acc.total_recebido + (group.totals?.total_recebido || 0),
        custo_total: acc.custo_total + (group.totals?.custo_total || 0),
        lucro_total: acc.lucro_total + (group.totals?.lucro_total || 0)
      }), { quantidade_vendida: 0, total_recebido: 0, custo_total: 0, lucro_total: 0 });
    }
    return processedData.reduce((acc, item) => ({
      quantidade_vendida: acc.quantidade_vendida + (item.quantidade_vendida || 0),
      total_recebido: acc.total_recebido + (item.total_recebido || 0),
      custo_total: acc.custo_total + (item.custo_total || 0),
      lucro_total: acc.lucro_total + (item.lucro_total || 0)
    }), { quantidade_vendida: 0, total_recebido: 0, custo_total: 0, lucro_total: 0 });
  }, [processedData, groupByCategory]);

  const totalMargem = totals.total_recebido > 0 ? (totals.lucro_total / totals.total_recebido) * 100 : 0;
  const totalMarkup = totals.custo_total > 0 ? (totals.lucro_total / totals.custo_total) * 100 : 0;

  const formatMoney = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercent = (val) => `${val.toFixed(2)}%`;

  const exportToCSV = () => {
    const headers = "Codigo;Produto;Categoria;Qtd Vendida;Valor Medio;Total Recebido;Custo Unit;Custo Total;Lucro Total;Margem %;Markup %\n";
    const rows = processedData.map(row => 
      `${row.codigo_interno};${row.nome};${row.categoria};${row.quantidade_vendida};${row.valor_unitario_medio.toFixed(2)};${row.total_recebido.toFixed(2)};${row.custo_unitario_cadastro.toFixed(2)};${row.custo_total.toFixed(2)};${row.lucro_total.toFixed(2)};${row.margem_percentual.toFixed(2)};${row.markup_percentual.toFixed(2)}`
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
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;
    
    // Header
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Relatório de Margem de Vendas', margin, yPos);
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`, margin, yPos);
    yPos += 5;
    
    // Summary Box
    pdf.setFillColor(250, 252, 250);
    pdf.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 1, 1, 'F');
    
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Receita: R$ ${(totals.total_recebido || 0).toFixed(2).replace('.', ',')}  |  Custo: R$ ${(totals.custo_total || 0).toFixed(2).replace('.', ',')}`, margin + 1.5, yPos + 2.5);
    
    pdf.setTextColor(34, 139, 34);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Lucro: R$ ${(totals.lucro_total || 0).toFixed(2).replace('.', ',')}  |  Margem: ${totalMargem.toFixed(1)}%`, margin + 1.5, yPos + 5.5);
    pdf.setTextColor(0, 0, 0);
    
    yPos += 12;
    
    // Table Header
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(50, 50, 50);
    
    const colWidths = [12, 45, 12, 18, 20, 20, 18];
    const headers = ['CÓDIGO', 'DESCRIÇÃO', 'QTD', 'RECEITA', 'CUSTO', 'LUCRO', 'MARGEM %'];
    let xPos = margin;
    
    headers.forEach((h, i) => {
      pdf.text(h, xPos + 0.5, yPos + 2.5);
      xPos += colWidths[i];
    });
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos + 4, pageWidth - margin, yPos + 4);
    yPos += 5;
    
    // Data rows
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(40, 40, 40);
    
    const rows = groupByCategory ? 
      processedData.flatMap(group => [
        ...group.items,
        { ...group.totals, nome: 'SUBTOTAL', isSubtotal: true, codigo_interno: '' }
      ]) : 
      processedData;
    
    rows.forEach((row) => {
      if (yPos > pageHeight - margin - 6) {
        pdf.addPage();
        yPos = margin;
      }
      
      if (row.isSubtotal) {
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(34, 139, 34);
        pdf.setFillColor(245, 252, 245);
        pdf.rect(margin, yPos - 1.5, pageWidth - 2 * margin, 4, 'F');
      } else {
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(40, 40, 40);
      }
      
      xPos = margin;
      
      // Código
      pdf.text(row.codigo_interno || '', xPos + 0.5, yPos + 1);
      xPos += colWidths[0];
      
      // Descrição (esquerda)
      const desc = row.nome ? row.nome.substring(0, 25) : '';
      pdf.text(desc, xPos + 0.5, yPos + 1);
      xPos += colWidths[1];
      
      // Qtd (centro)
      pdf.text((row.quantidade_vendida || 0).toString(), xPos + 3, yPos + 1, { align: 'right' });
      xPos += colWidths[2];
      
      // Receita (direita)
      pdf.text(`R$ ${(row.total_recebido || 0).toFixed(2).replace('.', ',')}`, xPos + colWidths[3] - 0.5, yPos + 1, { align: 'right' });
      xPos += colWidths[3];
      
      // Custo (direita)
      pdf.text(`R$ ${(row.custo_total || 0).toFixed(2).replace('.', ',')}`, xPos + colWidths[4] - 0.5, yPos + 1, { align: 'right' });
      xPos += colWidths[4];
      
      // Lucro (direita)
      if (row.isSubtotal) {
        pdf.text(`R$ ${(row.lucro_total || 0).toFixed(2).replace('.', ',')}`, xPos + colWidths[5] - 0.5, yPos + 1, { align: 'right' });
      } else {
        pdf.setTextColor(34, 139, 34);
        pdf.text(`R$ ${(row.lucro_total || 0).toFixed(2).replace('.', ',')}`, xPos + colWidths[5] - 0.5, yPos + 1, { align: 'right' });
        pdf.setTextColor(40, 40, 40);
      }
      xPos += colWidths[5];
      
      // Margem % (centro)
      const margem = `${((row.lucro_total || 0) / (row.total_recebido || 1) * 100).toFixed(1)}%`;
      pdf.text(margem, xPos + 6, yPos + 1, { align: 'center' });
      
      yPos += 4;
    });
    
    // Footer
    pdf.setFontSize(6);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | ${processedData.length} itens`, margin, pageHeight - 4);
    
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

          {/* Search Bar + Filters - compactado no mobile */}
          <div className="mt-3 md:mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
            {/* Date Picker */}
            <div className="relative z-50 flex-shrink-0">
              <button
                onClick={() => { setShowDatePicker(!showDatePicker); setShowTagPopup(false); }}
                className="p-1.5 md:p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                title="Período"
              >
                <Calendar className="w-3.5 md:w-4 h-3.5 md:h-4" />
              </button>
              {showDatePicker && (
                <CalendarPopup
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>
            
            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => { setShowTagPopup(!showTagPopup); setShowDatePicker(false); }}
                  className={`px-1.5 md:px-2 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition flex-shrink-0 ${selectedTags.length > 0 ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Tags"
                >
                  {selectedTags.length > 0 ? selectedTags.length : '🏷'}
                </button>
                {showTagPopup && (
                  <TagSearchPopup
                    allTags={allTags}
                    selectedTags={selectedTags}
                    setSelectedTags={setSelectedTags}
                    onClose={() => setShowTagPopup(false)}
                  />
                )}
              </div>
            )}
            
            {/* Group Toggle */}
            <button
              onClick={() => setGroupByCategory(!groupByCategory)}
              className={`flex-shrink-0 px-1.5 md:px-3 py-1.5 md:py-2 rounded text-xs md:text-sm font-medium transition ${
                groupByCategory
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Agrupar"
            >
              ⊕
            </button>

            {/* Search - oculto no mobile extra pequeno */}
            <div className="relative flex-1 hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Procurar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 md:py-2 bg-gray-50 dark:bg-gray-800 rounded text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              />
            </div>

            {/* Mobile Sort Button */}
            <div className="md:hidden flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 md:p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Ordenar">
                    <ArrowUpDown className="w-3.5 md:w-4 h-3.5 md:h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700 text-xs md:text-sm">
                  {[
                    { label: 'Produto', field: 'nome' },
                    { label: 'Qnt', field: 'quantidade_vendida' },
                    { label: 'Receita', field: 'total_recebido' },
                    { label: 'Lucro', field: 'lucro_total' },
                  ].map(opt => (
                    <DropdownMenuItem
                      key={opt.field}
                      onClick={() => {
                        if (sortField === opt.field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortField(opt.field); setSortOrder('desc'); }
                      }}
                      className={`dark:text-gray-200 cursor-pointer ${sortField === opt.field ? 'font-semibold' : ''}`}
                    >
                      {opt.label} {sortField === opt.field && (sortOrder === 'asc' ? '↑' : '↓')}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Summary Cards - Markup Destacado */}
        <div className="px-3 md:px-6 py-2.5 md:py-6 space-y-2 md:space-y-3">
          {/* Markup Principal - Destaque */}
          <div className="p-3 md:p-5 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30">
            <p className="text-[10px] md:text-xs text-green-700 dark:text-green-400 font-bold uppercase mb-1.5">Markup</p>
            <p className="text-2xl md:text-4xl font-bold text-green-600 dark:text-green-400">{formatPercent(totalMarkup)}</p>
            <p className="text-[10px] md:text-xs text-green-600/70 dark:text-green-400/70 mt-1.5">Ganho s/ custo</p>
          </div>
          
          {/* Grid com outras métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">RECEITA</p>
              <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.total_recebido)}</p>
            </div>
            <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">CUSTO</p>
              <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.custo_total)}</p>
            </div>
            <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">LUCRO</p>
              <p className="text-xs md:text-lg md:text-xl font-semibold text-green-600 dark:text-green-400">{formatMoney(totals.lucro_total)}</p>
            </div>
            <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">MARGEM</p>
              <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{formatPercent(totalMargem)}</p>
            </div>
          </div>
        </div>

        {/* Table - Desktop Table / Mobile Cards */}
        <div className="p-4 md:p-6" id="relatorio-table">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : processedData.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                              <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white font-semibold">{row.quantidade_vendida}</td>
                              <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</td>
                              <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatMoney(row.custo_total)}</td>
                              <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</td>
                              <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">{formatPercent(row.margem_percentual)}</td>
                            </tr>
                          ))}
                          {/* Subtotal Row */}
                          <tr className="bg-gray-50 dark:bg-gray-800/30 border-b-2 border-gray-200 dark:border-gray-700 font-semibold">
                            <td colSpan="2" className="py-3 px-4 text-sm text-gray-900 dark:text-white">SUBTOTAL</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white">{group.totals.quantidade_vendida}</td>
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
                          <td className="py-3 px-4 text-sm text-center text-gray-900 dark:text-white font-semibold">{row.quantidade_vendida}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">{formatMoney(row.custo_total)}</td>
                          <td className="py-3 px-4 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</td>
                          <td className="py-3 px-4 text-sm text-center font-semibold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</td>
                          <td className="py-3 px-4 text-sm text-center font-semibold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</td>
                          <td className="py-3 px-4 text-sm text-center font-semibold text-gray-900 dark:text-white">{formatPercent(row.margem_percentual)}</td>
                          </tr>
                          ))
                          )}
                          </tbody>
                          </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {groupByCategory ? (
                  processedData.map((group) => (
                    <div key={group.category}>
                      <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-900 dark:text-white">
                        {group.category}
                      </div>
                      {group.items.map((row) => (
                        <div key={row.codigo_interno} className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 font-medium">{row.codigo_interno} • {row.nome}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div><p className="text-gray-500 dark:text-gray-400">Qtd</p><p className="font-bold text-gray-900 dark:text-white">{row.quantidade_vendida}</p></div>
                            <div><p className="text-gray-500 dark:text-gray-400">Markup</p><p className="font-bold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</p></div>
                            <div><p className="text-gray-500 dark:text-gray-400">Lucro</p><p className="font-bold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</p></div>
                          </div>
                          </div>
                          ))}
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold">
                          <p className="text-gray-900 dark:text-white">Markup: {formatPercent((group.totals.lucro_total / group.totals.custo_total) * 100)} | Lucro: {formatMoney(group.totals.lucro_total)}</p>
                          </div>
                    </div>
                  ))
                ) : (
                  processedData.map((row) => (
                    <div key={row.codigo_interno} className="p-3 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">{row.codigo_interno} • {row.nome}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                         <div><p className="text-gray-500 dark:text-gray-400">Qtd</p><p className="font-bold text-gray-900 dark:text-white">{row.quantidade_vendida}</p></div>
                         <div><p className="text-gray-500 dark:text-gray-400">Markup</p><p className="font-bold text-green-600 dark:text-green-400">{formatPercent(row.markup_percentual)}</p></div>
                         <div><p className="text-gray-500 dark:text-gray-400">Lucro</p><p className="font-bold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</p></div>
                       </div>
                       <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Margem: {formatPercent(row.margem_percentual)}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 p-4 text-xs text-gray-600 dark:text-gray-400">
                Total de produtos: {processedData.length}
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