import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Target, 
  Percent,
  Tag,
  Calendar as CalendarIcon,
  AlertCircle,
  Clock
} from 'lucide-react';

import moment from 'moment';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardVendedor() {
  const [userData, setUserData] = useState(null);
  const [vendasHoje, setVendasHoje] = useState([]);
  const [vendasMes, setVendasMes] = useState([]);
  const [tabelaPreco, setTabelaPreco] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [metaMensal, setMetaMensal] = useState(50000); // Mock - deve vir de configuração
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setUserData(user);

      // Vendas de hoje
      const hoje = moment().startOf('day').format('YYYY-MM-DD');
      const vendasHj = await base44.entities.PedidoVenda.filter({
        vendedor_id: user.id,
        created_date: { $gte: hoje }
      });
      setVendasHoje(vendasHj);

      // Vendas do mês
      const inicioMes = moment().startOf('month').format('YYYY-MM-DD');
      const vendasM = await base44.entities.PedidoVenda.filter({
        vendedor_id: user.id,
        created_date: { $gte: inicioMes }
      });
      setVendasMes(vendasM);

      // Tabela de preço (buscar a configurada para este vendedor)
      const tabelas = await base44.entities.TabelaPreco.filter({ ativo: true });
      if (tabelas.length > 0) {
        setTabelaPreco(tabelas[0]); // Simplificado
      }

      // Agendamentos logísticos
      const agenda = await base44.entities.AgendaLogistica.filter({
        data_agendada: { $gte: moment().format('YYYY-MM-DD') }
      });
      setAgendamentos(agenda.slice(0, 5));

      // Avisos automáticos
      const avisosAuto = await base44.entities.AvisosAuto.list();
      setAvisos(avisosAuto.slice(0, 3));

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalVendasHoje = vendasHoje.reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const totalVendasMes = vendasMes.reduce((acc, v) => acc + (v.valor_total || 0), 0);
  const percentualMeta = (totalVendasMes / metaMensal) * 100;

  // Dados para gráfico mensal
  const vendasPorDia = React.useMemo(() => {
    const hoje = moment();
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const dia = moment().subtract(i, 'days');
      const vendasDia = vendasMes.filter(v => 
        moment(v.created_date).format('YYYY-MM-DD') === dia.format('YYYY-MM-DD')
      );
      const total = vendasDia.reduce((acc, v) => acc + (v.valor_total || 0), 0);
      dias.push({
        dia: dia.format('DD/MM'),
        valor: total
      });
    }
    return dias;
  }, [vendasMes]);

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
          Seu desempenho de vendas
        </p>
      </div>

      {/* KPIs do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendas Hoje</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  R$ {totalVendasHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {vendasHoje.length} venda{vendasHoje.length !== 1 ? 's' : ''}
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total do Mês</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  R$ {totalVendasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {vendasMes.length} vendas
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Meta Mensal</p>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  {percentualMeta.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Faltam R$ {(metaMensal - totalVendasMes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Vendas */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Vendas nos Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Meta do Mês</span>
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Preços e Descontos */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Sua Tabela de Preços
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {tabelaPreco ? (
              <>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {tabelaPreco.nome_tabela}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Fator de ajuste: {((tabelaPreco.fator_ajuste - 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white border-0">Ativa</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Desconto Comercial</span>
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {tabelaPreco.permite_desconto_comercial ? 'Permitido' : 'Não Permitido'}
                    </span>
                  </div>

                  {tabelaPreco.permite_desconto_comercial && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Desconto Máximo</span>
                      <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                        {tabelaPreco.percentual_desconto_maximo}%
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma tabela de preços ativa</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Avisos */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Avisos e Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {avisos.length > 0 ? (
              <div className="space-y-3">
                {avisos.map((aviso, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      {aviso.titulo || 'Aviso'}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      {aviso.mensagem || 'Sem detalhes'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum aviso no momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agenda de Entregas */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
            <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Próximas Entregas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {agendamentos.length > 0 ? (
              <div className="space-y-2">
                {agendamentos.map((agenda, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {agenda.cliente_nome || 'Cliente'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {moment(agenda.data_entrega).format('DD/MM/YYYY')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {agenda.periodo || 'Manhã'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma entrega agendada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}