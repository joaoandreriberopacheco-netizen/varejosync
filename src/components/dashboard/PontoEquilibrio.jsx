import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";

export default function PontoEquilibrio({ atual, meta, isLoading }) {
  const percentual = meta > 0 ? (atual / meta) * 100 : 0;
  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`;

  return (
    <Card className="shadow-sm border-0 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Progresso para o Ponto de Equilíbrio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : (
          <>
            <Progress value={percentual} className="w-full" />
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                <span className="font-bold text-lg text-indigo-700">{formatCurrency(atual)}</span> faturado
              </div>
              <div className="text-gray-500 text-right">
                Meta: <span className="font-semibold text-gray-700">{formatCurrency(meta)}</span>
              </div>
            </div>
            <div className="text-center font-medium text-lg mt-2">
              {percentual.toFixed(1)}% da meta atingida
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}