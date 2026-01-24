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
import { DollarSign, Wallet, PlusCircle, Edit, Trash2, CreditCard, Banknote, Settings, AlertCircle, CheckCircle, XCircle, Clock, FileText, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import GestaoCaixa from '../components/financeiro/GestaoCaixa';
import FormasPagamentoManager from '../components/config/FormasPagamentoManager';

export default function FinanceiroModuloPage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
    const [accountsData, transactionsData, contasData, pendingData] = await Promise.all([
      base44.entities.ContasFinanceiras.list(),
      base44.entities.LancamentoFinanceiro.list(),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
      base44.entities.LancamentoFinanceiro.filter({ status: 'Aguardando Aprovação Financeira' })
    ]);
    setAccounts(accountsData);
    setTransactions(transactionsData);
    setContas(contasData);
    setPendingTransactions(pendingData);
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Gestão Financeira</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Fluxo de Caixa, Contas e Projeções</p>
      </div>

      <Tabs defaultValue="caixa" className="w-full">
        <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0">
          <div className="flex w-full">
            <TabsTrigger
                value="caixa"
                className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 min-h-[48px] data-[state=active]:bg-transparent data-[state=active]:shadow-none">

              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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

        <div className="mt-6">
          <TabsContent value="caixa" className="mt-0">
            <GestaoCaixa />
          </TabsContent>

          <TabsContent value="contas" className="mt-0 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-normal text-gray-800 dark:text-gray-200">Contas Financeiras (Cofres)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas contas, caixas e cofres</p>
              </div>
              <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500">
                <PlusCircle className="w-4 h-4" /> Nova Conta
              </Button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 border-0 shadow-sm rounded-xl">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma conta cadastrada</p>
                <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
                  <PlusCircle className="w-4 h-4" /> Criar Primeira Conta
                </Button>
              </div>
            ) : (
              <div className="border-0 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-700">
                    <TableRow className="border-0">
                      <TableHead className="text-gray-700 dark:text-gray-300">Nome</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Banco</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo Atual</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id} className="border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="font-medium text-gray-800 dark:text-gray-200">{account.nome}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{account.tipo}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{account.banco || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-gray-800 dark:text-gray-200">
                          {formatCurrency(account.saldo_atual)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            account.ativo ?
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
                          }`}>
                            {account.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAccount(account)}
                              className="hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAccount(account.id)}
                              className="hover:bg-gray-100 dark:hover:bg-gray-600">
                              <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="aprovacoes" className="mt-0 space-y-6">
            {/* KPIs Aprovações */}
            <div className="grid grid-cols-3 gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Pendente</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalPendente)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos Aguardando</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{Object.keys(groupedTransactions).length}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lançamentos</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{pendingTransactions.length}</div>
              </div>
            </div>

            {/* Lista de Aprovações */}
            <div>
              {Object.keys(groupedTransactions).length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-0">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Nenhuma aprovação pendente</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Todas as contas estão aprovadas ou não há solicitações no momento</p>
                </div>
              ) : (
                <div className="border-0 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-900/80">
                      <TableRow className="border-0">
                        <TableHead className="text-gray-700 dark:text-gray-300">Pedido</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Fornecedor</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Descrição</TableHead>
                        <TableHead className="text-center text-gray-700 dark:text-gray-300">Lançamentos</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Valor Total</TableHead>
                        <TableHead className="text-center text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedTransactions).map(([refNumber, transactions]) => {
                        const firstTransaction = transactions[0];
                        const totalGrupo = transactions.reduce((sum, t) => sum + (t.valor || 0), 0);
                        
                        return (
                          <TableRow key={refNumber} className="border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                              {firstTransaction.referencia_numero || 'Avulso'}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {firstTransaction.terceiro_nome}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {firstTransaction.descricao}
                            </TableCell>
                            <TableCell className="text-center text-gray-600 dark:text-gray-400">
                              {transactions.length}
                            </TableCell>
                            <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200">
                              {formatCurrency(totalGrupo)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                <Clock className="w-3 h-3 mr-1" />
                                Aguardando
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleViewPedido(transactions[0])}
                                  title="Ver Detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setSelectedTransaction(transactions[0]);
                                    setActionType('reject');
                                    setIsAuthOpen(true);
                                  }}
                                  title="Rejeitar"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                                <Button 
                                  size="icon"
                                  className="bg-gray-700 hover:bg-gray-600"
                                  onClick={() => handleOpenDialog(transactions[0])}
                                  title="Aprovar"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Dialog de Aprovação */}
            <Dialog open={!!selectedTransaction && !isAuthOpen} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
              <DialogContent className="dark:bg-gray-800 border-0 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gray-800 dark:text-gray-200">
                    Aprovar Pagamento
                  </DialogTitle>
                </DialogHeader>
                
                {selectedTransaction && (
                  <div className="space-y-6 py-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                            {selectedTransaction.referencia_numero}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedTransaction.descricao}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fornecedor</div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {selectedTransaction.terceiro_nome}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento</div>
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {format(new Date(selectedTransaction.data_vencimento), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Total</div>
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                        {formatCurrency(selectedTransaction.valor)}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                        Conta de Pagamento *
                      </Label>
                      <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm">
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                          {contas.map(conta => (
                            <SelectItem key={conta.id} value={conta.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{conta.nome}</span>
                                <span className="text-xs text-gray-500 ml-3">
                                  {formatCurrency(conta.saldo_atual)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTransaction(null)}
                    className="border-0 shadow-sm"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleInitiateApproval}
                    className="bg-gray-700 hover:bg-gray-600"
                    disabled={!contaSelecionada}
                  >
                    Autenticar e Aprovar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Authenticator */}
            <OperacaoAuthenticator 
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onSuccess={handleAuthSuccess}
              operationName={`${actionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Pagamento ${selectedTransaction?.referencia_numero || ''}`}
            />

            <Dialog open={showPedidoDetails} onOpenChange={setShowPedidoDetails}>
              <PedidoCompraForm 
                pedido={selectedPedido}
                onClose={() => {
                  setShowPedidoDetails(false);
                  setSelectedPedido(null);
                }}
                onSave={async () => {
                  setShowPedidoDetails(false);
                  setSelectedPedido(null);
                }}
              />
            </Dialog>
          </TabsContent>

          <TabsContent value="pagamentos" className="mt-0">
            <FormasPagamentoManager />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog */}
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