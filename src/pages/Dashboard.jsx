import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, TrendingUp, ShoppingCart, Package, DollarSign } from 'lucide-react';
import CentralAcoes from '../components/dashboard/CentralAcoes';
import GeralTab from '../components/dashboard/tabs/GeralTab';
import VendasTab from '../components/dashboard/tabs/VendasTab';
import ComprasTab from '../components/dashboard/tabs/ComprasTab';
import EstoqueTab from '../components/dashboard/tabs/EstoqueTab';
import FinanceiroTab from '../components/dashboard/tabs/FinanceiroTab';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('geral');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Dashboard Estratégico</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Visão geral do seu negócio
        </p>
      </div>

      {/* Central de Ações */}
      <CentralAcoes />

      {/* Tabs - MOBILE: SÓ ÍCONES */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0">
          <div className="flex justify-around w-full">
            <TabsTrigger 
              value="geral" 
              className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vendas"
              className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Vendas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="compras"
              className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ShoppingCart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Compras</span>
            </TabsTrigger>
            <TabsTrigger 
              value="estoque"
              className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Estoque</span>
            </TabsTrigger>
            <TabsTrigger 
              value="financeiro"
              className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Financeiro</span>
            </TabsTrigger>
          </div>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="geral" className="mt-0"><GeralTab /></TabsContent>
          <TabsContent value="vendas" className="mt-0"><VendasTab /></TabsContent>
          <TabsContent value="compras" className="mt-0"><ComprasTab /></TabsContent>
          <TabsContent value="estoque" className="mt-0"><EstoqueTab /></TabsContent>
          <TabsContent value="financeiro" className="mt-0"><FinanceiroTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}