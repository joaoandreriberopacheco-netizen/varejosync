import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, PlusCircle, AlertTriangle, Percent, FileText, DollarSign, Truck } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import AnaliseEntrega from './AnaliseEntrega';
import PedidoFAB from './PedidoFAB';

export default function PedidoVendaForm({ pedido, onSave, onClose }) {
  const [formData, setFormData] = useState(pedido || {
    cliente_id: '',
    cliente_nome: '',
    vendedor_id: '',
    vendedor_nome: '',
    tabela_preco_id: '',
    tipo: 'Pedido',
    status: 'Orçamento',
    metodo_entrega: 'Retirada',
    itens: [],
    subtotal: 0,
    valor_desconto: 0,
    valor_frete: 0,
    valor_total: 0,
    pagamentos: [],
    observacoes: '',
  });

  const [dependencies, setDependencies] = useState({
    clientes: [],
    produtos: [],
    tabelasPreco: [],
    currentUser: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadDependencies = async () => {
      const [clientesData, produtosData, tabelasPrecoData, userData] = await Promise.all([
        base44.entities.Terceiro.filter({ tipo: ['Cliente', 'Ambos'] }),
        base44.entities.Produto.list(),
        base44.entities.TabelaPreco.list(),
        base44.auth.me()
      ]);
      setDependencies({
        clientes: clientesData,
        produtos: produtosData,
        tabelasPreco: tabelasPrecoData,
        currentUser: userData
      });
      if (!pedido) {
        setFormData(prev => ({
          ...prev,
          vendedor_id: userData.id,
          vendedor_nome: userData.full_name
        }));
      }
    };
    loadDependencies();
  }, [pedido]);

  const { subtotal, valorTotal, percentualDesconto, descontoExcedido } = useMemo(() => {
    const sub = formData.itens.reduce((acc, item) => acc + (item.total || 0), 0);
    const total = sub - formData.valor_desconto + formData.valor_frete;
    const percent = sub > 0 ? (formData.valor_desconto / sub) * 100 : 0;
    const limite = dependencies.currentUser?.limite_desconto || 0;
    const excedido = percent > limite;
    return { subtotal: sub, valorTotal: total, percentualDesconto: percent, descontoExcedido: excedido };
  }, [formData.itens, formData.valor_desconto, formData.valor_frete, dependencies.currentUser]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClienteChange = (id) => {
    const cliente = dependencies.clientes.find(c => c.id === id);
    if (cliente) {
      handleChange('cliente_id', id);
      handleChange('cliente_nome', cliente.nome);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.itens];
    const item = newItems[index];
    item[field] = value;

    if (field === 'produto_id') {
      const produto = dependencies.produtos.find(p => p.id === value);
      if (produto) {
        item.produto_nome = produto.nome;
        item.preco_unitario_praticado = produto.preco_venda_padrao || 0;
        item.custo_unitario_momento = produto.preco_custo_calculado || 0;
      }
    }

    if (['quantidade', 'preco_unitario_praticado'].includes(field)) {
      const qty = parseFloat(item.quantidade) || 0;
      const price = parseFloat(item.preco_unitario_praticado) || 0;
      item.total = qty * price;
    }

    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { produto_id: '', produto_nome: '', quantidade: 1, preco_unitario_praticado: 0, custo_unitario_momento: 0, total: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.itens.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, itens: newItems }));
  };

  const handleSave = async () => {
    if (!formData.cliente_id) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente antes de salvar.",
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

    if (descontoExcedido) {
      toast({
        title: "Desconto excedido",
        description: `Desconto de ${percentualDesconto.toFixed(2)}% excede o seu limite de ${dependencies.currentUser.limite_desconto}%.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ ...formData, subtotal, valor_total: valorTotal });
      toast({
        title: "✓ Pedido salvo!",
        description: "Pedido de venda criado com sucesso.",
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
      {/* Header - FIXO */}
      <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg md:text-xl font-normal text-gray-800 dark:text-gray-200">
            {pedido?.id ? `Editar: ${pedido.numero}` : 'Novo Pedido de Venda'}
          </DialogTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 h-8 px-3 text-xs md:text-sm">
              <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || descontoExcedido} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white h-8 px-3 text-xs md:text-sm">
              <Save className="w-3 h-3 md:w-4 md:h-4 mr-1" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogHeader>

      <Tabs defaultValue="dados-gerais" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex-shrink-0">
          <TabsTrigger value="dados-gerais" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs md:text-sm">
            <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Dados Gerais</span><span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="valores" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs md:text-sm">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-1 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Valores</span><span className="sm:hidden">Valor</span>
          </TabsTrigger>
          <TabsTrigger value="entrega" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs md:text-sm">
            <Truck className="w-3 h-3 md:w-4 md:h-4 mr-1 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline">Entrega</span><span className="sm:hidden">Entreg</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {/* ABA DADOS GERAIS */}
          <TabsContent value="dados-gerais" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Cliente *</Label>
                <Select value={formData.cliente_id} onValueChange={handleClienteChange}>
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {dependencies.clientes.map(c => (
                      <SelectItem key={c.id} value={c.id} className="dark:text-gray-200 dark:hover:bg-gray-700">{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Status</Label>
                <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Orçamento" className="dark:text-gray-200 dark:hover:bg-gray-700">Orçamento</SelectItem>
                    <SelectItem value="Aguardando Pagamento" className="dark:text-gray-200 dark:hover:bg-gray-700">Aguardando Pagamento</SelectItem>
                    <SelectItem value="Aprovado" className="dark:text-gray-200 dark:hover:bg-gray-700">Aprovado</SelectItem>
                    <SelectItem value="Finalizado" className="dark:text-gray-200 dark:hover:bg-gray-700">Finalizado</SelectItem>
                    <SelectItem value="Cancelado" className="dark:text-gray-200 dark:hover:bg-gray-700">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Vendedor</Label>
                <Input 
                  value={formData.vendedor_nome}
                  disabled
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm text-gray-400 dark:text-gray-500"
                />
              </div>
            </div>

            {/* Itens do Pedido */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Itens do Pedido ({formData.itens.length})</h3>
                <Button onClick={handleAddItem} variant="ghost" size="sm" className="h-7 text-xs px-2 dark:text-gray-300">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800">
                    <TableRow className="dark:border-gray-700">
                      <TableHead className="min-w-[200px] dark:text-gray-400">Produto</TableHead>
                      <TableHead className="min-w-[80px] dark:text-gray-400">Qtd.</TableHead>
                      <TableHead className="min-w-[100px] dark:text-gray-400">Preço Unit.</TableHead>
                      <TableHead className="min-w-[100px] text-right dark:text-gray-400">Total</TableHead>
                      <TableHead className="w-[50px] dark:text-gray-400"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>Nenhum item adicionado</p>
                          <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.itens.map((item, index) => (
                        <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:border-gray-800">
                          <TableCell>
                            <Select value={item.produto_id} onValueChange={v => handleItemChange(index, 'produto_id', v)}>
                              <SelectTrigger className="h-8 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                                {dependencies.produtos.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="dark:text-gray-200 dark:hover:bg-gray-700">
                                    {p.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              value={item.quantidade} 
                              onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                              className="h-8 w-20 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              step="0.01"
                              value={item.preco_unitario_praticado} 
                              onChange={e => handleItemChange(index, 'preco_unitario_praticado', e.target.value)} 
                              className="h-8 w-24 bg-transparent border-gray-200 dark:border-gray-700 dark:text-gray-200" 
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 dark:hover:bg-gray-700"
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
            </div>
          </TabsContent>

          {/* ABA VALORES */}
          <TabsContent value="valores" className="space-y-6 mt-0">
            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</div>
                <div className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(subtotal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desconto</div>
                <div className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200">-{formatCurrency(formData.valor_desconto)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                <div className="text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Desconto (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={percentualDesconto.toFixed(2)}
                      onChange={e => {
                        const percent = parseFloat(e.target.value) || 0;
                        const valorDesc = (subtotal * percent) / 100;
                        handleChange('valor_desconto', valorDesc);
                      }}
                      className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200"
                    />
                    <Percent className="w-4 h-4 text-gray-400" />
                  </div>
                  {dependencies.currentUser?.limite_desconto && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Seu limite: {dependencies.currentUser.limite_desconto}%
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_desconto}
                    onChange={e => handleChange('valor_desconto', parseFloat(e.target.value) || 0)}
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Frete (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_frete}
                    onChange={e => handleChange('valor_frete', parseFloat(e.target.value) || 0)}
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200"
                  />
                </div>
              </div>

              {descontoExcedido && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2 dark:bg-red-900/20 dark:border-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 dark:text-red-300">
                    <strong>Desconto excedido!</strong> Você aplicou {percentualDesconto.toFixed(1)}%, 
                    mas seu limite é {dependencies.currentUser?.limite_desconto}%. 
                    Solicite aprovação de um gerente.
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">VALOR TOTAL</span>
                  <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-200">
                    {formatCurrency(valorTotal)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA ENTREGA */}
          <TabsContent value="entrega" className="space-y-4 mt-0">
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Método de Entrega</Label>
              <Select value={formData.metodo_entrega} onValueChange={v => handleChange('metodo_entrega', v)}>
                <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10 text-sm dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="Retirada" className="dark:text-gray-200 dark:hover:bg-gray-700">Retirada na Loja</SelectItem>
                  <SelectItem value="Delivery" className="dark:text-gray-200 dark:hover:bg-gray-700">Entrega (Delivery)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.metodo_entrega === 'Delivery' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-700">
                <AnaliseEntrega pedido={formData} />
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Observações</Label>
              <Input
                value={formData.observacoes}
                onChange={e => handleChange('observacoes', e.target.value)}
                placeholder="Informações adicionais..."
                className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer - FIXO */}
      <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <FileText className="w-4 h-4" />
            <span>{formData.itens.length} item(s) • Total: <strong className="text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</strong></span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || descontoExcedido || !formData.cliente_id || formData.itens.length === 0}
              className="flex-1 sm:flex-none bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white"
            >
              {isSaving ? 'Salvando...' : 'Salvar Pedido'}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}