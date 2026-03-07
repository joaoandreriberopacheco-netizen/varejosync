import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Produto } from '@/entities/Produto';
import { Terceiro } from '@/entities/Terceiro';
import { TabelaPreco } from '@/entities/TabelaPreco';
import { User } from '@/entities/User';
import { RascunhoPedidoVenda } from '@/entities/RascunhoPedidoVenda';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, ShoppingCart, Trash2, UserPlus, ArrowRight, Barcode, Truck, Store, Keyboard, Plus, Minus, ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Package, Camera, Undo2, X, Edit } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ComprovantePreVenda from './ComprovantePreVenda';
import LostSalesForm from './LostSalesForm';
import BarcodeScanner from './BarcodeScanner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createPageUrl } from '@/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

export default function PDVVendedor() {
  const [carrinho, setCarrinho] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSugeridos, setProdutosSugeridos] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeAtual, setQuantidadeAtual] = useState(''); // Changed from quantidadeInput
  const [produtos, setProdutos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tabelaPreco, setTabelaPreco] = useState(null);
  const [showClienteDialog, setShowClienteDialog] = useState(false);
  const [showNovoClienteForm, setShowNovoClienteForm] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    telefone: '',
    endereco: '',
    tipo_documento: 'CPF',
    numero_documento: '',
    perfil: '',
    data_nascimento: '',
    observacoes: ''
  });
  const [metodoEntrega, setMetodoEntrega] = useState('Retirada');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ultimaPreVenda, setUltimaPreVenda] = useState(null);
  const [showComprovante, setShowComprovante] = useState(false);
  const [produtoSelecionadoIndex, setProdutoSelecionadoIndex] = useState(0);
  const [clienteSelecionadoIndex, setClienteSelecionadoIndex] = useState(0);
  const [showLostSalesForm, setShowLostSalesForm] = useState(false);
  const [showCarrinhoMobile, setShowCarrinhoMobile] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [sugestoesContextuais, setSugestoesContextuais] = useState([]);
  const [configVenda, setConfigVenda] = useState(null);
  const [showReeditarDialog, setShowReeditarDialog] = useState(false);
  const [senhaReeditar, setSenhaReeditar] = useState('');
  const [rascunhoEmEdicaoId, setRascunhoEmEdicaoId] = useState(null);

  useEffect(() => {
    if (produtos.length === 0) return;

    let candidates = [];

    if (carrinho.length > 0) {
      const lastItem = carrinho[carrinho.length - 1];
      const sourceProduct = produtos.find((p) => p.id === lastItem.produto_id);
      if (sourceProduct && sourceProduct.categoria_nome) {
        candidates = produtos.filter((p) =>
        p.id !== sourceProduct.id &&
        p.categoria_nome === sourceProduct.categoria_nome &&
        p.ativo &&
        !carrinho.some((c) => c.produto_id === p.id)
        );
      }
    }

    if (candidates.length < 4) {
      const others = produtos.filter((p) =>
      p.ativo &&
      !carrinho.some((c) => c.produto_id === p.id) &&
      !candidates.includes(p)
      ).slice(0, 10);
      candidates = [...candidates, ...others];
    }

    setSugestoesContextuais(candidates.slice(0, 4));
  }, [carrinho, produtos]);

  const [tipoAjuste, setTipoAjuste] = useState('desconto');
  const [valorAjuste, setValorAjuste] = useState(0);
  const [tipoValorAjuste, setTipoValorAjuste] = useState('percentual');

  const inputProdutoRef = useRef(null);
  const quantidadeInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const clienteNomeRef = useRef(null);
  const { toast } = useToast();

  // Feedback inline ao invés de toast
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const showFeedback = (type, message, duration = 2000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), duration);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { subtotal, valorTotal, valorAjusteCalculado, percentualAjuste, ajusteExcedido } = useMemo(() => {
    const sub = carrinho.reduce((acc, item) => acc + (item.total || 0), 0);

    let valorAjusteCalc = 0;
    if (valorAjuste > 0) {
      if (tipoValorAjuste === 'percentual') {
        valorAjusteCalc = sub * valorAjuste / 100;
      } else {
        valorAjusteCalc = valorAjuste;
      }
    }

    if (tipoAjuste === 'desconto') {
      valorAjusteCalc = Math.min(valorAjusteCalc, sub);
    }

    const percent = sub > 0 ? valorAjusteCalc / sub * 100 : 0;
    const limite = currentUser?.limite_desconto || 0;
    const excedido = tipoAjuste === 'desconto' && currentUser && percent > limite;

    let total = sub;
    if (tipoAjuste === 'desconto') {
      total = sub - valorAjusteCalc;
    } else if (tipoAjuste === 'acrescimo') {
      total = sub + valorAjusteCalc;
    }

    return {
      subtotal: sub,
      valorTotal: total,
      valorAjusteCalculado: valorAjusteCalc,
      percentualAjuste: percent,
      ajusteExcedido: excedido
    };
  }, [carrinho, valorAjuste, tipoValorAjuste, tipoAjuste, currentUser]);

  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);

  useEffect(() => {
    loadDependencies();
    loadConfiguracoesVenda();
    verificarRascunhoParaEdicao();
  }, []);

  const loadConfiguracoesVenda = async () => {
    try {
      const configs = await base44.entities.ConfiguracoesVenda.list();
      if (configs.length > 0) {
        console.log('ConfigVenda carregada:', configs[0]);
        setConfigVenda(configs[0]);
        if (configs[0].auto_delivery_balcao) {
          setMetodoEntrega('Retirada');
        }
      } else {
        console.log('Nenhuma configuração de venda encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const verificarRascunhoParaEdicao = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const rascunhoId = urlParams.get('rascunho_id');
    
    if (rascunhoId) {
      try {
        const rascunho = await base44.entities.RascunhoPedidoVenda.get(rascunhoId);
        
        if (rascunho && rascunho.status === 'Retornado para Edição') {
          // Recarregar o carrinho com os itens do rascunho
          const itensCarrinho = rascunho.itens.map(item => ({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            codigo_interno: item.codigo_interno || '001',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario_praticado,
            preco_unitario_praticado: item.preco_unitario_praticado,
            custo_unitario_momento: item.custo_unitario_momento || 0,
            total: item.total,
            estoque_disponivel: 999
          }));
          
          setCarrinho(itensCarrinho);
          setRascunhoEmEdicaoId(rascunho.id);
          
          // Carregar cliente se existir
          if (rascunho.cliente_id) {
            const cliente = await base44.entities.Terceiro.get(rascunho.cliente_id);
            setClienteSelecionado(cliente);
          }
          
          // Definir método de entrega
          if (rascunho.metodo_entrega) {
            setMetodoEntrega(rascunho.metodo_entrega);
          }
          
          // Definir desconto se houver
          if (rascunho.valor_desconto > 0) {
            setTipoAjuste('desconto');
            setValorAjuste(rascunho.valor_desconto);
            setTipoValorAjuste('valor');
          }
          
          showFeedback('info', `Editando rascunho - Senha ${rascunho.senha_atendimento.slice(-4)}`, 3000);
        }
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        showFeedback('error', 'Erro ao carregar rascunho para edição', 3000);
      }
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {// Renamed to avoid confusion with local handleKeyDown
      // F1 - Ajuda
      if (e.key === 'F1') {
        e.preventDefault();
        showFeedback('info', 'F1: Ajuda | F2: Novo Cliente | F3: Avançar | F4: Limpar | ESC: Sair', 4000);
        return;
      }

      // F2 - Novo Cliente (quando no dialog de cliente)
      if (e.key === 'F2' && showClienteDialog && !showNovoClienteForm) {
        e.preventDefault();
        setShowNovoClienteForm(true);
        setTimeout(() => clienteNomeRef.current?.focus(), 100);
        return;
      }

      // F3 - Finalizar Venda (avançar para seleção de cliente ou finalizar dentro do dialog)
      if (e.key === 'F3' && !showClienteDialog && carrinho.length > 0 && !ajusteExcedido) {
        e.preventDefault();
        handleAvancarParaCliente();
        return;
      }

      // F4 - Limpar Carrinho
      if (e.key === 'F4' && !showClienteDialog && carrinho.length > 0) {
        e.preventDefault();
        if (confirm('Limpar todo o carrinho?')) {
          handleLimparCarrinho();
        }
        return;
      }

      // ESC - Voltar ao Dashboard (só se nenhum dialog de cliente estiver aberto)
      if (e.key === 'Escape' && !showClienteDialog && !showComprovante) {
        e.preventDefault();
        const confirmExit = confirm('Deseja sair do PDV e voltar ao Dashboard?');
        if (confirmExit) {
          window.location.href = createPageUrl('Dashboard');
        }
        return;
      }

      // ESC - Fechar dialogs (prioriza o mais aninhado)
      if (e.key === 'Escape') {
        if (showNovoClienteForm) {
          e.preventDefault();
          setShowNovoClienteForm(false);
          return;
        } else if (showClienteDialog) {
          e.preventDefault();
          setShowClienteDialog(false);
          return;
        }
      }

      // Navegação por setas (sugestões de produto)
      if (showSuggestions && produtosSugeridos.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setProdutoSelecionadoIndex((prev) =>
          prev < produtosSugeridos.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setProdutoSelecionadoIndex((prev) =>
          prev > 0 ? prev - 1 : produtosSugeridos.length - 1
          );
        }
        if (e.key === 'Enter' && document.activeElement === inputProdutoRef.current) {// Updated ref
          e.preventDefault();
          if (produtosSugeridos[produtoSelecionadoIndex]) {
            handleSelecionarProduto(produtosSugeridos[produtoSelecionadoIndex]);
          }
        }
      }

      // Navegação nas sugestões de clientes
      if (showClienteDialog && !showNovoClienteForm && clientesFiltrados.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setClienteSelecionadoIndex((prev) =>
          prev < clientesFiltrados.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setClienteSelecionadoIndex((prev) =>
          prev > 0 ? prev - 1 : clientesFiltrados.length - 1
          );
        }
        if (e.key === 'Enter' && clientesFiltrados.length > 0) {
          e.preventDefault();
          handleSelecionarCliente(clientesFiltrados[clienteSelecionadoIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showClienteDialog, showNovoClienteForm, carrinho, showSuggestions, produtosSugeridos, produtoSelecionadoIndex, clientesFiltrados, clienteSelecionadoIndex, showComprovante, ajusteExcedido]);

  useEffect(() => {
    if (inputProdutoRef.current && !showClienteDialog) {// Updated ref
      inputProdutoRef.current.focus();
    }
  }, [carrinho, showClienteDialog]);

  useEffect(() => {
    if (buscaProduto.trim().length >= 2) {
      const termo = buscaProduto.toLowerCase();
      const resultados = produtos.filter((p) =>
      p.codigo_barras?.toLowerCase().includes(termo) ||
      p.codigo_interno?.toLowerCase().includes(termo) ||
      p.nome?.toLowerCase().includes(termo)
      ).sort((a, b) => a.nome.localeCompare(b.nome));

      setProdutosSugeridos(resultados.slice(0, 10));
      setShowSuggestions(true);
      setProdutoSelecionadoIndex(0);
    } else {
      setProdutosSugeridos([]);
      setShowSuggestions(false);
    }
  }, [buscaProduto, produtos]);

  // Busca automática de clientes
  useEffect(() => {
    if (buscaCliente.trim().length >= 2) {
      const termo = buscaCliente.toLowerCase();
      const resultados = clientes.filter((c) =>
      c.nome?.toLowerCase().includes(termo) ||
      c.cpf_cnpj?.toLowerCase().includes(termo) ||
      c.telefone?.toLowerCase().includes(termo)
      );
      setClientesFiltrados(resultados);
      setClienteSelecionadoIndex(0); // Reset index quando filtrar
    } else {
      setClientesFiltrados([]);
      setClienteSelecionadoIndex(0);
    }
  }, [buscaCliente, clientes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDependencies = async () => {
    try {
      const [produtosData, userData, clientesData] = await Promise.all([
      base44.entities.Produto.filter({ ativo: true }),
      base44.auth.me(),
      base44.entities.Terceiro.filter({ tipo: ['Cliente', 'Ambos'] })]
      );

      setProdutos(produtosData);
      setCurrentUser(userData);
      setClientes(clientesData);

      if (userData.tabela_preco_id) {
        const tabela = await base44.entities.TabelaPreco.get(userData.tabela_preco_id);
        setTabelaPreco(tabela);
      } else {
        const tabelas = await base44.entities.TabelaPreco.filter({ ativo: true, is_default: true });
        if (tabelas.length > 0) setTabelaPreco(tabelas[0]);
      }
    } catch (error) {
      showFeedback('error', `Erro ao carregar: ${error.message}`, 3000);
    }
  };

  const handleSelecionarProduto = (produto) => {
    setProdutoSelecionado(produto);
    setBuscaProduto('');
    setShowSuggestions(false);
    setQuantidadeAtual(''); // Updated state

    // Garante que o teclado anterior feche e o input habilite
    if (isMobile) {
      inputProdutoRef.current?.blur();
    }

    // Timeout maior para dispositivos móveis processarem a transição
    setTimeout(() => {
      quantidadeInputRef.current?.focus();
    }, isMobile ? 400 : 100);
  };

  const handleConfirmarAdicao = () => {
    if (!produtoSelecionado) return;

    const quantidade = parseInt(quantidadeAtual) || 1; // Updated state

    console.log('Verificando estoque - Config:', configVenda, 'Vender sem estoque:', configVenda?.vender_sem_estoque, 'Estoque:', produtoSelecionado.estoque_atual, 'Quantidade:', quantidade);

    if (configVenda?.vender_sem_estoque !== true && produtoSelecionado.estoque_atual < quantidade) {
      showFeedback('error', `Estoque insuficiente: ${produtoSelecionado.estoque_atual} disponível`, 3000);
      return;
    }

    let precoFinal = produtoSelecionado.preco_venda_padrao;
    if (tabelaPreco && tabelaPreco.fator_ajuste) {
      precoFinal = produtoSelecionado.preco_venda_padrao * tabelaPreco.fator_ajuste;
    }

    const itemExistente = carrinho.find((item) => item.produto_id === produtoSelecionado.id);

    if (itemExistente) {
      setCarrinho(carrinho.map((item) =>
      item.produto_id === produtoSelecionado.id ?
      {
        ...item,
        quantidade: item.quantidade + quantidade,
        total: (item.quantidade + quantidade) * item.preco_unitario
      } :
      item
      ));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        codigo_interno: produtoSelecionado.codigo_interno || '001',
        quantidade: quantidade,
        preco_unitario: precoFinal,
        preco_unitario_praticado: precoFinal,
        custo_unitario_momento: produtoSelecionado.preco_custo_calculado || 0,
        total: quantidade * precoFinal,
        estoque_disponivel: produtoSelecionado.estoque_atual
      }]);
    }

    showFeedback('success', `${produtoSelecionado.nome} - ${quantidade} un.`, 1500);

    setProdutoSelecionado(null);
    setQuantidadeAtual(''); // Updated state
    quantidadeInputRef.current?.blur();
    setTimeout(() => inputProdutoRef.current?.focus(), 100); // Updated ref
  };

  // Original handleBuscaKeyDown - now merged into the main handleKeyDown for product input
  const handleKeyDown = (e) => {// This will be the local handler for the product search input
    if (e.key === 'Tab' && showSuggestions && produtosSugeridos.length > 0) {
      e.preventDefault();
      quantidadeInputRef.current?.focus();
    }
    // The Enter key handling for selecting suggestions is in the global useEffect listener
  };

  const handleQuantidadeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmarAdicao();
    }
  };

  const handleUpdateQuantity = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      setCarrinho(carrinho.filter((item) => item.produto_id !== produtoId));
    } else {
      const item = carrinho.find((i) => i.produto_id === produtoId);
      if (configVenda?.vender_sem_estoque === true || item && novaQuantidade <= item.estoque_disponivel) {
        setCarrinho(carrinho.map((item) =>
        item.produto_id === produtoId ?
        { ...item, quantidade: novaQuantidade, total: novaQuantidade * item.preco_unitario } :
        item
        ));
      } else {
        showFeedback('error', 'Estoque insuficiente', 3000);
      }
    }
  };

  const handleRemoveItem = (produtoId) => {
    setCarrinho(carrinho.filter((item) => item.produto_id !== produtoId));
  };

  const handleLimparCarrinho = () => {
    setCarrinho([]);
    setProdutoSelecionado(null);
    setValorAjuste(0);
    setRascunhoEmEdicaoId(null);
    showFeedback('info', 'Carrinho limpo', 2000);
  };

  const handleAvancarParaCliente = () => {
    if (carrinho.length === 0) {
      showFeedback('error', 'Adicione produtos antes de continuar', 3000);
      return;
    }
    if (ajusteExcedido) {
      showFeedback('error', `Desconto excede seu limite de ${currentUser?.limite_desconto || 0}%`, 3000);
      return;
    }
    setShowClienteDialog(true);
    setShowNovoClienteForm(false);
    setBuscaCliente('');
    setClientesFiltrados([]);
    setClienteSelecionadoIndex(0);
  };

  const handleSelecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setBuscaCliente('');
    setClientesFiltrados([]);
    setClienteSelecionadoIndex(0);
  };

  const handleCriarNovoCliente = async (e) => {
    e.preventDefault();

    if (!novoCliente.nome) {
      showFeedback('error', 'Nome é obrigatório', 3000);
      return;
    }

    try {
      const clienteCriado = await Terceiro.create({
        nome: novoCliente.nome,
        telefone: novoCliente.telefone,
        endereco: novoCliente.endereco,
        cpf_cnpj: novoCliente.numero_documento,
        tipo: 'Cliente',
        perfil: novoCliente.perfil || undefined,
        data_nascimento: novoCliente.data_nascimento || undefined,
        observacoes: novoCliente.observacoes || undefined,
        ativo: true
      });

      setClienteSelecionado(clienteCriado);
      setClientes([...clientes, clienteCriado]);
      setNovoCliente({
        nome: '',
        telefone: '',
        endereco: '',
        tipo_documento: 'CPF',
        numero_documento: '',
        perfil: '',
        data_nascimento: '',
        observacoes: ''
      });
      setShowNovoClienteForm(false);

      showFeedback('success', 'Cliente cadastrado!', 2000);
    } catch (error) {
      showFeedback('error', `Erro: ${error.message}`, 3000);
    }
  };

  const handleFinalizarPreVenda = async () => {
    if (carrinho.length === 0) {
      showFeedback('error', 'Adicione produtos antes de finalizar', 3000);
      return;
    }

    if (!clienteSelecionado) {
      showFeedback('error', 'Selecione um cliente antes de finalizar', 3000);
      return;
    }

    if (ajusteExcedido) {
      showFeedback('error', `Desconto excede seu limite de ${currentUser.limite_desconto}%`, 3000);
      return;
    }

    setIsProcessing(true);

    try {
      let rascunhoFinal;

      // Se está editando um rascunho existente, atualizar
      if (rascunhoEmEdicaoId) {
        const rascunhoExistente = await base44.entities.RascunhoPedidoVenda.get(rascunhoEmEdicaoId);
        
        const rascunhoData = {
          cliente_id: clienteSelecionado.id,
          cliente_nome: clienteSelecionado.nome,
          vendedor_id: currentUser.id,
          vendedor_nome: currentUser.full_name,
          tabela_preco_id: tabelaPreco?.id,
          status: 'Aguardando Caixa',
          metodo_entrega: metodoEntrega,
          itens: carrinho.map((item) => ({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            quantidade: item.quantidade,
            preco_unitario_praticado: item.preco_unitario_praticado,
            custo_unitario_momento: item.custo_unitario_momento || 0,
            total: item.total
          })),
          subtotal,
          valor_desconto: tipoAjuste === 'desconto' ? valorAjusteCalculado : 0,
          valor_frete: 0,
          valor_total: valorTotal
        };

        await base44.entities.RascunhoPedidoVenda.update(rascunhoEmEdicaoId, rascunhoData);
        rascunhoFinal = {
          ...rascunhoExistente,
          ...rascunhoData,
          id: rascunhoEmEdicaoId
        };

        showFeedback('success', `Senha ${rascunhoExistente.senha_atendimento.slice(-4)} atualizada`, 3000);
      } else {
        // Criar novo rascunho
        const hoje = new Date();
        const ano = String(hoje.getFullYear()).slice(-2);
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const prefixoData = `${ano}${mes}${dia}`;

        const todosRascunhos = await base44.entities.RascunhoPedidoVenda.list();
        const rascunhosHoje = todosRascunhos.filter(r => 
          r.senha_atendimento?.startsWith(prefixoData)
        );
        const proximoSequencial = rascunhosHoje.length + 1;
        const senhaAtendimento = `${prefixoData}${String(proximoSequencial).padStart(3, '0')}`;

        const rascunhoData = {
          senha_atendimento: senhaAtendimento,
          tipo: 'PDV',
          cliente_id: clienteSelecionado.id,
          cliente_nome: clienteSelecionado.nome,
          vendedor_id: currentUser.id,
          vendedor_nome: currentUser.full_name,
          tabela_preco_id: tabelaPreco?.id,
          status: 'Aguardando Caixa',
          metodo_entrega: metodoEntrega,
          itens: carrinho.map((item) => ({
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            quantidade: item.quantidade,
            preco_unitario_praticado: item.preco_unitario_praticado,
            custo_unitario_momento: item.custo_unitario_momento || 0,
            total: item.total
          })),
          subtotal,
          valor_desconto: tipoAjuste === 'desconto' ? valorAjusteCalculado : 0,
          valor_frete: 0,
          valor_total: valorTotal
        };

        rascunhoFinal = await base44.entities.RascunhoPedidoVenda.create(rascunhoData);
        showFeedback('success', `Senha ${senhaAtendimento.slice(-4)} enviada ao caixa`, 3000);
      }

      setUltimaPreVenda(rascunhoFinal);
      setShowComprovante(true);

      setCarrinho([]);
      setClienteSelecionado(null);
      setShowClienteDialog(false);
      setMetodoEntrega('Retirada');
      setValorAjuste(0);
      setRascunhoEmEdicaoId(null);

      setTimeout(() => inputProdutoRef.current?.focus(), 500);
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      showFeedback('error', `Erro: ${error.message}`, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSair = () => {
    const confirmExit = confirm('Deseja sair do PDV e voltar ao Dashboard?');
    if (confirmExit) {
      window.location.href = createPageUrl('Dashboard');
    }
  };

  const handleReeditarRascunho = async () => {
    if (!senhaReeditar || senhaReeditar.length < 4) {
      showFeedback('error', 'Digite os 4 últimos dígitos da senha', 3000);
      return;
    }

    try {
      // Buscar todos os rascunhos
      const todosRascunhos = await base44.entities.RascunhoPedidoVenda.list();
      
      // Filtrar pela senha (últimos 4 dígitos)
      const rascunhoEncontrado = todosRascunhos.find(r => 
        r.senha_atendimento?.slice(-4) === senhaReeditar
      );

      if (!rascunhoEncontrado) {
        showFeedback('error', 'Senha não encontrada', 3000);
        return;
      }

      // Permitir edição apenas se ainda não foi convertido, cancelado ou expirado
      const statusEditaveis = ['Aguardando Caixa', 'Em Edição', 'Retornado para Edição', 'Criado'];
      if (!statusEditaveis.includes(rascunhoEncontrado.status)) {
        showFeedback('error', 'Esta senha não pode mais ser editada', 3000);
        return;
      }

      // Recarregar o carrinho com os itens do rascunho
      const itensCarrinho = rascunhoEncontrado.itens.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        codigo_interno: item.codigo_interno || '001',
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario_praticado,
        preco_unitario_praticado: item.preco_unitario_praticado,
        custo_unitario_momento: item.custo_unitario_momento || 0,
        total: item.total,
        estoque_disponivel: 999
      }));
      
      setCarrinho(itensCarrinho);
      
      // Carregar cliente se existir
      if (rascunhoEncontrado.cliente_id) {
        const cliente = await base44.entities.Terceiro.get(rascunhoEncontrado.cliente_id);
        setClienteSelecionado(cliente);
      }
      
      // Definir método de entrega
      if (rascunhoEncontrado.metodo_entrega) {
        setMetodoEntrega(rascunhoEncontrado.metodo_entrega);
      }
      
      // Definir desconto se houver
      if (rascunhoEncontrado.valor_desconto > 0) {
        setTipoAjuste('desconto');
        setValorAjuste(rascunhoEncontrado.valor_desconto);
        setTipoValorAjuste('valor');
      }

      // Armazenar ID para atualização posterior
      setRascunhoEmEdicaoId(rascunhoEncontrado.id);
      
      // Atualizar status do rascunho para "Em Edição"
      await base44.entities.RascunhoPedidoVenda.update(rascunhoEncontrado.id, {
        status: 'Em Edição'
      });
      
      setShowReeditarDialog(false);
      setSenhaReeditar('');
      showFeedback('success', `Editando senha ${senhaReeditar}`, 3000);
      setTimeout(() => inputProdutoRef.current?.focus(), 500);
    } catch (error) {
      console.error('Erro ao buscar rascunho:', error);
      showFeedback('error', 'Erro ao buscar rascunho', 3000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Feedback Inline - Glacial Style */}
      <AnimatePresence>
        {feedback.message &&
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm ${
          feedback.type === 'success' ? 'bg-emerald-500/90 text-white' :
          feedback.type === 'error' ? 'bg-red-500/90 text-white' :
          'bg-gray-700/90 text-white'}`
          }>

            {feedback.message}
          </motion.div>
        }
      </AnimatePresence>

      {/* Header - Elegante */}
      <div className="bg-white dark:bg-gray-800 p-4 md:p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 md:w-10 md:h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 md:w-5 md:h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg md:text-lg font-medium text-gray-800 dark:text-gray-100">PDV</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ponto de Venda</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden lg:flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F1 Ajuda</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F3 Avançar</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F4 Limpar</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowReeditarDialog(true)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 h-11 w-11 md:h-8 md:w-8 rounded-lg"
            title="Reeditar rascunho">

            <Edit className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSair}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 h-11 w-11 md:h-8 md:w-8 rounded-lg">

            <Undo2 className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden pb-20 md:pb-0">
        {/* Área Principal - Glacial Style */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
          {/* Busca de Produto - Limpo e Expandido */}
          <div className="mb-4 md:mb-6 flex-shrink-0" ref={suggestionsRef}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Consulta de Produtos</span>
            </div>
            <div className="flex gap-2 w-full">
                <div className="flex-1 relative min-w-0">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <Input
                  ref={inputProdutoRef}
                  placeholder="Nome, código ou código de barras..."
                  className="w-full pl-12 pr-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 h-14 text-base focus:ring-2 focus:ring-gray-300 focus:border-gray-400 placeholder:text-gray-400"
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus={!isMobile} />

                  <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">

                    <Camera className="w-5 h-5" />
                  </Button>
                </div>
                <div className="w-20 md:w-24 shrink-0">
                  <Input
                  ref={quantidadeInputRef}
                  type="number"
                  inputMode="numeric"
                  placeholder="Qtd"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 h-14 text-center text-lg font-semibold focus:ring-2 focus:ring-gray-300"
                  value={quantidadeAtual}
                  onChange={(e) => setQuantidadeAtual(parseInt(e.target.value) || 1)}
                  onKeyDown={handleQuantidadeKeyDown}
                  min="1"
                  disabled={!produtoSelecionado} />

                </div>
            </div>
            {showSuggestions && produtosSugeridos.length > 0 &&
            <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {produtosSugeridos.length} produto{produtosSugeridos.length > 1 ? 's' : ''} encontrado{produtosSugeridos.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {produtosSugeridos.map((produto, index) => {
                const precoTabela = produto.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1);
                const estoqueStatus = produto.estoque_atual <= 0 ? 'sem' : produto.estoque_atual <= 5 ? 'baixo' : 'ok';
                return (
                  <div
                    key={produto.id}
                    className={`p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer transition-all ${
                    index === produtoSelecionadoIndex ? 'bg-gray-100 dark:bg-gray-700 border-l-4 border-l-gray-400' : ''}`
                    }
                    onClick={() => handleSelecionarProduto(produto)}>

                        {/* Mobile Layout */}
                        <div className="flex md:hidden items-start gap-3">
                          {produto.imagem_url ?
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="flex-shrink-0 w-10 h-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-700" /> :


                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      estoqueStatus === 'sem' ? 'bg-red-100 dark:bg-red-900/30' :
                      estoqueStatus === 'baixo' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-gray-100 dark:bg-gray-700'}`
                      }>
                              <Package className={`w-5 h-5 ${
                        estoqueStatus === 'sem' ? 'text-red-500' :
                        estoqueStatus === 'baixo' ? 'text-amber-500' :
                        'text-gray-500 dark:text-gray-400'}`
                        } />
                            </div>
                      }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                                {produto.nome}
                              </p>
                              <p className="text-base font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                R$ {precoTabela.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-gray-400 font-mono">
                                #{produto.codigo_interno || 'N/A'}
                              </span>
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          estoqueStatus === 'sem' ? 'bg-red-100 text-red-700' :
                          estoqueStatus === 'baixo' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'}`
                          }>
                                {produto.estoque_atual} disp.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:flex items-start gap-4">
                          {produto.imagem_url ?
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="flex-shrink-0 w-12 h-12 rounded-xl object-cover bg-gray-100 dark:bg-gray-700" /> :


                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      estoqueStatus === 'sem' ? 'bg-red-100 dark:bg-red-900/30' :
                      estoqueStatus === 'baixo' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-gray-100 dark:bg-gray-700'}`
                      }>
                              <Package className={`w-6 h-6 ${
                        estoqueStatus === 'sem' ? 'text-red-500' :
                        estoqueStatus === 'baixo' ? 'text-amber-500' :
                        'text-gray-500 dark:text-gray-400'}`
                        } />
                            </div>
                      }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight mb-1">
                              {produto.nome}
                            </p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500 dark:text-gray-400 font-mono">
                                #{produto.codigo_interno || 'N/A'}
                              </span>
                              <span className={`font-medium px-2 py-0.5 rounded-full ${
                          estoqueStatus === 'sem' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          estoqueStatus === 'baixo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`
                          }>
                                {produto.estoque_atual} em estoque
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                              R$ {precoTabela.toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {tabelaPreco ? tabelaPreco.nome_tabela : 'Preço padrão'}
                            </p>
                          </div>
                        </div>
                      </div>);

              })}
                </div>
            }
                {produtoSelecionado &&
            <div className="mt-3 p-3 md:p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {produtoSelecionado.imagem_url ?
                  <img
                    src={produtoSelecionado.imagem_url}
                    alt={produtoSelecionado.nome}
                    className="w-10 h-10 rounded-lg object-cover bg-gray-200 dark:bg-gray-700" /> :


                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                  }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{produtoSelecionado.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>R$ {(produtoSelecionado.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1)).toFixed(2)} cada</span>
                        <span>•</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Total: R$ {(produtoSelecionado.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1) * (parseInt(quantidadeAtual) || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                    onClick={() => {
                      setProdutoSelecionado(null);
                      setQuantidadeAtual('');
                      inputProdutoRef.current?.focus();
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-200/50">

                      Cancelar
                    </Button>
                    <Button
                    onClick={handleConfirmarAdicao}
                    className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white font-medium px-6 shadow-sm"
                    size="sm">

                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            }
            </div>

            {!showSuggestions && sugestoesContextuais.length > 0 &&
          <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    {carrinho.length > 0 ? 'Sugestões para o cliente' : 'Produtos em Destaque'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sugestoesContextuais.map((prod) => {
                const preco = prod.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelecionarProduto(prod)}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors shadow-sm">

                        <div className="flex items-center gap-2 min-w-0">
                          {prod.imagem_url ?
                      <img
                        src={prod.imagem_url}
                        alt={prod.nome}
                        className="w-8 h-8 rounded object-cover bg-gray-100 dark:bg-gray-700 flex-shrink-0" /> :


                      <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500">
                              <Package className="w-4 h-4" />
                            </div>
                      }
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                              {prod.nome}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-400">#{prod.codigo_interno || 'N/A'}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">
                                {prod.estoque_atual} disp.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right pl-2 whitespace-nowrap">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                            R$ {preco.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>);

              })}
                </div>
              </div>
          }

        </div>

        {/* Sidebar Carrinho - Desktop Only - Glacial Style */}
        <div className="hidden md:flex w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-normal text-gray-700 dark:text-gray-200">Carrinho</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{carrinho.length} itens</span>
            </div>
          </div>

          {/* Lista de Itens - Glacial Style */}
          <div className="flex-1 overflow-auto p-3 space-y-1">
            {carrinho.length === 0 ?
            <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">Carrinho vazio</p>
              </div> :

            carrinho.map((item) =>
            <div key={item.produto_id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-700 dark:text-gray-200 truncate">{item.produto_nome}</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        R$ {item.preco_unitario_praticado.toFixed(2)} x {item.quantidade}
                      </p>
                    </div>
                    <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.produto_id)}
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-transparent">

                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade - 1)}
                    className="h-7 w-7 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">

                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center text-gray-700 dark:text-gray-200">
                        {item.quantidade}
                      </span>
                      <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade + 1)}
                    disabled={!configVenda?.vender_sem_estoque && item.quantidade >= item.estoque_disponivel}
                    className="h-7 w-7 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">

                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      R$ {item.total.toFixed(2)}
                    </div>
                  </div>
                </div>
            )
            }
          </div>

          {/* Resumo e Ações - Glacial Style */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
            {/* Botão Venda Perdida - Desktop */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLostSalesForm(true)} className="bg-[#fff0f0] text-red-400 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-full hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-2">


              <AlertCircle className="w-3.5 h-3.5" />
              Registrar Venda Perdida
            </Button>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              {/* Seção de Desconto Comercial - se permitido pela tabela */}
              {tabelaPreco?.permite_desconto_comercial &&
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                  <Label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Desconto Comercial</Label>
                  <div className="flex gap-1">
                    <Select value={tipoValorAjuste} onValueChange={setTipoValorAjuste}>
                      <SelectTrigger className="w-14 bg-white dark:bg-gray-700/50 border-0 border-b border-gray-200 dark:border-gray-600 rounded-none h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-xs">
                        <SelectItem value="valor">R$</SelectItem>
                        <SelectItem value="percentual">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                    type="number"
                    min="0"
                    step="0.01"
                    max={tipoValorAjuste === 'percentual' ? tabelaPreco?.percentual_desconto_maximo || 100 : undefined}
                    value={valorAjuste}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (tipoValorAjuste === 'percentual' && tabelaPreco?.percentual_desconto_maximo) {
                        setValorAjuste(Math.min(val, tabelaPreco.percentual_desconto_maximo));
                      } else {
                        setValorAjuste(val);
                      }
                    }}
                    className="flex-1 bg-white dark:bg-gray-700/50 border-0 border-b border-gray-200 dark:border-gray-600 rounded-none h-8 text-sm focus:ring-0"
                    placeholder="0" />

                  </div>
                  {ajusteExcedido &&
                <p className="text-[10px] text-red-500">
                      Excede limite de {currentUser?.limite_desconto || 0}%
                    </p>
                }
                  {valorAjusteCalculado > 0 && !ajusteExcedido &&
                <p className="text-[10px] text-gray-500">
                      - R$ {valorAjusteCalculado.toFixed(2)} ({percentualAjuste.toFixed(1)}%)
                    </p>
                }
                </div>
              }

              {/* Seção de Ajuste Manual - Clean Style */}
              {!tabelaPreco?.permite_desconto_comercial &&
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                <Label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ajuste</Label>
                <div className="flex gap-1">
                  <Select value={tipoAjuste} onValueChange={setTipoAjuste}>
                    <SelectTrigger className="w-20 bg-white dark:bg-gray-700/50 border-0 border-b border-gray-200 dark:border-gray-600 rounded-none h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-xs">
                      <SelectItem value="desconto">Desc.</SelectItem>
                      <SelectItem value="acrescimo">Acrés.</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tipoValorAjuste} onValueChange={setTipoValorAjuste}>
                    <SelectTrigger className="w-14 bg-white dark:bg-gray-700/50 border-0 border-b border-gray-200 dark:border-gray-600 rounded-none h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-xs">
                      <SelectItem value="valor">R$</SelectItem>
                      <SelectItem value="percentual">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorAjuste}
                    onChange={(e) => setValorAjuste(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-white dark:bg-gray-700/50 border-0 border-b border-gray-200 dark:border-gray-600 rounded-none h-8 text-sm focus:ring-0"
                    placeholder="0" />

                </div>
                {ajusteExcedido &&
                <p className="text-[10px] text-red-500">
                    Excede limite de {currentUser?.limite_desconto || 0}%
                  </p>
                }
                {valorAjusteCalculado > 0 && !ajusteExcedido &&
                <p className="text-[10px] text-gray-500">
                    {tipoAjuste === 'desconto' ? '-' : '+'} R$ {valorAjusteCalculado.toFixed(2)} ({percentualAjuste.toFixed(1)}%)
                  </p>
                }
              </div>
              }

              <div className="flex justify-between items-baseline pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-gray-800 text-xl font-bold text-right dark:text-gray-100">R$ {valorTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleAvancarParaCliente}
              disabled={carrinho.length === 0 || ajusteExcedido}
              className="w-full h-12 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white text-base font-medium">

                Avançar (F3)
              </Button>
          </div>
          </div>

        {/* Carrinho Mobile - Overlay */}
        {showCarrinhoMobile &&
        <div className="md:hidden fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-gray-800 flex items-center justify-between">
              <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCarrinhoMobile(false)}
              className="h-11 w-11 -ml-2">

                <Undo2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Carrinho</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 w-11 text-right">{carrinho.length} itens</span>
            </div>

            {/* Lista de Itens */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {carrinho.length === 0 ?
            <div className="text-center py-16 text-gray-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-base">Carrinho vazio</p>
                </div> :

            carrinho.map((item) =>
            <div key={item.produto_id} className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-3">
                        <h3 className="font-medium text-base text-gray-800 dark:text-gray-200 leading-tight">{item.produto_nome}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          R$ {item.preco_unitario_praticado.toFixed(2).replace('.', ',')} × {item.quantidade}
                        </p>
                      </div>
                      <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.produto_id)}
                  className="h-11 w-12 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">

                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade - 1)}
                    className="h-11 w-11 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">

                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold w-12 text-center text-gray-800 dark:text-gray-200">{item.quantidade}</span>
                        <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade + 1)}
                    disabled={!configVenda?.vender_sem_estoque && item.quantidade >= item.estoque_disponivel}
                    className="h-11 w-11 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">

                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                        R$ {item.total.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
            )
            }
            </div>

            {/* Footer - Resumo e Ação */}
            <div className="p-4 bg-white dark:bg-gray-800 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-base text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-xl font-semibold text-gray-800 dark:text-gray-200">
                  <span>Total</span>
                  <span>R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <Button
              onClick={() => {
                setShowCarrinhoMobile(false);
                handleAvancarParaCliente();
              }}
              disabled={carrinho.length === 0}
              className="w-full h-14 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-lg font-medium rounded-xl">

                Avançar
              </Button>
            </div>
          </div>
        }
          </div>

          {/* Barra Inferior Mobile - Compacta */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 px-4 py-2 flex items-center justify-between z-40 border-t border-gray-100 dark:border-gray-700">
                <div className="flex-1">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-none mb-0.5">Total</div>
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">R$ {valorTotal.toFixed(2).replace('.', ',')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLostSalesForm(true)}
            className="h-10 w-10 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20">

                    <AlertCircle className="h-5 w-5" />
                  </Button>
                  <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCarrinhoMobile(true)}
            className="h-10 w-10 rounded-lg relative text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">

                    <ShoppingCart className="h-5 w-5" />
                    {carrinho.length > 0 &&
            <span className="absolute -top-1 -right-1 bg-gray-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {carrinho.length}
                      </span>
            }
                  </Button>
                  <Button
            onClick={handleAvancarParaCliente}
            disabled={carrinho.length === 0}
            className="h-10 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm font-medium rounded-lg">

                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Cliente
                  </Button>
                </div>
              </div>

      {/* Dialog de cliente - GLACIAL PROTOCOL */}
      <Dialog open={showClienteDialog} onOpenChange={setShowClienteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-xl font-medium text-gray-900 dark:text-white">Selecionar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!showNovoClienteForm ?
            <>
                <div className="space-y-2">
                  <Label className="text-sm font-normal text-gray-500 dark:text-gray-400">Buscar Cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                    placeholder="Digite nome, documento ou telefone..."
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    className="pl-11 h-14 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all text-base" />

                  </div>

                  {/* Lista de clientes filtrados */}
                  {clientesFiltrados.length > 0 &&
                <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                      {clientesFiltrados.map((cliente, index) =>
                  <div
                    key={cliente.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors flex justify-between items-center ${
                    clienteSelecionado?.id === cliente.id ? 'bg-gray-50 dark:bg-gray-700/50' : ''} ${

                    index === clienteSelecionadoIndex ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`
                    }
                    onClick={() => handleSelecionarCliente(cliente)}>

                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">{cliente.nome}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {cliente.cpf_cnpj || 'Sem doc'} • {cliente.telefone || 'Sem tel'}
                            </p>
                          </div>
                          {clienteSelecionado?.id === cliente.id &&
                    <div className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></div>
                    }
                        </div>
                  )}
                    </div>
                }

                  {!isMobile && clientesFiltrados.length > 0 &&
                <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                      Use as setas ↑↓ para navegar e Enter para selecionar
                    </p>
                }
                </div>

                {clienteSelecionado &&
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                       <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Selecionado</p>
                       <p className="text-lg font-semibold text-gray-900 dark:text-white">{clienteSelecionado.nome}</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400">{clienteSelecionado.telefone}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setClienteSelecionado(null)}>
                      <X className="w-5 h-5 text-gray-400" />
                    </Button>
                  </div>
              }

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-4 text-gray-400 dark:text-gray-500 font-medium tracking-widest">OU</span>
                  </div>
                </div>

                <Button
                onClick={() => {
                  setShowNovoClienteForm(true);
                  setTimeout(() => clienteNomeRef.current?.focus(), 100);
                }}
                variant="outline"
                className="w-full h-14 text-base font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all">

                  <UserPlus className="w-5 h-5 mr-2 text-gray-500" />
                  {isMobile ? 'Cadastrar Novo Cliente' : 'Cadastrar Novo Cliente (F2)'}
                </Button>

                {/* Método de Entrega */}
                <div className="pt-4">
                  <Label className="text-sm font-normal mb-3 block text-gray-500 dark:text-gray-400">Método de Entrega</Label>
                  <RadioGroup value={metodoEntrega} onValueChange={setMetodoEntrega} className="space-y-1">
                    <div className={`flex items-center space-x-4 p-3 rounded-xl transition-all cursor-pointer group ${
                  metodoEntrega === 'Retirada' ?
                  'bg-gray-100 dark:bg-gray-800' :
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`
                  } onClick={() => setMetodoEntrega('Retirada')}>
                      <RadioGroupItem value="Retirada" id="ret" className="border-gray-400 text-gray-900 w-5 h-5 mt-0.5" />
                      <Label htmlFor="ret" className="flex items-center gap-3 cursor-pointer flex-1 text-gray-900 dark:text-gray-100 font-normal text-base">
                        <div className={`p-2 rounded-lg ${metodoEntrega === 'Retirada' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Store className={`w-5 h-5 ${metodoEntrega === 'Retirada' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`} />
                        </div>
                        Retirada no Balcão
                      </Label>
                    </div>
                    
                    <div className={`flex items-center space-x-4 p-3 rounded-xl transition-all cursor-pointer group ${
                  metodoEntrega === 'Delivery' ?
                  'bg-gray-100 dark:bg-gray-800' :
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`
                  } onClick={() => setMetodoEntrega('Delivery')}>
                      <RadioGroupItem value="Delivery" id="del" className="border-gray-400 text-gray-900 w-5 h-5 mt-0.5" />
                      <Label htmlFor="del" className="flex items-center gap-3 cursor-pointer flex-1 text-gray-900 dark:text-gray-100 font-normal text-base">
                        <div className={`p-2 rounded-lg ${metodoEntrega === 'Delivery' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Truck className={`w-5 h-5 ${metodoEntrega === 'Delivery' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`} />
                        </div>
                        Delivery / Entrega
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </> :

            <form onSubmit={handleCriarNovoCliente} className="space-y-5">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Nome Completo *</Label>
                  <Input
                  ref={clienteNomeRef}
                  placeholder="Nome do cliente..."
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  required
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all" />

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Telefone</Label>
                    <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                    inputMode="tel"
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" />

                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Tipo de Documento</Label>
                    <Select
                    value={novoCliente.tipo_documento}
                    onValueChange={(v) => setNovoCliente({ ...novoCliente, tipo_documento: v })}>

                      <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl">
                        <SelectItem value="CPF">CPF</SelectItem>
                        <SelectItem value="RG">RG</SelectItem>
                        <SelectItem value="CNH">CNH</SelectItem>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="Passaporte">Passaporte</SelectItem>
                        <SelectItem value="Doc. Estrangeiro">Doc. Estrangeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Número do Documento</Label>
                  <Input
                  placeholder="000.000.000-00"
                  value={novoCliente.numero_documento}
                  onChange={(e) => setNovoCliente({ ...novoCliente, numero_documento: e.target.value })}
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" />

                </div>

                <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Endereço</Label>
                    <Textarea
                  placeholder="Rua, número, bairro, cidade..."
                  value={novoCliente.endereco}
                  onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl resize-none py-3" />

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Perfil do Cliente</Label>
                      <Select
                    value={novoCliente.perfil}
                    onValueChange={(v) => setNovoCliente({ ...novoCliente, perfil: v })}>

                        <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl">
                          <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                          <SelectItem value="Profissional/Instalador">Profissional/Instalador</SelectItem>
                          <SelectItem value="Empresa/Loja">Empresa/Loja</SelectItem>
                          <SelectItem value="Construtora/Obra">Construtora/Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Data de Nascimento</Label>
                      <Input
                    type="date"
                    value={novoCliente.data_nascimento}
                    onChange={(e) => setNovoCliente({ ...novoCliente, data_nascimento: e.target.value })}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl" />

                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Observações</Label>
                    <Textarea
                  placeholder="Informações adicionais sobre o cliente..."
                  value={novoCliente.observacoes}
                  onChange={(e) => setNovoCliente({ ...novoCliente, observacoes: e.target.value })}
                  rows={2}
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl resize-none" />

                  </div>

                  <div className="flex gap-3 pt-4">
                  <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNovoClienteForm(false)}
                  className="flex-1 h-12 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium">

                    Voltar
                  </Button>
                  <Button
                  type="submit"
                  className="flex-1 h-12 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-medium rounded-xl">

                    <UserPlus className="w-5 h-5 mr-2" />
                    Cadastrar
                  </Button>
                </div>
              </form>
            }
          </div>

          {!showNovoClienteForm &&
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 mt-2">
              <Button
              variant="outline"
              onClick={() => setShowClienteDialog(false)}
              className="w-full sm:w-auto h-12 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-medium rounded-xl">

                Cancelar {!isMobile && '(ESC)'}
              </Button>
              <Button
              onClick={handleFinalizarPreVenda}
              disabled={!clienteSelecionado || isProcessing || ajusteExcedido}
              className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white w-full sm:w-auto h-12 text-base font-medium rounded-xl shadow-none disabled:opacity-50 border-0">

                {isProcessing ? 'Processando...' : currentUser?.pode_acessar_caixa ? 'Ir para Pagamento' : 'Enviar ao Caixa'}
              </Button>
            </DialogFooter>
          }
        </DialogContent>
      </Dialog>

      {ultimaPreVenda &&
      <ComprovantePreVenda
        preVenda={ultimaPreVenda}
        open={showComprovante}
        onClose={() => {
          setShowComprovante(false);
          setTimeout(() => inputProdutoRef.current?.focus(), 100);
        }} />

      }

      <LostSalesForm
        open={showLostSalesForm}
        onClose={() => setShowLostSalesForm(false)}
        currentUser={currentUser} />


      <BarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(code) => {
          setBuscaProduto(code);
          setShowBarcodeScanner(false);
          // Busca automática do produto pelo código
          const produto = produtos.find((p) =>
          p.codigo_barras === code || p.codigo_interno === code
          );
          if (produto) {
            handleSelecionarProduto(produto);
          }
        }} />

      {/* Dialog de Reeditar Rascunho */}
      <Dialog open={showReeditarDialog} onOpenChange={setShowReeditarDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-xl font-medium text-gray-900 dark:text-white">Reeditar Rascunho</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-normal text-gray-500 dark:text-gray-400 mb-2 block">
                Digite os 4 últimos dígitos da senha
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0000"
                maxLength={4}
                value={senhaReeditar}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 4);
                  setSenhaReeditar(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleReeditarRascunho();
                  }
                }}
                className="h-16 text-center text-2xl font-bold tracking-widest bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl"
                autoFocus
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              A senha está impressa no comprovante do cliente
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowReeditarDialog(false);
                setSenhaReeditar('');
              }}
              className="w-full sm:w-auto h-12 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-medium rounded-xl">

              Cancelar
            </Button>
            <Button
              onClick={handleReeditarRascunho}
              disabled={senhaReeditar.length < 4}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white w-full sm:w-auto h-12 text-base font-medium rounded-xl disabled:opacity-50">

              Carregar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>);

}