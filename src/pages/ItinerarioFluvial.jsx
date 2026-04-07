import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addDays, format, isSameDay } from 'date-fns';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import CreateEventoLogisticoDialog from '@/components/logistica-sandbox/CreateEventoLogisticoDialog';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';

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
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [horizonDays, setHorizonDays] = useState(90);
  const queryClient = useQueryClient();

  const { data: eventosLogisticos = [] } = useQuery({
    queryKey: ['evento-logistico'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 50),
    initialData: []
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy');
  };

  const eventos = useMemo(() => {
    const source = eventosLogisticos.length ? eventosLogisticos : fallbackEventos;

    return source
      .filter(item => !routeType || routeType === 'Fluvial')
      .map(item => {
        const saidaManaus = item.data_saida_origem || item.data_referencia;
        const chegadaTabatinga = item.data_chegada_destino || item.previsao_chegada;
        const chegadaManaus = item.data_chegada_manaus || item.data_retorno_origem || item.previsao_retorno;

        return {
          ...item,
          data_chegada_manaus: chegadaManaus,
          data_saida_origem: saidaManaus,
          data_chegada_destino: chegadaTabatinga,
          data_chegada_manaus_formatada: formatDate(chegadaManaus),
          data_saida_manaus_formatada: formatDate(saidaManaus),
          data_chegada_destino_formatada: formatDate(chegadaTabatinga),
          data_retorno_origem_formatada: formatDate(chegadaManaus)
        };
      })
      .sort((a, b) => new Date(b.data_saida_origem || 0) - new Date(a.data_saida_origem || 0));
  }, [eventosLogisticos, routeType]);

  const groupedEventos = useMemo(() => {
    const targetDate = new Date(`${simulationDate}T00:00:00`);
    const endDate = addDays(targetDate, horizonDays);

    const getViewDate = (evento) => {
      if (viewMode === 'chegada_manaus') return evento.data_chegada_manaus;
      if (viewMode === 'chegada_tabatinga') return evento.data_chegada_destino;
      return evento.data_saida_origem;
    };

    return eventos
      .map((evento) => {
        const viewDate = getViewDate(evento);
        return {
          ...evento,
          visualizacao_data: viewDate,
          visualizacao_data_formatada: formatDate(viewDate)
        };
      })
      .filter((evento) => {
        if (!evento.visualizacao_data) return false;
        const marco = new Date(`${evento.visualizacao_data}T00:00:00`);
        return marco >= targetDate && marco <= endDate;
      })
      .reduce((acc, evento) => {
        const key = evento.visualizacao_data;
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
      }, {});
  }, [eventos, simulationDate, horizonDays, viewMode]);

  const timelineItems = useMemo(() => {
    return Object.entries(groupedEventos)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([dateKey, items]) => {
        const date = new Date(`${dateKey}T00:00:00`);
        return {
          key: dateKey,
          label: format(date, 'EEEE, d MMM'),
          dayNumber: format(date, 'd'),
          isToday: isSameDay(date, new Date(`${simulationDate}T00:00:00`)),
          eventos: items
        };
      });
  }, [groupedEventos, simulationDate]);

  const viewModeLabel = viewMode === 'chegada_manaus'
    ? 'Chegada Manaus'
    : viewMode === 'chegada_tabatinga'
      ? 'Chegada Tabatinga'
      : 'Saída Manaus';

  const currentEvento = selectedEvento || timelineItems[0]?.eventos?.[0] || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <LogisticaSandboxHeader />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <RouteModeToggle value={routeType} onChange={setRouteType} />
          <CreateEventoLogisticoDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ['evento-logistico'] })} />
        </div>
        <TimelineViewControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          horizonDays={horizonDays}
          onHorizonDaysChange={setHorizonDays}
        />
        <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
          <div className="bg-transparent space-y-1">
            {timelineItems.map((item) => (
              <TimelineDayGroup
                key={item.key}
                label={item.label}
                dayNumber={item.dayNumber}
                eventos={item.eventos}
                isToday={item.isToday}
                onSelect={setSelectedEvento}
                viewModeLabel={viewModeLabel}
              />
            ))}
          </div>
          <TimelineSidebarCard evento={currentEvento} />
        </div>
      </div>
    </div>
  );
}