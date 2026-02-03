import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Truck, ChevronLeft, ChevronRight, Package, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, parseISO, addWeeks, addMonths, subWeeks, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LogisticaPage() {
  const [supermanifestos, setSupermanifestos] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [visualizacao, setVisualizacao] = useState('semana');
  const [dataAtual, setDataAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [smData, entData] = await Promise.all([
        base44.entities.Supermanifesto.list('-eta', 200),
        base44.entities.AgendaLogistica.list('-data_agendada', 200)
      ]);
      setSupermanifestos(smData);
      setEntregas(entData);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const navegar = (direcao) => {
    if (visualizacao === 'semana') {
      setDataAtual(direcao === 'prox' ? addWeeks(dataAtual, 1) : subWeeks(dataAtual, 1));
    } else if (visualizacao === 'mes') {
      setDataAtual(direcao === 'prox' ? addMonths(dataAtual, 1) : subMonths(dataAtual, 1));
    }
  };

  const getDiasVisualizacao = () => {
    if (visualizacao === 'dia') return [startOfDay(diaSelecionado)];
    if (visualizacao === 'semana') {
      return eachDayOfInterval({
        start: startOfWeek(dataAtual, { weekStartsOn: 0 }),
        end: endOfWeek(dataAtual, { weekStartsOn: 0 })
      });
    }
    
    // Para o mês, precisamos adicionar células vazias no início
    const primeiroDia = startOfMonth(dataAtual);
    const ultimoDia = endOfMonth(dataAtual);
    const diasDoMes = eachDayOfInterval({ start: primeiroDia, end: ultimoDia });
    
    // Adicionar células vazias no início para alinhar com o dia da semana
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = domingo
    const celulasVazias = Array(diaSemanaInicio).fill(null);
    
    return [...celulasVazias, ...diasDoMes];
  };

  const getChegadasDia = (dia) => {
    return supermanifestos.filter(sm => {
      if (!sm.eta) return false;
      return isSameDay(parseISO(sm.eta), dia);
    });
  };

  const getEntregasDia = (dia) => {
    return entregas.filter(e => {
      if (!e.data_agendada) return false;
      return isSameDay(parseISO(e.data_agendada), dia);
    });
  };

  const getTotalVolumes = (dia) => {
    const chegadas = getChegadasDia(dia);
    return chegadas.reduce((acc, sm) => acc + (sm.quantidade_volumes_estimada || 0), 0);
  };

  const dias = getDiasVisualizacao();
  const itemsDia = visualizacao === 'dia' ? [
    ...getChegadasDia(diaSelecionado),
    ...getEntregasDia(diaSelecionado)
  ] : [];

  // KPIs
  const aguardandoProgramacao = entregas.filter(e => e.status === 'Aguardando Programação').length;
  const emRota = entregas.filter(e => e.status === 'Em Rota').length;
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const entreguesHoje = entregas.filter(e => {
    if (!e.data_hora_entrega) return false;
    return format(parseISO(e.data_hora_entrega), 'yyyy-MM-dd') === hoje;
  }).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-2xl font-light text-gray-800 dark:text-gray-200 mb-1">Agenda Logística</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gestão completa de entregas e rotas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Aguardando Programação</div>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{aguardandoProgramacao}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pedidos sem data</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Em Rota</div>
            <Truck className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{emRota}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Em andamento</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Entregues Hoje</div>
            <Package className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{entreguesHoje}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Concluídas</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={visualizacao} onValueChange={setVisualizacao} className="space-y-6">
        <TabsList className="flex w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0">
          <TabsTrigger value="semana" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3">
            <span className="text-sm">Semana</span>
          </TabsTrigger>
          <TabsTrigger value="mes" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3">
            <span className="text-sm">Mês</span>
          </TabsTrigger>
          <TabsTrigger value="dia" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3">
            <span className="text-sm">Dia</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="semana" className="mt-6 space-y-4">
          <CalendarioHeader 
            visualizacao="semana" 
            dataAtual={dataAtual} 
            onNavegar={navegar} 
          />
          <div className="grid grid-cols-7 gap-3 lg:gap-4">
            {dias.map((dia, idx) => {
              const chegadas = getChegadasDia(dia);
              const entregasD = getEntregasDia(dia);
              const volumes = getTotalVolumes(dia);
              return (
                <DiaCard 
                  key={idx} 
                  dia={dia} 
                  chegadas={chegadas.length} 
                  entregas={entregasD.length}
                  volumes={volumes}
                  onClick={() => {
                    setDiaSelecionado(dia);
                    setVisualizacao('dia');
                  }}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mes" className="mt-6 space-y-4">
          <CalendarioHeader 
            visualizacao="mes" 
            dataAtual={dataAtual} 
            onNavegar={navegar} 
          />
          <div className="grid grid-cols-7 gap-2 lg:gap-3">
            {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
              <div key={d} className="text-center text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{d}</div>
            ))}
            {dias.map((dia, idx) => {
              if (dia === null) {
                // Célula vazia para alinhar o calendário
                return <div key={`vazio-${idx}`} className="min-h-[100px] lg:min-h-[120px]" />;
              }
              
              const chegadas = getChegadasDia(dia);
              const entregasD = getEntregasDia(dia);
              const volumes = getTotalVolumes(dia);
              return (
                <DiaCard 
                  key={idx} 
                  dia={dia} 
                  chegadas={chegadas.length} 
                  entregas={entregasD.length}
                  volumes={volumes}
                  compacto
                  onClick={() => {
                    setDiaSelecionado(dia);
                    setVisualizacao('dia');
                  }}
                />
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="dia" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setVisualizacao('semana')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              {format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <div className="w-20" />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CHEGADAS (INBOUND)</h3>
            {getChegadasDia(diaSelecionado).map(sm => (
              <div key={sm.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{sm.numero}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{sm.transportadora_nome}</div>
                  </div>
                  <Badge variant="outline">{sm.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                  <div>
                    <div className="text-gray-500">Volumes</div>
                    <div className="font-medium">{sm.quantidade_volumes_estimada || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Peso</div>
                    <div className="font-medium">{sm.peso_total_bruto_kg || 0} kg</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Valor</div>
                    <div className="font-medium">R$ {(sm.valor_total_estimado || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}

            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-6">ENTREGAS (OUTBOUND)</h3>
            {getEntregasDia(diaSelecionado).map(ent => (
              <div key={ent.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{ent.pedido_numero}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{ent.cliente_nome}</div>
                  </div>
                  <Badge variant="outline">{ent.status}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-2">{ent.endereco_entrega}</div>
              </div>
            ))}

            {getChegadasDia(diaSelecionado).length === 0 && getEntregasDia(diaSelecionado).length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Nenhuma movimentação neste dia
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CalendarioHeader({ visualizacao, dataAtual, onNavegar }) {
  const titulo = visualizacao === 'semana' 
    ? `${format(startOfWeek(dataAtual, { weekStartsOn: 0 }), 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(dataAtual, { weekStartsOn: 0 }), 'dd MMM', { locale: ptBR })}`
    : format(dataAtual, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={() => onNavegar('ant')}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <h2 className="text-base font-medium text-gray-800 dark:text-gray-200 capitalize">{titulo}</h2>
      <Button variant="ghost" size="sm" onClick={() => onNavegar('prox')}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function DiaCard({ dia, chegadas, entregas, volumes, compacto, onClick }) {
  const hoje = isSameDay(dia, new Date());
  
  return (
    <button
      onClick={onClick}
      className={`relative p-4 lg:p-5 rounded-xl text-left transition-all hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm ${
        hoje ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-600' : 'bg-white dark:bg-gray-800'
      } ${compacto ? 'min-h-[100px] lg:min-h-[120px]' : 'min-h-[130px] lg:min-h-[150px]'}`}
    >
      <div className={`text-base lg:text-lg font-medium mb-2 ${hoje ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        {format(dia, compacto ? 'd' : 'EEE d', { locale: ptBR })}
      </div>
      
      {volumes > 0 && (
        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center shadow-md">
          {volumes > 99 ? '99+' : volumes}
        </div>
      )}

      {(chegadas > 0 || entregas > 0) && (
        <div className="mt-3 space-y-2">
          {chegadas > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Truck className="w-4 h-4" />
              <span>{chegadas}</span>
            </div>
          )}
          {entregas > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Package className="w-4 h-4" />
              <span>{entregas}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}