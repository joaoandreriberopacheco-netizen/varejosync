import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingCart, Percent } from "lucide-react";

export default function EficienciaOperacional({ lucro, compras, isLoading }) {
  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`;
  const indiceReinvestimento = lucro > 0 ? (compras / lucro) * 100 : 0;

  return (
    <Card className="shadow-sm border-0 h-full bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-teal-600" />
          Eficiência Operacional
        </CardTitle>
        <p className="text-sm text-gray-500">Lucro gerado vs. Novas compras (Últimos 30 dias)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><TrendingUp className="w-4 h-4 text-green-500"/> Lucro Bruto</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(lucro)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1"><ShoppingCart className="w-4 h-4 text-blue-500"/> Novas Compras</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(compras)}</p>
              </div>
            </div>
            <div className="text-center pt-3 border-t">
              <p className="text-sm text-gray-500">Índice de Reinvestimento</p>
              <p className="text-2xl font-bold text-teal-700">{indiceReinvestimento.toFixed(1)}%</p>
              <p className="text-xs text-gray-500"> (quanto do lucro foi usado para comprar mais estoque)</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}