import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Lock } from 'lucide-react';
import VisualizadorCaixa from '@/components/vendas/caixa/VisualizadorCaixa';

export default function CaixasAtivosPage() {
  const [turnosAtivos, setTurnosAtivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);

  useEffect(() => {
    loadTurnos();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadTurnos = async () => {
    try {
      const [turnos, contas, vendas, movs, despesas] = await Promise.all([
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
        base44.entities.ContasFinanceiras.list(),
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' })
      ]);

      const caixasPDV = contas.filter(c => c.ativo && (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV'));
      
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turno = turnos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turno) {
          const vendasTurno = vendas.filter(v => v.turno_caixa_id === turno.id);
          const totalVendas = vendasTurno.reduce((s, v) => s + (v.valor_total || 0), 0);
          const reforcos = movs.filter(m => m.turno_caixa_id === turno.id && m.tipo === 'Reforço').reduce((s, m) => s + (m.valor || 0), 0);
          const sangrias = movs.filter(m => m.turno_caixa_id === turno.id && (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa')).reduce((s, m) => s + (m.valor || 0), 0);
          const despesasTurno = despesas.filter(d => d.turno_caixa_id === turno.id).reduce((s, d) => s + (d.valor || 0), 0);
          
          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: turno.saldo_inicial || 0,
            totalVendas,
            liquidez: (turno.saldo_inicial || 0) + totalVendas + reforcos - sangrias - despesasTurno
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
                      <ShoppingBag className="w-6 h-6 text-gray-700 dark:text-gray-300" />
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
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Saldo Inicial: {formatValor(liq.saldoInicial)} · Vendas: {formatValor(liq.totalVendas)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}