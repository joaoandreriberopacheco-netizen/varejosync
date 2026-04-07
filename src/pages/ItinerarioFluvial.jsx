import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isSameDay } from 'date-fns';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import CreateEventoLogisticoDialog from '@/components/logistica-sandbox/CreateEventoLogisticoDialog';
import TimelineViewControls from '@/components/logistica-sandbox/TimelineViewControls';
import TimelinePeriodPicker from '@/components/logistica-sandbox/TimelinePeriodPicker';
import FreteMonthNavigator from '@/components/logistica-sandbox/FreteMonthNavigator';
import FreteResumoCard from '@/components/logistica-sandbox/FreteResumoCard';
import FreteListCard from '@/components/logistica-sandbox/FreteListCard';
import EventoCargaReportCard from '@/components/logistica-sandbox/EventoCargaReportCard';
import MobileFilterSheet from '@/components/logistica-sandbox/MobileFilterSheet';
import MobileDetailHeader from '@/components/logistica-sandbox/MobileDetailHeader';
import BoatsTab from '@/components/logistica-sandbox/BoatsTab';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';

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
  const [periodRange, setPeriodRange] = useState({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) });
  const [freteMonth, setFreteMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const { data: eventosLogisticos = [] } = useQuery({
    queryKey: ['evento-logistico'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 50),
    initialData: []
  });

  const { data: embarques = [] } = useQuery({
    queryKey: ['embarques-logistica'],
    queryFn: () => base44.entities.Embarque.list('-created_date', 500),
    initialData: []
  });

  const { data: contasPrevistas = [] } = useQuery({
    queryKey: ['contas-previstas-frete'],
    queryFn: () => base44.entities.ContaPrevista.list('-data_vencimento', 500),
    initialData: []
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : format(parsed, 'dd/MM/yyyy');
  };

  const eventos = useMemo(() => {
    const source = eventosLogisticos.length ? eventosLogisticos : fallbackEventos;
    const simulationBaseDate = new Date(`${simulationDate}T00:00:00`);
    const contasFrete = (contasPrevistas || []).filter((conta) => {
      const descricao = `${conta.descricao || ''} ${Array.isArray(conta.tags) ? conta.tags.join(' ') : ''}`.toLowerCase();
      return descricao.includes('frete') || descricao.includes('cmv');
    });

    return source
      .map(item => {
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

        const diasAteSaida = saidaManaus ? Math.round((new Date(`${saidaManaus}T00:00:00`) - simulationBaseDate) / (1000 * 60 * 60 * 24)) : null;
        const diasDesdeChegada = chegadaManaus ? Math.round((simulationBaseDate - new Date(`${chegadaManaus}T00:00:00`)) / (1000 * 60 * 60 * 24)) : null;
        const ocupacaoPercentualDinamica = diasAteSaida === null || diasDesdeChegada === null
          ? (item.ocupacao_percentual || 0)
          : diasDesdeChegada < 0 || diasAteSaida < 0
            ? 0
            : Math.max(0, Math.min(100, Math.round((Math.min(diasDesdeChegada, 7) / 7) * 100)));

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
          ocupacao_percentual_dinamica: ocupacaoPercentualDinamica,
          embarques_relacionados: embarquesRelacionados,
          tem_embarques_relacionados: embarquesRelacionados.length > 0,
          total_embarques_relacionados: embarquesRelacionados.length,
          total_fornecedores_relacionados: resumoFornecedores.length,
          resumo_fornecedores: resumoFornecedores,
          valor_total_carga: valorTotalCarga,
          conta_frete: contaFrete || null,
          conta_frete_status: contaFrete?.status || null,
          tem_conta_frete: Boolean(contaFrete)
        };
      })
      .sort((a, b) => new Date(b.data_saida_origem || 0) - new Date(a.data_saida_origem || 0));
  }, [eventosLogisticos, embarques, contasPrevistas, simulationDate]);

  React.useEffect(() => {
    setSelectedEvento(null);
  }, [routeType, viewMode, simulationDate, freteMonth, periodRange]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [eventos, simulationDate, periodRange, viewMode]);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto px-3 py-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
        <LogisticaSandboxHeader />
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <RouteModeToggle value={routeType} onChange={setRouteType} />
            {routeType === 'Fluvial' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(true)}
                className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <MobileFilterSheet>
                      <TimelineViewControls
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                      />
                      <TimelinePeriodPicker range={periodRange} onChange={setPeriodRange} />
                      <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
                    </MobileFilterSheet>
                  </div>
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
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
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
            )}
          </>
        ) : routeType === 'Fretes' ? (
          <div className="space-y-5">
            {isMobile && selectedEvento ? (
              <div className="space-y-4">
                <MobileDetailHeader
                  title={selectedEvento.embarcacao_nome}
                  subtitle={selectedEvento.codigo || 'Resumo da carga'}
                  onBack={() => setSelectedEvento(null)}
                />
                <EventoCargaReportCard evento={selectedEvento} />
              </div>
            ) : (
              <>
                <FreteMonthNavigator
                  currentMonth={freteMonth}
                  onPrev={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() - 1, 1))}
                  onNext={() => setFreteMonth(new Date(freteMonth.getFullYear(), freteMonth.getMonth() + 1, 1))}
                />
                <FreteResumoCard
                  totalFretes={freteResumo.totalFretes}
                  totalComConta={freteResumo.totalComConta}
                  totalSemConta={freteResumo.totalSemConta}
                />
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5">
                  <div className="space-y-3">
                    {freteEventos.map((evento) => (
                      <FreteListCard key={evento.id} evento={evento} onSelect={setSelectedEvento} />
                    ))}
                    {freteEventos.length === 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm text-sm text-gray-500 dark:text-gray-400">
                        Nenhum frete com carga encontrado neste período.
                      </div>
                    )}
                  </div>
                  {!isMobile && <EventoCargaReportCard evento={currentEvento} />}
                </div>
              </>
            )}
          </div>
        ) : (
          <BoatsTab />
        )}
        <Dialog open={showFilters} onOpenChange={setShowFilters}>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl rounded-3xl border-0 shadow-xl p-4 md:p-5 bg-white dark:bg-gray-900">
            <div className="space-y-4">
              <TimelineViewControls
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              <TimelinePeriodPicker range={periodRange} onChange={setPeriodRange} />
              <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}