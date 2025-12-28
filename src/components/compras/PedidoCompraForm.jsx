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
import { X, PlusCircle, FileText, Truck, DollarSign, AlertCircle, Package, Ship, Box, MapPin, FileDown, FileUp, Download, Trash2, Calendar, Package as PackageIcon, Users } from 'lucide-react';
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
  const [supermanifesto, setSupermanifesto] = useState(null);
  const [contas, setContas] = useState([]);
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
      
      const tenantId = getTenantId();
      const [fornecedorData, produtoData, transportadoraData, contasData] = await Promise.all([
        base44.entities.Terceiro.list(),
        base44.entities.Produto.list(),
        base44.entities.Terceiro.list(),
        base44.entities.ContasFinanceiras.filter({ empresa_id: tenantId })
      ]);
      setFornecedores(fornecedorData.filter(t => t.tipo === 'Fornecedor' || t.tipo === 'Ambos'));
      setProdutos(produtoData);
      setContas(contasData);
      
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
          // 1. Criar Lançamentos Financeiros (Aguardando Aprovação Financeira)
          if (formData.forma_pagamento_compra === 'À Vista') {
            await base44.entities.LancamentoFinanceiro.create({
              tipo: 'Despesa',
              descricao: `Compra de Mercadoria - ${currentPO.numero} (À Vista)`,
              terceiro_id: formData.fornecedor_id,
              terceiro_nome: formData.fornecedor_nome,
              valor: valorTotal,
              data_vencimento: formData.data_primeiro_vencimento || format(new Date(), 'yyyy-MM-dd'),
              status: 'Aguardando Aprovação Financeira',
              categoria: 'Compra de Mercadoria',
              referencia_id: currentPO.id,
              referencia_tipo: 'PedidoCompra',
              referencia_numero: currentPO.numero,
              observacoes: `Pagamento à vista. Aguardando aprovação do financeiro.`
            });
          } else {
            // Parcelado
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
                status: 'Aguardando Aprovação Financeira',
                categoria: 'Compra de Mercadoria',
                referencia_id: currentPO.id,
                referencia_tipo: 'PedidoCompra',
                referencia_numero: currentPO.numero,
                observacoes: `Parcela ${i + 1} de ${numParcelas}. Aguardando aprovação do financeiro.`
              });
            }
          }
          
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

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200 flex-1">
            {pedido?.id ? pedido.numero : 'Novo Pedido de Compra'}
          </h1>
        </div>

        {/* MOBILE: Tabs com Ícones */}
        <Tabs defaultValue="dados-gerais" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 bg-white dark:bg-gray-900 border-0 rounded-none h-auto p-0 grid grid-cols-4 shadow-sm">
            <TabsTrigger 
              value="dados-gerais" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="itens" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <Package className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Itens</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pagamento" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Pgto</span>
            </TabsTrigger>
            <TabsTrigger 
              value="logistica" 
              className="flex flex-col items-center gap-1.5 py-3 border-0 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400"
            >
              <Ship className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">Log</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="dados-gerais" className="mt-0 px-3 py-6 space-y-6 border-0">
              {/* Número do Pedido */}
              {pedido?.numero && (
                <div className="flex items-center justify-between pb-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Número do Pedido</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pedido.numero}</span>
                </div>
              )}

              {/* Fornecedor com ícone */}
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Fornecedor *</Label>
                <div 
                  onClick={() => {
                    const modal = document.getElementById('fornecedor-selector-mobile');
                    if (modal) modal.classList.remove('hidden');
                  }}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform"
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
                className="hidden fixed inset-0 bg-black/50 z-[9999] flex items-end"
                onClick={(e) => {
                  if (e.target.id === 'fornecedor-selector-mobile') {
                    e.target.classList.add('hidden');
                  }
                }}
              >
                <div className="bg-white dark:bg-gray-900 w-full rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Selecionar Fornecedor</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    {fornecedores.map(f => (
                      <div
                        key={f.id}
                        onClick={() => {
                          handleFornecedorChange(f.id);
                          document.getElementById('fornecedor-selector-mobile').classList.add('hidden');
                        }}
                        className={`p-4 rounded-xl mb-3 flex items-center gap-3 active:scale-[0.98] transition-transform shadow-sm ${
                          formData.fornecedor_id === f.id ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Status</Label>
                  <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                      {['Rascunho', 'Enviado', 'Aguardando Recepção', 'Recebido'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Emissão</Label>
                  <Input 
                    type="date" 
                    className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                    value={formData.data_emissao} 
                    onChange={e => handleChange('data_emissao', e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Tags</Label>
                <Input 
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                  placeholder="Ex: Urgente, Reposição..."
                  value={formData.tags?.join(', ') || ''} 
                  onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Observações</Label>
                <Textarea 
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm resize-none" 
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
              />
            </TabsContent>

            <TabsContent value="pagamento" className="mt-0 px-3 py-6 space-y-6 border-0">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm border-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ao marcar como "Enviado", as contas a pagar serão criadas e enviadas para aprovação do Financeiro
                </p>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Forma de Pagamento *</Label>
                <Select value={formData.forma_pagamento_compra} onValueChange={v => handleChange('forma_pagamento_compra', v)}>
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
                />
              </div>

            </TabsContent>

            <TabsContent value="logistica" className="mt-0 px-3 py-6 space-y-6 border-0">
              {supermanifesto ? (
                <div className="p-4 bg-teal-50 rounded-xl shadow-sm border-0 dark:bg-teal-900/20">
                  <div className="space-y-3 text-sm">
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
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Transportadora</Label>
                    <Select value={formData.transportadora_embarque_id} onValueChange={v => handleChange('transportadora_embarque_id', v)}>
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                        {fornecedores.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Data de Chegada (ETA)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.eta_embarque || ''}
                      onChange={(e) => handleChange('eta_embarque', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Entrega Prevista</Label>
                    <Input 
                      type="date" 
                      className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                      value={formData.data_prevista_entrega} 
                      onChange={e => handleChange('data_prevista_entrega', e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Volumes</Label>
                      <Input 
                        type="number" 
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                        value={formData.qtd_volumes} 
                        onChange={e => handleChange('qtd_volumes', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Tipo</Label>
                      <Select value={formData.tipo_volume} onValueChange={v => handleChange('tipo_volume', v)}>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                          <SelectItem value="Caixas">Caixas</SelectItem>
                          <SelectItem value="Pallets">Pallets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-3 block">Peso (kg)</Label>
                      <Input 
                        type="number" step="0.1"
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12" 
                        value={formData.peso_total_kg} 
                        onChange={e => handleChange('peso_total_kg', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                  </div>
                </>
              )}

            </TabsContent>
          </div>

          {/* Footer fixo no mobile */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">{formData.itens.length} item(s)</span>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Total</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(valorTotal)}</span>
              </div>
            </div>
            <Button 
              onClick={handleInitiateSave} 
              disabled={isSaving || !formData.fornecedor_id || formData.itens.length === 0} 
              className="w-full bg-gray-700 hover:bg-gray-600 h-12"
            >
              {isSaving ? 'Salvando...' : 'Autenticar e Salvar'}
            </Button>
          </div>
        </Tabs>

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
              base44.entities.Produto.list().then(setProdutos);
            }
          }}
          itens={formData.itens || []}
          produtos={produtos}
        />
      </div>
    );
  }

  return (
    <DialogContent className="!max-w-[98vw] !w-[98vw] h-[95vh] p-0 overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 border-0 shadow-2xl">
      <DialogHeader className="flex-shrink-0 px-4 sm:px-6 py-4">
        <DialogTitle className="text-lg sm:text-xl font-normal text-gray-800 dark:text-gray-200">
          {pedido?.id ? `Editar: ${pedido.numero}` : 'Novo Pedido de Compra'}
        </DialogTitle>
      </DialogHeader>

      {/* DESKTOP: Tabs Originais */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="dados-gerais" className="mt-0 space-y-8">
              {/* Header Compacto - Grid Principal */}
              <div className="grid grid-cols-12 gap-x-6 gap-y-6">
                {/* Fornecedor */}
                <div className="col-span-12 lg:col-span-4">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Fornecedor *</Label>
                  <Select value={formData.fornecedor_id} onValueChange={handleFornecedorChange}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white">
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="col-span-6 lg:col-span-2">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Status</Label>
                  <Select value={formData.status} onValueChange={value => handleChange('status', value)}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                      {['Rascunho', 'Enviado', 'Aguardando Recepção', 'Recebido Parcialmente', 'Recebido', 'Cancelado'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Emissão */}
                <div className="col-span-6 lg:col-span-2">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Emissão</Label>
                  <Input 
                    type="date" 
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white" 
                    value={formData.data_emissao} 
                    onChange={e => handleChange('data_emissao', e.target.value)} 
                  />
                </div>

                {/* Tags */}
                <div className="col-span-12 lg:col-span-4">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Tags</Label>
                  <Input 
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 text-sm shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                    placeholder="Ex: Urgente, Reposição..."
                    value={formData.tags?.join(', ') || ''} 
                    onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} 
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
                  />
                </div>
              </div>

              {/* Seção de Itens */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Itens do Pedido</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAtualizarPrecos(true)} 
                      className="h-8 text-xs border-0 shadow-sm"
                      disabled={formData.itens.length === 0}
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
                        className="h-8 text-xs border-0 shadow-sm"
                      >
                        <FileUp className="h-3.5 w-3.5 mr-1.5" /> 
                        Importar CSV
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleAddItem()} 
                      className="h-8 text-xs"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> 
                      Adicionar
                    </Button>
                  </div>
                </div>

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
                                  <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar" para começar</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          formData.itens.map((item, index) => {
                            const selectedProduct = produtos.find(p => p.id === item.produto_id);
                            return (
                              <TableRow key={index} className="border-0 hover:bg-white/50 dark:hover:bg-gray-900/50 transition-colors group">
                                <TableCell className="text-center text-gray-400 font-mono text-xs sticky left-0 z-10 bg-gray-50 dark:bg-gray-800">
                                  {String(index + 1).padStart(2, '0')}
                                </TableCell>
                                <TableCell className="sticky left-[40px] z-10 bg-gray-50 dark:bg-gray-800">
                                  <Select 
                                    value={item.produto_id} 
                                    onValueChange={v => handleItemChange(index, 'produto_id', v)}
                                  >
                                    <SelectTrigger className="h-9 bg-transparent border-0 hover:bg-white dark:hover:bg-gray-900 rounded-lg px-2 text-sm shadow-none text-gray-900 dark:text-white">
                                      <span className="truncate block text-left w-full">
                                        {selectedProduct ? selectedProduct.nome : "Selecione..."}
                                      </span>
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-gray-800 border-0 shadow-lg max-h-[300px] z-[9999]">
                                      {produtos.map(p => (
                                        <SelectItem key={p.id} value={p.id} className="dark:text-gray-200 text-sm cursor-pointer">
                                          {p.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    className="h-9 text-xs font-mono bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                    value={item.codigo_produto}
                                    onChange={e => handleItemChange(index, 'codigo_produto', e.target.value)}
                                    placeholder="Código"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    className="h-9 bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                    value={item.quantidade}
                                    onChange={e => handleItemChange(index, 'quantidade', e.target.value)} 
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    className="h-9 text-xs bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-gray-900 dark:text-white" 
                                    value={item.unidade_medida}
                                    onChange={e => handleItemChange(index, 'unidade_medida', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" step="0.01"
                                    className="h-9 min-w-[90px] bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 font-medium text-gray-900 dark:text-white" 
                                    value={item.custo_unitario} 
                                    onChange={e => handleItemChange(index, 'custo_unitario', e.target.value)} 
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" step="0.01"
                                    className="h-9 min-w-[90px] bg-transparent border-0 rounded-lg px-2 hover:bg-white dark:hover:bg-gray-900 text-green-600 dark:text-green-500" 
                                    value={item.valor_desconto_item || 0} 
                                    onChange={e => handleItemChange(index, 'valor_desconto_item', e.target.value)} 
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

                {/* Totalizadores */}
                {formData.itens.length > 0 && (
                  <div className="mt-8 pt-6 space-y-4">
                    <div className="grid grid-cols-5 gap-6">
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Itens</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formData.itens.length}</div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subtotal</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(valorItens)}</div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frete</div>
                        <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">{formatCurrency(formData.valor_frete)}</div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desconto</div>
                        <div className="text-2xl font-medium text-green-600 dark:text-green-500">-{formatCurrency(formData.valor_desconto)}</div>
                      </div>
                      <div className="bg-gray-700 dark:bg-gray-800 rounded-xl p-4 shadow-sm text-right">
                        <div className="text-xs text-gray-300 mb-1">TOTAL</div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(valorTotal)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>



          {/* ABA: PAGAMENTO */}
          <TabsContent value="pagamento" className="mt-0 space-y-8">
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border-0">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Integração com Financeiro</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ao marcar como "Enviado", as contas a pagar serão criadas e encaminhadas para aprovação do setor financeiro
                  </p>
                </div>
              </div>
            </div>

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
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Valor Total</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(valorTotal)}</div>
              </div>
              {formData.forma_pagamento_compra === 'Parcelado' && (
                <>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Valor por Parcela</div>
                    <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">
                      {formatCurrency(valorTotal / (formData.num_parcelas || 1))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Parcelas</div>
                    <div className="text-2xl font-medium text-gray-800 dark:text-gray-200">
                      {formData.num_parcelas || 1}x
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ABA: LOGÍSTICA */}
          <TabsContent value="logistica" className="mt-0 space-y-8">
            {!supermanifesto ? (
              <>
                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border-0">
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
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-between">
                    <span>Transportadora</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNovaTransportadora(!showNovaTransportadora)}
                      className="h-7 text-xs gap-1 text-teal-600 hover:text-teal-700"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Nova
                    </Button>
                  </Label>
                  
                  {showNovaTransportadora ? (
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border-0 shadow-sm">
                      <Input
                        placeholder="Nome da transportadora *"
                        className="h-11"
                        value={novaTransportadora.nome}
                        onChange={(e) => setNovaTransportadora({ ...novaTransportadora, nome: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Email"
                          type="email"
                          className="h-11"
                          value={novaTransportadora.email}
                          onChange={(e) => setNovaTransportadora({ ...novaTransportadora, email: e.target.value })}
                        />
                        <Input
                          placeholder="Telefone"
                          className="h-11"
                          value={novaTransportadora.telefone}
                          onChange={(e) => setNovaTransportadora({ ...novaTransportadora, telefone: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNovaTransportadora(false);
                            setNovaTransportadora({ nome: '', email: '', telefone: '' });
                          }}
                          className="flex-1 border-0 shadow-sm"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCriarTransportadora}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 shadow-sm"
                        >
                          Criar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select value={formData.transportadora_embarque_id} onValueChange={v => handleChange('transportadora_embarque_id', v)}>
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm">
                        <SelectValue placeholder="Selecione a transportadora" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                        {fornecedores.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Data ETA */}
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Data de Chegada (ETA)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.eta_embarque || ''}
                    onChange={(e) => handleChange('eta_embarque', e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm"
                  />
                </div>

                {/* Entrega Prevista */}
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Entrega Prevista</Label>
                  <Input
                    type="date"
                    value={formData.data_prevista_entrega || ''}
                    onChange={(e) => handleChange('data_prevista_entrega', e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm"
                  />
                </div>

                {/* Descritivo de Volumes */}
                <div className="space-y-3">
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-between">
                    <span>Descritivo de Volumes</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddVolume}
                      className="h-7 text-xs gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Adicionar
                    </Button>
                  </Label>

                  {volumes.length > 0 && (
                    <div className="border-0 rounded-xl overflow-hidden shadow-sm bg-gray-50 dark:bg-gray-800">
                      <Table>
                        <TableHeader className="bg-white/80 dark:bg-gray-900/80">
                          <TableRow className="border-0">
                            <TableHead className="w-20 text-xs text-gray-700 dark:text-gray-300">Qtd</TableHead>
                            <TableHead className="text-xs text-gray-700 dark:text-gray-300">Volumes</TableHead>
                            <TableHead className="text-xs text-gray-700 dark:text-gray-300">Observações</TableHead>
                            <TableHead className="w-28 text-xs text-right text-gray-700 dark:text-gray-300">R$ Frete Un</TableHead>
                            <TableHead className="w-28 text-xs text-right text-gray-700 dark:text-gray-300">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {volumes.map((volume, idx) => (
                            <TableRow key={idx} className="border-0 hover:bg-white/50 dark:hover:bg-gray-900/50">
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
                                  className="h-9 text-sm w-full bg-transparent border-0 rounded-lg hover:bg-white dark:hover:bg-gray-900"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  placeholder="Ex: Caixas, Pallets..."
                                  value={volume.descricao}
                                  onChange={(e) => handleVolumeChange(idx, 'descricao', e.target.value)}
                                  className="h-9 text-sm w-full bg-transparent border-0 rounded-lg hover:bg-white dark:hover:bg-gray-900"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  placeholder="Observações..."
                                  value={volume.observacoes}
                                  onChange={(e) => handleVolumeChange(idx, 'observacoes', e.target.value)}
                                  className="h-9 text-sm w-full bg-transparent border-0 rounded-lg hover:bg-white dark:hover:bg-gray-900"
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
                                  className="h-9 text-sm w-full text-right bg-transparent border-0 rounded-lg hover:bg-white dark:hover:bg-gray-900"
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
                                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-white dark:bg-gray-900 font-medium border-0">
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
              <div className="p-5 bg-teal-50 dark:bg-teal-900/20 rounded-xl shadow-sm border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-teal-900 dark:text-teal-200 mb-3 flex items-center gap-2">
                      <Ship className="w-5 h-5" />
                      Supermanifesto Vinculado
                    </h4>
                    <div className="grid grid-cols-2 gap-6 text-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-4 block">Status Documental</Label>
                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.nfe_emitida || false} 
                      onChange={e => handleChange('nfe_emitida', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Nota Fiscal Emitida</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.manifesto_conferido || false} 
                      onChange={e => handleChange('manifesto_conferido', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Manifesto Conferido</span>
                  </label>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-4 block">Informações de Carga</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Volumes</Label>
                    <Input 
                      type="number" 
                      className="bg-gray-50 dark:bg-gray-800 border-0 h-10 text-sm shadow-sm" 
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
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-10 text-sm shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
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
                      className="bg-gray-50 dark:bg-gray-800 border-0 h-10 text-sm shadow-sm" 
                      value={formData.peso_total_kg} 
                      onChange={e => handleChange('peso_total_kg', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="p-4 space-y-3 border-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{formData.itens.length} item(s)</span>
            <div className="text-right">
              <span className="text-gray-600 dark:text-gray-400 text-xs block">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 border-0 shadow-sm">
              Cancelar
            </Button>
            <Button 
              onClick={handleInitiateSave} 
              disabled={isSaving || !formData.fornecedor_id || formData.itens.length === 0} 
              className="flex-1 bg-gray-700 hover:bg-gray-600 shadow-sm"
            >
              {isSaving ? 'Salvando...' : 'Autenticar e Salvar'}
            </Button>
          </div>
        </div>
      
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