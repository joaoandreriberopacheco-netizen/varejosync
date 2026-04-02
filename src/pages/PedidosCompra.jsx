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
import PedidosCompraOrganizer from '@/components/compras/PedidosCompraOrganizer';

import { toLocalDateKey, formatarSoData, dataHoje } from '@/components/utils/dateUtils';
const toLocalDate = (d) => toLocalDateKey(new Date(d));

export default function PedidosCompraPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [search, setSearch] = useState('');
  const [statusSel, setStatusSel] = useState(['__nao_concluido__']);
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
  const [groupBy, setGroupBy] = useState('eta_transportadora');
  const [sortOrder, setSortOrder] = useState('desc');

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
      const ocultarConcluidos = statusSel.includes('__nao_concluido__');
      const statusExplicitos = statusSel.filter(status => status !== '__nao_concluido__');

      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower))) return false;
      if (ocultarConcluidos && p.status === 'Concluído') return false;
      if (statusExplicitos.length > 0 && !statusExplicitos.includes(p.status)) return false;
      if (fornecedorSel.length > 0 && !fornecedorSel.includes(p.fornecedor_id)) return false;
      if (tagsSel.length > 0 && !tagsSel.some(t => (p.tags || []).includes(t))) return false;
      if (dataInicial && (!dataPedido || dataPedido < dataInicial)) return false;
      if (dataFinal && (!dataPedido || dataPedido > dataFinal)) return false;
      return true;
    });
  }, [pedidos, search, statusSel, fornecedorSel, tagsSel, dataInicial, dataFinal]);

  const calcularValorPendentePedido = (pedido) => {
    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
    const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];

    const recebidosPorProduto = embarques.reduce((acc, embarque) => {
      const itensEmbarcados = Array.isArray(embarque.itens_embarcados) ? embarque.itens_embarcados : [];
      itensEmbarcados.forEach((item) => {
        const produtoId = item.produto_id;
        if (!produtoId) return;
        acc[produtoId] = (acc[produtoId] || 0) + (Number(item.quantidade_recebida) || 0);
      });
      return acc;
    }, {});

    return itens.reduce((acc, item) => {
      const quantidade = Number(item.quantidade) || 0;
      const recebida = recebidosPorProduto[item.produto_id] || 0;
      const pendente = Math.max(0, quantidade - recebida);
      const custoUnitario = Number(item.custo_unitario) || 0;
      return acc + (pendente * custoUnitario);
    }, 0);
  };

  const pedidosAprovadosPendentes = useMemo(() => {
    return filtrados.filter((pedido) => {
      const aprovado = pedido.status === 'Aprovado' || pedido.status_aprovacao_financeira === 'Aprovado';
      return aprovado && calcularValorPendentePedido(pedido) > 0;
    });
  }, [filtrados]);

  const valorTotal = useMemo(() => {
    return pedidosAprovadosPendentes.reduce((acc, pedido) => acc + calcularValorPendentePedido(pedido), 0);
  }, [pedidosAprovadosPendentes]);

  const grupos = useMemo(() => {
    const normalizeTransportadora = (pedido) => {
      const primeiroEmbarque = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados[0] : null;
      return primeiroEmbarque?.transportadora_nome?.trim() || 'Sem transportadora';
    };

    const normalizeEta = (pedido) => {
      const primeiroEmbarque = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados[0] : null;
      return primeiroEmbarque?.eta ? toLocalDate(primeiroEmbarque.eta) : 'sem-eta';
    };

    const getGroupMeta = (pedido) => {
      if (groupBy === 'fornecedor') {
        const fornecedor = pedido.fornecedor_nome?.trim() || 'Sem fornecedor';
        return { key: `fornecedor:${fornecedor}`, label: fornecedor, orderValue: fornecedor.toLowerCase() };
      }

      if (groupBy === 'status') {
        const status = pedido.status || 'Sem status';
        return { key: `status:${status}`, label: status, orderValue: status.toLowerCase() };
      }

      if (groupBy === 'eta_transportadora') {
        const eta = normalizeEta(pedido);
        const transportadora = normalizeTransportadora(pedido);
        const semDados = eta === 'sem-eta' && transportadora === 'Sem transportadora';
        return {
          key: semDados ? 'eta_transportadora:sem-dados' : `eta_transportadora:${eta}:${transportadora}`,
          label: semDados ? 'Sem ETA / Sem transportadora' : `${eta === 'sem-eta' ? 'Sem ETA' : formatarSoData(eta)} · ${transportadora}`,
          orderValue: `${eta}|${transportadora.toLowerCase()}`,
        };
      }

      const dataKey = pedido.data_emissao || (pedido.created_date ? toLocalDate(pedido.created_date) : null);
      const key = dataKey || 'sem-data';
      const hoje = dataHoje();
      let label = 'Sem data';
      if (key !== 'sem-data') {
        const dataFmt = formatarSoData(key);
        label = key === hoje ? 'Hoje' : dataFmt;
      }
      return { key: `data_pedido:${key}`, label, orderValue: key };
    };

    const compareValues = (a, b) => {
      if (sortOrder === 'asc') return String(a).localeCompare(String(b), 'pt-BR');
      return String(b).localeCompare(String(a), 'pt-BR');
    };

    const map = {};
    pedidosAprovadosPendentes.forEach((pedido) => {
      const meta = getGroupMeta(pedido);
      if (!map[meta.key]) {
        map[meta.key] = { key: meta.key, label: meta.label, orderValue: meta.orderValue, pedidos: [] };
      }
      map[meta.key].pedidos.push({ ...pedido, valor_pendente_entrega: calcularValorPendentePedido(pedido) });
    });

    return Object.values(map)
      .sort((a, b) => compareValues(a.orderValue, b.orderValue))
      .map((grupo) => ({
        key: grupo.key,
        label: grupo.label,
        pedidos: grupo.pedidos.sort((a, b) => {
          const valorA = a.data_emissao || a.created_date || '';
          const valorB = b.data_emissao || b.created_date || '';
          return compareValues(valorA, valorB);
        })
      }));
  }, [pedidosAprovadosPendentes, groupBy, sortOrder]);

  const hasActiveFilters = search || statusSel.length > 0 || fornecedorSel.length > 0 || tagsSel.length > 0 || dataInicial || dataFinal;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header */}
      <div className="pb-3 mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Pedidos de Compra</p>
          <p className="text-xs text-gray-400">{pedidosAprovadosPendentes.length} pedidos aprovados com saldo pendente · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <PedidosCompraOrganizer
          groupBy={groupBy}
          sortOrder={sortOrder}
          onGroupByChange={setGroupBy}
          onSortOrderToggle={() => setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc')}
        />
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
          setStatusSel(['__nao_concluido__']);
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