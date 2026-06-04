import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function parseStableDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value) {
  if (!value) return '-';
  const parsed = parseStableDate(value);
  return parsed ? format(parsed, 'dd/MM/yyyy', { locale: ptBR }) : value;
}

export function getEmbarqueLifecycleStatus(embarque = {}) {
  const statusOperacional = String(embarque.status || '').toLowerCase();
  const statusRecebimento = String(embarque.status_recebimento || '').toLowerCase();
  const isFinalizado = statusOperacional === 'concluído' || statusOperacional === 'concluido';
  const isRecebido = statusRecebimento === 'recebido ok' || statusRecebimento === 'recebido parcial' || statusRecebimento === 'com divergência' || statusRecebimento === 'com divergencia';

  return isFinalizado || isRecebido ? 'finalizado' : 'ativo';
}

export function getLinkedIndicatorStyle(status = 'ativo') {
  if (status === 'finalizado') {
    return {
      badge: 'bg-gray-300/90 text-gray-800 dark:bg-muted/400/70 dark:text-gray-100',
      dot: 'bg-gray-300 dark:bg-muted/400'
    };
  }

  return {
    badge: 'bg-lime-300 text-foreground dark:bg-lime-300 dark:text-foreground',
    dot: 'bg-lime-300 dark:bg-lime-300'
  };
}

export function buildFluvialEvents({ eventosLogisticos = [], embarques = [], lancamentosFinanceiros = [] }) {
  // Mapa de lancamentos financeiros por referencia_id (evento logistico)
  const mapaLancamentosFrete = {};
  (lancamentosFinanceiros || []).forEach((lancamento) => {
    if (lancamento.referencia_id && lancamento.referencia_tipo === 'EventosLogisticos') {
      mapaLancamentosFrete[lancamento.referencia_id] = lancamento;
    }
  });

  // Criar mapa de itens dos pedidos de compra para enriquecer os embarques
  const mapaPedidosItens = {};
  embarques.forEach((embarque) => {
    const pedido = embarque?._pedido_compra;
    if (pedido?.id && pedido?.itens) {
      if (!mapaPedidosItens[pedido.id]) {
        mapaPedidosItens[pedido.id] = {};
      }
      pedido.itens.forEach((item) => {
        if (item?.produto_id) {
          mapaPedidosItens[pedido.id][item.produto_id] = item;
        }
      });
    }
  });

  return (eventosLogisticos || [])
    .map((item) => {
      const saidaManaus = item.data_saida_origem || item.data_referencia;
      const chegadaTabatinga = item.data_chegada_destino || item.previsao_chegada;
      const chegadaManaus = item.data_chegada_manaus || item.data_retorno_origem || item.previsao_retorno;
      const proximaChegadaManaus = item.proxima_chegada_manaus || item.proximo_ciclo_chegada_manaus;
      const embarquesRelacionados = (embarques || []).filter((emb) => emb.evento_logistico_id === item.id);

      const fornecedoresMap = new Map();
      embarquesRelacionados.forEach((embarque) => {
        const key = embarque.fornecedor_nome || 'Fornecedor';
        if (!fornecedoresMap.has(key)) {
          fornecedoresMap.set(key, { fornecedor_nome: key, itens: [] });
        }
        const group = fornecedoresMap.get(key);
        (embarque.itens || []).forEach((itemEmbarque) => {
          group.itens.push(itemEmbarque);
        });
      });

      const resumoFornecedores = Array.from(fornecedoresMap.values());
      const valorTotalCarga = embarquesRelacionados.reduce((total, embarque) => {
        const pedidoItens = mapaPedidosItens[embarque.pedido_compra_id] || {};
        return total + (embarque.itens || []).reduce((sum, itemEmbarque) => {
          const quantidade = itemEmbarque.quantidade_embarcada ?? itemEmbarque.quantidade_pedida ?? itemEmbarque.quantidade ?? 0;
          const itemPedido = pedidoItens[itemEmbarque.produto_id] || {};
          const custo = Number(itemEmbarque.custo_unitario ?? itemPedido.custo_unitario ?? 0) || 0;
          return sum + (quantidade * custo);
        }, 0);
      }, 0);
      const totalEmbarquesAtivos = embarquesRelacionados.filter((emb) => getEmbarqueLifecycleStatus(emb) === 'ativo').length;
      const totalEmbarquesConcluidos = embarquesRelacionados.filter((emb) => getEmbarqueLifecycleStatus(emb) === 'finalizado').length;

      const lancamento = mapaLancamentosFrete[item.id] || null;

      return {
        ...item,
        data_chegada_manaus: chegadaManaus,
        data_saida_origem: saidaManaus,
        data_chegada_destino: chegadaTabatinga,
        proxima_chegada_manaus: proximaChegadaManaus,
        data_chegada_manaus_formatada: formatDate(chegadaManaus),
        data_saida_manaus_formatada: formatDate(saidaManaus),
        data_chegada_destino_formatada: formatDate(chegadaTabatinga),
        proxima_chegada_manaus_formatada: formatDate(proximaChegadaManaus),
        data_retorno_origem_formatada: formatDate(proximaChegadaManaus),
        embarques_relacionados: embarquesRelacionados,
        embarques_status_resumo: embarquesRelacionados.map((emb) => getEmbarqueLifecycleStatus(emb)),
        tem_embarques_relacionados: embarquesRelacionados.length > 0,
        total_embarques_relacionados: embarquesRelacionados.length,
        total_fornecedores_relacionados: resumoFornecedores.length,
        resumo_fornecedores: resumoFornecedores,
        valor_total_carga: valorTotalCarga,
        total_embarques_ativos: totalEmbarquesAtivos,
        total_embarques_concluidos: totalEmbarquesConcluidos,
        // Dados financeiros do LancamentoFinanceiro
        conta_frete: lancamento,
        lancamento_financeiro_id: lancamento?.id || null,
        lancamento_financeiro_valor: lancamento?.valor || 0,
        lancamento_financeiro_status: lancamento?.status || null,
        lancamento_financeiro_data_vencimento: lancamento?.data_vencimento || null,
        tem_conta_frete: Boolean(lancamento)
      };
    })
    .sort((a, b) => new Date(b.data_saida_origem || 0) - new Date(a.data_saida_origem || 0));
}

