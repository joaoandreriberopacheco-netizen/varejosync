import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle, XCircle, Eye, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { registrarTransicao } from '@/components/compras/transicaoHelper';
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
  const [tipoLancamento, setTipoLancamento] = useState('Despesa');

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
      const pedido = selectedTransaction._pedido;
      const agora = new Date().toISOString();
      const notaAprovacao = `\n[Aprovado: ${authData.intervenienteName} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`;

      // 1. Atualiza o PedidoCompra para Aprovado
      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Aprovado',
        status_aprovacao_financeira: 'Aprovado Financeiramente',
        conta_pagamento_id: contaSelecionada,
        data_aprovacao_financeira: agora,
      });

      // 1b. Registra a transição no log
      await registrarTransicao({
        pedidoId: pedido.id,
        pedidoNumero: pedido.numero,
        statusAnterior: 'Aguardando Liberação',
        statusNovo: 'Aprovado',
        responsavel: { id: authData.intervenienteId, nome: authData.intervenienteName, email: authData.intervenienteEmail || '' },
        tipoAutenticacao: 'Interveniente',
        codigoOperacao: authData.codigoOperacao || '',
        observacao: `Aprovação financeira. Conta: ${contas.find(c => c.id === contaSelecionada)?.nome || contaSelecionada}`,
      });

      // 2. Busca lançamentos vinculados
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
        referencia_id: pedido.id
      });

      if (lancamentos.length > 0) {
        // Atualiza os existentes: tipo, conta financeira + carimbo CMV + nota de aprovação
        for (const l of lancamentos) {
          await base44.entities.LancamentoFinanceiro.update(l.id, {
            tipo: tipoLancamento,
            conta_financeira_id: contaSelecionada,
            is_custo_mercadoria: tipoLancamento === 'Despesa',
            pedido_compra_vinculado_id: pedido.id,
            pedido_compra_vinculado_numero: pedido.numero,
            observacoes: (l.observacoes || '') + notaAprovacao,
          });
        }
      } else {
        // Cria agora (pedidos antigos que não tinham lançamento)
        const conta = contas.find(c => c.id === contaSelecionada);
        await base44.entities.LancamentoFinanceiro.create({
          tipo: tipoLancamento,
          descricao: `${tipoLancamento === 'Despesa' ? 'Compra de Mercadoria' : 'Receita de Compra'} - ${pedido.numero}`,
          terceiro_id: pedido.fornecedor_id,
          terceiro_nome: pedido.fornecedor_nome,
          valor: pedido.valor_total,
          data_vencimento: pedido.data_prevista_entrega || format(new Date(), 'yyyy-MM-dd'),
          status: 'Em Aberto',
          categoria: 'Compra de Mercadoria',
          referencia_id: pedido.id,
          referencia_tipo: 'PedidoCompra',
          referencia_numero: pedido.numero,
          conta_financeira_id: contaSelecionada,
          conta_financeira_nome: conta?.nome || '',
          is_custo_mercadoria: tipoLancamento === 'Despesa',
          pedido_compra_vinculado_id: pedido.id,
          pedido_compra_vinculado_numero: pedido.numero,
          observacoes: `Gerado na aprovação financeira.${notaAprovacao}`,
        });
      }
    }

    loadData();
    setSelectedTransaction(null);
    setIsAuthOpen(false);
  };

  // Cada item já é um pedido único — agrupa por referencia_numero para manter a mesma estrutura de UI
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
              const total = primeira.valor || 0;

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
                        {primeira._pedido?.fornecedor_nome || ''}
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
          <Dialog open={!!selectedTransaction} onOpenChange={() => { setSelectedTransaction(null); setTipoLancamento('Despesa'); }}>
            <DialogContent className="dark:bg-gray-800">
              <DialogHeader>
                <p className="font-semibold text-lg">Aprovar Pagamento</p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Seletor de tipo de lançamento */}
                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Tipo de Lançamento</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTipoLancamento('Despesa')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        tipoLancamento === 'Despesa'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      D
                    </button>
                    <button
                      onClick={() => setTipoLancamento('Receita')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        tipoLancamento === 'Receita'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      R
                    </button>
                    <span className="self-center text-xs text-gray-400 dark:text-gray-500">
                      {tipoLancamento === 'Despesa' ? 'Registrar como saída financeira' : 'Registrar como entrada financeira'}
                    </span>
                  </div>
                </div>

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