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

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const getEmbarqueSuffixIndex = (embarque, pedido) => {
  const embarquesDoPedido = (pedido?._embarques || []).slice().sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
  const idxPorOrdem = embarquesDoPedido.findIndex((item) => item.id === embarque?.id);
  if (idxPorOrdem >= 0) return idxPorOrdem;

  const numero = String(embarque?.numero || '').trim();
  const match = numero.match(/(\d+)$/);
  if (match) return Math.max(0, Number(match[1]) - 1);
  const letter = numero.replace(/[^A-Za-z]/g, '').toUpperCase();
  const idx = LETTERS.indexOf(letter);
  return idx >= 0 ? idx : 0;
};

const getEmbarqueSuffix = (embarque, pedido) => LETTERS[getEmbarqueSuffixIndex(embarque, pedido)] || 'A';

const getDisplayEmbarqueCode = (pedido, embarque) => {
  const baseCode = pedido?.numero || '';
  return `${baseCode} - ${getEmbarqueSuffix(embarque, pedido)}`;
};

const getDisplayEmbarqueOrdinal = (embarque, pedido) => `#${String(getEmbarqueSuffixIndex(embarque, pedido) + 1).padStart(2, '0')}`;

const hasLinkedItems = (embarque) => Array.isArray(embarque?.itens || embarque?.itens_embarcados) && (embarque.itens || embarque.itens_embarcados || []).some((item) => (Number(item?.quantidade_embarcada) || 0) > 0 || (Number(item?.quantidade_recebida) || 0) > 0);

const getQuantidadePendenteNecessidade = (pedido, embarque) => {
  if (embarque?.tipo !== 'Necessidade') return 0;

  return (pedido.itens || []).reduce((acc, item) => {
    const quantidade = Number(item.quantidade) || 0;
    const quantidadeVinculada = Number(item.quantidade_vinculada) || 0;
    return acc + Math.max(0, quantidade - quantidadeVinculada);
  }, 0);
};

const getBorrowedStatus = (pedido, embarque) => {
  if (!embarque) return pedido?.status || 'Rascunho';

  const temTransporte = !!(embarque.transportadora_id || embarque.transportadora_nome || embarque.data_embarque || embarque.eta);
  const statusRecebimento = embarque.status_recebimento;
  const temItensAssociados = hasLinkedItems(embarque);
  const quantidadePendente = getQuantidadePendenteNecessidade(pedido, embarque);
  const precisaPreenchimento = embarque.tipo === 'Necessidade' && !temTransporte && !temItensAssociados && quantidadePendente > 0;

  if (statusRecebimento === 'Recebido OK' || statusRecebimento === 'Com Divergência' || embarque.status === 'Concluído') {
    return 'Concluído';
  }

  if (precisaPreenchimento) {
    return 'Aguardando';
  }

  if (temItensAssociados || temTransporte || statusRecebimento === 'Recebido Parcial') {
    return 'Despachado';
  }

  if (pedido?.status === 'Aguardando Aprovação Financeira' || pedido?.status === 'Aguardando Liberação') {
    return 'Aguardando Aprovação Financeira';
  }

  if (pedido?.status === 'Aprovado') {
    return 'Aprovado';
  }

  return 'Rascunho';
};

const getEmbarqueDisplayDate = (pedido) => pedido?.data_aprovacao_financeira || pedido?.data_emissao || pedido?.created_date;

const buildDisplayItensFromEmbarque = (pedido, embarque) => {
  return (embarque?.itens || embarque?.itens_embarcados || []).map((item) => {
    const pedidoItem = (pedido.itens || []).find((pedidoItem) => pedidoItem.produto_id === item.produto_id);
    const quantidade = Number(item.quantidade_embarcada) || Number(item.quantidade_pedida) || 0;
    return {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade,
      custo_unitario: Number(pedidoItem?.custo_unitario) || 0,
    };
  });
};

const getDisplayValorEmbarque = (pedido, embarque) => {
  return buildDisplayItensFromEmbarque(pedido, embarque).reduce((acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.custo_unitario) || 0)), 0);
};

