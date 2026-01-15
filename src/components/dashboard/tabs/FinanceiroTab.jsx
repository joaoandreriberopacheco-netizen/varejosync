import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function FinanceiroTab() {
  const [data, setData] = useState({
    saldoCaixa: 0,
    receitaMes: 0,
    despesaMes: 0,
    margemLiquida: 0,
    contasReceber: [],
    contasPagar: [],
    fluxoProjetado: { entradas: 0, saidas: 0, saldoProjetado: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFinanceiroData = async () => {
      setIsLoading(true);
      try {
        const hoje = new Date();
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);

        const [lancamentos, contas] = await Promise.all([
          base44.entities.LancamentoFinanceiro.list(),
          base44.entities.ContasFinanceiras.list()
        ]);

        const saldoCaixa = contas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0);

        const lancamentosMes = lancamentos.filter(l => 
          new Date(l.data_vencimento) >= inicioMes &&
          new Date(l.data_vencimento) <= fimMes
        );

        const receitaMes = lancamentosMes
          .filter(l => l.tipo === 'Receita' && l.status === 'Pago')
          .reduce((sum, l) => sum + (l.valor || 0), 0);

        const despesaMes = lancamentosMes
          .filter(l => l.tipo === 'Despesa' && l.status === 'Pago')
          .reduce((sum, l) => sum + (l.valor || 0), 0);

        const margemLiquida = receitaMes > 0 ? ((receitaMes - despesaMes) / receitaMes) * 100 : 0;

        const contasReceber = lancamentos
          .filter(l => l.tipo === 'Receita' && l.status === 'Em Aberto')
          .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
          .slice(0, 5);

        const contasPagar = lancamentos
          .filter(l => l.tipo === 'Despesa' && l.status === 'Em Aberto')
          .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
          .slice(0, 5);

        const entradasProjetadas = lancamentos
          .filter(l => l.tipo === 'Receita' && l.status === 'Em Aberto')
          .reduce((sum, l) => sum + (l.valor || 0), 0);

        const saidasProjetadas = lancamentos
          .filter(l => l.tipo === 'Despesa' && l.status === 'Em Aberto')
          .reduce((sum, l) => sum + (l.valor || 0), 0);

        setData({
          saldoCaixa,
          receitaMes,
          despesaMes,
          margemLiquida,
          contasReceber,
          contasPagar,
          fluxoProjetado: {
            entradas: entradasProjetadas,
            saidas: saidasProjetadas,
            saldoProjetado: saldoCaixa + entradasProjetadas - saidasProjetadas
          }
        });
      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
      }
      setIsLoading(false);
    };

    loadFinanceiroData();
  }, []);

  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  const formatDate = (date) => format(new Date(date), 'dd/MM/yyyy');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Posição Financeira</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo em Caixa</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.saldoCaixa)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receitas (Mês)</div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-500">
              {formatCurrency(data.receitaMes)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Despesas (Mês)</div>
            <div className="text-xl font-semibold text-red-600 dark:text-red-500">
              {formatCurrency(data.despesaMes)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Margem Líquida</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.margemLiquida.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Contas - SEM BORDAS */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">A Receber</h3>
          </div>
          <div className="space-y-2">
            {data.contasReceber.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma conta a receber</p>
            ) : (
              data.contasReceber.map((conta) => (
                <div key={conta.id} className="py-2 border-b last:border-0 border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{conta.descricao}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Venc: {formatDate(conta.data_vencimento)}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(conta.valor)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-500" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">A Pagar</h3>
          </div>
          <div className="space-y-2">
            {data.contasPagar.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma conta a pagar</p>
            ) : (
              data.contasPagar.map((conta) => (
                <div key={conta.id} className="py-2 border-b last:border-0 border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{conta.descricao}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Venc: {formatDate(conta.data_vencimento)}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {formatCurrency(conta.valor)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Fluxo Projetado - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Fluxo Projetado</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-500 mb-1">{formatCurrency(data.fluxoProjetado.entradas)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Entradas Previstas</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-500 mb-1">{formatCurrency(data.fluxoProjetado.saidas)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Saídas Previstas</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{formatCurrency(data.fluxoProjetado.saldoProjetado)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Saldo Projetado</div>
          </div>
        </div>
      </div>
    </div>
  );
}