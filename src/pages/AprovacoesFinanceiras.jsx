import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle, XCircle, Eye, DollarSign, ArrowUpRight, ArrowDownLeft, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PedidoCompraResumoDialog from '@/components/compras/PedidoCompraResumoDialog';
import { runOperacaoAuthBypass } from '@/components/auth/runOperacaoAuthBypass';
import { registrarTransicao } from '@/components/compras/transicaoHelper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AprovacoesFinanceirasPage() {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPedidosIds, setSelectedPedidosIds] = useState([]);
  const [modoSelecaoLote, setModoSelecaoLote] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showPedidoDetails, setShowPedidoDetails] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pedidosLiberacao, pedidosAprovacaoFinanceira, contasData] = await Promise.all([
      base44.entities.PedidoCompra.filter({ status: 'Aguardando Liberação' }),
      base44.entities.PedidoCompra.filter({ status: 'Aguardando Aprovação Financeira' }),
      base44.entities.ContasFinanceiras.filter({ ativo: true })
    ]);

    const pedidosPendentes = [...pedidosLiberacao, ...pedidosAprovacaoFinanceira];
    const adaptados = pedidosPendentes.map(p => ({
      id: p.id,
      referencia_id: p.id,
      referencia_tipo: 'PedidoCompra',
      referencia_numero: p.numero,
      descricao: `Compra - ${p.fornecedor_nome}`,
      valor: p.valor_total,
      status: p.status,
      _pedido: p,
    }));
    setPendingTransactions(adaptados);
    setContas(contasData);
  };

  const loadHistorico = async () => {
    setLoadingHistorico(true);
    try {
      // Busca pedidos aprovados recentemente
      const aprovados = await base44.entities.PedidoCompra.filter({ status: 'Aprovado' });
      const cancelados = await base44.entities.PedidoCompra.filter({ status: 'Cancelado' });
      const todos = [...aprovados, ...cancelados]
        .sort((a, b) => new Date(b.data_aprovacao_financeira || b.updated_date) - new Date(a.data_aprovacao_financeira || a.updated_date))
        .slice(0, 30);
      setHistorico(todos);
    } catch (e) {
      console.error(e);
    }
    setLoadingHistorico(false);
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

  const handleTogglePedidoLote = (pedidoId) => {
    setSelectedPedidosIds((prev) => prev.includes(pedidoId)
      ? prev.filter((id) => id !== pedidoId)
      : [...prev, pedidoId]);
  };

  const handleInitiateApproval = () => {
    if (!contaSelecionada) {
      alert('Selecione uma conta para realizar o pagamento.');
      return;
    }
    void runOperacaoAuthBypass((authData) => handleAuthSuccess(authData, 'approve'));
  };

  const handleInitiateBatchApproval = () => {
    if (!selectedPedidosIds.length) {
      alert('Selecione ao menos um pedido para aprovar em lote.');
      return;
    }
    if (!contaSelecionada) {
      alert('Selecione uma conta para realizar o pagamento.');
      return;
    }
    void runOperacaoAuthBypass((authData) => handleAuthSuccess(authData, 'approve_batch'));
  };

  const handleAuthSuccess = async (authData, tipoAcao) => {
    setIsProcessingApproval(true);

    const pedidosParaAprovar = tipoAcao === 'approve_batch'
      ? pendingTransactions.filter((item) => selectedPedidosIds.includes(item.id)).map((item) => item._pedido)
      : selectedTransaction ? [selectedTransaction._pedido] : [];

    try {
      if (tipoAcao === 'approve' || tipoAcao === 'approve_batch') {
        const agora = new Date().toISOString();
        const nomeAprovador = authData.intervenienteName || authData.userName || 'Usuário';
        const contaSelecionadaNome = contas.find(c => c.id === contaSelecionada)?.nome || '';

        for (const pedido of pedidosParaAprovar) {
          const notaAprovacao = `\n[Aprovado: ${nomeAprovador} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`;

          await base44.entities.PedidoCompra.update(pedido.id, {
            status: 'Aprovado',
            status_aprovacao_financeira: 'Aprovado Financeiramente',
            conta_pagamento_id: contaSelecionada,
            conta_pagamento_nome: contaSelecionadaNome,
            data_aprovacao_financeira: agora,
          });

          await registrarTransicao({
            pedidoId: pedido.id,
            pedidoNumero: pedido.numero,
            statusAnterior: 'Aguardando Liberação',
            statusNovo: 'Aprovado',
            responsavel: { id: authData.intervenienteId || authData.userId, nome: nomeAprovador, email: authData.intervenienteEmail || '' },
            tipoAutenticacao: 'Interveniente',
            codigoOperacao: authData.codigoOperacao || '',
            observacao: `Aprovação financeira. Conta: ${contaSelecionadaNome || contaSelecionada}`,
          });

          const lancamentos = await base44.entities.LancamentoFinanceiro.filter({ referencia_id: pedido.id });

          if (lancamentos.length === 0) {
            await base44.entities.LancamentoFinanceiro.create({
              tipo: 'Despesa',
              descricao: `Compra - ${pedido.fornecedor_nome || pedido.numero}`,
              terceiro_id: pedido.fornecedor_id,
              terceiro_nome: pedido.fornecedor_nome,
              valor: pedido.valor_total || 0,
              valor_liquido: pedido.valor_total || 0,
              data_vencimento: pedido.data_prevista_entrega || format(new Date(), 'yyyy-MM-dd'),
              status: 'Em Aberto',
              status_conciliacao: 'N/A',
              conta_financeira_id: contaSelecionada,
              conta_financeira_nome: contaSelecionadaNome,
              referencia_id: pedido.id,
              referencia_tipo: 'PedidoCompra',
              referencia_numero: pedido.numero,
              observacoes: notaAprovacao.trim(),
              is_custo_mercadoria: true,
              pedido_compra_vinculado_id: pedido.id,
              pedido_compra_vinculado_numero: pedido.numero,
              forma_pagamento_tipo: pedido.forma_pagamento_compra || undefined,
              forma_pagamento_compra: pedido.forma_pagamento_compra || undefined,
            });
          } else {
            for (const l of lancamentos) {
              await base44.entities.LancamentoFinanceiro.update(l.id, {
                tipo: 'Despesa',
                status: 'Em Aberto',
                conta_financeira_id: contaSelecionada,
                conta_financeira_nome: contaSelecionadaNome,
                is_custo_mercadoria: true,
                pedido_compra_vinculado_id: pedido.id,
                pedido_compra_vinculado_numero: pedido.numero,
                observacoes: (l.observacoes || '') + notaAprovacao,
                forma_pagamento_tipo: l.forma_pagamento_tipo || pedido.forma_pagamento_compra || undefined,
                forma_pagamento_compra: l.forma_pagamento_compra || pedido.forma_pagamento_compra || undefined,
              });
            }
          }
        }
      }

      await loadData();
      setSelectedTransaction(null);
      setSelectedPedidosIds([]);
      setModoSelecaoLote(false);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const groupedTransactions = pendingTransactions.reduce((acc, t) => {
    const key = t.referencia_numero || t.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const pedidosSelecionadosLote = useMemo(
    () => pendingTransactions.filter((item) => selectedPedidosIds.includes(item.id)),
    [pendingTransactions, selectedPedidosIds]
  );

  const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => { try { return format(new Date(d), 'dd/MM/yy HH:mm', { locale: ptBR }); } catch { return '-'; } };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
              Aprovações Financeiras
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {Object.keys(groupedTransactions).length} pendente{Object.keys(groupedTransactions).length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setModoSelecaoLote((prev) => !prev);
              setSelectedPedidosIds([]);
            }}
            className="rounded-2xl"
          >
            {modoSelecaoLote ? 'Cancelar lote' : 'Aprovar em lote'}
          </Button>
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
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {modoSelecaoLote && (
                      <button
                        onClick={() => handleTogglePedidoLote(primeira.id)}
                        className={`mt-1 h-5 w-5 rounded-full transition-colors ${selectedPedidosIds.includes(primeira.id) ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
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
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {primeira.referencia_tipo === 'PedidoCompra' && (
                      <Button variant="ghost" size="sm" onClick={() => handleViewPedido(primeira)} className="flex-1 gap-2 rounded-xl">
                        <Eye className="w-4 h-4" />
                        Ver Pedido
                      </Button>
                    )}
                    {!modoSelecaoLote && (
                      <Button onClick={() => { setSelectedTransaction(primeira); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl">
                        <CheckCircle className="w-4 h-4" />
                        Aprovar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modoSelecaoLote && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Aprovação em lote</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{pedidosSelecionadosLote.length} pedido(s) selecionado(s)</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(pedidosSelecionadosLote.reduce((acc, item) => acc + (item.valor || 0), 0))}</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo do lançamento</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">Despesa CMV automática</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pedidos aprovados no financeiro geram contas de compra como custo de mercadoria vendida.</p>
              </div>
              <div>
                <Label>Conta para Pagamento</Label>
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInitiateBatchApproval} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!pedidosSelecionadosLote.length}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar lote
              </Button>
            </div>
          </div>
        )}

        {/* Modal de aprovação */}
        {selectedTransaction && (
          <Dialog open={!!selectedTransaction} onOpenChange={() => { setSelectedTransaction(null); }}>
            <DialogContent className="dark:bg-gray-800">
              <DialogHeader>
                <p className="font-semibold text-lg">Aprovar Pagamento</p>
                </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/60 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo do lançamento</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">Despesa CMV automática</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Este pagamento de compra será salvo como custo de mercadoria vendida.</p>
                </div>
                <div>
                  <Label>Conta para Pagamento</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                    <SelectContent>
                      {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
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
          <PedidoCompraResumoDialog
            open={showPedidoDetails}
            onOpenChange={setShowPedidoDetails}
            pedido={selectedPedido}
          />
        )}

        {isProcessingApproval && (
          <div className="fixed inset-0 z-[70] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-3xl px-6 py-7 flex flex-col items-center gap-3 max-w-xs w-full text-center">
              <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white font-glacial">Processando aprovação</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aguarde para evitar confirmações acidentais.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB Histórico */}
      <button
        onClick={() => { setShowHistorico(true); loadHistorico(); }}
        className="fixed right-6 z-[55] flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-white shadow-xl dark:bg-gray-700 p38-bottom-fab1 lg:bottom-8"
        title="Histórico de aprovações"
      >
        <Clock className="w-5 h-5" />
      </button>

      {/* Sheet de Histórico */}
      {showHistorico && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowHistorico(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Histórico de Aprovações
              </h2>
              <button onClick={() => setShowHistorico(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingHistorico && <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>}
              {!loadingHistorico && historico.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum registro encontrado</div>
              )}
              {historico.map(p => (
                <div key={p.id} className="flex items-start justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.numero}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.fornecedor_nome}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {p.data_aprovacao_financeira ? fmtDate(p.data_aprovacao_financeira) : fmtDate(p.updated_date)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      R$ {(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}