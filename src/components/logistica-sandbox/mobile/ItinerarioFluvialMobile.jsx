import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { addDays, format, isSameDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildFluvialEvents, formatDate } from '@/components/logistica-sandbox/fluvialDataUtils';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import MobileDetailHeader from '@/components/logistica-sandbox/MobileDetailHeader';
import FreteMonthNavigator from '@/components/logistica-sandbox/FreteMonthNavigator';
import FreteFAB from '@/components/logistica-sandbox/mobile/FreteFAB';
import FreteTotalValue from '@/components/logistica-sandbox/FreteTotalValue';
import FreteListCard from '@/components/logistica-sandbox/FreteListCard';
import EventoCargaReportCard from '@/components/logistica-sandbox/EventoCargaReportCard';
import FreteDetailPanel from '@/components/logistica-sandbox/FreteDetailPanel';
import BoatsTab from '@/components/logistica-sandbox/BoatsTab';
import ItinerarioMobileTopTabs from '@/components/logistica-sandbox/mobile/ItinerarioMobileTopTabs';
import ItinerarioMobileHeader from '@/components/logistica-sandbox/mobile/ItinerarioMobileHeader';
import ItinerarioMobileEmptyState from '@/components/logistica-sandbox/mobile/ItinerarioMobileEmptyState';
import FluvialSearchBar from '@/components/logistica-sandbox/mobile/FluvialSearchBar';
import FluvialSimulationFab from '@/components/logistica-sandbox/mobile/FluvialSimulationFab';
import FluvialBottomFilterSheet from '@/components/logistica-sandbox/mobile/FluvialBottomFilterSheet';

