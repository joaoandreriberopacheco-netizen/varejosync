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
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header */}
      <div className="pb-3 mb-1">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Pedidos de Compra</p>
        <p className="text-xs text-gray-400">Gestão de pedidos com fornecedores</p>
      </div>

      {/* KPIs */}
      <KpiCompras kpis={kpis} />

      {/* Filtros */}
      <FiltrosCompras
        search={search} onSearch={setSearch}
        statusSel={statusSel} onStatusSel={setStatusSel}
        fornecedores={fornecedores} fornecedorSel={fornecedorSel} onFornecedorSel={setFornecedorSel}
        hasActiveFilters={hasActiveFilters}
        onLimparFiltros={() => {
          setSearch('');
          setStatusSel([]);
          setFornecedorSel([]);
        }}
      />

      {/* Ações */}
      <div className="flex gap-2">
        <Button 
          onClick={() => { setPedidoSelecionado(null); setIsFormOpen(true); }}
          className="flex-1 h-11 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-full font-medium gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Pedido
        </Button>
        <Button 
          onClick={() => setShowImportador(true)}
          variant="outline"
          className="flex-1 h-11 rounded-full font-medium gap-2"
        >
          <FileText className="w-5 h-5" />
          Importar NF
        </Button>
      </div>

      {/* Lista */}
      <ListaPedidosCompra
        grupos={grupos}
        loading={loading}
        statusPedidoCompra={statusPedidoCompra}
        onEdit={(pedido) => {
          setPedidoSelecionado(pedido);
          setIsFormOpen(true);
        }}
      />

      {/* Dialogs */}
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
        onSuccess={loadData}
      />
    </div>
  );
}