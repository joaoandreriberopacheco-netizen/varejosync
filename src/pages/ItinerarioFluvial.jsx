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
import FreteResumoCard from '@/components/logistica-sandbox/FreteResumoCard';
import FreteListCard from '@/components/logistica-sandbox/FreteListCard';
import EventoCargaReportCard from '@/components/logistica-sandbox/EventoCargaReportCard';
import MobileDetailHeader from '@/components/logistica-sandbox/MobileDetailHeader';
import BoatsTab from '@/components/logistica-sandbox/BoatsTab';
import ItinerarioFluvialMobile from '@/components/logistica-sandbox/mobile/ItinerarioFluvialMobile';
import FreteDetailPanel from '@/components/logistica-sandbox/FreteDetailPanel';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ItinerarioFluvial() {
  const [routeType, setRouteType] = useState('Fluvial');
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [simulationDate, setSimulationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('saida_manaus');
  const [periodRange, setPeriodRange] = useState({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) });
  const [freteMonth, setFreteMonth] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState('all');
  const [onlyLinked, setOnlyLinked] = useState(false);
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

  return <ItinerarioFluvialMobile />;
}