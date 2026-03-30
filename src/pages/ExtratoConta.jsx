import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Calendar, Search, FileDown, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function ExtratoContaPage() {
  const [conta, setConta] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [movimentosCaixa, setMovimentosCaixa] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFAB, setShowFAB] = useState(false);
  const [dialogType, setDialogType] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
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
      const [contaData, lancamentosData, movimentosData, contasData] = await Promise.all([
        base44.entities.ContasFinanceiras.filter({ id: contaId }),
        base44.entities.LancamentoFinanceiro.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.ContasFinanceiras.list()
      ]);

      if (contaData.length > 0) {
        const contaAtual = contaData[0];
        const contaNome = contaAtual.nome;
        const isCaixaGeral = contaAtual.is_caixa_geral === true;
        
        setConta(contaAtual);
        setContas(contasData);
        
        let lancamentosFiltrados = [];

        if (isCaixaGeral) {
          lancamentosFiltrados = lancamentosData.filter(l => !l.conta_financeira_id);
        } else {
          lancamentosFiltrados = lancamentosData.filter(l => l.conta_financeira_id === contaId);
        }

        setLancamentos(lancamentosFiltrados);
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
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  ].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  // Aplica filtro de período
  const getDataRange = () => {
    const hoje = new Date();
    switch (filtroPeriodo) {
      case 'hoje':
        return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
      case 'ontem':
        const ontem = subDays(hoje, 1);
        return { inicio: startOfDay(ontem), fim: endOfDay(ontem) };
      case 'semana':
        return { inicio: startOfWeek(hoje, { weekStartsOn: 0 }), fim: endOfWeek(hoje, { weekStartsOn: 0 }) };
      case 'mes':
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
      case 'personalizado':
        return dataInicio && dataFim ? 
          { inicio: startOfDay(parseISO(dataInicio)), fim: endOfDay(parseISO(dataFim)) } : 
          { inicio: new Date(0), fim: new Date() };
      default:
        return { inicio: new Date(0), fim: new Date() };
    }
  };

  const { inicio, fim } = getDataRange();
  const movimentacoesFiltradas = todasMovimentacoes.filter(m => {
    const dataMovimento = new Date(m.created_date);
    const dentroDoRange = isWithinInterval(dataMovimento, { start: inicio, end: fim });
    
    if (!dentroDoRange) return false;
    
    if (!searchTerm) return true;
    const termo = searchTerm.toLowerCase();
    return (
      m.descricao?.toLowerCase().includes(termo) ||
      m.tipo?.toLowerCase().includes(termo) ||
      m.categoria?.toLowerCase().includes(termo)
    );
  });

  // Agrupa por dia e calcula saldos
  const movimentacoesPorDia = movimentacoesFiltradas.reduce((acc, mov) => {
    const dia = format(new Date(mov.created_date), 'yyyy-MM-dd');
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(mov);
    return acc;
  }, {});

  const diasOrdenados = Object.keys(movimentacoesPorDia).sort((a, b) => new Date(b) - new Date(a));

  // Usa o saldo_atual real da conta como ponto de referência
  // e reconstrói os saldos por dia retroativamente
  const saldoReal = conta?.saldo_atual || 0;

  // Calcula totais de todas as movimentações filtradas
  const totalEntradasGeral = movimentacoesFiltradas
    .filter(m => (m.tipo === 'Receita' || m.tipo === 'Reforço') && m.status !== 'Cancelado')
    .reduce((sum, m) => sum + (m.valor || 0), 0);
  const totalSaidasGeral = movimentacoesFiltradas
    .filter(m => (m.tipo === 'Despesa' || m.tipo === 'Sangria') && m.status !== 'Cancelado')
    .reduce((sum, m) => sum + (m.valor || 0), 0);

  // Saldo anterior ao período = saldo atual - resultado do período filtrado
  let saldoAcumulado = saldoReal - totalEntradasGeral + totalSaidasGeral;

  const diasComSaldo = diasOrdenados.reverse().map(dia => {
    const saldoAnterior = saldoAcumulado;
    const movimentacoesDia = movimentacoesPorDia[dia];

    const totalEntradas = movimentacoesDia
      .filter(m => (m.tipo === 'Receita' || m.tipo === 'Reforço') && m.status !== 'Cancelado')
      .reduce((sum, m) => sum + (m.valor || 0), 0);

    const totalSaidas = movimentacoesDia
      .filter(m => (m.tipo === 'Despesa' || m.tipo === 'Sangria') && m.status !== 'Cancelado')
      .reduce((sum, m) => sum + (m.valor || 0), 0);

    saldoAcumulado = saldoAcumulado + totalEntradas - totalSaidas;

    return {
      dia,
      movimentacoes: movimentacoesDia,
      saldoAnterior,
      saldoFinal: saldoAcumulado,
      totalEntradas,
      totalSaidas
    };
  }).reverse();

  const saldoCalculado = saldoReal;

  // Funções de exportação
  const exportarCSV = () => {
    const csvContent = [
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo'],
      ...movimentacoesFiltradas.map(m => [
        format(new Date(m.created_date), 'dd/MM/yyyy HH:mm'),
        m.descricao || m.tipo,
        m.tipo,
        m.categoria || '-',
        (m.valor || 0).toFixed(2),
        ''
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${conta.nome}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const imprimir = () => {
    window.print();
  };

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

            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={exportarCSV} title="Exportar CSV">
                <FileDown className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={imprimir} title="Imprimir">
                <Printer className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Saldo */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 rounded-xl mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Atual</p>
            <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {formatCurrency(saldoCalculado)}
            </p>
          </div>

          {/* Filtros Timeline */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {[
              { value: 'hoje', label: 'Hoje' },
              { value: 'ontem', label: 'Ontem' },
              { value: 'semana', label: 'Semana' },
              { value: 'mes', label: 'Mês' },
              { value: 'todos', label: 'Tudo' },
              { value: 'personalizado', label: 'Período' }
            ].map(filtro => (
              <button
                key={filtro.value}
                onClick={() => setFiltroPeriodo(filtro.value)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  filtroPeriodo === filtro.value
                    ? 'bg-gray-800 dark:bg-gray-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>

          {/* Período personalizado */}
          {filtroPeriodo === 'personalizado' && (
            <div className="flex gap-2 mb-4">
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="dark:bg-gray-700 dark:border-gray-600"
              />
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          )}

          {/* Busca */}
          <div className="relative">
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

      {/* Lista de movimentações por dia */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {diasComSaldo.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhuma movimentação encontrada</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Use o botão + para registrar movimentações
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {diasComSaldo.map((diaData, diaIdx) => (
              <div key={diaIdx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {/* Header do dia */}
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {format(new Date(diaData.dia), "dd 'de' MMMM 'de' yyyy")}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-green-600 dark:text-green-400">
                          ↑ {formatCurrency(diaData.totalEntradas)}
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          ↓ {formatCurrency(diaData.totalSaidas)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Saldo Final</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(diaData.saldoFinal)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Movimentações do dia */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {diaData.movimentacoes.map((mov, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
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
                                {format(new Date(mov.created_date), "HH:mm")}
                                {mov.categoria && ` • ${mov.categoria}`}
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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