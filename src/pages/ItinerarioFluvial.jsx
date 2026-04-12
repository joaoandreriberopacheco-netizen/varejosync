import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildFluvialEvents, formatDate } from '@/components/logistica-sandbox/fluvialDataUtils';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import FreteResumoCard from '@/components/logistica-sandbox/FreteResumoCard';
import FreteListCard from '@/components/logistica-sandbox/FreteListCard';
import FreteSearchBar from '@/components/logistica-sandbox/FreteSearchBar';
import MobileDetailHeader from '@/components/logistica-sandbox/MobileDetailHeader';
import BoatsTab from '@/components/logistica-sandbox/BoatsTab';
import ItinerarioFluvialMobile from '@/components/logistica-sandbox/mobile/ItinerarioFluvialMobile';
import FreteDetailPanel from '@/components/logistica-sandbox/FreteDetailPanel';
import FluvialActionFab from '@/components/logistica-sandbox/FluvialActionFab';

export default function ItinerarioFluvial() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [isMobile, setIsMobile] = useState(false);
  const [freteSearchQuery, setFreteSearchQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [embarqueLinkFilter, setEmbarqueLinkFilter] = useState('todos');
  const todayRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: eventosLogisticos = [] } = useQuery({
    queryKey: ['evento-logistico'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 500),
    initialData: []
  });

  const { data: embarques = [] } = useQuery({
    queryKey: ['embarques-logistica'],
    queryFn: () => base44.entities.Embarque.list('-created_date', 500),
    initialData: []
  });

  const { data: lancamentosFinanceiros = [] } = useQuery({
    queryKey: ['lancamentos-financeiros-fretes'],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ referencia_tipo: 'EventosLogisticos' }, '-created_date', 500),
    initialData: []
  });

  useEffect(() => {
    const unsub = base44.entities.LancamentoFinanceiro.subscribe((ev) => {
      const d = ev.data || {};
      if (d.referencia_tipo === 'EventosLogisticos' || ev.type === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros-fretes'] });
      }
    });
    return typeof unsub === 'function' ? unsub : undefined;
  }, [queryClient]);

  const eventosBase = useMemo(() => buildFluvialEvents({
    eventosLogisticos,
    embarques,
    lancamentosFinanceiros,
  }), [eventosLogisticos, embarques, lancamentosFinanceiros]);

  const eventos = useMemo(() => {
    const simulationBaseDate = new Date(`${simulationDate}T12:00:00`);
    const hojeReal = new Date();
    const hojeRealBase = new Date(hojeReal.getFullYear(), hojeReal.getMonth(), hojeReal.getDate(), 12, 0, 0, 0);

    return eventosBase.map((item) => {
      const saidaManaus = item.data_saida_origem;
      const chegadaManaus = item.data_chegada_manaus;
      const inicioReal = chegadaManaus ? new Date(`${chegadaManaus}T00:00:00`) : null;
      const saidaReal = saidaManaus ? new Date(`${saidaManaus}T00:00:00`) : null;

      let ocupacaoPercentualDinamica = item.ocupacao_percentual || 0;

      if (!inicioReal || !saidaReal) {
        ocupacaoPercentualDinamica = 0;
      } else {
        const aindaNaoComecouNoReal = hojeRealBase < inicioReal;
        const aindaNaoComecouNoSimulador = simulationBaseDate < inicioReal;

        if (aindaNaoComecouNoReal || aindaNaoComecouNoSimulador) {
          ocupacaoPercentualDinamica = 0;
        } else if (simulationBaseDate >= saidaReal) {
          ocupacaoPercentualDinamica = 100;
        } else {
          const diasTotais = Math.max(1, Math.round((saidaReal - inicioReal) / (1000 * 60 * 60 * 24)));
          const diasCorridos = Math.max(0, Math.round((simulationBaseDate - inicioReal) / (1000 * 60 * 60 * 24)));
          ocupacaoPercentualDinamica = Math.max(0, Math.min(100, Math.round((diasCorridos / diasTotais) * 100)));
        }
      }

      return {
        ...item,
        ocupacao_percentual_dinamica: ocupacaoPercentualDinamica,
      };
    });
  }, [eventosBase, simulationDate]);

  React.useEffect(() => {
    setSelectedEvento(null);
  }, [routeType, viewMode, simulationDate]);

  React.useEffect(() => {
    if (routeType !== 'Fluvial') {
      // No filter panel on Fretes/Boats
    }
  }, [routeType]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const groupedEventos = useMemo(() => {
    const getViewDate = (evento) => {
      if (viewMode === 'chegada_tabatinga') return evento.data_chegada_destino;
      if (viewMode === 'saida_manaus') return evento.data_saida_origem;
      return evento.data_chegada_manaus;
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
        const temVinculoEmbarque = embarques.some((emb) => emb.evento_logistico_id === evento.id);
        if (embarqueLinkFilter === 'com_vinculo' && !temVinculoEmbarque) return false;
        if (embarqueLinkFilter === 'sem_vinculo' && temVinculoEmbarque) return false;
        return true;
      })
      .reduce((acc, evento) => {
        const key = evento.visualizacao_data;
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
      }, {});
  }, [eventos, viewMode, embarques, embarqueLinkFilter]);

  const timelineItems = useMemo(() => {
    return Object.entries(groupedEventos)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([dateKey, items]) => {
        const date = new Date(`${dateKey}T12:00:00`);
        return {
          key: dateKey,
          label: format(date, "EEEE, d 'de' MMM", { locale: ptBR }),
          dayNumber: format(date, 'd'),
          isToday: isSameDay(date, new Date(`${simulationDate}T00:00:00`)),
          eventos: items
        };
      });
  }, [groupedEventos, simulationDate]);

  // Scroll to today on mount
  useEffect(() => {
    if (todayRef.current && !isMobile) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [timelineItems, isMobile]);

  const handleScrollToToday = () => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const viewModeLabel = viewMode === 'chegada_manaus'
    ? 'Chegada Manaus'
    : viewMode === 'chegada_tabatinga'
      ? 'Chegada Tabatinga'
      : 'Saída Manaus';


  const freteEventos = useMemo(() => {
    return eventos.filter((evento) => (evento.embarques_relacionados || []).length > 0);
  }, [eventos]);

  const freteEventosFiltrados = useMemo(() => {
    if (!freteSearchQuery.trim()) return freteEventos;
    const query = freteSearchQuery.toLowerCase();
    return freteEventos.filter((evento) => 
      (evento.embarcacao_nome || '').toLowerCase().includes(query)
    );
  }, [freteEventos, freteSearchQuery]);

  const freteResumo = useMemo(() => ({
    totalFretes: freteEventos.length,
  }), [freteEventos]);


  const currentEvento = selectedEvento || timelineItems[0]?.eventos?.[0] || freteEventos[0] || null;

  if (isMobile) {
    return <ItinerarioFluvialMobile />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-3 py-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
        <LogisticaSandboxHeader />
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <RouteModeToggle value={routeType} onChange={setRouteType} />
          </div>
        </div>

        {routeType === 'Fluvial' ? (
           <>
             <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
               <div className="bg-transparent space-y-1 max-h-[calc(100vh-190px)] overflow-y-auto overflow-x-hidden pr-2 min-w-0">
                 {timelineItems.map((item) => (
                   <div key={item.key} ref={item.isToday ? todayRef : null}>
                     <TimelineDayGroup
                       label={item.label}
                       dayNumber={item.dayNumber}
                       eventos={item.eventos}
                       isToday={item.isToday}
                       onSelect={setSelectedEvento}
                       viewModeLabel={viewModeLabel}
                       selectedEventoId={currentEvento?.id}
                     />
                   </div>
                 ))}
               </div>
               <TimelineSidebarCard evento={currentEvento} />
             </div>
             <FluvialActionFab 
               onScrollToToday={handleScrollToToday}
               onOpenFilters={() => setShowFilterPanel(true)}
               embarqueLinkFilter={embarqueLinkFilter}
               onEmbarqueLinkFilterChange={setEmbarqueLinkFilter}
             />
           </>
        ) : routeType === 'Fretes' ? (
          <div className="space-y-5">
            {selectedEvento ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedEvento(null)}
                  className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Voltar
                </button>
                <FreteDetailPanel evento={selectedEvento} embarques={embarques.filter(e => e.evento_logistico_id === selectedEvento.id)} onBack={() => setSelectedEvento(null)} />
              </div>
            ) : (
              <>
                <FreteSearchBar value={freteSearchQuery} onChange={setFreteSearchQuery} />
                <FreteResumoCard eventos={freteEventosFiltrados} />
                <div className="space-y-3">
                  {freteEventosFiltrados.map((evento) => (
                    <FreteListCard key={evento.id} evento={evento} onSelect={setSelectedEvento} />
                  ))}
                  {freteEventosFiltrados.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm text-sm text-gray-500 dark:text-gray-400">
                      {freteSearchQuery ? 'Nenhuma viagem encontrada.' : 'Nenhuma viagem com embarques vinculados.'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
           <BoatsTab />
         )}
      </div>
    </div>
  );
}