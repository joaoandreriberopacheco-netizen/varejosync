import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Produto } from '@/entities/Produto';
import { Terceiro } from '@/entities/Terceiro';
import { TabelaPreco } from '@/entities/TabelaPreco';
import { User } from '@/entities/User';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, ShoppingCart, Trash2, UserPlus, ArrowRight, Barcode, Camera, CreditCard, Banknote, Smartphone, CheckCircle2, Plus, Minus, X, AlertCircle, Package } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BarcodeScanner from './BarcodeScanner';
import { createPageUrl } from '@/utils';
import { getTenantId } from '@/components/utils/tenant';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function PDVSupermercado() {
  const [carrinho, setCarrinho] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSugeridos, setProdutosSugeridos] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tabelaPreco, setTabelaPreco] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [showClienteDialog, setShowClienteDialog] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Product Entry States (Matching PDVVendedor)
  const [quantidadeAtual, setQuantidadeAtual] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [produtoSelecionadoIndex, setProdutoSelecionadoIndex] = useState(0);
  const [configVenda, setConfigVenda] = useState(null);

  // Payment States
  const [pagamentosDinheiro, setPagamentosDinheiro] = useState(0);
  const [pagamentosPix, setPagamentosPix] = useState(0);
  const [pagamentosDebito, setPagamentosDebito] = useState(0);
  const [pagamentosCredito, setPagamentosCredito] = useState(0);
  const [parcelasCredito, setParcelasCredito] = useState(1);
  const [formaPagamentoAtiva, setFormaPagamentoAtiva] = useState(0);
  
  const [inputDinheiro, setInputDinheiro] = useState('');
  const [inputPix, setInputPix] = useState('');
  const [inputDebito, setInputDebito] = useState('');
  const [inputCredito, setInputCredito] = useState('');

  const inputProdutoRef = useRef(null);
  const quantidadeInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const inputRefs = {
    dinheiro: useRef(null),
    pix: useRef(null),
    debito: useRef(null),
    credito: useRef(null)
  };

  const { toast } = useToast();

  const totalCarrinho = useMemo(() => carrinho.reduce((acc, item) => acc + item.total, 0), [carrinho]);
  const totalPago = pagamentosDinheiro + pagamentosPix + pagamentosDebito + pagamentosCredito;
  const valorRestante = Math.max(0, totalCarrinho - totalPago);
  const troco = Math.max(0, totalPago - totalCarrinho);
  const pagamentoValido = totalPago >= totalCarrinho && totalCarrinho > 0;

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    if (inputProdutoRef.current && !showPaymentDialog && !showClienteDialog && !produtoSelecionado) {
      inputProdutoRef.current.focus();
    }
  }, [carrinho, showPaymentDialog, showClienteDialog, produtoSelecionado]);

  // Keyboard Navigation for Suggestions
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showSuggestions && produtosSugeridos.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setProdutoSelecionadoIndex(prev =>
            prev < produtosSugeridos.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setProdutoSelecionadoIndex(prev =>
            prev > 0 ? prev - 1 : produtosSugeridos.length - 1
          );
        }
        if (e.key === 'Enter' && document.activeElement === inputProdutoRef.current) {
          e.preventDefault();
          if (produtosSugeridos[produtoSelecionadoIndex]) {
            handleSelecionarProduto(produtosSugeridos[produtoSelecionadoIndex]);
          }
        }
      }
      
      if (e.key === 'F3' && carrinho.length > 0 && !showPaymentDialog) {
        e.preventDefault();
        handlePaymentOpen();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSuggestions, produtosSugeridos, produtoSelecionadoIndex, carrinho, showPaymentDialog]);

  const loadDependencies = async () => {
    try {
      const [produtosData, userData, clientesData, configsVendas] = await Promise.all([
        base44.entities.Produto.filter({ ativo: true }),
        base44.auth.me(),
        base44.entities.Terceiro.filter({ tipo: ['Cliente', 'Ambos'] }),
        base44.entities.ConfiguracoesVenda.list()
      ]);
      setProdutos(produtosData);
      setCurrentUser(userData);
      setClientes(clientesData);
      if (configsVendas.length > 0) {
        setConfigVenda(configsVendas[0]);
      }
      if (userData.tabela_preco_id) {
        const tabela = await TabelaPreco.get(userData.tabela_preco_id);
        setTabelaPreco(tabela);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Product Search Logic
  useEffect(() => {
    if (buscaProduto.trim().length >= 2) {
      const termo = buscaProduto.toLowerCase();
      const resultados = produtos.filter(p =>
        p.codigo_barras?.toLowerCase().includes(termo) ||
        p.codigo_interno?.toLowerCase().includes(termo) ||
        p.nome?.toLowerCase().includes(termo)
      ).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 10);
      
      setProdutosSugeridos(resultados);
      setShowSuggestions(true);
      setProdutoSelecionadoIndex(0);
    } else {
      setProdutosSugeridos([]);
      setShowSuggestions(false);
    }
  }, [buscaProduto, produtos]);

  const handleSelecionarProduto = (produto) => {
    setProdutoSelecionado(produto);
    setBuscaProduto('');
    setShowSuggestions(false);
    setQuantidadeAtual('');
    setTimeout(() => quantidadeInputRef.current?.focus(), 100);
  };

  const handleConfirmarAdicao = () => {
    if (!produtoSelecionado) return;

    const quantidade = parseInt(quantidadeAtual) || 1;
    const preco = produtoSelecionado.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1);
    
    const itemExistente = carrinho.find(i => i.produto_id === produtoSelecionado.id);
    
    if (itemExistente) {
      setCarrinho(carrinho.map(i => i.produto_id === produtoSelecionado.id 
        ? { 
            ...i, 
            quantidade: i.quantidade + quantidade, 
            total: (i.quantidade + quantidade) * preco 
          } 
        : i));
    } else {
      setCarrinho([...carrinho, {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        codigo_interno: produtoSelecionado.codigo_interno,
        quantidade: quantidade,
        preco_unitario: preco,
        preco_unitario_praticado: preco,
        total: quantidade * preco,
        estoque_disponivel: produtoSelecionado.estoque_atual
      }]);
    }

    setProdutoSelecionado(null);
    setQuantidadeAtual('');
    inputProdutoRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && showSuggestions && produtosSugeridos.length > 0) {
      e.preventDefault();
      quantidadeInputRef.current?.focus();
    }
  };

  const handleQuantidadeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmarAdicao();
    }
  };

  const handlePaymentOpen = () => {
    if (carrinho.length === 0) return;
    setPagamentosDinheiro(totalCarrinho);
    setInputDinheiro(formatarValorExibicao(totalCarrinho));
    setPagamentosPix(0); setInputPix('0,00');
    setPagamentosDebito(0); setInputDebito('0,00');
    setPagamentosCredito(0); setInputCredito('0,00');
    setShowPaymentDialog(true);
  };

  const handleFinalizarVenda = async () => {
    if (!pagamentoValido) return;
    setIsProcessing(true);

    try {
      const pagamentos = [];
      if (pagamentosDinheiro > 0) pagamentos.push({ forma_pagamento: 'Dinheiro', valor: pagamentosDinheiro, parcelas: 1 });
      if (pagamentosPix > 0) pagamentos.push({ forma_pagamento: 'PIX', valor: pagamentosPix, parcelas: 1 });
      if (pagamentosDebito > 0) pagamentos.push({ forma_pagamento: 'Cartão de Débito', valor: pagamentosDebito, parcelas: 1 });
      if (pagamentosCredito > 0) pagamentos.push({ forma_pagamento: 'Cartão de Crédito', valor: pagamentosCredito, parcelas: parcelasCredito });

      const pedidoData = {
        tipo: 'PDV Supermercado',
        cliente_id: cliente?.id,
        cliente_nome: cliente?.nome || 'Consumidor Final',
        vendedor_id: currentUser.id,
        vendedor_nome: currentUser.full_name,
        status: 'Finalizado',
        itens: carrinho.map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          preco_unitario_praticado: item.preco_unitario_praticado,
          total: item.total
        })),
        valor_total: totalCarrinho,
        pagamentos: pagamentos,
        caixa_destino_id: currentUser.caixa_destino_id
      };

      await base44.entities.PedidoVenda.create(pedidoData);
      
      toast({ title: "Venda Finalizada!", className: "bg-emerald-100 text-emerald-800" });
      setCarrinho([]);
      setCliente(null);
      setShowPaymentDialog(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Formatter helpers
  const formatarValorExibicao = (valor) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const aplicarMascaraValor = (valorAtual, tecla) => {
    let numeros = valorAtual.replace(/\D/g, '');
    if (/^\d$/.test(tecla)) numeros += tecla;
    return formatarValorExibicao(parseInt(numeros) / 100);
  };

  const handleInputMascara = (e, setInput, setValor) => {
    const tecla = e.key;
    if (tecla === 'Backspace') {
      e.preventDefault();
      let numeros = e.target.value.replace(/\D/g, '').slice(0, -1) || '0';
      const valor = parseInt(numeros) / 100;
      setInput(formatarValorExibicao(valor));
      setValor(valor);
    } else if (/^\d$/.test(tecla)) {
      e.preventDefault();
      const novoValor = aplicarMascaraValor(e.target.value, tecla);
      setInput(novoValor);
      setValor(parseFloat(novoValor.replace(/\./g, '').replace(',', '.')));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shadow-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">PDV Supermercado</h1>
            <p className="text-xs opacity-80">Venda Rápida • Estoque & Financeiro Integrados</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
             <p className="text-xs opacity-80">Operador</p>
             <p className="font-semibold text-sm">{currentUser?.full_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'} className="hover:bg-indigo-700">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product List */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search and Add Product Area - MATCHING PDV VENDEDOR STYLE */}
          <div className="mb-4 flex-shrink-0" ref={suggestionsRef}>
            <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    ref={inputProdutoRef}
                    placeholder="Escanear, nome ou código..."
                    className="pl-12 pr-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 h-14 md:h-14 text-base focus:ring-2 focus:ring-gray-300 focus:border-gray-400 placeholder:text-gray-400"
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                </div>
              <Input 
                ref={quantidadeInputRef}
                type="number"
                inputMode="numeric"
                placeholder="Qtd"
                className="w-20 md:w-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 h-14 md:h-14 text-center text-lg font-semibold focus:ring-2 focus:ring-gray-300"
                value={quantidadeAtual}
                onChange={(e) => setQuantidadeAtual(parseInt(e.target.value) || 1)}
                onKeyDown={handleQuantidadeKeyDown}
                min="1"
                disabled={!produtoSelecionado}
              />
            </div>
            
            {/* Suggestions Dropdown */}
            {showSuggestions && produtosSugeridos.length > 0 && (
                <div className="absolute z-50 mt-2 w-full max-w-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto">
                  {produtosSugeridos.map((produto, index) => {
                    const preco = (produto.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1));
                    const isSelected = index === produtoSelecionadoIndex;
                    return (
                      <div
                        key={produto.id}
                        className={`p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-b-0 cursor-pointer transition-all flex justify-between items-center ${
                          isSelected ? 'bg-gray-100 dark:bg-gray-700 border-l-4 border-l-gray-400 pl-3' : 'pl-4'
                        }`}
                        onClick={() => handleSelecionarProduto(produto)}
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight">{produto.nome}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">#{produto.codigo_interno || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">R$ {preco.toFixed(2)}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${produto.estoque_atual > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {produto.estoque_atual} un.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}

            {/* Selected Product Preview (Before Adding) */}
            {produtoSelecionado && (
              <div className="mt-3 p-3 md:p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{produtoSelecionado.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>R$ {(produtoSelecionado.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1)).toFixed(2)} un.</span>
                        <span>•</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Total: R$ {((produtoSelecionado.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1)) * (parseInt(quantidadeAtual) || 1)).toFixed(2)}
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
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmarAdicao}
                      className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-6"
                      size="sm"
                    >
                      Adicionar (Enter)
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 border-b">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3 text-center">Qtd</th>
                  <th className="p-3 text-right">Unit.</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {carrinho.map(item => (
                  <tr key={item.produto_id} className="border-b last:border-0">
                    <td className="p-3 font-medium">
                      <div className="flex flex-col">
                        <span>{item.produto_nome}</span>
                        <span className="text-xs text-gray-400">{item.codigo_interno}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => {
                           const newQtd = item.quantidade - 1;
                           if(newQtd <= 0) setCarrinho(carrinho.filter(i => i.produto_id !== item.produto_id));
                           else setCarrinho(carrinho.map(i => i.produto_id === item.produto_id ? {...i, quantidade: newQtd, total: newQtd * i.preco_unitario_praticado} : i));
                        }} className="w-6 h-6 bg-gray-100 rounded hover:bg-gray-200 font-bold">-</button>
                        <span className="w-8 font-semibold">{item.quantidade}</span>
                        <button onClick={() => {
                           const newQtd = item.quantidade + 1;
                           setCarrinho(carrinho.map(i => i.produto_id === item.produto_id ? {...i, quantidade: newQtd, total: newQtd * i.preco_unitario_praticado} : i));
                        }} className="w-6 h-6 bg-gray-100 rounded hover:bg-gray-200 font-bold">+</button>
                      </div>
                    </td>
                    <td className="p-3 text-right">R$ {item.preco_unitario_praticado.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold">R$ {item.total.toFixed(2)}</td>
                    <td className="p-3">
                      <Trash2 className="w-4 h-4 text-red-400 cursor-pointer hover:text-red-600" onClick={() => setCarrinho(carrinho.filter(i => i.produto_id !== item.produto_id))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {carrinho.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-lg">Carrinho Vazio</p>
                <p className="text-sm">Escaneie ou busque um produto</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary & Actions */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l p-6 flex flex-col shadow-lg z-10">
          <div className="mb-6">
            <h2 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-2">Resumo</h2>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">R$ {totalCarrinho.toFixed(2)}</div>
            <p className="text-sm text-gray-500">{carrinho.reduce((acc, i) => acc + i.quantidade, 0)} itens</p>
          </div>

          <div className="space-y-3 mb-auto">
             <div className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <UserPlus className="w-4 h-4 text-gray-400" />
                   <span className="text-sm">{cliente ? cliente.nome : 'Consumidor Final'}</span>
                </div>
                <Button variant="link" size="sm" onClick={() => setShowClienteDialog(true)}>Alterar</Button>
             </div>
          </div>

          <Button 
            size="lg" 
            className="h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 w-full rounded-xl shadow-emerald-200"
            onClick={handlePaymentOpen}
            disabled={carrinho.length === 0}
          >
            Finalizar Venda (F3)
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pagamento</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-8">
             <div className="space-y-4">
                {/* Input fields for payment methods */}
                {['Dinheiro', 'PIX', 'Cartão Débito', 'Cartão Crédito'].map((label, i) => {
                   const refs = [inputRefs.dinheiro, inputRefs.pix, inputRefs.debito, inputRefs.credito];
                   const vals = [inputDinheiro, inputPix, inputDebito, inputCredito];
                   const setters = [setInputDinheiro, setInputPix, setInputDebito, setInputCredito];
                   const numSetters = [setPagamentosDinheiro, setPagamentosPix, setPagamentosDebito, setPagamentosCredito];
                   const icons = [Banknote, Smartphone, CreditCard, CreditCard];
                   const Icon = icons[i];
                   
                   return (
                     <div key={label} 
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${formaPagamentoAtiva === i ? 'bg-gray-100 border border-indigo-200' : 'border border-transparent'}`}
                        onClick={() => { setFormaPagamentoAtiva(i); refs[i].current?.focus(); }}
                     >
                        <div className="flex items-center gap-2">
                           <Icon className="w-5 h-5 text-gray-500" />
                           <span>{label}</span>
                        </div>
                        <input 
                           ref={refs[i]}
                           value={vals[i]}
                           onChange={() => {}}
                           onKeyDown={(e) => handleInputMascara(e, setters[i], numSetters[i])}
                           onFocus={(e) => { e.target.select(); setFormaPagamentoAtiva(i); }}
                           className="w-24 text-right bg-transparent font-bold outline-none"
                        />
                     </div>
                   );
                })}
             </div>
             <div className="bg-gray-50 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                <p className="text-sm text-gray-500 uppercase">Total a Pagar</p>
                <p className="text-3xl font-bold text-gray-900 mb-4">R$ {totalCarrinho.toFixed(2)}</p>
                
                {troco > 0 && <p className="text-emerald-600 font-bold text-xl">Troco: R$ {troco.toFixed(2)}</p>}
                {valorRestante > 0.01 && <p className="text-amber-600 font-bold text-xl">Falta: R$ {valorRestante.toFixed(2)}</p>}

                <Button 
                  onClick={handleFinalizarVenda} 
                  disabled={!pagamentoValido || isProcessing}
                  className="w-full mt-6 h-12 text-lg bg-indigo-600 hover:bg-indigo-700"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar'}
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Selection Dialog */}
      <Dialog open={showClienteDialog} onOpenChange={setShowClienteDialog}>
        <DialogContent>
           <DialogHeader><DialogTitle>Selecionar Cliente</DialogTitle></DialogHeader>
           <Input placeholder="Buscar cliente..." value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} autoFocus />
           <div className="mt-4 max-h-60 overflow-y-auto">
              {clientes.filter(c => c.nome.toLowerCase().includes(buscaCliente.toLowerCase())).map(c => (
                 <div key={c.id} className="p-3 hover:bg-gray-50 cursor-pointer border-b" onClick={() => { setCliente(c); setShowClienteDialog(false); }}>
                    <p className="font-bold">{c.nome}</p>
                    <p className="text-xs text-gray-500">{c.cpf_cnpj}</p>
                 </div>
              ))}
           </div>
           <Button variant="outline" onClick={() => { setCliente(null); setShowClienteDialog(false); }}>Consumidor Final</Button>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(code) => {
          setBuscaProduto(code);
          setShowBarcodeScanner(false);
          const produto = produtos.find(p => 
            p.codigo_barras === code || p.codigo_interno === code
          );
          if (produto) {
            handleSelecionarProduto(produto);
          }
        }}
      />
    </div>
  );
}