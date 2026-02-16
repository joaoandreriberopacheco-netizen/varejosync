import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function ExtratoContaPage() {
  const [conta, setConta] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [movimentosCaixa, setMovimentosCaixa] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFAB, setShowFAB] = useState(false);
  const [dialogType, setDialogType] = useState(null);
  const [filtroData, setFiltroData] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formLancamento, setFormLancamento] = useState({
    tipo: 'Receita',
    descricao: '',
    valor: 0,
    categoria: 'Outros',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    status: 'Pago'
  });

  const [formTransferencia, setFormTransferencia] = useState({
    conta_destino_id: '',
    valor: 0,
    descricao: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contaId = params.get('id');
    if (contaId) {
      loadExtrato(contaId);
    }
  }, []);

  const loadExtrato = async (contaId) => {
    setIsLoading(true);
    try {
      const [contaData, lancamentosData, movimentosData, vendasData, comprasData, contasData] = await Promise.all([
        base44.entities.ContasFinanceiras.filter({ id: contaId }),
        base44.entities.LancamentoFinanceiro.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.PedidoVenda.list(),
        base44.entities.PedidoCompra.list(),
        base44.entities.ContasFinanceiras.list()
      ]);

      if (contaData.length > 0) {
        const contaNome = contaData[0].nome;
        setConta(contaData[0]);
        setContas(contasData);
        
        // 1. Lançamentos manuais vinculados à conta
        const lancamentosDaConta = lancamentosData.filter(l => 
          l.conta_financeira_id === contaId
        );
        
        // 2. Vendas que afetaram esta conta (busca por forma de pagamento)
        const vendasDaConta = vendasData
          .filter(v => 
            v.status !== 'Cancelado' &&
            v.pagamentos?.some(p => {
              const forma = p.forma_pagamento?.toLowerCase() || '';
              const nomeContaLower = contaNome.toLowerCase();
              
              // Match direto no nome da forma de pagamento
              if (forma.includes(nomeContaLower)) return true;
              
              // Se é conta caixa/PDV, pega dinheiro e PIX
              if (nomeContaLower.includes('caixa') || nomeContaLower.includes('pdv')) {
                return forma.includes('dinheiro') || forma.includes('pix');
              }
              
              return false;
            })
          )
          .map(v => ({
            tipo: 'Receita',
            descricao: `Venda ${v.numero || v.senha_atendimento || v.id.slice(0,8)}`,
            valor: v.valor_total || 0,
            created_date: v.created_date,
            categoria: 'Venda de Produto',
            status: v.status,
            origem: 'venda',
            referencia_numero: v.numero
          }));
        
        // 3. Compras pagas (despesas)
        const comprasPagas = comprasData
          .filter(c => 
            c.status_aprovacao_financeira === 'Aprovado' || 
            c.conta_pagamento_id === contaId
          )
          .map(c => ({
            tipo: 'Despesa',
            descricao: `Compra ${c.numero} - ${c.fornecedor_nome || 'Fornecedor'}`,
            valor: c.valor_total || 0,
            created_date: c.created_date,
            categoria: 'Compra de Mercadoria',
            status: c.status,
            origem: 'compra',
            referencia_numero: c.numero
          }));
        
        setLancamentos([...lancamentosDaConta, ...vendasDaConta, ...comprasPagas]);
        setMovimentosCaixa(movimentosData.filter(m => m.conta_id === contaId));
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar extrato",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLancamento = async () => {
    try {
      const lancamentoData = {
        ...formLancamento,
        valor: parseFloat(formLancamento.valor),
        conta_financeira_id: conta.id,
        observacoes: `Lançamento manual via conta ${conta.nome}`
      };

      await base44.entities.LancamentoFinanceiro.create(lancamentoData);

      // Atualiza saldo da conta
      const novoSaldo = conta.saldo_atual + (
        formLancamento.tipo === 'Receita' ? 
        parseFloat(formLancamento.valor) : 
        -parseFloat(formLancamento.valor)
      );

      await base44.entities.ContasFinanceiras.update(conta.id, {
        saldo_atual: novoSaldo
      });

      toast({
        title: "Lançamento registrado",
        description: `${formLancamento.tipo} de ${formatCurrency(formLancamento.valor)} registrada`,
        className: "bg-green-100 text-green-800"
      });

      setDialogType(null);
      loadExtrato(conta.id);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveTransferencia = async () => {
    try {
      const valor = parseFloat(formTransferencia.valor);
      const contaDestino = contas.find(c => c.id === formTransferencia.conta_destino_id);

      if (!contaDestino) {
        toast({ title: "Selecione uma conta de destino", variant: "destructive" });
        return;
      }

      // Cria saída na conta origem
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: `Transferência para ${contaDestino.nome}: ${formTransferencia.descricao}`,
        valor: valor,
        categoria: 'Outros',
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago',
        conta_financeira_id: conta.id,
        observacoes: `Transferência de ${conta.nome} para ${contaDestino.nome}`
      });

      // Cria entrada na conta destino
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Receita',
        descricao: `Transferência de ${conta.nome}: ${formTransferencia.descricao}`,
        valor: valor,
        categoria: 'Outros',
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago',
        conta_financeira_id: contaDestino.id,
        observacoes: `Transferência de ${conta.nome} para ${contaDestino.nome}`
      });

      // Atualiza saldos
      await base44.entities.ContasFinanceiras.update(conta.id, {
        saldo_atual: conta.saldo_atual - valor
      });

      await base44.entities.ContasFinanceiras.update(contaDestino.id, {
        saldo_atual: contaDestino.saldo_atual + valor
      });

      toast({
        title: "Transferência realizada",
        description: `${formatCurrency(valor)} transferido para ${contaDestino.nome}`,
        className: "bg-green-100 text-green-800"
      });

      setDialogType(null);
      loadExtrato(conta.id);
    } catch (error) {
      toast({
        title: "Erro ao transferir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const openDialog = (type) => {
    setDialogType(type);
    setShowFAB(false);
    
    if (type === 'receita' || type === 'despesa') {
      setFormLancamento({
        tipo: type === 'receita' ? 'Receita' : 'Despesa',
        descricao: '',
        valor: 0,
        categoria: 'Outros',
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago'
      });
    } else if (type === 'transferencia') {
      setFormTransferencia({
        conta_destino_id: '',
        valor: 0,
        descricao: ''
      });
    }
  };

  // Combina e ordena movimentações
  const todasMovimentacoes = [
    ...lancamentos.map(l => ({ ...l, origem: 'lancamento' })),
    ...movimentosCaixa.map(m => ({ ...m, origem: 'movimento' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Filtra por busca
  const movimentacoesFiltradas = todasMovimentacoes.filter(m => {
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      m.descricao?.toLowerCase().includes(termo) ||
      m.tipo?.toLowerCase().includes(termo) ||
      m.categoria?.toLowerCase().includes(termo)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Conta não encontrada</p>
          <Button onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-glacial">
      {/* Header fixo */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden md:inline">Voltar</span>
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200">
                {conta.nome}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{conta.tipo}</p>
            </div>

            <div className="w-20" />
          </div>

          {/* Saldo e busca */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Atual</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                {formatCurrency(conta.saldo_atual)}
              </p>
            </div>

            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar movimentações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de movimentações */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          {movimentacoesFiltradas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhuma movimentação encontrada</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Use o botão + para registrar movimentações
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {movimentacoesFiltradas.map((mov, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {mov.tipo === 'Receita' && (
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                        )}
                        {mov.tipo === 'Despesa' && (
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                        {mov.tipo === 'Reforço' && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <ArrowUpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        {mov.tipo === 'Sangria' && (
                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <ArrowDownCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {mov.descricao || mov.tipo}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(mov.created_date), "dd/MM/yyyy 'às' HH:mm")}
                            {mov.categoria && ` • ${mov.categoria}`}
                            {mov.origem === 'lancamento' && ' • Lançamento'}
                            {mov.origem === 'movimento' && ' • Movimento de Caixa'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        mov.tipo === 'Receita' || mov.tipo === 'Reforço' ? 
                        'text-green-600 dark:text-green-400' : 
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {mov.tipo === 'Receita' || mov.tipo === 'Reforço' ? '+' : '-'} 
                        {formatCurrency(mov.valor)}
                      </p>
                      {mov.status && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{mov.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB Principal */}
      <button
        onClick={() => setShowFAB(!showFAB)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-40"
      >
        <Plus className={`w-6 h-6 transition-transform ${showFAB ? 'rotate-45' : ''}`} />
      </button>

      {/* FAB Expandido */}
      {showFAB && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setShowFAB(false)}
          />
          <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
            <button
              onClick={() => openDialog('receita')}
              className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span className="font-medium">Receita</span>
            </button>
            <button
              onClick={() => openDialog('despesa')}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ArrowDownCircle className="w-5 h-5" />
              <span className="font-medium">Despesa</span>
            </button>
            <button
              onClick={() => openDialog('transferencia')}
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ArrowRightLeft className="w-5 h-5" />
              <span className="font-medium">Transferência</span>
            </button>
          </div>
        </>
      )}

      {/* Dialog Receita/Despesa */}
      <Dialog open={dialogType === 'receita' || dialogType === 'despesa'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              {dialogType === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Descrição</Label>
              <Input
                placeholder="Ex: Venda de produto, Pagamento de fornecedor..."
                value={formLancamento.descricao}
                onChange={(e) => setFormLancamento({ ...formLancamento, descricao: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formLancamento.valor}
                onChange={(e) => setFormLancamento({ ...formLancamento, valor: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Categoria</Label>
              <Select 
                value={formLancamento.categoria} 
                onValueChange={(v) => setFormLancamento({ ...formLancamento, categoria: v })}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="Venda de Produto">Venda de Produto</SelectItem>
                  <SelectItem value="Prestação de Serviço">Prestação de Serviço</SelectItem>
                  <SelectItem value="Compra de Mercadoria">Compra de Mercadoria</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Salários">Salários</SelectItem>
                  <SelectItem value="Impostos">Impostos</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveLancamento} 
              className={dialogType === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Transferência */}
      <Dialog open={dialogType === 'transferencia'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">Nova Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Conta de Destino</Label>
              <Select 
                value={formTransferencia.conta_destino_id} 
                onValueChange={(v) => setFormTransferencia({ ...formTransferencia, conta_destino_id: v })}
              >
                <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.filter(c => c.id !== conta.id && c.ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formTransferencia.valor}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, valor: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Descrição</Label>
              <Input
                placeholder="Ex: Reforço de caixa, Sangria..."
                value={formTransferencia.descricao}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, descricao: e.target.value })}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={handleSaveTransferencia} className="bg-blue-600 hover:bg-blue-700">
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}