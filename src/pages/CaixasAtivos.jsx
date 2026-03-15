import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Eye, TrendingUp, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
      let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0;
      
      vendas.forEach(v => {
        if (v.pagamentos) {
          v.pagamentos.forEach(p => {
            const fp = (p.forma_pagamento || '').toLowerCase();
            if (fp === 'dinheiro') totalDinheiro += p.valor || 0;
            else if (fp === 'pix') totalPix += p.valor || 0;
            else if (fp.includes('crédito')) totalCredito += p.valor || 0;
            else if (fp.includes('débito')) totalDebito += p.valor || 0;
          });
        }
      });

      const totalReforcos = movimentos.filter(m => m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
      const totalSangrias = movimentos.filter(m => m.tipo === 'Sangria').reduce((s, m) => s + (m.valor || 0), 0);
      const totalDespesas = despesas.reduce((s, d) => s + (d.valor || 0), 0);

      const saldoInicial = turno.saldo_inicial || 0;
      const saldoCaixa = saldoInicial + totalDinheiro + totalReforcos - totalSangrias - totalDespesas;
      const liquidez = saldoInicial + totalVendas + totalReforcos - totalSangrias - totalDespesas;

      setDetalhes({
        vendas: vendas.length,
        totalVendas,
        saldoCaixa,
        liquidez,
        recebimentos: { dinheiro: totalDinheiro, pix: totalPix, credito: totalCredito, debito: totalDebito },
        reforcos: totalReforcos,
        sangrias: totalSangrias,
        despesas: totalDespesas,
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

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedTurno} onOpenChange={() => { setSelectedTurno(null); setDetalhes(null); }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-none">
          {selectedTurno && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial">
                  {selectedTurno.conta_caixa_pdv_nome}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Turno {selectedTurno.numero} · {selectedTurno.usuario_abertura_nome}
                </p>
              </div>

              {detalhes ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Liquidez Total</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                        {formatValor(detalhes.liquidez)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dinheiro em Caixa</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                        {formatValor(detalhes.saldoCaixa)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Movimentações
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Vendas</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {detalhes.vendas} · {formatValor(detalhes.totalVendas)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Reforços</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          +{formatValor(detalhes.reforcos)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Recolhimentos</span>
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          -{formatValor(detalhes.sangrias)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          -{formatValor(detalhes.despesas)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Recebimentos
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dinheiro</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatValor(detalhes.recebimentos.dinheiro)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">PIX</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatValor(detalhes.recebimentos.pix)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Crédito</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatValor(detalhes.recebimentos.credito)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Débito</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatValor(detalhes.recebimentos.debito)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
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