export default function ItinerarioFluvialMobile() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [periodRange, setPeriodRange] = useState(() => {
    const today = new Date();
    return { from: subDays(today, 30), to: addDays(today, 30) };
  });
  const [freteMonth, setFreteMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [onlyLinked, setOnlyLinked] = useState(false);
  const [linkedStatus, setLinkedStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [freteFilter, setFreteFilter] = useState('todos');
  const todayRef = useRef(null);

  const { data: eventosLogisticos = [] } = useQuery({
    queryKey: ['evento-logistico'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 50),
    initialData: []
  });

  const { data: embarques = [] } = useQuery({
    queryKey: ['embarques-logistica'],
    queryFn: async () => {
      const embarquesData = await base44.entities.Embarque.list('-created_date', 500);
      // Carregar todos os PedidosCompra e criar mapa
      const pedidosData = await base44.entities.PedidoCompra.list('', 500);
      const mapaReferenciaoPedidos = {};
      pedidosData.forEach(pedido => {
        mapaReferenciaoPedidos[pedido.id] = pedido;
      });
      
      // Enriquecer embarques com relação _pedido_compra
      return embarquesData.map(embarque => ({
        ...embarque,
        _pedido_compra: mapaReferenciaoPedidos[embarque.pedido_compra_id] || null
      }));
    },
    initialData: []
  });

  const { data: contasPrevistas = [] } = useQuery({
    queryKey: ['contas-previstas-frete'],
    queryFn: () => base44.entities.ContaPrevista.list('-data_vencimento', 500),
    initialData: []
  });

  const eventosBase = useMemo(() => buildFluvialEvents({ eventosLogisticos, embarques, contasPrevistas }), [eventosLogisticos, embarques, contasPrevistas]);

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

      return { ...item, ocupacao_percentual_dinamica: ocupacaoPercentualDinamica };
    });
  }, [eventosBase, simulationDate]);

  useEffect(() => {
    setSelectedEvento(null);
  }, [routeType, viewMode, simulationDate, freteMonth, periodRange, onlyLinked]);

  useEffect(() => {
    const baseDate = new Date(`${simulationDate}T12:00:00`);
    setPeriodRange({ from: subDays(baseDate, 30), to: addDays(baseDate, 30) });
  }, [simulationDate]);

  const groupedEventos = useMemo(() => {
    const targetDate = periodRange?.from || new Date(`${simulationDate}T00:00:00`);
    const endDate = periodRange?.to || null;

    const getViewDate = (evento) => {
      if (viewMode === 'chegada_tabatinga') return evento.data_chegada_destino;
      if (viewMode === 'saida_manaus') return evento.data_saida_origem;
      return evento.data_chegada_manaus;
    };

    return eventos
      .map((evento) => ({
        ...evento,
        visualizacao_data: getViewDate(evento),
        visualizacao_data_formatada: formatDate(getViewDate(evento))
      }))
      .filter((evento) => {
        if (!evento.visualizacao_data) return false;
        if (searchTerm) {
          const termo = searchTerm.toLowerCase();
          const matchNome = String(evento.embarcacao_nome || '').toLowerCase().includes(termo);
          const matchCodigo = String(evento.codigo || '').toLowerCase().includes(termo);
          if (!matchNome && !matchCodigo) return false;
        }
        if (onlyLinked && !evento.tem_embarques_relacionados) return false;
        if (onlyLinked && linkedStatus === 'ativos' && !(evento.total_embarques_ativos > 0)) return false;
        if (onlyLinked && linkedStatus === 'concluidos' && !(evento.total_embarques_concluidos > 0 && evento.total_embarques_ativos === 0)) return false;
        const marco = new Date(`${evento.visualizacao_data}T00:00:00`);
        if (marco < targetDate) return false;
        if (endDate && marco > endDate) return false;
        return true;
      })
      .reduce((acc, evento) => {
        const key = evento.visualizacao_data;
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
      }, {});
  }, [eventos, simulationDate, periodRange, viewMode, onlyLinked, linkedStatus, searchTerm]);

  const timelineItems = useMemo(() => {
    const sortedItems = Object.entries(groupedEventos)
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

    if (sortedItems.some((item) => item.isToday)) {
      return sortedItems;
    }

    if (!sortedItems.length) {
      return sortedItems;
    }

    const simulationBase = new Date(`${simulationDate}T12:00:00`).getTime();
    let insertIndex = sortedItems.findIndex((item) => new Date(`${item.key}T12:00:00`).getTime() > simulationBase);
    if (insertIndex === -1) {
      insertIndex = sortedItems.length;
    }

    const marcadorHoje = {
      key: `today-marker-${simulationDate}`,
      label: format(new Date(`${simulationDate}T12:00:00`), "EEEE, d 'de' MMM", { locale: ptBR }),
      dayNumber: format(new Date(`${simulationDate}T12:00:00`), 'd'),
      isToday: true,
      isMarkerOnly: true,
      eventos: []
    };

    return [...sortedItems.slice(0, insertIndex), marcadorHoje, ...sortedItems.slice(insertIndex)];
  }, [groupedEventos, simulationDate]);

  useEffect(() => {
    const refElement = todayRef.current;
    if (!refElement) return;

    const container = refElement.closest('.js-fluvial-timeline-scroll');
    if (!container) {
      refElement.scrollIntoView({ block: 'center' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = refElement.getBoundingClientRect();
    const currentScroll = container.scrollTop;
    const targetScroll = currentScroll + (elementRect.top - containerRect.top) - (container.clientHeight / 2) + (elementRect.height / 2);

    container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [timelineItems]);

  const viewModeLabel = viewMode === 'chegada_manaus' ? 'Chegada Manaus' : viewMode === 'chegada_tabatinga' ? 'Chegada Tabatinga' : 'Saída Manaus';

  const freteEventos = useMemo(() => {
    const start = new Date(freteMonth.getFullYear(), freteMonth.getMonth(), 1);
    const end = new Date(freteMonth.getFullYear(), freteMonth.getMonth() + 1, 0);

    return eventos.filter((evento) => {
      const ref = evento.data_saida_origem || evento.data_chegada_manaus || evento.data_chegada_destino;
      if (!ref) return false;
      const date = new Date(`${ref}T00:00:00`);
      return date >= start && date <= end && evento.tem_embarques_relacionados;
    });
  }, [eventos, freteMonth]);

  const freteEventosFiltrados = useMemo(() => {
    switch (freteFilter) {
      case 'comConta':
        return freteEventos.filter(e => e.tem_conta_frete);
      case 'semConta':
        return freteEventos.filter(e => !e.tem_conta_frete);
      default:
        return freteEventos;
    }
  }, [freteEventos, freteFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 overflow-x-hidden">
      <div className="max-w-md mx-auto px-3 space-y-4 overflow-x-hidden">
        <ItinerarioMobileHeader />
        <ItinerarioMobileTopTabs value={routeType} onChange={setRouteType} />

        {routeType === 'Fluvial' && !selectedEvento ? (
          <>
            <FluvialSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <div className="fixed bottom-24 right-4 z-40">
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg dark:bg-gray-100 dark:text-slate-900"
              >
                <span className="sr-only">Abrir filtros</span>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
              </button>
            </div>
            <FluvialBottomFilterSheet
              open={showFilters}
              onOpenChange={setShowFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              periodRange={periodRange}
              onPeriodRangeChange={setPeriodRange}
              simulationDate={simulationDate}
              onSimulationDateChange={setSimulationDate}
              onlyLinked={onlyLinked}
              linkedStatus={linkedStatus}
              onLinkedStatusChange={setLinkedStatus}
              onOnlyLinkedChange={setOnlyLinked}
            />
          </>
        ) : null}

        {routeType === 'Fluvial' ? (
          selectedEvento ? (
            <div className="space-y-4 pb-4">
              <MobileDetailHeader
                title={selectedEvento.embarcacao_nome}
                subtitle={selectedEvento.codigo || 'Detalhes do evento'}
                onBack={() => setSelectedEvento(null)}
              />
              <TimelineSidebarCard evento={selectedEvento} />
            </div>
          ) : timelineItems.length > 0 ? (
            <div className="js-fluvial-timeline-scroll max-h-[calc(100vh-14rem)] space-y-4 overflow-y-auto pb-4 pr-1 overflow-x-hidden">
              {timelineItems.map((item) => (
                <div key={item.key} ref={item.isToday ? todayRef : null} className="relative">
                  {item.isToday ? <div className="absolute left-[2px] top-[4px] h-10 w-10 rounded-2xl ring-4 ring-lime-300/80 pointer-events-none" /> : null}
                  <TimelineDayGroup
                    label={item.label}
                    dayNumber={item.dayNumber}
                    eventos={item.eventos}
                    isToday={item.isToday}
                    onSelect={setSelectedEvento}
                    viewModeLabel={viewModeLabel}
                    selectedEventoId={selectedEvento?.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <ItinerarioMobileEmptyState
              title="Nenhum evento encontrado"
              description="Ajuste os filtros para visualizar viagens neste período."
            />
          )
        ) : routeType === 'Fretes' ? (
          selectedEvento ? (
            <FreteDetailPanel
              evento={selectedEvento}
              embarques={selectedEvento.embarques_relacionados || []}
              onBack={() => setSelectedEvento(null)}
            />
          ) : (
            <div className="space-y-4 pb-4">
              <div>
                <FreteMonthNavigator
                  currentMonth={freteMonth}
                  onPrev={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() - 1, 1))}
                  onNext={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() + 1, 1))}
                />
                <FreteTotalValue eventos={freteEventosFiltrados} />
              </div>
              {freteEventosFiltrados.length > 0 ? freteEventosFiltrados.map((evento) => (
                <FreteListCard key={evento.id} evento={evento} onSelect={setSelectedEvento} />
              )) : (
                <ItinerarioMobileEmptyState
                  title="Nenhum frete com carga"
                  description="Não encontramos fretes com embarques no mês selecionado."
                />
              )}
              <FreteFAB
                selectedFilter={freteFilter}
                onFilterChange={setFreteFilter}
              />
            </div>
          )
        ) : (
          <div className="pb-4">
            <BoatsTab />
          </div>
        )}

        {false ? (
          <FluvialSimulationFab value={simulationDate} onChange={setSimulationDate} />
        ) : null}
      </div>
    </div>
  );
}