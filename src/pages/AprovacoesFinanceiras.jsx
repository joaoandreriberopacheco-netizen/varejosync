import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle, XCircle, Eye, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AprovacoesFinanceirasPage() {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showPedidoDetails, setShowPedidoDetails] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pedidosPendentes, contasData] = await Promise.all([
      base44.entities.PedidoCompra.filter({ status: 'Aguardando Liberação' }),
      base44.entities.ContasFinanceiras.filter({ ativo: true })
    ]);
    // Adapta os pedidos ao formato esperado pela UI de transações
    const adaptados = pedidosPendentes.map(p => ({
      id: p.id,
      referencia_id: p.id,
      referencia_tipo: 'PedidoCompra',
      referencia_numero: p.numero,
      descricao: `Compra - ${p.fornecedor_nome}`,
      valor: p.valor_total,
      status: 'Aguardando Liberação',
      _pedido: p,
    }));
    setPendingTransactions(adaptados);
    setContas(contasData);
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
      alert('Selecione uma conta para realizar o pagamento.');
      return;
    }
    setActionType('approve');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    if (actionType === 'approve') {
      const allTransactions = pendingTransactions.filter(
        t => t.referencia_id === selectedTransaction.referencia_id
      );

      for (const trans of allTransactions) {
        await base44.entities.LancamentoFinanceiro.update(trans.id, {
          status: 'Em Aberto',
          observacoes: (trans.observacoes || '') + 
            `\n[Aprovado: ${authData.intervenienteName} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
        });
      }

      if (selectedTransaction.referencia_tipo === 'PedidoCompra') {
        const pedidos = await base44.entities.PedidoCompra.filter({ id: selectedTransaction.referencia_id });
        if (pedidos.length > 0) {
          await base44.entities.PedidoCompra.update(pedidos[0].id, {
            status: 'Aguardando Recepção',
            status_aprovacao_financeira: 'Aprovado Financeiramente',
            conta_pagamento_id: contaSelecionada
          });
        }
      }
    }

    loadData();
    setSelectedTransaction(null);
    setIsAuthOpen(false);
  };

  const groupedTransactions = pendingTransactions.reduce((acc, t) => {
    const key = t.referencia_numero || t.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Aprovações Financeiras
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {Object.keys(groupedTransactions).length} pendente{Object.keys(groupedTransactions).length !== 1 ? 's' : ''}
          </p>
        </div>

        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-sm">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-600 dark:text-gray-400">
              Nenhuma aprovação pendente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedTransactions).map(([refNumero, transacoes]) => {
              const primeira = transacoes[0];
              const total = transacoes.reduce((sum, t) => sum + (t.valor || 0), 0);

              return (
                <div key={refNumero} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{refNumero}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{primeira.descricao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                        {formatCurrency(total)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {transacoes.length} parcela{transacoes.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {primeira.referencia_tipo === 'PedidoCompra' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewPedido(primeira)}
                        className="flex-1 gap-2 rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Pedido
                      </Button>
                    )}
                    <Button 
                      onClick={() => { setSelectedTransaction(primeira); }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedTransaction && !isAuthOpen && (
          <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
            <DialogContent className="dark:bg-gray-800">
              <DialogHeader>
                <p className="font-semibold text-lg">Aprovar Pagamento</p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Conta para Pagamento</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Cancelar</Button>
                <Button onClick={handleInitiateApproval} className="bg-emerald-600">Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showPedidoDetails && selectedPedido && (
          <Dialog open={showPedidoDetails} onOpenChange={setShowPedidoDetails}>
            <PedidoCompraForm
              pedido={selectedPedido}
              isOpen={showPedidoDetails}
              onClose={() => setShowPedidoDetails(false)}
              readOnly
            />
          </Dialog>
        )}

        <OperacaoAuthenticator
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
          operationType={actionType === 'approve' ? 'Aprovação de Pagamento' : 'Rejeição de Pagamento'}
        />
      </div>
    </div>
  );
}