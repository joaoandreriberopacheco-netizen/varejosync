import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { X, PlusCircle, FileText, Truck, DollarSign, AlertCircle, Package, Ship, Box, MapPin, FileDown, FileUp, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { addDays, format } from 'date-fns';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import MobileProductSelector from './MobileProductSelector';

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
    qtd_volumes: 0,
    tipo_volume: 'Caixas',
    peso_total_kg: 0,
    nfe_emitida: false,
    manifesto_conferido: false
  });
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [eventosLogisticos, setEventosLogisticos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [newEventData, setNewEventData] = useState({ nome: '', transportadora: '', data_previsao_chegada: '' });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadDependencies = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const [fornecedorData, produtoData, eventosData] = await Promise.all([
        base44.entities.Terceiro.list(),
        base44.entities.Produto.list(),
        base44.entities.EventosLogisticos.list()
      ]);
      setFornecedores(fornecedorData.filter(t => t.tipo === 'Fornecedor' || t.tipo === 'Ambos'));
      setProdutos(produtoData);
      setEventosLogisticos(eventosData.filter(e => e.status !== 'Finalizado' && e.status !== 'Cancelado'));
    };
    loadDependencies();
  }, []);

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
    setFormData(prev => ({ ...prev, [field]: value }));
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
            }
        }
    }

    // Recalculate totals
    const qty = parseFloat(item.quantidade) || 0;
    const cost = parseFloat(item.custo_unitario) || 0;
    const frete = parseFloat(item.valor_frete_item) || 0;
    const desc = parseFloat(item.valor_desconto_item) || 0;
    item.subtotal = qty * cost;
    item.total = item.subtotal + frete - desc;
    
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleAddItem = (product = null) => {
    // Check if product is actually a full item object (from MobileProductSelector)
    // If it has 'produto_id' and 'quantidade', use it directly.
    let newItem;
    
    if (product && product.produto_id && product.quantidade) {
        // It's a full item object
        newItem = {
            ...product,
            subtotal: (product.quantidade * product.custo_unitario),
            total: (product.quantidade * product.custo_unitario) + (product.valor_frete_item || 0) - (product.valor_desconto_item || 0)
        };
    } else {
        // It's a product entity or null
        newItem = { 
            produto_id: product?.id || '', 
            produto_nome: product?.nome || '', 
            codigo_produto: product?.codigo_interno || product?.codigo_barras || '',
            quantidade: 1, 
            unidade_medida: product?.unidade_compra || 'UN',
            custo_unitario: product?.valor_compra || 0,
            valor_frete_item: 0,
            valor_desconto_item: 0,
            subtotal: (product?.valor_compra || 0),
            total: (product?.valor_compra || 0),
            observacao_item: ''
        };
    }

    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, newItem],
    }));
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
            // 0:ID, 1:COD, 2:NAME, 3:UNIT, 4:COST, 5:QTY, 6:NEW_COST, 7:FREIGHT, 8:DESC
            
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
                    const freight = parseBRFloat(cols[7]?.replace(/"/g, ''));
                    const discount = parseBRFloat(cols[8]?.replace(/"/g, ''));
                    
                    const finalCost = newCost > 0 ? newCost : (currentCost > 0 ? currentCost : product.valor_compra);

                    newItems.push({
                        produto_id: product.id,
                        produto_nome: product.nome,
                        codigo_produto: product.codigo_interno || product.codigo_barras,
                        quantidade: qty,
                        unidade_medida: product.unidade_principal || 'UN',
                        custo_unitario: finalCost,
                        valor_frete_item: freight,
                        valor_desconto_item: discount,
                        subtotal: finalCost * qty,
                        total: (finalCost * qty) + freight - discount,
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
    setFormData(prev => ({ ...prev, itens: newItems }));
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

  const handleAuthSuccess = async (authData) => {
    setIsSaving(true);
    
    try {
      const authNote = `\n[Autenticado: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM HH:mm')}]`;
      
      const dataToSave = { 
        ...formData, 
        valor_itens: valorItens,
        valor_total: valorTotal,
        historico: (formData.historico || '') + authNote,
        // Opcional: Salvar URL da evidência em algum campo específico se existir no futuro
      };
      
      // Se mudou para "Enviado", disparar lógicas automáticas
      const mudouParaEnviado = !pedido && formData.status === 'Enviado' || 
                               (pedido && pedido.status !== 'Enviado' && formData.status === 'Enviado');
      
      await onSave(dataToSave);
      
      if (mudouParaEnviado) {
        // Buscar o PO recém-criado/atualizado para pegar o ID e número
        const allPOs = await base44.entities.PedidoCompra.list();
        const currentPO = pedido?.id ? 
          allPOs.find(p => p.id === pedido.id) :
          allPOs[allPOs.length - 1];
        
        if (currentPO) {
          // 1. Criar Lançamento Financeiro (Aguardando Recepção)
          await base44.entities.LancamentoFinanceiro.create({
            tipo: 'Despesa',
            descricao: `Compra de Mercadoria - ${currentPO.numero}`,
            terceiro_id: formData.fornecedor_id,
            terceiro_nome: formData.fornecedor_nome,
            valor: valorTotal,
            data_vencimento: format(addDays(new Date(formData.data_prevista_entrega || new Date()), 30), 'yyyy-MM-dd'),
            status: 'Aguardando Recepção',
            categoria: 'Compra de Mercadoria',
            referencia_id: currentPO.id,
            referencia_tipo: 'PedidoCompra',
            referencia_numero: currentPO.numero,
            observacoes: `Pagamento bloqueado até recepção do pedido ${currentPO.numero}`
          });
          
          // 2. Criar Tarefa para o Comprador
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
            title: "✓ PO Enviado com Sucesso!",
            description: `Conta a pagar criada (Bloqueada) e tarefa de following atribuída.`,
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

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleCreateEvent = async () => {
    if (!newEventData.nome || !newEventData.transportadora || !newEventData.data_previsao_chegada) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      const newEvent = await base44.entities.EventosLogisticos.create({
        ...newEventData,
        status: 'Agendado',
        data_saida: new Date().toISOString()
      });
      setEventosLogisticos([...eventosLogisticos, newEvent]);
      handleChange('evento_logistico_id', newEvent.id);
      setIsNewEventDialogOpen(false);
      toast({ title: "Evento criado e selecionado", className: "bg-green-100 text-green-800" });
    } catch (error) {
      toast({ title: "Erro ao criar evento", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DialogContent className="!max-w-[95vw] !w-[95vw] h-[95vh] p-0 overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 rounded-lg shadow-2xl">
      <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <DialogTitle className="text-xl font-normal text-gray-800 dark:text-gray-200">
          {pedido?.id ? `Editar: ${pedido.numero}` : 'Novo Pedido de Compra'}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="flex-shrink-0 bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 px-2 sm:px-6">
          <TabsTrigger value="dados-gerais" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm flex-1 sm:flex-none">
            <FileText className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Dados Gerais</span>
          </TabsTrigger>
          <TabsTrigger value="pagamento" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm flex-1 sm:flex-none">
            <DollarSign className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Pagamento</span>
          </TabsTrigger>
          <TabsTrigger value="logistica" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-sm flex-1 sm:flex-none">
            <Ship className="w-4 h-4 mr-2 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Logística</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-2 sm:p-6">
          {/* ABA: DADOS GERAIS */}
          <TabsContent value="dados-gerais" className="mt-0 space-y-4">
            
            {/* Header Compacto - Grid Principal */}
            <div className="grid grid-cols-12 gap-x-4 gap-y-2">
              {/* Fornecedor (Largo) */}
              <div className="col-span-12 lg:col-span-4">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Fornecedor *</Label>
                <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange}>
                  <SelectTrigger className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm focus:ring-0">
                    <SelectValue placeholder="Selecione o fornecedor..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700 z-[9999]">
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Status</Label>
                <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                  <SelectTrigger className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700 z-[9999]">
                    {['Rascunho', 'Enviado', 'Aguardando Recepção', 'Recebido Parcialmente', 'Recebido', 'Cancelado'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Datas (Emissão, Previsão) */}
              <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Emissão</Label>
                <Input 
                  type="date" 
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm" 
                  value={formData.data_emissao} 
                  onChange={e => handleChange('data_emissao', e.target.value)} 
                />
              </div>

              <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Entrega</Label>
                <Input 
                  type="date" 
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm" 
                  value={formData.data_prevista_entrega} 
                  onChange={e => handleChange('data_prevista_entrega', e.target.value)} 
                />
              </div>
              
               <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Prazo (Dias)</Label>
                <Input 
                  type="number" 
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm" 
                  value={formData.prazo_entrega_dias} 
                  onChange={e => handleChange('prazo_entrega_dias', parseInt(e.target.value) || 0)} 
                />
              </div>

              {/* Linha 2: Tags e Valores Globais (Frete/Desconto) */}
              <div className="col-span-12 lg:col-span-4 flex items-center gap-2">
                 <div className="flex-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Tags</Label>
                    <Input 
                      className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm" 
                      placeholder="Ex: Urgente, Reposição..."
                      value={formData.tags?.join(', ') || ''} 
                      onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                    />
                 </div>
              </div>

               <div className="col-span-4 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Frete (R$)</Label>
                <Input 
                  type="number" step="0.01"
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm font-medium" 
                  value={formData.valor_frete} 
                  onChange={e => handleChange('valor_frete', parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div className="col-span-4 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Desc. (%)</Label>
                <Input 
                  type="number" step="0.01"
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm" 
                  value={formData.percentual_desconto?.toFixed(2) || 0} 
                  onChange={e => handleDescontoPercentualChange(e.target.value)} 
                />
              </div>

              <div className="col-span-4 lg:col-span-2">
                 <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Desc. (R$)</Label>
                <Input 
                  type="number" step="0.01"
                  className="bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 h-9 text-sm font-medium" 
                  value={formData.valor_desconto?.toFixed(2) || 0} 
                  onChange={e => handleDescontoValorChange(e.target.value)} 
                />
              </div>
              
              {/* Observação Expansível */}
              <div className="col-span-12">
                 <Input 
                    className="bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none px-0 h-8 text-sm focus:ring-0 placeholder:text-gray-400" 
                    placeholder="Adicionar observações ou histórico..."
                    value={formData.observacoes} 
                    onChange={e => handleChange('observacoes', e.target.value)} 
                  />
              </div>
            </div>

            {/* Desktop View: Tabela e Totalizadores */}
            <div className="hidden lg:block">
               <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-normal text-gray-800 dark:text-gray-200">Itens do Pedido ({formData.itens.length})</h3>
                  <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportModel} 
                        className="h-7 text-xs px-2 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        title="Baixar planilha para preencher quantidades e custos offline"
                    >
                        <FileDown className="h-3.5 w-3.5 mr-1.5" /> 
                        Baixar Modelo
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
                            className="h-7 text-xs px-2 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="Importar planilha preenchida (CSV)"
                        >
                            <FileUp className="h-3.5 w-3.5 mr-1.5" /> 
                            Importar CSV
                        </Button>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleAddItem()} 
                        className="h-7 text-xs px-2 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <PlusCircle className="h-4 w-4 mr-1" /> 
                        Adicionar Item
                    </Button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                  <Table className="w-full">
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur">
                      <TableRow className="dark:border-gray-700 hover:bg-transparent">
                        <TableHead className="w-[3%] text-center dark:text-gray-400">#</TableHead>
                        <TableHead className="w-[20%] dark:text-gray-400">Produto</TableHead>
                        <TableHead className="w-[8%] dark:text-gray-400">Cód.</TableHead>
                        <TableHead className="w-[7%] dark:text-gray-400">Qtd.</TableHead>
                        <TableHead className="w-[5%] dark:text-gray-400">U/M</TableHead>
                        <TableHead className="w-[10%] dark:text-gray-400">V. Unit (Base)</TableHead>
                        <TableHead className="w-[10%] text-right dark:text-gray-400">Subtotal</TableHead>
                        <TableHead className="w-[10%] dark:text-gray-400">Frete (+)</TableHead>
                        <TableHead className="w-[10%] dark:text-gray-400">Desc. (-)</TableHead>
                        <TableHead className="w-[12%] text-right dark:text-gray-400">Total Líquido</TableHead>
                        <TableHead className="w-[5%] text-center dark:text-gray-400"><X className="w-4 h-4 mx-auto opacity-0" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.itens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-600 dark:text-gray-300">Lista de itens vazia</p>
                                <p className="text-xs text-gray-400 mt-1">Utilize o botão "Adicionar Item" acima para começar</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        formData.itens.map((item, index) => {
                          const selectedProduct = produtos.find(p => p.id === item.produto_id);
                          return (
                            <TableRow key={index} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                              <TableCell className="text-center text-gray-400 dark:text-gray-500 font-mono text-xs">
                                {String(index + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={item.produto_id} 
                                  onValueChange={v => handleItemChange(index, 'produto_id', v)}
                                >
                                  <SelectTrigger className="h-8 bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 text-sm shadow-none focus:ring-0">
                                    <span className="truncate block text-left w-full">
                                      {selectedProduct ? selectedProduct.nome : "Selecione..."}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px] z-[9999]">
                                    {produtos.map(p => (
                                      <SelectItem key={p.id} value={p.id} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm cursor-pointer">
                                        {p.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input 
                                  className="h-8 text-xs font-mono bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.codigo_produto} 
                                  onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                                  placeholder="Cód"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8 bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.quantidade} 
                                  onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  className="h-8 text-xs bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.unidade_medida} 
                                  onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="h-8 bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0 font-medium" 
                                  value={item.custo_unitario} 
                                  onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-600 dark:text-gray-400 text-sm">
                                {formatCurrency(item.subtotal || 0)}
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="h-8 bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0 text-gray-500" 
                                  value={item.valor_frete_item || 0} 
                                  onChange={e => handleItemChange(index, 'valor_frete_item', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  className="h-8 bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded px-2 shadow-none focus-visible:ring-0 text-red-400" 
                                  value={item.valor_desconto_item || 0} 
                                  onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200 text-sm">
                                {formatCurrency(item.total || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => handleRemoveItem(index)}
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

                {formData.itens.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-5 gap-6">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nº de Itens</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formData.itens.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Itens</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorItens)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frete Total</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(formData.valor_frete)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desconto Total</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">-{formatCurrency(formData.valor_desconto)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">VALOR TOTAL</div>
                        <div className="text-3xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</div>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Mobile View: PDV Style Selector */}
            <div className="lg:hidden h-[70vh] -mx-2 sm:mx-0">
              <MobileProductSelector 
                items={formData.itens}
                products={produtos}
                onAddItem={handleAddItem}
                onUpdateItem={handleItemChange}
                onRemoveItem={handleRemoveItem}
                formatCurrency={formatCurrency}
              />
            </div>
          </TabsContent>



          {/* ABA: LOGÍSTICA */}
          <TabsContent value="logistica" className="mt-0 space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Rastreamento de Entrada</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vincule este pedido a um evento logístico (viagem) para rastrear sua chegada.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 block">Evento Logístico (Viagem)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 text-[10px] px-2 text-blue-600 hover:text-blue-700"
                    onClick={() => setIsNewEventDialogOpen(true)}
                  >
                    <PlusCircle className="w-3 h-3 mr-1" /> Novo Evento
                  </Button>
                </div>
                <Select 
                  value={formData.evento_logistico_id || ''} 
                  onValueChange={v => handleChange('evento_logistico_id', v === 'none' ? null : v)}
                >
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue placeholder="Selecione uma viagem..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="none" className="text-gray-500">-- Sem Vínculo --</SelectItem>
                    {eventosLogisticos.map(ev => (
                      <SelectItem key={ev.id} value={ev.id} className="dark:text-gray-200 dark:hover:bg-gray-700">
                        {ev.nome} ({ev.transportadora})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Evento Logístico</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Nome da Viagem/Evento</Label>
                        <Input 
                          placeholder="Ex: Balsa Manaus - 05/11" 
                          value={newEventData.nome} 
                          onChange={e => setNewEventData({...newEventData, nome: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Transportadora</Label>
                        <Input 
                          placeholder="Ex: Transportes Rio Negro" 
                          value={newEventData.transportadora} 
                          onChange={e => setNewEventData({...newEventData, transportadora: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Previsão de Chegada</Label>
                        <Input 
                          type="datetime-local" 
                          value={newEventData.data_previsao_chegada} 
                          onChange={e => setNewEventData({...newEventData, data_previsao_chegada: e.target.value})}
                        />
                      </div>
                      <Button onClick={handleCreateEvent} className="w-full bg-blue-600 text-white">Criar e Selecionar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Status Documental</Label>
                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.nfe_emitida || false} 
                      onChange={e => handleChange('nfe_emitida', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Nota Fiscal Emitida pelo Fornecedor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.manifesto_conferido || false} 
                      onChange={e => handleChange('manifesto_conferido', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Manifesto de Carga Conferido</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Qtd. Volumes</Label>
                <Input 
                  type="number" 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.qtd_volumes} 
                  onChange={e => handleChange('qtd_volumes', parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Tipo de Volume</Label>
                <Select 
                  value={formData.tipo_volume} 
                  onValueChange={v => handleChange('tipo_volume', v)}
                >
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Caixas">Caixas</SelectItem>
                    <SelectItem value="Pallets">Pallets</SelectItem>
                    <SelectItem value="Sacos">Sacos</SelectItem>
                    <SelectItem value="Unidades">Unidades</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Peso Total (kg)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.peso_total_kg} 
                  onChange={e => handleChange('peso_total_kg', parseFloat(e.target.value) || 0)} 
                />
              </div>
            </div>
          </TabsContent>

          {/* ABA: PAGAMENTO */}
          <TabsContent value="pagamento" className="mt-0 space-y-6">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Automação Financeira</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quando o pedido for marcado como <strong>"Enviado"</strong>, será criado automaticamente:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-4 list-disc">
                    <li>Um lançamento financeiro (Conta a Pagar) com status "Aguardando Recepção"</li>
                    <li>Uma tarefa para acompanhamento do manifesto/nota fiscal</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Condições de Pagamento</Label>
              <Textarea 
                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm dark:text-gray-200 h-20 resize-none" 
                placeholder="Ex: 30/60/90 dias, À vista, Antecipado..."
                value={formData.condicoes_pagamento} 
                onChange={e => handleChange('condicoes_pagamento', e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Total do Pedido</div>
                <div className="text-3xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vencimento Estimado</div>
                <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {formData.data_prevista_entrega ? 
                    format(addDays(new Date(formData.data_prevista_entrega), 30), 'dd/MM/yyyy') : 
                    'Definir data de entrega'
                  }
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            <span>{formData.itens.length} item(s) • Total: <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</strong></span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
              Cancelar
            </Button>
            <Button 
              onClick={handleInitiateSave} 
              disabled={isSaving || !formData.fornecedor_id || formData.itens.length === 0} 
              className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white"
            >
              {isSaving ? 'Salvando...' : 'Autenticar e Salvar'}
            </Button>
          </div>
        </div>
      </DialogFooter>
      
      <OperacaoAuthenticator 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        operationName={pedido?.id ? `Salvar Pedido ${pedido.numero}` : "Criar Novo Pedido"}
      />
    </DialogContent>
  );
}