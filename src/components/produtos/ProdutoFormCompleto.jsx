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
import { Package, DollarSign, Warehouse, Settings, Save, X, Plus } from 'lucide-react';
import TagGenerator from './TagGenerator';
import { useToast } from "@/components/ui/use-toast";
import { getTenantId } from '@/components/utils/tenant';

// Helper para validar se a imagem carrega
const validateImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

export default function ProdutoFormCompleto({ produto, onSave, onClose }) {
  const [formData, setFormData] = useState(produto ? {
    ...produto,
    tags: Array.isArray(produto.tags) ? produto.tags : [],
    unidades_alternativas: Array.isArray(produto.unidades_alternativas) ? produto.unidades_alternativas : [],
    // Ensure defaults for potentially missing fields in legacy records
    tipo: produto.tipo || 'Produto',
    valor_compra: produto.valor_compra || 0,
    preco_venda_padrao: produto.preco_venda_padrao || 0,
    preco_venda_tipo: produto.preco_venda_tipo || 'percentual',
    preco_venda_percentual: produto.preco_venda_percentual || 0,
    unidade_principal: produto.unidade_principal || 'UN',
    ativo: produto.ativo !== false
  } : {
    nome: '', descricao: '', codigo_barras: '', codigo_interno: '', tipo: 'Produto',
    categoria_id: '', categoria_nome: '', tags: [], valor_compra: 0, preco_venda_padrao: 0,
    preco_venda_tipo: 'percentual', preco_venda_percentual: 0, preco_custo_calculado: 0,
    unidade_principal: 'UN', unidades_por_pacote: 1, unidades_alternativas: [],
    estoque_atual: 0, estoque_minimo: 0, estoque_ideal: 0, estoque_maximo: 0, estoque_avariado: 0,
    tempo_reposicao_dias: 0, fornecedor_padrao_id: '', fornecedor_padrao_codigo: '',
    controla_serial: false, controla_lote_validade: false, peso_kg: 0, dimensoes_cm: '', volume_cm3: 0, ativo: true
  });

  const [custos, setCustos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadDependencies();
    if (produto?.id) {
      loadCustos();
    } else {
      setCustos([
        { descricao_custo: 'Valor de Compra', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Frete', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Imposto 1', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Imposto 2', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Desconto Comercial', valor_custo: 0, tipo_valor: 'numerico', is_negativo: true },
        { descricao_custo: 'Outros Custos', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false }
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
        { descricao_custo: 'Imposto 1', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Imposto 2', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false },
        { descricao_custo: 'Desconto Comercial', valor_custo: 0, tipo_valor: 'numerico', is_negativo: true },
        { descricao_custo: 'Outros Custos', valor_custo: 0, tipo_valor: 'numerico', is_negativo: false }
      ]);
    } else {
      setCustos(custosData);
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

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleCustoChangePercentual = (index, value) => {
    const newCustos = [...custos];
    newCustos[index].valor_custo = value === '' ? 0 : parseFloat(value);
    setCustos(newCustos);
  };

  const handleCustoChangeReais = (index, value) => {
    const newCustos = [...custos];
    newCustos[index].valor_custo = value === '' ? 0 : parseFloat(value);
    setCustos(newCustos);
  };

  const handleCustoChange = (index, field, value) => {
    const newCustos = [...custos];
    newCustos[index][field] = value;
    setCustos(newCustos);
  };



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
          .map(p => parseInt(p.codigo_interno?.split('-')[1]) || 0)
          .reduce((max, num) => Math.max(max, num), 0);
        codigoInterno = `PRD-${String(ultimoNumero + 1).padStart(5, '0')}`;
      }

      const categoria = categorias.find(c => c.id === formData.categoria_id);
      const tenantId = getTenantId();
      console.log("ProdutoFormCompleto - handleSave: tenantId obtido antes de salvar Produto:", tenantId);
      if (!tenantId) {
          toast({
              title: "Erro de Tenant",
              description: "Não foi possível identificar o ID da empresa. Por favor, recarregue a página e tente novamente.",
              variant: "destructive",
          });
          setIsSaving(false);
          return;
      }
      const produtoData = {
        ...formData, codigo_interno: codigoInterno, categoria_nome: categoria?.nome || '',
        preco_custo_calculado: precoCustoCalculado, preco_venda_padrao: precoVendaCalculado,
        valor_compra: custoBase, preco_venda_tipo: formData.preco_venda_tipo,
        empresa_id: tenantId,
        organization_id: tenantId
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
          organization_id: getTenantId(),
          empresa_id: getTenantId(),
          produto_id: produtoId, descricao_custo: c.descricao_custo,
          valor_custo: parseFloat(c.valor_custo) || 0, tipo_valor: c.tipo_valor || 'percentual',
          valor_calculado_reais: c.tipo_valor === 'percentual' 
            ? (custoBase * (parseFloat(c.valor_custo) || 0) / 100)
            : (parseFloat(c.valor_custo) || 0),
          is_negativo: c.is_negativo || false
        }));
      console.log("ProdutoFormCompleto - handleSave: Custos a serem criados (com empresa_id):", custosParaCriar);

      if (custosParaCriar.length > 0) {
        await base44.entities.CustoDetalhado.bulkCreate(custosParaCriar);
      }

      toast({
        title: "✓ Produto salvo!",
        description: `${formData.nome} foi ${produto?.id ? 'atualizado' : 'criado'} com sucesso.`,
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 3000
      });

      onSave();
      onClose();
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Mobile-First */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-3 md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-medium text-gray-700 dark:text-gray-200 truncate">
                {produto?.id ? 'Editar:' : 'Novo Produto'}
              </h2>
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                {formData.nome || 'Sem nome'}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving} className="h-8 w-8 dark:text-gray-400">
                <X className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              </Button>
              <Button size="icon" onClick={handleSave} disabled={isSaving} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 text-white h-8 w-8">
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="descritivo" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid grid-cols-4 w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex-shrink-0">
            <TabsTrigger value="descritivo" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs">
              <Package className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden sm:inline ml-1.5 text-gray-700 dark:text-gray-300">Características</span>
            </TabsTrigger>
            <TabsTrigger value="comercial" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs">
              <DollarSign className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden sm:inline ml-1.5 text-gray-700 dark:text-gray-300">Precificação</span>
            </TabsTrigger>
            <TabsTrigger value="logistico" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs">
              <Warehouse className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden sm:inline ml-1.5 text-gray-700 dark:text-gray-300">Logística</span>
            </TabsTrigger>
            <TabsTrigger value="sistema" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-2 text-xs">
              <Settings className="w-4 h-4 text-gray-700 dark:text-gray-400" />
              <span className="hidden sm:inline ml-1.5 text-gray-700 dark:text-gray-300">Sistema</span>
            </TabsTrigger>
          </TabsList>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 md:px-6 py-3 md:py-4">
          {/* ABA DESCRITIVO */}
          <TabsContent value="descritivo" className="space-y-4 mt-0">
            {/* Image Upload Section */}
            <div className="flex flex-col sm:flex-row gap-4 items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="w-24 h-24 shrink-0 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden relative group">
                {formData.imagem_url ? (
                  <img src={formData.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-300 dark:text-gray-500 text-xs text-center p-1">Sem imagem</div>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400 block">URL da Imagem</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.imagem_url || ''} 
                    onChange={e => handleChange('imagem_url', e.target.value)} 
                    placeholder="https://..." 
                    className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-8 text-xs"
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      if (!formData.nome) {
                        toast({ title: "Preencha o nome primeiro", variant: "destructive" });
                        return;
                      }
                      toast({ title: "Buscando imagem na web...", duration: 10000 });
                      try {
                        const prompt = `Encontre 3 a 5 URLs de imagens candidatas (diretas, estáticas, .jpg/.png) para o produto: "${formData.nome}" ${formData.marca ? `da marca ${formData.marca}` : ''}.
                        
                        Requisitos:
                        1. Imagens do produto isolado, fundo branco ou neutro.
                        2. URLs devem ser públicas e permitir acesso direto (evite links que expiram ou têm proteção de hotlink).
                        3. Se não encontrar a marca exata, inclua imagens genéricas de alta qualidade.
                        4. Diversifique as fontes.
                        
                        Retorne JSON no formato: { "images": ["https://url1.jpg", "https://url2.png", ...] }`;
                        
                        const response = await base44.integrations.Core.InvokeLLM({ 
                          prompt,
                          add_context_from_internet: true,
                          response_json_schema: { 
                            type: "object", 
                            properties: { 
                              images: { 
                                type: "array", 
                                items: { type: "string" } 
                              } 
                            },
                            required: ["images"]
                          }
                        });
                        
                        if (response && response.images && response.images.length > 0) {
                          let validUrl = null;
                          // Validar imagens sequencialmente
                          for (const url of response.images) {
                            const isValid = await validateImage(url);
                            if (isValid) {
                              validUrl = url;
                              break;
                            }
                          }
                          
                          if (validUrl) {
                            handleChange('imagem_url', validUrl);
                            toast({ title: "Imagem encontrada e validada!", className: "bg-green-100 text-green-800" });
                          } else {
                            throw new Error("Imagens encontradas mas bloqueadas (hotlink protection)");
                          }
                        } else {
                          throw new Error("Nenhuma imagem encontrada");
                        }
                      } catch (error) {
                        console.error(error);
                        toast({ title: "Erro ao buscar imagem: " + error.message, variant: "destructive" });
                      }
                    }}
                    className="h-8 text-xs whitespace-nowrap"
                  >
                    Buscar na Web
                  </Button>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Cole uma URL ou use a IA para gerar uma imagem automaticamente.
                </p>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Descrição do Produto *</Label>
              <Input 
                value={formData.nome} 
                onChange={e => handleChange('nome', e.target.value)} 
                placeholder="Ex: Torneira de Mesa Cromada" 
                className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm font-medium text-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Código Interno</Label>
                <Input 
                  value={formData.codigo_interno} 
                  placeholder="Automático"
                  disabled 
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-9 text-sm text-gray-500 dark:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Código de Barras</Label>
                <Input 
                  value={formData.codigo_barras} 
                  onChange={e => handleChange('codigo_barras', e.target.value)} 
                  placeholder="7891234567890" 
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Categoria</Label>
              <Select value={formData.categoria_id} onValueChange={v => handleChange('categoria_id', v)}>
                <SelectTrigger className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none h-9 text-sm text-gray-800 dark:text-gray-200">
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
              <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Fornecedor Padrão</Label>
              <Select value={formData.fornecedor_padrao_id} onValueChange={v => {
                const forn = fornecedores.find(f => f.id === v);
                handleChange('fornecedor_padrao_id', v);
                handleChange('fornecedor_padrao_codigo', forn?.codigo_interno || '');
              }}>
                <SelectTrigger className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none h-9 text-sm text-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-gray-600 dark:text-gray-400 block">Tags de Agrupamento</Label>
                <TagGenerator 
                  produtoNome={formData.nome} 
                  produtoDescricao={formData.descricao} // Assumindo que existe formData.descricao
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
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
                <Button type="button" onClick={handleAddTag} size="sm" variant="ghost" className="h-9 px-2 dark:text-gray-300">
                  <Plus className="w-4 h-4 text-gray-700 dark:text-gray-400" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} className="bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 text-xs">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-gray-900 dark:hover:text-gray-100">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ABA COMERCIAL */}
          <TabsContent value="comercial" className="space-y-4 mt-0">
            {/* KPIs - 4 CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase mb-0.5">Custo Total</div>
                <div className="text-base font-semibold text-gray-700 dark:text-gray-200">R$ {formatarNumero(precoCustoCalculado)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase mb-0.5">Preço Venda</div>
                <div className="text-base font-semibold text-gray-700 dark:text-gray-200">R$ {formatarNumero(precoVendaCalculado)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase mb-0.5">Markup</div>
                <div className="text-base font-semibold text-gray-700 dark:text-gray-200">{(Math.round((formData.preco_venda_percentual || 0) * 100) / 100).toFixed(2)}%</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-600 dark:text-gray-400 uppercase mb-0.5">Margem</div>
                <div className="text-base font-semibold text-gray-700 dark:text-gray-200">{formatarNumero(margemContribuicao)}%</div>
              </div>
            </div>

            {/* LAYOUT FLEX RESPONSIVO - Alterado para xl:flex-row para evitar aperto no mobile/tablet */}
            <div className="flex flex-col xl:flex-row gap-8">
              {/* Composição de Custos */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-3">Composição de Custos</h3>
                <div className="space-y-2">
                  {custos.map((custo, index) => {
                    const isCustoBase = custo.descricao_custo === 'Valor de Compra';
                    const valorDigitado = parseFloat(custo.valor_custo) || 0;
                    const isPercentual = custo.tipo_valor === 'percentual';

                    let valorCalculadoReais = 0;
                    if (isCustoBase) {
                      valorCalculadoReais = valorDigitado;
                    } else if (isPercentual) {
                      valorCalculadoReais = (custoBase * valorDigitado / 100);
                    } else {
                      valorCalculadoReais = valorDigitado;
                    }

                    return (
                      <div key={index} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800">
                        {/* Nome do custo */}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 w-24 flex-shrink-0">{custo.descricao_custo}</span>

                        {/* Input valor */}
                        <Input
                          type="number"
                          step="0.01"
                          value={custo.valor_custo || ''}
                          onChange={e => handleCustoChange(index, 'valor_custo', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const nextIndex = index + 1;
                              if (nextIndex < custos.length) {
                                const nextInput = document.querySelector(`[data-custo-index="${nextIndex}"]`);
                                if (nextInput) nextInput.focus();
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const prevIndex = index - 1;
                              if (prevIndex >= 0) {
                                const prevInput = document.querySelector(`[data-custo-index="${prevIndex}"]`);
                                if (prevInput) prevInput.focus();
                              }
                            }
                          }}
                          data-custo-index={index}
                          placeholder="0,00"
                          className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-7 text-xs w-20 text-right text-gray-800 dark:text-gray-200 flex-shrink-0"
                        />

                        {/* Toggle % / R$ */}
                        {!isCustoBase && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => handleCustoChange(index, 'tipo_valor', isPercentual ? 'numerico' : 'percentual')}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                              isPercentual ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white dark:bg-gray-300 transition-transform text-[8px] font-medium ${
                                isPercentual ? 'translate-x-4 text-blue-600' : 'translate-x-0.5 text-gray-600'
                              }`}
                            >
                              {isPercentual ? '%' : 'R$'}
                            </span>
                          </button>
                        )}

                        {/* Toggle Desconto/Custo */}
                        {!isCustoBase && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => handleCustoChange(index, 'is_negativo', !custo.is_negativo)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                              custo.is_negativo ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white dark:bg-gray-300 transition-transform text-[8px] font-medium ${
                                custo.is_negativo ? 'translate-x-4 text-red-600' : 'translate-x-0.5 text-green-600'
                              }`}
                            >
                              {custo.is_negativo ? '-' : '+'}
                            </span>
                          </button>
                        )}

                        {/* Resultado */}
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 ml-auto">
                          {custo.is_negativo ? '-' : ''}R$ {formatarNumero(Math.abs(valorCalculadoReais))}
                        </span>
                      </div>
                    );
                  })}

                  {/* TOTAL */}
                  <div className="flex items-center justify-between pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">CUSTO TOTAL</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">R$ {formatarNumero(precoCustoCalculado)}</span>
                  </div>
                </div>
              </div>

              {/* LINHA DIVISÓRIA */}
              <div className="hidden lg:block w-px bg-gray-200 dark:bg-gray-700 self-stretch mx-4"></div>
              <div className="lg:hidden h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

              {/* Preço de Venda */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-3">Preço de Venda</h3>

                <div className="space-y-4">
                  {/* Preço de Venda (R$) */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Preço de Venda (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.preco_venda_tipo === 'numerico' ? (formData.preco_venda_padrao || '') : (precoVendaCalculado > 0 ? precoVendaCalculado.toFixed(2) : '')}
                      onChange={e => {
                        const valorVenda = parseFloat(e.target.value) || 0;
                        handleChange('preco_venda_padrao', valorVenda);
                        handleChange('preco_venda_tipo', 'numerico');
                        if (precoCustoCalculado > 0) {
                          const markupCalc = ((valorVenda - precoCustoCalculado) / precoCustoCalculado) * 100;
                          handleChange('preco_venda_percentual', markupCalc);
                        }
                      }}
                      placeholder="0,00"
                      className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-8 text-xs text-gray-800 dark:text-gray-200"
                    />
                  </div>

                  {/* Markup % */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.preco_venda_percentual || ''}
                      onChange={e => {
                        const markup = parseFloat(e.target.value) || 0;
                        handleChange('preco_venda_percentual', markup);
                        handleChange('preco_venda_tipo', 'percentual');
                      }}
                      placeholder="0,00"
                      className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-8 text-xs text-gray-800 dark:text-gray-200"
                    />
                  </div>

                  {/* Margem de Contribuição (somente leitura) */}
                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Margem de Contribuição (%)</Label>
                    <Input
                      type="text"
                      value={formatarNumero(margemContribuicao)}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800 border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-xs text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA LOGÍSTICO */}
          <TabsContent value="logistico" className="space-y-3 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Dimensões (AxLxP cm)</Label>
                <Input 
                  value={formData.dimensoes_cm} 
                  onChange={e => handleChange('dimensoes_cm', e.target.value)} 
                  placeholder="30x20x15" 
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Volume (L)</Label>
                <Input 
                  value={formData.volume_cm3 ? formatarNumero(formData.volume_cm3 / 1000) : '0,00'}
                  disabled
                  placeholder="Calculado"
                  className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-9 text-sm text-gray-500 dark:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Peso (kg)</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  value={formData.peso_kg} 
                  onChange={e => handleChange('peso_kg', parseFloat(e.target.value) || 0)} 
                  placeholder="0,000"
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Tempo Reposição (dias)</Label>
                <Input 
                  type="number"
                  value={formData.tempo_reposicao_dias} 
                  onChange={e => handleChange('tempo_reposicao_dias', parseInt(e.target.value) || 0)} 
                  placeholder="0"
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Unidade Principal</Label>
                <Input 
                  value={formData.unidade_principal} 
                  onChange={e => handleChange('unidade_principal', e.target.value)} 
                  placeholder="UN" 
                  className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="border-t pt-3 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Níveis de Estoque</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Mínimo</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.estoque_minimo} 
                    onChange={e => handleChange('estoque_minimo', parseFloat(e.target.value) || 0)} 
                    placeholder="0,00"
                    className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Ideal</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.estoque_ideal} 
                    onChange={e => handleChange('estoque_ideal', parseFloat(e.target.value) || 0)} 
                    placeholder="0,00"
                    className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Máximo</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={formData.estoque_maximo} 
                    onChange={e => handleChange('estoque_maximo', parseFloat(e.target.value) || 0)} 
                    placeholder="0,00"
                    className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none px-0 h-9 text-sm text-gray-800 dark:text-gray-200"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Atual (sistema)</Label>
                  <Input 
                    type="number" 
                    value={formData.estoque_atual} 
                    disabled
                    className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-9 text-sm text-gray-500 dark:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA SISTEMA */}
          <TabsContent value="sistema" className="space-y-3 mt-0">
            <div>
              <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Tipo de Produto *</Label>
              <Select value={formData.tipo} onValueChange={v => handleChange('tipo', v)}>
                <SelectTrigger className="bg-transparent border-0 border-b border-gray-400 dark:border-gray-500 rounded-none h-9 text-sm text-gray-800 dark:text-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="Produto" className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">Produto (0)</SelectItem>
                  <SelectItem value="Serviço" className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">Serviço (1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 py-2">
              <Checkbox 
                checked={formData.ativo} 
                onCheckedChange={v => handleChange('ativo', v)} 
                id="ativo"
                className="dark:border-gray-500 h-4 w-4"
              />
              <Label htmlFor="ativo" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Produto Ativo</Label>
            </div>

            <div className="border-t pt-3 dark:border-gray-700">
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">Rastreabilidade</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.controla_serial}
                    onCheckedChange={v => handleChange('controla_serial', v)}
                    id="serial"
                    className="dark:border-gray-500 h-4 w-4"
                  />
                  <Label htmlFor="serial" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Controla Número de Série</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.controla_lote_validade}
                    onCheckedChange={v => handleChange('controla_lote_validade', v)}
                    id="lote"
                    className="dark:border-gray-500 h-4 w-4"
                  />
                  <Label htmlFor="lote" className="cursor-pointer text-sm text-gray-700 dark:text-gray-200">Controla Lote e Validade</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}