import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import LogisticaSandboxBoard from '@/components/logistica-sandbox/LogisticaSandboxBoard';
import LogisticaSandboxSidebar from '@/components/logistica-sandbox/LogisticaSandboxSidebar';

const fallbackEventos = [
  {
    id: 'mock-1',
    codigo: 'EVT-001',
    embarcacao_nome: 'Rei do Rio',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Em Viagem',
    data_saida_origem: '2026-04-07',
    data_chegada_destino: '2026-04-14',
    data_retorno_origem: '2026-04-21',
    ocupacao_percentual: 72,
    dias_atraso: 0,
    chave_relacional_futura: 'evento_logistico_id'
  },
  {
    id: 'mock-2',
    codigo: 'EVT-002',
    embarcacao_nome: 'Solimões I',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Atracado no Destino',
    data_saida_origem: '2026-04-01',
    data_chegada_destino: '2026-04-08',
    data_retorno_origem: '2026-04-15',
    ocupacao_percentual: 91,
    dias_atraso: 1,
    chave_relacional_futura: 'evento_logistico_id'
  },
  {
    id: 'mock-3',
    codigo: 'EVT-003',
    embarcacao_nome: 'Estrela do Norte',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Retornando',
    data_saida_origem: '2026-04-11',
    data_chegada_destino: '2026-04-18',
    data_retorno_origem: '2026-04-25',
    ocupacao_percentual: 44,
    dias_atraso: 0,
    chave_relacional_futura: 'evento_logistico_id'
  }
];

export default function ItinerarioFluvial() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);

  const { data: eventosLogisticos = [] } = useQuery({
    queryKey: ['evento-logistico'],
    queryFn: () => base44.entities.EventoLogistico.list('-data_saida_origem', 50),
    initialData: []
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy');
  };

  const eventos = useMemo(() => {
    const usable = eventosLogisticos
      .filter(item => !routeType || item.rota_nome?.includes('Manaus') || routeType === 'Rodoviária')
      .map(item => ({
        ...item,
        previsao_chegada: formatDate(item.data_chegada_destino || item.previsao_chegada),
        previsao_retorno: formatDate(item.data_retorno_origem || item.previsao_retorno),
        data_saida_manaus_formatada: formatDate(item.data_saida_origem || item.data_referencia),
        data_chegada_destino_formatada: formatDate(item.data_chegada_destino || item.previsao_chegada),
        data_retorno_origem_formatada: formatDate(item.data_retorno_origem || item.previsao_retorno)
      }))
      .sort((a, b) => new Date(b.data_saida_origem || b.data_referencia || 0) - new Date(a.data_saida_origem || a.data_referencia || 0));

    return usable.length
      ? usable
      : fallbackEventos.map(item => ({
          ...item,
          previsao_chegada: formatDate(item.data_chegada_destino),
          previsao_retorno: formatDate(item.data_retorno_origem),
          data_saida_manaus_formatada: formatDate(item.data_saida_origem),
          data_chegada_destino_formatada: formatDate(item.data_chegada_destino),
          data_retorno_origem_formatada: formatDate(item.data_retorno_origem)
        }));
  }, [eventosLogisticos, routeType]);

  const currentEvento = selectedEvento || eventos[0] || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <LogisticaSandboxHeader totalEventos={eventos.length} />
        <RouteModeToggle value={routeType} onChange={setRouteType} />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <LogisticaSandboxBoard eventos={eventos} onSelect={setSelectedEvento} />
          <LogisticaSandboxSidebar evento={currentEvento} />
        </div>
      </div>
    </div>
  );
}