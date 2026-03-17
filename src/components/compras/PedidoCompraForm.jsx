import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
// Dialog still used for isSolicitarEdicao modal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { X, Save, PlusCircle, FileText, Truck, DollarSign, AlertCircle, Package, Ship, Box, MapPin, FileDown, FileUp, Download, Trash2, Calendar, Package as PackageIcon, Users, Undo, Redo, Printer, ShoppingCart, ChevronDown, MoreVertical, Clock, Send, Plus, History } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { addDays, format } from 'date-fns';
import { agora, formatarLogTime } from '@/components/utils/dateUtils';
import { registrarTransicao } from './transicaoHelper';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import MobileProductSelector from './MobileProductSelector';
import StatusTimeline from './StatusTimeline';
import AtualizarPrecosDialog from './AtualizarPrecosDialog';
import PendenciasPedido from './PendenciasPedido';
import LogsPedidoCompra from './LogsPedidoCompra';
import PedidoCompraFAB from './PedidoCompraFAB.jsx';
import BannerStatusPedido from './BannerStatusPedido.jsx';
import AnexosPedidoCompra from './AnexosPedidoCompra.jsx';
import SolicitarEdicaoPDV from './SolicitarEdicaoPDV.jsx';
import LancamentosCompraPanel from './LancamentosCompraPanel.jsx';

