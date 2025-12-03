import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getTenantId } from '@/components/utils/tenant';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Package, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';

export default function GeralTab() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    const hoje = new Date();
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const inicio30Dias = subDays(hoje, 30);

    const tenantId = getTenantId();
    const [vendas, compras, produtos, lancamentos] = await Promise.all([
      base44.entities.PedidoVenda.filter({ empresa_id: tenantId }),
      base44.entities.PedidoCompra.filter({ empresa_id: tenantId }),
      base44.entities.Produto.filter({ empresa_id: tenantId }),
      base44.entities.LancamentoFinanceiro.filter({ empresa_id: tenantId })
    ]);

    const vendasMes = vendas.filter(v => 
      v && v.status === 'Finalizado' && v.created_date &&
      new Date(v.created_date) >= inicioMes &&
      new Date(v.created_date) <= fimMes
    );

    const receitaMes = vendasMes.reduce((acc, v) => acc + (v.valor_total || 0), 0);
    const custoMes = vendasMes.reduce((acc, v) => {
      const custoItens = (v.itens || []).reduce((sum, item) => 
        sum + ((item.custo_unitario_momento || 0) * (item.quantidade || 0)), 0
      );
      return acc + custoItens;
    }, 0);
    const margemBruta = receitaMes > 0 ? ((receitaMes - custoMes) / receitaMes) * 100 : 0;
    const ticketMedio = vendasMes.length > 0 ? receitaMes / vendasMes.length : 0;

    const compras30Dias = compras.filter(c => 
      new Date(c.created_date) >= inicio30Dias
    );
    const valorCompras30Dias = compras30Dias.reduce((acc, c) => acc + (c.valor_total || 0), 0);

    const vendas30Dias = vendas.filter(v => 
      v.status === 'Finalizado' &&
      new Date(v.created_date) >= inicio30Dias
    );
    const lucro30Dias = vendas30Dias.reduce((acc, v) => {
      const receita = v.valor_total || 0;
      const custoItens = (v.itens || []).reduce((sum, item) => 
        sum + ((item.custo_unitario_momento || 0) * (item.quantidade || 0)), 0
      );
      return acc + (receita - custoItens);
    }, 0);

    const produtosAbaixoMinimo = produtos.filter(p => 
      p.ativo && 
      (p.estoque_atual || 0) <= (p.estoque_minimo || 0)
    );

    const proximos7Dias = subDays(hoje, -7);
    const contasVencendo = lancamentos.filter(l => 
      l.status === 'Em Aberto' &&
      new Date(l.data_vencimento) <= proximos7Dias &&
      new Date(l.data_vencimento) >= hoje
    );

    setData({
      receitaMes,
      margemBruta,
      ticketMedio,
      lucro30Dias,
      valorCompras30Dias,
      produtosAbaixoMinimo: produtosAbaixoMinimo.length,
      contasVencendo: contasVencendo.length
    });

    setIsLoading(false);
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs - SEM BORDAS - apenas fundo */}
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Indicadores do Mês</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Faturamento</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(data.receitaMes)}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Margem Bruta</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{data.margemBruta.toFixed(1)}%</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ticket Médio</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(data.ticketMedio)}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lucro (30d)</div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-500">{formatCurrency(data.lucro30Dias)}</div>
          </div>
        </div>
      </div>

      {/* Alertas - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Requer Atenção</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Baixo Estoque</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.produtosAbaixoMinimo}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.produtosAbaixoMinimo > 0 
                ? 'Produtos precisam reposição' 
                : 'Nenhum produto crítico'}
            </p>
          </button>

          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Contas Vencendo</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.contasVencendo}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.contasVencendo > 0 
                ? 'Próximos 7 dias' 
                : 'Nenhuma conta vencendo'}
            </p>
          </button>
        </div>
      </div>

      {/* Eficiência - SEM BORDA - gradiente sutil */}
      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Eficiência Operacional</h3>
        </div>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Lucro Gerado (30d)</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-500">
              {formatCurrency(data.lucro30Dias)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Novas Compras (30d)</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatCurrency(data.valorCompras30Dias)}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Taxa de Reinvestimento</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {data.valorCompras30Dias > 0 
                ? ((data.lucro30Dias / data.valorCompras30Dias) * 100).toFixed(1)
                : '0.0'}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Do lucro usado em estoque
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}