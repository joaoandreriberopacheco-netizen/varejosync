import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CaixaDialogContent } from '@/components/vendas/caixa/CaixaDialogContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Lock, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { buildPedidoIdsReceitasTurno, isPedidoVendaNoTurnoCaixa } from '@/lib/pdvCaixaTurnoVendas';
import { buildSubstituicoesVendaCaixa } from '@/lib/substituicoesVendaCaixa';
import { getCachedUserSession } from '@/lib/userSessionCache';

function normalizeCaixaId(id) {
  return String(id ?? '').trim();
}

function isCaixaAutorizado(caixaId, autorizados = []) {
  const key = normalizeCaixaId(caixaId);
  return autorizados.some((id) => normalizeCaixaId(id) === key);
}

export default function SeletorCaixaPDV({ open, onSelect, currentUser, onClose }) {
  const navigate = useNavigate();
  const [caixasDisponiveis, setCaixasDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [showSaldoDialog, setShowSaldoDialog] = useState(false);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [descricaoSaldo, setDescricaoSaldo] = useState('');

  const handleSaldoChange = (e) => {
    let numbers = e.target.value.replace(/\D/g, '');
    if (numbers.length > 10) numbers = numbers.slice(0, 10);
    
    if (!numbers) {
      setSaldoInicial('');
      return;
    }
    
    // Se tem menos de 3 dígitos, padroniza para mostrar centavos
    const fullNumber = numbers.padStart(3, '0');
    const integerPart = fullNumber.slice(0, -2).replace(/^0+/, '') || '0';
    const decimalPart = fullNumber.slice(-2);
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setSaldoInicial(`${formatted},${decimalPart}`);
  };

  useEffect(() => {
    if (!open) return;
    loadCaixas();
  }, [open, currentUser]);

  const loadCaixas = async () => {
    setLoading(true);
    try {
      let user = currentUser;
      if (!user) {
        user = getCachedUserSession()?.user ?? null;
      }
      if (!user) {
        user = await base44.auth.me().catch(() => null);
      }
      if (!user) {
        setCaixasDisponiveis([]);
        return;
      }
      const [todasContas, todosTurnos, todasVendas, todosMovimentos, todasDespesas, todosVales, todasDevolucoes] = await Promise.all([
        base44.entities.ContasFinanceiras.list(),
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }),
        base44.entities.ValeCompra.list(),
        base44.entities.DevolucaoTroca.list(),
      ]);

      const receitasByTurnoId = {};
      await Promise.all(
        todosTurnos.map(async (t) => {
          const rec = await base44.entities.LancamentoFinanceiro.filter({
            turno_caixa_id: t.id,
            tipo: 'Receita',
          });
          receitasByTurnoId[t.id] = rec;
        })
      );

      const caixasPDV = todasContas.filter(c => 
        c.ativo && 
        (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );

      // Recalcular liquidez dinamicamente com dados reais
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turnoAberto = todosTurnos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turnoAberto) {
          const pedidoIdsReceita = buildPedidoIdsReceitasTurno(receitasByTurnoId[turnoAberto.id] || []);
          const vendasTurno = todasVendas.filter((v) =>
            isPedidoVendaNoTurnoCaixa(v, {
              turno: turnoAberto,
              caixa,
              pedidoIdsDasReceitasDoTurno: pedidoIdsReceita,
              incluirRetrocompatSemTurno: !turnoAberto.data_fechamento,
            })
          );
          const subCtx = buildSubstituicoesVendaCaixa({
            vendas: vendasTurno,
            vales: todosVales,
            devolucoes: todasDevolucoes,
          });
          const totalVendas = subCtx.totalVendasUtil;
          
          // Somar reforços
          const reforcos = todosMovimentos.filter(m => m.turno_caixa_id === turnoAberto.id && m.tipo === 'Reforço');
          const totalReforcos = reforcos.reduce((sum, m) => sum + (m.valor || 0), 0);
          
          // Somar recolhimentos/sangrias
          const sangrias = todosMovimentos.filter(m => m.turno_caixa_id === turnoAberto.id && (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa'));
          const totalSangrias = sangrias.reduce((sum, m) => sum + (m.valor || 0), 0);
          
          // Somar despesas
          const despesas = todasDespesas.filter(d => d.turno_caixa_id === turnoAberto.id);
          const totalDespesas = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);
          
          const saldoInicial = turnoAberto.saldo_inicial || 0;
          const liquidezCalculada = saldoInicial + totalVendas + totalReforcos - totalSangrias - totalDespesas;
          
          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: saldoInicial,
            totalVendas: totalVendas,
            liquidez: liquidezCalculada,
          };
        } else {
          liquidez[caixa.id] = { turnoAberto: false };
        }
      });
      setLiquidezPorCaixa(liquidez);

      // Filtrar por permissão — PROTEÇÃO TOTAL
      // Usuário só vê caixas explicitamente autorizados (mesmo admin)
      const caixasAutorizados = user.caixas_pdv_autorizados_ids || user.caixas_vinculados || [];
      
      let caixasFiltrados;
      if (caixasAutorizados.length === 0) {
        // Se não tem nenhum caixa autorizado, não pode operar (proteção)
        caixasFiltrados = [];
      } else {
        // Vê APENAS os caixas autorizados (independente de admin ou não)
        caixasFiltrados = caixasPDV.filter((c) => isCaixaAutorizado(c.id, caixasAutorizados));
      }

      setCaixasDisponiveis(caixasFiltrados);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
      setLoading(false);
    }
  };

  const handleSelecionarCaixa = async (caixa) => {

    // Verificar se já existe turno aberto
    const todosTurnos = await base44.entities.TurnoCaixa.list();
    const turnoAberto = todosTurnos.find(t => 
      t.status === 'Aberto' && 
      t.conta_caixa_pdv_id === caixa.id
    );

    if (turnoAberto) {
      // Turno já existe, apenas conectar
      onSelect(caixa, turnoAberto, false);
    } else {
      // Precisa abrir novo turno — saldo inicial começa sempre em 0 (operador informa o fundo de troco)
      setCaixaSelecionado(caixa);
      setSaldoInicial('');
      setDescricaoSaldo('');
      setShowSaldoDialog(true);
    }
  };

  const handleAbrirTurno = async () => {
    if (!saldoInicial || parseFloat(saldoInicial.replace(',', '.')) < 0) {
      alert('Informe um saldo inicial válido.');
      return;
    }

    const saldoFloat = roundToTwoDecimals(parseFloat(saldoInicial.replace(',', '.')) || 0);
    
    try {
      const todosTurnos = await base44.entities.TurnoCaixa.list();
      const numeroTurno = `TC-${String((todosTurnos.length || 0) + 1).padStart(5, '0')}`;
      
      const novoTurno = await base44.entities.TurnoCaixa.create({
        numero: numeroTurno,
        conta_caixa_pdv_id: caixaSelecionado.id,
        conta_caixa_pdv_nome: caixaSelecionado.nome,
        usuario_abertura_id: currentUser.id,
        usuario_abertura_nome: currentUser.full_name,
        data_abertura: new Date().toISOString(),
        saldo_inicial: saldoFloat,
        status: 'Aberto',
        vendas_ids: [],
        movimentos_ids: [],
        despesas_ids: []
      });

      // Atualizar saldo da conta se diferente
      if (Math.abs(roundToTwoDecimals(caixaSelecionado.saldo_atual - saldoFloat)) > 0.01) {
        await base44.entities.ContasFinanceiras.update(caixaSelecionado.id, {
          saldo_atual: saldoFloat
        });
      }

      onSelect(caixaSelecionado, novoTurno, false);
      setShowSaldoDialog(false);
    } catch (error) {
      console.error('Erro ao abrir turno:', error);
      alert('Erro ao abrir turno: ' + error.message);
    }
  };

  return (
    <>
      <Dialog open={open && !showSaldoDialog} onOpenChange={() => {}}>
        <CaixaDialogContent className="max-w-2xl dark:bg-background" hideClose>
          <DialogHeader className="relative">
            <button
              onClick={() => onClose ? onClose() : navigate(-1)}
              className="absolute left-0 top-0 p-1.5 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <DialogTitle className="text-xl text-center font-glacial">Selecione o Caixa</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Carregando caixas...</div>
          ) : caixasDisponiveis.length === 0 ? (
            <div className="py-12 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Você não tem permissão para acessar nenhum caixa.
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2">
                Entre em contato com o administrador.
              </p>
              <button
                onClick={() => onClose ? onClose() : navigate(-1)}
                className="mt-6 px-6 py-2.5 bg-muted text-foreground/90 rounded-2xl text-sm font-medium hover:bg-muted dark:hover:bg-primary/90 transition-colors"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {caixasDisponiveis.map(caixa => {
                const podeOperar = true;
                
                return (
                  <button
                    key={caixa.id}
                    onClick={() => handleSelecionarCaixa(caixa)}
                    className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-border/40 dark:hover:border-border/40"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-6 h-6 text-foreground/90" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground font-glacial mb-1">
                          {caixa.nome}
                        </h3>
                        {liquidezPorCaixa[caixa.id]?.turnoAberto ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-primary">
                              Turno aberto · Liquidez: R$ {(liquidezPorCaixa[caixa.id].liquidez || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Saldo Inicial: R$ {(liquidezPorCaixa[caixa.id].saldoInicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Vendas: R$ {(liquidezPorCaixa[caixa.id].totalVendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem turno aberto</p>
                        )}
                        {!podeOperar && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <Lock className="w-3 h-3" />
                            <span>Somente visualização</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CaixaDialogContent>
      </Dialog>

      <Dialog open={showSaldoDialog} onOpenChange={() => {}}>
        <CaixaDialogContent
          className="max-w-sm dark:bg-background border-0 p-0 shadow-2xl"
          hideClose
        >
          <div className="flex flex-col h-full">
            {/* Header com abas */}
            <div className="flex items-center justify-between px-4 pt-4 border-b border-border/40">
              <button
                onClick={() => setShowSaldoDialog(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-muted text-foreground/90 rounded-full text-sm font-medium"
                >
                  Abertura
                </button>
              </div>
              
              <div className="w-6" />
            </div>

            {/* Input invisível para capturar teclado */}
            <input autoComplete="off"
              type="text"
              inputMode="decimal"
              value={saldoInicial}
              onChange={handleSaldoChange}
              className="absolute opacity-0 w-0 h-0 -z-10"
              autoFocus
            />

            {/* Conteúdo principal */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-8">
              {/* Label VALOR */}
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground tracking-widest mb-4">
                  VALOR
                </p>

                {/* Display do valor com cursor fino */}
                <div className="relative inline-block">
                  <div className="text-6xl font-bold text-foreground dark:text-foreground font-mono mb-2 flex items-center justify-center gap-0.5">
                    <span className={saldoInicial ? 'text-foreground dark:text-foreground' : 'text-muted-foreground dark:text-muted-foreground'}>
                      {saldoInicial || '0,00'}
                    </span>
                    <span className="animate-pulse w-0.5 h-16 bg-muted dark:bg-muted"></span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">R$</p>
              </div>

              {/* Campo de descrição */}
              <div className="w-full">
                <Input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={descricaoSaldo}
                  onChange={(e) => setDescricaoSaldo(e.target.value)}
                  className="text-center text-muted-foreground border-0 border-b-2 border-border/40 rounded-0 bg-transparent focus:ring-0 focus:border-b-2 focus:border-border/40"
                />
              </div>
            </div>

            {/* Botão Continuar */}
            <div className="px-6 pb-6">
              <Button
                onClick={handleAbrirTurno}
                className="w-full h-14 bg-background dark:bg-card text-white dark:text-foreground font-semibold rounded-3xl hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
              >
                <span>Abrir Turno</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CaixaDialogContent>
      </Dialog>
    </>
  );
}