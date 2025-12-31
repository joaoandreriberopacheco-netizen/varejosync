import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, DollarSign, BarChart3, Settings, Building2, Users, Sliders, Tags, Percent, Wallet, CreditCard, Smartphone, Bookmark, Wrench } from 'lucide-react';
import TabelasPrecoManager from '../components/config/TabelasPrecoManager';
import ConfiguracoesVendaManager from '../components/config/ConfiguracoesVendaManager';
import PoliticasDescontoManager from '../components/config/PoliticasDescontoManager';
import ContasFinanceirasManager from '../components/config/ContasFinanceirasManager';
import CategoriasFinanceirasManager from '../components/config/CategoriasFinanceirasManager';
import ConfigEstoqueManager from '../components/config/ConfigEstoqueManager';
import MaquininhasManager from '../components/config/MaquininhasManager';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';
import UsuariosManager from '../components/config/UsuariosManager';
import DadosEmpresaManager from '../components/config/DadosEmpresaManager';
import DataAuditor from '../components/config/DataAuditor';
import SeedDataTool from '../components/config/SeedDataTool';
import TenantDebugger from '../components/config/TenantDebugger';
import RecomecarDoZero from '../components/config/RecomecarDoZero';

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 font-glacial overflow-x-hidden">
      {/* Header - SEM CORES */}
      <div className="pb-3 md:pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-1">Configurações</h1>
        <p className="text-xs md:text-base text-gray-500 dark:text-gray-400 font-light">Regras de Negócio e Parâmetros do Sistema</p>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        {/* TabsList principal sem div interna para melhor compatibilidade mobile */}
        <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex overflow-x-auto overflow-y-hidden no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <TabsTrigger 
            value="vendas" 
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Vendas</span>
          </TabsTrigger>
          <TabsTrigger 
            value="operacoes"
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Operações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="financeiro"
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <DollarSign className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger 
            value="relatorios"
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Relatórios</span>
          </TabsTrigger>
          <TabsTrigger 
            value="geral"
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Parâmetros</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sistema"
            className="flex-1 md:flex-none px-2 md:px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-gray-500 data-[state=active]:text-gray-700 dark:text-gray-400 dark:data-[state=active]:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
          >
            <Wrench className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-sm font-medium">Ferramentas</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="vendas" className="mt-0">
            <Tabs defaultValue="fluxo" className="w-full">
              <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex overflow-x-auto overflow-y-hidden no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <TabsTrigger value="fluxo" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Fluxo & Parâmetros</span>
                </TabsTrigger>
                <TabsTrigger value="tabelas" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Tags className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Tabelas de Preço</span>
                </TabsTrigger>
                <TabsTrigger value="desconto" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Percent className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Políticas de Desconto</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="fluxo"><ConfiguracoesVendaManager /></TabsContent>
              <TabsContent value="tabelas"><TabelasPrecoManager /></TabsContent>
              <TabsContent value="desconto"><PoliticasDescontoManager /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="operacoes" className="mt-0">
            <ConfigEstoqueManager />
          </TabsContent>

          <TabsContent value="financeiro" className="mt-0">
            <Tabs defaultValue="contas" className="w-full">
              <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex overflow-x-auto overflow-y-hidden no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <TabsTrigger value="contas" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Wallet className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Contas</span>
                </TabsTrigger>
                <TabsTrigger value="formas" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Pagamentos</span>
                </TabsTrigger>
                <TabsTrigger value="maquininhas" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Maquininhas</span>
                </TabsTrigger>
                <TabsTrigger value="categorias" className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Categorias</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="contas"><ContasFinanceirasManager /></TabsContent>
              <TabsContent value="formas"><FormasPagamentoManager /></TabsContent>
              <TabsContent value="maquininhas"><MaquininhasManager /></TabsContent>
              <TabsContent value="categorias"><CategoriasFinanceirasManager /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="relatorios" className="mt-0">
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>Configurações de relatórios em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="geral" className="mt-0">
            <Tabs defaultValue="empresa" className="w-full">
              <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex overflow-x-auto overflow-y-hidden no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <TabsTrigger 
                  value="empresa" 
                  className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Dados da Empresa</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="usuarios" 
                  className="flex-1 md:flex-none px-2 md:px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-sky-600 dark:data-[state=active]:border-sky-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium text-slate-500 data-[state=active]:text-sky-700 dark:text-slate-400 dark:data-[state=active]:text-sky-400 hover:text-sky-600 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden data-[state=active]:inline md:inline">Cadastro de Usuários</span>
                </TabsTrigger>
              </TabsList>
              <div className="mt-6">
                <TabsContent value="empresa"><DadosEmpresaManager /></TabsContent>
                <TabsContent value="usuarios"><UsuariosManager /></TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          <TabsContent value="sistema" className="mt-0">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Ferramentas de Sistema</h2>
                </div>
                <div className="grid gap-4">
                  <RecomecarDoZero />
                  <TenantDebugger />
                  <DataAuditor />
                  <SeedDataTool />
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}