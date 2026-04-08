import { useState, useMemo, useEffect, useRef } from 'react';
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
import FluvialFAB from '@/components/logistica-sandbox/mobile/FluvialFAB';

export default function ItinerarioFluvialMobile() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [freteMonth, setFreteMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [scrolledToToday, setScrolledToToday] = useState(false);
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
      const pedidosData = await base44.entities.PedidoCompra.list('', 500);
      const mapaReferenciaoPedidos = {};
      pedidosData.forEach(pedido => {
        mapaReferenciaoPedidos[pedido.id] = pedido;
      });
      
      return embarquesData.map(embarque => ({
        ...embarque,
        _pedido_compra: mapaReferenciaoPedidos[embarque.pedido_compra_id] || null
      }));
    },
    initialData: []
  });

  const { data: lancamentosFinanceiros = [] } = useQuery({
    queryKey: ['lancamentos-financeiros-fretes'],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ referencia_tipo: 'EventosLogisticos' }, '-created_date', 500),
    initialData: []
  });

  const eventosBase = useMemo(() => buildFluvialEvents({ eventosLogisticos, embarques, lancamentosFinanceiros }), [eventosLogisticos, embarques, lancamentosFinanceiros]);

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
  }, [routeType, viewMode, simulationDate, freteMonth]);

  const groupedEventos = useMemo(() => {
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
        return true;
      })
      .reduce((acc, evento) => {
        const key = evento.visualizacao_data;
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
      }, {});
  }, [eventos, viewMode, searchTerm]);

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
    if (!scrolledToToday && timelineItems.length > 0) {
      const todayItem = timelineItems.find(item => item.isToday);
      if (todayItem && todayRef.current) {
        setTimeout(() => {
          todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setScrolledToToday(true);
        }, 100);
      }
    }
  }, [timelineItems, scrolledToToday]);

  const viewModeLabel = viewMode === 'chegada_manaus' ? 'Chegada Manaus' : viewMode === 'chegada_tabatinga' ? 'Chegada Tabatinga' : 'Saída Manaus';

  const freteEventos = useMemo(() => {
    return eventos.filter((evento) => evento.tem_conta_frete === true);
  }, [eventos]);

  const freteEventosFiltrados = useMemo(() => {
    let filtered = freteEventos;
    
    // Filtrar por mês
    const freteMonthStart = new Date(freteMonth.getFullYear(), freteMonth.getMonth(), 1);
    const freteMonthEnd = new Date(freteMonth.getFullYear(), freteMonth.getMonth() + 1, 0);
    
    filtered = filtered.filter((evento) => {
      const eventDate = evento.data_saida_origem ? new Date(`${evento.data_saida_origem}T00:00:00`) : null;
      return eventDate && eventDate >= freteMonthStart && eventDate <= freteMonthEnd;
    });
    
    // Aplicar filtro selecionado
    if (freteFilter !== 'todos') {
      filtered = filtered.filter((evento) => {
        if (freteFilter === 'pago') return evento.lancamento_financeiro_status === 'Pago';
        if (freteFilter === 'aberto') return evento.lancamento_financeiro_status === 'Em Aberto';
        if (freteFilter === 'vencido') return evento.lancamento_financeiro_status === 'Vencido';
        return true;
      });
    }
    
    return filtered;
  }, [freteEventos, freteMonth, freteFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 overflow-x-hidden">
      <div className="max-w-md mx-auto px-3 space-y-4 overflow-x-hidden">
        <ItinerarioMobileHeader />
        <ItinerarioMobileTopTabs value={routeType} onChange={setRouteType} />

        {routeType === 'Fluvial' && !selectedEvento ? (
          <FluvialSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
          />
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
            <>
              <div className="js-fluvial-timeline-scroll max-h-[calc(100vh-14rem)] space-y-4 overflow-y-auto pb-4 pr-1 overflow-x-hidden">
              {timelineItems.map((item) => (
                <div key={item.key} ref={item.isToday ? todayRef : null}>
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
              <FluvialFAB
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                simulationDate={simulationDate}
                onSimulationDateChange={setSimulationDate}
              />
            </>
          ) : (
            <ItinerarioMobileEmptyState
              title="Nenhum evento encontrado"
              description="Verifique os filtros e tente novamente."
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
                  description="Não encontramos fretes com embarques."
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
      </div>
    </div>
  );
}