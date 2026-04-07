import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isSameDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import LogisticaSandboxHeader from '@/components/logistica-sandbox/LogisticaSandboxHeader';
import RouteModeToggle from '@/components/logistica-sandbox/RouteModeToggle';
import TimelineDatePicker from '@/components/logistica-sandbox/TimelineDatePicker';
import TimelineDayGroup from '@/components/logistica-sandbox/TimelineDayGroup';
import TimelineSidebarCard from '@/components/logistica-sandbox/TimelineSidebarCard';
import CreateEventoLogisticoDialog from '@/components/logistica-sandbox/CreateEventoLogisticoDialog';
import AgendaCalendarView from '@/components/logistica-sandbox/AgendaCalendarView';
import FreteStatusReport from '@/components/logistica-sandbox/FreteStatusReport';

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
  const [reportTab, setReportTab] = useState('timeline');
  const [periodoInicio, setPeriodoInicio] = useState(format(new Date(), 'yyyy-MM-01'));
  const [periodoFim, setPeriodoFim] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  const groupedEventos = useMemo(() => {
    const targetDate = new Date(`${simulationDate}T00:00:00`);

    return eventos
      .filter((evento) => {
        const dataEvento = new Date(`${evento.data_referencia || simulationDate}T00:00:00`);
        return dataEvento >= targetDate;
      })
      .reduce((acc, evento) => {
        const key = evento.data_referencia || simulationDate;
        if (!acc[key]) acc[key] = [];
        acc[key].push(evento);
        return acc;
      }, {});
  }, [eventos, simulationDate]);

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
          eventos: items.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
        };
      });
  }, [groupedEventos, simulationDate]);

  const agendaPeriodo = useMemo(() => {
    return eventos.filter((evento) => {
      const data = evento.data_saida_origem || evento.data_referencia || '';
      return (!periodoInicio || data >= periodoInicio) && (!periodoFim || data <= periodoFim);
    });
  }, [eventos, periodoInicio, periodoFim]);

  const agendaChegada = useMemo(() => {
    return eventos.filter((evento) => {
      const data = evento.data_chegada_destino || evento.previsao_chegada || '';
      return (!periodoInicio || data >= periodoInicio) && (!periodoFim || data <= periodoFim);
    });
  }, [eventos, periodoInicio, periodoFim]);

  const agendaGroups = useMemo(() => {
    const grouped = agendaPeriodo.reduce((acc, evento) => {
      const key = evento.data_saida_origem || evento.data_referencia;
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(evento);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([key, items]) => ({
        key,
        label: format(new Date(`${key}T00:00:00`), 'EEEE, d MMM'),
        eventos: items
      }));
  }, [agendaPeriodo]);

  const chegadaGroups = useMemo(() => {
    const grouped = agendaChegada.reduce((acc, evento) => {
      const key = evento.data_chegada_destino || evento.previsao_chegada;
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(evento);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([key, items]) => ({
        key,
        label: format(new Date(`${key}T00:00:00`), 'EEEE, d MMM'),
        eventos: items.map((item) => ({ ...item, data_saida_manaus_formatada: item.data_chegada_destino_formatada }))
      }));
  }, [agendaChegada]);

  const fretePeriodo = useMemo(() => {
    return eventos.filter((evento) => {
      const data = evento.data_saida_origem || evento.data_referencia || '';
      const noPeriodo = (!periodoInicio || data >= periodoInicio) && (!periodoFim || data <= periodoFim);
      return noPeriodo;
    });
  }, [eventos, periodoInicio, periodoFim]);

  const currentEvento = selectedEvento || timelineItems[0]?.eventos?.[0] || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <LogisticaSandboxHeader totalEventos={eventos.length} />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <RouteModeToggle value={routeType} onChange={setRouteType} />
          <CreateEventoLogisticoDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ['evento-logistico'] })} />
        </div>
        <TimelineDatePicker value={simulationDate} onChange={setSimulationDate} />
        <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
          <Tabs value={reportTab} onValueChange={setReportTab}>
            <TabsList className="w-full justify-start rounded-2xl bg-gray-100 dark:bg-gray-700 p-1 h-auto flex-wrap">
              <TabsTrigger value="timeline" className="rounded-2xl">Timeline</TabsTrigger>
              <TabsTrigger value="agenda_saida" className="rounded-2xl">Saídas</TabsTrigger>
              <TabsTrigger value="agenda_chegada" className="rounded-2xl">Chegadas</TabsTrigger>
              <TabsTrigger value="fretes" className="rounded-2xl">Fretes</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Período inicial</p>
                <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="rounded-2xl border-0 bg-gray-50 dark:bg-gray-700 shadow-sm" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Período final</p>
                <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="rounded-2xl border-0 bg-gray-50 dark:bg-gray-700 shadow-sm" />
              </div>
            </div>

            <TabsContent value="timeline" className="mt-4">
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
                    />
                  ))}
                </div>
                <TimelineSidebarCard evento={currentEvento} />
              </div>
            </TabsContent>

            <TabsContent value="agenda_saida" className="mt-4">
              <AgendaCalendarView groupedDates={agendaGroups} />
            </TabsContent>

            <TabsContent value="agenda_chegada" className="mt-4">
              <AgendaCalendarView groupedDates={chegadaGroups} />
            </TabsContent>

            <TabsContent value="fretes" className="mt-4">
              <FreteStatusReport eventos={fretePeriodo} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}