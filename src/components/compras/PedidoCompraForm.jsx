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
import { X, PlusCircle, FileText, Truck, DollarSign, AlertCircle, Package, Ship, Box, MapPin } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { addDays, format } from 'date-fns';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';

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

    if (['quantidade', 'custo_unitario', 'valor_frete_item', 'valor_desconto_item'].includes(field)) {
      const qty = parseFloat(item.quantidade) || 0;
      const cost = parseFloat(item.custo_unitario) || 0;
      const frete = parseFloat(item.valor_frete_item) || 0;
      const desc = parseFloat(item.valor_desconto_item) || 0;
      item.subtotal = qty * cost;
      item.total = item.subtotal + frete - desc;
    }
    
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { 
        produto_id: '', 
        produto_nome: '', 
        codigo_produto: '',
        quantidade: 1, 
        unidade_medida: 'UN',
        custo_unitario: 0,
        valor_frete_item: 0,
        valor_desconto_item: 0,
        subtotal: 0,
        total: 0,
        observacao_item: ''
      }],
    }));
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
    <DialogContent className="w-full max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
      <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <DialogTitle className="text-xl font-normal text-gray-800 dark:text-gray-200">
          {pedido?.id ? `Editar: ${pedido.numero}` : 'Novo Pedido de Compra'}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="flex-shrink-0 bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 px-6">
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

        <div className="flex-1 overflow-y-auto p-6">
          {/* ABA: DADOS GERAIS */}
          <TabsContent value="dados-gerais" className="mt-0 space-y-6">
            {/* Linha 1: Informações Básicas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
              <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Fornecedor *</Label>
                <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange}>
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id} className="dark:text-gray-200 dark:hover:bg-gray-700">{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-1 lg:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Emissão</Label>
                <Input 
                  type="date" 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.data_emissao} 
                  onChange={e => handleChange('data_emissao', e.target.value)} 
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Previsão</Label>
                <Input 
                  type="date" 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.data_prevista_entrega} 
                  onChange={e => handleChange('data_prevista_entrega', e.target.value)} 
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Prazo (dias)</Label>
                <Input 
                  type="number" 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.prazo_entrega_dias} 
                  onChange={e => handleChange('prazo_entrega_dias', parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Status</Label>
                <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Rascunho" className="dark:text-gray-200 dark:hover:bg-gray-700">Rascunho</SelectItem>
                    <SelectItem value="Enviado" className="dark:text-gray-200 dark:hover:bg-gray-700">Enviado</SelectItem>
                    <SelectItem value="Aguardando Recepção" className="dark:text-gray-200 dark:hover:bg-gray-700">Aguardando Recepção</SelectItem>
                    <SelectItem value="Recebido Parcialmente" className="dark:text-gray-200 dark:hover:bg-gray-700">Recebido Parcialmente</SelectItem>
                    <SelectItem value="Recebido" className="dark:text-gray-200 dark:hover:bg-gray-700">Recebido</SelectItem>
                    <SelectItem value="Recebido com Discrepância" className="dark:text-gray-200 dark:hover:bg-gray-700">Recebido com Discrepância</SelectItem>
                    <SelectItem value="Cancelado" className="dark:text-gray-200 dark:hover:bg-gray-700">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Histórico e Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Histórico</Label>
                <Input 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  placeholder="Informações adicionais..."
                  value={formData.historico} 
                  onChange={e => handleChange('historico', e.target.value)} 
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Tags</Label>
                <Input 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  placeholder="Ex: Urgente, Projeto X (separar por vírgula)"
                  value={formData.tags?.join(', ') || ''} 
                  onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                />
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {formData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] h-5 border-gray-300 dark:border-gray-600">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Linha 3: Observações */}
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Observações</Label>
              <Textarea 
                className="bg-transparent border border-gray-300 dark:border-gray-600 rounded text-sm dark:text-gray-200 h-16 resize-none min-h-[64px]" 
                placeholder="Observações gerais do pedido..."
                value={formData.observacoes} 
                onChange={e => handleChange('observacoes', e.target.value)} 
              />
            </div>

            {/* Linha 4: Valores de Frete e Desconto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Frete Total (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.valor_frete} 
                  onChange={e => handleChange('valor_frete', parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Desconto (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.percentual_desconto?.toFixed(2) || 0} 
                  onChange={e => handleDescontoPercentualChange(e.target.value)} 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Desconto (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                  value={formData.valor_desconto?.toFixed(2) || 0} 
                  onChange={e => handleDescontoValorChange(e.target.value)} 
                />
              </div>
            </div>

            {/* Tabela de Itens */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-normal text-gray-800 dark:text-gray-200">Itens do Pedido ({formData.itens.length})</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddItem} 
                  className="h-7 text-xs px-2 dark:text-gray-300"
                >
                  <PlusCircle className="h-4 w-4 mr-1" /> 
                  Adicionar Item
                </Button>
              </div>

              {/* Desktop View - Table */}
              <div className="hidden lg:block border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="w-[50px] dark:text-gray-400">#</TableHead>
                      <TableHead className="w-[250px] dark:text-gray-400">Produto *</TableHead>
                      <TableHead className="w-[100px] dark:text-gray-400">Código</TableHead>
                      <TableHead className="w-[80px] dark:text-gray-400">Qtd *</TableHead>
                      <TableHead className="w-[70px] dark:text-gray-400">U/M</TableHead>
                      <TableHead className="w-[110px] dark:text-gray-400">Preço Compra *</TableHead>
                      <TableHead className="w-[110px] dark:text-gray-400">Subtotal</TableHead>
                      <TableHead className="w-[100px] dark:text-gray-400">Frete</TableHead>
                      <TableHead className="w-[100px] dark:text-gray-400">Desconto</TableHead>
                      <TableHead className="w-[120px] dark:text-gray-400">Total</TableHead>
                      <TableHead className="w-[50px] dark:text-gray-400"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                          <p>Nenhum item adicionado</p>
                          <p className="text-xs mt-1">Clique em "Adicionar Item" para começar</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.itens.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-800">
                          <TableCell className="text-center text-gray-500 dark:text-gray-400 font-mono">
                            {String(index + 1).padStart(2, '0')}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.produto_id} 
                              onValueChange={v => handleItemChange(index, 'produto_id', v)}
                            >
                              <SelectTrigger className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                                {produtos.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="dark:text-gray-200 dark:hover:bg-gray-700">
                                    {p.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              className="h-8 text-xs font-mono bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.codigo_produto} 
                              onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                              placeholder="Cód"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.quantidade} 
                              onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              className="h-8 text-xs bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.unidade_medida} 
                              onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.custo_unitario} 
                              onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)} 
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(item.subtotal || 0)}
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.valor_frete_item || 0} 
                              onChange={e => handleItemChange(index, 'valor_frete_item', e.target.value)} 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              step="0.01"
                              className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                              value={item.valor_desconto_item || 0} 
                              onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)} 
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(item.total || 0)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 dark:hover:bg-gray-700"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <X className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet View - Cards */}
              <div className="lg:hidden space-y-4">
                {formData.itens.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum item adicionado</p>
                  </div>
                ) : (
                  formData.itens.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                             <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">#{String(index + 1).padStart(2, '0')}</span>
                             <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Produto</span>
                          </div>
                          <Select 
                            value={item.produto_id} 
                            onValueChange={v => handleItemChange(index, 'produto_id', v)}
                          >
                            <SelectTrigger className="h-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 dark:text-gray-200">
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                              {produtos.map(p => (
                                <SelectItem key={p.id} value={p.id} className="dark:text-gray-200 dark:hover:bg-gray-700">
                                  {p.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 -mt-1 -mr-2"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">Cód.</Label>
                          <Input 
                            className="h-8 text-xs font-mono bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.codigo_produto} 
                            onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">Qtd</Label>
                          <Input 
                            type="number"
                            className="h-8 text-sm bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.quantidade} 
                            onChange={e => handleItemChange(index, 'quantidade', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">U/M</Label>
                          <Input 
                            className="h-8 text-xs bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.unidade_medida} 
                            onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">Custo Unit. (R$)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-8 text-sm bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.custo_unitario} 
                            onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col justify-end text-right h-8 mt-6">
                           <span className="text-xs text-gray-400">Subtotal: {formatCurrency(item.subtotal || 0)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">Frete Item (R$)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-8 text-xs bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.valor_frete_item || 0} 
                            onChange={e => handleItemChange(index, 'valor_frete_item', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-400 mb-1 block">Desconto Item (R$)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            className="h-8 text-xs bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            value={item.valor_desconto_item || 0} 
                            onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500">Total do Item</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrency(item.total || 0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totalizadores */}
              {formData.itens.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nº de Itens</div>
                      <div className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200">{formData.itens.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Itens</div>
                      <div className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorItens)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frete Total</div>
                      <div className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(formData.valor_frete)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desconto Total</div>
                      <div className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-200">-{formatCurrency(formData.valor_desconto)}</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700 mt-2 sm:mt-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">VALOR TOTAL</div>
                      <div className="text-2xl sm:text-3xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</div>
                    </div>
                  </div>
                </div>
              )}
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