import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, DollarSign, Warehouse, Settings, Save, X, Plus, Upload, Loader2, ChevronRight, Truck, Box, FileText, Tag, TrendingUp, Target, History, TrendingDown, Undo2, Redo2 } from 'lucide-react';
import { format } from 'date-fns';
import { useUnsavedChangesWarning } from '../utils/useUnsavedChangesWarning';
import TagGenerator from './TagGenerator';
import CurrencyInput from './CurrencyInput';
import { useToast } from "@/components/ui/use-toast";

export default function ProdutoFormCompleto({ produto, onSave, onClose }) {
  const gerarNomeCompleto = (data) => {
    const campos = [data.campo_hierarquico_1, data.campo_hierarquico_2, data.campo_hierarquico_3, data.campo_hierarquico_4, data.campo_hierarquico_5];
    return campos.map(c => (c || '').trim()).filter(Boolean).join(' ').trim();
  };

  const [formData, setFormData] = useState(produto ? {
    ...produto,
    tags: Array.isArray(produto.tags) ? produto.tags : [],
    unidades_alternativas: Array.isArray(produto.unidades_alternativas) ? produto.unidades_alternativas : [],
    tipo: produto.tipo || 'Produto',
    valor_compra: produto.valor_compra || 0,
    preco_venda_padrao: produto.preco_venda_padrao || 0,
    preco_venda_tipo: produto.preco_venda_tipo || 'percentual',
    preco_venda_percentual: produto.preco_venda_percentual || 0,
    unidade_principal: produto.unidade_principal || 'UN',
    ativo: produto.ativo !== false
  } : {
    campo_hierarquico_1: '', campo_hierarquico_2: '', campo_hierarquico_3: '', campo_hierarquico_4: '', campo_hierarquico_5: '',
    nome: '', codigo_barras: '', codigo_interno: '', tipo: 'Produto',
    categoria_id: '', categoria_nome: '', marca: '', tags: [], valor_compra: 0, preco_venda_padrao: 0,
    preco_venda_tipo: 'percentual', preco_venda_percentual: 0, preco_custo_calculado: 0,
    unidade_principal: 'UN', unidades_por_pacote: 1, unidades_alternativas: [],
    estoque_atual: 0, estoque_minimo: 0, estoque_ideal: 0, estoque_maximo: 0, estoque_avariado: 0,
    tempo_reposicao_dias: 0, fornecedor_padrao_id: '', fornecedor_padrao_codigo: '',
    controla_serial: false, controla_lote: false, controla_validade: false, peso_kg: 0, dimensoes_cm: '', volume_cm3: 0, ativo: true
  });

  const [custos, setCustos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);
  const [temAlteracoesNaoSalvas, setTemAlteracoesNaoSalvas] = useState(false);
  const { toast } = useToast();
  
  // Histórico de undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useUnsavedChangesWarning(temAlteracoesNaoSalvas);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('imagem_url', file_url);
      toast({
        title: "Upload concluído",
        description: "Imagem carregada com sucesso.",
        className: "bg-green-100 text-green-800 border-green-200"
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao enviar imagem.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    loadDependencies();
    if (produto?.id) {
      loadCustos();
      loadMovimentacoes();
    } else {
      setCustos([
        { descricao_custo: 'Valor de Compra', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Frete', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Custo Adicional', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Imposto 1', valor_custo: 0, tipo_valor: 'percentual', is_negativo: false },
        { descricao_custo: 'Imposto 2', valor_custo: 0, tipo_valor: 'percentual', is_negativo: false },
        { descricao_custo: 'Desconto Comercial', valor_custo: 0, tipo_valor: 'percentual', is_negativo: true }
      ]);
    }
  }, [produto]);

  const loadDependencies = async () => {
    const [fornecedoresData, categoriasData] = await Promise.all([
      base44.entities.Terceiro.filter({ tipo: ['Fornecedor', 'Ambos'] }),
      base44.entities.Categoria.list()
    ]);
    setFornecedores(fornecedoresData);
    setCategorias(categoriasData);
  };

  const loadCustos = async () => {
    const custosData = await base44.entities.CustoDetalhado.filter({ produto_id: produto.id });
    if (custosData.length === 0) {
      setCustos([
        { descricao_custo: 'Valor de Compra', valor_custo: produto.valor_compra || 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Frete', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Custo Adicional', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Imposto 1', valor_custo: 0, tipo_valor: 'percentual', is_negativo: false },
        { descricao_custo: 'Imposto 2', valor_custo: 0, tipo_valor: 'percentual', is_negativo: false },
        { descricao_custo: 'Desconto Comercial', valor_custo: 0, tipo_valor: 'percentual', is_negativo: true }
      ]);
    } else {
      setCustos(custosData);
    }
  };

  const loadMovimentacoes = async () => {
    if (!produto?.id) return;
    
    setLoadingMovimentacoes(true);
    try {
      const movs = await base44.entities.MovimentacaoEstoque.filter({ produto_id: produto.id });
      setMovimentacoes(movs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    } finally {
      setLoadingMovimentacoes(false);
    }
  };

  useEffect(() => {
    if (formData.dimensoes_cm) {
      const parts = formData.dimensoes_cm.split('x').map(p => parseFloat(p.trim()));
      if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
        setFormData(prev => ({ ...prev, volume_cm3: parts[0] * parts[1] * parts[2] }));
      }
    }
  }, [formData.dimensoes_cm]);

  const custoBaseItem = custos.find(c => c.descricao_custo === 'Valor de Compra');
  const custoBase = parseFloat(custoBaseItem?.valor_custo) || 0;

  const precoCustoCalculado = Array.isArray(custos) ? custos.reduce((totalCusto, custo) => {
    if (!custo || typeof custo !== 'object') return totalCusto;
    const valor = parseFloat(custo.valor_custo) || 0;
    let valorConsiderado = 0;
    if (custo.descricao_custo === 'Valor de Compra') {
      valorConsiderado = valor;
    } else if (custo.tipo_valor === 'percentual') {
      valorConsiderado = (custoBase * valor / 100);
    } else {
      valorConsiderado = valor;
    }
    return custo.is_negativo ? totalCusto - valorConsiderado : totalCusto + valorConsiderado;
  }, 0) : 0;

  const precoVendaCalculado = formData.preco_venda_tipo === 'numerico'
    ? (parseFloat(formData.preco_venda_padrao) || 0)
    : precoCustoCalculado * (1 + (parseFloat(formData.preco_venda_percentual) || 0) / 100);

  const margemContribuicao = precoCustoCalculado > 0 && precoVendaCalculado > 0
    ? ((precoVendaCalculado - precoCustoCalculado) / precoVendaCalculado) * 100
    : 0;

  const saveToHistory = (newData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newData);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-gerar nome ao mudar qualquer campo hierárquico
      if (field.startsWith('campo_hierarquico_')) {
        updated.nome = gerarNomeCompleto(updated);
      }
      saveToHistory(prev);
      return updated;
    });
    setTemAlteracoesNaoSalvas(true);
  };

  const handleCustoChange = (index, field, value) => {
    saveToHistory({ formData, custos });
    const newCustos = [...custos];
    newCustos[index][field] = value;
    setCustos(newCustos);
    setTemAlteracoesNaoSalvas(true);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      if (previousState.formData) {
        setFormData(previousState.formData);
        if (previousState.custos) setCustos(previousState.custos);
      } else {
        setFormData(previousState);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      if (nextState.formData) {
        setFormData(nextState.formData);
        if (nextState.custos) setCustos(nextState.custos);
      } else {
        setFormData(nextState);
      }
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey && e.key === 'y') || e.key === 'F4') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const handleAddTag = () => {
    const currentTags = Array.isArray(formData.tags) ? formData.tags : [];
    if (tagInput.trim() && !currentTags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...currentTags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: Array.isArray(prev.tags) ? prev.tags.filter(t => t !== tag) : [] 
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let codigoInterno = formData.codigo_interno;
      if (!produto?.id && !codigoInterno) {
        const todosProdutos = await base44.entities.Produto.list();
        const ultimoNumero = todosProdutos
          .map(p => parseInt(p.codigo_interno) || 0)
          .reduce((max, num) => Math.max(max, num), 0);
        codigoInterno = String(ultimoNumero + 1).padStart(6, '0');
      }

      const categoria = categorias.find(c => c.id === formData.categoria_id);

      // Converte campos de texto para maiúsculas antes de salvar
      const produtoData = {
        ...formData,
        codigo_interno: codigoInterno,
        nome: formData.nome?.toUpperCase(),
        marca: formData.marca?.toUpperCase(),
        categoria_nome: categoria?.nome?.toUpperCase() || '',
        fornecedor_padrao_codigo: formData.fornecedor_padrao_codigo?.toUpperCase(),
        preco_custo_calculado: precoCustoCalculado,
        preco_venda_padrao: precoVendaCalculado,
        valor_compra: custoBase,
        preco_venda_tipo: formData.preco_venda_tipo
      };

      let produtoId = produto?.id;
      if (produtoId) {
        await base44.entities.Produto.update(produtoId, produtoData);
      } else {
        const novoProduto = await base44.entities.Produto.create(produtoData);
        produtoId = novoProduto.id;
      }

      if (produto?.id) {
        const custosAntigos = await base44.entities.CustoDetalhado.filter({ produto_id: produtoId });
        await Promise.all(custosAntigos.map(c => base44.entities.CustoDetalhado.delete(c.id)));
      }

      const custosParaCriar = custos
        .filter(c => c.descricao_custo)
        .map(c => ({
          produto_id: produtoId, descricao_custo: c.descricao_custo,
          valor_custo: parseFloat(c.valor_custo) || 0, tipo_valor: c.tipo_valor || 'percentual',
          valor_calculado_reais: c.tipo_valor === 'percentual' 
            ? (custoBase * (parseFloat(c.valor_custo) || 0) / 100)
            : (parseFloat(c.valor_custo) || 0),
          is_negativo: c.is_negativo || false
        }));

      if (custosParaCriar.length > 0) {
        await base44.entities.CustoDetalhado.bulkCreate(custosParaCriar);
      }

      toast({
        title: "✓ Produto salvo!",
        description: `${formData.nome} foi ${produto?.id ? 'atualizado' : 'criado'} com sucesso.`,
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 3000
      });

      setTemAlteracoesNaoSalvas(false);
      onSave();
      // onClose(); // Mantendo aberto para feedback
    } catch (error) {
      toast({ title: "Erro ao salvar produto", description: error.message, variant: "destructive", duration: 5000 });
    }
    setIsSaving(false);
  };

  const formatarNumero = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return '0,00';
    const rounded = Math.round(numero * 100) / 100;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-medium text-gray-800 dark:text-gray-200 truncate">
                {produto?.id ? 'Editar:' : 'Novo Produto'}
              </h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 truncate">
                {formData.nome || 'Sem nome'}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleUndo} 
                disabled={isSaving || historyIndex <= 0}
                className="h-10 w-10"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRedo} 
                disabled={isSaving || historyIndex >= history.length - 1}
                className="h-10 w-10"
                title="Refazer (Ctrl+Y / F4)"
              >
                <Redo2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving} className="h-10 w-10">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button size="icon" onClick={handleSave} disabled={isSaving} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 text-white h-10 w-10">
                <Save className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="descritivo" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid grid-cols-5 w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex-shrink-0">
          <TabsTrigger value="descritivo" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Características</span>
          </TabsTrigger>
          <TabsTrigger value="comercial" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Precificação</span>
          </TabsTrigger>
          <TabsTrigger value="logistico" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Warehouse className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Logística</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm" disabled={!produto?.id}>
            <History className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="sistema" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Sistema</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {/* ABA DESCRITIVO */}
          <TabsContent value="descritivo" className="space-y-6 mt-0">
            {/* Image Upload */}
            <div className="flex flex-col sm:flex-row gap-4 items-start p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="w-28 h-28 shrink-0 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {formData.imagem_url ? (
                  <img src={formData.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-300 dark:text-gray-500 text-xs text-center p-2">Sem imagem</div>
                )}
              </div>
              <div className="flex-1 w-full space-y-3">
                <Label className="text-xs text-gray-600 dark:text-gray-400 block">URL da Imagem</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.imagem_url || ''} 
                    onChange={e => handleChange('imagem_url', e.target.value)} 
                    placeholder="https://..." 
                    className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-10 text-sm"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10 px-4 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                      disabled={isUploading}
                      onClick={() => document.getElementById('image-upload').click()}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cole a URL ou faça upload de uma imagem do seu computador.
                </p>
              </div>
            </div>

            {/* Campos Hierárquicos */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Descrição Hierárquica</Label>
              </div>

              {/* Preview do nome gerado */}
              {formData.nome && (
                <div className="mb-4 px-3 py-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Preview da Descrição Completa</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 font-glacial">{formData.nome}</p>
                </div>
              )}

              {[
                { field: 'campo_hierarquico_1', label: 'Campo 1 (Produto base) *', placeholder: 'Ex: Placa Dry Wall, Cimento Portland' },
                { field: 'campo_hierarquico_2', label: 'Campo 2 (Subtipo)', placeholder: 'Ex: Standard, RU, CPIV' },
                { field: 'campo_hierarquico_3', label: 'Campo 3 (Espessura / Gramatura)', placeholder: 'Ex: 12,5mm, 50kg' },
                { field: 'campo_hierarquico_4', label: 'Campo 4 (Dimensão / Embalagem)', placeholder: 'Ex: 1200x2400mm, Saco' },
                { field: 'campo_hierarquico_5', label: 'Campo 5 (Marca / Variante)', placeholder: 'Ex: Knauf, Votorantim' },
              ].map(({ field, label, placeholder }, idx) => (
                <div key={field} className="grid grid-cols-[20px_1fr] items-center gap-3 py-1">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 text-center">{idx + 1}</span>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</Label>
                    <Input
                      value={formData[field] || ''}
                      onChange={e => handleChange(field, e.target.value)}
                      placeholder={placeholder}
                      className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200 focus:border-gray-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Marca (campo independente) */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Marca Oficial (campo independente)</Label>
              <Input
                value={formData.marca || ''}
                onChange={e => handleChange('marca', e.target.value)}
                placeholder="Ex: Knauf, Placo, Eternit"
                className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Código Interno</Label>
                <Input 
                  value={formData.codigo_interno} 
                  placeholder="Automático"
                  disabled 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm text-gray-500 dark:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Código de Barras</Label>
                <Input 
                  value={formData.codigo_barras} 
                  onChange={e => handleChange('codigo_barras', e.target.value)} 
                  placeholder="7891234567890" 
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Categoria</Label>
              <Select value={formData.categoria_id} onValueChange={v => handleChange('categoria_id', v)}>
                <SelectTrigger className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none h-10 text-sm text-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="dark:text-gray-200 dark:hover:bg-gray-700">{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Fornecedor Padrão</Label>
              <Select value={formData.fornecedor_padrao_id} onValueChange={v => {
                const forn = fornecedores.find(f => f.id === v);
                handleChange('fornecedor_padrao_id', v);
                handleChange('fornecedor_padrao_codigo', forn?.codigo_interno || '');
              }}>
                <SelectTrigger className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none h-10 text-sm text-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400 block">Tags de Agrupamento</Label>
                <TagGenerator 
                  produtoNome={formData.nome} 
                  produtoDescricao={formData.descricao}
                  onTagsGenerated={(tags) => {
                    const newTags = [...new Set([...formData.tags, ...tags])];
                    handleChange('tags', newTags);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Input 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Ex: torneira, banheiro" 
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
                <Button type="button" onClick={handleAddTag} size="sm" variant="ghost" className="h-10 px-3">
                  <Plus className="w-5 h-5 text-gray-700 dark:text-gray-400" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map(tag => (
                  <Badge key={tag} className="bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 text-sm py-1 px-3">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-2 hover:text-gray-900 dark:hover:text-gray-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ABA COMERCIAL */}
          <TabsContent value="comercial" className="mt-0">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Custo Total</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">R$ {formatarNumero(precoCustoCalculado)}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Preço Venda</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">R$ {formatarNumero(precoVendaCalculado)}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Markup</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatarNumero(formData.preco_venda_percentual || 0)}%</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Margem</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">{formatarNumero(margemContribuicao)}%</div>
              </div>
            </div>

            {/* LAYOUT GRID - Desktop: lado a lado | Mobile: empilhado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
              {/* Composição de Custos */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Composição de Custos</h3>
                </div>
                <div className="space-y-1">
                  {custos.map((custo, index) => {
                    const isCustoNumerico = ['Valor de Compra', 'Frete', 'Custo Adicional'].includes(custo.descricao_custo);
                    const isDesconto = custo.descricao_custo === 'Desconto Comercial';
                    const valorDigitado = parseFloat(custo.valor_custo) || 0;

                    let valorCalculadoReais = 0;
                    if (isCustoNumerico) {
                      valorCalculadoReais = valorDigitado;
                    } else {
                      valorCalculadoReais = (custoBase * valorDigitado / 100);
                    }

                    const getIcon = () => {
                      switch(custo.descricao_custo) {
                        case 'Valor de Compra': return <Box className="w-3.5 h-3.5" />;
                        case 'Frete': return <Truck className="w-3.5 h-3.5" />;
                        case 'Custo Adicional': return <Plus className="w-3.5 h-3.5" />;
                        case 'Imposto 1': return <FileText className="w-3.5 h-3.5" />;
                        case 'Imposto 2': return <FileText className="w-3.5 h-3.5" />;
                        case 'Desconto Comercial': return <Tag className="w-3.5 h-3.5" />;
                        default: return null;
                      }
                    };

                    return (
                      <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-gray-400">{getIcon()}</span>
                          <span className="whitespace-nowrap">{custo.descricao_custo}</span>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2">
                          {isCustoNumerico ? (
                            <>
                              <CurrencyInput
                                value={custo.valor_custo}
                                onChange={val => handleCustoChange(index, 'valor_custo', val)}
                                dataIndex={index}
                                placeholder="0,00"
                                className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-sm w-28 text-right text-gray-800 dark:text-gray-200 focus:border-gray-500 font-glacial"
                              />
                              <span className="text-xs text-gray-400 w-8">(R$)</span>
                            </>
                          ) : (
                            <>
                              <CurrencyInput
                                value={custo.valor_custo}
                                onChange={val => handleCustoChange(index, 'valor_custo', val)}
                                dataIndex={index}
                                placeholder="0,00"
                                isPercentage={true}
                                className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-sm w-20 text-right text-gray-800 dark:text-gray-200 focus:border-gray-500 font-glacial"
                              />
                              <span className="text-xs text-gray-400 w-8">%</span>
                            </>
                          )}
                        </div>

                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right tabular-nums font-glacial whitespace-nowrap">
                          {isDesconto && !isCustoNumerico ? '-' : ''}R$ {formatarNumero(isCustoNumerico ? valorCalculadoReais : Math.abs(valorCalculadoReais))}
                        </span>
                      </div>
                    );
                  })}

                  {/* TOTAL */}
                  <div className="flex items-center justify-between pt-6 mt-4 border-t-2 border-gray-300 dark:border-gray-600">
                    <span className="text-base font-bold text-gray-800 dark:text-gray-200">CUSTO TOTAL</span>
                    <span className="text-xl font-bold text-gray-800 dark:text-gray-200">R$ {formatarNumero(precoCustoCalculado)}</span>
                  </div>
                </div>
              </div>

              {/* Preço de Venda */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Preço de Venda</h3>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400"><DollarSign className="w-3.5 h-3.5" /></span>
                      <span className="whitespace-nowrap">Preço de Venda</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <CurrencyInput
                        value={formData.preco_venda_tipo === 'numerico' ? formData.preco_venda_padrao : precoVendaCalculado}
                        onChange={val => {
                          handleChange('preco_venda_padrao', val);
                          handleChange('preco_venda_tipo', 'numerico');
                          if (precoCustoCalculado > 0) {
                            const markupCalc = ((val - precoCustoCalculado) / precoCustoCalculado) * 100;
                            handleChange('preco_venda_percentual', markupCalc);
                          }
                        }}
                        dataIndex="preco_venda"
                        placeholder="0,00"
                        className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-sm w-28 text-right text-gray-800 dark:text-gray-200 focus:border-gray-500 font-glacial"
                      />
                      <span className="text-xs text-gray-400 w-8">(R$)</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right tabular-nums font-glacial whitespace-nowrap invisible">
                      R$ 0,00
                    </span>
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400"><TrendingUp className="w-3.5 h-3.5" /></span>
                      <span className="whitespace-nowrap">Markup</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <CurrencyInput
                        value={formData.preco_venda_percentual}
                        onChange={val => {
                          handleChange('preco_venda_percentual', val);
                          handleChange('preco_venda_tipo', 'percentual');
                        }}
                        dataIndex="markup"
                        placeholder="0,00"
                        isPercentage={true}
                        className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-sm w-20 text-right text-gray-800 dark:text-gray-200 focus:border-gray-500 font-glacial"
                      />
                      <span className="text-xs text-gray-400 w-8">%</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right tabular-nums font-glacial whitespace-nowrap invisible">
                      R$ 0,00
                    </span>
                  </div>

                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400"><Target className="w-3.5 h-3.5" /></span>
                      <span className="whitespace-nowrap">Margem de Contribuição</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Input
                        type="text"
                        value={formatarNumero(margemContribuicao)}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800 border-0 border-b border-gray-200 dark:border-gray-700 rounded-none px-0 h-8 text-sm w-20 text-right text-gray-500 dark:text-gray-400 tabular-nums font-glacial"
                      />
                      <span className="text-xs text-gray-400 w-8">%</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right tabular-nums font-glacial whitespace-nowrap invisible">
                      R$ 0,00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA LOGÍSTICO */}
          <TabsContent value="logistico" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Dimensões (AxLxP cm)</Label>
                <Input 
                  value={formData.dimensoes_cm} 
                  onChange={e => handleChange('dimensoes_cm', e.target.value)} 
                  placeholder="30x20x15" 
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Volume (L)</Label>
                <Input 
                  value={formData.volume_cm3 ? formatarNumero(formData.volume_cm3 / 1000) : '0,00'}
                  disabled
                  placeholder="Calculado"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm text-gray-500 dark:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Peso (kg)</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  value={formData.peso_kg} 
                  onChange={e => handleChange('peso_kg', parseFloat(e.target.value) || 0)} 
                  placeholder="0,000"
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Tempo Reposição (dias)</Label>
                <Input 
                  type="number"
                  value={formData.tempo_reposicao_dias} 
                  onChange={e => handleChange('tempo_reposicao_dias', parseInt(e.target.value) || 0)} 
                  placeholder="0"
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Unidade Principal</Label>
                <Input 
                  value={formData.unidade_principal} 
                  onChange={e => handleChange('unidade_principal', e.target.value)} 
                  placeholder="UN" 
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Níveis de Estoque</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Mínimo</Label>
                  <Input 
                    type="number" 
                    step="0.0001" 
                    value={formData.estoque_minimo} 
                    onChange={e => handleChange('estoque_minimo', parseFloat(e.target.value) || 0)} 
                    placeholder="0,0000"
                    className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Ideal</Label>
                  <Input 
                    type="number" 
                    step="0.0001" 
                    value={formData.estoque_ideal} 
                    onChange={e => handleChange('estoque_ideal', parseFloat(e.target.value) || 0)} 
                    placeholder="0,0000"
                    className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Máximo</Label>
                  <Input 
                    type="number" 
                    step="0.0001" 
                    value={formData.estoque_maximo} 
                    onChange={e => handleChange('estoque_maximo', parseFloat(e.target.value) || 0)} 
                    placeholder="0,0000"
                    className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Atual (sistema)</Label>
                  <Input 
                    type="number" 
                    value={formData.estoque_atual} 
                    disabled
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-10 text-sm text-gray-500 dark:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4 mt-0">
            {loadingMovimentacoes ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : movimentacoes.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                      <th className="text-left p-2 text-gray-600 dark:text-gray-400 font-medium">Data</th>
                      <th className="text-left p-2 text-gray-600 dark:text-gray-400 font-medium">Hora</th>
                      <th className="text-left p-2 text-gray-600 dark:text-gray-400 font-medium">Tipo</th>
                      <th className="text-left p-2 text-gray-600 dark:text-gray-400 font-medium">Comprovante</th>
                      <th className="text-right p-2 text-gray-600 dark:text-gray-400 font-medium">Qtd</th>
                      <th className="text-right p-2 text-gray-600 dark:text-gray-400 font-medium">Preço Un.</th>
                      <th className="text-right p-2 text-gray-600 dark:text-gray-400 font-medium">Total</th>
                      <th className="text-right p-2 text-gray-600 dark:text-gray-400 font-medium">Estoque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calcular evolução do estoque (do mais antigo para o mais recente)
                      const movsOrdenadas = [...movimentacoes].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                      let saldoAtual = produto?.estoque_atual || 0;
                      
                      // Calcular saldo inicial (antes de todas as movimentações)
                      let saldoInicial = saldoAtual;
                      movsOrdenadas.forEach(mov => {
                        if (mov.tipo === 'Entrada') {
                          saldoInicial -= mov.quantidade;
                        } else {
                          saldoInicial += mov.quantidade;
                        }
                      });
                      
                      // Agora calcular para cada linha
                      let saldoCorrente = saldoInicial;
                      
                      return movsOrdenadas.map((mov, idx) => {
                        const isEntrada = mov.tipo === 'Entrada';
                        const total = mov.quantidade * (mov.custo_unitario || 0);
                        
                        // Aplicar a movimentação
                        if (isEntrada) {
                          saldoCorrente += mov.quantidade;
                        } else {
                          saldoCorrente -= mov.quantidade;
                        }
                        
                        const saldoAposMovimento = saldoCorrente;
                        
                        return (
                          <tr key={mov.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-2 text-gray-700 dark:text-gray-300">
                              {format(new Date(mov.created_date), 'dd/MM/yyyy')}
                            </td>
                            <td className="p-2 text-gray-700 dark:text-gray-300">
                              {format(new Date(mov.created_date), 'HH:mm')}
                            </td>
                            <td className="p-2">
                              <Badge className={`text-[10px] ${isEntrada ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {mov.motivo}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600 dark:text-gray-400 font-mono text-[10px]">
                              {mov.documento_referencia || '-'}
                            </td>
                            <td className={`p-2 text-right font-semibold tabular-nums ${isEntrada ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {isEntrada ? '+' : '-'}{mov.quantidade}
                            </td>
                            <td className="p-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                              {mov.custo_unitario > 0 ? `R$ ${mov.custo_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className={`p-2 text-right font-semibold tabular-nums ${isEntrada ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {total > 0 ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="p-2 text-right font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                              {saldoAposMovimento}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ABA SISTEMA */}
          <TabsContent value="sistema" className="space-y-6 mt-0">
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Tipo de Produto *</Label>
              <Select value={formData.tipo} onValueChange={v => handleChange('tipo', v)}>
                <SelectTrigger className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none h-10 text-sm text-gray-800 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="Produto" className="dark:text-gray-200 dark:hover:bg-gray-700">Produto (0)</SelectItem>
                  <SelectItem value="Serviço" className="dark:text-gray-200 dark:hover:bg-gray-700">Serviço (1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 py-3">
              <Checkbox 
                checked={formData.ativo} 
                onCheckedChange={v => handleChange('ativo', v)} 
                id="ativo"
                className="dark:border-gray-500 h-5 w-5"
              />
              <Label htmlFor="ativo" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Produto Ativo</Label>
            </div>

            {/* Preço Livre e Casas Decimais */}
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Comportamento no PDV</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.preco_livre || false}
                    onCheckedChange={v => handleChange('preco_livre', v)}
                    id="preco_livre"
                    className="dark:border-gray-500 h-5 w-5"
                  />
                  <div>
                    <Label htmlFor="preco_livre" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Preço Livre</Label>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Permite ao vendedor alterar o preço unitário no PDV (respeitando o custo mínimo)</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Casas Decimais na Quantidade</Label>
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden w-fit">
                    {[0, 1, 2, 3].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleChange('casas_decimais', n)}
                        className={`w-10 h-9 text-sm font-medium transition-colors ${
                          (formData.casas_decimais ?? 0) === n
                            ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Exemplo: {(formData.casas_decimais ?? 0) === 0 ? '1, 2, 10' : (formData.casas_decimais ?? 0) === 1 ? '1,5 · 2,0' : (formData.casas_decimais ?? 0) === 2 ? '1,50 · 2,75' : '1,500 · 2,750'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Rastreabilidade</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.controla_serial}
                    onCheckedChange={v => handleChange('controla_serial', v)}
                    id="serial"
                    className="dark:border-gray-500 h-5 w-5"
                  />
                  <Label htmlFor="serial" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Controla Número de Série</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.controla_lote}
                    onCheckedChange={v => handleChange('controla_lote', v)}
                    id="lote"
                    className="dark:border-gray-500 h-5 w-5"
                  />
                  <Label htmlFor="lote" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Controla Lote</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.controla_validade}
                    onCheckedChange={v => handleChange('controla_validade', v)}
                    id="validade"
                    className="dark:border-gray-500 h-5 w-5"
                  />
                  <Label htmlFor="validade" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Controla Validade</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}