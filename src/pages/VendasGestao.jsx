import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, ShoppingCart, Eye, Calendar, FileText, CheckCircle2, Clock, DollarSign, MoreHorizontal, Plus, RotateCcw, RefreshCw, CreditCard, Printer, SlidersHorizontal, X, Ban, Ticket } from 'lucide-react';
import PedidoVendaForm from '@/components/vendas/PedidoVendaForm';
import DetalhesPedidoVenda from '@/components/vendas/DetalhesPedidoVenda';
import AlterarPagamentoDialog from '@/components/vendas/AlterarPagamentoDialog';
import ComprovantePreVenda from '@/components/vendas/ComprovantePreVenda';
import ComprovanteCompra from '@/components/vendas/ComprovanteCompra';

import { createPageUrl } from '@/components/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlacialTabsList, GlacialTabsTrigger } from '@/components/ui/GlacialTabs';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import MobileDateRangePicker from '@/components/vendas/MobileDateRangePicker';
import ValesTrocaTab from '@/components/vendas/ValesTrocaTab';
import { dataHoje, formatarDataHora, formatarSoData, toLocalDateKey } from '@/components/utils/dateUtils';
const fmtDtHora = (d) => d ? formatarDataHora(d) : '-';
const fmtDataCurta = (d) => d ? formatarSoData(d) : '';
const dateRangeMatches = (valor, inicio, fim) => {
  const chave = toLocalDateKey(valor);
  if (!chave) return false;
  if (inicio && chave < inicio) return false;
  if (fim && chave > fim) return false;
  return true;
};

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


  const [showDetalhes, setShowDetalhes] = useState(false);
  const [pedidoDetalhes, setPedidoDetalhes] = useState(null);
  const [activeTab, setActiveTab] = useState('pedidos');
  const [showDevolucao, setShowDevolucao] = useState(false); // unused, kept for safety
  const [showTroca, setShowTroca] = useState(false); // unused, kept for safety
  const [showAlterarPagamento, setShowAlterarPagamento] = useState(false);
  const [showComprovante, setShowComprovante] = useState(false);
  const [pedidoParaImprimir, setPedidoParaImprimir] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);
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
        toLocalDateKey(p.created_date).startsWith(dataHoje().slice(0, 7))
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
    if (dataInicio || dataFim) {
      currentFiltered = currentFiltered.filter(p => dateRangeMatches(p.created_date, dataInicio, dataFim));
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

    if (dataInicio || dataFim) {
      currentFiltered = currentFiltered.filter(r => dateRangeMatches(r.created_date, dataInicio, dataFim));
    }

    setRascunhosFiltrados(currentFiltered);
  }, [rascunhos, searchTerm, statusFiltro, dataInicio, dataFim]);

  // Calcular subtotal dos pedidos filtrados
  const subtotalFiltrado = activeTab === 'pedidos' 
    ? pedidosFiltrados.reduce((acc, p) => acc + (p.valor_total || 0), 0)
    : rascunhosFiltrados.reduce((acc, r) => acc + (r.valor_total || 0), 0);
  const quantidadeFiltrada = activeTab === 'pedidos' ? pedidosFiltrados.length : rascunhosFiltrados.length;

  const handleEdit = (pedido) => {
    // Navegar para edição ou abrir modal conforme necessário
    console.log('Editar pedido:', pedido);
  };

  const handleVerDetalhes = (pedido) => {
    setPedidoDetalhes(pedido);
    setShowDetalhes(true);
  };

  const handleReimprimir = (pedido) => {
    setPedidoParaImprimir(pedido);
    setShowComprovante(true);
  };

  const handleInutilizarRascunho = async (rascunho) => {
    const mesmoDia = toLocalDateKey(rascunho.created_date) === dataHoje();
    if (!mesmoDia) {
      alert('Só é possível inutilizar senhas criadas hoje.');
      return;
    }
    if (!confirm(`Inutilizar a senha ${rascunho.senha_atendimento?.slice(-4)}? Ela será marcada como Cancelado.`)) return;
    await base44.entities.RascunhoPedidoVenda.update(rascunho.id, { status: 'Cancelado' });
    loadPedidos();
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

  const limparFiltros = () => {
    setSearchTerm('');
    setStatusFiltro('todos');
    setDataInicio('');
    setDataFim('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 overflow-x-hidden">
      {/* Header limpo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 pr-2">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 font-glacial">Gestão de Vendas</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">Orçamentos, pedidos e acompanhamento</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:justify-end flex-shrink-0 w-full sm:w-auto">
          <Button variant="ghost" size="icon" className="h-11 w-full sm:w-10 rounded-2xl bg-gray-100 dark:bg-slate-800" title="Devolução" onClick={() => window.location.href = createPageUrl('DevolucaoTroca?tipo=Devolução')}>
            <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-full sm:w-10 rounded-2xl bg-gray-100 dark:bg-slate-800" title="Troca" onClick={() => window.location.href = createPageUrl('DevolucaoTroca?tipo=Troca')}>
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-full sm:w-10 rounded-2xl bg-gray-100 dark:bg-slate-800" title="Alterar Pagamento" onClick={() => setShowAlterarPagamento(true)}>
            <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-full sm:hidden rounded-2xl bg-gray-100 dark:bg-slate-800"
            onClick={() => setShowFiltros(true)}
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>
      </div>

      {/* Barra de Busca com Filtro */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-12 bg-white dark:bg-slate-800 border-0 rounded-2xl min-w-0 shadow-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex h-12 w-12 rounded-2xl bg-gray-100 dark:bg-slate-800 shrink-0"
            onClick={() => setShowFiltros(true)}
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>
      </div>

      <Drawer open={showFiltros} onOpenChange={setShowFiltros}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-slate-900 px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Filtros</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Tipo</label>
              <GlacialTabsList className="w-full" scrollable>
                <GlacialTabsTrigger value="rascunhos" activeValue={activeTab} onSelect={setActiveTab} label="Senhas" icon={FileText} />
                <GlacialTabsTrigger value="pedidos" activeValue={activeTab} onSelect={setActiveTab} label="Pedidos" icon={ShoppingCart} />
                <GlacialTabsTrigger value="vales" activeValue={activeTab} onSelect={setActiveTab} label="Vales" icon={Ticket} />
              </GlacialTabsList>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Status</label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 border-0">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                  <SelectItem value="todos">Todos</SelectItem>
                  {activeTab === 'rascunhos' ? (
                    <>
                      <SelectItem value="Criado">Criado</SelectItem>
                      <SelectItem value="Em Edição">Em Edição</SelectItem>
                      <SelectItem value="Aguardando Caixa">Ag. Caixa</SelectItem>
                      <SelectItem value="Convertido">Convertido</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </>
                  ) : activeTab === 'vales' ? (
                    <>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Utilizado Parcialmente">Utilizado Parcialmente</SelectItem>
                      <SelectItem value="Utilizado">Utilizado</SelectItem>
                      <SelectItem value="Expirado">Expirado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Orçamento">Orçamento</SelectItem>
                      <SelectItem value="Aguardando Caixa">Ag. Caixa</SelectItem>
                      <SelectItem value="Financeiro OK">Financeiro OK</SelectItem>
                      <SelectItem value="Em Separação">Em Separação</SelectItem>
                      <SelectItem value="Pedido Concluído">Concluído</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Período</label>
              <MobileDateRangePicker
                startDate={dataInicio}
                endDate={dataFim}
                onApply={(inicio, fim) => {
                  setDataInicio(inicio);
                  setDataFim(fim);
                }}
                onClear={() => {
                  setDataInicio('');
                  setDataFim('');
                }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-11 rounded-2xl"
                onClick={limparFiltros}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                onClick={() => setShowFiltros(false)}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <div>

        {activeTab === 'rascunhos' && (
        <div className="space-y-4 min-w-0">
          {/* Total no topo */}
          <div className="flex items-start justify-between gap-3 text-sm min-w-0">
            <span className="text-gray-500 dark:text-gray-400 min-w-0">{quantidadeFiltrada} pedido(s)</span>
            <span className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 text-right break-words leading-tight">R$ {formatValor(subtotalFiltrado)}</span>
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
              {rascunhosFiltrados.map(rascunho => {
                const mesmoDia = toLocalDateKey(rascunho.created_date) === dataHoje();
                const podeInutilizar = mesmoDia && !['Cancelado','Convertido'].includes(rascunho.status);
                return (
                <div key={rascunho.id} className="bg-white dark:bg-slate-900 rounded-[26px] p-4 shadow-sm overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 mb-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-2xl max-w-full">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Senha</span>
                        <span className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-mono leading-none truncate">
                          {rascunho.senha_atendimento?.slice(-4)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1 break-all">{rascunho.senha_atendimento}</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-100 break-words leading-tight">
                        {rascunho.cliente_nome || 'Cliente não informado'}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                        <span className={`text-xs ${rascunho.status === 'Cancelado' ? 'text-red-500' : 'text-green-600'}`}>● {rascunho.status}</span>
                        <span className="text-xs text-gray-400 break-words">{rascunho.vendedor_nome}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 max-w-[40%]">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 text-right break-words leading-tight">
                        R$ {(rascunho.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        {fmtDataCurta(rascunho.created_date)}
                      </div>
                      {podeInutilizar && (
                        <button onClick={() => handleInutilizarRascunho(rascunho)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                          <Ban className="w-3 h-3" /> Inutilizar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rascunhosFiltrados.map(rascunho => {
                    const mesmoDia = toLocalDateKey(rascunho.created_date) === dataHoje();
                    const podeInutilizar = mesmoDia && !['Cancelado','Convertido'].includes(rascunho.status);
                    return (
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
                        <span className={`text-xs ${rascunho.status === 'Cancelado' ? 'text-red-500' : 'text-green-600'}`}>● {rascunho.status}</span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{rascunho.vendedor_nome}</TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {fmtDtHora(rascunho.created_date)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(rascunho.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </TableCell>
                      <TableCell>
                        {podeInutilizar && (
                          <button onClick={() => handleInutilizarRascunho(rascunho)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                            <Ban className="w-3 h-3" /> Inutilizar
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>


          </>
        )}
        </div>
        </div>
        )}

        {activeTab === 'pedidos' && (
        <div className="space-y-4 min-w-0">
          {/* Total no topo */}
          <div className="flex items-start justify-between gap-3 text-sm min-w-0">
            <span className="text-gray-500 dark:text-gray-400 min-w-0">{quantidadeFiltrada} pedido(s)</span>
            <span className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 text-right break-words leading-tight">R$ {formatValor(subtotalFiltrado)}</span>
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
                <div key={pedido.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm overflow-hidden">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-200 break-words leading-tight">
                        {pedido.cliente_nome || 'Cliente não informado'}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 break-all">{pedido.numero}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 min-w-0">
                        <span className="text-xs text-green-600 break-words">● {pedido.status}</span>
                        <span className="text-xs text-gray-400 break-words">{pedido.vendedor_nome}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 max-w-[42%]">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 text-right break-words leading-tight">
                        R$ {(pedido.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div className="text-xs text-gray-400 text-right">
                        {fmtDataCurta(pedido.created_date)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 shrink-0">
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
                        <DropdownMenuItem onClick={() => handleReimprimir(pedido)}>
                          <Printer className="w-4 h-4 mr-2" /> Reimprimir
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
                            <DropdownMenuItem onClick={() => handleReimprimir(pedido)}>
                              <Printer className="w-4 h-4 mr-2" /> Reimprimir
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
                        {fmtDtHora(pedido.created_date)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800 dark:text-gray-200">
                        R$ {(pedido.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>


          </>
        )}
        </div>
        </div>
        )}

        {activeTab === 'vales' && (
          <ValesTrocaTab
            searchTerm={searchTerm}
            statusFiltro={statusFiltro}
            dataInicio={dataInicio}
            dataFim={dataFim}
            activeTab={activeTab}
          />
        )}
      </div>

      {/* Dialogs de operações */}
      <AlterarPagamentoDialog open={showAlterarPagamento} onClose={() => setShowAlterarPagamento(false)} />

      {/* Dialog de Detalhes */}
      <DetalhesPedidoVenda
        pedido={pedidoDetalhes}
        isOpen={showDetalhes}
        onClose={() => {
          setShowDetalhes(false);
          setPedidoDetalhes(null);
        }}
      />

      {/* Dialog de Reimpressão */}
      {showComprovante && pedidoParaImprimir && (
        pedidoParaImprimir.tipo === 'Pedido' ? (
          <ComprovantePreVenda
            preVenda={pedidoParaImprimir}
            open={showComprovante}
            onClose={() => setShowComprovante(false)}
          />
        ) : (
          <ComprovanteCompra
            pedido={pedidoParaImprimir}
            open={showComprovante}
            onClose={() => setShowComprovante(false)}
          />
        )
      )}
    </div>
  );
}