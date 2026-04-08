import { format } from 'date-fns';

export function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy');
}

export function buildFluvialEvents({ eventosLogisticos = [], embarques = [], contasPrevistas = [] }) {
  const contasFrete = (contasPrevistas || []).filter((conta) => {
    const descricao = `${conta.descricao || ''} ${Array.isArray(conta.tags) ? conta.tags.join(' ') : ''}`.toLowerCase();
    return descricao.includes('frete') || descricao.includes('cmv');
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
        return total + (embarque.itens || []).reduce((sum, itemEmbarque) => sum + ((itemEmbarque.quantidade_embarcada || 0) * (itemEmbarque.custo_unitario || 0)), 0);
      }, 0);

      const contaFrete = contasFrete.find((conta) => {
        const ref = `${conta.referencia_id || ''} ${conta.descricao || ''}`;
        return ref.includes(item.id) || ref.includes(item.codigo || '');
      });

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
        tem_embarques_relacionados: embarquesRelacionados.length > 0,
        total_embarques_relacionados: embarquesRelacionados.length,
        total_fornecedores_relacionados: resumoFornecedores.length,
        resumo_fornecedores: resumoFornecedores,
        valor_total_carga: valorTotalCarga,
        conta_frete: contaFrete || null,
        conta_frete_status: contaFrete?.status || null,
        conta_frete_valor: contaFrete?.valor || 0,
        conta_frete_descricao: contaFrete?.descricao || '',
        tem_conta_frete: Boolean(contaFrete)
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
      return new Date(`${evento.data_chegada_destino}T00:00:00`) >= new Date();
    }) || eventosRelacionados[0];

    return {
      ...item,
      status: item.ativo === false ? 'inativa' : 'ativa',
      proximo_eta: proximoEvento?.data_chegada_destino ? format(new Date(`${proximoEvento.data_chegada_destino}T00:00:00`), 'dd/MM/yyyy') : '-',
      recorrencia: item.saida_referencia || '-',
      eventos: eventosRelacionados.map((evento) => ({
        id: evento.id,
        titulo: evento.nome || `${item.nome} · ${evento.codigo}`,
        codigo: evento.codigo || '-',
        data: formatDate(evento.data_saida_origem),
        cargas: evento.total_embarques_relacionados || 0,
        freteValor: evento.tem_conta_frete
          ? (evento.conta_frete_valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : 'Frete pendente',
        financeiroStatus: evento.conta_frete_status === 'Pago' ? 'pago' : evento.tem_conta_frete ? 'vinculado' : 'sem_conta',
        pagamentoLabel: evento.tem_conta_frete ? (evento.conta_frete_status || 'Conta vinculada') : 'Sem conta',
        embarques: evento.embarques_relacionados || [],
        anexos: [],
      })),
      timeline: eventosRelacionados.flatMap((evento) => ([
        {
          label: 'Chegada em Manaus',
          data: formatDate(evento.data_chegada_manaus),
          status: evento.data_chegada_manaus ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_chegada_manaus ? format(new Date(`${evento.data_chegada_manaus}T00:00:00`), 'dd') : '--',
          hasLinked: Boolean(evento.total_embarques_relacionados),
          linkedCount: evento.total_embarques_relacionados || 0,
        },
        {
          label: 'Saída de Manaus',
          data: formatDate(evento.data_saida_origem),
          status: evento.data_saida_origem ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_saida_origem ? format(new Date(`${evento.data_saida_origem}T00:00:00`), 'dd') : '--',
          hasLinked: Boolean(evento.total_embarques_relacionados),
          linkedCount: evento.total_embarques_relacionados || 0,
        },
        {
          label: 'ETA Tabatinga',
          data: formatDate(evento.data_chegada_destino),
          status: evento.data_chegada_destino ? 'Planejado' : 'Sem data',
          dayLabel: evento.data_chegada_destino ? format(new Date(`${evento.data_chegada_destino}T00:00:00`), 'dd') : '--',
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