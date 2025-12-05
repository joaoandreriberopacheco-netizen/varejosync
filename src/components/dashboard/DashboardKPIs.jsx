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
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    { 
      title: "Margem Bruta Média", 
      value: `${safeKpis.margemBruta.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    { 
      title: "Ticket Médio", 
      value: `R$ ${safeKpis.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: ShoppingBag,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    { 
      title: "Valor em Estoque", 
      value: `R$ ${safeKpis.valorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="shadow-sm border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
            <div className={`p-2 rounded-md ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}