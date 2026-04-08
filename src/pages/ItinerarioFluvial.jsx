import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildFluvialEvents, formatDate } from '@/components/logistica-sandbox/fluvialDataUtils';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import FluvialExpandableFilters from '@/components/logistica-sandbox/FluvialExpandableFilters';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import CreateEventoLogisticoDialog from '@/components/logistica-sandbox/CreateEventoLogisticoDialog';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';
import FreteMonthNavigator from '@/components/logistica-sandbox/FreteMonthNavigator';
import FreteTotalValue from '@/components/logistica-sandbox/FreteTotalValue';
import FreteResumoCard from '@/components/logistica-sandbox/FreteResumoCard';
import FreteListCard from '@/components/logistica-sandbox/FreteListCard';
import EventoCargaReportCard from '@/components/logistica-sandbox/EventoCargaReportCard';
import MobileDetailHeader from '@/components/logistica-sandbox/MobileDetailHeader';
import BoatsTab from '@/components/logistica-sandbox/BoatsTab';
import ItinerarioFluvialMobile from '@/components/logistica-sandbox/mobile/ItinerarioFluvialMobile';
import FreteDetailPanel from '@/components/logistica-sandbox/FreteDetailPanel';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

export default function ItinerarioFluvial() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [periodRange, setPeriodRange] = useState(() => {
    const hoje = new Date();
    const from = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30);
    const to = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30);
    return { from, to };
  });
  const [freteMonth, setFreteMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState('all');
  const [onlyLinked, setOnlyLinked] = useState(false);
  const timelineScrollRef = useRef(null);
  const queryClient = useQueryClient();

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
  }, [routeType, viewMode, simulationDate, freteMonth, periodRange]);

  React.useEffect(() => {
    if (routeType !== 'Fluvial') {
      setShowFilters(false);
    }
  }, [routeType]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boatOptions = useMemo(() => {
    return Array.from(new Set(eventos.map((evento) => evento.embarcacao_nome).filter(Boolean))).sort();
  }, [eventos]);

  const groupedEventos = useMemo(() => {
    const targetDate = periodRange?.from || new Date(`${simulationDate}T00:00:00`);
    const endDate = periodRange?.to || null;

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
        if (selectedBoat !== 'all' && evento.embarcacao_nome !== selectedBoat) return false;
        if (onlyLinked && !evento.tem_embarques_relacionados) return false;
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
  }, [eventos, simulationDate, periodRange, viewMode, selectedBoat, onlyLinked]);

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

  const viewModeLabel = viewMode === 'chegada_manaus'
    ? 'Chegada Manaus'
    : viewMode === 'chegada_tabatinga'
      ? 'Chegada Tabatinga'
      : 'Saída Manaus';

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

  const freteResumo = useMemo(() => ({
    totalFretes: freteEventos.length,
    totalComConta: freteEventos.filter((evento) => evento.tem_conta_frete).length,
    totalSemConta: freteEventos.filter((evento) => !evento.tem_conta_frete).length,
  }), [freteEventos]);

  const currentEvento = selectedEvento || timelineItems[0]?.eventos?.[0] || freteEventos[0] || null;

  useEffect(() => {
    if (!isMobile && routeType === 'Fluvial' && timelineScrollRef.current) {
      const todayMarker = timelineScrollRef.current.querySelector('[data-is-today="true"]');
      if (todayMarker) {
        todayMarker.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isMobile, routeType]);

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
            {routeType === 'Fluvial' && !isMobile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(true)}
                className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
              >
                <ListFilter className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {routeType === 'Fluvial' && isMobile && !selectedEvento ? (
          <FluvialExpandableFilters
            open={showFilters}
            onOpenChange={setShowFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            periodRange={periodRange}
            onPeriodRangeChange={setPeriodRange}
            simulationDate={simulationDate}
            onSimulationDateChange={setSimulationDate}
            boatOptions={boatOptions}
            selectedBoat={selectedBoat}
            onBoatChange={setSelectedBoat}
            onlyLinked={onlyLinked}
            onOnlyLinkedChange={setOnlyLinked}
          />
        ) : null}
        {routeType === 'Fluvial' ? (
          <>
            {isMobile ? (
              selectedEvento ? (
                <div className="space-y-4">
                  <MobileDetailHeader
                    title={selectedEvento.embarcacao_nome}
                    subtitle={selectedEvento.codigo || 'Detalhes do evento'}
                    onBack={() => setSelectedEvento(null)}
                  />
                  <TimelineSidebarCard evento={selectedEvento} />
                </div>
              ) : (
                <div className="space-y-4 min-w-0">
                  <div className="bg-transparent space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden pr-1 min-w-0 pb-2">
                    {timelineItems.map((item) => (
                      <TimelineDayGroup
                        key={item.key}
                        label={item.label}
                        dayNumber={item.dayNumber}
                        eventos={item.eventos}
                        isToday={item.isToday}
                        onSelect={setSelectedEvento}
                        viewModeLabel={viewModeLabel}
                        selectedEventoId={selectedEvento?.id}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
                <div ref={timelineScrollRef} className="bg-transparent space-y-1 max-h-[calc(100vh-190px)] overflow-y-auto overflow-x-hidden pr-2 min-w-0">
                  {timelineItems.map((item) => (
                    <div data-is-today={item.isToday}>
                      <TimelineDayGroup
                        key={item.key}
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
            )}
          </>
        ) : routeType === 'Fretes' ? (
          <div className="space-y-5">
            {selectedEvento ? (
              <div className="space-y-4">
                {isMobile && (
                  <MobileDetailHeader
                    title={selectedEvento.embarcacao_nome}
                    subtitle={selectedEvento.codigo || 'Resumo da carga'}
                    onBack={() => setSelectedEvento(null)}
                  />
                )}
                {!isMobile && (
                  <button
                    onClick={() => setSelectedEvento(null)}
                    className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ← Voltar
                  </button>
                )}
                <FreteDetailPanel evento={selectedEvento} embarques={embarques.filter(e => e.evento_logistico_id === selectedEvento.id)} onBack={() => setSelectedEvento(null)} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <FreteMonthNavigator
                    currentMonth={freteMonth}
                    onPrev={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() - 1, 1))}
                    onNext={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() + 1, 1))}
                  />
                  {!isMobile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowFilters(true)}
                      className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                    >
                      <ListFilter className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <FreteTotalValue eventos={freteEventos} />
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-2">
                  {freteEventos.map((evento) => (
                    <FreteListCard key={evento.id} evento={evento} onSelect={setSelectedEvento} />
                  ))}
                  {freteEventos.length === 0 && (
                    <div className="col-span-full bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm text-sm text-gray-500 dark:text-gray-400">
                      Nenhum frete com carga encontrado neste período.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <BoatsTab />
          </div>
        )}
        {routeType !== 'Fluvial' && !isMobile && showFilters ? (
          <div className="w-full">
            <div className="max-w-4xl mx-auto rounded-[28px] bg-white dark:bg-gray-900 shadow-xl p-4 md:p-5">
              <div className="space-y-4">
                <TimelineViewControls
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
                <TimelinePeriodPicker range={periodRange} onChange={setPeriodRange} />
                <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
              </div>
            </div>
          </div>
        ) : routeType === 'Fluvial' && !isMobile && showFilters ? (
          <div className="w-full">
            <div className="max-w-4xl mx-auto rounded-[28px] bg-white dark:bg-gray-900 shadow-xl p-4 md:p-5">
              <div className="space-y-4">
                <TimelineViewControls
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
                <TimelinePeriodPicker range={periodRange} onChange={setPeriodRange} />
                <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}