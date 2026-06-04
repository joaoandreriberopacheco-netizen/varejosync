import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { P38MobileLine, P38MobileLineList, P38StatusLabel } from '@/components/ui/p38-mobile-line';

export default function AutorizacoesEstornoPendentes({ turnoAtivo, contaCaixa, currentUser }) {
  const [autorizacoes, setAutorizacoes] = useState([]);
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState('info'); // 'info' | 'confirmacao'
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Carregar autorizações pendentes do turno
  useEffect(() => {
    if (!turnoAtivo) return;
    loadAutorizacoes();
  }, [turnoAtivo]);

  const loadAutorizacoes = async () => {
    try {
      const todas = await base44.entities.AutorizacaoEstorno.list();
      const pendentes = todas.filter(
        a => a.status === 'Pendente' && a.turno_caixa_destino_id === turnoAtivo.id
      );
      setAutorizacoes(pendentes);
    } catch (error) {
      console.error('Erro ao carregar autorizações:', error);
    }
  };

  const handleAbrirAutorizacao = (auth) => {
    setSelectedAuth(auth);
    setStep('info');
    setShowDialog(true);
  };

  const handleProcessarEstorno = async () => {
    if (!selectedAuth || !contaCaixa) return;
    
    setLoading(true);
    try {
      // Criar lançamento financeiro de despesa
      const lancamento = await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: `Autorização de Estorno - ${selectedAuth.numero} - ${selectedAuth.devolucao_numero}`,
        valor: selectedAuth.valor_autorizado,
        conta_financeira_id: contaCaixa.id,
        conta_financeira_nome: contaCaixa.nome,
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago',
        categoria: 'Outros',
        turno_caixa_id: turnoAtivo.id,
        referencia_tipo: 'DevolucaoTroca',
        referencia_id: selectedAuth.devolucao_id,
        referencia_numero: selectedAuth.devolucao_numero,
        observacoes: `Reembolso de devolução: ${selectedAuth.motivo}`,
      });

      // Atualizar autorização como processada
      await base44.entities.AutorizacaoEstorno.update(selectedAuth.id, {
        status: 'Processado',
        caixa_operador_id: currentUser.id,
        caixa_operador_nome: currentUser.full_name,
      });

      // Debitar do saldo do caixa (buscar saldo atual direto do banco para evitar stale)
      const contaAtualizada = await base44.entities.ContasFinanceiras.get(contaCaixa.id);
      const novoSaldo = ((contaAtualizada || contaCaixa).saldo_atual || 0) - selectedAuth.valor_autorizado;
      await base44.entities.ContasFinanceiras.update(contaCaixa.id, {
        saldo_atual: novoSaldo,
      });

      toast({
        title: '✓ Estorno processado!',
        description: `Autorização ${selectedAuth.numero} confirmada e registrada.`,
        className: 'bg-emerald-100 text-emerald-800',
        duration: 2000,
      });

      setShowDialog(false);
      setSelectedAuth(null);
      loadAutorizacoes(); // Recarregar lista
    } catch (error) {
      toast({
        title: 'Erro ao processar estorno',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (autorizacoes.length === 0) {
    return null;
  }

  const formatValor = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <>
      {/* Badge de notificação flutuante */}
      <div className="fixed top-20 right-4 z-40 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
              {autorizacoes.length} {autorizacoes.length === 1 ? 'Autorização' : 'Autorizações'} Pendente{autorizacoes.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Devoluções aguardando sua confirmação
            </p>
            <button
              onClick={() => handleAbrirAutorizacao(autorizacoes[0])}
              className="mt-3 text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline">
              Processar agora →
            </button>
          </div>
        </div>
      </div>

      {/* Dialog para processar autorização */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
            <button
              onClick={() => {
                if (step === 'confirmacao') {
                  setStep('info');
                } else {
                  setShowDialog(false);
                }
              }}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}>
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
              Processar Autorização de Estorno
            </h2>
            <div className="w-10" />
          </div>

          {selectedAuth && (
            <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
              {step === 'info' && (
                <>
                  {/* Dados da autorização - pré-preenchidos */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Autorização Gerencial</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Número</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {selectedAuth.numero}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Devolução</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {selectedAuth.devolucao_numero}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pedido Original</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {selectedAuth.pedido_origem_numero}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Cliente</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedAuth.cliente_nome}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Gerente Aprovador</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedAuth.gerente_aprovador_nome}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Motivo</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 text-right max-w-xs">
                          {selectedAuth.motivo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Valor do estorno - destaque */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-6 shadow-sm">
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">Valor Autorizado para Reembolso</div>
                    <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-300 font-glacial mb-2">
                      {formatValor(selectedAuth.valor_autorizado)}
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      Será debitado do caixa em dinheiro (operador valida)
                    </div>
                  </div>

                  {/* Informações da conta de caixa */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Movimentação Financeira</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Conta</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{contaCaixa?.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Atual</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatValor(contaCaixa?.saldo_atual)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saldo Após Estorno</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatValor((contaCaixa?.saldo_atual || 0) - selectedAuth.valor_autorizado)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('confirmacao')}
                    className="w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm bg-yellow-600 hover:bg-yellow-700 transition-colors"
                    style={{ minHeight: '56px' }}>
                    Prosseguir para Confirmação →
                  </button>
                </>
              )}

              {step === 'confirmacao' && (
                <>
                  {/* Confirmação - operador valida */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-2xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                          Confirmação de Identidade
                        </h3>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                          Confirme que você é {currentUser?.full_name} e está autorizando este reembolso
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold block mb-2">
                          Operador (seu nome) *
                        </label>
                        <Input
                          value={currentUser?.full_name || ''}
                          disabled
                          className="bg-white dark:bg-gray-700 border-emerald-200 dark:border-emerald-700 dark:text-white"
                        />
                      </div>

                      <div className="pt-2 border-t-2 border-dashed border-emerald-300 dark:border-emerald-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Valor a Reembolsar</div>
                            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 font-glacial">
                              {formatValor(selectedAuth.valor_autorizado)}
                            </div>
                          </div>
                          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>

                      <p className="text-xs text-emerald-700 dark:text-emerald-300 text-center py-3 bg-white dark:bg-gray-800 rounded-xl">
                        Ao confirmar, você está validando o reembolso do cliente {selectedAuth.cliente_nome} e entregando o valor em dinheiro
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('info')}
                      disabled={loading}
                      className="flex-1 h-14 rounded-2xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                      style={{ minHeight: '56px' }}>
                      Voltar
                    </button>
                    <button
                      onClick={handleProcessarEstorno}
                      disabled={loading}
                      className="flex-1 h-14 rounded-2xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      style={{ minHeight: '56px' }}>
                      {loading ? 'Processando...' : 'Confirmar Reembolso'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}