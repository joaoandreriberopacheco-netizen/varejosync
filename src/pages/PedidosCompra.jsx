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

  const STATUS_EMBARQUE_VIRTUAIS = ['Recebido OK', 'Recebido Parcial', 'Com Divergência', 'Aguardando Embarque'];

  // ⭐ FASE 2+: Detecta se pedido está RESOLVIDO (sem ações logísticas pendentes)
  const isPedidoResolvido = (pedido) => {
    const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
    if (embarques.length === 0) return false;
    const qtdEmb = embarques.reduce((acc, emb) => {
      (emb.itens_embarcados || []).forEach(ie => { acc[ie.produto_id] = (acc[ie.produto_id] || 0) + (Number(ie.quantidade_embarcada) || 0); });
      return acc;
    }, {});
    const todasOK = embarques.every(e => ['Recebido OK', 'Concluído'].includes(e.status_recebimento_embarque));
    const todosEmb = (pedido.itens || []).every(i => qtdEmb[i.produto_id] >= (Number(i.quantidade) || 0));
    return todasOK && todosEmb;
  };

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      const searchLower = search.toLowerCase();
      const dataPedido = p.data_emissao || (p.created_date ? toLocalDate(p.created_date) : '');
      const ocultarConcluidos = statusSel.includes('__nao_concluido__');
      const statusExplicitos = statusSel.filter(status => status !== '__nao_concluido__');
      const concluidosSelecionados = statusExplicitos.includes('Concluído');
      const statusPaiSel = statusExplicitos.filter(s => !STATUS_EMBARQUE_VIRTUAIS.includes(s));
      const statusEmbSel  = statusExplicitos.filter(s => STATUS_EMBARQUE_VIRTUAIS.includes(s));

      if (search && !(p.numero?.toLowerCase().includes(searchLower) || p.fornecedor_nome?.toLowerCase().includes(searchLower))) return false;
      if (ocultarConcluidos && !concluidosSelecionados && p.status === 'Concluído') return false;
      // ⭐ FASE 2+: Filtra pedidos RESOLVIDOS quando '__nao_concluido__' está ativo
      if (ocultarConcluidos && !concluidosSelecionados && isPedidoResolvido(p)) return false;

      // Filtro de status: combina status do pedido pai e status virtual de embarque (OR entre os selecionados)
      if (statusExplicitos.length > 0) {
        const matchPai = statusPaiSel.includes(p.status);
        const embarques = Array.isArray(p.embarques_registrados) ? p.embarques_registrados : [];
        const matchEmbarque = statusEmbSel.some(s => {
          if (s === 'Aguardando Embarque') {
            // pedido com itens que não foram embarcados
            const qtdEmb = embarques.reduce((acc, emb) => {
              (emb.itens_embarcados || []).forEach(ie => { acc[ie.produto_id] = (acc[ie.produto_id] || 0) + (Number(ie.quantidade_embarcada) || 0); });
              return acc;
            }, {});
            return (p.itens || []).some(i => (Number(i.quantidade) || 0) - (qtdEmb[i.produto_id] || 0) > 0);
          }
          return embarques.some(emb => emb.status_recebimento_embarque === s);
        });
        if (!matchPai && !matchEmbarque) return false;
      }

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

  const pedidosVisiveisLista = useMemo(() => {
    const concluidosSelecionados = statusSel.includes('Concluído');
    const statusExplicitos = statusSel.filter(s => s !== '__nao_concluido__');
    const statusPaiSel = statusExplicitos.filter(s => !STATUS_EMBARQUE_VIRTUAIS.includes(s));
    const statusEmbSel = statusExplicitos.filter(s => STATUS_EMBARQUE_VIRTUAIS.includes(s));

    return filtrados.filter((pedido) => {
      const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
      const hasVirtualConcluido = embarques.some((emb) => ['Recebido OK', 'Concluído'].includes(emb.status_recebimento_embarque));

      if (pedido.status === 'Concluído') return concluidosSelecionados;

      const statusPermitido = ['Rascunho', 'Aguardando Aprovação Financeira', 'Aprovado'].includes(pedido.status) || pedido.status_aprovacao_financeira === 'Aprovado';
      if (!(statusPermitido && calcularValorPendentePedido(pedido) > 0)) return false;

      // Quando groupBy=eta_transportadora, filtra também por status dos embarques virtuais
      if (groupBy === 'eta_transportadora' && statusExplicitos.length > 0) {
        // Se há seleção de status pai, pedido passa se tem status pai ou embarques com status selecionado
        if (statusPaiSel.length > 0 && statusEmbSel.length === 0) {
          return statusPaiSel.includes(pedido.status);
        }
        // Se há seleção de status embarque, verifica se algum embarque / órfão corresponde
        if (statusEmbSel.length > 0) {
          const temEmbarqueMatch = statusEmbSel.some(s => {
            if (s === 'Aguardando Embarque') {
              const qtdEmb = embarques.reduce((acc, emb) => {
                (emb.itens_embarcados || []).forEach(ie => { acc[ie.produto_id] = (acc[ie.produto_id] || 0) + (Number(ie.quantidade_embarcada) || 0); });
                return acc;
              }, {});
              const temOrfaos = (pedido.itens || []).some(i => (Number(i.quantidade) || 0) - (qtdEmb[i.produto_id] || 0) > 0);
              return temOrfaos && pedido.status === 'Pendência';
            }
            if (s === 'Concluído') {
              return embarques.some(emb => ['Recebido OK', 'Concluído'].includes(emb.status_recebimento_embarque));
            }
            if (s === 'Despachado') {
              return embarques.some(emb => !['Recebido OK', 'Concluído'].includes(emb.status_recebimento_embarque));
            }
            return embarques.some(emb => emb.status_recebimento_embarque === s);
          });
          if (!temEmbarqueMatch) return false;
        }
      }
      return true;
    });
  }, [filtrados, statusSel, groupBy]);

  const pedidosVisiveisPendentes = useMemo(() => {
    return pedidosVisiveisLista.filter((pedido) => pedido.status !== 'Concluído');
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
    const statusExplicitos = statusSel.filter(s => s !== '__nao_concluido__');
    const statusPaiSel = statusExplicitos.filter(s => !STATUS_EMBARQUE_VIRTUAIS.includes(s));

    const getGroupMeta = (pedido, embarque) => {
      if (groupBy === 'fornecedor') {
        const fornecedor = pedido.fornecedor_nome?.trim() || 'Sem fornecedor';
        return { key: `fornecedor:${fornecedor}`, label: fornecedor, orderValue: fornecedor.toLowerCase() };
      }

      if (groupBy === 'status') {
        const status = pedido.status || 'Sem status';
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

    // Expande pedidos em entradas virtuais: uma por embarque (quando groupBy=eta_transportadora)
    const virtualEntries = [];
    pedidosVisiveisLista.forEach((pedido) => {
      const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];

      if (groupBy === 'eta_transportadora' && embarques.length > 0) {
        embarques.forEach((emb, idx) => {
          const displayStatus = ['Recebido OK', 'Concluído'].includes(emb.status_recebimento_embarque) ? 'Concluído' : 'Despachado';
          const ocultarConcluidoVirtual = statusSel.includes('__nao_concluido__') && !statusSel.includes('Concluído') && displayStatus === 'Concluído';
          const matchStatusExplicito = !statusExplicitos.length || statusExplicitos.includes(displayStatus) || statusPaiSel.includes(pedido.status);

          if (!ocultarConcluidoVirtual && matchStatusExplicito) {
            virtualEntries.push({ pedido, embarque: emb, virtualKey: `${pedido.id}_emb_${emb.id || idx}` });
          }
        });
        // Para Pendência: adiciona card extra para itens órfãos (não embarcados)
        if (pedido.status === 'Pendência') {
          const qtdEmbarcadaPorProduto = embarques.reduce((acc, emb) => {
            (emb.itens_embarcados || []).forEach(ie => {
              acc[ie.produto_id] = (acc[ie.produto_id] || 0) + (Number(ie.quantidade_embarcada) || 0);
            });
            return acc;
          }, {});
          const temOrfaos = (pedido.itens || []).some(i => {
            const embarcada = qtdEmbarcadaPorProduto[i.produto_id] || 0;
            return (Number(i.quantidade) || 0) - embarcada > 0;
          });
          if (temOrfaos) {
            virtualEntries.push({ pedido, embarque: null, virtualKey: `${pedido.id}_orfaos`, _is_orfao: true });
          }
        }
      } else {
        virtualEntries.push({ pedido, embarque: embarques[0] || null, virtualKey: pedido.id });
      }
    });

    const map = {};
    virtualEntries.forEach(({ pedido, embarque, virtualKey, _is_orfao }) => {
      const meta = getGroupMeta(pedido, embarque);
      if (!map[meta.key]) {
        map[meta.key] = { key: meta.key, label: meta.label, orderValue: meta.orderValue, pedidos: [] };
      }
      // Calcula campos de exibição específicos para cada card virtual
      let _display_status = null;
      let _display_valor = null;
      let _display_itens = null;

      if (_is_orfao) {
        _display_status = 'Pendência';
        const qtdEmbarcadaPorProduto = (pedido.embarques_registrados || []).reduce((acc, emb) => {
          (emb.itens_embarcados || []).forEach(ie => {
            acc[ie.produto_id] = (acc[ie.produto_id] || 0) + (Number(ie.quantidade_embarcada) || 0);
          });
          return acc;
        }, {});
        const itensOrfaos = (pedido.itens || []).map(i => {
          const embarcada = qtdEmbarcadaPorProduto[i.produto_id] || 0;
          const pendente = Math.max(0, (Number(i.quantidade) || 0) - embarcada);
          return { ...i, quantidade: pendente };
        }).filter(i => i.quantidade > 0);
        _display_itens = itensOrfaos;
        _display_valor = itensOrfaos.reduce((acc, i) => acc + (i.quantidade * (Number(i.custo_unitario) || 0)), 0);
      } else if (embarque) {
        // Card virtual de embarque representa o estado do próprio embarque no front
        if (pedido.status === 'Concluído' || ['Recebido OK', 'Concluído'].includes(embarque.status_recebimento_embarque)) {
          _display_status = 'Concluído';
        } else {
          _display_status = 'Despachado';
        }
        const custoPorProduto = (pedido.itens || []).reduce((acc, i) => {
          acc[i.produto_id] = Number(i.custo_unitario) || 0;
          return acc;
        }, {});
        _display_itens = (embarque.itens_embarcados || []).map(ie => ({
          produto_id: ie.produto_id,
          produto_nome: ie.produto_nome,
          quantidade: Number(ie.quantidade_embarcada) || 0,
          custo_unitario: custoPorProduto[ie.produto_id] || 0,
        }));
        _display_valor = _display_itens.reduce((acc, i) => acc + (i.quantidade * i.custo_unitario), 0);
      }

      map[meta.key].pedidos.push({
        ...pedido,
        _virtual_key: virtualKey,
        _embarque: embarque,
        _is_orfao: _is_orfao || false,
        _display_status,
        _display_valor,
        _display_itens,
        _is_virtual_concluido: STATUS_VIRTUAL_CONCLUIDOS.includes(_display_status),
        valor_pendente_entrega: pedido.status === 'Concluído' ? 0 : calcularValorPendentePedido(pedido)
      });
    });

    const gruposComTotal = Object.values(map)
      .sort((a, b) => compareValues(a.orderValue, b.orderValue))
      .map((grupo) => {
        const pedidosSort = grupo.pedidos.sort((a, b) => {
          const valorA = a.data_emissao || a.created_date || '';
          const valorB = b.data_emissao || b.created_date || '';
          return compareValues(valorA, valorB);
        });
        // Soma apenas _display_valor (valor do card virtual), não valor_pendente_entrega
        const totalETA = groupBy === 'eta_transportadora'
          ? pedidosSort.reduce((acc, p) => acc + (p._display_valor || 0), 0)
          : 0;
        return {
          key: grupo.key,
          label: grupo.label,
          pedidos: pedidosSort,
          _total_eta: totalETA
        };
      });
    return gruposComTotal;
  }, [pedidosVisiveisLista, groupBy, sortOrder, statusSel]);

  const hasActiveFilters = search || fornecedorSel.length > 0 || tagsSel.length > 0 || dataInicial || dataFinal || statusSel.some(status => status !== '__nao_concluido__');

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header */}
      <div className="pb-3 mb-1 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Pedidos de Compra</p>
          <p className="text-xs text-gray-400">{pedidosVisiveisPendentes.length} pedidos com saldo pendente · R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Pago e ainda não entregue no filtro: R$ {valorPagoNaoEntregue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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