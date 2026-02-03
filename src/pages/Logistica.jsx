import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Truck, MapPin, Clock, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import AgendamentoForm from '../components/logistica/AgendamentoForm';
import RotaEntregasHoje from '../components/logistica/RotaEntregasHoje';
import HistoricoEntregas from '../components/logistica/HistoricoEntregas';
import PlanejamentoSemanal from '../components/logistica/PlanejamentoSemanal';
import GestaoCodigosConferencia from '../components/logistica/GestaoCodigosConferencia';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LogisticaPage() {
  const [entregas, setEntregas] = useState([]);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    aguardandoProgramacao: 0,
    agendadosHoje: 0,
    emRota: 0,
    entreguesHoje: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Buscar entregas
      const entregasData = await base44.entities.AgendaLogistica.list('-data_agendada');
      setEntregas(entregasData);

      // Buscar pedidos aprovados que ainda não têm agendamento
      const pedidosAprovados = await base44.entities.PedidoVenda.filter({ 
        status: 'Aprovado', 
        metodo_entrega: 'Delivery' 
      });
      
      const entregasIds = new Set(entregasData.map(e => e.pedido_venda_id));
      const pendentes = pedidosAprovados.filter(p => !entregasIds.has(p.id));
      setPedidosPendentes(pendentes);

      // Calcular estatísticas
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const stats = {
        aguardandoProgramacao: entregasData.filter(e => e.status === 'Aguardando Programação').length,
        agendadosHoje: entregasData.filter(e => e.data_agendada === hoje && e.status === 'Agendado').length,
        emRota: entregasData.filter(e => e.status === 'Em Rota').length,
        entreguesHoje: entregasData.filter(e => {
          const dataEntrega = e.data_hora_entrega ? format(new Date(e.data_hora_entrega), 'yyyy-MM-dd') : null;
          return dataEntrega === hoje && e.status === 'Entregue';
        }).length
      };
      setStats(stats);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Agenda Logística</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gestão completa de entregas e rotas</p>
      </div>

      {/* KPIs - SEM BORDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Aguardando Programação</div>
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.aguardandoProgramacao}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pedidos sem data</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Agendados Hoje</div>
            <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.agendadosHoje}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entregas programadas</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Em Rota</div>
            <Truck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.emRota}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Em andamento</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">Entregues Hoje</div>
            <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.entreguesHoje}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Concluídas</p>
        </div>
      </div>

        {/* Alert de Pedidos Pendentes */}
        {pedidosPendentes.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {pedidosPendentes.length} pedido(s) aprovado(s) precisam de agendamento de entrega
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Acesse a aba "Agendar Entregas" para programar as entregas destes pedidos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="planejamento" className="space-y-6">
          <TabsList className="flex w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 overflow-x-auto">
            <TabsTrigger value="conferencia" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 gap-2 min-w-[140px]">
              <QrCode className="w-4 h-4 text-gray-700 dark:text-gray-400"/> 
              <span className="text-sm">Conferência</span>
            </TabsTrigger>
            <TabsTrigger value="planejamento" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 gap-2 min-w-[140px]">
              <Clock className="w-4 h-4 text-gray-700 dark:text-gray-400"/> 
              <span className="text-sm">Planejamento (Inbound)</span>
            </TabsTrigger>
            <TabsTrigger value="agendar" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 gap-2 min-w-[140px]">
              <Calendar className="w-4 h-4 text-gray-700 dark:text-gray-400"/> 
              <span className="text-sm">Agendar (Outbound)</span>
            </TabsTrigger>
            <TabsTrigger value="rota-hoje" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 gap-2 min-w-[140px]">
              <Truck className="w-4 h-4 text-gray-700 dark:text-gray-400"/> 
              <span className="text-sm">Rota de Hoje</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex-1 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 gap-2 min-w-[140px]">
              <MapPin className="w-4 h-4 text-gray-700 dark:text-gray-400"/> 
              <span className="text-sm">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conferencia">
            <GestaoCodigosConferenciaHub />
          </TabsContent>

          <TabsContent value="planejamento">
            <PlanejamentoSemanal />
          </TabsContent>

          <TabsContent value="agendar">
            <AgendamentoForm 
              pedidosPendentes={pedidosPendentes}
              onSuccess={loadData}
            />
          </TabsContent>

          <TabsContent value="rota-hoje">
            <RotaEntregasHoje 
              entregas={entregas}
              onUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoEntregas 
              entregas={entregas}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}

function GestaoCodigosConferenciaHub() {
  const [supermanifestos, setSupermanifestos] = useState([]);
  const [manifestos, setManifestos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [smData, meData] = await Promise.all([
        base44.entities.Supermanifesto.list('-created_date', 50),
        base44.entities.ManifestoEntrada.list('-created_date', 50)
      ]);
      setSupermanifestos(smData);
      setManifestos(meData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  }

  const manifestosPendentes = manifestos.filter(m => 
    m.status_codigo_conferencia_itens !== 'Concluído'
  );

  const supermanifestosPendentes = supermanifestos.filter(s => 
    s.status_codigo_conferencia_volumes !== 'Concluído'
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <QrCode className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              Geração de Códigos para Conferência
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Gere códigos únicos para conferência cega de volumes e itens. Os conferentes usarão estes códigos na tela de armazenagem.
            </p>
          </div>
        </div>
      </div>

      {supermanifestosPendentes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">SUPERMANIFESTOS</h3>
          <div className="grid gap-3">
            {supermanifestosPendentes.map((sm) => (
              <div key={sm.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm">{sm.numero}</div>
                    <div className="text-xs text-gray-500">{sm.transportadora_nome}</div>
                  </div>
                  <Badge variant="outline">{sm.status}</Badge>
                </div>
                <GestaoCodigosConferencia 
                  manifesto={sm} 
                  tipo="volumes" 
                  onUpdate={carregarDados}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {manifestosPendentes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">MANIFESTOS DE ENTRADA</h3>
          <div className="grid gap-3">
            {manifestosPendentes.map((me) => (
              <div key={me.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-sm">{me.numero}</div>
                    <div className="text-xs text-gray-500">Pedido: {me.pedido_numero}</div>
                  </div>
                  <Badge variant="outline">{me.status}</Badge>
                </div>
                <GestaoCodigosConferencia 
                  manifesto={me} 
                  tipo="itens" 
                  onUpdate={carregarDados}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {manifestosPendentes.length === 0 && supermanifestosPendentes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum manifesto aguardando conferência
        </div>
      )}
    </div>
  );
}