import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from '@/api/base44Client';
import { Users, ShoppingBag } from 'lucide-react';
import { dataHoje, inicioDiaSistemaISO, inicioSemanaCivilDesdeYmd } from '@/components/utils/dateUtils';

export default function VendasTab() {
  const [data, setData] = useState({
    kpisVendas: { faturamentoHoje: 0, pedidosHoje: 0, taxaConversao: 0, ticketMedioHoje: 0 },
    rankingVendedores: [],
    produtosMaisVendidos: [],
    funnelVendas: { orcamentos: 0, aguardandoPagamento: 0, finalizados: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVendasData = async () => {
      setIsLoading(true);
      try {
        const hoje = inicioDiaSistemaISO(dataHoje());
        const inicioSemana = inicioDiaSistemaISO(inicioSemanaCivilDesdeYmd(dataHoje()));

        const [vendasHoje, vendasSemana, orcamentos, aguardandoPagamento] = await Promise.all([
          base44.entities.PedidoVenda.filter({ status: 'Finalizado', created_date: { $gte: hoje } }),
          base44.entities.PedidoVenda.filter({ status: 'Finalizado', created_date: { $gte: inicioSemana } }),
          base44.entities.PedidoVenda.filter({ status: 'Orçamento' }),
          base44.entities.PedidoVenda.filter({ status: 'Aguardando Pagamento' })
        ]);

        const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + (v.valor_total || 0), 0);
        const pedidosHoje = vendasHoje.length;
        const ticketMedioHoje = pedidosHoje > 0 ? faturamentoHoje / pedidosHoje : 0;
        const taxaConversao = orcamentos.length > 0 ? (vendasHoje.length / orcamentos.length) * 100 : 0;

        const vendedoresPorFaturamento = vendasSemana.reduce((acc, venda) => {
          const vendedor = venda.vendedor_nome || 'Sem vendedor';
          if (!acc[vendedor]) acc[vendedor] = 0;
          acc[vendedor] += venda.valor_total || 0;
          return acc;
        }, {});
        
        const rankingVendedores = Object.entries(vendedoresPorFaturamento)
          .map(([nome, faturamento]) => ({ nome, faturamento }))
          .sort((a, b) => b.faturamento - a.faturamento)
          .slice(0, 5);

        const produtosPorQuantidade = {};
        vendasHoje.forEach(venda => {
          venda.itens?.forEach(item => {
            if (!produtosPorQuantidade[item.produto_nome]) {
              produtosPorQuantidade[item.produto_nome] = 0;
            }
            produtosPorQuantidade[item.produto_nome] += item.quantidade || 0;
          });
        });
        
        const produtosMaisVendidos = Object.entries(produtosPorQuantidade)
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);

        setData({
          kpisVendas: { faturamentoHoje, pedidosHoje, taxaConversao, ticketMedioHoje },
          rankingVendedores,
          produtosMaisVendidos,
          funnelVendas: { 
            orcamentos: orcamentos.length, 
            aguardandoPagamento: aguardandoPagamento.length, 
            finalizados: vendasHoje.length 
          }
        });

      } catch (error) {
        console.error("Erro ao carregar dados de vendas:", error);
      }
      setIsLoading(false);
    };

    loadVendasData();
  }, []);

  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

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
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Performance de Hoje</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Faturamento</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.kpisVendas.faturamentoHoje)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.kpisVendas.pedidosHoje}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Taxa Conversão</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.kpisVendas.taxaConversao.toFixed(1)}%
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ticket Médio</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.kpisVendas.ticketMedioHoje)}
            </div>
          </div>
        </div>
      </div>

      {/* Rankings - SEM BORDAS */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Top Vendedores (Semana)</h3>
          </div>
          <div className="space-y-2">
            {data.rankingVendedores.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma venda esta semana</p>
            ) : (
              data.rankingVendedores.map((vendedor, index) => (
                <div key={vendedor.nome} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{vendedor.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">{formatCurrency(vendedor.faturamento)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Mais Vendidos (Hoje)</h3>
          </div>
          <div className="space-y-2">
            {data.produtosMaisVendidos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma venda hoje</p>
            ) : (
              data.produtosMaisVendidos.map((produto) => (
                <div key={produto.nome} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1 min-w-0 mr-2">{produto.nome}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{produto.quantidade} un.</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Funil - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Funil de Vendas</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.funnelVendas.orcamentos}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Orçamentos Abertos</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.funnelVendas.aguardandoPagamento}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Aguardando Pagamento</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-500 mb-1">{data.funnelVendas.finalizados}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Finalizados (Hoje)</div>
          </div>
        </div>
      </div>
    </div>
  );
}