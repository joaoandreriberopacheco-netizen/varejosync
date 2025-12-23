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
import { DollarSign, Wallet, PlusCircle, Edit, Trash2, CreditCard, Banknote, Settings } from 'lucide-react';
import { getTenantId } from '@/components/utils/tenant';
import GestaoCaixa from '../components/financeiro/GestaoCaixa';

export default function FinanceiroModuloPage() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
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
    const tenantId = getTenantId();
    const [accountsData, transactionsData] = await Promise.all([
    base44.entities.ContasFinanceiras.filter({ empresa_id: tenantId }),
    base44.entities.LancamentoFinanceiro.filter({ empresa_id: tenantId })]
    );
    setAccounts(accountsData);
    setTransactions(transactionsData);
    setIsLoading(false);
  };

  const handleSaveAccount = async () => {
    if (selectedAccount) {
      await base44.entities.ContasFinanceiras.update(selectedAccount.id, formData);
    } else {
      const tenantId = getTenantId();
      await base44.entities.ContasFinanceiras.create({
        ...formData,
        empresa_id: tenantId,
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

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Sidebar de Navegação */}
      <aside className="w-56 flex-shrink-0 space-y-1">
        <div className="pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200">Financeiro</h2>
        </div>
        
        <Link
          to={createPageUrl('CaixasAtivos')}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">

          <Wallet className="w-4 h-4" />
          Caixas Ativos
        </Link>
        
        <Link
          to={createPageUrl('FinanceiroModulo')}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium">

          <DollarSign className="w-4 h-4" />
          Gestão de Contas
        </Link>
        
        <Link
          to={createPageUrl('Configuracoes')}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">

          <CreditCard className="w-4 h-4" />
          Formas de Pagamento
        </Link>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 space-y-6">
        {/* Header - SEM CORES */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Gestão de Contas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fluxo de Caixa, Contas e Projeções</p>
        </div>

      {/* KPIs - SEM CORES, SEM CARDS */}
      <div className="grid grid-cols-4 gap-8 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-gray-500 mb-1 px-5 text-xs dark:text-gray-400">Saldo Total</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(saldoTotal)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{accounts.length} conta(s)</p>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Receitas (Mês)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(receitasMes)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Recebidas</p>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Despesas (Mês)</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(despesasMes)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pagas</p>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo do Mês</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(saldoMes)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Resultado</p>
        </div>
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
          </div>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="caixa" className="mt-0">
            <GestaoCaixa />
          </TabsContent>

          <TabsContent value="contas" className="mt-0">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-base font-normal text-gray-800 dark:text-gray-200">Contas Financeiras (Cofres)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas contas, caixas e cofres</p>
                </div>
                <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500">
                  <PlusCircle className="w-4 h-4" /> Nova Conta
                </Button>
              </div>

              {/* Lista de Contas */}
              {accounts.length === 0 ?
                <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma conta cadastrada</p>
                  <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
                    <PlusCircle className="w-4 h-4" /> Criar Primeira Conta
                  </Button>
                </div> :

                <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-700">
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableHead className="text-gray-700 dark:text-gray-300">Nome</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Banco</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo Atual</TableHead>
                        <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) =>
                      <TableRow key={account.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
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
                          'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'}`
                          }>
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
                      )}
                    </TableBody>
                  </Table>
                </div>
                }
            </div>
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
    </div>);

}