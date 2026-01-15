import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { 
  DollarSign, 
  ShoppingCart, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import moment from 'moment';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardCaixa() {
  const [userData, setUserData] = useState(null);
  const [caixaAberto, setCaixaAberto] = useState(null);
  const [vendasHoje, setVendasHoje] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setUserData(user);

      // Buscar caixa aberto do usuário
      const caixas = await base44.entities.ContasFinanceiras.filter({
        tipo: 'Caixa Físico',
        ativo: true
      });
      
      // Por simplicidade, pega o primeiro caixa ativo
      if (caixas.length > 0) {
        setCaixaAberto(caixas[0]);
      }

      // Vendas de hoje
      const hoje = moment().startOf('day').format('YYYY-MM-DD');
      const vendas = await base44.entities.PedidoVenda.filter({
        created_date: { $gte: hoje }
      });
      setVendasHoje(vendas);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const vendasFinalizadas = vendasHoje.filter(v => v.status === 'Finalizado');
  const vendasPendentes = vendasHoje.filter(v => 
    v.status !== 'Finalizado' && v.status !== 'Cancelado'
  );
  
  const totalVendas = vendasHoje.length;
  const totalFinalizado = vendasFinalizadas.length;
  const totalPendente = vendasPendentes.length;
  const percentualFinalizado = totalVendas > 0 ? (totalFinalizado / totalVendas) * 100 : 0;

  // Cor do gráfico baseada no percentual de vendas finalizadas
  const getCorGrafico = () => {
    if (percentualFinalizado >= 80) return '#10b981'; // Verde
    if (percentualFinalizado >= 50) return '#f59e0b'; // Amarelo
    return '#ef4444'; // Vermelho
  };

  const chartData = [
    { name: 'Finalizadas', value: totalFinalizado },
    { name: 'Pendentes', value: totalPendente }
  ];

  const totalValorFinalizado = vendasFinalizadas.reduce((acc, v) => acc + (v.valor_total || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 font-glacial">
      {/* Header */}
      <div className="pb-3 md:pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200">
          Olá, {userData?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-light">
          Seu caixa hoje
        </p>
      </div>

      {/* Acesso Rápido ao PDV */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Abrir Ponto de Venda
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Processar vendas e pagamentos
              </p>
            </div>
            <Link to={createPageUrl('PDV?mode=caixa')}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                Ir para PDV
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo em Caixa</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  R$ {(caixaAberto?.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {caixaAberto?.nome || 'Nenhum caixa aberto'}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendas Finalizadas</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  R$ {totalValorFinalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {totalFinalizado} venda{totalFinalizado !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendas Pendentes</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  {totalPendente}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Aguardando pagamento
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Status */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Status das Vendas Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {totalVendas > 0 ? (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        <Cell fill={getCorGrafico()} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold" style={{ color: getCorGrafico() }}>
                      {percentualFinalizado.toFixed(0)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Finalizadas</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCorGrafico() }}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Finalizadas</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{totalFinalizado}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Pendentes</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{totalPendente}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma venda registrada hoje</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendas Pendentes */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Vendas Aguardando Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {vendasPendentes.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vendasPendentes.map((venda, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {venda.numero || `Pedido ${venda.id?.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {venda.cliente_nome || 'Cliente não identificado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        R$ {(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className="text-xs bg-amber-100 text-amber-800 border-0 mt-1">
                        {venda.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Todas as vendas foram finalizadas!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}