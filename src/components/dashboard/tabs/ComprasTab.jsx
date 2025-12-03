import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from '@/api/base44Client';
import { getTenantId } from '@/components/utils/tenant';
import { format } from 'date-fns';
import { ShoppingCart, Calendar } from 'lucide-react';

export default function ComprasTab() {
  const [data, setData] = useState({
    valorComprasMes: 0,
    pedidosAbertos: 0,
    pedidosAtrasados: 0,
    fornecedorPrincipal: '',
    statusCounts: {},
    proximasEntregas: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadComprasData = async () => {
      setIsLoading(true);
      try {
        const tenantId = getTenantId();
        const todosPedidos = await base44.entities.PedidoCompra.filter({ empresa_id: tenantId });
        
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        const comprasMes = todosPedidos.filter(p => 
          new Date(p.created_date) >= inicioMes
        );
        
        const valorComprasMes = comprasMes.reduce((sum, p) => sum + (p.valor_total || 0), 0);
        
        const pedidosAbertos = todosPedidos.filter(p => 
          p.status !== 'Recebido' && p.status !== 'Cancelado'
        ).length;
        
        const pedidosAtrasados = todosPedidos.filter(p => 
          p.data_prevista_entrega && 
          new Date(p.data_prevista_entrega) < hoje && 
          p.status !== 'Recebido' && 
          p.status !== 'Cancelado'
        ).length;
        
        const fornecedores = {};
        todosPedidos.forEach(p => {
          if (p.fornecedor_nome) {
            fornecedores[p.fornecedor_nome] = (fornecedores[p.fornecedor_nome] || 0) + (p.valor_total || 0);
          }
        });
        
        const fornecedorPrincipal = Object.entries(fornecedores)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        const statusCounts = {};
        ['Rascunho', 'Enviado', 'Recebido Parcialmente', 'Recebido'].forEach(status => {
          statusCounts[status] = todosPedidos.filter(p => p.status === status).length;
        });
        
        const proximasEntregas = todosPedidos
          .filter(p => 
            p.data_prevista_entrega && 
            new Date(p.data_prevista_entrega) >= hoje &&
            p.status !== 'Recebido' && 
            p.status !== 'Cancelado'
          )
          .sort((a, b) => new Date(a.data_prevista_entrega) - new Date(b.data_prevista_entrega))
          .slice(0, 5);
        
        setData({
          valorComprasMes,
          pedidosAbertos,
          pedidosAtrasados,
          fornecedorPrincipal,
          statusCounts,
          proximasEntregas
        });
      } catch (error) {
        console.error("Erro ao carregar dados de compras:", error);
      }
      setIsLoading(false);
    };

    loadComprasData();
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
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">Resumo de Compras</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Compras do Mês</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.valorComprasMes)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos Abertos</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.pedidosAbertos}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Atrasados</div>
            <div className="text-xl font-semibold text-red-600 dark:text-red-500">
              {data.pedidosAtrasados}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Principal</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {data.fornecedorPrincipal}
            </div>
          </div>
        </div>
      </div>

      {/* Status e Entregas - SEM BORDAS */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Pedidos por Status</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Próximas Entregas</h3>
          </div>
          <div className="space-y-2">
            {data.proximasEntregas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma entrega agendada</p>
            ) : (
              data.proximasEntregas.map(pedido => (
                <div key={pedido.id} className="py-2 border-b last:border-0 border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{pedido.numero}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{pedido.fornecedor_nome}</div>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(pedido.data_prevista_entrega)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}