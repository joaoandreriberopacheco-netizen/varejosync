import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingCart, Warehouse, DollarSign, Download, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RelatoriosPage() {
  const relatoriosGerenciais = [
    { nome: "Relatório de Ponto de Equilíbrio", descricao: "Análise mensal do ponto de equilíbrio operacional" },
    { nome: "Índice de Eficiência Operacional", descricao: "Lucro bruto vs. investimento em compras" },
    { nome: "Dashboard Executivo", descricao: "Visão consolidada de todos os KPIs do negócio" },
  ];

  const relatoriosVendas = [
    { nome: "Vendas por Período", descricao: "Faturamento detalhado por dia/semana/mês" },
    { nome: "Ranking de Vendedores", descricao: "Performance individual da equipe de vendas" },
    { nome: "Análise de Ticket Médio", descricao: "Evolução do ticket médio ao longo do tempo" },
    { nome: "Taxa de Conversão", descricao: "Orçamentos vs. Pedidos finalizados" },
    { nome: "Produtos Mais Vendidos", descricao: "Top produtos por quantidade e faturamento" },
  ];

  const relatoriosCompras = [
    { nome: "Curva ABC de Fornecedores", descricao: "Classificação de fornecedores por volume de compra" },
    { nome: "Análise de Lead Time", descricao: "Tempo médio de entrega por fornecedor" },
    { nome: "Histórico de Preços de Compra", descricao: "Evolução dos custos de aquisição" },
    { nome: "Pedidos de Compra Pendentes", descricao: "Listagem de POs aguardando recebimento" },
  ];

  const relatoriosEstoque = [
    { nome: "Inventário Valorizado", descricao: "Estoque atual com valor total investido" },
    { nome: "Giro de Estoque", descricao: "Análise de rotatividade por produto/categoria" },
    { nome: "Produtos com Estoque Crítico", descricao: "Itens abaixo do estoque mínimo" },
    { nome: "Produtos Sem Giro", descricao: "Itens parados há mais de X dias" },
    { nome: "Histórico de Movimentações", descricao: "Rastreabilidade completa de entradas/saídas" },
  ];

  const relatoriosFinanceiros = [
    { nome: "Fluxo de Caixa Projetado", descricao: "Previsão de entradas e saídas" },
    { nome: "Contas a Pagar", descricao: "Obrigações financeiras pendentes" },
    { nome: "Contas a Receber", descricao: "Valores a receber de clientes" },
    { nome: "DRE (Demonstrativo de Resultados)", descricao: "Receitas, custos e despesas do período" },
    { nome: "Análise de Margem", descricao: "Margem bruta e líquida por produto/categoria" },
  ];

  const RelatorioCard = ({ relatorio }) => (
    <Card className="hover:shadow-md transition-shadow border-none bg-white dark:bg-gray-800 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-800 dark:text-gray-200">{relatorio.nome}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{relatorio.descricao}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 lg:p-6 bg-[#f8f9fa] dark:bg-[#0f172a] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 font-glacial">Central de Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Acesse relatórios estratégicos e operacionais do seu negócio.</p>
          <div className="flex gap-4 mt-6">
            <Link to="/RelatorioMargem">
              <Button className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white gap-2 rounded-xl shadow-sm h-12 px-6">
                <TrendingUp className="w-4 h-4" />
                Novo Relatório de Margem & Lucratividade
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="gerenciais" className="space-y-6">
          <TabsList className="w-full flex justify-start bg-transparent border-b border-gray-200 dark:border-gray-800 rounded-none h-auto p-0 gap-6 overflow-x-auto no-scrollbar">
            <TabsTrigger value="gerenciais" className="gap-2 border-b-2 border-transparent data-[state=active]:border-gray-800 dark:data-[state=active]:border-gray-200 rounded-none py-3 px-0 bg-transparent shadow-none transition-all">
              <FileText className="w-4 h-4" /> <span className="hidden md:inline">Gerenciais</span>
            </TabsTrigger>
            <TabsTrigger value="vendas" className="gap-2 border-b-2 border-transparent data-[state=active]:border-gray-800 dark:data-[state=active]:border-gray-200 rounded-none py-3 px-0 bg-transparent shadow-none transition-all">
              <TrendingUp className="w-4 h-4" /> <span className="hidden md:inline">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="compras" className="gap-2 border-b-2 border-transparent data-[state=active]:border-gray-800 dark:data-[state=active]:border-gray-200 rounded-none py-3 px-0 bg-transparent shadow-none transition-all">
              <ShoppingCart className="w-4 h-4" /> <span className="hidden md:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="gap-2 border-b-2 border-transparent data-[state=active]:border-gray-800 dark:data-[state=active]:border-gray-200 rounded-none py-3 px-0 bg-transparent shadow-none transition-all">
              <Warehouse className="w-4 h-4" /> <span className="hidden md:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2 border-b-2 border-transparent data-[state=active]:border-gray-800 dark:data-[state=active]:border-gray-200 rounded-none py-3 px-0 bg-transparent shadow-none transition-all">
              <DollarSign className="w-4 h-4" /> <span className="hidden md:inline">Financeiro</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gerenciais" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosGerenciais.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="vendas" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosVendas.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="compras" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosCompras.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosEstoque.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatoriosFinanceiros.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}