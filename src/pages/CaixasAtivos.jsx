import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Eye, TrendingUp, DollarSign, Clock, ChevronRight, PieChart, Receipt, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CaixasAtivosPage() {
  const [turnosAtivos, setTurnosAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurno, setSelectedTurno] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadTurnos();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadTurnos = async () => {
    try {
      const turnos = await base44.entities.TurnoCaixa.filter({ status: 'Aberto' });
      setTurnosAtivos(turnos);
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetalhes = async (turno) => {
    try {
      const [vendas, movimentos, despesas] = await Promise.all([
        base44.entities.PedidoVenda.filter({ turno_caixa_id: turno.id }),
        base44.entities.MovimentosCaixa.filter({ turno_caixa_id: turno.id }),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turno.id, tipo: 'Despesa' })
      ]);

      const totalVendas = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0, totalVale = 0;
      
      vendas.forEach(v => {
        if (v.pagamentos) {
          v.pagamentos.forEach(p => {
            const fp = (p.forma_pagamento || '').toLowerCase();
            if (fp === 'dinheiro') totalDinheiro += p.valor || 0;
            else if (fp === 'pix') totalPix += p.valor || 0;
            else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += p.valor || 0;
            else if (fp.includes('débito') || fp.includes('debito')) totalDebito += p.valor || 0;
            else if (fp.includes('vale')) totalVale += p.valor || 0;
          });
        }
      });

      const totalReforcos = movimentos.filter(m => m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
      const totalSangrias = movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').reduce((s, m) => s + (m.valor || 0), 0);
      const totalDespesas = despesas.reduce((s, d) => s + (d.valor || 0), 0);

      const saldoInicial = turno.saldo_inicial || 0;
      const saldoCaixa = saldoInicial + totalDinheiro + totalReforcos - totalSangrias - totalDespesas;
      const liquidez = saldoInicial + totalVendas + totalReforcos - totalSangrias - totalDespesas;

      setDetalhes({
        vendas,
        vendasCount: vendas.length,
        totalVendas,
        saldoCaixa,
        liquidez,
        saldoInicial,
        recebimentos: { dinheiro: totalDinheiro, pix: totalPix, credito: totalCredito, debito: totalDebito, vale: totalVale },
        reforcos: totalReforcos,
        sangrias: totalSangrias,
        despesas: totalDespesas,
        despesasLista: despesas,
        movimentos,
      });
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleVerDetalhes = async (turno) => {
    setSelectedTurno(turno);
    await loadDetalhes(turno);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Caixas Ativos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {turnosAtivos.length} {turnosAtivos.length === 1 ? 'turno ativo' : 'turnos ativos'}
          </p>
        </div>

        {turnosAtivos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-600 dark:text-gray-400">
              Nenhum caixa ativo no momento
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {turnosAtivos.map((turno) => (
              <div
                key={turno.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                      {turno.conta_caixa_pdv_nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {turno.usuario_abertura_nome}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Aberto
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Turno</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {turno.numero}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Abertura</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {turno.data_abertura ? format(new Date(turno.data_abertura), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial</span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white font-glacial">
                      {formatValor(turno.saldo_inicial)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleVerDetalhes(turno)}
                  className="w-full h-11 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Detalhes</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Detalhes Completo */}
      <Dialog open={!!selectedTurno} onOpenChange={() => { setSelectedTurno(null); setDetalhes(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 border-none p-0">
          {selectedTurno && (
            <div className="flex flex-col h-full">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white font-glacial">
                  {selectedTurno.conta_caixa_pdv_nome}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Turno {selectedTurno.numero} · {selectedTurno.usuario_abertura_nome}
                </p>
              </DialogHeader>

              {detalhes ? (
                <Tabs defaultValue="balanco" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="mx-6 mt-4 bg-transparent border-b border-gray-100 dark:border-gray-800 rounded-none p-0 gap-1">
                    <TabsTrigger value="balanco" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-4 py-2 rounded-t-xl rounded-b-none">
                      <PieChart className="w-4 h-4 mr-2" />
                      Balanço
                    </TabsTrigger>
                    <TabsTrigger value="vendas" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-4 py-2 rounded-t-xl rounded-b-none">
                      <Receipt className="w-4 h-4 mr-2" />
                      Vendas
                    </TabsTrigger>
                    <TabsTrigger value="movimentos" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm px-4 py-2 rounded-t-xl rounded-b-none">
                      <Wallet className="w-4 h-4 mr-2" />
                      Movimentos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="balanco" className="flex-1 overflow-auto p-6 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Movimentações do Turno */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">
                          Movimentações do Turno
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Inicial</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.saldoInicial)}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Total Vendas</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.totalVendas)}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Reforços</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.reforcos)}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Recolhimentos</span>
                            <span className="text-base font-medium text-blue-600 dark:text-blue-400">{formatValor(detalhes.sangrias)}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
                            <span className="text-base font-medium text-red-600 dark:text-red-400">{formatValor(detalhes.despesas)}</span>
                          </div>
                          <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Liquidez do Turno</span>
                              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(detalhes.liquidez)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recebimentos do Turno */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                        <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">
                          Recebimentos do Turno
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Dinheiro</span>
                            <span className="text-base font-medium text-gray-900 dark:text-white">{formatValor(detalhes.recebimentos.dinheiro)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 px-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">PIX</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.recebimentos.pix)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 px-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Crédito</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.recebimentos.credito || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 px-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Débito</span>
                            <span className="text-base font-medium text-gray-900 dark:text-gray-100">{formatValor(detalhes.recebimentos.debito || 0)}</span>
                          </div>
                          {(detalhes.recebimentos.vale || 0) > 0 && (
                            <div className="flex items-center justify-between py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Vale Troca</span>
                                <span className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">não monetário</span>
                              </div>
                              <span className="text-base font-medium text-emerald-700 dark:text-emerald-300">{formatValor(detalhes.recebimentos.vale)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="vendas" className="flex-1 overflow-auto p-6 mt-0">
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{detalhes.vendasCount} {detalhes.vendasCount === 1 ? 'venda' : 'vendas'} · Total: {formatValor(detalhes.totalVendas)}</p>
                      {detalhes.vendas.map(v => (
                        <div key={v.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{v.cliente_nome}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{v.numero} · {v.created_date ? format(new Date(v.created_date), 'HH:mm', { locale: ptBR }) : ''}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 dark:text-white font-glacial">{formatValor(v.valor_total)}</div>
                              <div className="text-xs text-gray-400">{v.itens?.length || 0} itens</div>
                            </div>
                          </div>
                          {v.pagamentos && v.pagamentos.length > 0 && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-2 space-y-1">
                              {v.pagamentos.map((p, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">{p.forma_pagamento}</span>
                                  <span className="text-gray-900 dark:text-white">{formatValor(p.valor)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="movimentos" className="flex-1 overflow-auto p-6 mt-0">
                    <div className="space-y-2">
                      {(() => {
                        const itensMovimentos = detalhes.movimentos.map(m => ({
                          id: m.id,
                          tipo: m.tipo,
                          valor: m.valor,
                          descricao: m.observacao || m.tipo,
                          hora: m.created_date,
                          cor: m.tipo === 'Reforço' ? 'emerald' : 'blue',
                        }));
                        const itensDespesas = (detalhes.despesasLista || []).map(d => ({
                          id: d.id,
                          tipo: 'Despesa',
                          valor: d.valor,
                          descricao: d.descricao,
                          hora: d.created_date,
                          cor: 'red',
                        }));
                        const todos = [...itensMovimentos, ...itensDespesas].sort((a, b) => new Date(a.hora) - new Date(b.hora));
                        
                        if (todos.length === 0) return (
                          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                            <Wallet className="w-12 h-12 mx-auto mb-2" />
                            <p>Nenhuma movimentação</p>
                          </div>
                        );

                        return todos.map(item => (
                          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.cor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' : item.cor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                              {item.cor === 'emerald' ? <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : item.cor === 'blue' ? <Minus className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.descricao}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500">{item.tipo} · {item.hora ? format(new Date(item.hora), 'HH:mm') : ''}</div>
                            </div>
                            <div className={`text-base font-bold font-glacial flex-shrink-0 ${item.cor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : item.cor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                              {item.cor === 'emerald' ? '+' : '−'}{formatValor(item.valor)}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}