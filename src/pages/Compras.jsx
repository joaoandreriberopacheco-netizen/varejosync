import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { ShoppingCart, PlusCircle, Search, Edit, Eye, User, Truck, DollarSign, CalendarRange, FileText, Weight, Package as PackageIcon, Calendar, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';
import PedidoCompraForm from '../components/compras/PedidoCompraForm';
import SugestaoCompra from '../components/compras/SugestaoCompra';
import CotacoesManager from '../components/compras/CotacoesManager';

import ImportadorNotaFiscal from '../components/compras/ImportadorNotaFiscal';
import DetalhesSupermanifesto from '../components/compras/DetalhesSupermanifesto';

const getStatusBadge = (status) => {
  const variants = {
    'Rascunho': 'bg-gray-100 text-gray-800',
    'Enviado': 'bg-blue-100 text-blue-800',
    'Aguardando Recepção': 'bg-yellow-100 text-yellow-800',
    'Recebido Parcialmente': 'bg-orange-100 text-orange-800',
    'Recebido': 'bg-emerald-100 text-emerald-800',
    'Recebido com Discrepância': 'bg-red-100 text-red-800',
    'Cancelado': 'bg-red-100 text-red-800'
  };
  return variants[status] || 'bg-gray-100 text-gray-800';
};

const PedidosCompraTab = () => {
  const [pedidos, setPedidos] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showImportador, setShowImportador] = useState(false);

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      const data = await base44.entities.PedidoCompra.list('-created_date');
      setPedidos(data);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    }
  };

  const handleEdit = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setPedidoSelecionado(null);
    setIsFormOpen(true);
  };

  const handleVerDetalhes = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsFormOpen(true);
  };

  const handleSave = async (pedidoData) => {
    try {
      // Ensure numeric fields are numbers to prevent "NaN" issues or API errors
      const sanitizedData = {
        ...pedidoData,
        // Ensure numeric fields are actually numbers
        valor_total: Number(pedidoData.valor_total) || 0,
        valor_frete: Number(pedidoData.valor_frete) || 0,
        valor_desconto: Number(pedidoData.valor_desconto) || 0
      };

      if (sanitizedData.id) {
        await base44.entities.PedidoCompra.update(sanitizedData.id, sanitizedData);
      } else {
        const { id, ...newPedido } = sanitizedData;
        
        if (!newPedido.numero) {
           const count = pedidos.length + 1;
           newPedido.numero = `PC-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
        }
        
        await base44.entities.PedidoCompra.create(newPedido);
      }
      await loadPedidos();
      // setIsFormOpen(false); // Mantendo aberto para feedback
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      throw error; 
    }
  };

  let pedidosFiltrados = pedidos.filter(pedido => {
    const matchSearch = pedido.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       pedido.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFiltro === 'todos' || pedido.status === statusFiltro;
    return matchSearch && matchStatus;
  });

  if (dataInicio && dataFim) {
    const inicio = startOfDay(new Date(dataInicio));
    const fim = endOfDay(new Date(dataFim));
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      if (!p.created_date) return false;
      const pedidoDate = parseISO(p.created_date);
      return isWithinInterval(pedidoDate, { start: inicio, end: fim });
    });
  } else if (dataInicio) {
    const inicio = startOfDay(new Date(dataInicio));
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      if (!p.created_date) return false;
      const pedidoDate = parseISO(p.created_date);
      return pedidoDate >= inicio;
    });
  } else if (dataFim) {
    const fim = endOfDay(new Date(dataFim));
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      if (!p.created_date) return false;
      const pedidoDate = parseISO(p.created_date);
      return pedidoDate <= fim;
    });
  }

  const subtotalFiltrado = pedidosFiltrados.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  const quantidadeFiltrada = pedidosFiltrados.length;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Filtros e Ações - Glacial: Limpo, sem bordas pesadas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por Nº ou fornecedor..." 
                className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all dark:bg-gray-900 dark:text-gray-200 rounded-lg" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full sm:w-[180px] bg-gray-50 border-transparent focus:bg-white transition-all dark:bg-gray-900 dark:text-gray-200 rounded-lg">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Enviado">Enviado</SelectItem>
                <SelectItem value="Aguardando Recepção">Aguardando Recepção</SelectItem>
                <SelectItem value="Recebido Parcialmente">Recebido Parcialmente</SelectItem>
                <SelectItem value="Recebido">Recebido</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="ml-auto flex gap-2 w-full sm:w-auto">
              <Button onClick={() => setShowImportador(true)} variant="outline" className="gap-2 w-full sm:w-auto rounded-lg shadow-sm border-teal-200 text-teal-700 hover:bg-teal-50">
                <FileText className="w-4 h-4" />
                Importar NF
              </Button>
              <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 w-full sm:w-auto rounded-lg shadow-sm">
                <PlusCircle className="w-4 h-4" />
                Novo Pedido
              </Button>
            </div>
          </div>

          {/* Filtros de Data Compactos */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 pt-3 border-t border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
              <CalendarRange className="w-3 h-3" />
              Período
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="flex-1 sm:w-32 h-9 text-xs bg-gray-50 border-transparent rounded-lg"
              />
              <span className="text-gray-400">-</span>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="flex-1 sm:w-32 h-9 text-xs bg-gray-50 border-transparent rounded-lg"
              />
            </div>
            {(dataInicio || dataFim) && (
              <Button variant="ghost" size="sm" onClick={() => { setDataInicio(''); setDataFim(''); }} className="h-8 text-xs text-gray-500 hover:text-gray-700">
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Totais - Glacial: Texto grande e limpo */}
      <div className="flex items-baseline gap-4 px-1">
        <h2 className="text-xl md:text-2xl font-light text-gray-900 dark:text-gray-100">
          <span className="font-semibold">R$ {formatValor(subtotalFiltrado)}</span>
          <span className="text-xs md:text-sm text-gray-500 ml-2 font-normal">em {quantidadeFiltrada} pedidos</span>
        </h2>
      </div>

      {/* Lista Cards - Glacial */}
      <div className="grid gap-3 md:gap-3">
        {/* Responsive: Cards for Mobile, Table for Desktop */}
        {pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-700">
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-gray-500">Número</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fornecedor</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Emissão</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Entrega</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-gray-100 dark:border-gray-700 transition-colors">
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {pedido.numero}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {pedido.status}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">
                        {pedido.fornecedor_nome}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                        {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
                         {pedido.data_prevista_entrega ? format(new Date(pedido.data_prevista_entrega), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900 dark:text-white">
                        {formatValor(pedido.valor_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(pedido)} className="h-8 w-8 p-0 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(pedido)} className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden grid gap-4 px-1">
              {pedidosFiltrados.map(pedido => (
                <div key={pedido.id} className="group bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-200 shadow-sm">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-300 shadow-sm">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{pedido.numero}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{pedido.status}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-3.5 h-3.5" />
                            <span className="truncate">{pedido.fornecedor_nome}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleVerDetalhes(pedido)} className="h-9 w-9 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pedido)} className="h-9 w-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5">Criação</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM') : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5">Entrega</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {pedido.data_prevista_entrega ? format(new Date(pedido.data_prevista_entrega), 'dd/MM') : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5">Total</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          R$ {formatValor(pedido.valor_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <PedidoCompraForm
            pedido={pedidoSelecionado}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSave={handleSave}
          />
        </Dialog>
      )}

      <ImportadorNotaFiscal 
        isOpen={showImportador}
        onClose={() => setShowImportador(false)}
        onSuccess={loadPedidos}
      />
    </div>
  );
};

import GestaoManifestos from '../components/compras/GestaoManifestos';
import GestaoSupermanifestos from '../components/compras/GestaoSupermanifestos';

const HubLogisticoTab = () => {
  return <GestaoManifestos />;
};

const SupermanifestosTab = () => {
  return <GestaoSupermanifestos />;
};

export default function ComprasPage() {
  const [sugestaoKey, setSugestaoKey] = useState(0);

  const handleTabChange = (value) => {
    if (value === 'sugestoes') {
      setSugestaoKey(prev => prev + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 py-4 md:p-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-light text-gray-800 dark:text-gray-200">Módulo de Compras</h1>
        <p className="text-sm text-gray-500 font-light">Gestão completa do ciclo de suprimentos</p>
      </div>

      <Tabs defaultValue="sugestoes" onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
          <TabsTrigger 
            value="sugestoes" 
            className="flex-1 sm:flex-none border-b-2 border-transparent data-[state=active]:border-teal-600 rounded-none py-3 px-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-teal-700 font-medium transition-all flex items-center justify-center sm:justify-start gap-2"
          >
            <ShoppingCart className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Sugestões</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cotacoes" 
            className="flex-1 sm:flex-none border-b-2 border-transparent data-[state=active]:border-teal-600 rounded-none py-3 px-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-teal-700 font-medium transition-all flex items-center justify-center sm:justify-start gap-2"
          >
            <FileText className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Cotações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="pedidos" 
            className="flex-1 sm:flex-none border-b-2 border-transparent data-[state=active]:border-teal-600 rounded-none py-3 px-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-teal-700 font-medium transition-all flex items-center justify-center sm:justify-start gap-2"
          >
            <DollarSign className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Pedidos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="hub-logistico" 
            className="flex-1 sm:flex-none border-b-2 border-transparent data-[state=active]:border-teal-600 rounded-none py-3 px-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-teal-700 font-medium transition-all flex items-center justify-center sm:justify-start gap-2"
          >
            <Truck className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Hub Logístico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sugestoes" className="outline-none animate-in fade-in-50 duration-300">
          <SugestaoCompra key={sugestaoKey} />
        </TabsContent>

        <TabsContent value="cotacoes" className="outline-none animate-in fade-in-50 duration-300">
          <CotacoesManager />
        </TabsContent>

        <TabsContent value="pedidos" className="outline-none animate-in fade-in-50 duration-300">
          <PedidosCompraTab />
        </TabsContent>

        <TabsContent value="hub-logistico" className="outline-none animate-in fade-in-50 duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-100 dark:border-gray-700 shadow-sm mt-4">
            <Tabs defaultValue="manifestos" className="w-full">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-6 border-b border-gray-100 dark:border-gray-800 rounded-none mb-4">
                <TabsTrigger 
                  value="manifestos" 
                  className="px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Manifestos
                </TabsTrigger>
                <TabsTrigger 
                  value="supermanifestos" 
                  className="px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 dark:data-[state=active]:border-gray-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center gap-2"
                >
                  <PackageIcon className="w-4 h-4" />
                  Supermanifestos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manifestos" className="p-2 mt-0">
                <GestaoManifestos />
              </TabsContent>
              
              <TabsContent value="supermanifestos" className="p-2 mt-0">
                <GestaoSupermanifestos />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}