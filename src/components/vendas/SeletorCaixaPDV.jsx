import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Lock } from 'lucide-react';

export default function SeletorCaixaPDV({ open, onSelect, currentUser }) {
  const [caixasDisponiveis, setCaixasDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [showSaldoDialog, setShowSaldoDialog] = useState(false);
  const [liquidezPorCaixa, setLiquidezPorCaixa] = useState({});
  const [descricaoSaldo, setDescricaoSaldo] = useState('');

  useEffect(() => {
    if (open && currentUser) {
      loadCaixas();
    }
  }, [open, currentUser]);

  const loadCaixas = async () => {
    try {
      const [todasContas, todosTurnos] = await Promise.all([
        base44.entities.ContasFinanceiras.list(),
        base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
      ]);

      const caixasPDV = todasContas.filter(c => 
        c.ativo && 
        (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );

      // SELO FRIO: o seletor confia nos dados do turno — não recalcula nada.
      // Os totais corretos já estão gravados no TurnoCaixa pelo PDVCaixa.
      const liquidez = {};
      caixasPDV.forEach(caixa => {
        const turnoAberto = todosTurnos.find(t => t.conta_caixa_pdv_id === caixa.id);
        if (turnoAberto) {
          liquidez[caixa.id] = {
            turnoAberto: true,
            saldoInicial: turnoAberto.saldo_inicial || 0,
            totalVendas: turnoAberto.total_vendas || 0,
            liquidez: (turnoAberto.saldo_inicial || 0) + (turnoAberto.total_vendas || 0) + (turnoAberto.total_reforcos || 0) - (turnoAberto.total_sangrias || 0) - (turnoAberto.total_despesas || 0),
          };
        } else {
          liquidez[caixa.id] = { turnoAberto: false };
        }
      });
      setLiquidezPorCaixa(liquidez);

      // Filtrar por permissão
      // O campo correto é caixas_pdv_autorizados_ids (salvo pelo ListaUsuariosApp)
      const caixasAutorizados = currentUser.caixas_pdv_autorizados_ids || currentUser.caixas_vinculados || [];
      let caixasFiltrados;
      if (currentUser.role === 'admin') {
        // Admin vê todos
        caixasFiltrados = caixasPDV;
      } else if (caixasAutorizados.length === 0) {
        // Se nenhum caixa vinculado, vê todos (sem restrição)
        caixasFiltrados = caixasPDV;
      } else {
        // Vê apenas os vinculados
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

    const saldoFloat = parseFloat(saldoInicial.replace(',', '.'));
    
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
      if (Math.abs(caixaSelecionado.saldo_atual - saldoFloat) > 0.01) {
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
          <DialogHeader>
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
                              Turno aberto · Liquidez: R$ {(liquidezPorCaixa[caixa.id].liquidez || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Fundo: R$ {(liquidezPorCaixa[caixa.id].saldoInicial || 0).toFixed(2).replace('.', ',')} · Vendas: R$ {(liquidezPorCaixa[caixa.id].totalVendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* Conteúdo principal */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-8">
              {/* Label VALOR */}
              <div className="text-center">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 tracking-widest mb-2">
                  VALOR
                </p>
                
                {/* Display grande do valor */}
                <div className="text-6xl font-bold text-gray-200 dark:text-gray-700 font-mono mb-1">
                  {saldoInicial || '0,00'}
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">R$</p>
              </div>

              {/* Input invisível mas funcional */}
              <input
                type="text"
                inputMode="decimal"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="absolute opacity-0 w-0 h-0"
                autoFocus
              />

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