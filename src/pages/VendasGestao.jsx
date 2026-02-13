import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Edit, ShoppingCart, Eye, Calendar, FileText, CheckCircle2, Clock, DollarSign, MoreHorizontal, Plus } from 'lucide-react';
import PedidoVendaForm from '@/components/vendas/PedidoVendaForm';
import DetalhesPedidoVenda from '@/components/vendas/DetalhesPedidoVenda';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function VendasGestaoPage() {
  const [pedidos, setPedidos] = useState([]);
  const [rascunhos, setRascunhos] = useState([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState([]);
  const [rascunhosFiltrados, setRascunhosFiltrados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [stats, setStats] = useState({
    orcamentos: 0,
    aprovados: 0,
    finalizados: 0,
    totalMes: 0
  });

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    setIsLoading(true);
    const data = await base44.entities.PedidoVenda.list('-created_date');
    setPedidos(data);
    
    const rascData = await base44.entities.RascunhoPedidoVenda.list('-created_date');
    setRascunhos(rascData);
    
    // Calcular estatísticas
    const stats = {
      orcamentos: data.filter(p => p.status === 'Orçamento').length,
      aprovados: data.filter(p => p.status === 'Aprovado').length,
      finalizados: data.filter(p => p.status === 'Finalizado').length,
      totalMes: data.filter(p => 
        p.status === 'Finalizado' && 
        new Date(p.created_date).getMonth() === new Date().getMonth() &&
        new Date(p.created_date).getFullYear() === new Date().getFullYear()
      ).reduce((acc, p) => acc + (p.valor_total || 0), 0)
    };
    setStats(stats);
    setIsLoading(false);
  };

  useEffect(() => {
    let currentFiltered = pedidos;

    if (searchTerm) {
      currentFiltered = currentFiltered.filter(p =>
        p.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFiltro !== 'todos') {
      currentFiltered = currentFiltered.filter(p => p.status === statusFiltro);
    }

    // Filtro de data
    if (dataInicio && dataFim) {
      const inicio = startOfDay(new Date(dataInicio));
      const fim = endOfDay(new Date(dataFim));
      currentFiltered = currentFiltered.filter(p => {
        if (!p.created_date) return false;
        const pedidoDate = parseISO(p.created_date);
        return isWithinInterval(pedidoDate, { start: inicio, end: fim });
      });
    } else if (dataInicio) {
      const inicio = startOfDay(new Date(dataInicio));
      currentFiltered = currentFiltered.filter(p => {
        if (!p.created_date) return false;
        const pedidoDate = parseISO(p.created_date);
        return pedidoDate >= inicio;
      });
    } else if (dataFim) {
      const fim = endOfDay(new Date(dataFim));
      currentFiltered = currentFiltered.filter(p => {
        if (!p.created_date) return false;
        const pedidoDate = parseISO(p.created_date);
        return pedidoDate <= fim;
      });
    }

    setPedidosFiltrados(currentFiltered);
  }, [pedidos, searchTerm, statusFiltro, dataInicio, dataFim]);

  useEffect(() => {
    let currentFiltered = rascunhos;

    if (searchTerm) {
      currentFiltered = currentFiltered.filter(r =>
        r.senha_atendimento?.includes(searchTerm) ||
        r.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFiltro !== 'todos') {
      currentFiltered = currentFiltered.filter(r => r.status === statusFiltro);
    }

    if (dataInicio && dataFim) {
      const inicio = startOfDay(new Date(dataInicio));
      const fim = endOfDay(new Date(dataFim));
      currentFiltered = currentFiltered.filter(r => {
        if (!r.created_date) return false;
        const rascDate = parseISO(r.created_date);
        return isWithinInterval(rascDate, { start: inicio, end: fim });
      });
    } else if (dataInicio) {
      const inicio = startOfDay(new Date(dataInicio));
      currentFiltered = currentFiltered.filter(r => {
        if (!r.created_date) return false;
        const rascDate = parseISO(r.created_date);
        return rascDate >= inicio;
      });
    } else if (dataFim) {
      const fim = endOfDay(new Date(dataFim));
      currentFiltered = currentFiltered.filter(r => {
        if (!r.created_date) return false;
        const rascDate = parseISO(r.created_date);
        return rascDate <= fim;
      });
    }

    setRascunhosFiltrados(currentFiltered);
  }, [rascunhos, searchTerm, statusFiltro, dataInicio, dataFim]);

  // Calcular subtotal dos pedidos filtrados
  const subtotalFiltrado = activeTab === 'pedidos' 
    ? pedidosFiltrados.reduce((acc, p) => acc + (p.valor_total || 0), 0)
    : rascunhosFiltrados.reduce((acc, r) => acc + (r.valor_total || 0), 0);
  const quantidadeFiltrada = activeTab === 'pedidos' ? pedidosFiltrados.length : rascunhosFiltrados.length;

  const handleSave = async (data) => {
    setIsLoading(true);
    if (data.id) {
      await base44.entities.PedidoVenda.update(data.id, data);
    } else {
      const allPOs = await base44.entities.PedidoVenda.list();
      const nextNumber = (allPOs.length > 0 ? Math.max(...allPOs.map(p => parseInt(p.numero?.split('-')[1] || 0))) : 0) + 1;
      await base44.entities.PedidoVenda.create({ ...data, numero: `PV-${String(nextNumber).padStart(5, '0')}` });
    }
    loadPedidos();
    // setIsFormOpen(false); // Mantendo aberto para feedback
  };

  const handleEdit = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsFormOpen(true);
  };

  const handleVerDetalhes = (pedido) => {
    setPedidoDetalhes(pedido);
    setShowDetalhes(true);
  };

  const handleAddNew = () => {
    setPedidoSelecionado(null);
    setIsFormOpen(true);
  };

  // getStatusBadge function is no longer used due to direct inline styling, but kept here for completeness
  // if Badge component was to be reintroduced. For this exact change, it could be removed.
  const getStatusBadge = (status) => {
    const variants = {
      "Orçamento": "bg-gray-200 text-gray-800",
      "Aguardando Caixa": "bg-yellow-100 text-yellow-800",
      "Aguardando Aprovação": "bg-orange-100 text-orange-800",
      "Aguardando Pagamento": "bg-yellow-100 text-yellow-800",
      "Aprovado": "bg-blue-100 text-blue-800",
      "Pronto para Expedição": "bg-purple-100 text-purple-800",
      "Finalizado": "bg-green-100 text-green-800",
      "Cancelado": "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Ultra Minimalista */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-1">Gestão de Vendas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Orçamentos, Pedidos e Acompanhamento de Vendas
        </p>
      </div>

      {/* KPIs - Estilo Dashboard com Ícones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
          <FileText className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{stats.orcamentos}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Orçamentos</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{stats.aprovados}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aprovados</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{stats.finalizados}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Finalizados</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <div className="text-2xl font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(stats.totalMes)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Faturamento</p>
        </div>
      </div>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="rascunhos">Rascunhos</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos de Venda</TabsTrigger>
        </TabsList>

        <TabsContent value="rascunhos" className="space-y-6">
          {/* Filtros para Rascunhos */}
          <div className="space-y-3">
        {/* Linha 1: Busca e Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Nº ou cliente..." 
              className="pl-6 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none focus:border-gray-400 h-9 text-sm" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-[120px] bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="todos">Todos</SelectItem>
              {activeTab === 'rascunhos' ? (
                <>
                  <SelectItem value="Criado">Criado</SelectItem>
                  <SelectItem value="Em Edição">Em Edição</SelectItem>
                  <SelectItem value="Aguardando Caixa">Ag. Caixa</SelectItem>
                  <SelectItem value="Retornado para Edição">Retornado</SelectItem>
                  <SelectItem value="Convertido">Convertido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                  <SelectItem value="Expirado">Expirado</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="Orçamento">Orçamento</SelectItem>
                  <SelectItem value="Aguardando Caixa">Ag. Caixa</SelectItem>
                  <SelectItem value="Aguardando Aprovação">Ag. Aprovação</SelectItem>
                  <SelectItem value="Aguardando Pagamento">Ag. Pagamento</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Pronto para Expedição">Expedição</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Linha 2: Período e Botão */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-[110px] md:w-[130px] border-0 border-b border-gray-200 dark:border-gray-700 rounded-none text-sm h-9 bg-transparent"
          />
          <span className="text-gray-400 text-sm">-</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-[110px] md:w-[130px] border-0 border-b border-gray-200 dark:border-gray-700 rounded-none text-sm h-9 bg-transparent"
          />
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={() => { setDataInicio(''); setDataFim(''); }} className="h-8 px-2 text-xs">
              Limpar
            </Button>
          )}
          <Button onClick={handleAddNew} variant="outline" size="sm" className="gap-1 h-9 px-3 text-sm ml-auto border-gray-300 dark:border-gray-600">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
          </Button>
        </div>

        {/* Contagem */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
          <span>{quantidadeFiltrada} pedido(s)</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(subtotalFiltrado)}</span>
        </div>
      </div>

          {/* Lista de Rascunhos */}
          <div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-2">
              {rascunhosFiltrados.map(rascunho => (
                <div key={rascunho.id} className="bg-white dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 mb-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Senha</span>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-200 font-mono">
                          {rascunho.senha_atendimento?.slice(-4)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">{rascunho.senha_atendimento}</div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {rascunho.cliente_nome || 'Cliente não informado'}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-green-600">● {rascunho.status}</span>
                        <span className="text-xs text-gray-400">{rascunho.vendedor_nome}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(rascunho.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                      <div className="text-xs text-gray-400">
                        {rascunho.created_date ? format(new Date(rascunho.created_date), 'dd/MM/yy') : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Tabela de Rascunhos */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableHead>Senha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rascunhosFiltrados.map(rascunho => (
                    <TableRow key={rascunho.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <span className="text-2xl font-bold text-gray-800 dark:text-gray-200 font-mono">
                            {rascunho.senha_atendimento?.slice(-4)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{rascunho.senha_atendimento}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{rascunho.cliente_nome || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-green-600">● {rascunho.status}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{rascunho.vendedor_nome}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {rascunho.created_date ? format(new Date(rascunho.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(rascunho.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500">Subtotal ({quantidadeFiltrada})</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(subtotalFiltrado)}</span>
            </div>
          </>
        )}
      </div>
        </TabsContent>

        <TabsContent value="pedidos" className="space-y-6">
          {/* Filtros para Pedidos */}
          <div className="space-y-3">
        {/* Linha 1: Busca e Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Nº ou cliente..." 
              className="pl-6 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none focus:border-gray-400 h-9 text-sm" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="w-[120px] bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Orçamento">Orçamento</SelectItem>
              <SelectItem value="Aguardando Caixa">Ag. Caixa</SelectItem>
              <SelectItem value="Aguardando Aprovação">Ag. Aprovação</SelectItem>
              <SelectItem value="Aguardando Pagamento">Ag. Pagamento</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Pronto para Expedição">Expedição</SelectItem>
              <SelectItem value="Finalizado">Finalizado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Linha 2: Período e Botão */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-[110px] md:w-[130px] border-0 border-b border-gray-200 dark:border-gray-700 rounded-none text-sm h-9 bg-transparent"
          />
          <span className="text-gray-400 text-sm">-</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-[110px] md:w-[130px] border-0 border-b border-gray-200 dark:border-gray-700 rounded-none text-sm h-9 bg-transparent"
          />
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" onClick={() => { setDataInicio(''); setDataFim(''); }} className="h-8 px-2 text-xs">
              Limpar
            </Button>
          )}
          <Button onClick={handleAddNew} variant="outline" size="sm" className="gap-1 h-9 px-3 text-sm ml-auto border-gray-300 dark:border-gray-600">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
          </Button>
        </div>

        {/* Contagem */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2">
          <span>{quantidadeFiltrada} pedido(s)</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(subtotalFiltrado)}</span>
        </div>
      </div>

          {/* Lista de Pedidos */}
          <div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-2">
              {pedidosFiltrados.map(pedido => (
                <div key={pedido.id} className="bg-white dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {pedido.cliente_nome || 'Cliente não informado'}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">{pedido.numero}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-green-600">● {pedido.status}</span>
                        <span className="text-xs text-gray-400">{pedido.vendedor_nome}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(pedido.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </div>
                      <div className="text-xs text-gray-400">
                        {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM/yy') : ''}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-gray-800">
                        <DropdownMenuItem onClick={() => handleVerDetalhes(pedido)}>
                          <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(pedido)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Tabela */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.map(pedido => (
                    <TableRow key={pedido.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="dark:bg-gray-800">
                            <DropdownMenuItem onClick={() => handleVerDetalhes(pedido)}>
                              <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(pedido)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{pedido.cliente_nome || '-'}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">{pedido.numero}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-green-600">● {pedido.status}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{pedido.vendedor_nome}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(pedido.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal Pedidos */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500">Subtotal ({quantidadeFiltrada})</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(subtotalFiltrado)}</span>
            </div>
          </>
        )}
      </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Formulário */}
      {isFormOpen && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {/* DialogContent is implicitly handled by PedidoVendaForm as it wraps itself in a DialogContent */}
          <PedidoVendaForm
            pedido={pedidoSelecionado}
            onSave={handleSave}
            onClose={() => setIsFormOpen(false)}
          />
        </Dialog>
      )}

      {/* Dialog de Detalhes */}
      <DetalhesPedidoVenda
        pedido={pedidoDetalhes}
        isOpen={showDetalhes}
        onClose={() => {
          setShowDetalhes(false);
          setPedidoDetalhes(null);
        }}
      />
    </div>
  );
}