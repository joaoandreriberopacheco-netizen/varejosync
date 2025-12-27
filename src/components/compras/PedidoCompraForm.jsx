import React, { useState, useEffect, useMemo } from 'react';
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
import { X, PlusCircle, FileText, Truck, DollarSign, AlertCircle, Package, Ship, Box, MapPin, FileDown, FileUp, Download, Trash2, Calendar, Package as PackageIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { addDays, format } from 'date-fns';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import MobileProductSelector from './MobileProductSelector';
import { getTenantId } from '@/components/utils/tenant';
import AtualizarPrecosDialog from './AtualizarPrecosDialog';

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
  const [supermanifesto, setSupermanifesto] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNovaTransportadora, setShowNovaTransportadora] = useState(false);
  const [novaTransportadora, setNovaTransportadora] = useState({ nome: '', email: '', telefone: '' });
  const [volumes, setVolumes] = useState([]);
  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadDependencies = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const [fornecedorData, produtoData, transportadoraData] = await Promise.all([
        base44.entities.Terceiro.list(),
        base44.entities.Produto.list(),
        base44.entities.Terceiro.list()
      ]);
      setFornecedores(fornecedorData.filter(t => t.tipo === 'Fornecedor' || t.tipo === 'Ambos'));
      setProdutos(produtoData);
      
      // Transportadoras são também fornecedores
      const transportadoras = transportadoraData.filter(t => (t.tipo === 'Fornecedor' || t.tipo === 'Ambos') && t.ativo);
      setFornecedores(prev => transportadoras); // Reutiliza a lista

      // Carregar supermanifesto se existir
      if (pedido?.supermanifesto_id) {
        const manifestoData = await base44.entities.Supermanifesto.filter({ id: pedido.supermanifesto_id });
        if (manifestoData && manifestoData.length > 0) {
          setSupermanifesto(manifestoData[0]);
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

    setFormData(prev => ({ ...prev, itens: newItems }));
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
      
      // Salvar pedido primeiro
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
          
          // Processar Embarque se informado na aba Logística
          if (formData.transportadora_embarque_id && formData.eta_embarque) {
            await processarEmbarque(currentPO);
          }

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

  const handleCriarTransportadora = async () => {
    if (!novaTransportadora.nome?.trim()) {
      toast({ title: 'Nome da transportadora é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const tenantId = getTenantId();
      const count = fornecedores.length;
      const codigo = `FOR-${String(count + 1).padStart(5, '0')}`;

      const nova = await base44.entities.Terceiro.create({
        empresa_id: tenantId,
        codigo_interno: codigo,
        nome: novaTransportadora.nome,
        email: novaTransportadora.email || '',
        telefone: novaTransportadora.telefone || '',
        tipo: 'Fornecedor',
        ativo: true
      });

      setFornecedores([...fornecedores, nova]);
      handleChange('transportadora_embarque_id', nova.id);
      setShowNovaTransportadora(false);
      setNovaTransportadora({ nome: '', email: '', telefone: '' });
      toast({ title: 'Transportadora criada com sucesso' });
    } catch (error) {
      console.error('Erro ao criar transportadora:', error);
      toast({ title: 'Erro ao criar transportadora', variant: 'destructive' });
    }
  };

  const handleAddVolume = () => {
    setVolumes([...volumes, { quantidade: '', descricao: '', preco_unit_frete: '', observacoes: '' }]);
  };

  const handleRemoveVolume = (index) => {
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  const handleVolumeChange = (index, field, value) => {
    const newVolumes = [...volumes];
    newVolumes[index][field] = value;
    setVolumes(newVolumes);
  };

  const calcularTotalFrete = () => {
    return volumes.reduce((sum, v) => {
      const qty = parseFloat(v.quantidade) || 0;
      const price = parseFloat(v.preco_unit_frete) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const gerarDescritivoVolumes = () => {
    return volumes
      .map(v => `${v.quantidade || 0}x ${v.descricao || ''}`)
      .filter(d => d.trim() !== 'x' && d.trim() !== '0x')
      .join(', ');
  };

  const processarEmbarque = async (pedidoAtualizado) => {
    try {
      const tenantId = getTenantId();
      const transportadora = fornecedores.find(t => t.id === formData.transportadora_embarque_id);

      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }

      const pesoNumerico = parseFloat(formData.peso_total_kg) || 0;

      // Verificar manifesto existente no mesmo dia
      const etaDate = new Date(formData.eta_embarque);
      const etaStart = new Date(etaDate);
      etaStart.setHours(0, 0, 0, 0);
      const etaEnd = new Date(etaDate);
      etaEnd.setHours(23, 59, 59, 999);

      const manifestos = await base44.entities.Supermanifesto.filter({
        empresa_id: tenantId,
        transportadora_id: formData.transportadora_embarque_id,
        status: { $in: ['Pendente', 'Em Trânsito'] }
      });

      const manifestoExistente = manifestos.find(m => {
        const manifestoEta = new Date(m.eta);
        return manifestoEta >= etaStart && manifestoEta <= etaEnd;
      });

      let manifestoId;

      if (manifestoExistente) {
        // Adicionar ao manifesto existente
        manifestoId = manifestoExistente.id;
        
        const pedidosVinculados = manifestoExistente.pedidos_vinculados || [];
        pedidosVinculados.push({
          pedido_id: pedidoAtualizado.id,
          pedido_numero: pedidoAtualizado.numero,
          descritivo_volumes: gerarDescritivoVolumes(),
          peso_informado_kg: pesoNumerico,
          volumes: volumes,
          total_frete: calcularTotalFrete()
        });

        const observacoesConsolidadas = pedidosVinculados
          .map(p => `${p.pedido_numero}: ${p.descritivo_volumes}`)
          .filter(o => o.trim() && o.trim() !== ':')
          .join(' | ');

        const pesoTotal = pedidosVinculados.reduce((sum, p) => sum + (p.peso_informado_kg || 0), 0);

        await base44.entities.Supermanifesto.update(manifestoId, {
          pedidos_vinculados: pedidosVinculados,
          peso_total_bruto_kg: pesoTotal,
          observacoes_consolidadas: observacoesConsolidadas
        });

      } else {
        // Criar novo manifesto
        const todosManifestos = await base44.entities.Supermanifesto.filter({ empresa_id: tenantId });
        const numero = `SM-${String(todosManifestos.length + 1).padStart(5, '0')}`;

        const novoManifesto = await base44.entities.Supermanifesto.create({
          empresa_id: tenantId,
          numero,
          transportadora_id: formData.transportadora_embarque_id,
          transportadora_nome: transportadora.nome,
          eta: formData.eta_embarque,
          status: 'Pendente',
          peso_total_bruto_kg: pesoNumerico,
          pedidos_vinculados: [{
            pedido_id: pedidoAtualizado.id,
            pedido_numero: pedidoAtualizado.numero,
            descritivo_volumes: gerarDescritivoVolumes(),
            peso_informado_kg: pesoNumerico,
            volumes: volumes,
            total_frete: calcularTotalFrete()
          }],
          observacoes_consolidadas: `${pedidoAtualizado.numero}: ${gerarDescritivoVolumes()}`
        });

        manifestoId = novoManifesto.id;
      }

      // Atualizar o pedido com manifesto vinculado
      await base44.entities.PedidoCompra.update(pedidoAtualizado.id, {
        status: 'Aguardando Recepção',
        supermanifesto_id: manifestoId
      });

    } catch (error) {
      console.error('Erro ao processar embarque:', error);
      throw error;
    }
  };

  const reloadSupermanifesto = async () => {
    if (formData.supermanifesto_id) {
      const manifestoData = await base44.entities.Supermanifesto.filter({ id: formData.supermanifesto_id });
      if (manifestoData && manifestoData.length > 0) {
        setSupermanifesto(manifestoData[0]);
      }
    }
  };

  return (
    <DialogContent className="!max-w-[98vw] !w-[98vw] h-[95vh] p-0 overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 rounded-lg shadow-2xl">
      <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <DialogTitle className="text-xl font-normal text-gray-800 dark:text-gray-200">
          {pedido?.id ? `Editar: ${pedido.numero}` : 'Novo Pedido de Compra'}
        </DialogTitle>
      </DialogHeader>

      {isMobile ? (
        /* MOBILE: Layout Linear Scrollável */
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4">
            {/* Seção 1: Cabeçalho */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Informações Gerais</h3>
              </div>
            
            {/* Header Compacto - Grid Principal */}
            <div className="grid grid-cols-12 gap-x-4 gap-y-2">
              {/* Fornecedor (Largo) */}
              <div className="col-span-12 lg:col-span-4">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Fornecedor *</Label>
                <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm focus:ring-0 shadow-sm">
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
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm focus:ring-0 shadow-sm">
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
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm shadow-sm" 
                  value={formData.data_emissao} 
                  onChange={e => handleChange('data_emissao', e.target.value)} 
                />
              </div>

              <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Entrega</Label>
                <Input 
                  type="date" 
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm shadow-sm" 
                  value={formData.data_prevista_entrega} 
                  onChange={e => handleChange('data_prevista_entrega', e.target.value)} 
                />
              </div>
              
               <div className="col-span-6 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Prazo (Dias)</Label>
                <Input 
                  type="number" 
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm shadow-sm" 
                  value={formData.prazo_entrega_dias} 
                  onChange={e => handleChange('prazo_entrega_dias', parseInt(e.target.value) || 0)} 
                />
              </div>

              {/* Linha 2: Tags e Valores Globais (Frete/Desconto) */}
              <div className="col-span-12 lg:col-span-4 flex items-center gap-2">
                 <div className="flex-1">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Tags</Label>
                    <Input 
                      className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm shadow-sm" 
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
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm font-medium shadow-sm" 
                  value={formData.valor_frete} 
                  onChange={e => handleChange('valor_frete', parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div className="col-span-4 lg:col-span-2">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Desc. (%)</Label>
                <Input 
                  type="number" step="0.01"
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm shadow-sm" 
                  value={formData.percentual_desconto?.toFixed(2) || 0} 
                  onChange={e => handleDescontoPercentualChange(e.target.value)} 
                />
              </div>

              <div className="col-span-4 lg:col-span-2">
                 <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1 block">Desc. (R$)</Label>
                <Input 
                  type="number" step="0.01"
                  className="bg-gray-50 dark:bg-gray-800 border-none h-9 text-sm font-medium shadow-sm" 
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

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Fornecedor *</Label>
                <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700 z-[9999]">
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</Label>
                  <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700 z-[9999]">
                      {['Rascunho', 'Enviado', 'Aguardando Recepção', 'Recebido'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Emissão</Label>
                  <Input 
                    type="date" 
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                    value={formData.data_emissao} 
                    onChange={e => handleChange('data_emissao', e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Entrega Prevista</Label>
                <Input 
                  type="date" 
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                  value={formData.data_prevista_entrega} 
                  onChange={e => handleChange('data_prevista_entrega', e.target.value)} 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Observações</Label>
                <Input 
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                  placeholder="Observações do pedido..."
                  value={formData.observacoes} 
                  onChange={e => handleChange('observacoes', e.target.value)} 
                />
              </div>
            </div>

            {/* Seção 2: Itens e Precificação */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Itens ({formData.itens.length})</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAtualizarPrecos(true)}
                  disabled={formData.itens.length === 0}
                  className="h-8 text-xs gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Ajustar
                </Button>
              </div>

              <MobileProductSelector 
                items={formData.itens}
                products={produtos}
                onAddItem={handleAddItem}
                onUpdateItem={handleItemChange}
                onRemoveItem={handleRemoveItem}
                formatCurrency={formatCurrency}
              />

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Frete</Label>
                  <Input 
                    type="number" step="0.01"
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                    value={formData.valor_frete} 
                    onChange={e => handleChange('valor_frete', parseFloat(e.target.value) || 0)} 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Desconto</Label>
                  <Input 
                    type="number" step="0.01"
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                    value={formData.valor_desconto} 
                    onChange={e => handleDescontoValorChange(e.target.value)} 
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total do Pedido</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            </div>

            {/* Seção 3: Pagamento */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Condições de Pagamento</h3>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ao marcar como "Enviado", será criada automaticamente uma conta a pagar com status "Aguardando Recepção"
                </p>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Condições</Label>
                <Textarea 
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-20 resize-none" 
                  placeholder="Ex: 30/60/90 dias, À vista..."
                  value={formData.condicoes_pagamento} 
                  onChange={e => handleChange('condicoes_pagamento', e.target.value)} 
                />
              </div>
            </div>

            {/* Seção 4: Logística */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Ship className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Informações Logísticas</h3>
              </div>

              {supermanifesto ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg dark:bg-teal-900/20 dark:border-teal-800">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-xs text-teal-700 dark:text-teal-300">Manifesto</span>
                      <span className="font-medium text-teal-900 dark:text-teal-100">{supermanifesto.numero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-teal-700 dark:text-teal-300">Transportadora</span>
                      <span className="font-medium text-teal-900 dark:text-teal-100">{supermanifesto.transportadora_nome}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Transportadora</Label>
                    <Select value={formData.transportadora_embarque_id} onValueChange={v => handleChange('transportadora_embarque_id', v)}>
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        {fornecedores.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Data de Chegada (ETA)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.eta_embarque || ''}
                      onChange={(e) => handleChange('eta_embarque', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Volumes</Label>
                      <Input 
                        type="number" 
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                        value={formData.qtd_volumes} 
                        onChange={e => handleChange('qtd_volumes', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tipo</Label>
                      <Select value={formData.tipo_volume} onValueChange={v => handleChange('tipo_volume', v)}>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                          <SelectItem value="Caixas">Caixas</SelectItem>
                          <SelectItem value="Pallets">Pallets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2">Peso (kg)</Label>
                      <Input 
                        type="number" step="0.1"
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                        value={formData.peso_total_kg} 
                        onChange={e => handleChange('peso_total_kg', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* DESKTOP: Tabs Originais */
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
            <TabsContent value="dados-gerais" className="mt-0 space-y-4">
              {/* Desktop View: Tabela e Totalizadores */}
              <div className="hidden lg:block">
               <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-normal text-gray-800 dark:text-gray-200">Itens do Pedido ({formData.itens.length})</h3>
                  <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowAtualizarPrecos(true)} 
                        className="h-7 text-xs px-2 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        title="Revisar e atualizar custos e preços de venda"
                        disabled={formData.itens.length === 0}
                    >
                        <DollarSign className="h-3.5 w-3.5 mr-1.5" /> 
                        Ajuste de Preços
                    </Button>
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
                  <div className="overflow-x-auto">
                      <Table className="w-full min-w-[1400px]">
                          <TableHeader className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur">
                          <TableRow className="dark:border-gray-700 hover:bg-transparent">
                              <TableHead className="w-[40px] text-center dark:text-gray-400 sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">#</TableHead>
                              <TableHead className="min-w-[250px] dark:text-gray-400 sticky left-[40px] z-20 bg-gray-50 dark:bg-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Produto</TableHead>
                              <TableHead className="min-w-[80px] dark:text-gray-400">Cód.</TableHead>
                              <TableHead className="min-w-[70px] dark:text-gray-400">Qtd.</TableHead>
                              <TableHead className="min-w-[60px] dark:text-gray-400">U/M</TableHead>
                              <TableHead className="min-w-[100px] dark:text-gray-400">Preço</TableHead>
                              <TableHead className="min-w-[100px] dark:text-gray-400 text-green-600">Desconto</TableHead>
                              <TableHead className="min-w-[120px] text-right dark:text-gray-400 sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-xl">Total Líq</TableHead>
                              <TableHead className="w-[40px] text-center dark:text-gray-400"><X className="w-4 h-4 mx-auto opacity-0" /></TableHead>
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
                              <TableCell className="text-center text-gray-400 dark:text-gray-500 font-mono text-xs sticky left-0 z-10 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                {String(index + 1).padStart(2, '0')}
                              </TableCell>
                              <TableCell className="sticky left-[40px] z-10 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
                                  className="h-8 text-xs font-mono bg-transparent border-none rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.codigo_produto}
                                  onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                                  placeholder="Cód"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  className="h-8 bg-transparent border-none rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.quantidade}
                                  onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  className="h-8 text-xs bg-transparent border-none rounded px-2 shadow-none focus-visible:ring-0" 
                                  value={item.unidade_medida}
                                  onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" step="0.01"
                                  className="h-8 min-w-[80px] bg-transparent border-none rounded px-2 shadow-none focus-visible:ring-0 font-medium" 
                                  value={item.custo_unitario} 
                                  onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" step="0.01"
                                  className="h-8 min-w-[80px] bg-transparent border-none rounded px-2 shadow-none focus-visible:ring-0 text-green-600" 
                                  value={item.valor_desconto_item || 0} 
                                  onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)} 
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold text-gray-900 dark:text-white text-sm sticky right-0 z-10 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-100 dark:border-gray-800">
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
            {!supermanifesto ? (
              <>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Ship className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Rastreamento de Entrada</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Preencha os campos abaixo para vincular este pedido a um supermanifesto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transportadora */}
                <div className="space-y-2">
                  <Label className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Transportadora
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNovaTransportadora(!showNovaTransportadora)}
                      className="h-6 text-xs gap-1 text-teal-600 hover:text-teal-700"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Nova
                    </Button>
                  </Label>
                  
                  {showNovaTransportadora ? (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Input
                        placeholder="Nome da transportadora *"
                        value={novaTransportadora.nome}
                        onChange={(e) => setNovaTransportadora({ ...novaTransportadora, nome: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Email"
                          type="email"
                          value={novaTransportadora.email}
                          onChange={(e) => setNovaTransportadora({ ...novaTransportadora, email: e.target.value })}
                        />
                        <Input
                          placeholder="Telefone"
                          value={novaTransportadora.telefone}
                          onChange={(e) => setNovaTransportadora({ ...novaTransportadora, telefone: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNovaTransportadora(false);
                            setNovaTransportadora({ nome: '', email: '', telefone: '' });
                          }}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCriarTransportadora}
                          className="flex-1 bg-teal-600 hover:bg-teal-700"
                        >
                          Criar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select value={formData.transportadora_embarque_id} onValueChange={v => handleChange('transportadora_embarque_id', v)}>
                      <SelectTrigger className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10">
                        <SelectValue placeholder="Selecione a transportadora" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        {fornecedores.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Data ETA */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    Data de Chegada Prevista (ETA)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formData.eta_embarque || ''}
                    onChange={(e) => handleChange('eta_embarque', e.target.value)}
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none h-10"
                  />
                </div>

                {/* Descritivo de Volumes */}
                <div className="space-y-2">
                  <Label className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-2">
                      <PackageIcon className="w-4 h-4" />
                      Descritivo de Volumes
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddVolume}
                      className="h-6 text-xs gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Adicionar
                    </Button>
                  </Label>

                  {volumes.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50 dark:bg-gray-900">
                          <TableRow>
                            <TableHead className="w-20 text-xs">Quant.</TableHead>
                            <TableHead className="text-xs">Volumes</TableHead>
                            <TableHead className="text-xs">Observações</TableHead>
                            <TableHead className="w-28 text-xs text-right">R$ Frete Un</TableHead>
                            <TableHead className="w-28 text-xs text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volumes.map((volume, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="p-2">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,00"
                                  value={volume.quantidade}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(',', '.');
                                    handleVolumeChange(idx, 'quantidade', val);
                                  }}
                                  className="h-8 text-sm w-full"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  placeholder="Ex: Caixas, Pallets..."
                                  value={volume.descricao}
                                  onChange={(e) => handleVolumeChange(idx, 'descricao', e.target.value)}
                                  className="h-8 text-sm w-full"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  placeholder="Observações..."
                                  value={volume.observacoes}
                                  onChange={(e) => handleVolumeChange(idx, 'observacoes', e.target.value)}
                                  className="h-8 text-sm w-full"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0,00"
                                  value={volume.preco_unit_frete}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(',', '.');
                                    handleVolumeChange(idx, 'preco_unit_frete', val);
                                  }}
                                  className="h-8 text-sm w-full text-right"
                                />
                              </TableCell>
                              <TableCell className="p-2 text-right text-sm font-medium">
                                {((parseFloat(volume.quantidade) || 0) * (parseFloat(volume.preco_unit_frete) || 0)).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </TableCell>
                              <TableCell className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveVolume(idx)}
                                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-gray-50 dark:bg-gray-900 font-medium">
                            <TableCell colSpan={4} className="text-right text-sm">Total Frete:</TableCell>
                            <TableCell className="text-right text-sm">
                              R$ {calcularTotalFrete().toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded dark:bg-teal-900/20 dark:border-teal-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-teal-900 dark:text-teal-200 mb-2 flex items-center gap-2">
                      <Ship className="w-5 h-5" />
                      Supermanifesto Vinculado
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-teal-700 dark:text-teal-300">Número</p>
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
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="grid grid-cols-3 gap-4">
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
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Tipo</Label>
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
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Peso (kg)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm dark:text-gray-200" 
                    value={formData.peso_total_kg} 
                    onChange={e => handleChange('peso_total_kg', parseFloat(e.target.value) || 0)} 
                  />
                </div>
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
      )}

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
    </DialogContent>
  );
}