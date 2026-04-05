import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, AlertCircle, Calendar, DollarSign, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AgefinRecorrentes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recorrentes, setRecorrentes] = useState([]);
  const [contas, setContas] = useState([]);
  const [filterStatus, setFilterStatus] = useState('vencendo'); // vencendo, vencidas, pagas, todas
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const recorrentesData = await base44.entities.ContaRecorrente.filter({ ativa: true }, 'nome_despesa', 100);
      const contasData = await base44.entities.ContaPrevista.list('-data_vencimento', 200);
      setRecorrentes(recorrentesData || []);
      setContas(contasData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const today = new Date();

  const stats = useMemo(() => {
    let filtered = recorrentes;

    if (filterStatus === 'vencendo') {
      filtered = recorrentes.filter(r => {
        const conta = contas.find(c => c.conta_recorrente_id === r.id && new Date(c.data_vencimento) >= today && new Date(c.data_vencimento) <= monthEnd);
        return conta && conta.status !== 'Pago';
      });
    } else if (filterStatus === 'vencidas') {
      filtered = recorrentes.filter(r => {
        const conta = contas.find(c => c.conta_recorrente_id === r.id && new Date(c.data_vencimento) < today && c.status !== 'Pago');
        return !!conta;
      });
    } else if (filterStatus === 'pagas') {
      filtered = recorrentes.filter(r => {
        const conta = contas.find(c => c.conta_recorrente_id === r.id && c.status === 'Pago');
        return !!conta;
      });
    }

    const valorTotal = filtered.reduce((sum, r) => sum + (r.valor_previsto || 0), sum);
    const countVencendo = recorrentes.filter(r => {
      const conta = contas.find(c => c.conta_recorrente_id === r.id && new Date(c.data_vencimento) >= today && new Date(c.data_vencimento) <= monthEnd);
      return conta && conta.status !== 'Pago';
    }).length;

    const countVencidas = recorrentes.filter(r => {
      const conta = contas.find(c => c.conta_recorrente_id === r.id && new Date(c.data_vencimento) < today && c.status !== 'Pago');
      return !!conta;
    }).length;

    return {
      filtered,
      valorTotal,
      countVencendo,
      countVencidas,
      countTotal: recorrentes.length,
    };
  }, [recorrentes, contas, filterStatus, currentMonth]);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const currentMonthText = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Navegação de Mês */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Button
            onClick={previousMonth}
            variant="ghost"
            size="sm"
            className="rounded-full h-10 w-10 p-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
              {currentMonthText}
            </p>
          </div>
          <Button
            onClick={nextMonth}
            variant="ghost"
            size="sm"
            className="rounded-full h-10 w-10 p-0"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Vencendo */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-4 shadow-sm border-l-4 border-blue-400">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Vencendo</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.countVencendo}</p>
        </div>

        {/* Vencidas */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-4 shadow-sm border-l-4 border-red-400">
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Vencidas</p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.countVencidas}</p>
        </div>

        {/* Total */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-3xl p-4 shadow-sm border-l-4 border-purple-400">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">Total</p>
          <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
            R$ {(stats.valorTotal / 1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'vencendo', label: 'Vencendo' },
          { value: 'vencidas', label: 'Vencidas' },
          { value: 'pagas', label: 'Pagas' },
          { value: 'todas', label: 'Todas' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              filterStatus === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Lista de Recorrências */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-6 h-6 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" />
          </div>
        ) : stats.filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl shadow-sm">
            <Repeat2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Nenhuma recorrência encontrada</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filterStatus === 'vencendo' && 'Nenhuma conta recorrente vencendo neste período'}
              {filterStatus === 'vencidas' && 'Nenhuma conta recorrente vencida'}
              {filterStatus === 'pagas' && 'Nenhuma conta recorrente paga'}
              {filterStatus === 'todas' && 'Nenhuma recorrência cadastrada'}
            </p>
          </div>
        ) : (
          stats.filtered.map((recorrente) => (
            <div
              key={recorrente.id}
              className="bg-white dark:bg-gray-900 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {recorrente.nome_despesa}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {recorrente.terceiro_nome}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" />
                      {recorrente.frequencia}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dia {recorrente.dia_vencimento}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    R$ {recorrente.valor_previsto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}