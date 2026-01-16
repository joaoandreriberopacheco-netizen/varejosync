import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';

export default function PainelGerente() {
  const [periodoAtivo, setPeriodoAtivo] = useState('hoje');

  const getPeriodo = () => {
    const hoje = new Date();
    let dataInicio = new Date();
    
    switch (periodoAtivo) {
      case 'hoje':
        dataInicio.setHours(0, 0, 0, 0);
        break;
      case 'semana':
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case 'mes':
        dataInicio.setDate(hoje.getDate() - 30);
        break;
      default:
        dataInicio.setHours(0, 0, 0, 0);
    }

    return {
      inicio: dataInicio.toISOString(),
      fim: hoje.toISOString()
    };
  };

  const periodo = getPeriodo();

  // Buscar pedidos do período
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['painel-gerente', periodoAtivo],
    queryFn: async () => {
      const query = {
        created_date: {
          $gte: periodo.inicio,
          $lte: periodo.fim
        }
      };

      return await base44.entities.PedidoVenda.filter(query, '-created_date', 500);
    }
  });

  // Calcular métricas
  const metricas = React.useMemo(() => {
    const total = pedidos.length;
    const emSeparacao = pedidos.filter(p => p.status === 'Aprovado').length;
    const emRota = pedidos.filter(p => p.status === 'Envio Agendado').length;
    const aguardandoRetirada = pedidos.filter(p => p.status === 'Aguardando Retirada').length;
    const concluidos = pedidos.filter(p => p.status === 'Finalizado').length;
    const valorTotal = pedidos.reduce((sum, p) => sum + (p.valor_total || 0), 0);
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    
    const delivery = pedidos.filter(p => p.metodo_entrega === 'Delivery').length;
    const retirada = pedidos.filter(p => p.metodo_entrega === 'Retirada').length;

    // Pedidos por vendedor
    const porVendedor = {};
    pedidos.forEach(p => {
      if (!porVendedor[p.vendedor_nome]) {
        porVendedor[p.vendedor_nome] = { total: 0, valor: 0 };
      }
      porVendedor[p.vendedor_nome].total++;
      porVendedor[p.vendedor_nome].valor += p.valor_total || 0;
    });

    return {
      total,
      emSeparacao,
      emRota,
      aguardandoRetirada,
      concluidos,
      valorTotal,
      ticketMedio,
      delivery,
      retirada,
      porVendedor: Object.entries(porVendedor)
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.valor - a.valor)
    };
  }, [pedidos]);

  const formatValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const MetricCard = ({ titulo, valor, subtitulo, icone: Icon, cor, tendencia }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{titulo}</p>
            <p className={`text-2xl font-bold ${cor || 'text-gray-800 dark:text-white'}`}>
              {valor}
            </p>
            {subtitulo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitulo}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            cor ? `bg-${cor.split('-')[1]}-100 dark:bg-${cor.split('-')[1]}-900/20` : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <Icon className={`w-5 h-5 ${cor || 'text-gray-500'}`} />
          </div>
        </div>
        {tendencia !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {tendencia > 0 ? (
              <>
                <ArrowUp className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400">+{tendencia}%</span>
              </>
            ) : tendencia < 0 ? (
              <>
                <ArrowDown className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-600 dark:text-red-400">{tendencia}%</span>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">CARREGANDO DADOS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">PAINEL GERENCIAL</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">VISÃO GERAL DAS OPERAÇÕES</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriodoAtivo('hoje')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoAtivo === 'hoje'
                ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            HOJE
          </button>
          <button
            onClick={() => setPeriodoAtivo('semana')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoAtivo === 'semana'
                ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            7 DIAS
          </button>
          <button
            onClick={() => setPeriodoAtivo('mes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodoAtivo === 'mes'
                ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-800 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            30 DIAS
          </button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          titulo="TOTAL PEDIDOS"
          valor={metricas.total}
          icone={Package}
          cor="text-blue-600"
        />
        <MetricCard
          titulo="FATURAMENTO"
          valor={formatValor(metricas.valorTotal)}
          subtitulo={`Ticket Médio: ${formatValor(metricas.ticketMedio)}`}
          icone={DollarSign}
          cor="text-green-600"
        />
        <MetricCard
          titulo="CONCLUÍDOS"
          valor={metricas.concluidos}
          subtitulo={`${metricas.total > 0 ? Math.round((metricas.concluidos / metricas.total) * 100) : 0}% do total`}
          icone={CheckCircle}
          cor="text-green-600"
        />
        <MetricCard
          titulo="EM ANDAMENTO"
          valor={metricas.emSeparacao + metricas.emRota + metricas.aguardandoRetirada}
          subtitulo="Pedidos ativos"
          icone={Clock}
          cor="text-orange-600"
        />
      </div>

      {/* Tabs de Detalhamento */}
      <Tabs defaultValue="operacional" className="space-y-4">
        <TabsList className="bg-white dark:bg-gray-800 shadow-sm">
          <TabsTrigger value="operacional">OPERACIONAL</TabsTrigger>
          <TabsTrigger value="vendedores">VENDEDORES</TabsTrigger>
          <TabsTrigger value="entrega">ENTREGA</TabsTrigger>
        </TabsList>

        {/* Aba Operacional */}
        <TabsContent value="operacional" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{metricas.emSeparacao}</p>
                    <p className="text-xs text-gray-500">EM SEPARAÇÃO</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${metricas.total > 0 ? (metricas.emSeparacao / metricas.total) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{metricas.aguardandoRetirada}</p>
                    <p className="text-xs text-gray-500">AGUARDANDO RETIRADA</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${metricas.total > 0 ? (metricas.aguardandoRetirada / metricas.total) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{metricas.emRota}</p>
                    <p className="text-xs text-gray-500">EM ROTA DE ENTREGA</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${metricas.total > 0 ? (metricas.emRota / metricas.total) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Vendedores */}
        <TabsContent value="vendedores" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-4">PERFORMANCE POR VENDEDOR</h3>
              <div className="space-y-3">
                {metricas.porVendedor.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">NENHUM DADO DISPONÍVEL</p>
                ) : (
                  metricas.porVendedor.map((vendedor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{vendedor.nome || 'SEM VENDEDOR'}</p>
                          <p className="text-xs text-gray-500">{vendedor.total} pedidos</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {formatValor(vendedor.valor)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Entrega */}
        <TabsContent value="entrega" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-3">
                    <Truck className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">{metricas.delivery}</p>
                  <p className="text-sm text-gray-500">PEDIDOS DELIVERY</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {metricas.total > 0 ? Math.round((metricas.delivery / metricas.total) * 100) : 0}% DO TOTAL
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white">{metricas.retirada}</p>
                  <p className="text-sm text-gray-500">PEDIDOS RETIRADA</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {metricas.total > 0 ? Math.round((metricas.retirada / metricas.total) * 100) : 0}% DO TOTAL
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}