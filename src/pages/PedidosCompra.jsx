import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import ImportadorNotaFiscal from '@/components/compras/ImportadorNotaFiscal';
import FiltrosCompras from '@/components/compras/FiltrosCompras';
import ListaPedidosCompra from '@/components/compras/ListaPedidosCompra';
import ActionMenuComprasV2 from '@/components/compras/ActionMenuComprasV2';

import { toLocalDateKey, formatarSoData, dataHoje } from '@/components/utils/dateUtils';
const toLocalDate = (d) => toLocalDateKey(new Date(d));

export default function PedidosCompraPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [search, setSearch] = useState('');
  const [statusSel, setStatusSel] = useState([]);
  const [fornecedorSel, setFornecedorSel] = useState([]);
  const [tagsSel, setTagsSel] = useState([]);
  const [showImportador, setShowImportador] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pcs, fns] = await Promise.all([
        base44.entities.PedidoCompra.list('-created_date'),
        base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
      ]);
      setPedidos(pcs);
      setFornecedores(fns);
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
        // Usar gerarNumeroSequencial para garantir sequência única e uniforme (PC-00001)
        const resp = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'PC' });
        newPedido.numero = resp?.data?.numero || `PC-${String(pedidos.length + 1).padStart(5, '0')}`;
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

  const handleOpenPedido = (pedido) => {
    navigate(`/PedidoCompraDetalhe?id=${pedido.id}`);
  };

  const handleNovoPedido = () => {
    navigate('/PedidoCompraDetalhe?id=novo');
  };

  const todasTags = useMemo(() => {
    const set = new Set();
    pedidos.forEach(p => (p.tags || []).forEach(t => t && set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pedidos]);

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      const searchLower = search.toLowerCase();
      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower))) return false;
      if (statusSel.length > 0 && !statusSel.includes(p.status)) return false;
      if (fornecedorSel.length > 0 && !fornecedorSel.includes(p.fornecedor_id)) return false;
      if (tagsSel.length > 0 && !tagsSel.some(t => (p.tags || []).includes(t))) return false;
      return true;
    });
  }, [pedidos, search, statusSel, fornecedorSel, tagsSel]);

  const valorTotal = useMemo(() => {
    return filtrados.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  }, [filtrados]);

  const grupos = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      const data = p.data_prevista_entrega || p.created_date;
      const key = data ? (p.data_prevista_entrega ? p.data_prevista_entrega : toLocalDate(data)) : 'sem-data';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, pedidos]) => {
        const hoje = dataHoje();
        let label = 'Sem data';
        if (key !== 'sem-data') {
          const dataFmt = formatarSoData(key);
          if (key === hoje) label = 'Hoje';
          else if (key > hoje) label = `${dataFmt} (previsto)`;
          else label = dataFmt;
        }
        return { key, label, pedidos: pedidos.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) };
      });
  }, [filtrados]);

  const hasActiveFilters = search || statusSel.length > 0 || fornecedorSel.length > 0 || tagsSel.length > 0;

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
        todasTags={todasTags} tagsSel={tagsSel} onTagsSel={setTagsSel}
        hasActiveFilters={hasActiveFilters}
        onLimparFiltros={() => {
          setSearch('');
          setStatusSel([]);
          setFornecedorSel([]);
          setTagsSel([]);
        }}
      />

      {/* Lista */}
      <ListaPedidosCompra
        grupos={grupos}
        loading={loading}
        onEdit={handleOpenPedido}
        onDelete={loadData}
      />



      <ImportadorNotaFiscal 
        isOpen={showImportador}
        onClose={() => setShowImportador(false)}
        onSuccess={loadData}
      />

      {/* Menu de ações FAB */}
      <ActionMenuComprasV2
        onNovopedido={handleNovoPedido}
        onImportarNF={() => setShowImportador(true)}
        onDownloadTemplate={handleDownloadTemplate}
        grupos={grupos}
        kpis={{
          totalPedidos: filtrados.length,
          totalGeral: valorTotal,
          totalEmAberto: filtrados.filter(p => ['Rascunho', 'Aguardando Liberação', 'Aprovado'].includes(p.status)).reduce((acc, p) => acc + (p.valor_total || 0), 0)
        }}
      />
    </div>
  );
}