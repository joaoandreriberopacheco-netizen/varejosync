import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import LogisticaSandboxBoard from '@/components/logistica-sandbox/LogisticaSandboxBoard';
import LogisticaSandboxSidebar from '@/components/logistica-sandbox/LogisticaSandboxSidebar';

const fallbackEventos = [
  {
    id: 'mock-1',
    embarcacao_nome: 'Rei do Rio',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Em Viagem',
    previsao_chegada: '14/04/2026',
    previsao_retorno: '21/04/2026',
    ocupacao_percentual: 72,
    dias_atraso: 0,
    chave_relacional_futura: 'evento_logistico_id'
  },
  {
    id: 'mock-2',
    embarcacao_nome: 'Solimões I',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Atracado no Destino',
    previsao_chegada: '08/04/2026',
    previsao_retorno: '15/04/2026',
    ocupacao_percentual: 91,
    dias_atraso: 1,
    chave_relacional_futura: 'evento_logistico_id'
  },
  {
    id: 'mock-3',
    embarcacao_nome: 'Estrela do Norte',
    rota_nome: 'Manaus → Tabatinga',
    status_operacao: 'Retornando',
    previsao_chegada: '18/04/2026',
    previsao_retorno: '25/04/2026',
    ocupacao_percentual: 44,
    dias_atraso: 0,
    chave_relacional_futura: 'evento_logistico_id'
  }
];

export default function ItinerarioFluvial() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);

  const { data: sandboxEventos = [] } = useQuery({
    queryKey: ['evento-logistico-sandbox'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-created_date', 50),
    initialData: []
  });

  const eventos = useMemo(() => {
    const usable = sandboxEventos.filter(item => !routeType || item.rota_nome?.includes('Manaus') || routeType === 'Rodoviária');
    return usable.length ? usable : fallbackEventos;
  }, [sandboxEventos, routeType]);

  const currentEvento = selectedEvento || eventos[0] || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <LogisticaSandboxHeader />
        <RouteModeToggle value={routeType} onChange={setRouteType} />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <LogisticaSandboxBoard eventos={eventos} onSelect={setSelectedEvento} />
          <LogisticaSandboxSidebar evento={currentEvento} />
        </div>
      </div>
    </div>
  );
}