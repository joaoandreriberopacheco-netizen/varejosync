import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Banknote, Lock, PackageCheck } from 'lucide-react';
import VisualizadorCaixa from '@/components/vendas/caixa/VisualizadorCaixa';

export default function CaixasAtivosPage() {
  const [turnosAtivos, setTurnosAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [consumosHoje, setConsumosHoje] = useState([]);

  useEffect(() => {
    loadTurnos();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadTurnos = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [turnos, contas, vendas, movs, despesas, fiados, consumos] = await Promise.all([
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
        base44.entities.ContasFinanceiras.list(),
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Receita', forma_pagamento: 'Conta a Pagar' }),
        base44.entities.ConsumoInterno.list('-created_date'),
      ]);

      const consumosDeHoje = consumos.filter(c => {
        const d = new Date(c.created_date);
        return d >= hoje;
      });
      setConsumosHoje(consumosDeHoje);

      const caixasPDV = contas.filter(c => c.ativo && (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV'));
      
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turno = turnos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turno) {
          const vendasTurno = vendas.filter(v => v.turno_caixa_id === turno.id);
          const totalVendas = vendasTurno.reduce((s, v) => s + (v.valor_total || 0), 0);
          let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0, totalVale = 0;
          vendasTurno.forEach(v => {
            (v.pagamentos || []).forEach(p => {
              const fp = (p.forma_pagamento || '').toLowerCase();
              if (fp === 'dinheiro') totalDinheiro += p.valor || 0;
              else if (fp === 'pix') totalPix += p.valor || 0;
              else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += p.valor || 0;
              else if (fp.includes('débito') || fp.includes('debito')) totalDebito += p.valor || 0;
              else if (fp.includes('vale')) totalVale += p.valor || 0;
            });
          });
          const reforcos = movs.filter(m => m.turno_caixa_id === turno.id && m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
          const sangrias = movs.filter(m => m.turno_caixa_id === turno.id && (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa')).reduce((s, m) => s + (m.valor || 0), 0);
          const despesasTurno = despesas.filter(d => d.turno_caixa_id === turno.id && d.referencia_tipo !== 'MovimentosCaixa').reduce((s, d) => s + (d.valor || 0), 0);
          const liquidezTurno = (turno.saldo_inicial || 0) + totalVendas + reforcos - sangrias - despesasTurno;
          const lancamentosFiado = fiados.filter(f => f.turno_caixa_id === turno.id);
          const totalFiado = lancamentosFiado.reduce((s, f) => s + (f.valor || 0), 0);
          const dinheiroNaGaveta = liquidezTurno - totalPix - totalCredito - totalDebito - totalVale - totalFiado;
          
          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: turno.saldo_inicial || 0,
            totalVendas,
            liquidez: liquidezTurno,
            dinheiroNaGaveta,
            totalFiado,
            quantidadeFiado: lancamentosFiado.length,
          };
        }
      });

      setLiquidezPorCaixa(liquidez);
      setTurnosAtivos(turnos);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar turnos:', error);
      setLoading(false);
    }
  };

  const handleSelecionarCaixa = async (turno) => {
    const caixa = await base44.entities.ContasFinanceiras.get(turno.conta_caixa_pdv_id);
    setCaixaSelecionado(caixa);
    setTurnoSelecionado(turno);
  };

  const consumosPorDestinacao = useMemo(() => {
    const map = {};
    consumosHoje.forEach(c => {
      const dest = c.destinacao || 'Sem destinação';
      if (!map[dest]) map[dest] = { total: 0, qtdItens: 0, registros: 0 };
      map[dest].total += c.valor_total || 0;
      map[dest].qtdItens += c.quantidade_total_itens || 0;
      map[dest].registros += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [consumosHoje]);

  const totalConsumoHoje = useMemo(() => consumosHoje.reduce((s, c) => s + (c.valor_total || 0), 0), [consumosHoje]);

  const formatValor = (valor) => {
    const num = valor || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Se já selecionou um caixa, mostra a view completa
  if (turnoSelecionado && caixaSelecionado) {
    return (
      <VisualizadorCaixa
        turnoAtivo={turnoSelecionado}
        caixaSelecionado={caixaSelecionado}
        onVoltar={() => { setTurnoSelecionado(null); setCaixaSelecionado(null); loadTurnos(); }}
      />
    );
  }

  // Tela de seleção de caixa
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-2">Caixas Ativos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visualize o balanço de caixas em operação</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
          </div>
        ) : turnosAtivos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum caixa aberto</h3>
            <p className="text-gray-500 dark:text-gray-400">Não há turnos ativos no momento</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {turnosAtivos.map(turno => {
                const liq = liquidezPorCaixa[turno.conta_caixa_pdv_id];
                return (
                  <button
                    key={turno.id}
                    onClick={() => handleSelecionarCaixa(turno)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial mb-1">
                          {turno.conta_caixa_pdv_nome}
                        </h3>
                        {liq?.turnoAberto && (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              Turno aberto · Liquidez: {formatValor(liq.liquidez)}
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Dinheiro na gaveta: {formatValor(liq.dinheiroNaGaveta)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Saldo Inicial: {formatValor(liq.saldoInicial)} · Vendas: {formatValor(liq.totalVendas)}
                            </p>
                            {(liq.quantidadeFiado || 0) > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Fiado: {formatValor(liq.totalFiado)} · {liq.quantidadeFiado} lançamento{liq.quantidadeFiado > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Relatório de Consumo Interno do Dia */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Consumo Interno — Hoje</h2>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatValor(totalConsumoHoje)}</span>
              </div>
              {consumosPorDestinacao.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum consumo registrado hoje.</p>
              ) : (
                <div className="space-y-2">
                  {consumosPorDestinacao.map(([dest, data]) => (
                    <div key={dest} className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{dest}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{data.registros} registro{data.registros > 1 ? 's' : ''} · {data.qtdItens} item(ns)</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatValor(data.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}