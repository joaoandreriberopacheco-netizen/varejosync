import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronDown, ChevronRight, Lock, TrendingUp, TrendingDown, Wallet, DollarSign, Search, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TurnoRow({ turno, vendas, movimentos, onReabrir, currentUser }) {
  const [expanded, setExpanded] = useState(false);

  const reforcos = movimentos.filter(m => m.tipo === 'Reforço' && m.turno_caixa_id === turno.id);
  const sangrias = movimentos.filter(m => m.tipo === 'Sangria' && m.turno_caixa_id === turno.id);
  const vendasTurno = vendas.filter(v => v.turno_caixa_id === turno.id);

  const duracao = () => {
    if (!turno.data_abertura || !turno.data_fechamento) return '-';
    const diff = new Date(turno.data_fechamento) - new Date(turno.data_abertura);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}min`;
  };

  const diferenca = turno.diferenca || 0;

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      {/* Linha principal */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{turno.numero}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{turno.conta_caixa_pdv_nome}</span>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {turno.data_abertura ? format(new Date(turno.data_abertura), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
            {' → '}
            {turno.data_fechamento ? format(new Date(turno.data_fechamento), "HH:mm", { locale: ptBR }) : '-'}
            {' · '}{duracao()}
            {' · '}{turno.usuario_abertura_nome}
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400 dark:text-gray-500">Total Vendas</div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">R$ {fmt(turno.total_vendas)}</div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs text-gray-400 dark:text-gray-500">Diferença</div>
            <div className={`text-sm font-semibold ${Math.abs(diferenca) < 0.01 ? 'text-gray-400 dark:text-gray-500' : diferenca > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {diferenca > 0 ? '+' : ''}{fmt(diferenca)}
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50/50 dark:bg-gray-800/20">
          {/* Saldos e Movimentação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3 mt-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Saldos do Turno</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Saldo Inicial:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.saldo_inicial || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Vendas:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_vendas || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Reforços:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_reforcos || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">- Sangrias:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.total_sangrias || 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold">
                <span className="text-gray-800 dark:text-gray-200">Saldo do Turno:</span>
                <span className="text-gray-900 dark:text-white font-mono">R$ {fmt(turno.saldo_final || 0)}</span>
              </div>
            </div>
          </div>

          {/* Recebimentos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">RECEBIMENTOS</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dinheiro:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_dinheiro || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">PIX:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_pix || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cartão Débito:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_debito || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cartão Crédito:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt(turno.recebimentos_credito || 0)}</span>
              </div>
            </div>
          </div>

          {/* Movimentos de Caixa */}
          {(reforcos.length > 0 || sangrias.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mb-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Movimentos de Caixa</div>
              <div className="space-y-1">
                {[...reforcos, ...sangrias].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).map(m => (
                  <div key={m.id} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <span className="text-gray-500 dark:text-gray-400">
                      {m.numero} · {format(new Date(m.created_date), 'HH:mm')} · {m.tipo}
                      {m.observacao ? ` · ${m.observacao}` : ''}
                    </span>
                    <span className={`font-semibold tabular-nums ${m.tipo === 'Reforço' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {m.tipo === 'Reforço' ? '+' : '-'}R$ {fmt(m.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendas do turno */}
          {vendasTurno.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Vendas ({vendasTurno.length})</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {vendasTurno.map(v => (
                  <div key={v.id} className="flex justify-between items-start text-xs py-1.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{v.numero}</span>
                      <span className="text-gray-400 dark:text-gray-500"> · {v.cliente_nome}</span>
                      {(v.pagamentos || []).length > 1 && (
                        <div className="mt-0.5 space-y-0.5">
                          {(v.pagamentos || []).map((p, i) => (
                            <div key={i} className="text-gray-400 dark:text-gray-500 pl-2">↳ {p.forma_pagamento} R$ {fmt(p.valor)}</div>
                          ))}
                        </div>
                      )}
                      {(v.pagamentos || []).length === 1 && (
                        <span className="text-gray-400 dark:text-gray-500"> · {v.pagamentos[0].forma_pagamento}</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white tabular-nums ml-3">R$ {fmt(v.valor_total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conferência Final */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">CONFERÊNCIA</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dinheiro na Gaveta:</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">R$ {fmt((turno.recebimentos_dinheiro || 0) + (turno.saldo_inicial || 0) + (turno.total_reforcos || 0) - (turno.total_sangrias || 0))}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-gray-800 dark:text-gray-200">Total Conferido:</span>
                <span className="text-gray-900 dark:text-white font-mono">R$ {fmt(turno.dinheiro_conferido || 0)}</span>
              </div>
              <div className={`flex justify-between font-bold pt-2 border-t border-gray-300 dark:border-gray-600 ${
                Math.abs(diferenca) < 0.01 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : diferenca > 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}>
                <span>Diferença:</span>
                <span className="font-mono">{diferenca >= 0 ? '+' : ''}R$ {fmt(diferenca)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-center">
              <span className="text-gray-400 dark:text-gray-500">Fechado por: </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{turno.usuario_fechamento_nome || '-'}</span>
            </div>

            {/* Botão de Reabertura - Apenas Admin */}
            {currentUser?.role === 'admin' && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Button
                  onClick={() => onReabrir(turno)}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reabrir Turno
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TurnosFechadosPage() {
  const [turnos, setTurnos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [turnoParaReabrir, setTurnoParaReabrir] = useState(null);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    loadData();
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [t, v, m] = await Promise.all([
        base44.entities.TurnoCaixa.filter({ status: 'Fechado' }, '-data_fechamento', 100),
        base44.entities.PedidoVenda.filter({ tipo: 'PDV' }, '-created_date', 500),
        base44.entities.MovimentosCaixa.list('-created_date', 500),
      ]);
      console.log('Turnos carregados:', t);
      console.log('Exemplo de turno:', t[0]);
      setTurnos(t);
      setVendas(v);
      setMovimentos(m);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
    setIsLoading(false);
  };

  const turnosFiltrados = turnos.filter(t => {
    const matchBusca = !busca || 
      (t.numero || '').toLowerCase().includes(busca.toLowerCase()) ||
      (t.conta_caixa_pdv_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      (t.usuario_abertura_nome || '').toLowerCase().includes(busca.toLowerCase());
    const matchData = !filtroData || (t.data_abertura || '').startsWith(filtroData);
    return matchBusca && matchData;
  });

  const totalVendasFiltrado = turnosFiltrados.reduce((s, t) => s + (t.total_vendas || 0), 0);
  const totalDiferencas = turnosFiltrados.reduce((s, t) => s + (t.diferenca || 0), 0);

  const handleReabrirTurno = async (turno) => {
    setTurnoParaReabrir(turno);
  };

  const confirmarReabertura = async () => {
    if (!turnoParaReabrir) return;
    
    setReabrindo(true);
    try {
      // Verificar se existe outro turno aberto para o mesmo caixa
      const turnosAbertos = await base44.entities.TurnoCaixa.filter({ 
        conta_caixa_pdv_id: turnoParaReabrir.conta_caixa_pdv_id,
        status: 'Aberto'
      });

      if (turnosAbertos.length > 0) {
        toast.error('Reabertura bloqueada', {
          description: `Existe outro turno aberto (${turnosAbertos[0].numero}) neste caixa. Feche-o antes de reabrir este turno.`,
          duration: 5000
        });
        setReabrindo(false);
        setTurnoParaReabrir(null);
        return;
      }

      // Buscar contas financeiras para reverter transferência
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixaPDV = todasContas.find(c => c.id === turnoParaReabrir.conta_caixa_pdv_id);
      const caixaGeral = todasContas.find(c => c.is_caixa_geral === true);

      const dinheiroConferido = turnoParaReabrir.dinheiro_conferido || 0;

      // Reverter transferência do fechamento (se houve)
      if (caixaPDV && caixaGeral && dinheiroConferido > 0) {
        // Devolver dinheiro do Caixa Geral para o Caixa PDV
        await base44.entities.ContasFinanceiras.update(caixaPDV.id, {
          saldo_atual: caixaPDV.saldo_atual + dinheiroConferido
        });
        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
          saldo_atual: caixaGeral.saldo_atual - dinheiroConferido
        });

        // Registrar movimento de estorno
        await base44.entities.MovimentosCaixa.create({
          numero: `MCX-ESTORNO-${String(Date.now()).slice(-5)}`,
          tipo: 'Reforço',
          valor: dinheiroConferido,
          observacao: `Estorno de fechamento - Reabertura do turno ${turnoParaReabrir.numero}`,
          conta_id: caixaPDV.id,
          turno_caixa_id: turnoParaReabrir.id,
          usuario_responsavel_id: currentUser?.id,
          usuario_responsavel_nome: currentUser?.full_name
        });
      }

      // Reabrir o turno
      await base44.entities.TurnoCaixa.update(turnoParaReabrir.id, {
        status: 'Aberto',
        data_fechamento: null,
        usuario_fechamento_id: null,
        usuario_fechamento_nome: null
      });

      toast.success('Turno reaberto com sucesso!', {
        description: `O turno ${turnoParaReabrir.numero} foi reaberto e está pronto para uso.`,
      });

      loadData();
    } catch (error) {
      console.error('Erro ao reabrir turno:', error);
      toast.error('Erro ao reabrir turno', {
        description: error.message
      });
    } finally {
      setReabrindo(false);
      setTurnoParaReabrir(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              Turnos Fechados
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Auditoria de caixa por turno</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar turno, caixa ou operador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            type="date"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
            className="w-44"
          />
        </div>

        {/* KPIs rápidos */}
        {!isLoading && turnosFiltrados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
                <Lock className="w-3.5 h-3.5" />
                Turnos
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{turnosFiltrados.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Total Vendas
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">R$ {fmt(totalVendasFiltrado)}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                Saldo Final Total
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                R$ {fmt(turnosFiltrados.reduce((s, t) => s + (t.saldo_final || 0), 0))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1">
                {Math.abs(totalDiferencas) < 0.01 ? <DollarSign className="w-3.5 h-3.5" /> : totalDiferencas > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                Diferença Total
              </div>
              <div className={`text-2xl font-bold font-glacial ${Math.abs(totalDiferencas) < 0.01 ? 'text-gray-400 dark:text-gray-500' : totalDiferencas > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {totalDiferencas > 0 ? '+' : ''}R$ {fmt(totalDiferencas)}
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum turno fechado encontrado</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
            {turnosFiltrados.map(t => (
              <TurnoRow key={t.id} turno={t} vendas={vendas} movimentos={movimentos} onReabrir={handleReabrirTurno} currentUser={currentUser} />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Confirmação de Reabertura */}
      <AlertDialog open={!!turnoParaReabrir} onOpenChange={(open) => !open && setTurnoParaReabrir(null)}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
              Confirmar Reabertura de Turno
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Você está prestes a reabrir o turno <strong className="text-gray-900 dark:text-white">{turnoParaReabrir?.numero}</strong>.
              <br/><br/>
              Esta operação irá:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Alterar o status do turno de "Fechado" para "Aberto"</li>
                <li>Reverter a transferência de R$ {fmt(turnoParaReabrir?.dinheiro_conferido || 0)} do Caixa Geral de volta para o caixa PDV</li>
                <li>Limpar os dados de fechamento (data, usuário)</li>
                <li>Permitir novas vendas e movimentações neste turno</li>
              </ul>
              <br/>
              <strong className="text-amber-600 dark:text-amber-400">Atenção:</strong> Só é possível reabrir um turno se não houver outro turno aberto no mesmo caixa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reabrindo} className="dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarReabertura}
              disabled={reabrindo}
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {reabrindo ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reabrindo...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Confirmar Reabertura
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}