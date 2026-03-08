import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingCart, Warehouse, DollarSign, Download, FileText, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import RelatorioPerformance from './RelatorioPerformance';
import SeletorProdutoRPP from '@/components/relatorios/SeletorProdutoRPP';
import DecomposicaoIEP from '@/components/relatorios/DecomposicaoIEP';

export default function RelatoriosPage() {
  const [showSeletor, setShowSeletor] = useState(false);
  const [showRPP, setShowRPP] = useState(false);
  const [dadosProdutoSelecionado, setDadosProdutoSelecionado] = useState(null);
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
    { nome: "Relatório de Performance de Produto", descricao: "Dossiê tático com análise IEP, pilares operacionais e insights IA" },
  ];

  const relatoriosFinanceiros = [
    { nome: "Fluxo de Caixa Projetado", descricao: "Previsão de entradas e saídas" },
    { nome: "Contas a Pagar", descricao: "Obrigações financeiras pendentes" },
    { nome: "Contas a Receber", descricao: "Valores a receber de clientes" },
    { nome: "DRE (Demonstrativo de Resultados)", descricao: "Receitas, custos e despesas do período" },
    { nome: "Análise de Margem", descricao: "Margem bruta e líquida por produto/categoria" },
  ];

  const RelatorioCard = ({ relatorio, onClickAbrir }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClickAbrir?.(relatorio.nome)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{relatorio.nome}</h3>
            <p className="text-sm text-gray-600 mt-1">{relatorio.descricao}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-green-600">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Central de Relatórios</h1>
          <p className="text-gray-600">Acesse relatórios estratégicos e operacionais do seu negócio.</p>
          <div className="flex gap-4 mt-4">
            <Link to="/RelatorioMargem">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <TrendingUp className="w-4 h-4" />
                Novo Relatório de Margem & Lucratividade
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="gerenciais" className="space-y-6">
          <TabsList>
            <TabsTrigger value="gerenciais" className="gap-2">
              <FileText className="w-4 h-4" /> Gerenciais
            </TabsTrigger>
            <TabsTrigger value="vendas" className="gap-2">
              <TrendingUp className="w-4 h-4" /> Vendas
            </TabsTrigger>
            <TabsTrigger value="compras" className="gap-2">
              <ShoppingCart className="w-4 h-4" /> Compras
            </TabsTrigger>
            <TabsTrigger value="estoque" className="gap-2">
              <Warehouse className="w-4 h-4" /> Estoque
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2">
              <DollarSign className="w-4 h-4" /> Financeiro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gerenciais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatoriosGerenciais.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="vendas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatoriosVendas.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="compras">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatoriosCompras.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>

          <TabsContent value="estoque">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatoriosEstoque.map((rel, i) => (
                <RelatorioCard 
                  key={i} 
                  relatorio={rel}
                  onClickAbrir={(nome) => {
                    if (nome === "Relatório de Performance de Produto") {
                      setShowRPP(true);
                    }
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatoriosFinanceiros.map((rel, i) => <RelatorioCard key={i} relatorio={rel} />)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showRPP && (
        <RelatorioPerformance 
          dados={{
            nome: 'Cimento Portland Standard 50kg',
            tipo: 'SKU',
            categoria: 'Cimento Portland',
            lucro90dias: 45200.00,
            classeABCD: 'A',
            scoreIEP: 85,
            pilares: {
              margem: { valorReal: '45.2%', score: 85, mediaCat: '38.5%' },
              giro: { valorReal: '24 dias', score: 72, mediaCat: '32 dias' },
              anexacao: { valorReal: '68%', score: 68, mediaCat: '55%' }
            },
            outliers: [],
            empresa: {
              departamento: 'Inteligência & Compras',
              nome: 'VarejoSync',
              email: 'inteligencia@varejosynq.com.br'
            }
          }}
          onClose={() => setShowRPP(false)} 
        />
      )}
    </div>
  );
}