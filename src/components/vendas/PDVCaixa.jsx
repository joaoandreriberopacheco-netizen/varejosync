import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowLeft,
  Wallet,
  PieChart,
  ShoppingCart,
  BarChart3,
  CheckCircle2,
  Plus,
  Minus,
  Lock,
  Printer,
  Keyboard,
  AlertCircle,
  Edit,
  Eye,
  ChevronRight,
  Monitor,
  RefreshCw } from
'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import LiberacaoEntrega from './LiberacaoEntrega';
import SeletorCaixaPDV from './SeletorCaixaPDV';

export default function PDVCaixa() {
  const [configVenda, setConfigVenda] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.entities.ConfiguracoesVenda.list().
    then((configs) => {
      if (configs.length > 0) setConfigVenda(configs[0]);
    }).
    catch(console.error);
    
    // Carregar usuário
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);
  const [pedidosAguardando, setPedidosAguardando] = useState([]);
  const [rascunhosAguardando, setRascunhosAguardando] = useState([]);
  const [vendasFinalizadas, setVendasFinalizadas] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [contaCaixaPDV, setContaCaixaPDV] = useState(null);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState('dashboard'); // Renamed telaAtual to view

  const [showMovimentoDialog, setShowMovimentoDialog] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState('');
  const [valorMovimento, setValorMovimento] = useState('');
  const [observacaoMovimento, setObservacaoMovimento] = useState('');
  const [movimentoCriado, setMovimentoCriado] = useState(null);
  const [showComprovanteMovimento, setShowComprovanteMovimento] = useState(false);
  const [movimentoStep, setMovimentoStep] = useState('obs'); // 'obs' | 'valor'
  const valorMovimentoRef = React.useRef(null);
  const obsMovimentoRef = React.useRef(null);

  // Despesa - mesmo fluxo do movimento
  const [despesaStep, setDespesaStep] = useState('obs'); // 'obs' | 'valor'
  const [valorDespesaNum, setValorDespesaNum] = useState('');
  const obsDespesaRef = React.useRef(null);
  const valorDespesaRef = React.useRef(null);

  const [showFechamentoDialog, setShowFechamentoDialog] = useState(false);
  const [valorContadoCaixa, setValorContadoCaixa] = useState('');
  const [showCalculadoraCedulas, setShowCalculadoraCedulas] = useState(false);
  const [cedulas, setCedulas] = useState({
    nota200: 0,
    nota100: 0,
    nota50: 0,
    nota20: 0,
    nota10: 0,
    nota5: 0,
    nota2: 0,
    moeda1: 0,
    moeda050: 0,
    moeda025: 0,
    moeda010: 0,
    moeda005: 0
  });
  const [recebimentosDinheiro, setRecebimentosDinheiro] = useState('');
  const [recebimentosPix, setRecebimentosPix] = useState('');
  const [recebimentosCredito, setRecebimentosCredito] = useState('');
  const [recebimentosDebito, setRecebimentosDebito] = useState('');

  const [pagamentosDinheiro, setPagamentosDinheiro] = useState(0);
  const [pagamentosPix, setPagamentosPix] = useState(0);
  const [pagamentosDebito, setPagamentosDebito] = useState(0);
  const [pagamentosCredito, setPagamentosCredito] = useState(0);
  const [pagamentosVale, setPagamentosVale] = useState(0);
  const [parcelasCredito, setParcelasCredito] = useState(1);
  const [formaPagamentoAtiva, setFormaPagamentoAtiva] = useState(0);
  const [codigoVale, setCodigoVale] = useState('');
  const [valeEncontrado, setValeEncontrado] = useState(null);
  const [buscandoVale, setBuscandoVale] = useState(false);

  // Valores como strings para edição livre
  const [inputDinheiro, setInputDinheiro] = useState('');
  const [inputPix, setInputPix] = useState('');
  const [inputDebito, setInputDebito] = useState('');
  const [inputCredito, setInputCredito] = useState('');
  const [inputVale, setInputVale] = useState('');

  // Refs para os inputs
  const inputRefs = {
    dinheiro: React.useRef(null),
    pix: React.useRef(null),
    debito: React.useRef(null),
    credito: React.useRef(null),
    vale: React.useRef(null),
  };

  const [showLiberacaoEntrega, setShowLiberacaoEntrega] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [clienteVenda, setClienteVenda] = useState(null);
  const [showRetornoDialog, setShowRetornoDialog] = useState(false);
  const [motivoRetorno, setMotivoRetorno] = useState('');
  const [showVendasDialog, setShowVendasDialog] = useState(false);
  const [showReforcosDialog, setShowReforcosDialog] = useState(false);
  const [showSangriasDialog, setShowSangriasDialog] = useState(false);
  const [vendaDetalhada, setVendaDetalhada] = useState(null);
  const [activeTab, setActiveTab] = useState('balanco');
  const [showDespesaDialog, setShowDespesaDialog] = useState(false);
  const [showSaldoConsolidadoDialog, setShowSaldoConsolidadoDialog] = useState(false);
  const [valorDespesa, setValorDespesa] = useState('');
  const [descricaoDespesa, setDescricaoDespesa] = useState('');
  const [categoriaDespesa, setCategoriaDespesa] = useState('Outros');
  const [turnoAtivo, setTurnoAtivo] = useState(null);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [showSeletorCaixa, setShowSeletorCaixa] = useState(true);

  // Renamed stats to caixaData and updated structure based on outline
  const [caixaData, setCaixaData] = useState({
    saldoAtual: 0,
    liquidez: 0,
    totalVendas: 0,
    saldoInicial: 0,
    recebimentos: {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0
    },
    reforcos: 0,
    sangrias: 0,
    despesas: 0,
    despesasLista: [],
  });
  const [showDespesasDialog, setShowDespesasDialog] = useState(false);
  const [despesaCriada, setDespesaCriada] = useState(null);
  const [showComprovanteDespesa, setShowComprovanteDespesa] = useState(false);
  const { toast } = useToast();

  const totalPago = pagamentosDinheiro + pagamentosPix + pagamentosDebito + pagamentosCredito + pagamentosVale;
  const valorRestante = pedidoSelecionado ? pedidoSelecionado.valor_total - totalPago : 0;
  const troco = valorRestante < 0 ? Math.abs(valorRestante) : 0;
  const pagamentoValido = pedidoSelecionado ? totalPago >= pedidoSelecionado.valor_total : false;

  // Formatar valor para exibição (1234.56 -> "1.234,56")
  const formatarValorExibicao = (valor) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Máscara de valor - digita números e formata automaticamente (centavos -> reais)
  const aplicarMascaraValor = (valorAtual, tecla) => {
    // Remove tudo que não é número
    let numeros = valorAtual.replace(/\D/g, '');

    // Adiciona o novo dígito
    if (/^\d$/.test(tecla)) {
      numeros += tecla;
    }

    // Converte para número e divide por 100 (centavos)
    const valor = parseInt(numeros) / 100;
    return formatarValorExibicao(valor);
  };

  const handleInputMascara = (e, setInput, setValor) => {
    const tecla = e.key;

    // Backspace - remove último dígito
    if (tecla === 'Backspace') {
      e.preventDefault();
      let numeros = e.target.value.replace(/\D/g, '');
      numeros = numeros.slice(0, -1) || '0';
      const valor = parseInt(numeros) / 100;
      setInput(formatarValorExibicao(valor));
      setValor(valor);
      return;
    }

    // Só aceita números
    if (/^\d$/.test(tecla)) {
      e.preventDefault();
      const novoValor = aplicarMascaraValor(e.target.value, tecla);
      setInput(novoValor);
      const valorNumerico = parseFloat(novoValor.replace(/\./g, '').replace(',', '.'));
      setValor(valorNumerico);
      return;
    }

    // Navegação
    if (tecla === 'ArrowUp' || tecla === 'ArrowDown') {
      handleNavegacaoPagamento(e);
    }
  };

  // Subscription em tempo real para novos rascunhos
  useEffect(() => {
    const unsubscribe = base44.entities.RascunhoPedidoVenda.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        loadData();
      }
    });
    return unsubscribe;
  }, [caixaSelecionado, turnoAtivo]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pedidoSelecionado) {
      const valorFormatado = formatarValorExibicao(pedidoSelecionado.valor_total);
      setPagamentosDinheiro(pedidoSelecionado.valor_total);
      setInputDinheiro(valorFormatado);
      setPagamentosPix(0);
      setInputPix('0,00');
      setPagamentosDebito(0);
      setInputDebito('0,00');
      setPagamentosCredito(0);
      setInputCredito('0,00');
      setPagamentosVale(0);
      setInputVale('0,00');
      setCodigoVale('');
      setValeEncontrado(null);
      setParcelasCredito(1);
      setFormaPagamentoAtiva(0);

      // Auto-focus no primeiro input
      setTimeout(() => inputRefs.dinheiro.current?.focus(), 100);
    }
  }, [pedidoSelecionado]);

  // Focar no input quando mudar forma de pagamento ativa
  useEffect(() => {
    if (isDialogOpen) {
      const refMap = [inputRefs.dinheiro, inputRefs.pix, inputRefs.debito, inputRefs.credito];
      setTimeout(() => {
        refMap[formaPagamentoAtiva]?.current?.focus();
        refMap[formaPagamentoAtiva]?.current?.select();
      }, 50);
    }
  }, [formaPagamentoAtiva, isDialogOpen]);

  // Navegação entre formas de pagamento
  const handleNavegacaoPagamento = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFormaPagamentoAtiva((prev) => (prev + 1) % 5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFormaPagamentoAtiva((prev) => (prev - 1 + 5) % 5);
    }
  };



  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        toast({
          title: "Atalhos do PDV Caixa",
          description: "F1: Ajuda | F2: Processar Vendas | F3: Balanço | F4: Reforço | F5: Sangria | F6: Fechar Caixa | F7: Atualizar | Enter: Confirmar Pagamento | ESC: Voltar",
          duration: 8000
        });
        return;
      }

      if (e.key === 'Enter' && isDialogOpen && pagamentoValido) {
        e.preventDefault();
        handleFinalizarVenda();
        return;
      }

      if (e.key === 'F2' && view === 'dashboard') {// Updated telaAtual to view
        e.preventDefault();
        handleProcessarVendas(); // Changed to new function
        return;
      }

      if (e.key === 'F3' && view === 'dashboard') {
        e.preventDefault();
        setShowVendasDialog(true);
        return;
      }

      if (e.key === 'F4' && view === 'dashboard') {// Updated telaAtual to view
        e.preventDefault();
        handleAbrirMovimento('Reforço');
        return;
      }

      if (e.key === 'F5' && view === 'dashboard') {// Updated telaAtual to view
        e.preventDefault();
        handleAbrirMovimento('Sangria');
        return;
      }

      if (e.key === 'F6' && view === 'dashboard') {// Updated telaAtual to view
        e.preventDefault();
        handleFecharCaixa();
        return;
      }

      if (e.key === 'F7') {
        e.preventDefault();
        loadData();
        toast({
          title: "✓ Atualizado!",
          className: "bg-emerald-100 text-emerald-800",
          duration: 1000
        });
        return;
      }

      if (e.key === 'Enter' && view === 'processar' && !isDialogOpen && pedidosAguardando.length > 0) {// Updated telaAtual to view
        e.preventDefault();
        handleAbrirPedido(pedidosAguardando[0]);
        return;
      }

      if (e.key === 'Escape' && view !== 'dashboard' && !isDialogOpen && !showMovimentoDialog && !showFechamentoDialog) {// Updated telaAtual to view
        e.preventDefault();
        setView('dashboard'); // Updated setTelaAtual to setView
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isDialogOpen, showMovimentoDialog, showFechamentoDialog, valorRestante, pedidosAguardando]); // Updated telaAtual to view

  // Auto-preencher saldo em dinheiro esperado (saldoAtual = fundo + dinheiro vendas + reforços − recolhimentos)
  useEffect(() => {
    // Sempre sincronizar com o valor esperado em caixa
    if (caixaData.saldoAtual >= 0) {
      setRecebimentosDinheiro(formatarValorExibicao(caixaData.saldoAtual));
    }
  }, [caixaData.saldoAtual]);

  // loadData aceita parâmetros opcionais para contornar stale closure no primeiro carregamento
  const loadData = async (caixaParam, turnoParam) => {
    const caixa = caixaParam || caixaSelecionado;
    const turno = turnoParam || turnoAtivo;
    if (!caixa || !turno) return;

    try {
      // Recarregar conta atualizada do banco
      const contaAtualizada = await base44.entities.ContasFinanceiras.get(caixa.id);
      const caixaAtual = contaAtualizada || caixa;
      setContaCaixaPDV(caixaAtual);

      const [todosPedidos, todosRascunhos, todasMovimentacoes, todasDespesas] = await Promise.all([
        base44.entities.PedidoVenda.list(),
        base44.entities.RascunhoPedidoVenda.list(),
        base44.entities.MovimentosCaixa.list(),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turno.id, tipo: 'Despesa' })
      ]);

      const pedidosAguardandoCaixa = todosPedidos.filter((p) =>
        p.status === 'Aguardando Caixa'
      );

      const rascunhosAguardandoCaixa = todosRascunhos.filter((r) =>
        r.status === 'Aguardando Caixa'
      );

      setPedidosAguardando(pedidosAguardandoCaixa);
      setRascunhosAguardando(rascunhosAguardandoCaixa);

      // Filtrar vendas do turno ativo:
      // 1. Vinculadas pelo turno_caixa_id, OU
      // 2. Listadas em vendas_ids do turno, OU
      // 3. Criadas após a abertura do turno sem turno vinculado (retrocompatibilidade)
      const dataAbertura = new Date(turno.data_abertura);
      const dataFechamento = turno.data_fechamento ? new Date(turno.data_fechamento) : null;
      const statusOk = ['Financeiro OK', 'Pedido Concluído', 'Em Separação', 'Em Rota de Entrega'];
      // SELO FRIO: apenas vendas com turno_caixa_id igual ao turno atual
      const vendasTurno = todosPedidos.filter((p) => {
        if (!statusOk.includes(p.status)) return false;
        return p.turno_caixa_id === turno.id;
      });
      setVendasFinalizadas(vendasTurno);

      // Filtrar movimentos do turno ativo
      const movimentosTurno = todasMovimentacoes.filter((m) =>
        m.turno_caixa_id === turno.id &&
        m.conta_id === caixa.id
      );
      setMovimentos(movimentosTurno);

      const totalVendas = vendasTurno.reduce((sum, v) => sum + (v.valor_total || 0), 0);

      let totalDinheiro = 0, totalPix = 0, totalCredito = 0, totalDebito = 0;
      vendasTurno.forEach((venda) => {
        if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
          venda.pagamentos.forEach((pag) => {
            const fp = (pag.forma_pagamento || '').toLowerCase();
            if (fp === 'dinheiro') totalDinheiro += pag.valor || 0;
            else if (fp === 'pix') totalPix += pag.valor || 0;
            else if (fp.includes('crédito') || fp.includes('credito')) totalCredito += pag.valor || 0;
            else if (fp.includes('débito') || fp.includes('debito')) totalDebito += pag.valor || 0;
          });
        }
      });

      const totalReforcos = movimentosTurno.filter((m) => m.tipo === 'Reforço').reduce((sum, m) => sum + (m.valor || 0), 0);
      const totalSangrias = movimentosTurno.filter((m) => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').reduce((sum, m) => sum + (m.valor || 0), 0);
      const totalDespesas = todasDespesas.reduce((sum, d) => sum + (d.valor || 0), 0);

      const saldoInicial = turno.saldo_inicial || 0;
      // Saldo em caixa (dinheiro na gaveta) = saldo inicial + dinheiro recebido + reforços - recolhimentos - despesas
      const saldoCaixaCalculado = saldoInicial + totalDinheiro + totalReforcos - totalSangrias - totalDespesas;
      // Liquidez total do turno = saldo inicial + TODAS as vendas + reforços - recolhimentos - despesas
      const liquidezTurno = saldoInicial + totalVendas + totalReforcos - totalSangrias - totalDespesas;

      setCaixaData({
        saldoInicial: saldoInicial,
        saldoAtual: saldoCaixaCalculado,
        liquidez: liquidezTurno,
        totalVendas: totalVendas,
        recebimentos: {
          dinheiro: totalDinheiro,
          pix: totalPix,
          credito: totalCredito,
          debito: totalDebito
        },
        reforcos: totalReforcos,
        sangrias: totalSangrias,
        despesas: totalDespesas,
        despesasLista: todasDespesas,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAbrirPedido = (pedido) => {
    if (modoVisualizacao) {
      toast({
        title: "Acesso Restrito",
        description: "Você não pode processar vendas neste caixa. Solicite vinculação ao administrador.",
        variant: "destructive"
      });
      return;
    }
    setPedidoSelecionado(pedido);
    setIsDialogOpen(true);
  };

  const handleSelecionarCaixa = (caixa, turno, somenteLeitura) => {
    setCaixaSelecionado(caixa);
    setTurnoAtivo(turno);
    setModoVisualizacao(somenteLeitura);
    setShowSeletorCaixa(false);
    setContaCaixaPDV(caixa);
    if (turno) {
      loadData(caixa, turno);
    }
  };

  const handleRetornarParaEdicao = async () => {
    if (!motivoRetorno.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo do retorno para edição.",
        variant: "destructive"
      });
      return;
    }

    try {
      await base44.entities.RascunhoPedidoVenda.update(pedidoSelecionado.id, {
        status: 'Retornado para Edição',
        motivo_retorno: motivoRetorno,
        data_retorno: new Date().toISOString()
      });

      toast({
        title: "✓ Retornado para edição",
        description: "O rascunho foi devolvido ao vendedor.",
        className: "bg-emerald-100 text-emerald-800"
      });

      setShowRetornoDialog(false);
      setIsDialogOpen(false);
      setMotivoRetorno('');
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFinalizarVenda = async () => {
    if (!pagamentoValido) {
      toast({
        title: "Pagamento insuficiente",
        description: `Falta R$ ${formatarValorExibicao(valorRestante)}`,
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    if (!contaCaixaPDV) {
      toast({
        title: "Conta de Caixa PDV não encontrada",
        description: "Não foi possível registrar o pagamento em dinheiro. Recarregue a página.",
        variant: "destructive"
      });
      return;
    }

    try {
      const pagamentosArray = [];

      if (pagamentosDinheiro > 0) {
        pagamentosArray.push({
          forma_pagamento: 'Dinheiro',
          valor: pagamentosDinheiro,
          parcelas: 1
        });
      }

      if (pagamentosPix > 0) {
        pagamentosArray.push({
          forma_pagamento: 'PIX',
          valor: pagamentosPix,
          parcelas: 1
        });
      }

      if (pagamentosDebito > 0) {
        pagamentosArray.push({
          forma_pagamento: 'Cartão de Débito',
          valor: pagamentosDebito,
          parcelas: 1
        });
      }

      if (pagamentosCredito > 0) {
        pagamentosArray.push({
          forma_pagamento: 'Cartão de Crédito',
          valor: pagamentosCredito,
          parcelas: parcelasCredito
        });
      }

      // Converter rascunho para PedidoVenda
      const todosPedidos = await base44.entities.PedidoVenda.list();
      const nextNumber = (todosPedidos.length > 0 ? Math.max(...todosPedidos.map((p) => parseInt(p.numero?.split('-')[1] || 0) || 0)) : 0) + 1;
      const numeroPedido = `PV-${String(nextNumber).padStart(5, '0')}`;

      const pedidoVenda = await base44.entities.PedidoVenda.create({
        numero: numeroPedido,
        senha_atendimento: pedidoSelecionado.senha_atendimento,
        cliente_id: pedidoSelecionado.cliente_id,
        cliente_nome: pedidoSelecionado.cliente_nome,
        vendedor_id: pedidoSelecionado.vendedor_id,
        vendedor_nome: pedidoSelecionado.vendedor_nome,
        tabela_preco_id: pedidoSelecionado.tabela_preco_id,
        tipo: pedidoSelecionado.tipo,
        status: 'Financeiro OK',
        metodo_entrega: pedidoSelecionado.metodo_entrega,
        turno_caixa_id: turnoAtivo?.id,
        itens: pedidoSelecionado.itens,
        subtotal: pedidoSelecionado.subtotal,
        valor_desconto: pedidoSelecionado.valor_desconto,
        valor_frete: pedidoSelecionado.valor_frete,
        valor_total: pedidoSelecionado.valor_total,
        pagamentos: pagamentosArray,
        observacoes: pedidoSelecionado.observacoes
      });

      // Atualizar turno com venda
      if (turnoAtivo) {
        await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
          vendas_ids: [...(turnoAtivo.vendas_ids || []), pedidoVenda.id]
        });
      }

      // Atualizar rascunho como convertido
      await base44.entities.RascunhoPedidoVenda.update(pedidoSelecionado.id, {
        status: 'Convertido',
        pedido_venda_final_id: pedidoVenda.id
      });

      // Criar movimentações de estoque para cada item vendido
      for (const item of pedidoSelecionado.itens) {
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: 'Saída',
          motivo: 'Venda',
          quantidade: item.quantidade,
          custo_unitario: item.custo_unitario_momento || 0,
          referencia_tipo: 'PedidoVenda',
          referencia_id: pedidoVenda.id,
          referencia_numero: numeroPedido,
          usuario_responsavel: currentUser.full_name
        });

        // Atualizar estoque do produto
        const produto = await base44.entities.Produto.get(item.produto_id);
        if (produto) {
          await base44.entities.Produto.update(item.produto_id, {
            estoque_atual: Math.max(0, (produto.estoque_atual || 0) - item.quantidade)
          });
        }
      }

      if (pagamentosDinheiro > 0 && contaCaixaPDV) {
        const novoSaldo = contaCaixaPDV.saldo_atual + pagamentosDinheiro;
        await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
          saldo_atual: novoSaldo
        });
        setContaCaixaPDV((prev) => ({ ...prev, saldo_atual: novoSaldo }));
      }

      // Buscar dados do cliente para o documento
      let cliente = null;
      if (pedidoSelecionado.cliente_id) {
        cliente = await base44.entities.Terceiro.get(pedidoSelecionado.cliente_id);
        setClienteVenda(cliente);
      }

      setVendaFinalizada({
        ...pedidoVenda,
        pagamentos: pagamentosArray
      });

      // Logic for Separation or Automatic Delivery
      if (configVenda) {
        if (configVenda.fluxo_venda_padrao === 'Completo') {
          // Create OrdemSeparacao
          await base44.entities.OrdemSeparacao.create({
            pedido_venda_id: pedidoVenda.id,
            pedido_numero: numeroPedido,
            status: 'Pendente',
            itens: pedidoSelecionado.itens.map((item) => ({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade_solicitada: item.quantidade,
              quantidade_separada: 0,
              custo_unitario_momento: item.custo_unitario_momento || 0
            }))
          });
          toast({ title: "Ordem de Separação Criada", description: "Enviado para o estoque." });
        } else if (configVenda.fluxo_venda_padrao === 'Balcao' && !configVenda.auto_delivery_balcao) {
























































































          // Logic for Balcao with manual delivery (Logistics) could go here
          // For now, we assume default behavior or simple completion
        }
      }

      toast({
        title: "✓ Pagamento aprovado!",
        description: "Venda finalizada com sucesso.",
        className: "bg-emerald-100 text-emerald-800",
        duration: 2000
      });

      setIsDialogOpen(false);
      setShowLiberacaoEntrega(true);
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAbrirMovimento = (tipo) => {
    if (!contaCaixaPDV) {
      toast({
        title: "Conta de Caixa PDV não encontrada",
        description: "Não foi possível realizar o movimento. Recarregue a página.",
        variant: "destructive"
      });
      return;
    }
    setTipoMovimento(tipo);
    setValorMovimento('');
    setObservacaoMovimento('');
    setMovimentoStep('obs');
    setShowMovimentoDialog(true);
  };

  const handleSalvarDespesaNum = async (valorStr) => {
    const valorFloat = parseFloat((valorStr || '0').replace(/\./g, '').replace(',', '.')) || 0;
    if (valorFloat <= 0 || !descricaoDespesa.trim()) return;
    try {
      const lancamento = await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: descricaoDespesa,
        valor: valorFloat,
        conta_financeira_id: contaCaixaPDV?.id,
        conta_financeira_nome: contaCaixaPDV?.nome,
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago',
        categoria: categoriaDespesa,
        turno_caixa_id: turnoAtivo?.id,
        observacoes: `Despesa registrada via PDV Caixa por ${currentUser?.full_name}`
      });
      if (turnoAtivo) {
        await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
          despesas_ids: [...(turnoAtivo.despesas_ids || []), lancamento.id]
        });
      }
      const novoSaldo = (contaCaixaPDV?.saldo_atual || 0) - valorFloat;
      await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: novoSaldo });
      setContaCaixaPDV(prev => ({ ...prev, saldo_atual: novoSaldo }));
      setDespesaCriada({ ...lancamento, descricao: descricaoDespesa, valor: valorFloat, categoria: categoriaDespesa });
      setShowDespesaDialog(false);
      setShowComprovanteDespesa(true);
      setDespesaStep('obs');
      setValorDespesaNum('');
      setValorDespesa('');
      setDescricaoDespesa('');
      setCategoriaDespesa('Outros');
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleSalvarDespesa = async () => {
    if (!valorDespesa || parseFloat(valorDespesa.replace(',', '.')) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero.",
        variant: "destructive"
      });
      return;
    }

    if (!descricaoDespesa.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Informe a descrição da despesa.",
        variant: "destructive"
      });
      return;
    }

    try {
      const valorFloat = parseFloat(valorDespesa.replace(',', '.'));

      // Criar lançamento financeiro
      const lancamento = await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: descricaoDespesa,
        valor: valorFloat,
        conta_financeira_id: contaCaixaPDV?.id,
        conta_financeira_nome: contaCaixaPDV?.nome,
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
        status: 'Pago',
        categoria: categoriaDespesa,
        turno_caixa_id: turnoAtivo?.id,
        observacoes: `Despesa registrada via PDV Caixa por ${currentUser?.full_name}`
      });

      // Atualizar turno com despesa
      if (turnoAtivo) {
        await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
          despesas_ids: [...(turnoAtivo.despesas_ids || []), lancamento.id]
        });
      }

      // Debitar do Caixa PDV
      const novoSaldo = (contaCaixaPDV?.saldo_atual || 0) - valorFloat;
      await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
        saldo_atual: novoSaldo
      });
      setContaCaixaPDV(prev => ({ ...prev, saldo_atual: novoSaldo }));

      toast({
        title: "✓ Despesa registrada!",
        description: `${descricaoDespesa} - ${formatValor(valorFloat)}`,
        className: "bg-emerald-100 text-emerald-800",
        duration: 2000
      });

      setShowDespesaDialog(false);
      setValorDespesa('');
      setDescricaoDespesa('');
      setCategoriaDespesa('Outros');
      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSalvarMovimento = async () => {
    if (!valorMovimento || parseFloat(valorMovimento.replace(/\./g, '').replace(',', '.')) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero.",
        variant: "destructive"
      });
      return;
    }

    if (!contaCaixaPDV) {
      toast({
        title: "Conta de Caixa PDV não encontrada",
        description: "Não foi possível identificar a conta do caixa.",
        variant: "destructive"
      });
      return;
    }

    try {
      const valorFloat = parseFloat(valorMovimento.replace(/\./g, '').replace(',', '.'));
      const todosMovimentos = await base44.entities.MovimentosCaixa.list();
      const nextNumber = (todosMovimentos.length > 0 ? Math.max(...todosMovimentos.map((m) => parseInt(m.numero?.split('-')[1] || 0) || 0)) : 0) + 1;
      const numeroMovimento = `MCX-${String(nextNumber).padStart(5, '0')}`;

      // Para Recolhimento de Caixa, buscar Caixa Geral
      if (tipoMovimento === 'Recolhimento de Caixa') {
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixaGeral = todasContas.find(c => c.is_caixa_geral);

      if (!caixaGeral) {
        toast({
          title: "Caixa Geral não encontrado",
          description: "Crie uma conta 'Caixa Geral' nas configurações.",
          variant: "destructive"
        });
        return;
      }

      // Criar movimento de saída do Caixa PDV
      const movimento = await base44.entities.MovimentosCaixa.create({
        numero: numeroMovimento,
        tipo: tipoMovimento,
        valor: valorFloat,
        observacao: `Transferência para ${caixaGeral.nome}${observacaoMovimento ? '. ' + observacaoMovimento : ''}`,
        conta_id: contaCaixaPDV.id,
        turno_caixa_id: turnoAtivo?.id,
        usuario_responsavel_id: currentUser.id,
        usuario_responsavel_nome: currentUser.full_name
      });

      // Atualizar turno com movimento
      if (turnoAtivo) {
        await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
          movimentos_ids: [...(turnoAtivo.movimentos_ids || []), movimento.id]
        });
      }

      // Atualizar saldos
      await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
        saldo_atual: contaCaixaPDV.saldo_atual - valorFloat
      });
      await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
        saldo_atual: caixaGeral.saldo_atual + valorFloat
      });

      setContaCaixaPDV(prev => ({ ...prev, saldo_atual: prev.saldo_atual - valorFloat }));
      setMovimentoCriado(movimento);
      } else {
      // Reforço
      const movimento = await base44.entities.MovimentosCaixa.create({
        numero: numeroMovimento,
        tipo: tipoMovimento,
        valor: valorFloat,
        observacao: observacaoMovimento,
        conta_id: contaCaixaPDV.id,
        turno_caixa_id: turnoAtivo?.id,
        usuario_responsavel_id: currentUser.id,
        usuario_responsavel_nome: currentUser.full_name
      });

      const novoSaldo = contaCaixaPDV.saldo_atual + valorFloat;

      await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
        saldo_atual: novoSaldo
      });

      setContaCaixaPDV((prev) => ({ ...prev, saldo_atual: novoSaldo }));
      setMovimentoCriado(movimento);

      // Atualizar turno com movimento
      if (turnoAtivo) {
        await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
          movimentos_ids: [...(turnoAtivo.movimentos_ids || []), movimento.id]
        });
      }
      }

      setShowMovimentoDialog(false);
      setShowComprovanteMovimento(true);

      toast({
        title: `✓ ${tipoMovimento} registrado!`,
        description: `Movimento ${numeroMovimento} realizado.`,
        className: "bg-emerald-100 text-emerald-800",
        duration: 2000
      });

      loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calcularTotalCedulas = () => {
    const total = (
      cedulas.nota200 * 200 +
      cedulas.nota100 * 100 +
      cedulas.nota50 * 50 +
      cedulas.nota20 * 20 +
      cedulas.nota10 * 10 +
      cedulas.nota5 * 5 +
      cedulas.nota2 * 2 +
      cedulas.moeda1 * 1 +
      cedulas.moeda050 * 0.50 +
      cedulas.moeda025 * 0.25 +
      cedulas.moeda010 * 0.10 +
      cedulas.moeda005 * 0.05
    );
    return total;
  };

  useEffect(() => {
    // Auto-preencher recebimentos: dinheiro = saldoAtual (valor esperado na gaveta); demais = valor das vendas
    setRecebimentosDinheiro(formatarValorExibicao(caixaData.saldoAtual));
    setRecebimentosPix(formatarValorExibicao(caixaData.recebimentos.pix));
    setRecebimentosCredito(formatarValorExibicao(caixaData.recebimentos.credito || 0));
    setRecebimentosDebito(formatarValorExibicao(caixaData.recebimentos.debito || 0));
  }, [caixaData]);

  const handleFecharCaixa = () => {
    const dinheiroContado = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || caixaData.recebimentos.dinheiro;
    const totalRecebimentos = dinheiroContado + caixaData.recebimentos.pix + caixaData.recebimentos.cartao;
    const diferenca = Math.abs(totalRecebimentos - caixaData.saldoAtual);
    
    if (diferenca > 0.01) {
      toast({
        title: "Valores não conferem",
        description: "Ajuste o valor de dinheiro antes de fechar o caixa.",
        variant: "destructive"
      });
      return;
    }
    
    setShowFechamentoDialog(true);
  };

  const formatValor = (valor) => {
    const num = valor || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // New helper functions for view navigation
  const handleProcessarVendas = () => {
    setView('processar');
  };

  const handleAbrirBalanco = () => {
    // Não faz nada, pois o balanço está sempre visível
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {showSeletorCaixa && (
        <SeletorCaixaPDV 
          open={showSeletorCaixa} 
          onSelect={handleSelecionarCaixa}
          currentUser={currentUser}
        />
      )}

      {/* Header Minimalista */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => window.location.href = '/'}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}>
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            {caixaSelecionado?.nome || 'Caixa'}
          </h1>
          {modoVisualizacao && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Somente visualização</p>
          )}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {format(new Date(), 'HH:mm')}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {!caixaSelecionado ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Monitor className="w-16 h-16 mx-auto mb-4" />
              <p>Selecione um caixa para continuar</p>
            </div>
          </div>
        ) : view === 'dashboard' &&
        <>
            {/* Desktop e Mobile - Sistema de Abas Unificado */}
            <div className="h-full flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="balanco" className="h-full flex flex-col">
                {/* KPIs Superiores - Apenas Desktop */}
                <div className="hidden md:block p-4 pb-0">
                  <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                     <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Saldo do Turno</div>
                     <div className="text-3xl font-bold text-gray-900 dark:text-white font-glacial">
                       {formatValor(caixaData.liquidez)}
                     </div>
                     <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Inicial + vendas + reforços − recolhimentos</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Dinheiro na Gaveta</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white font-glacial">
                        {formatValor(caixaData.saldoAtual)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Inicial + dinheiro vendas + reforços − recolhimentos</div>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation - Desktop */}
                <div className="hidden md:block border-b border-gray-100 dark:border-gray-700 px-4">
                  <TabsList className="h-auto bg-transparent border-0 gap-1 justify-start max-w-4xl mx-auto p-0">
                    <TabsTrigger value="balanco" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                      <PieChart className="w-4 h-4" />
                      <span className="text-sm">Balanço</span>
                    </TabsTrigger>
                    <TabsTrigger value="vendas" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                      <Receipt className="w-4 h-4" />
                      <span className="text-sm">Vendas</span>
                    </TabsTrigger>
                    <TabsTrigger value="movimentos" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm h-12 px-6 rounded-t-xl rounded-b-none border-0">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">Movimentos</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="balanco" className="flex-1 overflow-auto mt-0 p-4 data-[state=inactive]:hidden">
                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Movimentações do Turno */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">
                    Movimentações do Turno
                  </h3>
                  {/* Helper: row with label on left, value+eye aligned right */}
                  {(() => {
                    const ValorRow = ({ label, valor, color, onEye, eyeColor, eyeIconColor }) => (
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-1">
                          {onEye ? (
                            <button
                              onClick={onEye}
                              className={`p-1 rounded transition-colors flex-shrink-0 ${eyeColor || 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                              style={{ minWidth: '28px', minHeight: '28px' }}>
                              <Eye className={`w-4 h-4 ${eyeIconColor || 'text-gray-400 dark:text-gray-500'}`} />
                            </button>
                          ) : <div className="w-7" />}
                          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                        </div>
                        <span className={`text-base font-medium tabular-nums text-right ${color || 'text-gray-900 dark:text-gray-100'}`} style={{ minWidth: '110px' }}>
                          {formatValor(valor)}
                        </span>
                      </div>
                    );
                    return (
                      <div className="space-y-3">
                        <ValorRow label="Saldo Inicial" valor={caixaData.saldoInicial ?? turnoAtivo?.saldo_inicial ?? 0} />
                        <ValorRow label="Total Vendas" valor={caixaData.totalVendas} onEye={() => setShowVendasDialog(true)} />
                        <ValorRow label="Reforços" valor={caixaData.reforcos} onEye={() => setShowReforcosDialog(true)} />
                        <ValorRow label="Recolhimentos" valor={caixaData.sangrias} color="text-blue-600 dark:text-blue-400" onEye={() => setShowSangriasDialog(true)} eyeColor="hover:bg-blue-50 dark:hover:bg-blue-900/20" eyeIconColor="text-blue-500 dark:text-blue-400" />
                        <ValorRow label="Despesas" valor={caixaData.despesas} color="text-red-600 dark:text-red-400" onEye={() => setShowDespesasDialog(true)} eyeColor="hover:bg-red-50 dark:hover:bg-red-900/20" eyeIconColor="text-red-400 dark:text-red-500" />
                        <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Liquidez do Turno</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setShowSaldoConsolidadoDialog(true)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                                style={{ minWidth: '28px', minHeight: '28px' }}>
                                <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              </button>
                              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums" style={{ minWidth: '110px', textAlign: 'right' }}>
                                {formatValor(caixaData.liquidez)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                            Inicial + vendas + reforços − recolhimentos
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Recebimentos do Turno */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-gray-900 mb-4 text-base font-semibold dark:text-white font-glacial">
                    Recebimentos do Turno
                  </h3>
                  <div className="space-y-2">
                    {/* Dinheiro - campo editável clicável */}
                    <div
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      onClick={() => {
                        const el = document.getElementById('input-dinheiro-conferido');
                        el?.focus();
                        el?.select();
                      }}>
                      <div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Dinheiro</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">toque para conferir</p>
                      </div>
                      <input
                        id="input-dinheiro-conferido"
                        type="text"
                        inputMode="decimal"
                        value={recebimentosDinheiro}
                        onChange={(e) => setRecebimentosDinheiro(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-36 text-right text-lg font-bold bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white cursor-pointer"
                        placeholder={formatarValorExibicao(caixaData.recebimentos.dinheiro)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">PIX</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.pix)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Crédito</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.credito || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Cartão Débito</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.debito || 0)}
                      </span>
                    </div>

                    {/* Total e Diferença */}
                    <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      {(() => {
                        const dinheiroConferido = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                        const totalConferido = dinheiroConferido + caixaData.recebimentos.pix + (caixaData.recebimentos.credito || 0) + (caixaData.recebimentos.debito || 0);
                        // O esperado é a liquidez total (saldo inicial + todas as vendas + reforços − recolhimentos)
                        const esperado = caixaData.liquidez;
                        const diferenca = totalConferido - esperado;
                        const temDiferenca = Math.abs(diferenca) > 0.01;

                        return (
                          <>
                            <div className="flex items-center justify-between px-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Conferido</span>
                              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                                {formatValor(totalConferido)}
                              </span>
                            </div>
                            <div className={`p-4 rounded-xl transition-colors ${!temDiferenca ? 'bg-emerald-50 dark:bg-emerald-900/20' : diferenca > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${!temDiferenca ? 'text-emerald-700 dark:text-emerald-300' : diferenca > 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                                  {!temDiferenca ? '✓ Confere' : diferenca > 0 ? 'Sobrando' : 'Faltando'}
                                </span>
                                <span className={`text-2xl font-bold font-glacial ${!temDiferenca ? 'text-emerald-700 dark:text-emerald-300' : diferenca > 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                                  {!temDiferenca ? formatValor(0) : formatValor(Math.abs(diferenca))}
                                </span>
                              </div>
                              {temDiferenca && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Esperado: {formatValor(esperado)}
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                </div>
                </div>

                   {/* Fechamento inline no balanço */}
                   {!modoVisualizacao && (() => {
                     const dinheiroConferido = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                     const totalConferido = dinheiroConferido + caixaData.recebimentos.pix + (caixaData.recebimentos.credito || 0) + (caixaData.recebimentos.debito || 0);
                     const diferenca = totalConferido - caixaData.liquidez;
                     const temDiferenca = Math.abs(diferenca) > 0.01;
                     const imprimirRelatorio = () => {
                       // Vendas: linha principal + sub-linhas por forma de pagamento
                       const linhasVendas = vendasFinalizadas.map(v => {
                         const pagamentos = (v.pagamentos || []);
                         const subLinhas = pagamentos.length > 1
                           ? pagamentos.map(p => `<div style="display:flex;justify-content:space-between;padding:2px 0 2px 16px;font-size:10px;color:#6b7280"><span>${p.forma_pagamento}</span><span>R$ ${(p.valor||0).toFixed(2)}</span></div>`).join('')
                           : '';
                         const formasSingle = pagamentos.length === 1 ? ` · ${pagamentos[0].forma_pagamento} R$ ${(pagamentos[0].valor||0).toFixed(2)}` : '';
                         return `<div style="border-bottom:1px solid #f3f4f6;padding:5px 0">
                           <div style="display:flex;justify-content:space-between;font-size:11px">
                             <span>${v.numero} · ${v.cliente_nome} · ${new Date(v.created_date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}${formasSingle}</span>
                             <span style="font-weight:600;color:#059669;white-space:nowrap;margin-left:8px">+R$ ${(v.valor_total||0).toFixed(2)}</span>
                           </div>${subLinhas}</div>`;
                       }).join('');
                       // Reforços
                       const linhasReforcos = movimentos.filter(m => m.tipo === 'Reforço').map(m =>
                         `<div class="row"><span>${m.numero} · ${format(new Date(m.created_date),'HH:mm')}${m.observacao ? ' · ' + m.observacao : ''}</span><span style="color:#059669">+R$ ${(m.valor||0).toFixed(2)}</span></div>`
                       ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum reforço</p>';
                       // Recolhimentos
                       const linhasRecolhimentos = movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').map(m =>
                         `<div class="row"><span>${m.numero} · ${format(new Date(m.created_date),'HH:mm')}${m.observacao ? ' · ' + m.observacao : ''}</span><span style="color:#2563eb">-R$ ${(m.valor||0).toFixed(2)}</span></div>`
                       ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhum recolhimento</p>';
                       // Despesas
                       const linhasDespesas = (caixaData.despesasLista || []).map(d =>
                         `<div class="row"><span>${d.descricao} · ${d.created_date ? format(new Date(d.created_date),'HH:mm') : ''}</span><span style="color:#dc2626">-R$ ${(d.valor||0).toFixed(2)}</span></div>`
                       ).join('') || '<p style="color:#9ca3af;font-size:11px;margin:4px 0">Nenhuma despesa</p>';
                       
                       const pw = window.open('', '_blank', 'width=800,height=900');
                       pw.document.write(`<html><head><title>Relatório de Fechamento</title><style>
                         body{font-family:Inter,sans-serif;font-size:13px;padding:20px;max-width:700px;margin:0 auto}
                         h2{font-size:14px;font-weight:600;margin:14px 0 6px;color:#374151}
                         .row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}
                         .total{font-size:15px;font-weight:700}
                         .dashed{border-top:1px dashed #aaa;margin:8px 0}
                       </style></head><body>
                         <div style="text-align:center;margin-bottom:14px"><b style="font-size:16px">VAREJOSYNC</b><br/><span style="color:#9ca3af;font-size:11px">Relatório de Fechamento de Caixa</span></div>
                         <div class="dashed"></div>
                         <h2>Turno</h2>
                         <div class="row"><span>Número:</span><b>${turnoAtivo?.numero}</b></div>
                         <div class="row"><span>Abertura:</span><span>${turnoAtivo?.data_abertura ? new Date(turnoAtivo.data_abertura).toLocaleString('pt-BR') : '-'}</span></div>
                         <div class="row"><span>Fechamento:</span><span>${new Date().toLocaleString('pt-BR')}</span></div>
                         <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
                         <div class="dashed"></div>
                         <h2>Movimentações</h2>
                         <div class="row"><span>Saldo Inicial:</span><span>R$ ${(caixaData.saldoInicial||0).toFixed(2)}</span></div>
                         <div class="row"><span>+ Total Vendas:</span><span>R$ ${(caixaData.totalVendas||0).toFixed(2)}</span></div>
                         <div class="row"><span>+ Reforços:</span><span>R$ ${(caixaData.reforcos||0).toFixed(2)}</span></div>
                         <div class="row"><span>− Recolhimentos:</span><span>R$ ${(caixaData.sangrias||0).toFixed(2)}</span></div>
                         <div class="row"><span>− Despesas:</span><span>R$ ${(caixaData.despesas||0).toFixed(2)}</span></div>
                         <div class="dashed"></div>
                         <div class="row total"><span>Liquidez do Turno:</span><span>R$ ${(caixaData.liquidez||0).toFixed(2)}</span></div>
                         <div class="dashed"></div>
                         <h2>Recebimentos por Forma</h2>
                         <div class="row"><span>Dinheiro (gaveta):</span><span>R$ ${(caixaData.saldoAtual||0).toFixed(2)}</span></div>
                         <div class="row"><span>PIX:</span><span>R$ ${(caixaData.recebimentos?.pix||0).toFixed(2)}</span></div>
                         <div class="row"><span>Cartão Crédito:</span><span>R$ ${(caixaData.recebimentos?.credito||0).toFixed(2)}</span></div>
                         <div class="row"><span>Cartão Débito:</span><span>R$ ${(caixaData.recebimentos?.debito||0).toFixed(2)}</span></div>
                         <div class="dashed"></div>
                         <h2>Reforços do Turno</h2>
                         ${linhasReforcos}
                         <div class="dashed"></div>
                         <h2>Recolhimentos do Turno</h2>
                         ${linhasRecolhimentos}
                         <div class="dashed"></div>
                         <h2>Despesas do Turno</h2>
                         ${linhasDespesas}
                         <div class="dashed"></div>
                         <h2>Vendas do Turno (${vendasFinalizadas.length})</h2>
                         ${linhasVendas || '<p style="color:#9ca3af;font-size:11px">Nenhuma venda registrada</p>'}
                         <div class="dashed"></div>
                         <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:14px">Não é documento fiscal</p>
                       </body></html>`);
                       pw.document.close(); pw.focus();
                       setTimeout(() => { pw.print(); pw.close(); }, 300);
                     };
                     return (
                       <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm max-w-4xl mx-auto">
                         <div className="flex items-center justify-between mb-3">
                           <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fechamento de Caixa</h3>
                           {!temDiferenca ? (
                             <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valores conferem</span>
                           ) : (
                             <span className="text-xs text-red-500 dark:text-red-400">{diferenca > 0 ? 'Sobrando' : 'Faltando'} {formatValor(Math.abs(diferenca))}</span>
                           )}
                         </div>
                         <div className="flex gap-2">
                           <button onClick={imprimirRelatorio} className="flex-1 h-12 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium flex items-center justify-center gap-2 text-sm" style={{ minHeight: '48px' }}>
                             <Printer className="w-4 h-4" /> Imprimir
                           </button>
                           <button onClick={() => setShowFechamentoDialog(true)} className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm" style={{ minHeight: '48px' }}>
                             <Lock className="w-4 h-4" /> Fechar Caixa
                           </button>
                         </div>
                       </div>
                     );
                     })()}
                 </TabsContent>

                 <TabsContent value="vendas" className="flex-1 overflow-auto p-4 mt-0 space-y-3 data-[state=inactive]:hidden">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aguardando</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                        {rascunhosAguardando.length} {rascunhosAguardando.length === 1 ? 'Venda' : 'Vendas'}
                      </div>
                    </div>

                    {rascunhosAguardando.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                          <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                        </div>
                        <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda aguardando</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">As vendas aparecerão aqui</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {rascunhosAguardando.map((rascunho) => (
                          <div
                            key={rascunho.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleAbrirPedido(rascunho)}>
                            <div className="flex items-start justify-between gap-4 mb-3">
                              {rascunho.senha_atendimento && (
                                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Senha</div>
                                  <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{rascunho.senha_atendimento.slice(-4)}</div>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-medium text-gray-900 dark:text-white truncate">{rascunho.cliente_nome}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rascunho.vendedor_nome}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                                  R$ {formatarValorExibicao(rascunho.valor_total)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {rascunho.itens?.length || 0} {rascunho.itens?.length === 1 ? 'item' : 'itens'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(createPageUrl('PDV') + `?mode=vendedor&rascunho_id=${rascunho.id}`, '_blank');
                                }}
                                className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                style={{ minHeight: '48px' }}>
                                <Edit className="w-4 h-4" />
                                <span>Editar</span>
                              </button>
                              <button
                                className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:shadow-md transition-shadow"
                                style={{ minHeight: '48px' }}>
                                Confirmar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="movimentos" className="flex-1 overflow-auto p-4 mt-0 space-y-3 data-[state=inactive]:hidden">
                  <div className="max-w-4xl mx-auto space-y-3">
                    {/* Botões de ação */}
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleAbrirMovimento('Reforço')} disabled={modoVisualizacao}
                        className="h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1 disabled:opacity-40">
                        <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">Reforço</div>
                      </button>
                      <button onClick={() => handleAbrirMovimento('Recolhimento de Caixa')} disabled={modoVisualizacao}
                        className="h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1 disabled:opacity-40">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <Minus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">Recolhimento</div>
                      </button>
                      <button onClick={() => setShowDespesaDialog(true)} disabled={modoVisualizacao}
                        className="h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1 disabled:opacity-40">
                        <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">Despesa</div>
                      </button>
                    </div>

                    {/* Histórico cronológico de movimentos + despesas */}
                    {(() => {
                      const itensMovimentos = movimentos.map(m => ({
                        id: m.id,
                        tipo: m.tipo,
                        valor: m.valor,
                        descricao: m.observacao || m.tipo,
                        hora: m.created_date,
                        operador: m.usuario_responsavel_nome,
                        cor: m.tipo === 'Reforço' ? 'emerald' : 'blue',
                        icone: m.tipo === 'Reforço' ? '+' : '−',
                      }));
                      const itensDespesas = (caixaData.despesasLista || []).map(d => ({
                        id: d.id,
                        tipo: 'Despesa',
                        valor: d.valor,
                        descricao: d.descricao,
                        hora: d.created_date,
                        operador: null,
                        cor: 'red',
                        icone: '−',
                      }));
                      const todos = [...itensMovimentos, ...itensDespesas].sort((a, b) => new Date(a.hora) - new Date(b.hora));
                      if (todos.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-600">
                          <Wallet className="w-10 h-10 mb-2" />
                          <p className="text-sm">Nenhuma movimentação registrada</p>
                        </div>
                      );
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Histórico do turno</p>
                          {todos.map(item => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${item.cor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20' : item.cor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                {item.cor === 'emerald' ? <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : item.cor === 'blue' ? <Minus className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.descricao}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">{item.tipo} · {item.hora ? format(new Date(item.hora), 'HH:mm') : ''}</div>
                              </div>
                              <div className={`text-base font-bold tabular-nums font-glacial flex-shrink-0 ${item.cor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : item.cor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                {item.icone}{formatValor(item.valor)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>



                {/* Barra de Navegação - Mobile */}
                <TabsList className="md:hidden grid grid-cols-4 h-16 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-none p-0 flex-shrink-0">
                <TabsTrigger value="balanco" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
                <PieChart className="w-5 h-5" />
                <span className="text-xs">Balanço</span>
                </TabsTrigger>
                <TabsTrigger value="vendas" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-xs">Vendas</span>
                </TabsTrigger>
                <TabsTrigger value="movimentos" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-gray-700 h-full rounded-none border-0">
                <Wallet className="w-5 h-5" />
                <span className="text-xs">Movimentos</span>
                </TabsTrigger>
                {/* Botão Fechar Caixa - só ativo na aba balanço */}
                <button
                  disabled={activeTab !== 'balanco' || modoVisualizacao}
                  onClick={async () => {
                    const dinheiroConferido = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                    const totalConferido = dinheiroConferido + caixaData.recebimentos.pix + (caixaData.recebimentos.credito || 0) + (caixaData.recebimentos.debito || 0);
                    const diferenca = totalConferido - caixaData.liquidez;
                    if (Math.abs(diferenca) > 0.01) {
                      toast({ title: "Valores não conferem", description: `${diferenca > 0 ? 'Sobrando' : 'Faltando'} ${formatValor(Math.abs(diferenca))}`, variant: "destructive" });
                      return;
                    }
                    try {
                      await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
                        data_fechamento: new Date().toISOString(),
                        usuario_fechamento_id: currentUser.id,
                        usuario_fechamento_nome: currentUser.full_name,
                        saldo_final: caixaData.saldoAtual,
                        total_vendas: caixaData.totalVendas,
                        total_reforcos: caixaData.reforcos,
                        total_sangrias: caixaData.sangrias,
                        recebimentos_dinheiro: caixaData.recebimentos.dinheiro,
                        recebimentos_pix: caixaData.recebimentos.pix,
                        recebimentos_credito: caixaData.recebimentos.credito || 0,
                        recebimentos_debito: caixaData.recebimentos.debito || 0,
                        dinheiro_conferido: dinheiroConferido,
                        diferenca: diferenca,
                        status: 'Fechado'
                      });
                      const todasContas = await base44.entities.ContasFinanceiras.list();
                      const caixaGeral = todasContas.find(c => c.is_caixa_geral === true);
                      if (caixaGeral && dinheiroConferido > 0) {
                        await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, { saldo_atual: 0 });
                        await base44.entities.ContasFinanceiras.update(caixaGeral.id, { saldo_atual: caixaGeral.saldo_atual + dinheiroConferido });
                        await base44.entities.MovimentosCaixa.create({
                          numero: `MCX-${String(Date.now()).slice(-5)}`,
                          tipo: 'Sangria',
                          valor: dinheiroConferido,
                          observacao: `Fechamento de turno ${turnoAtivo.numero} - Transferido para ${caixaGeral.nome}`,
                          conta_id: contaCaixaPDV.id,
                          turno_caixa_id: turnoAtivo.id,
                          usuario_responsavel_id: currentUser.id,
                          usuario_responsavel_nome: currentUser.full_name
                        });
                      }
                      toast({ title: "✓ Caixa fechado!", description: "Turno encerrado.", className: "bg-emerald-100 text-emerald-800" });
                      setShowSeletorCaixa(true);
                      setTurnoAtivo(null);
                      setCaixaSelecionado(null);
                    } catch (error) {
                      toast({ title: "Erro ao fechar caixa", description: error.message, variant: "destructive" });
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1 h-full rounded-none border-0 transition-colors ${activeTab === 'balanco' && !modoVisualizacao ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="text-xs">Fechar</span>
                </button>
                </TabsList>
                </Tabs>
                </div>
                </>
                }



        {view === 'processar' &&
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header da View */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Processar Vendas</h2>
              <button
                onClick={() => { loadData(); toast({ title: "✓ Atualizado!", className: "bg-emerald-100 text-emerald-800", duration: 1000 }); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Atualizar (F7)">
                <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aguardando</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                    {rascunhosAguardando.length} {rascunhosAguardando.length === 1 ? 'Venda' : 'Vendas'}
                  </div>
                </div>

                {rascunhosAguardando.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda aguardando</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">As vendas aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rascunhosAguardando.map((rascunho) => (
                      <div
                        key={rascunho.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleAbrirPedido(rascunho)}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          {rascunho.senha_atendimento && (
                            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Senha</div>
                              <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{rascunho.senha_atendimento.slice(-4)}</div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-medium text-gray-900 dark:text-white truncate">{rascunho.cliente_nome}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rascunho.vendedor_nome}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                              R$ {formatarValorExibicao(rascunho.valor_total)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {rascunho.itens?.length || 0} {rascunho.itens?.length === 1 ? 'item' : 'itens'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(createPageUrl('PDV') + `?mode=vendedor&rascunho_id=${rascunho.id}`, '_blank');
                            }}
                            className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                            style={{ minHeight: '48px' }}>
                            <Edit className="w-4 h-4" />
                            <span>Editar</span>
                          </button>
                          <button
                            className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:shadow-md transition-shadow"
                            style={{ minHeight: '48px' }}>
                            Confirmar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        }



        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">Confirmar Pagamento</DialogTitle>
            </DialogHeader>
            {pedidoSelecionado &&
            <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Pedido</div>
                      <div className="font-bold text-lg text-gray-800 dark:text-gray-200">{pedidoSelecionado.numero}</div>
                    </div>
                    {pedidoSelecionado.senha_atendimento &&
                  <div className="text-center px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Senha</div>
                        <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono">{pedidoSelecionado.senha_atendimento}</div>
                      </div>
                  }
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{pedidoSelecionado.cliente_nome}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">Vendedor: {pedidoSelecionado.vendedor_nome}</div>
                  <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 mt-3">
                    {formatValor(pedidoSelecionado.valor_total)}
                  </div>
                </div>
                
                {/* Detalhes dos Itens */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Itens da Venda</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {pedidoSelecionado.itens?.map((item, idx) =>
                  <div key={idx} className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.produto_nome}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.quantidade} × R$ {item.preco_unitario_praticado?.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            R$ {item.total?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                  )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">SUBTOTAL</span>
                      <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                        R$ {(pedidoSelecionado.subtotal || pedidoSelecionado.valor_total)?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Formas de Pagamento - Clean Style */}
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Formas de Pagamento
                  </p>
                  
                  <div className="space-y-1">
                    {/* Dinheiro */}
                    <div
                    className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 0 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                    onClick={() => {
                      setFormaPagamentoAtiva(0);
                      inputRefs.dinheiro.current?.focus();
                    }}>

                      <div className="flex items-center gap-3">
                        <Banknote className="w-5 h-5 text-gray-400" />
                        <span className="text-base text-gray-700 dark:text-gray-300">Dinheiro</span>
                      </div>
                      <input
                      ref={inputRefs.dinheiro}
                      type="text"
                      inputMode="numeric"
                      value={inputDinheiro}
                      onChange={() => {}}
                      onKeyDown={(e) => handleInputMascara(e, setInputDinheiro, setPagamentosDinheiro)}
                      onFocus={(e) => {
                        e.target.select();
                        setFormaPagamentoAtiva(0);
                      }}
                      className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />

                    </div>

                    {/* PIX */}
                    <div
                    className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 1 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                    onClick={() => {
                      setFormaPagamentoAtiva(1);
                      inputRefs.pix.current?.focus();
                    }}>

                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <span className="text-base text-gray-700 dark:text-gray-300">PIX</span>
                      </div>
                      <input
                      ref={inputRefs.pix}
                      type="text"
                      inputMode="numeric"
                      value={inputPix}
                      onChange={() => {}}
                      onKeyDown={(e) => handleInputMascara(e, setInputPix, setPagamentosPix)}
                      onFocus={(e) => {
                        e.target.select();
                        setFormaPagamentoAtiva(1);
                      }}
                      className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />

                    </div>

                    {/* Cartão Débito */}
                    <div
                    className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 2 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                    onClick={() => {
                      setFormaPagamentoAtiva(2);
                      inputRefs.debito.current?.focus();
                    }}>

                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <span className="text-base text-gray-700 dark:text-gray-300">Cartão Débito</span>
                      </div>
                      <input
                      ref={inputRefs.debito}
                      type="text"
                      inputMode="numeric"
                      value={inputDebito}
                      onChange={() => {}}
                      onKeyDown={(e) => handleInputMascara(e, setInputDebito, setPagamentosDebito)}
                      onFocus={(e) => {
                        e.target.select();
                        setFormaPagamentoAtiva(2);
                      }}
                      className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />

                    </div>

                    {/* Cartão Crédito */}
                    <div
                    className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 3 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                    onClick={() => {
                      setFormaPagamentoAtiva(3);
                      inputRefs.credito.current?.focus();
                    }}>

                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <span className="text-base text-gray-700 dark:text-gray-300">Cartão Crédito</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                        ref={inputRefs.credito}
                        type="text"
                        inputMode="numeric"
                        value={inputCredito}
                        onChange={() => {}}
                        onKeyDown={(e) => handleInputMascara(e, setInputCredito, setPagamentosCredito)}
                        onFocus={(e) => {
                          e.target.select();
                          setFormaPagamentoAtiva(3);
                        }}
                        className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />

                        {pagamentosCredito > 0 &&
                      <Select value={parcelasCredito.toString()} onValueChange={(v) => setParcelasCredito(parseInt(v))}>
                            <SelectTrigger className="w-16 h-10 bg-transparent border-0 focus:ring-0 text-gray-700 dark:text-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                              {[...Array(12)].map((_, i) =>
                          <SelectItem key={i + 1} value={(i + 1).toString()} className="dark:hover:bg-gray-700">
                                  {i + 1}x
                                </SelectItem>
                          )}
                            </SelectContent>
                          </Select>
                      }
                      </div>
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-500 dark:text-gray-400">Total a Pagar</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">R$ {formatarValorExibicao(pedidoSelecionado.valor_total)}</span>
                    </div>
                    {troco > 0 &&
                  <div className="flex justify-between text-lg font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">Troco</span>
                        <span className="text-emerald-600 dark:text-emerald-400">R$ {formatarValorExibicao(troco)}</span>
                      </div>
                  }
                    {valorRestante > 0.01 &&
                  <div className="flex justify-between text-base">
                        <span className="text-gray-500 dark:text-gray-400">Falta</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">R$ {formatarValorExibicao(valorRestante)}</span>
                      </div>
                  }
                    
                    {pagamentoValido &&
                  <p className="text-sm text-center text-gray-400 pt-3">
                        ↵ Enter para aprovar
                      </p>
                  }
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                  variant="outline"
                  onClick={() => setShowRetornoDialog(true)}
                  className="flex-1 h-12 gap-2 border-gray-300 dark:border-gray-600">
                    <Edit className="w-4 h-4" />
                    Retornar para Edição
                  </Button>
                  <Button
                  onClick={handleFinalizarVenda}
                  disabled={!pagamentoValido}
                  className="flex-1 h-14 text-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Aprovar {pagamentoValido && '(Enter)'}
                  </Button>
                </div>
              </div>
            }
          </DialogContent>
        </Dialog>

        {/* Dialog Movimento - Estilo PDV fullscreen mobile com steps */}
        <Dialog open={showMovimentoDialog} onOpenChange={(open) => { if (!open) setShowMovimentoDialog(false); }}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => {
                  if (movimentoStep === 'valor') { setMovimentoStep('obs'); } 
                  else { setShowMovimentoDialog(false); }
                }}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                {tipoMovimento === 'Reforço' ? 'Reforço de Caixa' : 'Recolhimento de Caixa'}
              </h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col p-5 gap-4">
              {movimentoStep === 'obs' && (
              <>
              {/* Info da conta */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tipoMovimento === 'Reforço' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    {tipoMovimento === 'Reforço'
                      ? <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{contaCaixaPDV?.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tipoMovimento === 'Recolhimento de Caixa' ? 'Valor será transferido para Caixa Geral' : 'Valor será creditado neste caixa'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observação */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Observação (opcional)</label>
                <textarea
                  ref={obsMovimentoRef}
                  autoFocus
                  rows={4}
                  placeholder="Motivo ou observação..."
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setMovimentoStep('valor');
                      setTimeout(() => valorMovimentoRef.current?.focus(), 100);
                    }
                  }}
                  className="w-full resize-none bg-transparent border-0 focus:outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>

              <button
                onClick={() => {
                  setMovimentoStep('valor');
                  setTimeout(() => valorMovimentoRef.current?.focus(), 100);
                }}
                className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                style={{ minHeight: '56px' }}>
                Próximo →
              </button>
              </>
              )}

              {movimentoStep === 'valor' && (
                <>
                  {/* Display valor grande */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-2 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Valor do {tipoMovimento}</div>
                    <div className="text-5xl font-bold text-gray-900 dark:text-white font-glacial">
                      R$ {valorMovimento || '0,00'}
                    </div>
                    <input
                      ref={valorMovimentoRef}
                      type="text"
                      inputMode="numeric"
                      value={valorMovimento}
                      onChange={() => {}}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const valorFloat = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
                          if (valorFloat <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                          handleSalvarMovimento();
                          return;
                        }
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          let nums = valorMovimento.replace(/\D/g, '');
                          nums = nums.slice(0, -1) || '0';
                          const v = parseInt(nums) / 100;
                          setValorMovimento(formatarValorExibicao(v));
                          return;
                        }
                        if (/^\d$/.test(e.key)) {
                          e.preventDefault();
                          let nums = (valorMovimento || '0,00').replace(/\D/g, '') + e.key;
                          const v = parseInt(nums) / 100;
                          setValorMovimento(formatarValorExibicao(v));
                        }
                      }}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Digite o valor acima</div>
                  </div>

                  {/* Teclado numérico visual */}
                  <div className="grid grid-cols-3 gap-3">
                    {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === '⌫') {
                            let nums = (valorMovimento || '0,00').replace(/\D/g, '');
                            nums = nums.slice(0, -1) || '0';
                            const v = parseInt(nums) / 100;
                            setValorMovimento(formatarValorExibicao(v));
                          } else {
                            const digits = key === '000' ? '000' : key;
                            let nums = (valorMovimento || '0,00').replace(/\D/g, '') + digits;
                            // limit to prevent overflow
                            if (nums.length > 10) return;
                            const v = parseInt(nums) / 100;
                            setValorMovimento(formatarValorExibicao(v));
                          }
                        }}
                        className={`h-14 rounded-2xl text-xl font-semibold transition-colors ${key === '⌫' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'}`}
                        style={{ minHeight: '56px' }}>
                        {key}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={async () => {
                      const valorFloat = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
                      if (valorFloat <= 0) {
                        toast({ title: "Informe um valor maior que zero.", variant: "destructive" });
                        return;
                      }
                      // Temporariamente atualize valorMovimento para o float text antes de salvar
                      await handleSalvarMovimento();
                    }}
                    className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    style={{ minHeight: '56px' }}>
                    Confirmar
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Comprovante Movimento - Cupom fullscreen */}
        <Dialog open={showComprovanteMovimento} onOpenChange={setShowComprovanteMovimento}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button onClick={() => setShowComprovanteMovimento(false)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Comprovante</h2>
              <button
                onClick={() => {
                  const w = window.open('', '_blank', 'width=400,height=600');
                  w.document.write(`<html><head><title>Comprovante</title>
                    <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
                    .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:22px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
                    </style></head><body>
                    <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de ${movimentoCriado?.tipo}</small></div>
                    <div class="dashed"></div>
                    <div class="row"><span>Movimento:</span><b>${movimentoCriado?.numero || 'S/N'}</b></div>
                    <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                    <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
                    <div class="row"><span>Tipo:</span><b>${movimentoCriado?.tipo}</b></div>
                    <div class="dashed"></div>
                    <div class="row big"><span>VALOR:</span><span>${movimentoCriado?.tipo === 'Reforço' ? '+' : '-'}R$ ${(movimentoCriado?.valor || 0).toFixed(2).replace('.', ',')}</span></div>
                    <div class="dashed"></div>
                    ${movimentoCriado?.observacao ? `<p><small>Obs: ${movimentoCriado.observacao}</small></p>` : ''}
                    <div class="center"><small>Não é comprovante fiscal</small></div>
                    </body></html>`);
                  w.document.close(); w.focus();
                  setTimeout(() => { w.print(); w.close(); }, 300);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {/* Cupom visual */}
              <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden" style={{ fontFamily: 'Courier New, monospace' }}>
                {/* Topo do cupom */}
                <div className="px-6 py-5 text-center border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                  <div className="text-base font-bold text-gray-900 dark:text-white">VAREJOSYNC</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Comprovante de {movimentoCriado?.tipo}</div>
                </div>

                <div className="px-6 py-4 space-y-2">
                  {[
                    { l: 'Movimento', v: movimentoCriado?.numero || 'S/N' },
                    { l: 'Data/Hora', v: format(new Date(), 'dd/MM/yyyy HH:mm') },
                    { l: 'Operador', v: currentUser?.full_name },
                    { l: 'Tipo', v: movimentoCriado?.tipo },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{l}:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">VALOR</span>
                    <span className={`text-2xl font-bold font-glacial ${movimentoCriado?.tipo === 'Reforço' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {movimentoCriado?.tipo === 'Reforço' ? '+' : '−'}{formatValor(movimentoCriado?.valor)}
                    </span>
                  </div>
                </div>

                {movimentoCriado?.observacao && (
                  <div className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-400">Obs: </span>{movimentoCriado.observacao}
                  </div>
                )}

                <div className="px-6 py-4 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Não é comprovante fiscal</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => setShowComprovanteMovimento(false)}
                  className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-medium"
                  style={{ minHeight: '48px' }}>
                  Fechar
                </button>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank', 'width=400,height=600');
                    w.document.write(`<html><head><title>Comprovante</title>
                      <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
                      .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:22px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
                      </style></head><body>
                      <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de ${movimentoCriado?.tipo}</small></div>
                      <div class="dashed"></div>
                      <div class="row"><span>Movimento:</span><b>${movimentoCriado?.numero || 'S/N'}</b></div>
                      <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                      <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
                      <div class="row"><span>Tipo:</span><b>${movimentoCriado?.tipo}</b></div>
                      <div class="dashed"></div>
                      <div class="row big"><span>VALOR:</span><span>${movimentoCriado?.tipo === 'Reforço' ? '+' : '-'}R$ ${(movimentoCriado?.valor || 0).toFixed(2).replace('.', ',')}</span></div>
                      <div class="dashed"></div>
                      ${movimentoCriado?.observacao ? `<p><small>Obs: ${movimentoCriado.observacao}</small></p>` : ''}
                      <div class="center"><small>Não é comprovante fiscal</small></div>
                      </body></html>`);
                    w.document.close(); w.focus();
                    setTimeout(() => { w.print(); w.close(); }, 300);
                  }}
                  className={`flex-1 h-12 rounded-2xl font-medium text-white ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                  style={{ minHeight: '48px' }}>
                  <span className="flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimir</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFechamentoDialog} onOpenChange={setShowFechamentoDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                Conferência e Fechamento de Caixa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Coluna Esquerda: Saldo Esperado */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Movimentações do Turno</h3>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Saldo Inicial:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(contaCaixaPDV?.saldo_inicial || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Vendas Dinheiro:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(caixaData.recebimentos.dinheiro)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Reforços:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(caixaData.reforcos)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>- Recolhimentos:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{formatValor(caixaData.sangrias)}</span>
                    </div>
                    <div className="border-t pt-2 border-gray-200 dark:border-gray-700 flex justify-between">
                      <span className="font-semibold">Saldo Esperado:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{formatValor(caixaData.saldoAtual)}</span>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Recebimentos Contados */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Recebimentos Conferidos</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
                        <span>Dinheiro (editável) *</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCalculadoraCedulas(true)}
                          className="h-6 px-2 text-xs">
                          <Keyboard className="w-3 h-3 mr-1" />
                          Calculadora
                        </Button>
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={recebimentosDinheiro}
                        onChange={(e) => {
                          const valor = e.target.value;
                          setRecebimentosDinheiro(valor);
                        }}
                        className="h-9 text-sm font-bold text-right dark:bg-gray-700 dark:text-gray-200 border-blue-300 dark:border-blue-600"
                        placeholder="0,00"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">PIX</Label>
                      <Input
                        type="text"
                        value={recebimentosPix}
                        readOnly
                        className="h-9 text-sm font-bold text-right bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Cartão Crédito</Label>
                      <Input
                        type="text"
                        value={recebimentosCredito}
                        readOnly
                        className="h-9 text-sm font-bold text-right bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Cartão Débito</Label>
                      <Input
                        type="text"
                        value={recebimentosDebito}
                        readOnly
                        className="h-9 text-sm font-bold text-right bg-gray-100 dark:bg-gray-700 dark:text-gray-400"
                      />
                    </div>
                    <div className="border-t pt-2 border-blue-200 dark:border-blue-700 space-y-2">
                      {(() => {
                        const dinheiroNum = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                        const pixNum = parseFloat(recebimentosPix.replace(/\./g, '').replace(',', '.')) || 0;
                        const creditoNum = parseFloat(recebimentosCredito.replace(/\./g, '').replace(',', '.')) || 0;
                        const debitoNum = parseFloat(recebimentosDebito.replace(/\./g, '').replace(',', '.')) || 0;
                        const totalRecebimentos = dinheiroNum + pixNum + creditoNum + debitoNum;
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Total Informado:</span>
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatValor(caixaData.saldoAtual)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Total Real:</span>
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">{formatValor(totalRecebimentos)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Validação e Saldo */}
              {(() => {
                const dinheiroNum = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                const pixNum = parseFloat(recebimentosPix.replace(/\./g, '').replace(',', '.')) || 0;
                const creditoNum = parseFloat(recebimentosCredito.replace(/\./g, '').replace(',', '.')) || 0;
                const debitoNum = parseFloat(recebimentosDebito.replace(/\./g, '').replace(',', '.')) || 0;
                const totalRecebimentos = dinheiroNum + pixNum + creditoNum + debitoNum;
                const diferenca = totalRecebimentos - caixaData.liquidez;
                     const temDiferenca = Math.abs(diferenca) > 0.01;

                     return (
                       <div className="space-y-3">
                         {/* Indicador de Saldo */}
                         <div className={`p-4 rounded-lg border-2 ${!temDiferenca ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20 dark:border-emerald-500' : (diferenca > 0 ? 'bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-400' : 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500')}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status do Saldo</div>
                          {!temDiferenca ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Valores Conferem</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className={`w-6 h-6 ${diferenca > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} />
                              <div>
                                <span className={`text-lg font-bold ${diferenca > 0 ? 'text-yellow-900 dark:text-yellow-200' : 'text-red-900 dark:text-red-200'}`}>
                                  {diferenca > 0 ? 'Sobrando' : 'Faltando'}
                                </span>
                                <p className={`text-xs ${diferenca > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                                  Diferença detectada
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        {temDiferenca && (
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${diferenca > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                              {formatValor(Math.abs(diferenca))}
                            </div>
                            <div className={`text-xs ${diferenca > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                              Diferença
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mensagem de Bloqueio */}
                    {temDiferenca && (
                      <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                        ⚠️ Ajuste os valores para poder fechar o caixa
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowFechamentoDialog(false);
                    setRecebimentosDinheiro('');
                  }} 
                  className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    const dinheiroNum = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                    const pixNum = parseFloat(recebimentosPix.replace(/\./g, '').replace(',', '.')) || 0;
                    const creditoNum = parseFloat(recebimentosCredito.replace(/\./g, '').replace(',', '.')) || 0;
                    const debitoNum = parseFloat(recebimentosDebito.replace(/\./g, '').replace(',', '.')) || 0;
                    const totalRecebimentos = dinheiroNum + pixNum + creditoNum + debitoNum;
                    const diferenca = totalRecebimentos - caixaData.liquidez;

                    if (Math.abs(diferenca) > 0.01) {
                      toast({
                        title: "Erro ao fechar caixa",
                        description: "Os valores não conferem.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    try {
                      // Atualizar turno com dados de fechamento
                      await base44.entities.TurnoCaixa.update(turnoAtivo.id, {
                        data_fechamento: new Date().toISOString(),
                        usuario_fechamento_id: currentUser.id,
                        usuario_fechamento_nome: currentUser.full_name,
                        saldo_final: caixaData.saldoAtual,
                        total_vendas: caixaData.totalVendas,
                        total_reforcos: caixaData.reforcos,
                        total_sangrias: caixaData.sangrias,
                        recebimentos_dinheiro: caixaData.recebimentos.dinheiro,
                        recebimentos_pix: caixaData.recebimentos.pix,
                        recebimentos_credito: caixaData.recebimentos.credito || 0,
                        recebimentos_debito: caixaData.recebimentos.debito || 0,
                        dinheiro_conferido: dinheiroNum,
                        diferenca: diferenca,
                        status: 'Fechado'
                      });

                      // Transferir saldo para Caixa Geral
                      const todasContas = await base44.entities.ContasFinanceiras.list();
                      const caixaGeral = todasContas.find(c => c.is_caixa_geral === true);
                      
                      if (caixaGeral && dinheiroNum > 0) {
                        // Zerar Caixa PDV
                        await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
                          saldo_atual: 0
                        });

                        // Creditar no Caixa Geral
                        await base44.entities.ContasFinanceiras.update(caixaGeral.id, {
                          saldo_atual: caixaGeral.saldo_atual + dinheiroNum
                        });

                        // Criar movimento de transferência no histórico
                        const numeroMovimento = `MCX-${String(Date.now()).slice(-5)}`;
                        await base44.entities.MovimentosCaixa.create({
                          numero: numeroMovimento,
                          tipo: 'Sangria',
                          valor: dinheiroNum,
                          observacao: `Fechamento de turno ${turnoAtivo.numero} - Transferido para ${caixaGeral.nome}`,
                          conta_id: contaCaixaPDV.id,
                          turno_caixa_id: turnoAtivo.id,
                          usuario_responsavel_id: currentUser.id,
                          usuario_responsavel_nome: currentUser.full_name
                        });
                      }

                      toast({
                        title: "✓ Caixa fechado!",
                        description: "Turno encerrado e valores transferidos para Caixa Geral.",
                        className: "bg-emerald-100 text-emerald-800"
                      });
                      
                      setShowFechamentoDialog(false);
                      setRecebimentosDinheiro('');
                      setCedulas({
                        nota200: 0,
                        nota100: 0,
                        nota50: 0,
                        nota20: 0,
                        nota10: 0,
                        nota5: 0,
                        nota2: 0,
                        moeda1: 0,
                        moeda050: 0,
                        moeda025: 0,
                        moeda010: 0,
                        moeda005: 0
                      });
                      
                      // Recarregar dados para iniciar novo turno
                      setShowSeletorCaixa(true);
                      setTurnoAtivo(null);
                      setCaixaSelecionado(null);
                    } catch (error) {
                      toast({
                        title: "Erro ao fechar caixa",
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={(() => {
                    if (!recebimentosDinheiro) return true;
                    const dinheiroNum = parseFloat(recebimentosDinheiro.replace(/\./g, '').replace(',', '.')) || 0;
                    const pixNum = parseFloat(recebimentosPix.replace(/\./g, '').replace(',', '.')) || 0;
                    const creditoNum = parseFloat(recebimentosCredito.replace(/\./g, '').replace(',', '.')) || 0;
                    const debitoNum = parseFloat(recebimentosDebito.replace(/\./g, '').replace(',', '.')) || 0;
                    const totalRecebimentos = dinheiroNum + pixNum + creditoNum + debitoNum;
                    const diferenca = Math.abs(totalRecebimentos - caixaData.liquidez);
                    return diferenca > 0.01;
                  })()}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50">
                  Confirmar Fechamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Calculadora de Cédulas/Moedas */}
        <Dialog open={showCalculadoraCedulas} onOpenChange={setShowCalculadoraCedulas}>
          <DialogContent className="max-w-md dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">Calculadora de Cédulas e Moedas</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Notas */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notas</h4>
                {[
                  { key: 'nota200', label: 'R$ 200,00', valor: 200 },
                  { key: 'nota100', label: 'R$ 100,00', valor: 100 },
                  { key: 'nota50', label: 'R$ 50,00', valor: 50 },
                  { key: 'nota20', label: 'R$ 20,00', valor: 20 },
                  { key: 'nota10', label: 'R$ 10,00', valor: 10 },
                  { key: 'nota5', label: 'R$ 5,00', valor: 5 },
                  { key: 'nota2', label: 'R$ 2,00', valor: 2 }
                ].map(({ key, label, valor }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-24">{label}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCedulas(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                        className="h-8 w-8 p-0">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={cedulas[key]}
                        onChange={(e) => setCedulas(prev => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="h-8 w-16 text-center dark:bg-gray-700"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCedulas(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                        className="h-8 w-8 p-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">
                        {formatValor(cedulas[key] * valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Moedas */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Moedas</h4>
                {[
                  { key: 'moeda1', label: 'R$ 1,00', valor: 1 },
                  { key: 'moeda050', label: 'R$ 0,50', valor: 0.50 },
                  { key: 'moeda025', label: 'R$ 0,25', valor: 0.25 },
                  { key: 'moeda010', label: 'R$ 0,10', valor: 0.10 },
                  { key: 'moeda005', label: 'R$ 0,05', valor: 0.05 }
                ].map(({ key, label, valor }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-24">{label}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCedulas(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                        className="h-8 w-8 p-0">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={cedulas[key]}
                        onChange={(e) => setCedulas(prev => ({ ...prev, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="h-8 w-16 text-center dark:bg-gray-700"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCedulas(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                        className="h-8 w-8 p-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">
                        {formatValor(cedulas[key] * valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Total Calculado:</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatValor(calcularTotalCedulas())}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCalculadoraCedulas(false)}
                  className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setRecebimentosDinheiro(formatarValorExibicao(calcularTotalCedulas()));
                    setShowCalculadoraCedulas(false);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Documento de Liberação para Entrega */}
        <LiberacaoEntrega
          open={showLiberacaoEntrega}
          onClose={() => setShowLiberacaoEntrega(false)}
          pedido={vendaFinalizada}
          cliente={clienteVenda} />

        {/* Dialog de Vendas - Estilo PDV Glacial */}
        <Dialog open={showVendasDialog} onOpenChange={setShowVendasDialog}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header Glacial */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => setShowVendasDialog(false)}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                Vendas do Turno
              </h2>
              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors print:hidden"
                style={{ minWidth: '44px', minHeight: '44px' }}
                title="Imprimir extrato">
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {vendasFinalizadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda registrada</p>
                </div>
              ) : (
                <>
                  {/* Desktop - Cards Glacial */}
                  <div className="hidden md:block">
                    <div className="grid gap-3 max-w-4xl mx-auto">
                      {vendasFinalizadas.map((venda) => (
                        <div key={venda.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{venda.numero}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(venda.created_date), 'HH:mm')}</span>
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{venda.vendedor_nome}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-1">
                                {formatValor(venda.valor_total)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{venda.itens?.length || 0} itens</div>
                            </div>
                            <button
                              onClick={() => setVendaDetalhada(venda)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              style={{ minWidth: '40px', minHeight: '40px' }}>
                              <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile - Cards Glacial */}
                  <div className="md:hidden space-y-3">
                    {vendasFinalizadas.map((venda) => (
                      <div key={venda.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{venda.numero}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(venda.created_date), 'HH:mm')}</div>
                          </div>
                          <button
                            onClick={() => setVendaDetalhada(venda)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            style={{ minWidth: '40px', minHeight: '40px' }}>
                            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{venda.vendedor_nome}</div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{venda.itens?.length || 0} itens</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial">
                            {formatValor(venda.valor_total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Remove old table code */}
                  <div className="hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Vendedor</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead className="text-right">Itens</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendasFinalizadas.map((venda) => (
                          <TableRow key={venda.id}>
                            <TableCell className="font-medium">{venda.numero}</TableCell>
                            <TableCell>{venda.cliente_nome}</TableCell>
                            <TableCell>{venda.vendedor_nome}</TableCell>
                            <TableCell>{format(new Date(venda.created_date), 'HH:mm')}</TableCell>
                            <TableCell className="text-right">{venda.itens?.length || 0}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatValor(venda.valor_total)}
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                onClick={() => setVendaDetalhada(venda)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                title="Ver detalhes">
                                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                      </div>
                      </>
                      )}
                      </div>
            {vendasFinalizadas.length > 0 && (
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                    {formatValor(caixaData.totalVendas)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalhes da Venda */}
        <Dialog open={!!vendaDetalhada} onOpenChange={() => setVendaDetalhada(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
            {vendaDetalhada && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">
                    Detalhes da Venda - {vendaDetalhada.numero}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{vendaDetalhada.cliente_nome}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Vendedor:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{vendaDetalhada.vendedor_nome}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Horário:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {format(new Date(vendaDetalhada.created_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Pagamento:</span>
                      {vendaDetalhada.pagamentos?.map((p, idx) => (
                        <p key={idx} className="font-medium text-gray-800 dark:text-gray-200">
                          {p.forma_pagamento} - {formatValor(p.valor)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Itens da Venda</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendaDetalhada.itens?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell className="text-right">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{formatValor(item.preco_unitario_praticado)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatValor(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {formatValor(vendaDetalhada.subtotal)}
                      </span>
                    </div>
                    {vendaDetalhada.valor_desconto > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          -{formatValor(vendaDetalhada.valor_desconto)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-800 dark:text-gray-200">Total:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatValor(vendaDetalhada.valor_total)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Reforços - Estilo PDV Glacial */}
        <Dialog open={showReforcosDialog} onOpenChange={setShowReforcosDialog}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => setShowReforcosDialog(false)}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                Reforços do Turno
              </h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {movimentos.filter(m => m.tipo === 'Reforço').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhum reforço registrado</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl mx-auto">
                  {movimentos.filter(m => m.tipo === 'Reforço').map((mov) => (
                    <div key={mov.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{mov.numero}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(mov.created_date), 'HH:mm')}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{mov.usuario_responsavel_nome}</div>
                        </div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-glacial">
                          +{formatValor(mov.valor)}
                        </div>
                      </div>
                      {mov.observacao && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 pt-3 border-t border-gray-100 dark:border-gray-700">
                          {mov.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {movimentos.filter(m => m.tipo === 'Reforço').length > 0 && (
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-glacial">
                    +{formatValor(caixaData.reforcos)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Recolhimentos - Estilo PDV Glacial */}
        <Dialog open={showSangriasDialog} onOpenChange={setShowSangriasDialog}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => setShowSangriasDialog(false)}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                Recolhimentos do Turno
              </h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Minus className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhum recolhimento registrado</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl mx-auto">
                  {movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').map((mov) => (
                    <div key={mov.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{mov.numero}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(mov.created_date), 'HH:mm')}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{mov.usuario_responsavel_nome}</div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-glacial">
                          -{formatValor(mov.valor)}
                        </div>
                      </div>
                      {mov.observacao && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 pt-3 border-t border-gray-100 dark:border-gray-700">
                          {mov.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').length > 0 && (
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-glacial">
                    -{formatValor(caixaData.sangrias)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Lista de Despesas */}
        <Dialog open={showDespesasDialog} onOpenChange={setShowDespesasDialog}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button onClick={() => setShowDespesasDialog(false)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Despesas do Turno</h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {(caixaData.despesasLista || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma despesa registrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-w-4xl mx-auto">
                  {(caixaData.despesasLista || []).map((desp) => (
                    <div key={desp.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{desp.descricao}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desp.categoria} · {desp.created_date ? format(new Date(desp.created_date), 'HH:mm') : ''}</div>
                        </div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-glacial">
                          -{formatValor(desp.valor)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {(caixaData.despesasLista || []).length > 0 && (
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400 font-glacial">
                    -{formatValor(caixaData.despesas)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Comprovante de Despesa */}
        <Dialog open={showComprovanteDespesa} onOpenChange={setShowComprovanteDespesa}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button onClick={() => setShowComprovanteDespesa(false)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Comprovante</h2>
              <button
                onClick={() => {
                  const w = window.open('', '_blank', 'width=400,height=600');
                  w.document.write(`<html><head><title>Comprovante Despesa</title>
                    <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
                    .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:22px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
                    </style></head><body>
                    <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de Despesa</small></div>
                    <div class="dashed"></div>
                    <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                    <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
                    <div class="row"><span>Categoria:</span><span>${despesaCriada?.categoria}</span></div>
                    <div class="row"><span>Descrição:</span><span>${despesaCriada?.descricao}</span></div>
                    <div class="dashed"></div>
                    <div class="row big"><span>VALOR:</span><span>-R$ ${(despesaCriada?.valor || 0).toFixed(2).replace('.', ',')}</span></div>
                    <div class="dashed"></div>
                    <div class="center"><small>Não é comprovante fiscal</small></div>
                    </body></html>`);
                  w.document.close(); w.focus();
                  setTimeout(() => { w.print(); w.close(); }, 300);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden" style={{ fontFamily: 'Courier New, monospace' }}>
                <div className="px-6 py-5 text-center border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                  <div className="text-base font-bold text-gray-900 dark:text-white">VAREJOSYNC</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Comprovante de Despesa</div>
                </div>
                <div className="px-6 py-4 space-y-2">
                  {[
                    { l: 'Data/Hora', v: format(new Date(), 'dd/MM/yyyy HH:mm') },
                    { l: 'Operador', v: currentUser?.full_name },
                    { l: 'Categoria', v: despesaCriada?.categoria },
                    { l: 'Descrição', v: despesaCriada?.descricao },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{l}:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">VALOR</span>
                    <span className="text-2xl font-bold font-glacial text-red-600 dark:text-red-400">
                      −{formatValor(despesaCriada?.valor)}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-4 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Não é comprovante fiscal</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 w-full max-w-xs">
                <button onClick={() => setShowComprovanteDespesa(false)} className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-medium" style={{ minHeight: '48px' }}>Fechar</button>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank', 'width=400,height=600');
                    w.document.write(`<html><head><title>Comprovante Despesa</title>
                      <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
                      .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:22px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
                      </style></head><body>
                      <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de Despesa</small></div>
                      <div class="dashed"></div>
                      <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                      <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
                      <div class="row"><span>Categoria:</span><span>${despesaCriada?.categoria}</span></div>
                      <div class="row"><span>Descrição:</span><span>${despesaCriada?.descricao}</span></div>
                      <div class="dashed"></div>
                      <div class="row big"><span>VALOR:</span><span>-R$ ${(despesaCriada?.valor || 0).toFixed(2).replace('.', ',')}</span></div>
                      <div class="dashed"></div>
                      <div class="center"><small>Não é comprovante fiscal</small></div>
                      </body></html>`);
                    w.document.close(); w.focus();
                    setTimeout(() => { w.print(); w.close(); }, 300);
                  }}
                  className="flex-1 h-12 rounded-2xl font-medium text-white bg-red-600" style={{ minHeight: '48px' }}>
                  <span className="flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimir</span>
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Despesa - Estilo PDV fullscreen com steps */}
        <Dialog open={showDespesaDialog} onOpenChange={(open) => { if (!open) { setShowDespesaDialog(false); setDespesaStep('obs'); setValorDespesaNum(''); } }}>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => {
                  if (despesaStep === 'valor') { setDespesaStep('obs'); }
                  else { setShowDespesaDialog(false); setDespesaStep('obs'); setValorDespesaNum(''); }
                }}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                Registrar Despesa
              </h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col p-5 gap-4">
              {despesaStep === 'obs' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{contaCaixaPDV?.nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Valor será debitado deste caixa</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Descrição *</label>
                      <textarea
                        ref={obsDespesaRef}
                        autoFocus
                        rows={3}
                        placeholder="Ex: Gasolina, Sacolas, Material de limpeza..."
                        value={descricaoDespesa}
                        onChange={(e) => setDescricaoDespesa(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (descricaoDespesa.trim()) { setDespesaStep('valor'); setTimeout(() => valorDespesaRef.current?.focus(), 100); }
                          }
                        }}
                        className="w-full resize-none bg-transparent border-0 focus:outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Categoria</label>
                      <Select value={categoriaDespesa} onValueChange={setCategoriaDespesa}>
                        <SelectTrigger className="h-11 bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          <SelectItem value="Utilities">Utilities</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!descricaoDespesa.trim()) { toast({ title: "Informe a descrição.", variant: "destructive" }); return; }
                      setDespesaStep('valor');
                      setTimeout(() => valorDespesaRef.current?.focus(), 100);
                    }}
                    className="w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm bg-red-600"
                    style={{ minHeight: '56px' }}>
                    Próximo →
                  </button>
                </>
              )}

              {despesaStep === 'valor' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-2 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{descricaoDespesa}</div>
                    <div className="text-5xl font-bold text-red-600 dark:text-red-400 font-glacial">
                      R$ {valorDespesaNum || '0,00'}
                    </div>
                    <input
                      ref={valorDespesaRef}
                      type="text"
                      inputMode="numeric"
                      value={valorDespesaNum}
                      onChange={() => {}}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = parseFloat((valorDespesaNum || '0').replace(/\./g, '').replace(',', '.')) || 0;
                          if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                          // remap to valorDespesa and save
                          setValorDespesa(valorDespesaNum);
                          setTimeout(() => handleSalvarDespesaNum(valorDespesaNum), 50);
                          return;
                        }
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          let nums = (valorDespesaNum || '0,00').replace(/\D/g, '');
                          nums = nums.slice(0, -1) || '0';
                          setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
                          return;
                        }
                        if (/^\d$/.test(e.key)) {
                          e.preventDefault();
                          let nums = (valorDespesaNum || '0,00').replace(/\D/g, '') + e.key;
                          setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
                        }
                      }}
                      className="opacity-0 w-0 h-0 absolute"
                    />
                    <div className="text-xs text-red-400 dark:text-red-500 mt-1">Digite o valor acima</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === '⌫') {
                            let nums = (valorDespesaNum || '0,00').replace(/\D/g, '');
                            nums = nums.slice(0, -1) || '0';
                            setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
                          } else {
                            const digits = key === '000' ? '000' : key;
                            let nums = (valorDespesaNum || '0,00').replace(/\D/g, '') + digits;
                            if (nums.length > 10) return;
                            setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
                          }
                        }}
                        className={`h-14 rounded-2xl text-xl font-semibold transition-colors ${key === '⌫' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'}`}
                        style={{ minHeight: '56px' }}>
                        {key}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const v = parseFloat((valorDespesaNum || '0').replace(/\./g, '').replace(',', '.')) || 0;
                      if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                      handleSalvarDespesaNum(valorDespesaNum);
                    }}
                    className="w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm bg-red-600"
                    style={{ minHeight: '56px' }}>
                    Confirmar
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>


        {/* Dialog Saldo Consolidado */}
        <Dialog open={showSaldoConsolidadoDialog} onOpenChange={setShowSaldoConsolidadoDialog}>
          <style>{`
            @media print {
              body > * { display: none !important; }
              #saldo-consolidado-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
              @page { size: A4; margin: 15mm; }
            }
            #saldo-consolidado-print { display: contents; }
          `}</style>
          <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
              <button
                onClick={() => setShowSaldoConsolidadoDialog(false)}
                className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
                Saldo Consolidado
              </h2>
              <button
                onClick={() => {
                  // Esconde tudo exceto o relatório e imprime
                  const el = document.getElementById('saldo-consolidado-print');
                  const original = document.body.innerHTML;
                  const printContent = el ? el.innerHTML : '';
                  const printWindow = window.open('', '_blank', 'width=800,height=900');
                  printWindow.document.write(`
                    <html><head><title>Saldo Consolidado</title>
                    <style>
                      body { font-family: Inter, sans-serif; font-size: 12px; color: #111; margin: 10mm; }
                      .space-y-3 > * + * { margin-top: 12px; }
                      .rounded-2xl { border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; }
                      .px-5 { padding-left: 20px; padding-right: 20px; }
                      .py-3 { padding-top: 12px; padding-bottom: 12px; }
                      .py-4 { padding-top: 16px; padding-bottom: 16px; }
                      .border-b { border-bottom: 1px solid #f3f4f6; }
                      .flex { display: flex; }
                      .justify-between { justify-content: space-between; }
                      .items-center { align-items: center; }
                      .text-sm { font-size: 12px; }
                      .text-xs { font-size: 10px; }
                      .text-xl { font-size: 18px; }
                      .font-bold { font-weight: 700; }
                      .font-semibold { font-weight: 600; }
                      .font-medium { font-weight: 500; }
                      .text-gray-400, .text-gray-500 { color: #9ca3af; }
                      .text-gray-700, .text-gray-800 { color: #374151; }
                      .text-gray-900 { color: #111827; }
                      .text-emerald-600 { color: #059669; }
                      .text-blue-600 { color: #2563eb; }
                      .bg-gray-50 { background: #f9fafb; }
                      .space-y-2 > * + * { margin-top: 8px; }
                      .space-y-1 > * + * { margin-top: 4px; }
                      .mt-0\\.5 { margin-top: 2px; }
                    </style></head><body>${printContent}</body></html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors print:hidden"
                style={{ minWidth: '44px', minHeight: '44px' }}>
                <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div id="saldo-consolidado-print" className="max-w-lg mx-auto space-y-3">

                {/* Extrato corrido */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:rounded-none">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Extrato do Turno</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {turnoAtivo?.numero} · abertura {turnoAtivo?.data_abertura ? format(new Date(turnoAtivo.data_abertura), 'dd/MM HH:mm') : '-'}
                    </p>
                  </div>

                  {/* Saldo Inicial */}
                  <div className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50">
                    <div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">Fundo de caixa (dinheiro)</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">Abertura do turno</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatValor(caixaData.saldoInicial ?? turnoAtivo?.saldo_inicial ?? 0)}</span>
                  </div>

                  {/* Vendas - linha principal + sub-linhas por forma de pagamento */}
                  {vendasFinalizadas.length > 0 && vendasFinalizadas.map((v) => {
                    const pagamentos = (v.pagamentos || []);
                    const temMultiplos = pagamentos.length > 1;
                    return (
                      <div key={v.id} className="border-b border-gray-50 dark:border-gray-700/50">
                        <div className="px-5 py-2.5 flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{v.numero} · {v.cliente_nome}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(v.created_date), 'HH:mm')}{!temMultiplos && pagamentos[0] ? ` · ${pagamentos[0].forma_pagamento} ${formatValor(pagamentos[0].valor)}` : ''}</div>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0 tabular-nums">+{formatValor(v.valor_total)}</span>
                        </div>
                        {temMultiplos && pagamentos.map((p, idx) => (
                          <div key={idx} className="px-5 py-1 flex justify-between items-center">
                            <span className="text-xs text-gray-400 dark:text-gray-500 pl-3">↳ {p.forma_pagamento}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{formatValor(p.valor)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Reforços */}
                  {movimentos.filter(m => m.tipo === 'Reforço').map((m) => (
                    <div key={m.id} className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50">
                      <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Reforço · {m.numero}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(m.created_date), 'HH:mm')} · {m.usuario_responsavel_nome}</div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatValor(m.valor)}</span>
                    </div>
                  ))}

                  {/* Recolhimentos */}
                  {movimentos.filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').map((m) => (
                    <div key={m.id} className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50">
                      <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Recolhimento · {m.numero}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(m.created_date), 'HH:mm')} · {m.usuario_responsavel_nome}</div>
                      </div>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">−{formatValor(m.valor)}</span>
                    </div>
                  ))}

                  {/* Despesas */}
                  {(caixaData.despesasLista || []).map((d) => (
                    <div key={d.id} className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50">
                      <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">Despesa · {d.descricao}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{d.created_date ? format(new Date(d.created_date), 'HH:mm') : ''} · {d.categoria}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">−{formatValor(d.valor)}</span>
                    </div>
                  ))}

                  {/* Totais do turno */}
                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total do turno (liquidez)</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(caixaData.totalVendas)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">↳ Dinheiro na gaveta</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatValor(caixaData.saldoAtual)}</span>
                    </div>
                  </div>
                </div>

                {/* Resumo por forma de pagamento — "o que esperar no caixa" */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:rounded-none print:border print:border-gray-300">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">O que esperar no caixa</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Baseado nas vendas do turno</p>
                  </div>

                  {[
                    { label: 'Dinheiro', sub: 'gaveta — imediato', valor: caixaData.saldoAtual },
                    { label: 'PIX', sub: 'conta digital — imediato', valor: caixaData.recebimentos.pix },
                    { label: 'Cartão Débito', sub: 'maquininha — D+1', valor: caixaData.recebimentos.debito || 0 },
                    { label: 'Cartão Crédito', sub: 'maquininha — D+30', valor: caixaData.recebimentos.credito || 0 },
                  ].map(({ label, sub, valor }) => (
                    <div key={label} className="px-5 py-3 flex justify-between items-center border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                      <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{label}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{sub}</div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatValor(valor)}</span>
                    </div>
                  ))}

                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-700/30 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total de vendas</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(caixaData.totalVendas)}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Toda liquidez gerada no turno, independente do meio de pagamento</p>
                  </div>
                </div>

              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Retorno para Edição */}
        <Dialog open={showRetornoDialog} onOpenChange={setShowRetornoDialog}>
          <DialogContent className="max-w-md dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Edit className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Retornar para Edição
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  O rascunho será devolvido ao vendedor para correção.
                </p>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Motivo do retorno *</Label>
                <Textarea
                  placeholder="Ex: Cliente solicitou alteração de produto, erro no valor..."
                  value={motivoRetorno}
                  onChange={(e) => setMotivoRetorno(e.target.value)}
                  rows={3}
                  className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                  autoFocus />

              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRetornoDialog(false);
                    setMotivoRetorno('');
                  }}
                  className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300">
                  Cancelar
                </Button>
                <Button
                  onClick={handleRetornarParaEdicao}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600">
                  Confirmar Retorno
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}