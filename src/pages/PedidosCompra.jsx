import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog } from '@/components/ui/dialog';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import ImportadorNotaFiscal from '@/components/compras/ImportadorNotaFiscal';
import FiltrosCompras from '@/components/compras/FiltrosCompras';
import ListaPedidosCompra from '@/components/compras/ListaPedidosCompra';
import ActionMenuCompras from '@/components/compras/ActionMenuCompras';

export default function PedidosCompraPage() {
  const navigate = useNavigate();
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

  const handleDownloadTemplate = () => {
    navigate('/TemplatesCompra');
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

  const valorTotal = useMemo(() => {
    return filtrados.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  }, [filtrados]);

  const grupos = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      const data = p.data_prevista_entrega || p.created_date;
      const key = data ? new Date(data).toISOString().split('T')[0] : 'sem-data';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, pedidos]) => {
        const hoje = new Date().toISOString().split('T')[0];
        let label = 'Sem data';
        if (key !== 'sem-data') {
          const d = new Date(key + 'T12:00:00');
          if (key === hoje) label = 'Hoje';
          else if (key > hoje) label = `${d.toLocaleDateString('pt-BR')} (previsto)`;
          else label = d.toLocaleDateString('pt-BR');
        }
        return { key, label, pedidos: pedidos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) };
      });
  }, [filtrados]);

  const hasActiveFilters = search || statusSel.length > 0 || fornecedorSel.length > 0;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header */}
      <div className="pb-3 mb-1">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Pedidos de Compra</p>
        <p className="text-xs text-gray-400">{filtrados.length} pedidos · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

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
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setPedidoSelecionado(null); } }}>
        {isFormOpen && (
          <PedidoCompraForm
            pedido={pedidoSelecionado}
            onClose={() => { setIsFormOpen(false); setPedidoSelecionado(null); }}
            onSave={handleSave}
          />
        )}
      </Dialog>

      <ImportadorNotaFiscal 
        isOpen={showImportador}
        onClose={() => setShowImportador(false)}
        onSuccess={loadData}
      />

      {/* Menu de ações FAB */}
      <ActionMenuCompras
        onNovopedido={() => { setPedidoSelecionado(null); setIsFormOpen(true); }}
        onImportarNF={() => setShowImportador(true)}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}