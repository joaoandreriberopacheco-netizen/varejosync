import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Plus, FileText } from 'lucide-react';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import ImportadorNotaFiscal from '@/components/compras/ImportadorNotaFiscal';
import KpiCompras from '@/components/compras/KpiCompras';
import FiltrosCompras from '@/components/compras/FiltrosCompras';
import ListaPedidosCompra from '@/components/compras/ListaPedidosCompra';

export default function PedidosCompraPage() {
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [search, setSearch] = useState('');
  const [statusSel, setStatusSel] = useState([]);
  const [fornecedorSel, setFornecedorSel] = useState([]);
  const [showImportador, setShowImportador] = useState(false);
  const [statusPedidoCompra, setStatusPedidoCompra] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pcs, fns, statusPC] = await Promise.all([
        base44.entities.PedidoCompra.list('-created_date'),
        base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
        base44.entities.StatusPedidoCompra.list('ordem'),
      ]);
      setPedidos(pcs);
      setFornecedores(fns);
      setStatusPedidoCompra(statusPC);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const handleSave = async (pedidoData) => {
    const sanitizedData = {
      ...pedidoData,
      valor_total: Number(pedidoData.valor_total) || 0,
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
    await loadData();
    setIsFormOpen(false);
    setPedidoSelecionado(null);
  };

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      const searchLower = search.toLowerCase();
      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower))) return false;
      if (statusSel.length > 0 && !statusSel.includes(p.status)) return false;
      if (fornecedorSel.length > 0 && !fornecedorSel.includes(p.fornecedor_id)) return false;
      return true;
    });
  }, [pedidos, search, statusSel, fornecedorSel]);

  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let pendentes = 0, atrasados = 0;
    filtrados.forEach(p => {
      const status = p.status?.toLowerCase() || '';
      if (status !== 'recebido' && status !== 'cancelado') {
        pendentes++;
        if (p.data_prevista_entrega && new Date(p.data_prevista_entrega) < hoje) {
          atrasados++;
        }
      }
    });

    return {
      total: filtrados.length,
      valorTotal: filtrados.reduce((acc, p) => acc + (p.valor_total || 0), 0),
      pendentes,
      atrasados,
    };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const statusOrder = ['Aberto', 'Confirmado', 'Em Separação', 'Enviado', 'Recebido', 'Cancelado'];
    const map = {};
    
    statusOrder.forEach(st => {
      map[st] = [];
    });

    filtrados.forEach(p => {
      const st = p.status || 'Aberto';
      if (!map[st]) map[st] = [];
      map[st].push(p);
    });

    return statusOrder
      .filter(st => map[st].length > 0)
      .map(st => ({
        status: st,
        label: st,
        pedidos: map[st].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
      }));
  }, [filtrados]);

  const hasActiveFilters = search || statusSel.length > 0 || fornecedorSel.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Pedidos de Compra
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {pedidosFiltrados.length} pedidos · R$ {formatValor(pedidosFiltrados.reduce((acc, p) => acc + (p.valor_total || 0), 0))}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por Nº ou fornecedor..." 
                className="pl-9 bg-gray-50 border-transparent dark:bg-gray-900 rounded-xl" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-full md:w-48 bg-gray-50 border-transparent dark:bg-gray-900 rounded-xl">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                {statusPedidoCompra.filter(s => s.ativo).map(status => (
                  <SelectItem key={status.codigo} value={status.codigo}>{status.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowImportador(true)} variant="outline" className="gap-2 rounded-xl">
              <FileText className="w-4 h-4" />
              Importar NF
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="bg-gray-900 dark:bg-white dark:text-gray-900 gap-2 rounded-xl">
              <PlusCircle className="w-4 h-4" />
              Novo
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div className="grid gap-3">
          {pedidosFiltrados.map(pedido => (
            <div key={pedido.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{pedido.numero}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{getStatusNome(pedido.status)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{pedido.fornecedor_nome}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-gray-900 dark:text-white font-glacial">
                    R$ {formatValor(pedido.valor_total)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {pedido.data_prevista_entrega ? format(new Date(pedido.data_prevista_entrega), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setPedidoSelecionado(pedido); setIsFormOpen(true); }}
                  className="flex-1 gap-2 rounded-xl"
                >
                  <Eye className="w-4 h-4" />
                  Ver
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setPedidoSelecionado(pedido); setIsFormOpen(true); }}
                  className="flex-1 gap-2 rounded-xl"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {isFormOpen && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <PedidoCompraForm
              pedido={pedidoSelecionado}
              isOpen={isFormOpen}
              onClose={() => { setIsFormOpen(false); setPedidoSelecionado(null); }}
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
    </div>
  );
}