import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Banknote, Lock, RefreshCw, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import VisualizadorCaixa from '@/components/vendas/caixa/VisualizadorCaixa';
import { runOperacaoAuthBypass } from '@/components/auth/runOperacaoAuthBypass';
import { P38MobileLine, P38MobileLineList, P38StatusLabel } from '@/components/ui/p38-mobile-line';

const formatValor = (valor) => {
  const num = valor || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TurnosFechadosPage() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [turnoSelecionado, setTurnoSelecionado] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    loadData();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const turnosFechados = await base44.entities.TurnoCaixa.filter(
        { status: 'Fechado' },
        '-data_fechamento',
        100
      );
      setTurnos(turnosFechados);
    } catch (error) {
      console.error('Erro ao carregar turnos fechados:', error);
      toast.error('Não foi possível carregar os turnos fechados');
    }
    setLoading(false);
  };

  const turnosFiltrados = turnos.filter((t) => {
    const termo = busca.trim().toLowerCase();
    const matchBusca =
      !termo ||
      (t.numero || '').toLowerCase().includes(termo) ||
      (t.conta_caixa_pdv_nome || '').toLowerCase().includes(termo) ||
      (t.usuario_abertura_nome || '').toLowerCase().includes(termo) ||
      (t.usuario_fechamento_nome || '').toLowerCase().includes(termo);
    const matchData = !filtroData || (t.data_abertura || '').startsWith(filtroData);
    return matchBusca && matchData;
  });

  const handleSelecionarTurno = async (turno) => {
    try {
      const caixa = await base44.entities.ContasFinanceiras.get(turno.conta_caixa_pdv_id);
      setCaixaSelecionado(caixa);
      setTurnoSelecionado(turno);
    } catch (error) {
      console.error('Erro ao abrir turno:', error);
      toast.error('Não foi possível abrir o turno selecionado');
    }
  };

  const handleReabrirTurno = async (turno) => {
    void runOperacaoAuthBypass((authData) => executarReabertura(authData, turno));
  };

  const executarReabertura = async (authData, turno) => {
    setReabrindo(true);
    try {
      const turnosAbertos = await base44.entities.TurnoCaixa.filter({
        conta_caixa_pdv_id: turno.conta_caixa_pdv_id,
        status: 'Aberto',
      });

      if (turnosAbertos.length > 0) {
        toast.error('Reabertura bloqueada', {
          description: `Existe outro turno aberto (${turnosAbertos[0].numero}) neste caixa. Feche-o antes de reabrir este turno.`,
          duration: 5000,
        });
        return;
      }

      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixaPDV = todasContas.find((c) => c.id === turno.conta_caixa_pdv_id);
      const caixaGeral = todasContas.find((c) => c.is_caixa_geral === true);
      const dinheiroConferido = turno.dinheiro_conferido || 0;

      if (caixaPDV && caixaGeral && dinheiroConferido > 0) {
        await base44.entities.ContasFinanceiras.update(caixaPDV.id, {
          saldo_atual: caixaPDV.saldo_atual + dinheiroConferido,
        });
        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
          saldo_atual: caixaGeral.saldo_atual - dinheiroConferido,
        });

        await base44.entities.MovimentosCaixa.create({
          numero: `MCX-ESTORNO-${String(Date.now()).slice(-5)}`,
          tipo: 'Reforço',
          valor: dinheiroConferido,
          observacao: `Estorno de fechamento - Reabertura do turno ${turno.numero}`,
          conta_id: caixaPDV.id,
          turno_caixa_id: turno.id,
          usuario_responsavel_id: currentUser?.id,
          usuario_responsavel_nome: currentUser?.full_name,
        });
      }

      await base44.entities.TurnoCaixa.update(turno.id, {
        status: 'Aberto',
        data_fechamento: null,
        usuario_fechamento_id: null,
        usuario_fechamento_nome: null,
        observacoes:
          (turno.observacoes || '') +
          `\n[REABERTURA] ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - Autorizado por ${authData.intervenienteName} (${authData.operationCode})`,
      });

      toast.success('Turno reaberto com sucesso!', {
        description: `Turno ${turno.numero} reaberto. Autorizado por: ${authData.intervenienteName}`,
      });

      setTurnoSelecionado(null);
      setCaixaSelecionado(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao reabrir turno:', error);
      toast.error('Erro ao reabrir turno', { description: error.message });
    } finally {
      setReabrindo(false);
    }
  };

  if (turnoSelecionado && caixaSelecionado) {
    return (
      <VisualizadorCaixa
        turnoAtivo={turnoSelecionado}
        caixaSelecionado={caixaSelecionado}
        modoFechado
        onVoltar={() => {
          setTurnoSelecionado(null);
          setCaixaSelecionado(null);
          loadData();
        }}
        onSolicitarReabertura={() => handleReabrirTurno(turnoSelecionado)}
        reabrindo={reabrindo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-2 flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-400" />
              Turnos Fechados
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulte o balanço e a conferência de turnos encerrados
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            style={{ minWidth: '48px', minHeight: '48px' }}
            aria-label="Atualizar lista"
          >
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar turno, caixa ou operador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-white dark:bg-gray-800"
            />
          </div>
          <Input
            type="date"
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="w-full sm:w-44 bg-white dark:bg-gray-800"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum turno fechado</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {busca || filtroData ? 'Ajuste os filtros para ver outros resultados' : 'Não há turnos encerrados no momento'}
            </p>
          </div>
        ) : (
          <>
            <P38MobileLineList className="md:hidden">
              {turnosFiltrados.map((turno, index) => {
                const diferenca = turno.diferenca || 0;
                const diffOk = Math.abs(diferenca) < 0.01;
                return (
                  <P38MobileLine
                    key={turno.id}
                    striped={index % 2 === 1}
                    accent={diffOk ? 'muted' : diferenca > 0 ? 'success' : 'danger'}
                    onClick={() => handleSelecionarTurno(turno)}
                    title={turno.conta_caixa_pdv_nome || turno.numero}
                    subtitle={`${turno.numero} · ${turno.usuario_abertura_nome || '—'}`}
                    meta={
                      <>
                        <P38StatusLabel tone="muted">Fechado</P38StatusLabel>
                        <span>
                          {turno.data_fechamento
                            ? format(new Date(turno.data_fechamento), 'dd/MM HH:mm', { locale: ptBR })
                            : '—'}
                        </span>
                      </>
                    }
                    value={formatValor(turno.total_vendas)}
                    valueSub="vendas"
                  />
                );
              })}
            </P38MobileLineList>

            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3">
              {turnosFiltrados.map((turno) => {
                const diferenca = turno.diferenca || 0;
                const diffOk = Math.abs(diferenca) < 0.01;
                return (
                  <button
                    key={turno.id}
                    type="button"
                    onClick={() => handleSelecionarTurno(turno)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Banknote className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial mb-1">
                          {turno.conta_caixa_pdv_nome || 'Caixa'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {turno.numero} · {turno.usuario_abertura_nome || '—'}
                        </p>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                          Vendas: {formatValor(turno.total_vendas)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Fechado{' '}
                          {turno.data_fechamento
                            ? format(new Date(turno.data_fechamento), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : '—'}
                          {turno.usuario_fechamento_nome ? ` · ${turno.usuario_fechamento_nome}` : ''}
                        </p>
                        <p
                          className={`text-xs font-medium mt-1 ${
                            diffOk
                              ? 'text-gray-400'
                              : diferenca > 0
                                ? 'text-[#4A5D23] dark:text-[#a4ce33]'
                                : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          Diferença: {diferenca > 0 ? '+' : ''}
                          {diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
