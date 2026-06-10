import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ArrowLeft,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
  Search,
  FileDown,
  Printer,
  ListFilter,
  ArrowDownAZ,
  ArrowUpAZ,
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { printOrShareElementAsPdf } from '@/lib/mobilePrintAndShare';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';
import { useCompactShell } from '@/hooks/use-breakpoint';
import { useBottomNavScrollVisibility } from '@/hooks/useBottomNavScrollVisibility';
import { cn } from '@/components/utils';

const PERIODOS_EXTRATO = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'todos', label: 'Tudo' },
  { value: 'personalizado', label: 'Período' },
];

function extratoMovAccent(tipo) {
  if (tipo === 'Receita' || tipo === 'Reforço') return 'success';
  if (tipo === 'Despesa' || tipo === 'Sangria') return 'danger';
  return 'muted';
}

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortOrdem, setSortOrdem] = useState('az');
  const isMobile = useCompactShell();
  const chromeExpanded = useBottomNavScrollVisibility(isMobile);
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

  const getDataMovimento = (mov) => mov.data_pagamento || mov.data_vencimento || mov.created_date;
  const participaDoSaldo = (mov) => {
    if (mov.status === 'Cancelado') return false;
    if (mov.origem === 'movimento') return false;
    if (mov.tipo !== 'Receita' && mov.tipo !== 'Despesa') return false;
    return mov.status === 'Pago' || !!mov.data_pagamento;
  };

  // Combina e ordena movimentações
  const todasMovimentacoes = [
    ...lancamentos.map(l => ({ ...l, origem: 'lancamento' })),
    ...movimentosCaixa.map(m => ({ ...m, origem: 'movimento' }))
  ].sort((a, b) => new Date(getDataMovimento(a)) - new Date(getDataMovimento(b)));

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
      case 'todos':
        return { inicio: new Date(0), fim: endOfDay(hoje) };
      case 'personalizado':
        return dataInicio && dataFim ? 
          { inicio: startOfDay(parseISO(dataInicio)), fim: endOfDay(parseISO(dataFim)) } : 
          { inicio: new Date(0), fim: new Date() };
      default:
        return { inicio: new Date(0), fim: new Date() };
    }
  };

  const { inicio, fim } = getDataRange();
  const movimentacoesNoPeriodo = todasMovimentacoes.filter(m => {
    const dataMovimento = new Date(getDataMovimento(m));
    return isWithinInterval(dataMovimento, { start: inicio, end: fim });
  });

  const movimentacoesFiltradas = movimentacoesNoPeriodo.filter(m => {
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
    const dia = format(new Date(getDataMovimento(mov)), 'yyyy-MM-dd');
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(mov);
    return acc;
  }, {});

  const diasOrdenados = Object.keys(movimentacoesPorDia).sort((a, b) => new Date(b) - new Date(a));

  // Usa o saldo_atual real da conta como ponto de referência
  // e remove todo o efeito das movimentações futuras para chegar no saldo do período exibido
  const saldoReal = (() => {
    const saldoInicial = Number(conta?.saldo_inicial || 0);
    const totalEntradasValidas = todasMovimentacoes
      .filter(m => participaDoSaldo(m) && m.tipo === 'Receita')
      .reduce((sum, m) => sum + (m.valor || 0), 0);
    const totalSaidasValidas = todasMovimentacoes
      .filter(m => participaDoSaldo(m) && m.tipo === 'Despesa')
      .reduce((sum, m) => sum + (m.valor || 0), 0);
    return saldoInicial + totalEntradasValidas - totalSaidasValidas;
  })();

  const movimentacoesAposPeriodo = todasMovimentacoes.filter(m => {
    const dataMovimento = new Date(getDataMovimento(m));
    return dataMovimento > fim && participaDoSaldo(m);
  });

  const totalEntradasAposPeriodo = movimentacoesAposPeriodo
    .filter(m => m.tipo === 'Receita')
    .reduce((sum, m) => sum + (m.valor || 0), 0);
  const totalSaidasAposPeriodo = movimentacoesAposPeriodo
    .filter(m => m.tipo === 'Despesa')
    .reduce((sum, m) => sum + (m.valor || 0), 0);

  const saldoNoFimDoPeriodo = saldoReal - totalEntradasAposPeriodo + totalSaidasAposPeriodo;

  const totalEntradasPeriodo = movimentacoesNoPeriodo
    .filter(m => participaDoSaldo(m) && m.tipo === 'Receita')
    .reduce((sum, m) => sum + (m.valor || 0), 0);
  const totalSaidasPeriodo = movimentacoesNoPeriodo
    .filter(m => participaDoSaldo(m) && m.tipo === 'Despesa')
    .reduce((sum, m) => sum + (m.valor || 0), 0);

  let saldoAcumulado = saldoNoFimDoPeriodo - totalEntradasPeriodo + totalSaidasPeriodo;

  const diasComSaldo = diasOrdenados.reverse().map(dia => {
    const saldoAnterior = saldoAcumulado;
    const movimentacoesDia = movimentacoesPorDia[dia];

    const totalEntradas = movimentacoesDia
      .filter(m => participaDoSaldo(m) && m.tipo === 'Receita')
      .reduce((sum, m) => sum + (m.valor || 0), 0);

    const totalSaidas = movimentacoesDia
      .filter(m => participaDoSaldo(m) && m.tipo === 'Despesa')
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

  const diasExibicao = useMemo(() => {
    return diasComSaldo.map((diaData) => ({
      ...diaData,
      movimentacoes: [...diaData.movimentacoes].sort((a, b) => {
        const da = (a.descricao || a.tipo || '').toLocaleLowerCase('pt-BR');
        const db = (b.descricao || b.tipo || '').toLocaleLowerCase('pt-BR');
        const cmp = da.localeCompare(db, 'pt-BR');
        return sortOrdem === 'az' ? cmp : -cmp;
      }),
    }));
  }, [diasComSaldo, sortOrdem]);

  const saldoCalculado = saldoReal;

  const searchRow = (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar movimentações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-muted/40 dark:bg-muted border-0 rounded-2xl"
        />
      </div>
      <button
        type="button"
        onClick={() => setFilterSheetOpen(true)}
        className={cn(
          'h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center transition-colors',
          filtroPeriodo !== 'mes'
            ? 'bg-primary/15 text-primary dark:bg-muted dark:text-foreground'
            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
        )}
        aria-label="Filtrar período"
      >
        <ListFilter className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setSortOrdem((o) => (o === 'az' ? 'za' : 'az'))}
        className="h-11 w-11 shrink-0 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors"
        aria-label={sortOrdem === 'az' ? 'Ordenar Z–A' : 'Ordenar A–Z'}
        title={sortOrdem === 'az' ? 'A–Z' : 'Z–A'}
      >
        {sortOrdem === 'az' ? (
          <ArrowDownAZ className="w-4 h-4" />
        ) : (
          <ArrowUpAZ className="w-4 h-4" />
        )}
      </button>
    </div>
  );

  // Funções de exportação
  const exportarCSV = () => {
    const csvContent = [
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Saldo'],
      ...movimentacoesFiltradas.map(m => [
        format(new Date(getDataMovimento(m)), 'dd/MM/yyyy HH:mm'),
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
    if (!conta) return;
    void printOrShareElementAsPdf('extrato-print-root', {
      formato: 'a4',
      fileBaseName: `extrato-${String(conta.nome || 'conta').replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}`,
      title: `Extrato ${conta.nome}`,
      onDesktopPrint: () => window.print(),
    });
  };

  const movimentacoesList = (
    <>
      {diasExibicao.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm text-center py-16">
          <p className="text-muted-foreground mb-2">Nenhuma movimentação encontrada</p>
          <p className="text-sm text-muted-foreground">
            Use o botão + para registrar movimentações
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {diasExibicao.map((diaData, diaIdx) => (
            <div key={diaIdx} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-card px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {format(new Date(diaData.dia), "dd 'de' MMMM 'de' yyyy")}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="text-[#4A5D23] dark:text-[#a4ce33]">
                        ↑ {formatCurrency(diaData.totalEntradas)}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        ↓ {formatCurrency(diaData.totalSaidas)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Saldo Final</p>
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {formatCurrency(diaData.saldoFinal)}
                    </p>
                  </div>
                </div>
              </div>

              <P38MobileLineList>
                {diaData.movimentacoes.map((mov, idx) => {
                  const entrada = mov.tipo === 'Receita' || mov.tipo === 'Reforço';
                  const hora = format(new Date(getDataMovimento(mov)), 'HH:mm');
                  const subtitle = mov.categoria ? `${hora} · ${mov.categoria}` : hora;
                  return (
                    <P38MobileLine
                      key={idx}
                      striped={idx % 2 === 1}
                      accent={p38AccentKeyFromTone(extratoMovAccent(mov.tipo))}
                      title={mov.descricao || mov.tipo}
                      subtitle={subtitle}
                      meta={<P38StatusLabel tone={extratoMovAccent(mov.tipo)}>{mov.tipo}</P38StatusLabel>}
                      value={
                        <span className={entrada ? 'text-[#4A5D23] dark:text-[#a4ce33]' : 'text-red-600 dark:text-red-400'}>
                          {entrada ? '+' : '-'}{formatCurrency(mov.valor)}
                        </span>
                      }
                    />
                  );
                })}
              </P38MobileLineList>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="h-full min-h-0 desktop-layout:min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border/40 dark:border-white"></div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="h-full min-h-0 desktop-layout:min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Conta não encontrada</p>
          <Button onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="extrato-print-root"
      className="h-full min-h-0 flex flex-col bg-background font-glacial desktop-layout:min-h-screen desktop-layout:block"
    >
      {/* Mobile — chrome colapsável ao descer; busca + filtro + ordem sempre visíveis */}
      <div className="desktop-layout:hidden z-20 bg-card/95 backdrop-blur-md border-b border-border/40 shadow-sm shrink-0">
        <div
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            chromeExpanded ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'
          )}
          aria-hidden={!chromeExpanded}
        >
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="shrink-0 hover:bg-muted"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 text-center min-w-0 px-1">
                <h1 className="text-lg font-medium text-foreground truncate">{conta.nome}</h1>
                <p className="text-xs text-muted-foreground">{conta.tipo}</p>
              </div>
              <div className="flex gap-1 shrink-0 no-pdf-capture">
                <Button variant="ghost" size="icon" onClick={exportarCSV} title="Exportar CSV" className="h-10 w-10">
                  <FileDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={imprimir} title="Imprimir" className="h-10 w-10">
                  <Printer className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/40 dark:bg-muted px-4 py-2.5 rounded-xl mb-3">
              <p className="text-[11px] text-muted-foreground mb-0.5">Saldo Atual</p>
              <p className="text-xl font-semibold text-foreground tabular-nums">{formatCurrency(saldoCalculado)}</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-2">{searchRow}</div>
      </div>

      {/* Desktop — header completo */}
      <div className="hidden desktop-layout:block bg-card shadow-sm sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-2 hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-medium text-foreground">{conta.nome}</h1>
              <p className="text-sm text-muted-foreground">{conta.tipo}</p>
            </div>
            <div className="flex gap-2 no-pdf-capture">
              <Button variant="ghost" size="icon" onClick={exportarCSV} title="Exportar CSV">
                <FileDown className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={imprimir} title="Imprimir">
                <Printer className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="bg-muted/40 dark:bg-muted px-6 py-3 rounded-xl mb-4">
            <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(saldoCalculado)}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {PERIODOS_EXTRATO.map((filtro) => (
              <button
                key={filtro.value}
                type="button"
                onClick={() => setFiltroPeriodo(filtro.value)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors',
                  filtroPeriodo === filtro.value
                    ? 'bg-primary dark:bg-muted text-white'
                    : 'bg-card dark:bg-muted text-foreground/90 hover:bg-muted dark:hover:bg-muted'
                )}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          {filtroPeriodo === 'personalizado' && (
            <div className="flex gap-2 mb-4">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="dark:bg-muted dark:border-border/40" />
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="dark:bg-muted dark:border-border/40" />
            </div>
          )}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar movimentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/40 dark:bg-muted border-0"
            />
          </div>
        </div>
      </div>

      {/* Lista — scroll interno no mobile para o colapso do header e do bottom nav */}
      <div
        className={cn(
          'desktop-layout:max-w-7xl desktop-layout:mx-auto w-full',
          isMobile && 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y'
        )}
        style={isMobile ? { WebkitOverflowScrolling: 'touch' } : undefined}
      >
        <div className="max-w-7xl mx-auto w-full px-4 py-4 desktop-layout:py-6 pb-[var(--p38-scroll-pad-below-nav)] desktop-layout:pb-6">
          {movimentacoesList}
        </div>
      </div>

      {/* Filtro de período — mobile (sheet) */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[28px] border-0 px-4 pb-8">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="font-glacial text-foreground">Período do extrato</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 mb-4">
            {PERIODOS_EXTRATO.map((filtro) => (
              <button
                key={filtro.value}
                type="button"
                onClick={() => {
                  setFiltroPeriodo(filtro.value);
                  if (filtro.value !== 'personalizado') setFilterSheetOpen(false);
                }}
                className={cn(
                  'px-4 py-2 rounded-full text-sm transition-colors',
                  filtroPeriodo === filtro.value
                    ? 'bg-primary text-primary-foreground dark:bg-muted dark:text-foreground'
                    : 'bg-muted text-foreground/90'
                )}
              >
                {filtro.label}
              </button>
            ))}
          </div>
          {filtroPeriodo === 'personalizado' && (
            <div className="flex flex-col gap-2 mb-4">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-11 rounded-2xl border-0 bg-muted" />
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-11 rounded-2xl border-0 bg-muted" />
              <Button type="button" className="h-11 rounded-2xl" onClick={() => setFilterSheetOpen(false)}>
                Aplicar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* FAB Principal */}
      <button
        type="button"
        onClick={() => setShowFAB(!showFAB)}
        className={cn(
          'fixed right-6 p38-bottom-fab1 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-background dark:bg-muted dark:hover:bg-muted',
          isMobile && !chromeExpanded && 'translate-y-8 opacity-0 pointer-events-none'
        )}
      >
        <Plus className={`w-6 h-6 transition-transform ${showFAB ? 'rotate-45' : ''}`} />
      </button>

      {/* FAB Expandido */}
      {showFAB && (
        <>
          <div 
            className="fixed inset-0 z-[54] bg-black/20"
            onClick={() => setShowFAB(false)}
          />
          <div className="fixed right-6 z-[55] flex flex-col gap-3 p38-bottom-fab-mid">
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
        <DialogContent className="flex max-h-[min(92vh,36rem)] min-h-0 flex-col gap-0 overflow-hidden dark:border-border/40 dark:bg-muted sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">
              {dialogType === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 [scrollbar-gutter:stable]">
            <div>
              <Label className="text-foreground/90">Descrição</Label>
              <Input
                placeholder="Ex: Venda de produto, Pagamento de fornecedor..."
                value={formLancamento.descricao}
                onChange={(e) => setFormLancamento({ ...formLancamento, descricao: e.target.value })}
                className="dark:bg-muted dark:border-border/40 dark:text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground/90">Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formLancamento.valor}
                onChange={(e) => setFormLancamento({ ...formLancamento, valor: e.target.value })}
                className="dark:bg-muted dark:border-border/40 dark:text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground/90">Categoria</Label>
              <Select 
                value={formLancamento.categoria} 
                onValueChange={(v) => setFormLancamento({ ...formLancamento, categoria: v })}
              >
                <SelectTrigger className="dark:bg-muted dark:border-border/40 dark:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-muted dark:border-border/40">
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
          <DialogFooter className="shrink-0 border-t border-border/50 pt-4 dark:border-border/50">
            <Button variant="outline" onClick={() => setDialogType(null)} className="dark:bg-muted dark:border-border/40">
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
        <DialogContent className="flex max-h-[min(92vh,32rem)] min-h-0 flex-col gap-0 overflow-hidden dark:border-border/40 dark:bg-muted sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">Nova Transferência</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 [scrollbar-gutter:stable]">
            <div>
              <Label className="text-foreground/90">Conta de Destino</Label>
              <Select 
                value={formTransferencia.conta_destino_id} 
                onValueChange={(v) => setFormTransferencia({ ...formTransferencia, conta_destino_id: v })}
              >
                <SelectTrigger className="dark:bg-muted dark:border-border/40 dark:text-foreground">
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-muted dark:border-border/40">
                  {contas.filter(c => c.id !== conta.id && c.ativo).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground/90">Valor</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formTransferencia.valor}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, valor: e.target.value })}
                className="dark:bg-muted dark:border-border/40 dark:text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground/90">Descrição</Label>
              <Input
                placeholder="Ex: Reforço de caixa, Sangria..."
                value={formTransferencia.descricao}
                onChange={(e) => setFormTransferencia({ ...formTransferencia, descricao: e.target.value })}
                className="dark:bg-muted dark:border-border/40 dark:text-foreground"
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/50 pt-4 dark:border-border/50">
            <Button variant="outline" onClick={() => setDialogType(null)} className="dark:bg-muted dark:border-border/40">
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