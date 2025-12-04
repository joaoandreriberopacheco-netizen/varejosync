import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, ShoppingBag, Package } from 'lucide-react';

export default function DashboardKPIs({ kpis, isLoading }) {
  if (!kpis && !isLoading) return null;
  
  const safeKpis = kpis || { faturamentoMes: 0, margemBruta: 0, ticketMedio: 0, valorEstoque: 0 };

  const cards = [
    { 
      title: "Faturamento do Mês", 
      value: `R$ ${safeKpis.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      trend: "neutral"
    },
    { 
      title: "Margem Bruta Média", 
      value: `${safeKpis.margemBruta.toFixed(1)}%`,
      icon: TrendingUp,
      trend: "up" // Exemplo, lógica real viria dos dados
    },
    { 
      title: "Ticket Médio", 
      value: `R$ ${safeKpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: ShoppingBag,
      trend: "neutral"
    },
    { 
      title: "Valor em Estoque", 
      value: `R$ ${safeKpis.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Package,
      trend: "neutral"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-gray-800 border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</CardTitle>
            <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-700">
              <card.icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 bg-gray-100 dark:bg-gray-700" />
            ) : (
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</div>
                {/* Indicador sutil de status */}
                {card.trend === 'up' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Tendência de alta"></div>}
                {card.trend === 'down' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Tendência de baixa"></div>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}