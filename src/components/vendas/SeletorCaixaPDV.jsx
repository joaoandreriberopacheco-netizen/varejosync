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

  useEffect(() => {
    if (open && currentUser) {
      loadCaixas();
    }
  }, [open, currentUser]);

  const loadCaixas = async () => {
    try {
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixasPDV = todasContas.filter(c => 
        c.ativo && 
        (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );

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
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Saldo: R$ {caixa.saldo_atual.toFixed(2).replace('.', ',')}
                        </p>
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
        <DialogContent className="max-w-md dark:bg-gray-900" hideClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-glacial">Abrir Turno - {caixaSelecionado?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Informe o valor do dinheiro físico que está no caixa para iniciar o turno.
              </p>
            </div>
            
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Saldo Inicial (Fundo de Troco) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="h-14 text-2xl font-bold text-center dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>

            <Button
              onClick={handleAbrirTurno}
              className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900"
            >
              Abrir Turno
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}