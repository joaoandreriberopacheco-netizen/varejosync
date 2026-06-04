import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Wallet, PlusCircle, Edit, Trash2, CreditCard, Banknote, Settings, AlertCircle, CheckCircle, XCircle, Clock, FileText, Eye, ArrowRightLeft, TrendingUp, Target } from 'lucide-react';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';

import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';
import ConciliacaoBancaria from '../components/financeiro/ConciliacaoBancaria';
import ExecucaoOrcamentaria from '../components/financeiro/ExecucaoOrcamentaria';

export default function FinanceiroModuloPage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conciliacaoConta, setConciliacaoConta] = useState(null); // conta selecionada para conciliar
  const [pendenciasConciliacao, setPendenciasConciliacao] = useState({}); // { contaId: count }
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showPedidoDetails, setShowPedidoDetails] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Caixa Físico',
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
    observacoes: '',
    ativo: true
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    const [accountsData, transactionsData, pendConciliacao] = await Promise.all([
      base44.entities.ContasFinanceiras.list(),
      base44.entities.LancamentoFinanceiro.list(),
      base44.entities.LancamentoFinanceiro.filter({ status_conciliacao: 'Pendente' })
    ]);
    setAccounts(accountsData);
    setTransactions(transactionsData);

    // Agrupa pendências de conciliação por conta
    const mapa = {};
    pendConciliacao.forEach(l => {
      if (l.conta_financeira_id) {
        mapa[l.conta_financeira_id] = (mapa[l.conta_financeira_id] || 0) + 1;
      }
    });
    setPendenciasConciliacao(mapa);
    setIsLoading(false);
  };

  const handleSaveAccount = async () => {
    if (selectedAccount) {
      await base44.entities.ContasFinanceiras.update(selectedAccount.id, formData);
    } else {
      await base44.entities.ContasFinanceiras.create({
        ...formData,
        saldo_atual: formData.saldo_inicial
      });
    }
    loadInitialData();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setFormData({
      nome: account.nome,
      tipo: account.tipo,
      banco: account.banco || '',
      agencia: account.agencia || '',
      conta: account.conta || '',
      saldo_inicial: account.saldo_inicial,
      observacoes: account.observacoes || '',
      ativo: account.ativo
    });
    setIsDialogOpen(true);
  };

  const handleDeleteAccount = async (id) => {
    if (confirm('Deseja realmente excluir esta conta?')) {
      await base44.entities.ContasFinanceiras.delete(id);
      loadInitialData();
    }
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({
      nome: '',
      tipo: 'Caixa Físico',
      banco: '',
      agencia: '',
      conta: '',
      saldo_inicial: 0,
      observacoes: '',
      ativo: true
    });
  };

  // Calcular estatísticas
  const saldoTotal = accounts.reduce((acc, a) => acc + (a.saldo_atual || 0), 0);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const receitasMes = transactions.
  filter((t) => t.tipo === 'Receita' && t.status === 'Pago' && new Date(t.data_pagamento) >= inicioMes).
  reduce((acc, t) => acc + (t.valor || 0), 0);

  const despesasMes = transactions.
  filter((t) => t.tipo === 'Despesa' && t.status === 'Pago' && new Date(t.data_pagamento) >= inicioMes).
  reduce((acc, t) => acc + (t.valor || 0), 0);

  const saldoMes = receitasMes - despesasMes;

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleViewPedido = async (transaction) => {
    if (transaction.referencia_tipo === 'PedidoCompra' && transaction.referencia_id) {
      const pedidos = await base44.entities.PedidoCompra.filter({ id: transaction.referencia_id });
      if (pedidos.length > 0) {
        setSelectedPedido(pedidos[0]);
        setShowPedidoDetails(true);
      }
    }
  };

  const tipoIconMap = {
    'Caixa Físico': Banknote,
    'Conta Bancária': CreditCard,
    'Carteira Digital': Wallet,
    'Poupança': Wallet,
    'Investimento': DollarSign,
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden font-din-1451 bg-background pb-[var(--p38-scroll-pad-below-nav)] md:pb-6" style={{ maxWidth: '100%' }}>
      {/* Header */}
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
        </TabsList>

        <div className="mt-2 w-full min-w-0 overflow-x-hidden">
          <TabsContent value="contas" className="mt-0 space-y-4">
            {/* KPI Saldo Total */}
            <div className="bg-card rounded-2xl shadow-sm p-5">
              <p className="text-xs text-muted-foreground mb-1">Saldo Total Consolidado</p>
              <p className="text-3xl font-semibold text-foreground">{formatCurrency(saldoTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{accounts.filter(a => a.ativo).length} conta(s) ativa(s)</p>
            </div>

            {/* Header ação */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Contas e Caixas</p>
              <Button onClick={handleAddNew} size="sm" className="gap-2 bg-primary hover:bg-primary/90 dark:bg-muted dark:hover:bg-muted/400 rounded-full px-4">
                <PlusCircle className="w-4 h-4" /> Nova
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl shadow-sm">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground dark:text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Nenhuma conta cadastrada</p>
                <Button onClick={handleAddNew} className="gap-2 bg-primary hover:bg-primary/90 rounded-full px-6">
                  <PlusCircle className="w-4 h-4" /> Criar Primeira Conta
                </Button>
              </div>
            ) : (
              <>
              <P38MobileLineList className="sm:hidden">
                {accounts.map((account, index) => {
                  const saldo = account.saldo_atual || 0;
                  const isNegativo = saldo < 0;
                  const pend = pendenciasConciliacao[account.id] || 0;
                  return (
                    <P38MobileLine
                      key={account.id}
                      striped={index % 2 === 1}
                      accent={p38AccentKeyFromTone(isNegativo ? 'danger' : account.ativo ? 'success' : 'muted')}
                      title={account.nome}
                      subtitle={account.tipo}
                      meta={
                        <>
                          <P38StatusLabel tone={account.ativo ? 'success' : 'muted'}>
                            {account.ativo ? 'Ativa' : 'Inativa'}
                          </P38StatusLabel>
                          {pend > 0 && (
                            <P38StatusLabel tone="warning">{pend} conciliação</P38StatusLabel>
                          )}
                        </>
                      }
                      value={formatCurrency(saldo)}
                      trailing={
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAccount(account);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(account.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      }
                      onClick={() => {
                        if (pend > 0) setConciliacaoConta(account);
                      }}
                    />
                  );
                })}
              </P38MobileLineList>

              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((account) => {
                  const saldo = account.saldo_atual || 0;
                  const isNegativo = saldo < 0;
                  const Icon = tipoIconMap[account.tipo] || Wallet;
                  return (
                    <div
                      key={account.id}
                      className="bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col border-l-2"
                      style={{ borderLeftColor: account.cor || 'hsl(var(--primary))' }}
                    >
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        {/* Nome e tipo */}
                        <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40 dark:bg-muted text-muted-foreground">
                            <Icon className="w-5 h-5" />
                          </div>
                            <div>
                              <p className="font-semibold text-foreground leading-tight">{account.nome}</p>
                              <p className="text-xs text-muted-foreground">{account.tipo}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            account.ativo
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-400'
                          }`}>
                            {account.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        {/* Saldo */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Saldo Atual</p>
                          <p className={`text-2xl font-semibold ${isNegativo ? 'text-red-500' : 'text-foreground'}`}>
                            {formatCurrency(saldo)}
                          </p>
                          {account.banco && (
                            <p className="text-xs text-muted-foreground mt-1">{account.banco}{account.agencia ? ` · Ag ${account.agencia}` : ''}</p>
                          )}
                        </div>

                        {/* Badge de pendências de conciliação */}
                        {pendenciasConciliacao[account.id] > 0 && (
                          <button
                            onClick={() => setConciliacaoConta(account)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium flex-1 text-left">
                              {pendenciasConciliacao[account.id]} lançamento{pendenciasConciliacao[account.id] > 1 ? 's' : ''} aguardando conciliação
                            </span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          </button>
                        )}

                        {/* Ações */}
                        <div className="flex gap-2 pt-1 border-t border-border/40">
                          <button
                            onClick={() => window.location.href = createPageUrl(`ExtratoConta?id=${account.id}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/40 dark:bg-muted hover:bg-muted dark:hover:bg-muted text-muted-foreground text-xs font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Extrato
                          </button>
                          <button
                            onClick={() => handleEditAccount(account)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/40 dark:bg-muted hover:bg-muted dark:hover:bg-muted text-muted-foreground transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted/40 dark:bg-muted hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
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
        </div>
      </Tabs>

      {/* Dialog de Conciliação Bancária */}
      <Dialog open={!!conciliacaoConta} onOpenChange={(open) => !open && setConciliacaoConta(null)}>
        <DialogContent className="dark:bg-muted dark:border-border/40 max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              Conciliação — {conciliacaoConta?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {conciliacaoConta && (
              <ConciliacaoBancaria
                contaId={conciliacaoConta.id}
                contaNome={conciliacaoConta.nome}
                onClose={() => setConciliacaoConta(null)}
                onConciliado={() => loadInitialData()}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova/Editar Conta */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark:bg-muted dark:border-border/40">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedAccount ? 'Editar Conta' : 'Nova Conta Financeira'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground/90">Nome da Conta</Label>
              <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Caixa Loja 1"
                  className="dark:bg-muted dark:border-border/40 dark:text-foreground" />

            </div>
            <div>
              <Label className="text-foreground/90">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="dark:bg-muted dark:border-border/40 dark:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-muted dark:border-border/40">
                  <SelectItem value="Caixa Físico">Caixa Físico</SelectItem>
                  <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                  <SelectItem value="Carteira Digital">Carteira Digital</SelectItem>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground/90">Saldo Inicial</Label>
              <Input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-muted dark:border-border/40 dark:text-foreground" />

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-muted dark:border-border/40">
              Cancelar
            </Button>
            <Button onClick={handleSaveAccount} className="bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-muted">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}