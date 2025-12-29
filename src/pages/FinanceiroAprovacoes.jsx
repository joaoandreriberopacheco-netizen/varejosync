import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertCircle, DollarSign, FileText, Eye } from 'lucide-react';
import { getTenantId } from '@/components/utils/tenant';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import DetalhesPedidoCompra from '@/components/compras/DetalhesPedidoCompra';

export default function FinanceiroAprovacoesPage() {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showPedidoDetails, setShowPedidoDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const tenantId = getTenantId();
    
    const [transactionsData, contasData] = await Promise.all([
      base44.entities.LancamentoFinanceiro.filter({ 
        empresa_id: tenantId,
        status: 'Aguardando Aprovação Financeira'
      }),
      base44.entities.ContasFinanceiras.filter({ empresa_id: tenantId, ativo: true })
    ]);

    setPendingTransactions(transactionsData);
    setContas(contasData);
    setIsLoading(false);
  };

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

  const handleInitiateReject = () => {
    setActionType('reject');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    try {
      if (actionType === 'approve') {
        // Buscar todos os lançamentos do mesmo pedido
        const allTransactions = pendingTransactions.filter(
          t => t.referencia_id === selectedTransaction.referencia_id
        );

        // Atualizar todos os lançamentos
        for (const trans of allTransactions) {
          await base44.entities.LancamentoFinanceiro.update(trans.id, {
            status: 'Em Aberto',
            observacoes: (trans.observacoes || '') + 
              `\n[Aprovado por: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
          });
        }

        // Atualizar o pedido de compra
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
        // Buscar todos os lançamentos do mesmo pedido
        const allTransactions = pendingTransactions.filter(
          t => t.referencia_id === selectedTransaction.referencia_id
        );

        // Cancelar todos os lançamentos
        for (const trans of allTransactions) {
          await base44.entities.LancamentoFinanceiro.update(trans.id, {
            status: 'Cancelado',
            observacoes: (trans.observacoes || '') + 
              `\n[Rejeitado por: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
          });
        }

        // Atualizar o pedido
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

      loadData();
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

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Agrupar por referência
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
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Aprovações Financeiras</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie pagamentos pendentes de aprovação</p>
      </div>

      {/* KPIs */}
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
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 animate-spin" />
            <p>Carregando aprovações...</p>
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-0">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Nenhuma aprovação pendente</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Todas as contas estão aprovadas ou não há solicitações no momento</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([refNumber, transactions]) => {
            const firstTransaction = transactions[0];
            const totalGrupo = transactions.reduce((sum, t) => sum + (t.valor || 0), 0);
            
            return (
              <Card key={refNumber} className="p-6 hover:shadow-lg transition-shadow border-0 shadow-sm bg-white dark:bg-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                        {firstTransaction.referencia_numero || 'Lançamento Avulso'}
                      </h3>
                      <Badge className="bg-yellow-100 text-yellow-800 border-0">
                        <Clock className="w-3 h-3 mr-1" />
                        Aguardando
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-medium">Fornecedor:</span> {firstTransaction.terceiro_nome}</p>
                      <p><span className="font-medium">Descrição:</span> {firstTransaction.descricao}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Total</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalGrupo)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {transactions.length} {transactions.length === 1 ? 'lançamento' : 'lançamentos'}
                    </div>
                  </div>
                </div>

                {/* Lista de Parcelas/Lançamentos */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Detalhamento:</div>
                  <div className="space-y-2">
                    {transactions.map((t, idx) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {t.descricao}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Venc: {format(new Date(t.data_vencimento), 'dd/MM/yyyy')}
                          </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(t.valor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    className="gap-2 border-0 shadow-sm"
                    onClick={() => handleViewPedido(transactions[0])}
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalhes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 border-0 shadow-sm"
                    onClick={() => {
                      setSelectedTransaction(transactions[0]);
                      setActionType('reject');
                      setIsAuthOpen(true);
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </Button>
                  <Button 
                    className="gap-2 bg-gray-700 hover:bg-gray-600"
                    onClick={() => handleOpenDialog(transactions[0])}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </Button>
                </div>
              </Card>
            );
          })
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

      <DetalhesPedidoCompra 
        pedido={selectedPedido}
        isOpen={showPedidoDetails}
        onClose={() => {
          setShowPedidoDetails(false);
          setSelectedPedido(null);
        }}
      />
    </div>
  );
}