export default function PedidoCompraForm({ pedido, onSave, onClose }) {
  const [formData, setFormData] = useState(pedido || {
    fornecedor_id: '',
    fornecedor_nome: '',
    data_emissao: format(new Date(), 'yyyy-MM-dd'),
    data_prevista_entrega: '',
    prazo_entrega_dias: 0,
    status: 'Rascunho',
    itens: [],
    valor_itens: 0,
    valor_frete: 0,
    valor_desconto: 0,
    percentual_desconto: 0,
    valor_total: 0,
    observacoes: '',
    historico: '',
    condicoes_pagamento: '',
    tags: [],
    // Logística
    evento_logistico_id: '',
    nfe_emitida: false,
    manifesto_conferido: false,
    // Financeiro
    forma_pagamento_compra: 'Parcelado',
    num_parcelas: 1,
    intervalo_parcelas_dias: 30,
    data_primeiro_vencimento: '',
    conta_pagamento_id: ''
  });
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [selectedFornecedorIndex, setSelectedFornecedorIndex] = useState(-1);
  
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(lower) || 
      (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower)) ||
      (p.codigo_barras && p.codigo_barras.includes(lower))
    ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 30);
  }, [produtos, search]);

  const filteredFornecedores = useMemo(() => {
    const sorted = [...fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!searchFornecedor.trim()) return sorted;
    const lower = searchFornecedor.toLowerCase();
    return sorted.filter(f => 
      f.nome.toLowerCase().includes(lower) || 
      (f.codigo_interno && f.codigo_interno.toLowerCase().includes(lower))
    );
  }, [fornecedores, searchFornecedor]);
  const [supermanifesto, setSupermanifesto] = useState(null);
  const [contas, setContas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReopenAuthOpen, setIsReopenAuthOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSolicitarEdicaoOpen, setIsSolicitarEdicaoOpen] = useState(false);
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [isAnexosOpen, setIsAnexosOpen] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [isNovoFornecedorOpen, setIsNovoFornecedorOpen] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', email: '', telefone: '', endereco: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (pedido) {
      setFormData(pedido);
      setHistory([pedido]);
      setHistoryIndex(0);
    }
  }, [pedido]);

  useEffect(() => {
    const loadDependencies = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const [fornecedorData, produtoData, transportadoraData, contasData, empresaData] = await Promise.all([
        base44.entities.Terceiro.list(),
        base44.entities.Produto.list(),
        base44.entities.Terceiro.list(),
        base44.entities.ContasFinanceiras.list(),
        base44.entities.DadosEmpresa.list()
      ]);
      setFornecedores(fornecedorData.filter(t => t.tipo === 'Fornecedor' || t.tipo === 'Ambos'));
      setProdutos(produtoData);
      setContas(contasData);
      if (empresaData && empresaData.length > 0) {
        setEmpresa(empresaData[0]);
      }
      
      // Transportadoras são também fornecedores
      const transportadoras = transportadoraData.filter(t => (t.tipo === 'Fornecedor' || t.tipo === 'Ambos') && t.ativo);
      setFornecedores(prev => transportadoras); // Reutiliza a lista

      // Carregar supermanifesto se existir (via manifesto_entrada)
      if (pedido?.manifesto_entrada_id) {
        const manifestoEntrada = await base44.entities.ManifestoEntrada.filter({ id: pedido.manifesto_entrada_id });
        if (manifestoEntrada && manifestoEntrada.length > 0 && manifestoEntrada[0].supermanifesto_id) {
          const manifestoData = await base44.entities.Supermanifesto.filter({ id: manifestoEntrada[0].supermanifesto_id });
          if (manifestoData && manifestoData.length > 0) {
            setSupermanifesto(manifestoData[0]);
          }
        }
      }
    };
    loadDependencies();
  }, [pedido]);

  // Cálculos automáticos
  const { valorItens, valorTotal, percentualDesconto } = useMemo(() => {
    const itens = formData.itens.reduce((acc, item) => acc + (item.total || 0), 0);
    const frete = parseFloat(formData.valor_frete) || 0;
    const desconto = parseFloat(formData.valor_desconto) || 0;
    const total = itens + frete - desconto;
    const percentDesc = itens > 0 ? (desconto / itens) * 100 : 0;
    return { 
      valorItens: itens, 
      valorTotal: total,
      percentualDesconto: percentDesc
    };
  }, [formData.itens, formData.valor_frete, formData.valor_desconto]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      saveToHistory(newData);
      return newData;
    });
  };

  const saveToHistory = (newData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newData];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setFormData(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setFormData(history[historyIndex + 1]);
    }
  };
  
  const handleFornecedorChange = (id) => {
    if (id === 'novo') {
      setIsNovoFornecedorOpen(true);
      return;
    }
    const fornecedor = fornecedores.find(f => f.id === id);
    if (fornecedor) {
      handleChange('fornecedor_id', id);
      handleChange('fornecedor_nome', fornecedor.nome);
    }
  };

  const handleCreateFornecedor = async () => {
    if (!novoFornecedor.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    try {
      const novoF = await base44.entities.Terceiro.create({
        nome: novoFornecedor.nome,
        email: novoFornecedor.email || '',
        telefone: novoFornecedor.telefone || '',
        endereco: novoFornecedor.endereco || '',
        tipo: 'Fornecedor',
        ativo: true
      });

      setFornecedores(prev => [...prev, novoF]);
      handleChange('fornecedor_id', novoF.id);
      handleChange('fornecedor_nome', novoF.nome);

      setIsNovoFornecedorOpen(false);
      setNovoFornecedor({ nome: '', email: '', telefone: '', endereco: '' });
      toast({ title: 'Fornecedor criado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' });
    }
  };

  const handleDescontoPercentualChange = (value) => {
    const percent = parseFloat(value) || 0;
    const descontoValor = (valorItens * percent) / 100;
    setFormData(prev => ({ 
      ...prev, 
      percentual_desconto: percent,
      valor_desconto: descontoValor 
    }));
  };

  const handleDescontoValorChange = (value) => {
    const desconto = parseFloat(value) || 0;
    const percent = valorItens > 0 ? (desconto / valorItens) * 100 : 0;
    setFormData(prev => ({ 
      ...prev, 
      valor_desconto: desconto,
      percentual_desconto: percent 
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.itens];
    const item = newItems[index];

    // Support for bulk updates (field as object)
    if (typeof field === 'object' && field !== null) {
        Object.assign(item, field);
    } else {
        item[field] = value;
        
        if (field === 'produto_id') {
            const produto = produtos.find(p => p.id === value);
            if (produto) {
                item.produto_nome = produto.nome;
                item.codigo_produto = produto.codigo_interno || produto.codigo_barras;
                item.unidade_medida = produto.unidade_compra || 'UN';
                item.custo_unitario = produto.valor_compra || 0;
                item.valor_desconto_item = produto.desconto_compra_padrao || 0; 
            }
        }
    }

    // Simplified calculation: price - discount
    const qty = parseFloat(item.quantidade) || 0;
    const cost = parseFloat(item.custo_unitario) || 0;
    const descUnit = parseFloat(item.valor_desconto_item) || 0;
    
    const custoFinalUnitario = cost - descUnit;
    item.custo_final_unitario = custoFinalUnitario;
    item.subtotal = qty * cost;
    item.total = custoFinalUnitario * qty;

    const newData = { ...formData, itens: newItems };
    saveToHistory(newData);
    setFormData(newData);
  };

  const handleAddItem = (product = null) => {
    let newItem;
    
    const calculateItemTotals = (item) => {
        const qty = parseFloat(item.quantidade) || 0;
        const cost = parseFloat(item.custo_unitario) || 0;
        const descUnit = parseFloat(item.valor_desconto_item) || 0;
        
        const custoFinalUnitario = cost - descUnit;
        const total = custoFinalUnitario * qty;

        return {
            ...item,
            subtotal: qty * cost,
            total: total,
            custo_final_unitario: custoFinalUnitario
        };
    };

    if (product && product.produto_id && product.quantidade) {
        newItem = calculateItemTotals(product);
    } else {
        newItem = { 
            produto_id: product?.id || '', 
            produto_nome: product?.nome || '', 
            codigo_produto: product?.codigo_interno || product?.codigo_barras || '',
            quantidade: 1, 
            unidade_medida: product?.unidade_compra || 'UN',
            custo_unitario: product?.valor_compra || 0,
            valor_desconto_item: product?.desconto_compra_padrao || 0,
            observacao_item: ''
        };
        newItem = calculateItemTotals(newItem);
    }

    const newData = {
      ...formData,
      itens: [...formData.itens, newItem],
    };
    saveToHistory(newData);
    setFormData(newData);
  };

  const handleExportModel = async () => {
    try {
      toast({ title: "Gerando planilha...", description: "Aguarde o download." });
      
      const response = await base44.functions.invoke('exportProdutosCompra');
      
      if (response.data && response.data.file_content) {
          // Decode Base64 properly handling UTF-8 characters
          const binaryString = window.atob(response.data.file_content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', response.data.filename || 'modelo.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          throw new Error("Formato de resposta inválido");
      }
      
    } catch (error) {
        console.error("Erro export:", error);
        toast({ title: "Erro ao exportar", description: "Verifique se a função backend está ativa.", variant: "destructive" });
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n');
        
        // Remove headers
        const dataRows = lines.slice(1);
        
        const newItems = [];
        let skippedCount = 0;
        let successCount = 0;

        dataRows.forEach(line => {
            if (!line.trim()) return;
            
            // Simple semi-colon split (assuming no semi-colons in quoted strings for simplicity, 
            // or basic regex split if needed. Excel CSV usually safe with split unless text has it)
            // Regex to split by semicolon, ignoring those inside quotes
            const cols = line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            // Map columns based on our export order:
            // 0:ID, 1:COD, 2:NAME, 3:UNIT, 4:COST, 5:QTY, 6:NEW_COST, 7:FREIGHT, 8:IMP1, 9:IMP2, 10:DESC, 11:OUTROS, 12:MARKUP
            
            if (cols.length < 6) return; // Invalid row

            const id = cols[0]?.replace(/"/g, '').trim();
            const qtyStr = cols[5]?.replace(/"/g, '').trim();
            
            // Parse numbers (handle comma decimal)
            const parseBRFloat = (str) => {
                if (!str) return 0;
                return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
            };

            const qty = parseBRFloat(qtyStr);

            if (qty > 0 && id) {
                const product = produtos.find(p => p.id === id);
                if (product) {
                    const currentCost = parseBRFloat(cols[4]?.replace(/"/g, ''));
                    const newCost = parseBRFloat(cols[6]?.replace(/"/g, ''));
                    const discount = parseBRFloat(cols[10]?.replace(/"/g, ''));
                    
                    const finalCost = newCost > 0 ? newCost : (currentCost > 0 ? currentCost : product.valor_compra);
                    const custoFinalUnitario = finalCost - discount;

                    newItems.push({
                        produto_id: product.id,
                        produto_nome: product.nome,
                        codigo_produto: product.codigo_interno || product.codigo_barras,
                        quantidade: qty,
                        unidade_medida: product.unidade_principal || 'UN',
                        custo_unitario: finalCost,
                        valor_desconto_item: discount,
                        custo_final_unitario: custoFinalUnitario,
                        subtotal: qty * finalCost,
                        total: custoFinalUnitario * qty,
                        observacao_item: 'Importado via CSV'
                    });
                    successCount++;
                }
            } else {
                skippedCount++;
            }
        });

        if (newItems.length > 0) {
            setFormData(prev => ({
                ...prev,
                itens: [...prev.itens, ...newItems]
            }));
            toast({ 
                title: "Importação concluída", 
                description: `${successCount} itens adicionados.`,
                variant: "default"
            });
        } else {
            toast({ 
                title: "Nenhum item importado", 
                description: "Verifique se preencheu a coluna 'QUANTIDADE_COMPRA' na planilha.",
                variant: "warning"
            });
        }
        
        // Reset input
        e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.itens];
    newItems.splice(index, 1);
    const newData = { ...formData, itens: newItems };
    saveToHistory(newData);
    setFormData(newData);
  };

  const handleInitiateSave = () => {
    if (!formData.fornecedor_id) {
      toast({
        title: "Fornecedor obrigatório",
        description: "Selecione um fornecedor antes de salvar.",
        variant: "destructive"
      });
      return;
    }

    if (formData.itens.length === 0) {
      toast({
        title: "Adicione itens",
        description: "O pedido precisa ter pelo menos um item.",
        variant: "destructive"
      });
      return;
    }

    setIsAuthOpen(true);
  };

  const handleSolicitarEdicao = async () => {
    if (!motivoEdicao.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo da solicitação de edição.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await base44.entities.PedidoCompra.update(pedido.id, {
        status_aprovacao_financeira: 'Solicitação de Edição Pendente',
        solicitacao_edicao_motivo: motivoEdicao,
        solicitacao_edicao_data: agora(),
        solicitacao_edicao_solicitante: currentUser?.full_name || currentUser?.email,
        historico: (formData.historico || '') + `\n[Solicitação de Edição: ${motivoEdicao} | Por: ${currentUser?.full_name} | ${formatarLogTime()}]`
      });

      toast({
        title: "Solicitação enviada",
        description: "O financeiro foi notificado. Aguarde aprovação para editar.",
        className: "bg-blue-100 text-blue-800"
      });

      setIsSolicitarEdicaoOpen(false);
      setMotivoEdicao('');
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleReopenForEdit = async (authData) => {
    try {
      const authNote = `\n[Reaberto para Edição: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${formatarLogTime()}]`;
      
      await base44.entities.PedidoCompra.update(pedido.id, {
        status_aprovacao_financeira: 'Pendente',
        status: 'Rascunho',
        historico: (formData.historico || '') + authNote
      });

      toast({
        title: "Pedido reaberto",
        description: "O pedido foi reaberto para edição. Ao salvar, precisará de nova aprovação.",
        className: "bg-blue-100 text-blue-800"
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsReopenAuthOpen(false);
  };

  const isAprovado = pedido && (
    pedido.status === 'Aprovado' ||
    pedido.status === 'Despachado' ||
    pedido.status === 'Em Recepção' ||
    pedido.status === 'Concluído'
  );

  const isLocked = pedido && (
    pedido.status === 'Enviado' ||
    pedido.status === 'Aguardando Liberação' ||
    pedido.status_aprovacao_financeira === 'Aguardando Aprovação Financeira' ||
    pedido.status_aprovacao_financeira === 'Aprovado' || 
    pedido.status_aprovacao_financeira === 'Rejeitado'
  );

  const isLogisticaEnabled = pedido && pedido.status_aprovacao_financeira === 'Aprovado';

  const canReopen = currentUser?.role === 'admin' && isLocked;

  const handlePrintReport = async (tipo = 'pedido') => {
    if (!pedido?.id) {
      toast({ title: 'Salve o pedido antes de imprimir', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Gerando relatório...', description: 'Aguarde...' });

      let functionName = 'gerarRelatorioPedido';
      let fileName = `Pedido_${pedido.numero}.pdf`;

      if (tipo === 'precificacao') {
        functionName = 'gerarRelatorioPrecificacao';
        fileName = `Precificacao_${pedido.numero}.pdf`;
      } else if (tipo === 'pendencias') {
        functionName = 'gerarRelatorioPendencias';
        fileName = `Pendencias_${pedido.numero}.pdf`;
      }

      const response = await base44.functions.invoke(functionName, { pedido_id: pedido.id });

      console.log('Response completa:', response);
      console.log('Response status:', response?.status);
      console.log('Response data type:', typeof response?.data);

      if (!response || !response.data) {
        throw new Error('Resposta inválida do servidor');
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: 'Relatório gerado com sucesso!' });
    } catch (error) {
      console.error('Erro completo:', error);
      console.error('Erro message:', error?.message);
      console.error('Erro stack:', error?.stack);
      const errorMsg = error?.message || error?.toString() || 'Erro desconhecido ao gerar relatório';
      toast({ 
        title: 'Erro ao gerar relatório', 
        description: errorMsg,
        variant: 'destructive',
        duration: 10000
      });
    }
  };

  const handleAuthSuccess = async (authData) => {
    setIsSaving(true);
    
    try {
      const tsAgora = agora();
      const authNote = `\n[Autenticado: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${formatarLogTime()}]`;
      
      const statusAnterior = pedido?.status || 'Rascunho';
      const statusNovo = formData.status; // já foi setado pelo botão antes de chamar handleInitiateSave

      const dataToSave = { 
        ...formData, 
        valor_itens: valorItens,
        valor_total: valorTotal,
        historico: (formData.historico || '') + authNote,
      };
      
      // Salvar pedido primeiro
      const pedidoSalvo = await onSave(dataToSave);
      const pedidoId = pedidoSalvo?.id || pedido?.id;

      // ── Registrar transição no log sempre que houver mudança de status ──
      if (pedidoId && (!pedido?.id || statusAnterior !== statusNovo)) {
        await registrarTransicao({
          pedidoId,
          pedidoNumero: pedidoSalvo?.numero || pedido?.numero || dataToSave.numero,
          statusAnterior,
          statusNovo,
          responsavel: {
            id: authData.intervenienteId || currentUser?.id,
            nome: authData.intervenienteName || currentUser?.full_name,
            email: currentUser?.email,
          },
          codigoOperacao: authData.operationCode || '',
          observacao: authData.observacao || '',
          tipoAutenticacao: authData.intervenienteId ? 'Interveniente' : 'Usuario',
        });
      }

      toast({
        title: "Sucesso",
        description: "Pedido salvo com sucesso!",
        className: "bg-green-100 text-green-800 border-green-200"
      });
      
      // Verificar se mudou para "Aguardando Liberação" APÓS salvar
      const mudouParaAguardando = statusNovo === 'Aguardando Liberação' && statusAnterior !== 'Aguardando Liberação';

      if (mudouParaAguardando && pedidoId) {
        // Buscar o pedido atualizado para ter certeza que tem todos os dados
        const pedidosAtualizados = await base44.entities.PedidoCompra.filter({ id: pedidoId });
        const currentPO = pedidosAtualizados[0];

        if (currentPO) {
          // 1. Criar Lançamentos Financeiros (Em Aberto, bloqueados para aprovação)
          const baseLancamento = {
            tipo: 'Despesa',
            terceiro_id: formData.fornecedor_id,
            terceiro_nome: formData.fornecedor_nome,
            status: 'Em Aberto',
            categoria: 'Compra de Mercadoria',
            referencia_id: currentPO.id,
            referencia_tipo: 'PedidoCompra',
            referencia_numero: currentPO.numero,
            is_custo_mercadoria: true,
            pedido_compra_vinculado_id: currentPO.id,
            pedido_compra_vinculado_numero: currentPO.numero,
          };

          if (formData.forma_pagamento_compra === 'À Vista') {
            await base44.entities.LancamentoFinanceiro.create({
              ...baseLancamento,
              descricao: `Compra de Mercadoria - ${currentPO.numero} (À Vista)`,
              valor: valorTotal,
              data_vencimento: formData.data_primeiro_vencimento || dataHojeFormatado(),
              observacoes: `Pagamento à vista. Aguardando aprovação do financeiro.`,
            });
          } else {
            const numParcelas = formData.num_parcelas || 1;
            const valorParcela = valorTotal / numParcelas;
            const dataBase = formData.data_primeiro_vencimento ? 
              new Date(formData.data_primeiro_vencimento) : 
              addDays(new Date(), 30);

            for (let i = 0; i < numParcelas; i++) {
              const dataVencimento = addDays(dataBase, i * (formData.intervalo_parcelas_dias || 30));
              await base44.entities.LancamentoFinanceiro.create({
                ...baseLancamento,
                descricao: `Compra de Mercadoria - ${currentPO.numero} (${i + 1}/${numParcelas})`,
                valor: valorParcela,
                data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
                observacoes: `Parcela ${i + 1} de ${numParcelas}. Aguardando aprovação do financeiro.`,
              });
            }
          }

          // 2. Atualizar status de aprovação financeira do pedido
          await base44.entities.PedidoCompra.update(currentPO.id, {
            status_aprovacao_financeira: 'Aguardando Aprovação Financeira'
          });
          
          // 3. Criar Tarefa para o Comprador
          await base44.entities.Tarefa.create({
            titulo: `Aguardando Manifesto/NF - ${currentPO.numero}`,
            tipo: 'Aguardando Manifesto/NF',
            status: 'Pendente',
            prioridade: 'Alta',
            responsavel_id: currentUser.id,
            responsavel_nome: currentUser.full_name,
            referencia_tipo: 'PedidoCompra',
            referencia_id: currentPO.id,
            referencia_numero: currentPO.numero,
            valor_pendente: valorTotal,
            descricao: `Aguardando recebimento de NF/Manifesto do fornecedor ${formData.fornecedor_nome} para programar a recepção.`,
            data_vencimento: format(new Date(formData.data_prevista_entrega || new Date()), 'yyyy-MM-dd')
          });

          toast({
            title: "✓ PO Enviado para Aprovação!",
            description: `Conta a pagar criada e tarefa de acompanhamento gerada.`,
            className: "bg-emerald-100 text-emerald-800"
          });
        }
      }
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsSaving(false);
  };

  // Helper interno — data de hoje no fuso do sistema como yyyy-MM-dd
  const dataHojeFormatado = () => {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Rio_Branco',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };





  const reloadSupermanifesto = async () => {
    if (formData.manifesto_entrada_id) {
      const manifestoEntrada = await base44.entities.ManifestoEntrada.filter({ id: formData.manifesto_entrada_id });
      if (manifestoEntrada && manifestoEntrada.length > 0 && manifestoEntrada[0].supermanifesto_id) {
        const manifestoData = await base44.entities.Supermanifesto.filter({ id: manifestoEntrada[0].supermanifesto_id });
        if (manifestoData && manifestoData.length > 0) {
          setSupermanifesto(manifestoData[0]);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900 dark:text-gray-200 overflow-hidden">
      {/* Alerta de Bloqueio Desktop */}
      {isLocked && <BannerStatusPedido pedido={pedido} isMobile={false} />}
      {/* Header compacto */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {pedido?.numero || 'Novo Pedido'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
            {formData.itens.length} item(s) • {formatCurrency(valorTotal)}
          </span>
        </div>
        {pedido?.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Relatórios">
                <Printer className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-gray-800">
              <DropdownMenuItem onClick={() => handlePrintReport('pedido')}>
                Relatório do Pedido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintReport('precificacao')}>
                Análise de Precificação
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintReport('pendencias')}>
                Relatório de Pendências
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}


      </div>

      {/* Timeline */}
      <div className="px-2 pt-2 pb-1">
        <StatusTimeline 
          currentStatus={formData.status} 
          aprovacaoFinanceira={pedido?.status_aprovacao_financeira}
          dataEmissao={formData.data_emissao}
          isMobile={false}
        />
      </div>

      {/* DESKTOP: Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex w-full">
            {[
              { value: 'dados-gerais', icon: <FileText className="w-4 h-4 flex-shrink-0" />, short: 'Geral', disabled: false },
              { value: 'itens',        icon: <ShoppingCart className="w-4 h-4 flex-shrink-0" />, short: 'Itens', disabled: false },
              { value: 'pagamento',    icon: <DollarSign className="w-4 h-4 flex-shrink-0" />, short: 'Pgto', disabled: false },
              { value: 'logistica',    icon: <Ship className="w-4 h-4 flex-shrink-0" />, short: 'Log', disabled: !isLogisticaEnabled && !!pedido },
              { value: 'pendencias',   icon: <AlertCircle className="w-4 h-4 flex-shrink-0" />, short: 'Pend', disabled: !pedido?.id },
              { value: 'logs',         icon: <History className="w-4 h-4 flex-shrink-0" />, short: 'Logs', disabled: !pedido?.id },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white rounded-none py-2 px-1 text-gray-400 dark:text-gray-500 disabled:opacity-30 transition-colors min-w-0"
              >
                {tab.icon}
                <span className="text-[9px] font-semibold tracking-wider hidden xs:block" style={{display: 'none'}}>{tab.short}</span>
                <span
                  className="text-[9px] font-semibold tracking-wider leading-none"
                  style={{ fontSize: '9px' }}
                >
                  {tab.short}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="dados-gerais" className="mt-0 space-y-6">
              <div className="grid grid-cols-12 gap-x-6 gap-y-6">
                {/* Fornecedor */}
                <div className="col-span-12 lg:col-span-6">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Fornecedor *</Label>
                  <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange} disabled={isLocked}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white">
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999] max-h-[300px]">
                      <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-700 z-10">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            placeholder="Buscar..."
                            className="pl-8 h-8 text-xs bg-white dark:bg-gray-900 border-0"
                            value={searchFornecedor}
                            onChange={e => {
                              setSearchFornecedor(e.target.value);
                              setSelectedFornecedorIndex(-1);
                            }}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              if (!filteredFornecedores.length) return;
                              
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedFornecedorIndex(prev => 
                                  prev < filteredFornecedores.length - 1 ? prev + 1 : 0
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedFornecedorIndex(prev => 
                                  prev > 0 ? prev - 1 : filteredFornecedores.length - 1
                                );
                              } else if (e.key === 'Enter' && selectedFornecedorIndex >= 0) {
                                e.preventDefault();
                                handleFornecedorChange(filteredFornecedores[selectedFornecedorIndex].id);
                                setSearchFornecedor('');
                                setSelectedFornecedorIndex(-1);
                              } else if (e.key === 'Tab' && filteredFornecedores.length > 0) {
                                e.preventDefault();
                                setSelectedFornecedorIndex(prev => 
                                  prev < filteredFornecedores.length - 1 ? prev + 1 : 0
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      {filteredFornecedores.map((f, idx) => (
                        <SelectItem 
                          key={f.id} 
                          value={f.id}
                          className={idx === selectedFornecedorIndex ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                        >
                          {f.nome}
                        </SelectItem>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-8"
                          onClick={() => {
                            handleFornecedorChange('novo');
                            setSearchFornecedor('');
                          }}
                        >
                          <Plus className="w-3 h-3 mr-2" />
                          Novo Fornecedor
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="col-span-12 lg:col-span-6">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Tags</Label>
                  <Input 
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                    placeholder="Ex: Urgente, Reposição..."
                    value={formData.tags?.join(', ') || ''} 
                    onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                    disabled={isLocked}
                  />
                </div>
                
                {/* Observação em linha inteira */}
                <div className="col-span-12">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Observações</Label>
                  <Textarea 
                    className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm resize-none text-gray-900 dark:text-white placeholder:text-gray-400" 
                    placeholder="Observações do pedido..."
                    rows={2}
                    value={formData.observacoes} 
                    onChange={e => handleChange('observacoes', e.target.value)} 
                    disabled={isLocked}
                  />
                </div>
              </div>


            </TabsContent>

            {/* ABA: ITENS — usa o mesmo seletor estilo PDV */}
            <TabsContent value="itens" className="mt-0 h-full -mx-6 -mt-0">
              <MobileProductSelector
                items={formData.itens}
                products={produtos}
                onAddItem={handleAddItem}
                onUpdateItem={handleItemChange}
                onRemoveItem={handleRemoveItem}
                formatCurrency={formatCurrency}
                onOpenAdjustPrices={() => setShowAtualizarPrecos(true)}
                isLocked={isLocked}
              />
            </TabsContent>

          {/* ABA: PAGAMENTO */}
          <TabsContent value="pagamento" className="mt-0 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Forma de Pagamento *</Label>
                <Select value={formData.forma_pagamento_compra} onValueChange={v => handleChange('forma_pagamento_compra', v)}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">
                  {formData.forma_pagamento_compra === 'À Vista' ? 'Data de Pagamento' : 'Primeiro Vencimento'}
                </Label>
                <Input 
                  type="date" 
                  className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm" 
                  value={formData.data_primeiro_vencimento} 
                  onChange={e => handleChange('data_primeiro_vencimento', e.target.value)} 
                  disabled={isLocked}
                />
              </div>
            </div>

            {formData.forma_pagamento_compra === 'Parcelado' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Número de Parcelas</Label>
                  <Input 
                    type="number" 
                    min="1"
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm" 
                    value={formData.num_parcelas} 
                    onChange={e => handleChange('num_parcelas', parseInt(e.target.value) || 1)} 
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Intervalo entre Parcelas (dias)</Label>
                  <Input 
                    type="number" 
                    min="1"
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm" 
                    value={formData.intervalo_parcelas_dias} 
                    onChange={e => handleChange('intervalo_parcelas_dias', parseInt(e.target.value) || 30)} 
                    disabled={isLocked}
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Observações de Pagamento</Label>
              <Textarea 
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm resize-none" 
                placeholder="Ex: Pagar via PIX, transferência, observações sobre o pagamento..."
                rows={3}
                value={formData.condicoes_pagamento} 
                onChange={e => handleChange('condicoes_pagamento', e.target.value)} 
                disabled={isLocked}
              />
            </div>

            {/* Total */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-right mb-8">
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Total do Pedido</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(valorTotal)}</span>
              </div>

              {/* Contas a pagar geradas para este pedido */}
              {pedido?.id && (
                <div className="space-y-2">
                  <LancamentosCompraPanel pedidoId={pedido.id} />
                </div>
              )}
            </div>

            </TabsContent>

          {/* ABA: LOGÍSTICA - APENAS VISUALIZAÇÃO */}
          <TabsContent value="logistica" className="mt-0 space-y-8">
            {!pedido ? (
              <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border-0">
                <div className="flex items-start gap-3">
                  <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Tela de Aeroporto</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Salve o pedido primeiro. Informações logísticas aparecerão aqui após vinculação no Hub Logístico.
                    </p>
                  </div>
                </div>
              </div>
            ) : supermanifesto ? (
              <div className="space-y-6">
                <div className="p-5 bg-teal-50 dark:bg-teal-900/20 rounded-xl shadow-sm border-0">
                  <h4 className="font-medium text-teal-900 dark:text-teal-200 mb-4 flex items-center gap-2">
                    <Ship className="w-5 h-5" />
                    Informações de Transporte
                  </h4>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-xs text-teal-700 dark:text-teal-300">Supermanifesto</p>
                      <p className="font-medium text-teal-900 dark:text-teal-100">{supermanifesto.numero}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-700 dark:text-teal-300">Transportadora</p>
                      <p className="font-medium text-teal-900 dark:text-teal-100">{supermanifesto.transportadora_nome}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-700 dark:text-teal-300">ETA</p>
                      <p className="font-medium text-teal-900 dark:text-teal-100">
                        {supermanifesto.eta ? format(new Date(supermanifesto.eta), 'dd/MM/yyyy HH:mm') : 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-700 dark:text-teal-300">Status</p>
                      <Badge className="bg-teal-100 text-teal-800 border-0">
                        {supermanifesto.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Aguardando Vinculação</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Este pedido ainda não foi vinculado a um supermanifesto. Acesse o <strong>Hub Logístico</strong> na aba "Logística" do Módulo de Compras para realizar a vinculação.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

            {/* ABA: PENDÊNCIAS */}
            <TabsContent value="pendencias" className="mt-0">
              {pedido?.id && (
                <PendenciasPedido pedido={pedido} />
              )}
            </TabsContent>

            {/* ABA: LOGS */}
            <TabsContent value="logs" className="mt-0">
              <LogsPedidoCompra pedidoId={pedido?.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>


      
      <OperacaoAuthenticator 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        operationName={pedido?.id ? `Salvar Pedido ${pedido.numero}` : "Criar Novo Pedido"}
      />

      <OperacaoAuthenticator 
        isOpen={isReopenAuthOpen}
        onClose={() => setIsReopenAuthOpen(false)}
        onSuccess={handleReopenForEdit}
        operationName={`Reabrir Pedido ${pedido?.numero} para Edição`}
      />

      <AtualizarPrecosDialog
        isOpen={showAtualizarPrecos}
        onClose={(updated) => {
          setShowAtualizarPrecos(false);
          if (updated) {
            // Recarregar produtos se houve atualização
            base44.entities.Produto.list().then(setProdutos);
          }
        }}
        itens={formData.itens || []}
        produtos={produtos}
      />



       {/* FAB multi-role com Bússola */}
       {!isLocked && (
         <PedidoCompraFAB 
           pedido={{ ...formData, id: pedido?.id, numero: pedido?.numero, valor_itens: valorItens, valor_total: valorTotal }}
           onSave={handleInitiateSave}
           isSaving={isSaving}
           isDisabled={!formData.fornecedor_id || formData.itens.length === 0}
           mostrarEnviarFinanceiro={!isLocked && !!pedido?.id && formData.status === 'Rascunho' && formData.itens.length > 0}
           onEnviarFinanceiro={() => {
             handleChange('status', 'Aguardando Liberação');
             setTimeout(() => handleInitiateSave(), 100);
           }}
           onOpenAnexos={() => setIsAnexosOpen(true)}
           mostrarSolicitarEdicao={false}
           onSolicitarEdicao={() => setIsSolicitarEdicaoOpen(true)}
         />
       )}
       {isLocked && (
         <PedidoCompraFAB 
           pedido={{ ...formData, id: pedido?.id, numero: pedido?.numero, valor_itens: valorItens, valor_total: valorTotal }}
           onSave={handleInitiateSave}
           isSaving={isSaving}
           isDisabled={true}
           mostrarEnviarFinanceiro={false}
           onOpenAnexos={() => setIsAnexosOpen(true)}
           mostrarSolicitarEdicao={!!pedido?.id && isLocked}
           onSolicitarEdicao={() => setIsSolicitarEdicaoOpen(true)}
         />
       )}

       <AnexosPedidoCompra
         pedidoId={pedido?.id}
         pedidoNumero={pedido?.numero}
         isOpen={isAnexosOpen}
         onClose={() => setIsAnexosOpen(false)}
       />

       <SolicitarEdicaoPDV
         pedido={pedido}
         currentUser={currentUser}
         isAdmin={currentUser?.role === 'admin'}
         isOpen={isSolicitarEdicaoOpen}
         onClose={() => setIsSolicitarEdicaoOpen(false)}
         onSuccess={() => onClose()}
       />

       {/* Dialog Novo Fornecedor */}
       <Dialog open={isNovoFornecedorOpen} onOpenChange={setIsNovoFornecedorOpen}>
         <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl">
           <DialogHeader>
             <DialogTitle className="text-gray-900 dark:text-white">Novo Fornecedor</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Nome *</Label>
               <Input
                 placeholder="Nome do fornecedor"
                 value={novoFornecedor.nome}
                 onChange={e => setNovoFornecedor({...novoFornecedor, nome: e.target.value})}
                 className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
               />
             </div>
             <div>
               <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Email</Label>
               <Input
                 placeholder="email@fornecedor.com"
                 value={novoFornecedor.email}
                 onChange={e => setNovoFornecedor({...novoFornecedor, email: e.target.value})}
                 className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
               />
             </div>
             <div>
               <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Telefone</Label>
               <Input
                 placeholder="(00) 00000-0000"
                 value={novoFornecedor.telefone}
                 onChange={e => setNovoFornecedor({...novoFornecedor, telefone: e.target.value})}
                 className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
               />
             </div>
             <div>
               <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Endereço</Label>
               <Input
                 placeholder="Endereço completo"
                 value={novoFornecedor.endereco}
                 onChange={e => setNovoFornecedor({...novoFornecedor, endereco: e.target.value})}
                 className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
               />
             </div>
           </div>
           <DialogFooter className="gap-2 flex justify-end">
             <Button
               variant="outline"
               onClick={() => setIsNovoFornecedorOpen(false)}
               className="border-0 shadow-sm rounded-lg h-9"
             >
               Cancelar
             </Button>
             <Button
               onClick={handleCreateFornecedor}
               className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 rounded-lg h-9"
             >
               Criar
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       </div>
       );
       }