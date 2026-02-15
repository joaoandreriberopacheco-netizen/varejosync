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
  Eye } from
'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import LiberacaoEntrega from './LiberacaoEntrega';


export default function PDVCaixa() {
  const [configVenda, setConfigVenda] = useState(null);

  useEffect(() => {
    base44.entities.ConfiguracoesVenda.list().
    then((configs) => {
      if (configs.length > 0) setConfigVenda(configs[0]);
    }).
    catch(console.error);
  }, []);
  const [currentUser, setCurrentUser] = useState(null);
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

  const [showFechamentoDialog, setShowFechamentoDialog] = useState(false);
  const [valorContadoCaixa, setValorContadoCaixa] = useState('');

  const [pagamentosDinheiro, setPagamentosDinheiro] = useState(0);
  const [pagamentosPix, setPagamentosPix] = useState(0);
  const [pagamentosDebito, setPagamentosDebito] = useState(0);
  const [pagamentosCredito, setPagamentosCredito] = useState(0);
  const [parcelasCredito, setParcelasCredito] = useState(1);
  const [formaPagamentoAtiva, setFormaPagamentoAtiva] = useState(0);

  // Valores como strings para edição livre
  const [inputDinheiro, setInputDinheiro] = useState('');
  const [inputPix, setInputPix] = useState('');
  const [inputDebito, setInputDebito] = useState('');
  const [inputCredito, setInputCredito] = useState('');

  // Refs para os inputs
  const inputRefs = {
    dinheiro: React.useRef(null),
    pix: React.useRef(null),
    debito: React.useRef(null),
    credito: React.useRef(null)
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

  // Renamed stats to caixaData and updated structure based on outline
  const [caixaData, setCaixaData] = useState({
    saldoAtual: 0,
    totalVendas: 0,
    recebimentos: {
      dinheiro: 0,
      pix: 0,
      cartao: 0
    },
    reforcos: 0,
    sangrias: 0
  });
  const { toast } = useToast();

  const totalPago = pagamentosDinheiro + pagamentosPix + pagamentosDebito + pagamentosCredito;
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
      setFormaPagamentoAtiva((prev) => (prev + 1) % 4);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFormaPagamentoAtiva((prev) => (prev - 1 + 4) % 4);
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

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const todasContas = await base44.entities.ContasFinanceiras.list();
      let caixaPDV = todasContas.find((c) =>
      c.ativo && (
      c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV') && (
      c.nome.toLowerCase().includes('caixa') || c.nome.toLowerCase().includes('pdv'))
      );

      if (!caixaPDV) {
        caixaPDV = await base44.entities.ContasFinanceiras.create({
          nome: 'Caixa PDV',
          tipo: 'Caixa Físico',
          saldo_inicial: 500,
          saldo_atual: 500,
          cor: '#10B981',
          observacoes: 'Conta criada automaticamente para o PDV Caixa',
          ativo: true
        });

        toast({
          title: "✓ Conta Caixa PDV criada!",
          description: "Uma conta foi criada automaticamente para operações do caixa.",
          className: "bg-emerald-100 text-emerald-800",
          duration: 2000
        });
      }

      setContaCaixaPDV(caixaPDV);

      const hoje = format(new Date(), 'yyyy-MM-dd');

      const todosPedidos = await base44.entities.PedidoVenda.list();
      const todosRascunhos = await base44.entities.RascunhoPedidoVenda.list();

      const pedidosAguardandoCaixa = todosPedidos.filter((p) =>
      p.status === 'Aguardando Caixa'
      );

      const rascunhosAguardandoCaixa = todosRascunhos.filter((r) =>
      r.status === 'Aguardando Caixa'
      );

      setPedidosAguardando(pedidosAguardandoCaixa);
      setRascunhosAguardando(rascunhosAguardandoCaixa);

      const vendasHoje = todosPedidos.filter((p) =>
      p.status === 'Finalizado' &&
      p.created_date &&
      p.created_date.startsWith(hoje)
      );
      setVendasFinalizadas(vendasHoje);

      const todasMovimentacoes = await base44.entities.MovimentosCaixa.list();
      const movimentosHoje = todasMovimentacoes.filter((m) =>
      m.created_date &&
      m.created_date.startsWith(hoje) &&
      m.conta_id === caixaPDV.id
      );
      setMovimentos(movimentosHoje);

      const totalVendas = vendasHoje.reduce((sum, v) => sum + (v.valor_total || 0), 0);

      let totalDinheiro = 0,totalPix = 0,totalCartao = 0;
      vendasHoje.forEach((venda) => {
        if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
          venda.pagamentos.forEach((pag) => {
            if (pag.forma_pagamento === 'Dinheiro') totalDinheiro += pag.valor;
            if (pag.forma_pagamento === 'PIX') totalPix += pag.valor;
            if (pag.forma_pagamento && pag.forma_pagamento.includes('Cartão')) totalCartao += pag.valor;
          });
        }
      });

      const totalReforcos = movimentosHoje.filter((m) => m.tipo === 'Reforço').reduce((sum, m) => sum + m.valor, 0);
      const totalSangrias = movimentosHoje.filter((m) => m.tipo === 'Sangria').reduce((sum, m) => sum + m.valor, 0);

      const saldoCaixa = caixaPDV.saldo_atual;

      // Update caixaData state
      setCaixaData({
        saldoAtual: saldoCaixa,
        totalVendas: totalVendas,
        recebimentos: {
          dinheiro: totalDinheiro,
          pix: totalPix,
          cartao: totalCartao
        },
        reforcos: totalReforcos,
        sangrias: totalSangrias
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
    setPedidoSelecionado(pedido);
    setIsDialogOpen(true);
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
        itens: pedidoSelecionado.itens,
        subtotal: pedidoSelecionado.subtotal,
        valor_desconto: pedidoSelecionado.valor_desconto,
        valor_frete: pedidoSelecionado.valor_frete,
        valor_total: pedidoSelecionado.valor_total,
        pagamentos: pagamentosArray,
        observacoes: pedidoSelecionado.observacoes
      });

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
        }}toast({ title: "✓ Pagamento aprovado!", description: "Venda finalizada com sucesso.", className: "bg-emerald-100 text-emerald-800", duration: 2000 });setIsDialogOpen(false);setShowLiberacaoEntrega(true);loadData();} catch (error) {toast({ title: "Erro", description: error.message, variant: "destructive" });}};const handleAbrirMovimento = (tipo) => {if (!contaCaixaPDV) {toast({ title: "Conta de Caixa PDV não encontrada", description: "Não foi possível realizar o movimento. Recarregue a página.", variant: "destructive" });return;}setTipoMovimento(tipo);setValorMovimento('');setObservacaoMovimento('');setShowMovimentoDialog(true);};const handleSalvarMovimento = async () => {if (!valorMovimento || parseFloat(valorMovimento.replace(',', '.')) <= 0) {toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });return;}if (!contaCaixaPDV) {toast({ title: "Conta de Caixa PDV não encontrada", description: "Não foi possível identificar a conta do caixa.", variant: "destructive" });return;}try {const valorFloat = parseFloat(valorMovimento.replace(',', '.'));const todosMovimentos = await base44.entities.MovimentosCaixa.list();const nextNumber = (todosMovimentos.length > 0 ? Math.max(...todosMovimentos.map((m) => parseInt(m.numero?.split('-')[1] || 0) || 0)) : 0) + 1;const numeroMovimento = `MCX-${String(nextNumber).padStart(5, '0')}`;const movimento = await base44.entities.MovimentosCaixa.create({ numero: numeroMovimento, tipo: tipoMovimento, valor: valorFloat, observacao: observacaoMovimento, conta_id: contaCaixaPDV.id, usuario_responsavel_id: currentUser.id, usuario_responsavel_nome: currentUser.full_name });const novoSaldo = tipoMovimento === 'Sangria' ? contaCaixaPDV.saldo_atual - valorFloat : contaCaixaPDV.saldo_atual + valorFloat;

      await base44.entities.ContasFinanceiras.update(contaCaixaPDV.id, {
        saldo_atual: novoSaldo
      });

      setContaCaixaPDV((prev) => ({ ...prev, saldo_atual: novoSaldo }));

      setMovimentoCriado(movimento);
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

  const handleFecharCaixa = () => {
    setValorContadoCaixa(formatarValorExibicao(caixaData.saldoAtual));
    setShowFechamentoDialog(true);
  };

  const formatValor = (valor) => {
    const num = valor || 0;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // New helper functions for view navigation
  const handleProcessarVendas = () => {
    setView('processar');
  };

  const handleAbrirBalanco = () => {
    // Não faz nada, pois o balanço está sempre visível
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header - Responsivo */}
      <div className="bg-gray-50 text-white p-3 dark:bg-gray-800 md:p-4 flex items-center justify-between">
        <div className="text-gray-950 flex items-center gap-2 md:gap-3">
          <Receipt className="w-5 h-5 md:w-6 md:h-6" />
          <div>
            <h1 className="text-base font-black md:text-lg">PDV - Caixa</h1>
            <p className="text-[10px] md:text-xs text-gray-300 dark:text-gray-400 hidden sm:block">Caixa PDV</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Atalhos de teclado - apenas desktop */}
          <div className="hidden lg:block text-xs text-gray-300 dark:text-gray-400">
            <span className="font-medium">F1:</span> Ajuda | 
            <span className="font-medium"> F2:</span> Vendas | 
            <span className="font-medium"> F3:</span> Balanço | 
            <span className="font-medium"> F4:</span> Reforço | 
            <span className="font-medium"> F5:</span> Sangria | 
            <span className="font-medium"> F6:</span> Fechar
          </div>
          <div className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4 mr-1" />
            {format(new Date(), 'HH:mm')}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            style={{ minHeight: '44px' }}>
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-auto">
        {!contaCaixaPDV &&
        <Card className="mb-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 mx-auto max-w-6xl mt-4">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">Conta Caixa não encontrada</h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Recarregue a página ou crie uma conta "Caixa PDV" nas configurações. Se nenhuma for encontrada, uma será criada automaticamente.</p>
              </div>
            </CardContent>
          </Card>
        }

        {view === 'dashboard' &&
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
            {/* KPIs Superiores */}
            <div className="grid grid-cols-2 gap-4 md:gap-6 pb-4 md:pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="text-gray-300 opacity-100">
                <div className="text-gray-500 px-3 uppercase tracking-wide md:text-xs dark:text-gray-400">Saldo em Caixa</div>
                <div className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {formatValor(caixaData.saldoAtual)}
                </div>
              </div>
              <div>
                <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Vendas</div>
                <div className="text-xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {formatValor(caixaData.totalVendas)}
                </div>
              </div>
            </div>

            {/* Balanço - Layout em duas colunas no desktop */}
            <div className="pb-4 md:pb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Movimentações do Turno */}
                <div>
                  <h3 className="text-gray-800 mb-3 text-sm font-extrabold md:text-base dark:text-gray-200">
                    Movimentações do Turno
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-sm text-gray-800 dark:text-gray-300">Saldo Inicial</span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatValor(contaCaixaPDV?.saldo_inicial || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-sm text-gray-800 dark:text-gray-300">Vendas em Dinheiro</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {formatValor(caixaData.recebimentos.dinheiro)}
                        </span>
                        <button
                          onClick={() => setShowVendasDialog(true)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                          title="Ver vendas em dinheiro">
                          <Eye className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-sm text-gray-800 dark:text-gray-300">Reforços</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {formatValor(caixaData.reforcos)}
                        </span>
                        <button
                          onClick={() => setShowReforcosDialog(true)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                          title="Ver reforços">
                          <Eye className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm text-gray-800 dark:text-gray-300">Sangrias</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-semibold text-red-600 dark:text-red-400">
                          {formatValor(caixaData.sangrias)}
                        </span>
                        <button
                          onClick={() => setShowSangriasDialog(true)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-800 rounded-md transition-colors"
                          title="Ver sangrias">
                          <Eye className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Saldo Atual</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {formatValor(caixaData.saldoAtual)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recebimentos do Turno */}
                <div>
                  <h3 className="text-gray-800 mb-3 text-sm font-extrabold md:text-base dark:text-gray-200">
                    Recebimentos do Turno
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-base text-gray-800 dark:text-gray-300">Dinheiro</span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.dinheiro)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-base text-gray-800 dark:text-gray-300">PIX</span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.pix)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-base text-gray-800 dark:text-gray-300">Cartão Crédito</span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.cartao * 0.6)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                        <span className="text-base text-gray-800 dark:text-gray-300">Cartão Débito</span>
                      </div>
                      <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {formatValor(caixaData.recebimentos.cartao * 0.4)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total Vendas</span>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{vendasFinalizadas.length} pedidos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {formatValor(caixaData.totalVendas)}
                          </span>
                          <button
                            onClick={() => setShowVendasDialog(true)}
                            className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-md transition-colors"
                            title="Ver detalhes das vendas">
                            <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de Ação Principais */}
            <div className="bg-transparent grid grid-cols-1 gap-3 md:gap-4">
              <button
              onClick={handleProcessarVendas}
              className="pdv-button-static border-0 h-14 md:h-20 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 rounded-md">
                <ShoppingCart size={20} />
                <span className="text-xs font-semibold md:text-base">Processar Vendas (F2)</span>
              </button>
            </div>

            {/* Botões Secundários */}
            <div className="grid grid-cols-3 gap-2">
              <button
              onClick={() => handleAbrirMovimento('Reforço')}
              className="pdv-button-static gap-1 md:gap-2 border-0 h-12 md:h-14 flex items-center justify-center rounded-md disabled:opacity-50"
              disabled={!contaCaixaPDV}>
                <Plus size={16} className="text-teal-600 dark:text-teal-400" />
                <span className="text-xs md:text-sm">Reforço</span>
              </button>
              
              <button
              onClick={() => handleAbrirMovimento('Sangria')}
              className="pdv-button-static gap-1 md:gap-2 border-0 h-12 md:h-14 flex items-center justify-center rounded-md disabled:opacity-50"
              disabled={!contaCaixaPDV}>
                <Minus size={16} className="text-red-500 dark:text-yellow-400" />
                <span className="text-xs md:text-sm">Sangria</span>
              </button>

              <button
              onClick={handleFecharCaixa}
              className="pdv-button-static gap-1 md:gap-2 border-0 h-12 md:h-14 flex items-center justify-center rounded-md">
                <Lock size={16} />
                <span className="text-xs md:text-sm">Fechar</span>
              </button>
            </div>
          </div>
        }

        {view === 'processar' &&
        <div className="space-y-6 max-w-6xl mx-auto p-4">
            <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('dashboard')}
            className="gap-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">

              <ArrowLeft className="w-4 h-4" />
              Voltar (ESC)
            </Button>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  Vendas Aguardando Confirmação ({rascunhosAguardando.length})
                </h2>
                <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">

                  Atualizar (F7)
                </Button>
              </div>

              {rascunhosAguardando.length === 0 ?
            <div className="py-16 text-center">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda aguardando confirmação</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">As vendas aparecerão aqui automaticamente</p>
                </div> :

            <div className="space-y-3">
                  {rascunhosAguardando.map((rascunho) =>
              <div
                key={rascunho.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border border-gray-100 dark:border-gray-700"
                onClick={() => handleAbrirPedido(rascunho)}>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {rascunho.senha_atendimento &&
                    <div className="inline-flex flex-col items-start gap-1 mb-2">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Senha</span>
                                <span className="text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono">{rascunho.senha_atendimento.slice(-4)}</span>
                              </div>
                              <span className="text-xs text-gray-400 font-mono">{rascunho.senha_atendimento}</span>
                            </div>
                    }
                          <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{rascunho.cliente_nome}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">Vendedor: {rascunho.vendedor_nome}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            R$ {formatarValorExibicao(rascunho.valor_total)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {rascunho.itens?.length || 0} {rascunho.itens?.length === 1 ? 'item' : 'itens'}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(createPageUrl('PDV') + `?mode=vendedor&rascunho_id=${rascunho.id}`, '_blank');
                        }}
                        className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="Editar rascunho">

                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button
                        size="sm"
                        className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white">
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
              )}
                  <p className="text-xs text-gray-400 text-center pt-2">
                    Enter para processar a primeira venda
                  </p>
                </div>
            }
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

        <Dialog open={showMovimentoDialog} onOpenChange={setShowMovimentoDialog}>
          <DialogContent className="max-w-sm dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                {tipoMovimento === 'Reforço' ?
                <><Plus className="w-5 h-5 text-teal-600 dark:text-teal-400" /> Reforço de Caixa</> :

                <><Minus className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /> Sangria de Caixa</>
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {contaCaixaPDV &&
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Conta:</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">{contaCaixaPDV.nome}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Saldo: {formatValor(contaCaixaPDV.saldo_atual)}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {tipoMovimento === 'Sangria' ?
                  'O valor será DEBITADO desta conta.' :
                  'O valor será CREDITADO nesta conta.'
                  }
                  </p>
                </div>
              }
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Valor (R$) *</Label>
                <Input
                  type="text"
                  placeholder="0,00"
                  value={valorMovimento}
                  onChange={(e) => setValorMovimento(e.target.value)}
                  className="h-12 text-lg font-bold dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                  autoFocus />

              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Observação</Label>
                <Textarea
                  placeholder="Motivo do movimento..."
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                  rows={3}
                  className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />

              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowMovimentoDialog(false)} className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarMovimento}
                  className={`flex-1 ${tipoMovimento === 'Reforço' ? 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600' : 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600'}`}>

                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showComprovanteMovimento} onOpenChange={setShowComprovanteMovimento}>
          <DialogContent className="max-w-md dark:bg-gray-900 dark:text-gray-200">
            <div className="p-4" style={{ fontFamily: 'Courier New, monospace' }}>
              <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4 dark:border-gray-500">
                <h2 className="text-xl font-bold">VAREJOSYNC</h2>
                <p className="text-xs text-gray-700 dark:text-gray-300">Comprovante de {movimentoCriado?.tipo}</p>
              </div>

              <div className="space-y-2 text-sm mb-4 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Movimento:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{movimentoCriado?.numero || 'S/N'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data/Hora:</span>
                  <span className="text-gray-800 dark:text-gray-200">{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Operador:</span>
                  <span className="text-gray-800 dark:text-gray-200">{currentUser?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{movimentoCriado?.tipo}</span>
                </div>
              </div>

              <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-4 mb-4 dark:border-gray-500">
                <div className="flex justify-between text-2xl font-bold">
                  <span>VALOR:</span>
                  <span className={movimentoCriado?.tipo === 'Reforço' ? 'text-teal-600 dark:text-teal-400' : 'text-yellow-600 dark:text-yellow-400'}>
                    {movimentoCriado?.tipo === 'Reforço' ? '+' : '-'}{formatValor(movimentoCriado?.valor)}
                  </span>
                </div>
              </div>

              {movimentoCriado?.observacao &&
              <div className="mb-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Observação:</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{movimentoCriado.observacao}</p>
                </div>
              }

              <div className="text-center text-xs border-t-2 border-dashed border-gray-400 pt-4 dark:border-gray-500">
                <p className="text-gray-700 dark:text-gray-300">Este não é um comprovante fiscal</p>
              </div>

              <div className="mt-4 flex justify-center gap-2 print:hidden">
                <Button onClick={() => window.print()} size="sm" className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
                <Button variant="outline" onClick={() => setShowComprovanteMovimento(false)} size="sm" className="border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300">
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFechamentoDialog} onOpenChange={setShowFechamentoDialog}>
          <DialogContent className="max-w-md dark:bg-gray-900 dark:text-gray-200">
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                Fechamento de Caixa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Movimentações do Turno</h3>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Saldo Inicial:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(contaCaixaPDV?.saldo_inicial || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Vendas em Dinheiro:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(caixaData.recebimentos.dinheiro)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Reforços:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(caixaData.reforcos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Sangrias:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{formatValor(caixaData.sangrias)}</span>
                  </div>
                  <div className="border-t pt-2 border-gray-200 dark:border-gray-700 flex justify-between text-base">
                    <span className="font-semibold">Saldo Esperado:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{formatValor(caixaData.saldoAtual)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300 mb-2 block">Valor Contado em Caixa *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={valorContadoCaixa}
                  onChange={(e) => {}}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace') {
                      e.preventDefault();
                      let numeros = valorContadoCaixa.replace(/\D/g, '');
                      numeros = numeros.slice(0, -1) || '0';
                      const valor = parseInt(numeros) / 100;
                      setValorContadoCaixa(formatarValorExibicao(valor));
                    } else if (/^\d$/.test(e.key)) {
                      e.preventDefault();
                      const novoValor = aplicarMascaraValor(valorContadoCaixa, e.key);
                      setValorContadoCaixa(novoValor);
                    }
                  }}
                  className="h-12 text-lg font-bold text-center dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                  placeholder="R$ 0,00"
                  autoFocus
                />
              </div>

              {valorContadoCaixa && (() => {
                const valorContadoNum = parseFloat(valorContadoCaixa.replace(/\./g, '').replace(',', '.'));
                const diferenca = valorContadoNum - caixaData.saldoAtual;
                const temDiferenca = Math.abs(diferenca) > 0.01;
                
                return temDiferenca ? (
                  <div className={`p-3 rounded-lg border ${diferenca > 0 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'}`}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`w-5 h-5 ${diferenca > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`} />
                      <div>
                        <p className={`text-sm font-semibold ${diferenca > 0 ? 'text-yellow-900 dark:text-yellow-200' : 'text-red-900 dark:text-red-200'}`}>
                          {diferenca > 0 ? 'Sobrando' : 'Faltando'}: {formatValor(Math.abs(diferenca))}
                        </p>
                        <p className={`text-xs ${diferenca > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                          Não é possível fechar o caixa com diferença
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                        Valores conferem! Você pode fechar o caixa.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowFechamentoDialog(false);
                    setValorContadoCaixa('');
                  }} 
                  className="flex-1 border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300">
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const valorContadoNum = parseFloat(valorContadoCaixa.replace(/\./g, '').replace(',', '.'));
                    const diferenca = Math.abs(valorContadoNum - caixaData.saldoAtual);
                    
                    if (diferenca > 0.01) {
                      toast({
                        title: "Erro ao fechar caixa",
                        description: "Há diferença entre o valor esperado e o contado.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    toast({
                      title: "✓ Caixa fechado!",
                      description: "Turno encerrado com sucesso.",
                      className: "bg-emerald-100 text-emerald-800"
                    });
                    setShowFechamentoDialog(false);
                    setValorContadoCaixa('');
                  }}
                  disabled={!valorContadoCaixa || (() => {
                    const valorContadoNum = parseFloat(valorContadoCaixa.replace(/\./g, '').replace(',', '.'));
                    const diferenca = Math.abs(valorContadoNum - caixaData.saldoAtual);
                    return diferenca > 0.01;
                  })()}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirmar Fechamento
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

        {/* Dialog de Vendas */}
        <Dialog open={showVendasDialog} onOpenChange={setShowVendasDialog}>
          <DialogContent className="max-w-6xl w-full h-[90vh] overflow-hidden dark:bg-gray-900 dark:text-gray-200 flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Vendas em Dinheiro ({vendasFinalizadas.filter(v => v.pagamentos?.some(p => p.forma_pagamento === 'Dinheiro')).length})
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {vendasFinalizadas.filter(v => v.pagamentos?.some(p => p.forma_pagamento === 'Dinheiro')).length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">Nenhuma venda em dinheiro hoje</p>
              ) : (
                <>
                  {/* Desktop - Tabela */}
                  <div className="hidden md:block">
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
                        {vendasFinalizadas.filter(v => v.pagamentos?.some(p => p.forma_pagamento === 'Dinheiro')).map((venda) => (
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

                  {/* Mobile - Cards */}
                  <div className="md:hidden space-y-3">
                    {vendasFinalizadas.filter(v => v.pagamentos?.some(p => p.forma_pagamento === 'Dinheiro')).map((venda) => (
                      <div key={venda.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{venda.numero}</div>
                          <button
                            onClick={() => setVendaDetalhada(venda)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">{venda.cliente_nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(venda.created_date), 'HH:mm')} • {venda.vendedor_nome}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{venda.itens?.length || 0} itens</span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatValor(venda.valor_total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {vendasFinalizadas.filter(v => v.pagamentos?.some(p => p.forma_pagamento === 'Dinheiro')).length > 0 && (
              <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total em Dinheiro:</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatValor(caixaData.recebimentos.dinheiro)}
                </span>
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

        {/* Dialog de Reforços */}
        <Dialog open={showReforcosDialog} onOpenChange={setShowReforcosDialog}>
          <DialogContent className="max-w-4xl w-full h-[90vh] overflow-hidden dark:bg-gray-900 dark:text-gray-200 flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Plus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Reforços de Caixa ({movimentos.filter(m => m.tipo === 'Reforço').length})
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {movimentos.filter(m => m.tipo === 'Reforço').length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">Nenhum reforço registrado hoje</p>
              ) : (
                <>
                  {/* Desktop - Tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentos.filter(m => m.tipo === 'Reforço').map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell className="font-medium">{mov.numero}</TableCell>
                            <TableCell>{format(new Date(mov.created_date), 'HH:mm')}</TableCell>
                            <TableCell>{mov.usuario_responsavel_nome}</TableCell>
                            <TableCell className="max-w-xs truncate">{mov.observacao || '-'}</TableCell>
                            <TableCell className="text-right font-semibold text-teal-600 dark:text-teal-400">
                              +{formatValor(mov.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile - Cards */}
                  <div className="md:hidden space-y-3">
                    {movimentos.filter(m => m.tipo === 'Reforço').map((mov) => (
                      <div key={mov.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{mov.numero}</div>
                          <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                            +{formatValor(mov.valor)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(mov.created_date), 'HH:mm')} • {mov.usuario_responsavel_nome}
                        </div>
                        {mov.observacao && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                            {mov.observacao}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {movimentos.filter(m => m.tipo === 'Reforço').length > 0 && (
              <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total de Reforços:</span>
                <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                  +{formatValor(caixaData.reforcos)}
                </span>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Sangrias */}
        <Dialog open={showSangriasDialog} onOpenChange={setShowSangriasDialog}>
          <DialogContent className="max-w-4xl w-full h-[90vh] overflow-hidden dark:bg-gray-900 dark:text-gray-200 flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Minus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Sangrias de Caixa ({movimentos.filter(m => m.tipo === 'Sangria').length})
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {movimentos.filter(m => m.tipo === 'Sangria').length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">Nenhuma sangria registrada hoje</p>
              ) : (
                <>
                  {/* Desktop - Tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Operador</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentos.filter(m => m.tipo === 'Sangria').map((mov) => (
                          <TableRow key={mov.id}>
                            <TableCell className="font-medium">{mov.numero}</TableCell>
                            <TableCell>{format(new Date(mov.created_date), 'HH:mm')}</TableCell>
                            <TableCell>{mov.usuario_responsavel_nome}</TableCell>
                            <TableCell className="max-w-xs truncate">{mov.observacao || '-'}</TableCell>
                            <TableCell className="text-right font-semibold text-amber-600 dark:text-amber-400">
                              -{formatValor(mov.valor)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile - Cards */}
                  <div className="md:hidden space-y-3">
                    {movimentos.filter(m => m.tipo === 'Sangria').map((mov) => (
                      <div key={mov.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{mov.numero}</div>
                          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            -{formatValor(mov.valor)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(mov.created_date), 'HH:mm')} • {mov.usuario_responsavel_nome}
                        </div>
                        {mov.observacao && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                            {mov.observacao}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            {movimentos.filter(m => m.tipo === 'Sangria').length > 0 && (
              <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total de Sangrias:</span>
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  -{formatValor(caixaData.sangrias)}
                </span>
              </div>
            )}
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