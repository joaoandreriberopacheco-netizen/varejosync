import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Wallet, CreditCard, AlertCircle, FileText, Target, Users } from 'lucide-react';
import FolhaPrevisaoPage from './FolhaPrevisao';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';
import ExecucaoOrcamentaria from '../components/financeiro/ExecucaoOrcamentaria';
import {
  GestaoContasEmbedded,
  GestaoContasKpis,
  GestaoContasPane,
} from '../components/financeiro/GestaoContasFinanceiras';

export default function FinanceiroModuloPage() {
  return (
    <div className="w-full min-w-0 overflow-x-hidden font-din-1451 bg-background pb-[var(--p38-scroll-pad-below-nav)] md:pb-6" style={{ maxWidth: '100%' }}>
      <div className="pb-3 border-b border-border/40">
        <h1 className="text-xl font-medium text-foreground mb-0.5">Gestão Financeira</h1>
        <p className="text-xs text-muted-foreground">Fluxo de Caixa, Contas e Projeções</p>
      </div>

      <Tabs defaultValue="contas" className="w-full mt-4">
        <TabsList className="w-full bg-muted/50/50 rounded-2xl p-1.5 h-auto">
          <TabsTrigger
            value="contas"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 min-h-[44px] data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">Contas</span>
          </TabsTrigger>
          <TabsTrigger
            value="aprovacoes"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 min-h-[44px] data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">Aprovações</span>
          </TabsTrigger>
          <TabsTrigger
            value="pagamentos"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 min-h-[44px] data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger
            value="orcamento"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 min-h-[44px] data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
          >
            <Target className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">Execução Orçamentária</span>
          </TabsTrigger>
          <TabsTrigger
            value="folha"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 min-h-[44px] data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline text-sm font-medium">Folha (previsão)</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-2 w-full min-w-0 overflow-x-hidden">
          <TabsContent value="contas" className="mt-0 space-y-2">
            <GestaoContasEmbedded active>
              <div className="md:hidden">
                <GestaoContasKpis layout="stack" />
              </div>
              <div className="hidden md:block py-0.5">
                <GestaoContasKpis layout="inline" />
              </div>
              <GestaoContasPane />
            </GestaoContasEmbedded>
          </TabsContent>

          <TabsContent value="aprovacoes" className="mt-0 space-y-6">
            <div className="text-center py-16 bg-card rounded-xl shadow-sm border-0">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">Aprovações Financeiras</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Gerencie aprovações, histórico e solicitações em uma tela dedicada
              </p>
              <Link to={createPageUrl('FinanceiroAprovacoes')}>
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <FileText className="w-4 h-4" />
                  Ir para Aprovações
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-0">
            <FormasPagamentoManager />
          </TabsContent>

          <TabsContent value="orcamento" className="mt-0">
            <ExecucaoOrcamentaria />
          </TabsContent>

          <TabsContent value="folha" className="mt-0">
            <FolhaPrevisaoPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
