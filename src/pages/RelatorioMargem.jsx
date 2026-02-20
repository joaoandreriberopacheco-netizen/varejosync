import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download, Filter, Loader2, ArrowLeft, ArrowUpDown, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

    // Sort data
    sorted.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [sales, products, dateRange, selectedProduct, selectedCategory, searchTerm, sortBy, sortOrder]);

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
    
    // Title
    pdf.setFontSize(16);
    pdf.text('Relatório de Margem de Vendas', 10, 5);
    pdf.setFontSize(10);
    pdf.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`, 10, 10);
    
    yPos = 20;
    pdf.addImage(imgData, 'PNG', 5, yPos, imgWidth, imgHeight);
    
    pdf.save('relatorio_margem.pdf');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link to="/Relatorios">
                <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4"/></Button>
             </Link>
             <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Margem de Vendas</h1>
                <p className="text-sm text-gray-500">Análise detalhada de rentabilidade por produto</p>
             </div>
          </div>
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
              <div className="space-y-2 min-w-[200px]">
                <label className="text-sm font-medium">Categoria</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {[...new Set(products.map(p => p.categoria_nome).filter(Boolean))].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" onClick={loadData} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4 mr-2" />}
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card className="bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                 <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Total Recebido</p>
                 <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatMoney(totals.total_recebido)}</p>
              </CardContent>
           </Card>
           <Card className="bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800">
              <CardContent className="p-4 text-center">
                 <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Custo Total (Cadastro)</p>
                 <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatMoney(totals.custo_total)}</p>
              </CardContent>
           </Card>
           <Card className="bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="p-4 text-center">
                 <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Lucro Total</p>
                 <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatMoney(totals.lucro_total)}</p>
              </CardContent>
           </Card>
           <Card className="bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                 <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Margem Média</p>
                 <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatPercent(totalMargem)}</p>
              </CardContent>
           </Card>
        </div>

        <Card>
          <CardContent className="p-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Vl. Médio</TableHead>
                  <TableHead className="text-right">Total Recebido</TableHead>
                  <TableHead className="text-right">Custo Unit. (Cad)</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead className="text-right">Markup %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.length > 0 ? (
                  processedData.map((row) => (
                    <TableRow key={row.codigo_interno || row.nome} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="text-xs font-mono">{row.codigo_interno}</TableCell>
                      <TableCell className="font-medium">{row.nome}</TableCell>
                      <TableCell className="text-xs text-gray-500">{row.categoria}</TableCell>
                      <TableCell className="text-right">{row.quantidade_vendida}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.valor_unitario_medio)}</TableCell>
                      <TableCell className="text-right font-bold">{formatMoney(row.total_recebido)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatMoney(row.custo_unitario_cadastro)}</TableCell>
                      <TableCell className="text-right text-gray-500">{formatMoney(row.custo_total)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatMoney(row.lucro_total)}</TableCell>
                      <TableCell className="text-right">{formatPercent(row.margem_percentual)}</TableCell>
                      <TableCell className="text-right">{formatPercent(row.markup_percentual)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}