import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function GestaoCaixa() {
  const [fluxoCaixa, setFluxoCaixa] = useState({
    vendas: 0,
    sangrias: 0,
    reforcos: 0,
    saldo: 0
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState('');
  const [movimentoData, setMovimentoData] = useState({
    valor: 0,
    observacao: '',
    conta_id: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [contas, setContas] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);

    const contasData = await base44.entities.ContasFinanceiras.list();
    setContas(contasData);

    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    // Buscar vendas do dia
    const todasVendas = await base44.entities.PedidoVenda.list();
    const vendasDia = todasVendas.filter(v => 
      v.status === 'Finalizado' && 
      new Date(v.created_date) >= inicioDia
    );
    const totalVendas = vendasDia.reduce((acc, v) => acc + (v.valor_total || 0), 0);

    // Buscar movimentos de caixa do dia
    const todosMovimentos = await base44.entities.MovimentosCaixa.list();
    const movimentosDia = todosMovimentos.filter(m => 
      new Date(m.created_date) >= inicioDia
    );

    const totalSangrias = movimentosDia
      .filter(m => m.tipo === 'Sangria')
      .reduce((acc, m) => acc + (m.valor || 0), 0);

    const totalReforcos = movimentosDia
      .filter(m => m.tipo === 'Reforço')
      .reduce((acc, m) => acc + (m.valor || 0), 0);

    const saldoDia = totalVendas + totalReforcos - totalSangrias;

    setFluxoCaixa({
      vendas: totalVendas,
      sangrias: totalSangrias,
      reforcos: totalReforcos,
      saldo: saldoDia
    });
  };

  const handleAbrirDialog = async (tipo) => {
    setTipoMovimento(tipo);
    // Recarrega contas sempre que abre o dialog para garantir lista atualizada
    const contasData = await base44.entities.ContasFinanceiras.filter({ ativo: true });
    setContas(contasData);
    // Pré-seleciona a conta Caixa Geral se existir
    const caixaGeral = contasData.find(c => c.is_caixa_geral);
    setMovimentoData({ valor: 0, observacao: '', conta_id: caixaGeral?.id || '' });
    setIsDialogOpen(true);
  };

  const handleRegistrarMovimento = async () => {
    if (!movimentoData.conta_id) {
      alert('Selecione uma conta financeira');
      return;
    }

    if (movimentoData.valor <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    // Gerar número sequencial
    const todosMovimentos = await base44.entities.MovimentosCaixa.list();
    const proximoNumero = todosMovimentos.length + 1;
    const numeroFormatado = `MCX-${String(proximoNumero).padStart(5, '0')}`;

    // Criar movimento
    await base44.entities.MovimentosCaixa.create({
      numero: numeroFormatado,
      tipo: tipoMovimento,
      valor: movimentoData.valor,
      observacao: movimentoData.observacao,
      conta_id: movimentoData.conta_id,
      usuario_responsavel_id: currentUser.id,
      usuario_responsavel_nome: currentUser.full_name
    });

    // Atualizar saldo da conta
    const conta = contas.find(c => c.id === movimentoData.conta_id);
    if (conta) {
      const novoSaldo = tipoMovimento === 'Reforço'
        ? (conta.saldo_atual || 0) + movimentoData.valor
        : (conta.saldo_atual || 0) - movimentoData.valor;

      await base44.entities.ContasFinanceiras.update(conta.id, {
        saldo_atual: novoSaldo
      });
    }

    setIsDialogOpen(false);
    loadData();
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Caixa do Dia - SEM CORES, SEM CARDS */}
      <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <h3 className="text-base font-normal text-gray-800 dark:text-gray-200">Caixa do Dia (09/11/2025)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Resumo das movimentações de hoje</p>
        </div>

        <div className="grid grid-cols-4 gap-8">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total em Vendas</div>
            <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(fluxoCaixa.vendas)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Reforços</div>
            <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(fluxoCaixa.reforcos)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total de Sangrias</div>
            <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(fluxoCaixa.sangrias)}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Atual do Caixa</div>
            <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(fluxoCaixa.saldo)}</div>
          </div>
        </div>
      </div>

      {/* Botões de Ação - SEM CORES */}
      <div className="flex gap-4">
        <Button 
          onClick={() => handleAbrirDialog('Sangria')}
          className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          Registrar Sangria
        </Button>
        <Button 
          onClick={() => handleAbrirDialog('Reforço')}
          className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500"
        >
          Registrar Reforço
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              Registrar {tipoMovimento}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Valor</Label>
              <Input 
                type="number"
                step="0.01"
                value={movimentoData.valor}
                onChange={e => setMovimentoData({...movimentoData, valor: parseFloat(e.target.value) || 0})}
                placeholder="0,00"
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Conta Financeira</Label>
              <Select 
                value={movimentoData.conta_id} 
                onValueChange={v => setMovimentoData({...movimentoData, conta_id: v})}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Observação</Label>
              <Textarea 
                value={movimentoData.observacao}
                onChange={e => setMovimentoData({...movimentoData, observacao: e.target.value})}
                placeholder="Motivo do movimento..."
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={handleRegistrarMovimento} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}