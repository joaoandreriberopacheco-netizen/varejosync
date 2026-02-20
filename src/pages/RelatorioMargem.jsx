import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Printer, Loader2, ArrowLeft, ArrowUpDown, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

export default function RelatorioMargemVendas() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() });
  
  // Filters
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lucro_total');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTags, setSelectedTags] = useState([]);
  
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

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      sorted = sorted.filter(item => 
        item.nome.toLowerCase().includes(term) || 
        item.codigo_interno.toLowerCase().includes(term)
      );
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      sorted = sorted.filter(item => 
        item.tags && selectedTags.some(tag => item.tags.includes(tag))
      );
    }

    // Sort data
    sorted.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [sales, products, dateRange, selectedProduct, selectedCategory, searchTerm, sortBy, sortOrder, selectedTags]);

  const totals = useMemo(() => {
    return processedData.reduce((acc, item) => ({
      quantidade_vendida: acc.quantidade_vendida + item.quantidade_vendida,
      total_recebido: acc.total_recebido + item.total_recebido,
      custo_total: acc.custo_total + item.custo_total,
      lucro_total: acc.lucro_total + item.lucro_total
    }), { quantidade_vendida: 0, total_recebido: 0, custo_total: 0, lucro_total: 0 });
  }, [processedData]);

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

  const exportToPDF = async () => {
    const table = document.getElementById('relatorio-table');
    if (!table) return;
    
    const canvas = await html2canvas(table, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    
    const imgWidth = pdf.internal.pageSize.getWidth() - 10;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let yPos = 10;
    
    pdf.setFontSize(16);
    pdf.text('Relatório de Margem de Vendas', 10, 5);
    pdf.setFontSize(10);
    pdf.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`, 10, 10);
    
    yPos = 20;
    pdf.addImage(imgData, 'PNG', 5, yPos, imgWidth, imgHeight);
    
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
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
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
            <div className="flex gap-2">
              <button onClick={exportToCSV} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition hidden sm:flex items-center gap-2 text-gray-700 dark:text-gray-200" title="Exportar CSV">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={exportToPDF} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition hidden sm:flex items-center gap-2 text-gray-700 dark:text-gray-200" title="Exportar PDF">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas categorias</option>
                  {[...new Set(products.map(p => p.categoria_nome).filter(Boolean))].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lucro_total">Lucro (desc)</option>
                  <option value="margem_percentual">Margem %</option>
                  <option value="quantidade_vendida">Quantidade</option>
                  <option value="total_recebido">Receita</option>
                  <option value="nome">Nome (A-Z)</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Alternar ordem"
                >
                  <ArrowUpDown className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-4 md:p-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow-sm">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">RECEITA</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.total_recebido)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow-sm">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">CUSTO</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatMoney(totals.custo_total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow-sm">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">LUCRO</p>
            <p className="text-lg md:text-2xl font-semibold text-green-600">{formatMoney(totals.lucro_total)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow-sm">
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">MARGEM</p>
            <p className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">{formatPercent(totalMargem)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 mx-4 md:mx-6 mb-6 rounded-lg shadow-sm overflow-hidden" id="relatorio-table">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">CÓDIGO</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">PRODUTO</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">QTD</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">V.UNIT</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">RECEITA</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">CUSTO</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">LUCRO</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">MARGEM%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.length > 0 ? (
                      processedData.map((row) => (
                        <tr key={row.codigo_interno || row.nome} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">{row.codigo_interno}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.nome}</td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{row.quantidade_vendida}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 text-xs">{formatMoney(row.valor_unitario_medio)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatMoney(row.total_recebido)}</td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 text-xs">{formatMoney(row.custo_total)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(row.lucro_total)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatPercent(row.margem_percentual)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-gray-500 dark:text-gray-400">
                          Nenhum dado encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400">
                Total de produtos: {processedData.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}