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
import FluxoCaixaTabV2 from '@/components/financeiro/FluxoCaixaTabV2';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';
import ConciliacaoBancaria from '../components/financeiro/ConciliacaoBancaria';
import ExecucaoOrcamentaria from '../components/financeiro/ExecucaoOrcamentaria';

export default function FinanceiroModuloPage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conciliacaoConta, setConciliacaoConta] = useState(null); // conta selecionada para conciliar
  const [pendenciasConciliacao, setPendenciasConciliacao] = useState({}); // { contaId: count }
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
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
    const [accountsData, transactionsData, contasData, pendingData, pendConciliacao] = await Promise.all([
      base44.entities.ContasFinanceiras.list(),
      base44.entities.LancamentoFinanceiro.list(),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
      base44.entities.LancamentoFinanceiro.filter({ status: 'Aguardando Aprovação Financeira' }),
      base44.entities.LancamentoFinanceiro.filter({ status_conciliacao: 'Pendente' })
    ]);
    setAccounts(accountsData);
    setTransactions(transactionsData);
    setContas(contasData);
    setPendingTransactions(pendingData);

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

  // Handlers para Aprovações
  const handleOpenDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setContaSelecionada('');
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

  const handleInitiateApproval = () => {
    if (!contaSelecionada) {
      toast({
        title: "Conta obrigatória",
        description: "Selecione uma conta para realizar o pagamento.",
        variant: "destructive"
      });
      return;
    }
    setActionType('approve');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    try {
      if (actionType === 'approve') {
        const allTransactions = pendingTransactions.filter(
          t => t.referencia_id === selectedTransaction.referencia_id
        );

        for (const trans of allTransactions) {
          await base44.entities.LancamentoFinanceiro.update(trans.id, {
            status: 'Em Aberto',
            observacoes: (trans.observacoes || '') + 
              `\n[Aprovado por: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
          });
        }

        if (selectedTransaction.referencia_tipo === 'PedidoCompra') {
          const pedidos = await base44.entities.PedidoCompra.filter({ id: selectedTransaction.referencia_id });
          if (pedidos.length > 0) {
            const pedido = pedidos[0];
            await base44.entities.PedidoCompra.update(pedido.id, {
              status: 'Aguardando Recepção',
              status_aprovacao_financeira: 'Aprovado Financeiramente',
              conta_pagamento_id: contaSelecionada,
              historico: (pedido.historico || '') + 
                `\n[Aprovação Financeira: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
            });
          }
        }

        toast({
          title: "Pagamento aprovado",
          description: "O pedido foi aprovado financeiramente e está liberado.",
          className: "bg-gray-100 text-gray-800"
        });
      } else if (actionType === 'reject') {
        const allTransactions = pendingTransactions.filter(
          t => t.referencia_id === selectedTransaction.referencia_id
        );

        for (const trans of allTransactions) {
          await base44.entities.LancamentoFinanceiro.update(trans.id, {
            status: 'Cancelado',
            observacoes: (trans.observacoes || '') + 
              `\n[Rejeitado por: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
          });
        }

        if (selectedTransaction.referencia_tipo === 'PedidoCompra') {
          const pedidos = await base44.entities.PedidoCompra.filter({ id: selectedTransaction.referencia_id });
          if (pedidos.length > 0) {
            const pedido = pedidos[0];
            await base44.entities.PedidoCompra.update(pedido.id, {
              status_aprovacao_financeira: 'Rejeitado Financeiramente',
              historico: (pedido.historico || '') + 
                `\n[Rejeição Financeira: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
            });
          }
        }

        toast({
          title: "Pagamento rejeitado",
          description: "O pedido foi rejeitado pelo financeiro.",
          variant: "destructive"
        });
      }

      loadInitialData();
      setSelectedTransaction(null);
      setIsAuthOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const groupedTransactions = pendingTransactions.reduce((acc, t) => {
    const key = t.referencia_numero || t.id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(t);
    return acc;
  }, {});

  const totalPendente = pendingTransactions.reduce((sum, t) => sum + (t.valor || 0), 0);

  return (
    <div className="w-full min-w-0 overflow-x-hidden" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-0.5">Gestão Financeira</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Fluxo de Caixa, Contas e Projeções</p>
      </div>

      <Tabs defaultValue="fluxo" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0">
          <div className="flex w-full">
            <TabsTrigger
                value="fluxo"
                className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Fluxo de Caixa</span>
            </TabsTrigger>
            <TabsTrigger
                value="contas"
                className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Contas</span>
            </TabsTrigger>
            <TabsTrigger
                value="aprovacoes"
                className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <AlertCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Aprovações</span>
            </TabsTrigger>
            <TabsTrigger
                value="pagamentos"
                className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Pagamentos</span>
            </TabsTrigger>
          </div>
        </TabsList>

        <div className="mt-2 w-full min-w-0 overflow-x-hidden">
          <TabsContent value="fluxo" className="mt-0">
            <FluxoCaixaTabV2 />
          </TabsContent>

          <TabsContent value="contas" className="mt-0 space-y-4">
            {/* KPI Saldo Total */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Saldo Total Consolidado</p>
              <p className="text-3xl font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(saldoTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{accounts.filter(a => a.ativo).length} conta(s) ativa(s)</p>
            </div>

            {/* Header ação */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Contas e Caixas</p>
              <Button onClick={handleAddNew} size="sm" className="gap-2 bg-gray-800 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-full px-4">
                <PlusCircle className="w-4 h-4" /> Nova
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma conta cadastrada</p>
                <Button onClick={handleAddNew} className="gap-2 bg-gray-800 hover:bg-gray-700 rounded-full px-6">
                  <PlusCircle className="w-4 h-4" /> Criar Primeira Conta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((account) => {
                  const tipoIconMap = {
                    'Caixa Físico': <Banknote className="w-5 h-5" />,
                    'Conta Bancária': <CreditCard className="w-5 h-5" />,
                    'Carteira Digital': <Wallet className="w-5 h-5" />,
                    'Poupança': <Wallet className="w-5 h-5" />,
                    'Investimento': <DollarSign className="w-5 h-5" />,
                  };
                  const saldo = account.saldo_atual || 0;
                  const isNegativo = saldo < 0;
                  return (
                    <div
                      key={account.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col"
                    >
                      {/* Topo colorido */}
                      <div
                        className="h-1.5 w-full"
                        style={{ backgroundColor: account.cor || '#10B981' }}
                      />
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        {/* Nome e tipo */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                              style={{ backgroundColor: account.cor || '#10B981' }}
                            >
                              {tipoIconMap[account.tipo] || <Wallet className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-100 leading-tight">{account.nome}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{account.tipo}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            account.ativo
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-400'
                          }`}>
                            {account.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        {/* Saldo */}
                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Saldo Atual</p>
                          <p className={`text-2xl font-semibold ${isNegativo ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>
                            {formatCurrency(saldo)}
                          </p>
                          {account.banco && (
                            <p className="text-xs text-gray-400 mt-1">{account.banco}{account.agencia ? ` · Ag ${account.agencia}` : ''}</p>
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
                        <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <button
                            onClick={() => window.location.href = createPageUrl(`ExtratoConta?id=${account.id}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Extrato
                          </button>
                          <button
                            onClick={() => handleEditAccount(account)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aprovacoes" className="mt-0 space-y-6">
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-0">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Aprovações Financeiras</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Gerencie aprovações, histórico e solicitações em uma tela dedicada
              </p>
              <Link to={createPageUrl('FinanceiroAprovacoes')}>
                <Button className="gap-2 bg-gray-700 hover:bg-gray-600">
                  <FileText className="w-4 h-4" />
                  Ir para Aprovações
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-0">
            <FormasPagamentoManager />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog de Conciliação Bancária */}
      <Dialog open={!!conciliacaoConta} onOpenChange={(open) => !open && setConciliacaoConta(null)}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700 max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-gray-800 dark:text-gray-200 flex items-center gap-2">
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
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              {selectedAccount ? 'Editar Conta' : 'Nova Conta Financeira'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Nome da Conta</Label>
              <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Caixa Loja 1"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />

            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="Caixa Físico">Caixa Físico</SelectItem>
                  <SelectItem value="Conta Bancária">Conta Bancária</SelectItem>
                  <SelectItem value="Carteira Digital">Carteira Digital</SelectItem>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Saldo Inicial</Label>
              <Input
                  type="number"
                  step="0.01"
                  value={formData.saldo_inicial}
                  onChange={(e) => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={handleSaveAccount} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}