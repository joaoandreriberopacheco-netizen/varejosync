import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
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
  const [isMobile, setIsMobile] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSolicitarEdicaoOpen, setIsSolicitarEdicaoOpen] = useState(false);
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [empresa, setEmpresa] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    const fornecedor = fornecedores.find(f => f.id === id);
    if (fornecedor) {
      handleChange('fornecedor_id', id);
      handleChange('fornecedor_nome', fornecedor.nome);
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
        solicitacao_edicao_data: new Date().toISOString(),
        solicitacao_edicao_solicitante: currentUser?.full_name || currentUser?.email,
        historico: (formData.historico || '') + `\n[Solicitação de Edição: ${motivoEdicao} | Por: ${currentUser?.full_name} | ${format(new Date(), 'dd/MM HH:mm')}]`
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
      const authNote = `\n[Reaberto para Edição: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM HH:mm')}]`;
      
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

  const isLocked = pedido && (
    pedido.status === 'Enviado' ||
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
      if (pedidoId && statusAnterior !== statusNovo) {
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
          if (formData.forma_pagamento_compra === 'À Vista') {
            await base44.entities.LancamentoFinanceiro.create({
              tipo: 'Despesa',
              descricao: `Compra de Mercadoria - ${currentPO.numero} (À Vista)`,
              terceiro_id: formData.fornecedor_id,
              terceiro_nome: formData.fornecedor_nome,
              valor: valorTotal,
              data_vencimento: formData.data_primeiro_vencimento || dataHojeFormatado(),
              status: 'Em Aberto',
              categoria: 'Compra de Mercadoria',
              referencia_id: currentPO.id,
              referencia_tipo: 'PedidoCompra',
              referencia_numero: currentPO.numero,
              observacoes: `Pagamento à vista. Aguardando aprovação do financeiro.`
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
                tipo: 'Despesa',
                descricao: `Compra de Mercadoria - ${currentPO.numero} (${i + 1}/${numParcelas})`,
                terceiro_id: formData.fornecedor_id,
                terceiro_nome: formData.fornecedor_nome,
                valor: valorParcela,
                data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
                status: 'Em Aberto',
                categoria: 'Compra de Mercadoria',
                referencia_id: currentPO.id,
                referencia_tipo: 'PedidoCompra',
                referencia_numero: currentPO.numero,
                observacoes: `Parcela ${i + 1} de ${numParcelas}. Aguardando aprovação do financeiro.`
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

  if (isMobile) {
      return (
        <Dialog open={true} onOpenChange={onClose}>
          <DialogContent className="!fixed !inset-0 !max-w-none !w-screen !h-screen !p-0 !m-0 !rounded-none !border-0 !shadow-none !bg-gray-50 !dark:bg-gray-950 z-[9999] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white dark:bg-gray-900">
          {/* Alerta de Bloqueio */}
          {isLocked && (
            <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">Apenas Visualização.</span> Pedido aguardando aprovação financeira. Edição bloqueada.
                </div>
              </div>
            </div>
          )}
          {/* Header compacto com menu */}
          <div className="px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 flex-shrink-0">
              <ChevronDown className="w-5 h-5 rotate-90" />
            </Button>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {pedido?.numero || 'Novo'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formData.itens.length} {formData.itens.length === 1 ? 'item' : 'itens'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatCurrency(valorTotal)}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-gray-800 border-0 shadow-lg">
                {!isLocked && (
                  <>
                    <DropdownMenuItem onClick={handleInitiateSave} disabled={isSaving || !formData.fornecedor_id || formData.itens.length === 0}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleUndo} disabled={historyIndex <= 0}>
                      <Undo className="w-4 h-4 mr-2" />
                      Desfazer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                      <Redo className="w-4 h-4 mr-2" />
                      Refazer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {pedido?.id && (
                  <>
                    <DropdownMenuItem onClick={() => handlePrintReport('pedido')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Relatório do Pedido
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePrintReport('precificacao')}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Análise de Precificação
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePrintReport('pendencias')}>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Relatório de Pendências
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
              </DropdownMenu>
              </div>

          </div>

          {/* MOBILE: Timeline + Tabs */}
          <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-950">
            {/* Timeline sobre as Tabs */}
            <div className="px-3 py-0.5 border-b border-gray-50 dark:border-gray-900 flex-shrink-0 bg-white dark:bg-gray-950">
              <StatusTimeline 
                currentStatus={formData.status} 
                aprovacaoFinanceira={pedido?.status_aprovacao_financeira}
                dataEmissao={formData.data_emissao}
                isMobile={true}
              />
            </div>

            <TabsList className="flex-shrink-0 bg-white dark:bg-gray-900/50 border-0 border-b border-gray-100 dark:border-gray-800 rounded-none h-auto p-0 grid grid-cols-6">
            <TabsTrigger 
              value="dados-gerais" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="itens" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <Package className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Itens</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pagamento" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Pgto</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logistica" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
              disabled={!isLogisticaEnabled && pedido}
            >
              <Ship className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Log</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pendencias" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
              disabled={!pedido}
            >
              <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Pend</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
              disabled={!pedido}
            >
              <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Logs</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="dados-gerais" className="mt-0 px-3 py-4 space-y-5 border-0">
              {/* Fornecedor com ícone */}
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Fornecedor *</Label>
                <div 
                  onClick={() => {
                    if (!isLocked) {
                      const modal = document.getElementById('fornecedor-selector-mobile');
                      if (modal) modal.classList.remove('hidden');
                    }
                  }}
                  className={`bg-gray-50 dark:bg-gray-900 rounded-xl p-4 shadow-sm flex items-center gap-3 transition-transform ${
                    isLocked ? 'opacity-50' : 'active:scale-[0.98]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {formData.fornecedor_nome || 'Selecionar fornecedor'}
                    </div>
                    {!formData.fornecedor_nome && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Toque para escolher</div>
                    )}
                  </div>
                  </div>
                  </div>

                  {/* Modal de Seleção de Fornecedor */}
                  <div 
                  id="fornecedor-selector-mobile"
                  className="hidden fixed inset-0 bg-white dark:bg-gray-900 z-[10000] flex flex-col"
                  onClick={(e) => {
                  if (e.target.id === 'fornecedor-selector-mobile') {
                    e.target.classList.add('hidden');
                    setSearchFornecedor('');
                    setSelectedFornecedorIndex(-1);
                  }
                  }}
                  >
                  <div className="bg-white dark:bg-gray-900 w-full h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        document.getElementById('fornecedor-selector-mobile').classList.add('hidden');
                        setSearchFornecedor('');
                        setSelectedFornecedorIndex(-1);
                      }}
                      className="h-10 w-10"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 flex-1">Selecionar Fornecedor</h3>
                  </div>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Buscar fornecedor..."
                        className="pl-10 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-11"
                        value={searchFornecedor}
                        onChange={e => {
                          setSearchFornecedor(e.target.value);
                          setSelectedFornecedorIndex(-1);
                        }}
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
                            document.getElementById('fornecedor-selector-mobile').classList.add('hidden');
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
                  <div className="flex-1 overflow-y-auto p-3">
                    {filteredFornecedores.map((f, idx) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          handleFornecedorChange(f.id);
                          document.getElementById('fornecedor-selector-mobile').classList.add('hidden');
                          setSearchFornecedor('');
                          setSelectedFornecedorIndex(-1);
                        }}
                        className={`p-4 rounded-xl mb-3 flex items-center gap-3 active:scale-[0.98] transition-transform shadow-sm ${
                          idx === selectedFornecedorIndex
                            ? 'bg-indigo-100 border-2 border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-600'
                            : formData.fornecedor_id === f.id 
                            ? 'bg-gray-100 dark:bg-gray-800' 
                            : 'bg-gray-50 dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{f.nome}</span>
                      </div>
                    ))}
                  </div>
                  </div>
                  </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Tags</Label>
                <Input 
                  className="bg-gray-50 dark:bg-gray-900 border-0 shadow-sm h-12" 
                  placeholder="Ex: Urgente, Reposição..."
                  value={formData.tags?.join(', ') || ''} 
                  onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Observações</Label>
                <Textarea 
                  className="bg-gray-50 dark:bg-gray-900 border-0 shadow-sm resize-none" 
                  placeholder="Observações do pedido..."
                  rows={3}
                  value={formData.observacoes} 
                  onChange={e => handleChange('observacoes', e.target.value)} 
                />
              </div>
            </TabsContent>

            <TabsContent value="itens" className="mt-0 h-full">
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

            <TabsContent value="pagamento" className="mt-0 px-3 py-6 space-y-6 border-0">
              {/* Botão Enviar para Aprovação Financeira */}
              {pedido && pedido.status === 'Rascunho' && formData.itens.length > 0 && !isLocked && (
                 <Button 
                   onClick={() => {
                     handleChange('status', 'Aguardando Liberação');
                     setTimeout(() => handleInitiateSave(), 100);
                   }}
                   className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-base shadow-lg gap-2"
                 >
                   <Send className="w-5 h-5" style={{ transform: 'rotate(-45deg)' }} />
                   Enviar para Aprovação Financeira
                 </Button>
               )}

              {pedido && pedido.status === 'Enviado' && pedido.status_aprovacao_financeira === 'Aguardando Aprovação Financeira' && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-0 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1 text-sm">Aguardando Aprovação</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Este pedido está aguardando aprovação do setor financeiro. Edição bloqueada.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Forma de Pagamento *</Label>
                <Select value={formData.forma_pagamento_compra} onValueChange={v => handleChange('forma_pagamento_compra', v)} disabled={isLocked}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                    <SelectItem value="À Vista">À Vista</SelectItem>
                    <SelectItem value="Parcelado">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.forma_pagamento_compra === 'Parcelado' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Nº de Parcelas</Label>
                      <Input 
                        type="number" 
                        min="1"
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                        value={formData.num_parcelas} 
                        onChange={e => handleChange('num_parcelas', parseInt(e.target.value) || 1)} 
                        disabled={isLocked}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Intervalo (dias)</Label>
                      <Input 
                        type="number" 
                        min="1"
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                        value={formData.intervalo_parcelas_dias} 
                        onChange={e => handleChange('intervalo_parcelas_dias', parseInt(e.target.value) || 30)} 
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">
                  {formData.forma_pagamento_compra === 'À Vista' ? 'Data de Pagamento' : 'Primeiro Vencimento'}
                </Label>
                <Input 
                  type="date" 
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                  value={formData.data_primeiro_vencimento} 
                  onChange={e => handleChange('data_primeiro_vencimento', e.target.value)} 
                  disabled={isLocked}
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Observações de Pagamento</Label>
                <Textarea 
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm resize-none" 
                  placeholder="Ex: Pagar via PIX, transferência..."
                  rows={3}
                  value={formData.condicoes_pagamento} 
                  onChange={e => handleChange('condicoes_pagamento', e.target.value)} 
                  disabled={isLocked}
                />
              </div>

            </TabsContent>

            <TabsContent value="logistica" className="mt-0 px-3 py-6 space-y-6 border-0">
              {!pedido ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
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
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-xl shadow-sm border-0 dark:bg-teal-900/20">
                    <h4 className="font-medium text-teal-900 dark:text-teal-200 mb-3 flex items-center gap-2">
                      <Ship className="w-5 h-5" />
                      Informações de Transporte
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Aguardando Vinculação</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Este pedido ainda não foi vinculado a um supermanifesto. Acesse o Hub Logístico para realizar a vinculação.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="mt-0 px-3 py-4 border-0">
              <LogsPedidoCompra pedidoId={pedido?.id} />
            </TabsContent>
          </div>
          </Tabs>

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
              base44.entities.Produto.list().then(setProdutos);
            }
          }}
          itens={formData.itens || []}
          produtos={produtos}
        />

        <Dialog open={isSolicitarEdicaoOpen} onOpenChange={setIsSolicitarEdicaoOpen}>
          <DialogContent className="dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-800 dark:text-gray-200">Solicitar Edição do Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                      Justificativa necessária
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Informe o motivo para que o financeiro possa avaliar a solicitação (ex: produto indisponível no fornecedor, erro de quantidade, etc.)
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Motivo da Solicitação *</Label>
                <Textarea
                  placeholder="Ex: Fornecedor informou que o produto X está em falta..."
                  className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm resize-none"
                  rows={4}
                  value={motivoEdicao}
                  onChange={(e) => setMotivoEdicao(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsSolicitarEdicaoOpen(false);
                setMotivoEdicao('');
              }} className="border-0 shadow-sm">
                Cancelar
              </Button>
              <Button onClick={handleSolicitarEdicao} disabled={!motivoEdicao.trim()}>
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </DialogContent>
      </Dialog>
      );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-gray-900 dark:text-gray-200 overflow-hidden">
      {/* Alerta de Bloqueio Desktop */}
      {isLocked && (
        <div className="px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200">
              <span className="font-medium">Apenas Visualização.</span> Este pedido está aguardando aprovação financeira. Para editar, um admin deve reabrir o pedido.
            </span>
          </div>
        </div>
      )}
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
        <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndex <= 0 || isLocked} className="h-8 w-8" title="Desfazer">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndex >= history.length - 1 || isLocked} className="h-8 w-8" title="Refazer">
          <Redo className="w-4 h-4" />
        </Button>
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

        {isLocked && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsSolicitarEdicaoOpen(true)} 
            className="h-8 text-xs px-2"
            title="Solicitar liberação para editar"
          >
            Solicitar Edição
          </Button>
        )}
        {canReopen && isLocked && (
          <Button variant="ghost" size="sm" onClick={() => setIsReopenAuthOpen(true)} className="h-8 text-xs px-2">
            Reabrir (Admin)
          </Button>
        )}
      </div>

      {/* Timeline */}
      <StatusTimeline 
        currentStatus={formData.status} 
        aprovacaoFinanceira={pedido?.status_aprovacao_financeira}
        dataEmissao={formData.data_emissao}
        isMobile={false}
      />

      {/* DESKTOP: Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 px-6">
            <TabsTrigger value="dados-gerais" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm">
              <FileText className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Dados Gerais
            </TabsTrigger>
            <TabsTrigger value="itens" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm">
              <ShoppingCart className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Itens
            </TabsTrigger>
            <TabsTrigger value="pagamento" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="logistica" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm" disabled={!isLogisticaEnabled && pedido}>
              <Ship className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Logística
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm" disabled={!pedido?.id}>
              <AlertCircle className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Pendências
            </TabsTrigger>
            <TabsTrigger value="logs" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm" disabled={!pedido?.id}>
              <History className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
              Logs
            </TabsTrigger>
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

            {/* ABA: ITENS */}
            <TabsContent value="itens" className="mt-0 space-y-4">
              {/* Header com ações */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar produto para adicionar..."
                    className="pl-10 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-10 text-sm"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setSelectedProductIndex(-1);
                    }}
                    onKeyDown={e => {
                      if (!filteredProducts.length) return;

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedProductIndex(prev => 
                          prev < filteredProducts.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedProductIndex(prev => 
                          prev > 0 ? prev - 1 : filteredProducts.length - 1
                        );
                      } else if (e.key === 'Enter' && selectedProductIndex >= 0) {
                        e.preventDefault();
                        handleAddItem(filteredProducts[selectedProductIndex]);
                        setSearch('');
                        setSelectedProductIndex(-1);
                      } else if (e.key === 'Tab' && filteredProducts.length > 0) {
                        e.preventDefault();
                        setSelectedProductIndex(prev => 
                          prev < filteredProducts.length - 1 ? prev + 1 : 0
                        );
                      }
                    }}
                    disabled={isLocked}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAtualizarPrecos(true)} 
                    className="h-8 text-xs border-0 shadow-sm"
                    disabled={formData.itens.length === 0 || isLocked}
                  >
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" /> 
                    Ajustar Preços
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportModel} 
                    className="h-8 text-xs border-0 shadow-sm"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" /> 
                    Baixar
                  </Button>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleImportCSV}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs border-0 shadow-sm"
                    >
                      <FileUp className="h-3.5 w-3.5 mr-1.5" /> 
                      Importar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Busca Incremental de Produtos */}
              {search.trim() && filteredProducts.length > 0 && (
                <div className="border-0 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 max-h-48 overflow-y-auto">
                  {filteredProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      onClick={() => {
                        handleAddItem(product);
                        setSearch('');
                        setSelectedProductIndex(-1);
                      }}
                      className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center justify-between group ${
                        idx === selectedProductIndex 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${
                          idx === selectedProductIndex 
                            ? 'text-indigo-900 dark:text-indigo-200' 
                            : 'text-gray-900 dark:text-white'
                        }`}>{product.nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {product.codigo_interno || 'S/CÓD'} • {formatCurrency(product.valor_compra)}
                        </div>
                      </div>
                      <Plus className={`w-4 h-4 ml-3 flex-shrink-0 ${
                        idx === selectedProductIndex 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                      }`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela de Itens */}
              <div className="border-0 rounded-xl overflow-hidden shadow-sm bg-gray-50 dark:bg-gray-800">
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[1400px]">
                    <TableHeader className="bg-white/80 dark:bg-gray-900/80">
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableHead className="w-[40px] text-center text-gray-400 sticky left-0 z-20 bg-white dark:bg-gray-900">#</TableHead>
                        <TableHead className="min-w-[250px] text-gray-700 dark:text-gray-300 sticky left-[40px] z-20 bg-white dark:bg-gray-900">Produto</TableHead>
                        <TableHead className="min-w-[80px] text-gray-700 dark:text-gray-300">Código</TableHead>
                        <TableHead className="min-w-[70px] text-gray-700 dark:text-gray-300">Qtd</TableHead>
                        <TableHead className="min-w-[60px] text-gray-700 dark:text-gray-300">U/M</TableHead>
                        <TableHead className="min-w-[100px] text-gray-700 dark:text-gray-300">Preço Un</TableHead>
                        <TableHead className="min-w-[100px] text-green-600 dark:text-green-500">Desconto</TableHead>
                        <TableHead className="min-w-[120px] text-right text-gray-700 dark:text-gray-300 sticky right-0 z-10 bg-white dark:bg-gray-900">Total</TableHead>
                        <TableHead className="w-[40px] text-center"><X className="w-4 h-4 mx-auto opacity-0" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.itens.length === 0 ? (
                        <TableRow className="border-0">
                          <TableCell colSpan={9} className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-600 dark:text-gray-300">Lista de itens vazia</p>
                                <p className="text-xs text-gray-400 mt-1">Use a busca acima para adicionar produtos</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        formData.itens.map((item, index) => {
                          return (
                            <TableRow key={index} className="border-0 hover:bg-white/50 dark:hover:bg-gray-900/50 transition-colors group">
                              <TableCell className="text-center text-gray-400 font-mono text-xs sticky left-0 z-10 bg-gray-50 dark:bg-gray-800">
                                {String(index + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell className="sticky left-[40px] z-10 bg-gray-50 dark:bg-gray-800 font-medium text-gray-900 dark:text-white text-sm">
                                {item.produto_nome}
                              </TableCell>
                              <TableCell>
                                <Input 
                                  className="h-9 text-xs font-mono bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                  value={item.codigo_produto}
                                  onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                                  placeholder="Código"
                                  disabled={isLocked}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-9 bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                  value={item.quantidade}
                                  onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                                  disabled={isLocked}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  className="h-9 text-xs bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                  value={item.unidade_medida}
                                  onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                                  disabled={isLocked}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" step="0.01"
                                  className="h-9 min-w-[90px] bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 font-medium text-gray-900 dark:text-white" 
                                  value={item.custo_unitario} 
                                  onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)} 
                                  disabled={isLocked}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" step="0.01"
                                  className="h-9 min-w-[90px] bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-green-600 dark:text-green-500" 
                                  value={item.valor_desconto_item || 0} 
                                  onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)} 
                                  disabled={isLocked}
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold text-gray-900 dark:text-white text-sm sticky right-0 z-10 bg-gray-50 dark:bg-gray-800">
                                {formatCurrency(item.total || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={isLocked}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
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

            {/* Total + Botão Circular - dentro do scroll */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(valorTotal)}</span>
                </div>
                {pedido && pedido.status === 'Rascunho' && formData.itens.length > 0 && !isLocked && (
                   <Button
                     onClick={() => {
                       handleChange('status', 'Aguardando Liberação');
                       setTimeout(() => handleInitiateSave(), 100);
                     }}
                     className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg flex items-center justify-center"
                     size="icon"
                     title="Enviar para Aprovação Financeira"
                   >
                     <Send className="w-8 h-8 text-white" style={{ transform: 'rotate(-45deg)' }} />
                   </Button>
                 )}
              </div>
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

      <Dialog open={isSolicitarEdicaoOpen} onOpenChange={setIsSolicitarEdicaoOpen}>
         <DialogContent className="dark:bg-gray-800">
           <DialogHeader>
             <DialogTitle className="text-gray-800 dark:text-gray-200">Solicitar Edição do Pedido</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
               <div className="flex items-start gap-3">
                 <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                     Justificativa necessária
                   </p>
                   <p className="text-xs text-gray-600 dark:text-gray-400">
                     Informe o motivo para que o financeiro possa avaliar a solicitação (ex: produto indisponível no fornecedor, erro de quantidade, etc.)
                   </p>
                 </div>
               </div>
             </div>
             <div>
               <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Motivo da Solicitação *</Label>
               <Textarea
                 placeholder="Ex: Fornecedor informou que o produto X está em falta..."
                 className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm resize-none"
                 rows={4}
                 value={motivoEdicao}
                 onChange={(e) => setMotivoEdicao(e.target.value)}
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => {
               setIsSolicitarEdicaoOpen(false);
               setMotivoEdicao('');
             }} className="border-0 shadow-sm">
               Cancelar
             </Button>
             <Button onClick={handleSolicitarEdicao} disabled={!motivoEdicao.trim()}>
               Enviar Solicitação
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* FAB para Salvar */}
       <PedidoCompraFAB 
         pedido={{ ...formData, valor_itens: valorItens, valor_total: valorTotal }}
         onSave={handleInitiateSave}
         isSaving={isSaving}
         isDisabled={!formData.fornecedor_id || formData.itens.length === 0 || isLocked}
         empresa={empresa}
       />
      </div>
  );
}