export function buildBoatViewModels({ transportadoras = [], eventos = [] }) {
  return (transportadoras || []).map((item) => {
    const eventosRelacionados = (eventos || [])
      .filter((evento) => evento.transportadora_id === item.id)
      .sort((a, b) => new Date(a.data_saida_origem || 0) - new Date(b.data_saida_origem || 0));

    const proximoEvento = eventosRelacionados.find((evento) => {
      if (!evento.data_chegada_destino) return false;
      return parseStableDate(evento.data_chegada_destino) >= new Date();
    }) || eventosRelacionados[0];

    return {
      ...item,
      status: item.ativo === false ? 'inativa' : 'ativa',
      proximo_eta: proximoEvento?.data_chegada_destino ? format(parseStableDate(proximoEvento.data_chegada_destino), 'dd/MM/yyyy', { locale: ptBR }) : '-',
      recorrencia: item.saida_referencia || '-',
      eventos: eventosRelacionados
        .filter((evento) => (evento.total_embarques_relacionados || 0) > 0)
        .map((evento) => ({
          id: evento.id,
          titulo: evento.nome || `${item.nome} · ${evento.codigo}`,
          codigo: evento.codigo || '-',
          data: formatDate(evento.data_saida_origem),
          cargas: evento.total_embarques_relacionados || 0,
          freteValor: evento.tem_conta_frete
            ? (evento.lancamento_financeiro_valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : 'Frete pendente',
          financeiroStatus: evento.lancamento_financeiro_status === 'Pago' ? 'pago' : evento.tem_conta_frete ? 'vinculado' : 'sem_conta',
          pagamentoLabel: evento.tem_conta_frete ? (evento.lancamento_financeiro_status || 'Conta vinculada') : 'Sem conta',
          embarques: evento.embarques_relacionados || [],
          anexos: [],
        })),
      timeline: eventosRelacionados.flatMap((evento) => ([
        {
          label: 'Chegada em Manaus',
          data: formatDate(evento.data_chegada_manaus),
          status: evento.data_chegada_manaus ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_chegada_manaus ? format(parseStableDate(evento.data_chegada_manaus), 'dd', { locale: ptBR }) : '--',
          hasLinked: Boolean(evento.total_embarques_relacionados),
          linkedCount: evento.total_embarques_relacionados || 0,
        },
        {
          label: 'Saída de Manaus',
          data: formatDate(evento.data_saida_origem),
          status: evento.data_saida_origem ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_saida_origem ? format(parseStableDate(evento.data_saida_origem), 'dd', { locale: ptBR }) : '--',
          hasLinked: Boolean(evento.total_embarques_relacionados),
          linkedCount: evento.total_embarques_relacionados || 0,
        },
        {
          label: 'ETA Tabatinga',
          data: formatDate(evento.data_chegada_destino),
          status: evento.data_chegada_destino ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_chegada_destino ? format(parseStableDate(evento.data_chegada_destino), 'dd', { locale: ptBR }) : '--',
          hasLinked: Boolean(evento.total_embarques_relacionados),
          linkedCount: evento.total_embarques_relacionados || 0,
        }
      ])),
      itinerario_real: eventosRelacionados.flatMap((evento) => ([
        {
          id: `${evento.id}-manaus`,
          etapa: 'Chegada em Manaus',
          data: formatDate(evento.data_chegada_manaus),
          tipo: 'passada',
        },
        {
          id: `${evento.id}-saida`,
          etapa: 'Saída de Manaus',
          data: formatDate(evento.data_saida_origem),
          tipo: 'atual',
        },
        {
          id: `${evento.id}-tabatinga`,
          etapa: 'ETA Tabatinga',
          data: formatDate(evento.data_chegada_destino),
          tipo: 'futura',
        }
      ])),
    };
  });
}