import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, History, BarChart3, RefreshCw } from 'lucide-react';
import MovimentacaoEstoqueForm from '../components/estoque/MovimentacaoEstoqueForm';
import HistoricoMovimentacoes from '../components/estoque/HistoricoMovimentacoes';
import FilaSeparacao from '../components/estoque/FilaSeparacao';
import { getTenantId } from '@/components/utils/tenant';

export default function EstoquePage() {
  const [stats, setStats] = useState({
    totalEntradas: 0,
    totalSaidas: 0,
    totalMovimentacoes: 0
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const tenantId = getTenantId();
    const movimentacoes = await base44.entities.MovimentacaoEstoque.filter({ empresa_id: tenantId });
    
    const entradas = movimentacoes.filter(m => m.tipo === 'Entrada').length;
    const saidas = movimentacoes.filter(m => m.tipo === 'Saída').length;
    
    setStats({
      totalEntradas: entradas,
      totalSaidas: saidas,
      totalMovimentacoes: movimentacoes.length
    });
    setIsLoading(false);
  };

  const handleNewMovement = () => {
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    await loadStats();
    setIsFormOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - SEM CORES */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Módulo de Estoque</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Gerencie seu inventário, separação de pedidos, entradas, saídas e histórico completo
        </p>
      </div>

      <Tabs defaultValue="fila" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0">
          <div className="flex justify-around w-full md:justify-start md:gap-8">
            <TabsTrigger 
              value="fila" 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 md:py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 min-h-[48px] md:min-h-[auto]"
            >
              <Package className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal">Fila de Separação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="movimento"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 md:py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 min-h-[48px] md:min-h-[auto]"
            >
              <TrendingUp className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal">Nova Movimentação</span>
            </TabsTrigger>
            <TabsTrigger 
              value="historico"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 md:py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 min-h-[48px] md:min-h-[auto]"
            >
              <History className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal">Histórico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="atual"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 md:py-2.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 min-h-[48px] md:min-h-[auto]"
            >
              <BarChart3 className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal">Inventário Atual</span>
            </TabsTrigger>
          </div>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="fila" className="mt-0">
            <FilaSeparacao />
          </TabsContent>

          <TabsContent value="movimento" className="mt-0">
            <MovimentacaoEstoqueForm onSave={handleSave} />
          </TabsContent>

          <TabsContent value="historico" className="mt-0">
            <HistoricoMovimentacoes />
          </TabsContent>

          <TabsContent value="atual" className="mt-0">
            <div className="space-y-6">
              {/* KPIs - SEM CORES */}
              <div className="grid grid-cols-3 gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Entradas</div>
                  <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{stats.totalEntradas}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Saídas</div>
                  <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{stats.totalSaidas}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Movimentações</div>
                  <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{stats.totalMovimentacoes}</div>
                </div>
              </div>

              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Inventário em desenvolvimento</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}