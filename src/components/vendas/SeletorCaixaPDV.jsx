import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Lock, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { roundToTwoDecimals } from '@/lib/financialUtils';

export default function SeletorCaixaPDV({ open, onSelect, currentUser, onClose }) {
  const navigate = useNavigate();
  const [caixasDisponiveis, setCaixasDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [showSaldoDialog, setShowSaldoDialog] = useState(false);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [descricaoSaldo, setDescricaoSaldo] = useState('');
  const formatValor = (valor) =>
    `R$ ${roundToTwoDecimals(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

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
    if (open && currentUser) {
      loadCaixas();
    }
  }, [open, currentUser]);

  const loadCaixas = async () => {
    try {
      const [todasContas, todosTurnos, todasVendas, todosMovimentos, todasDespesas] = await Promise.all([
        base44.entities.ContasFinanceiras.list(),
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
        base44.entities.PedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa' }),
      ]);

      const caixasPDV = todasContas.filter(c => 
        c.ativo && 
        (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );

      // Recalcular liquidez dinamicamente espelhando a regra do PDVCaixa
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turnoAberto = todosTurnos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turnoAberto) {
          const statusOk = ['Financeiro OK', 'Pedido Concluído', 'Em Separação', 'Em Rota de Entrega'];
          const vendasTurno = todasVendas.filter(v => statusOk.includes(v.status) && v.turno_caixa_id === turnoAberto.id);

          let totalDinheiro = 0;
          let totalPix = 0;
          let totalCredito = 0;
          let totalDebito = 0;
          let totalVale = 0;

          vendasTurno.forEach((venda) => {
            (venda.pagamentos || []).forEach((pag) => {
              const fp = (pag.forma_pagamento || '').toLowerCase();
              if (fp === 'dinheiro') totalDinheiro += pag.valor || 0;
              else if (fp === 'pix') totalPix += pag.valor || 0;
              else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += pag.valor || 0;
              else if (fp.includes('débito') || fp.includes('debito')) totalDebito += pag.valor || 0;
              else if (fp.includes('vale')) totalVale += pag.valor || 0;
            });
          });

          const totalVendasMonetarias = totalDinheiro + totalPix + totalCredito + totalDebito + totalVale;
          const totalVendas = vendasTurno.reduce((sum, v) => sum + (v.valor_total || 0), 0);

          const totalReforcos = todosMovimentos
            .filter(m => m.turno_caixa_id === turnoAberto.id && m.conta_id === caixa.id && m.tipo === 'Reforço')
            .reduce((sum, m) => sum + (m.valor || 0), 0);

          const totalSangrias = todosMovimentos
            .filter(m => m.turno_caixa_id === turnoAberto.id && m.conta_id === caixa.id && (m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa'))
            .reduce((sum, m) => sum + (m.valor || 0), 0);

          const totalDespesas = todasDespesas
            .filter(d => d.turno_caixa_id === turnoAberto.id && d.referencia_tipo !== 'MovimentosCaixa')
            .reduce((sum, d) => sum + (d.valor || 0), 0);

          const saldoInicial = roundToTwoDecimals(turnoAberto.saldo_inicial || 0);
          const liquidezCalculada = roundToTwoDecimals(
            saldoInicial + totalVendasMonetarias + totalReforcos - totalSangrias - totalDespesas
          );
          const dinheiroNaGaveta = roundToTwoDecimals(
            liquidezCalculada - totalPix - totalCredito - totalDebito - totalVale
          );
          
          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: saldoInicial,
            totalVendas: totalVendas,
            liquidez: liquidezCalculada,
            reforcos: roundToTwoDecimals(totalReforcos),
            recolhimentos: roundToTwoDecimals(totalSangrias),
            despesas: roundToTwoDecimals(totalDespesas),
            dinheiroNaGaveta,
          };
        } else {
          liquidez[caixa.id] = { turnoAberto: false };
        }
      });
      setLiquidezPorCaixa(liquidez);

      // Filtrar por permissão — PROTEÇÃO TOTAL
      // Usuário só vê caixas explicitamente autorizados (mesmo admin)
      const caixasAutorizados = currentUser.caixas_pdv_autorizados_ids || currentUser.caixas_vinculados || [];
      
      let caixasFiltrados;
      if (caixasAutorizados.length === 0) {
        // Se não tem nenhum caixa autorizado, não pode operar (proteção)
        caixasFiltrados = [];
      } else {
        // Vê APENAS os caixas autorizados (independente de admin ou não)
        caixasFiltrados = caixasPDV.filter(c => caixasAutorizados.includes(c.id));
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
        <DialogContent className="max-w-2xl dark:bg-gray-900" hideClose>
          <DialogHeader className="relative">
            <button
              onClick={() => onClose ? onClose() : navigate(-1)}
              className="absolute left-0 top-0 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <DialogTitle className="text-xl text-center font-glacial">Selecione o Caixa</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="py-12 text-center text-gray-500">Carregando caixas...</div>
          ) : caixasDisponiveis.length === 0 ? (
            <div className="py-12 text-center">
              <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                Você não tem permissão para acessar nenhum caixa.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Entre em contato com o administrador.
              </p>
              <button
                onClick={() => onClose ? onClose() : navigate(-1)}
                className="mt-6 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all text-left border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial mb-1">
                          {caixa.nome}
                        </h3>
                        {liquidezPorCaixa[caixa.id]?.turnoAberto ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              Turno aberto · Liquidez: {formatValor(liquidezPorCaixa[caixa.id].liquidez)}
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              Dinheiro na gaveta: {formatValor(liquidezPorCaixa[caixa.id].dinheiroNaGaveta)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Saldo Inicial: {formatValor(liquidezPorCaixa[caixa.id].saldoInicial)} · Vendas: {formatValor(liquidezPorCaixa[caixa.id].totalVendas)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Reforços: {formatValor(liquidezPorCaixa[caixa.id].reforcos)} · Recolhimentos: {formatValor(liquidezPorCaixa[caixa.id].recolhimentos)} · Despesas: {formatValor(liquidezPorCaixa[caixa.id].despesas)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Sem turno aberto</p>
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
        </DialogContent>
      </Dialog>

      <Dialog open={showSaldoDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm dark:bg-gray-900 border-0 p-0 shadow-2xl" hideClose>
          <div className="flex flex-col h-full">
            {/* Header com abas */}
            <div className="flex items-center justify-between px-4 pt-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSaldoDialog(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium"
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
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-widest mb-4">
                  VALOR
                </p>

                {/* Display do valor com cursor fino */}
                <div className="relative inline-block">
                  <div className="text-6xl font-bold text-gray-900 dark:text-gray-800 font-mono mb-2 flex items-center justify-center gap-0.5">
                    <span className={saldoInicial ? 'text-gray-900 dark:text-gray-800' : 'text-gray-300 dark:text-gray-600'}>
                      {saldoInicial || '0,00'}
                    </span>
                    <span className="animate-pulse w-0.5 h-16 bg-gray-600 dark:bg-gray-700"></span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">R$</p>
              </div>

              {/* Campo de descrição */}
              <div className="w-full">
                <Input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={descricaoSaldo}
                  onChange={(e) => setDescricaoSaldo(e.target.value)}
                  className="text-center text-gray-500 dark:text-gray-400 border-0 border-b-2 border-gray-200 dark:border-gray-700 rounded-0 bg-transparent focus:ring-0 focus:border-b-2 focus:border-gray-400"
                />
              </div>
            </div>

            {/* Botão Continuar */}
            <div className="px-6 pb-6">
              <Button
                onClick={handleAbrirTurno}
                className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-3xl hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
              >
                <span>Abrir Turno</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}