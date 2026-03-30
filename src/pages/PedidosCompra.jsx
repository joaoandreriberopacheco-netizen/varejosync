import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { enviarFinanceiroLote } from '@/functions/enviarFinanceiroLote';
import PinValidationDialog from '@/components/auth/PinValidationDialog';

import ImportadorNotaFiscal from '@/components/compras/ImportadorNotaFiscal';
import FiltrosCompras from '@/components/compras/FiltrosCompras';
import ListaPedidosCompra from '@/components/compras/ListaPedidosCompra';
import ActionMenuComprasV2 from '@/components/compras/ActionMenuComprasV2';
import EnvioFinanceiroLoteDialog from '@/components/compras/EnvioFinanceiroLoteDialog';

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
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [showImportador, setShowImportador] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selecionadosIds, setSelecionadosIds] = useState([]);
  const [enviandoLote, setEnviandoLote] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [showEnvioDialog, setShowEnvioDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [formaPagamentoLote, setFormaPagamentoLote] = useState('Parcelado');
  const [dataPrimeiroVencimentoLote, setDataPrimeiroVencimentoLote] = useState('');

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

  const handleToggleSelecao = (pedido) => {
    setSelecionadosIds((prev) => prev.includes(pedido.id)
      ? prev.filter((id) => id !== pedido.id)
      : [...prev, pedido.id]);
  };

  const handleToggleModoSelecao = () => {
    setModoSelecao((prev) => !prev);
    setSelecionadosIds([]);
  };

  const handleAbrirEnvioFinanceiroLote = () => {
    if (!selecionadosIds.length) {
      toast.error('Selecione ao menos um pedido');
      return;
    }
    setShowEnvioDialog(true);
  };

  const confirmarEnvioFinanceiroLote = async () => {
    const pedidosSelecionados = filtrados.filter((p) => selecionadosIds.includes(p.id));

    if (!pedidosSelecionados.length) {
      toast.error('Selecione ao menos um pedido');
      return;
    }

    setEnviandoLote(true);
    try {
      await enviarFinanceiroLote({
        pedidos: pedidosSelecionados,
        formaPagamento: formaPagamentoLote,
        dataPrimeiroVencimento: dataPrimeiroVencimentoLote,
      });
      setSelecionadosIds([]);
      setModoSelecao(false);
      setShowEnvioDialog(false);
      setShowPinDialog(false);
      toast.success(`${pedidosSelecionados.length} pedido(s) enviados ao financeiro`);
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'Erro ao enviar pedidos em lote');
    } finally {
      setEnviandoLote(false);
    }
  };

  const handleEnviarFinanceiroLote = async () => {
    const pedidosSelecionados = filtrados.filter((p) => selecionadosIds.includes(p.id));

    if (!pedidosSelecionados.length) {
      toast.error('Selecione ao menos um pedido');
      return;
    }

    setShowPinDialog(true);
  };

  const todasTags = useMemo(() => {
    const set = new Set();
    pedidos.forEach(p => (p.tags || []).forEach(t => t && set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pedidos]);

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      const searchLower = search.toLowerCase();
      const dataPedido = p.data_emissao || (p.created_date ? toLocalDate(p.created_date) : '');
      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower))) return false;
      if (statusSel.length > 0 && !statusSel.includes(p.status)) return false;
      if (fornecedorSel.length > 0 && !fornecedorSel.includes(p.fornecedor_id)) return false;
      if (tagsSel.length > 0 && !tagsSel.some(t => (p.tags || []).includes(t))) return false;
      if (dataInicial && (!dataPedido || dataPedido < dataInicial)) return false;
      if (dataFinal && (!dataPedido || dataPedido > dataFinal)) return false;
      return true;
    });
  }, [pedidos, search, statusSel, fornecedorSel, tagsSel, dataInicial, dataFinal]);

  const valorTotal = useMemo(() => {
    return filtrados.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  }, [filtrados]);

  const grupos = useMemo(() => {
    const map = {};
    filtrados.forEach(p => {
      // Agrupa sempre pela data de emissão do pedido, com fallback para created_date
      const dataKey = p.data_emissao || (p.created_date ? toLocalDate(p.created_date) : null);
      const key = dataKey || 'sem-data';
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
          else label = dataFmt;
        }
        return {
          key,
          label,
          pedidos: pedidos.sort((a, b) => {
            const dataA = a.data_emissao || a.created_date || '';
            const dataB = b.data_emissao || b.created_date || '';
            return String(dataB).localeCompare(String(dataA));
          })
        };
      });
  }, [filtrados]);

  const hasActiveFilters = search || statusSel.length > 0 || fornecedorSel.length > 0 || tagsSel.length > 0 || dataInicial || dataFinal;

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
        dataInicial={dataInicial} onDataInicial={setDataInicial}
        dataFinal={dataFinal} onDataFinal={setDataFinal}
        hasActiveFilters={hasActiveFilters}
        onLimparFiltros={() => {
          setSearch('');
          setStatusSel([]);
          setFornecedorSel([]);
          setTagsSel([]);
          setDataInicial('');
          setDataFinal('');
        }}
      />

      {/* Lista */}
      <ListaPedidosCompra
        grupos={grupos}
        loading={loading}
        onEdit={handleOpenPedido}
        onDelete={loadData}
        selecionadosIds={selecionadosIds}
        onToggleSelecao={handleToggleSelecao}
        modoSelecao={modoSelecao}
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
        onEnviarFinanceiroLote={handleAbrirEnvioFinanceiroLote}
        onToggleModoSelecao={handleToggleModoSelecao}
        modoSelecao={modoSelecao}
        quantidadeSelecionados={selecionadosIds.length}
        enviandoLote={enviandoLote}
        grupos={grupos}
        kpis={{
          totalPedidos: filtrados.length,
          totalGeral: valorTotal,
          totalEmAberto: filtrados.filter(p => ['Rascunho', 'Aguardando Liberação', 'Aprovado'].includes(p.status)).reduce((acc, p) => acc + (p.valor_total || 0), 0)
        }}
      />

      <EnvioFinanceiroLoteDialog
        open={showEnvioDialog}
        onOpenChange={setShowEnvioDialog}
        formaPagamento={formaPagamentoLote}
        onFormaPagamentoChange={setFormaPagamentoLote}
        dataPrimeiroVencimento={dataPrimeiroVencimentoLote}
        onDataPrimeiroVencimentoChange={setDataPrimeiroVencimentoLote}
        quantidadeSelecionados={selecionadosIds.length}
        onConfirm={handleEnviarFinanceiroLote}
        loading={enviandoLote}
      />

      <PinValidationDialog
        isOpen={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onSuccess={confirmarEnvioFinanceiroLote}
        operationName="Enviar pedidos em lote ao financeiro"
      />
    </div>
  );
}