export default function PedidosCompraPage() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [embarques, setEmbarques] = useState([]);
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
  const [groupBy, setGroupBy] = useState('eta_transportadora');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pcs, embarquesDb, fns] = await Promise.all([
        base44.entities.PedidoCompra.list('-created_date'),
        base44.entities.Embarque.list('-created_date'),
        base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
      ]);

      const pedidoMap = new Map(pcs.map((pedido) => [pedido.id, pedido]));
      const embarquesPorPedido = embarquesDb.reduce((acc, embarque) => {
        const pedidoId = embarque.pedido_compra_id;
        if (!pedidoId) return acc;
        if (!acc[pedidoId]) acc[pedidoId] = [];
        acc[pedidoId].push(embarque);
        return acc;
      }, {});

      const pedidosComResumoReal = pcs.map((pedido) => {
        const embarquesDoPedido = embarquesPorPedido[pedido.id] || [];
        const totalPedido = Number(pedido.valor_total) || 0;
        const valorEmbarcado = embarquesDoPedido.reduce((acc, embarque) => {
          const valorEmbarque = (embarque.itens || embarque.itens_embarcados || []).reduce((itemAcc, item) => {
            const custoUnitario = Number((pedido.itens || []).find((pedidoItem) => pedidoItem.produto_id === item.produto_id)?.custo_unitario) || 0;
            return itemAcc + ((Number(item.quantidade_embarcada) || 0) * custoUnitario);
          }, 0);
          return acc + valorEmbarque;
        }, 0);
        const percentualReal = totalPedido > 0 ? Math.min(100, (valorEmbarcado / totalPedido) * 100) : 0;
        const ultimoEmbarque = [...embarquesDoPedido].sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))[0] || null;

        let statusRecebimentoReal = 'Nenhum';
        if (embarquesDoPedido.length > 0) {
          const recebimentos = embarquesDoPedido.map((embarque) => embarque.status_recebimento).filter(Boolean);
          if (recebimentos.some((status) => status === 'Com Divergência')) statusRecebimentoReal = 'Concluído com Divergência';
          else if (recebimentos.length > 0 && recebimentos.every((status) => status === 'Recebido OK')) statusRecebimentoReal = 'Concluído OK';
          else if (recebimentos.some((status) => status === 'Recebido Parcial')) statusRecebimentoReal = 'Recebido Parcial';
          else statusRecebimentoReal = 'Pendente';
        }

        let statusEmbarqueReal = 'Nenhum';
        if (embarquesDoPedido.length > 0) {
          statusEmbarqueReal = percentualReal >= 100 ? 'Total' : 'Parcial';
        }

        return {
          ...pedido,
          _embarques: embarquesDoPedido,
          _embarque_principal: ultimoEmbarque,
          percentual_valor_embarcado: percentualReal,
          status_embarque: statusEmbarqueReal,
          status_recebimento_geral: statusRecebimentoReal,
          data_prevista_entrega: ultimoEmbarque?.eta ? String(ultimoEmbarque.eta).slice(0, 10) : pedido.data_prevista_entrega,
        };
      });

      const cardsDeEmbarque = embarquesDb
        .map((embarque) => {
          const pedido = pedidoMap.get(embarque.pedido_compra_id);
          if (!pedido) return null;

          const itensEmbarque = embarque?.itens || embarque?.itens_embarcados || [];
          const temItensAssociados = itensEmbarque.some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
          const quantidadePendente = getQuantidadePendenteNecessidade(pedido, embarque);
          const embarqueDormindo = embarque?.tipo === 'Necessidade' && !embarque?.transportadora_id && !embarque?.transportadora_nome && !embarque?.data_embarque && !embarque?.eta && !temItensAssociados && quantidadePendente <= 0 && !(embarque?.itens || embarque?.itens_embarcados || []).some((item) => (Number(item?.quantidade_pedida) || 0) > 0);
          if (embarqueDormindo) return null;

          return {
            ...pedido,
            _virtual_key: `${pedido.id}_${embarque.id}`,
            _embarque: embarque,
            _display_code: getDisplayEmbarqueCode(pedido, embarque),
            _display_ordinal: getDisplayEmbarqueOrdinal(embarque, pedido),
            _display_status: getBorrowedStatus(pedido, embarque),
            _display_valor: getDisplayValorEmbarque(pedido, embarque),
            _display_itens: buildDisplayItensFromEmbarque(pedido, embarque),
            _display_date: getEmbarqueDisplayDate(pedido),
            _display_fornecedor: pedido.fornecedor_nome || '—',
            _quantidade_pendente: getQuantidadePendenteNecessidade(pedido, embarque),
          };
        })
        .filter(Boolean);

      setPedidos(pedidosComResumoReal);
      setEmbarques(cardsDeEmbarque);
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
        const resp = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'PC' });
        newPedido.numero = resp?.data?.numero;
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
    navigate(`/PedidoCompraDetalhe?id=${pedido.id}${pedido._embarque?.id ? `&embarque=${pedido._embarque.id}` : ''}`);
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

  const cardsFonte = useMemo(() => embarques, [embarques]);

  const STATUS_EMBARQUE_VIRTUAIS = ['Rascunho', 'Aguardando', 'Aguardando Aprovação Financeira', 'Aprovado', 'Despachado', 'Concluído'];

  const filtrados = useMemo(() => {
    return cardsFonte.filter((p) => {
      const searchLower = search.toLowerCase();
      const dataPedido = p.data_emissao || (p.created_date ? toLocalDate(p.created_date) : '');
      const statusExplicitos = statusSel.filter((status) => status !== '__nao_concluido__');
      const statusPaiSel = statusExplicitos.filter((s) => !STATUS_EMBARQUE_VIRTUAIS.includes(s));
      const statusEmbSel = statusExplicitos.filter((s) => STATUS_EMBARQUE_VIRTUAIS.includes(s));
      const embarque = p._embarque;

      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower) || embarque?.transportadora_nome?.toLowerCase().includes(searchLower))) return false;

      if (statusExplicitos.length > 0) {
        const matchPai = statusPaiSel.includes(p.status) || statusPaiSel.includes(p._display_status);
        const matchEmbarque = statusEmbSel.some((s) => {
          if (s === 'Aguardando Embarque') return !embarque?.transportadora_nome && !embarque?.eta;
          if (s === 'Original') return false;
          return embarque?.status_recebimento === s || embarque?.status === s || p._display_status === s;
        });
        if (!matchPai && !matchEmbarque) return false;
      }

      if (fornecedorSel.length > 0 && !fornecedorSel.includes(p.fornecedor_id)) return false;
      if (tagsSel.length > 0 && !tagsSel.some((t) => (p.tags || []).includes(t))) return false;
      if (dataInicial && (!dataPedido || dataPedido < dataInicial)) return false;
      if (dataFinal && (!dataPedido || dataPedido > dataFinal)) return false;
      return true;
    });
  }, [cardsFonte, search, statusSel, fornecedorSel, tagsSel, dataInicial, dataFinal]);

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

  const pedidosVisiveisLista = useMemo(() => {
    return filtrados.filter((pedido) => {
      const statusVisual = pedido._display_status || pedido.status;
      const statusPermitido = ['Rascunho', 'Aguardando Aprovação Financeira', 'Aprovado', 'Concluído', 'Despachado', 'Aguardando'].includes(statusVisual)
        || pedido.status_aprovacao_financeira === 'Aprovado';
      return statusPermitido;
    });
  }, [filtrados]);

  const pedidosVisiveisPendentes = useMemo(() => {
    return pedidosVisiveisLista;
  }, [pedidosVisiveisLista]);

  const pedidosPagosPendentes = useMemo(() => {
    return filtrados.filter((pedido) => {
      const pago = pedido.status === 'Aprovado' || pedido.status_aprovacao_financeira === 'Aprovado';
      return pago && calcularValorPendentePedido(pedido) > 0;
    });
  }, [filtrados]);

  const valorTotal = useMemo(() => {
    return pedidosVisiveisPendentes.reduce((acc, pedido) => acc + calcularValorPendentePedido(pedido), 0);
  }, [pedidosVisiveisPendentes]);

  const valorPagoNaoEntregue = useMemo(() => {
    return pedidosPagosPendentes.reduce((acc, pedido) => acc + calcularValorPendentePedido(pedido), 0);
  }, [pedidosPagosPendentes]);

  const STATUS_VIRTUAL_CONCLUIDOS = ['Recebido OK', 'Concluído'];

  const grupos = useMemo(() => {
    const getGroupMeta = (pedido, embarque) => {
      if (groupBy === 'fornecedor') {
        const fornecedor = pedido.fornecedor_nome?.trim() || 'Sem fornecedor';
        return { key: `fornecedor:${fornecedor}`, label: fornecedor, orderValue: fornecedor.toLowerCase() };
      }

      if (groupBy === 'status') {
        const status = pedido._display_status || pedido.status || 'Sem status';
        return { key: `status:${status}`, label: status, orderValue: status.toLowerCase() };
      }

      if (groupBy === 'eta_transportadora') {
        const eta = embarque?.eta ? toLocalDate(embarque.eta) : 'sem-eta';
        const transportadora = embarque?.transportadora_nome?.trim() || 'Sem transportadora';
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
        label = key === hoje ? 'Hoje' : formatarSoData(key);
      }
      return { key: `data_pedido:${key}`, label, orderValue: key };
    };

    const compareValues = (a, b) => {
      if (sortOrder === 'asc') return String(a).localeCompare(String(b), 'pt-BR');
      return String(b).localeCompare(String(a), 'pt-BR');
    };

    const map = {};

    pedidosVisiveisLista.forEach((pedido) => {
      const embarque = pedido._embarque;
      const meta = getGroupMeta(pedido, embarque);

      if (!map[meta.key]) {
        map[meta.key] = { key: meta.key, label: meta.label, orderValue: meta.orderValue, pedidos: [] };
      }

      map[meta.key].pedidos.push({
        ...pedido,
        _is_virtual_concluido: STATUS_VIRTUAL_CONCLUIDOS.includes(pedido._display_status),
        valor_pendente_entrega: pedido.status === 'Concluído' ? 0 : calcularValorPendentePedido(pedido)
      });
    });

    return Object.values(map)
      .sort((a, b) => compareValues(a.orderValue, b.orderValue))
      .map((grupo) => {
        const pedidosSort = grupo.pedidos.sort((a, b) => {
          const valorA = a.data_emissao || a.created_date || '';
          const valorB = b.data_emissao || b.created_date || '';
          return compareValues(valorA, valorB);
        });

        return {
          key: grupo.key,
          label: grupo.label,
          pedidos: pedidosSort,
          _total_eta: pedidosSort.reduce((acc, p) => acc + (p._display_valor || 0), 0)
        };
      });
  }, [pedidosVisiveisLista, groupBy, sortOrder]);

  const hasActiveFilters = search || fornecedorSel.length > 0 || tagsSel.length > 0 || dataInicial || dataFinal || statusSel.some(status => status !== '__nao_concluido__');

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header */}
      <div className="pb-3 mb-1 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Embarques</p>
          <p className="text-xs text-gray-400">{pedidosVisiveisPendentes.length} embarques visíveis · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Liberados e ainda não concluídos no filtro: R$ {valorPagoNaoEntregue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
        pedidos={filtrados}
        filtrosDesc={`Busca: ${search || 'todas'} · Status: ${statusSel.join(', ') || 'todos'} · Fornecedores: ${fornecedorSel.length || 0} · Tags: ${tagsSel.length || 0} · Período: ${dataInicial || '-'} até ${dataFinal || '-'}`}
        kpis={{
          totalPedidos: pedidosVisiveisPendentes.length,
          totalGeral: valorTotal,
          totalEmAberto: filtrados.filter(p => ['Rascunho', 'Aguardando Aprovação Financeira', 'Aprovado'].includes(p.status)).reduce((acc, p) => acc + (p.valor_total || 0), 0),
          totalPagoNaoEntregue: valorPagoNaoEntregue
        }}
        grupos={grupos}
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