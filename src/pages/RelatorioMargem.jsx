import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Printer, Loader2, ArrowLeft, Search, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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

      // Load sales (we filter by date in memory or fetch all for now due to API limitations with complex filters)
      // For production, better to filter by date in query if possible. 
      // Assuming .list() returns enough or we use .filter()
      const allSales = await base44.entities.PedidoVenda.filter({ status: ['Finalizado', 'Aprovado', 'Entregue', 'Concluido'] });
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
      const saleDate = new Date(sale.created_date); // Adjust if needed
      if (dateRange?.from && saleDate < dateRange.from) return;
      if (dateRange?.to && saleDate > new Date(dateRange.to.getTime() + 86400000)) return; // End of day

      sale.itens.forEach(item => {
        const prodId = item.produto_id;
        const product = prodMap[prodId];
        if (!product) return;

        // Apply Filters
        if (selectedProduct !== 'all' && prodId !== selectedProduct) return;
        if (selectedCategory !== 'all' && product.categoria_nome !== selectedCategory) return;

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
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 10;
    
    // Header
    pdf.setFontSize(16);
    pdf.text('Relatório de Margem de Vendas', 10, yPos);
    yPos += 8;
    pdf.setFontSize(10);
    pdf.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`, 10, yPos);
    yPos += 10;
    
    // Summary
    pdf.setFontSize(9);
    pdf.text(`Receita: ${formatMoney(totals.total_recebido)} | Custo: ${formatMoney(totals.custo_total)} | Lucro: ${formatMoney(totals.lucro_total)}`, 10, yPos);
    yPos += 8;
    
    // Table
    const columns = ['Código', 'Produto', 'Qtd', 'Receita', 'Custo', 'Lucro', 'Margem %'];
    const colWidths = [12, 45, 12, 25, 25, 25, 22];
    let xPos = 10;
    
    // Header row
    pdf.setFillColor(240, 240, 240);
    let totalWidth = 0;
    columns.forEach((col, i) => {
      pdf.rect(xPos + totalWidth, yPos, colWidths[i], 7, 'F');
      pdf.setFontSize(8);
      pdf.text(col, xPos + totalWidth + 1, yPos + 5);
      totalWidth += colWidths[i];
    });
    yPos += 8;
    
    // Data rows
    pdf.setFontSize(8);
    const rows = groupByCategory ? 
      processedData.flatMap(group => [
        ...group.items,
        { ...group.totals, nome: 'SUBTOTAL', isSubtotal: true, codigo_interno: '' }
      ]) : 
      processedData;
    
    rows.forEach(row => {
      if (yPos > pageHeight - 15) {
        pdf.addPage();
        yPos = 10;
      }
      
      totalWidth = 0;
      const rowData = [
        row.codigo_interno || '',
        row.nome || '',
        (row.quantidade_vendida || 0).toString(),
        `R$${(row.total_recebido || 0).toFixed(0)}`,
        `R$${(row.custo_total || 0).toFixed(0)}`,
        `R$${(row.lucro_total || 0).toFixed(0)}`,
        `${((row.lucro_total || 0) / (row.total_recebido || 1) * 100).toFixed(1)}%`
      ];
      
      if (row.isSubtotal) pdf.setFillColor(250, 250, 250);
      
      colWidths.forEach((width, i) => {
        pdf.text(rowData[i], xPos + totalWidth + 1, yPos + 4);
        totalWidth += width;
      });
      yPos += 6;
    });
    
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
        <div className="p-4 md:p-6 sticky top-0 z-10 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Link to="/Relatorios">
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-glacial font-semibold text-gray-900 dark:text-white">Relatório de Margem</h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Análise de rentabilidade por produto</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterScreen(true)}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition"
              >
                Filtros
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-700 dark:text-gray-200" title="Opções de impressão">
                    <Printer className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem onClick={exportToPDF} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer">
                    Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search Bar + Filters */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Procurar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  title="Selecionar período"
                >
                  <Calendar className="w-4 h-4" />
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
                <div className="relative">
                  <button
                    onClick={() => setShowTagPopup(!showTagPopup)}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Filtrar por tags"
                  >
                    #{selectedTags.length > 0 ? selectedTags.length : ''}
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
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  groupByCategory
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Agrupar por categoria"
              >
                Agrupar
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-6 py-4 md:py-6">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">RECEITA</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.total_recebido)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">CUSTO</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.custo_total)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">LUCRO</p>
            <p className="text-lg md:text-2xl font-semibold text-green-600 dark:text-green-400">{formatMoney(totals.lucro_total)}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">MARGEM</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatPercent(totalMargem)}</p>
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
                            <div><p className="text-gray-500 dark:text-gray-400">Receita</p><p className="font-semibold text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</p></div>
                            <div><p className="text-gray-500 dark:text-gray-400">Lucro</p><p className="font-bold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</p></div>
                          </div>
                        </div>
                      ))}
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold">
                        <p className="text-gray-900 dark:text-white">SUBTOTAL: {formatMoney(group.totals.lucro_total)} ({formatPercent((group.totals.lucro_total / group.totals.total_recebido) * 100)})</p>
                      </div>
                    </div>
                  ))
                ) : (
                  processedData.map((row) => (
                    <div key={row.codigo_interno} className="p-3 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 font-medium">{row.codigo_interno} • {row.nome}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-gray-500 dark:text-gray-400">Qtd</p><p className="font-bold text-gray-900 dark:text-white">{row.quantidade_vendida}</p></div>
                        <div><p className="text-gray-500 dark:text-gray-400">Receita</p><p className="font-semibold text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</p></div>
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