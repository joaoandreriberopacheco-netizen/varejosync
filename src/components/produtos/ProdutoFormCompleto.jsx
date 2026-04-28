import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, DollarSign, Warehouse, Settings, Save, X, Plus, Upload, Loader2, ChevronRight, Truck, Box, FileText, Tag, TrendingUp, Target, History, TrendingDown, Undo2, Redo2, Copy, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useUnsavedChangesWarning } from '../utils/useUnsavedChangesWarning';
import TagGenerator from './TagGenerator';
import CurrencyInput from './CurrencyInput';
import UnidadesAlternativasEditor from './UnidadesAlternativasEditor';
import { useToast } from "@/components/ui/use-toast";
import ProdutoHistoricoEstoqueTab from '@/components/produtos/ProdutoHistoricoEstoqueTab';
import { applyUnidadesToProduto, makeUnidade, normalizeSigla } from '@/lib/productUnitsCrud';

export default function ProdutoFormCompleto({ produto, onSave, onClose, produtoSimilarBase }) {
  const normalizeAlternativas = (lista = []) => (Array.isArray(lista) ? lista : [])
    .slice(0, 5)
    .filter((u) => String(u?.unidade || '').trim())
    .map((u) => {
      const ajuste = Number(u?.ajuste_percentual) || 0;
      const fatorPreco = Number(u?.fator_preco) || 0;
      return {
        ...u,
        id: String(u?.id || '').trim() || crypto.randomUUID(),
        nome: typeof u?.nome === 'string' ? u.nome.trim() : '',
        unidade: String(u?.unidade || '').trim().toUpperCase(),
        fator_conversao: Number(u?.fator_conversao) || 1,
        fator_preco: fatorPreco > 0 ? fatorPreco : (1 + (ajuste / 100)),
      };
    });

  const gerarNomeCompleto = (data) => {
    const campos = [data.campo_hierarquico_1, data.campo_hierarquico_2, data.campo_hierarquico_3, data.campo_hierarquico_4, data.campo_hierarquico_5];
    return campos.map(c => (c || '').trim()).filter(Boolean).join(' ').trim();
  };

  const buildFormDataFromProduto = (produtoData) => ({
    ...produtoData,
    tags: Array.isArray(produtoData?.tags) ? produtoData.tags : [],
    unidades_alternativas: normalizeAlternativas(produtoData?.unidades_alternativas),
    tipo: produtoData?.tipo || 'Produto',
    valor_compra: produtoData?.valor_compra || 0,
    preco_venda_padrao: produtoData?.preco_venda_padrao || 0,
    preco_venda_tipo: produtoData?.preco_venda_tipo || 'percentual',
    preco_venda_percentual: produtoData?.preco_venda_percentual || 0,
    unidade_principal: produtoData?.unidade_principal || 'UN',
    unidade_show_comercial: produtoData?.unidade_show_comercial || '',
    unidade_show_logistica: produtoData?.unidade_show_logistica || '',
    unidade_apresentacao_default: produtoData?.unidade_apresentacao_default || '',
    unidade_comercial_id: produtoData?.unidade_comercial_id || '',
    unidade_show_ativa: typeof produtoData?.unidade_show_ativa === 'boolean' ? produtoData.unidade_show_ativa : true,
    ativo: produtoData?.ativo !== false
  });

  const [formData, setFormData] = useState(produto ? {
    ...buildFormDataFromProduto(produto)
  } : {
    campo_hierarquico_1: '', campo_hierarquico_2: '', campo_hierarquico_3: '', campo_hierarquico_4: '', campo_hierarquico_5: '',
    nome: '', codigo_barras: '', codigo_interno: '', tipo: 'Produto',
    categoria_id: '', categoria_nome: '', marca: '', tags: [], valor_compra: 0, preco_venda_padrao: 0,
    preco_venda_tipo: 'percentual', preco_venda_percentual: 0, preco_custo_calculado: 0,
    unidade_principal: 'UN', unidade_show_comercial: '', unidade_show_logistica: '', unidade_apresentacao_default: '', unidade_comercial_id: 'primary', unidade_show_ativa: true, unidades_por_pacote: 1, unidades_alternativas: [],
    estoque_atual: 0, estoque_minimo: 0, estoque_ideal: 0, estoque_maximo: 0, estoque_avariado: 0,
    tempo_reposicao_dias: 0, fornecedor_padrao_id: '', fornecedor_padrao_codigo: '',
    controla_serial: false, controla_lote: false, controla_validade: false, peso_kg: 0, dimensoes_cm: '', volume_cm3: 0, ativo: true
  });

  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [produtosSimilares, setProdutosSimilares] = useState([]);
  const [similarSearch, setSimilarSearch] = useState('');
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

  const loadDependencies = async () => {
    try {
      const [catsResponse, fornResponse, produtosResponse] = await Promise.all([
        base44.entities.Categoria.list(),
        base44.entities.Terceiro.filter({ tipo: 'Fornecedor' }),
        base44.entities.Produto.list('-updated_date')
      ]);
      setCategorias(catsResponse || []);
      setFornecedores(fornResponse || []);
      setProdutosSimilares((produtosResponse || []).filter(item => item?.id !== produto?.id));
    } catch (error) {
      console.error('Erro ao carregar dependências:', error);
    }
  };

  useEffect(() => {
    loadDependencies();
    if (produto?.id) {
      loadMovimentacoes();
    }
  }, [produto]);

  // ── Reset de formData a partir da prop `produto` ────────────────────────────
  // Mantemos `temAlteracoesNaoSalvas` em uma ref (e NAO no array de deps) para
  // que quando o save flipa o flag de volta pra `false` o efeito NAO dispare e
  // sobrescreva o estado fresco com a prop antiga (que o pai nao atualiza).
  // Esse reset legítimo só roda quando o produto editado realmente troca
  // (id ou updated_date diferentes vindos do servidor).
  const temAlteracoesRef = useRef(temAlteracoesNaoSalvas);
  useEffect(() => {
    temAlteracoesRef.current = temAlteracoesNaoSalvas;
  }, [temAlteracoesNaoSalvas]);

  useEffect(() => {
    if (!produto?.id || temAlteracoesRef.current) return;
    setFormData(buildFormDataFromProduto(produto));
  }, [produto?.id, produto?.updated_date]);

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

  // Custo calculado direto dos campos do produto
  const custoBase = parseFloat(formData.valor_compra) || 0;
  const precoCustoCalculado =
    custoBase +
    (parseFloat(formData.custo_frete_padrao) || 0) +
    (parseFloat(formData.custo_imposto1_padrao) || 0) +
    (parseFloat(formData.custo_imposto2_padrao) || 0) +
    (parseFloat(formData.custo_outros_padrao) || 0) -
    (parseFloat(formData.desconto_compra_padrao) || 0);

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
      if (field === 'unidade_show_comercial' || field === 'unidade_apresentacao_default') {
        const u = String(value || '').trim().toUpperCase();
        updated.unidade_apresentacao_default = u;
        updated.unidade_show_comercial = u;
      }
      // Auto-gerar nome ao mudar qualquer campo hierárquico
      if (field.startsWith('campo_hierarquico_')) {
        updated.nome = gerarNomeCompleto(updated);
      }
      saveToHistory(prev);
      return updated;
    });
    setTemAlteracoesNaoSalvas(true);
  };

  const unitOptions = useMemo(() => {
    const principal = String(formData.unidade_principal || 'UN').trim().toUpperCase();
    const alternativas = normalizeAlternativas(formData.unidades_alternativas || [])
      .map((u) => String(u?.unidade || '').trim().toUpperCase())
      .filter(Boolean);
    return [principal, ...alternativas.filter((u) => u !== principal)];
  }, [formData.unidade_principal, formData.unidades_alternativas]);

  const resolveUnitValue = (value, opts = {}) => {
    const principal = String(opts.unidadePrincipal || formData.unidade_principal || 'UN').trim().toUpperCase() || 'UN';
      const alternativasNormalizadas = normalizeAlternativas(opts.unidadesAlternativas || formData.unidades_alternativas || []).map((u) => ({
      unidade: String(u?.unidade || '').trim().toUpperCase(),
      rotulo: String(u?.rotulo || '').trim().toUpperCase(),
    })).filter((u) => u.unidade);
    const validSet = new Set([principal, ...alternativasNormalizadas.map((u) => u.unidade)]);
    const normalizeAlias = (raw) => String(raw || '').trim().toUpperCase()
      .replace('CAIXA', 'CX')
      .replace('CAIXAS', 'CX')
      .replace('M²', 'M2')
      .replace('METRO QUADRADO', 'M2');
    const normalized = normalizeAlias(value);
    if (!normalized) return '';
    if (validSet.has(normalized)) return normalized;
    const byRotulo = alternativasNormalizadas.find((u) => u.rotulo && normalizeAlias(u.rotulo) === normalized);
    if (byRotulo?.unidade) return byRotulo.unidade;
    return '';
  };

  useEffect(() => {
    setFormData((prev) => {
      const principal = String(prev.unidade_principal || 'UN').trim().toUpperCase();
      const alternativasNormalizadas = normalizeAlternativas(prev.unidades_alternativas || []).map((u) => ({
        id: String(u?.id || '').trim() || '',
        unidade: String(u?.unidade || '').trim().toUpperCase(),
        rotulo: String(u?.rotulo || '').trim().toUpperCase(),
      })).filter((u) => u.unidade);
      const validSet = new Set([principal, ...alternativasNormalizadas.map((u) => u.unidade)]);
      const resolverUnidadeValida = (valor) => {
        const normalizado = String(valor || '').trim().toUpperCase();
        if (!normalizado) return '';
        if (validSet.has(normalizado)) return normalizado;
        const porRotulo = alternativasNormalizadas.find((u) => u.rotulo && u.rotulo === normalizado);
        return porRotulo?.unidade || '';
      };
      const showComercial = String(prev.unidade_apresentacao_default || prev.unidade_show_comercial || '').trim().toUpperCase() || principal;
      const showComercialValido = resolverUnidadeValida(showComercial) || principal;
      const comercialId = showComercialValido === principal
        ? 'primary'
        : (alternativasNormalizadas.find((u) => u.unidade === showComercialValido)?.id || '');
      const showLogisticoValido = showComercialValido;
      if (
        prev.unidade_show_comercial === showComercialValido &&
        prev.unidade_show_logistica === showLogisticoValido &&
        prev.unidade_apresentacao_default === showComercialValido &&
        prev.unidade_comercial_id === comercialId
      ) return prev;
      return {
        ...prev,
        unidades_alternativas: normalizeAlternativas(prev.unidades_alternativas || []),
        unidade_show_comercial: showComercialValido,
        unidade_show_logistica: showLogisticoValido,
        unidade_apresentacao_default: showComercialValido,
        unidade_comercial_id: comercialId,
      };
    });
  }, [formData.unidade_principal, formData.unidades_alternativas, formData.unidade_apresentacao_default]);



  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      if (previousState.formData) {
        setFormData(previousState.formData);
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

  const applyProdutoSimilar = (produtoBase) => {
    if (!produtoBase) return;

    const nextData = {
      ...produtoBase,
      id: undefined,
      codigo_interno: '',
      codigo_barras: '',
      created_date: undefined,
      updated_date: undefined,
      created_by: undefined,
      estoque_atual: 0,
      nome: produtoBase.nome || '',
      tags: Array.isArray(produtoBase.tags) ? produtoBase.tags : [],
      unidades_alternativas: Array.isArray(produtoBase.unidades_alternativas) ? produtoBase.unidades_alternativas : [],
        unidade_show_comercial: produtoBase.unidade_show_comercial || '',
        unidade_show_logistica: produtoBase.unidade_show_logistica || '',
      unidade_apresentacao_default: produtoBase.unidade_apresentacao_default || '',
      unidade_show_ativa: typeof produtoBase.unidade_show_ativa === 'boolean' ? produtoBase.unidade_show_ativa : true,
      ativo: produtoBase.ativo !== false,
    };

    setFormData(nextData);
    setSimilarSearch(produtoBase.nome || '');
    setTemAlteracoesNaoSalvas(true);
    toast({
      title: 'Produto similar aplicado',
      description: 'Agora ajuste descrição, modelo, cor, tamanho e demais campos.',
      className: 'bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200',
    });
  };

  useEffect(() => {
    if (!produto?.id && produtoSimilarBase?.id) {
      applyProdutoSimilar(produtoSimilarBase);
    }
  }, [produtoSimilarBase?.id]);

  const produtosSimilaresFiltrados = useMemo(() => {
    const query = similarSearch.trim().toLowerCase();
    const base = [...produtosSimilares].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    if (!query) return base.slice(0, 8);
    return base.filter(item => (item.nome || '').toLowerCase().includes(query)).slice(0, 8);
  }, [produtosSimilares, similarSearch]);

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
      const nomeNormalizado = (formData.nome || '').trim().toUpperCase();
      const produtoOriginalId = produto?.id || null;
      const produtoDuplicado = produtosSimilares.find(item => item.id !== produtoOriginalId && (item.nome || '').trim().toUpperCase() === nomeNormalizado);

      if (produtoDuplicado) {
        throw new Error('Já existe um produto com a mesma descrição. Ajuste modelo, cor, tamanho ou outro campo antes de salvar.');
      }

      // Monta o array canonico `unidades[]` a partir do estado do form e valida
      // invariantes via productUnitsCrud (unica via legitima de mutacao).
      const unidadePrincipalSigla = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
      const alternativasNormalizadas = normalizeAlternativas(formData.unidades_alternativas || []);
      const comercialPreferenciaSigla = normalizeSigla(
        formData.unidade_apresentacao_default || formData.unidade_show_comercial || unidadePrincipalSigla
      ) || unidadePrincipalSigla;
      const comercialIdPreferencia = String(formData.unidade_comercial_id || '').trim();

      const principalCanonical = makeUnidade({
        id: 'principal',
        nome: 'Unidade base',
        sigla: unidadePrincipalSigla,
        fator_conversao: 1,
        fator_preco: 1,
        is_principal: true,
        is_comercial: false,
        ativo: true,
      });

      const alternativasCanonical = alternativasNormalizadas.map((u) => makeUnidade({
        id: u.id,
        nome: u.nome || u.rotulo || u.unidade,
        sigla: u.unidade,
        fator_conversao: Number(u.fator_conversao) || 1,
        fator_preco: Number(u.fator_preco) || 1,
        is_principal: false,
        is_comercial: false,
        ativo: u.ativo !== false,
      }));

      const unidadesCanonical = [principalCanonical, ...alternativasCanonical];

      let comercialAplicado = false;
      if (comercialIdPreferencia === 'primary' || comercialIdPreferencia === 'principal') {
        unidadesCanonical[0].is_comercial = true;
        comercialAplicado = true;
      } else if (comercialIdPreferencia) {
        const byId = unidadesCanonical.find((u) => u.id === comercialIdPreferencia);
        if (byId) { byId.is_comercial = true; comercialAplicado = true; }
      }
      if (!comercialAplicado) {
        const bySigla = unidadesCanonical.find((u) => normalizeSigla(u.sigla) === comercialPreferenciaSigla);
        if (bySigla) { bySigla.is_comercial = true; comercialAplicado = true; }
      }
      if (!comercialAplicado) unidadesCanonical[0].is_comercial = true;

      const applied = applyUnidadesToProduto({}, unidadesCanonical);
      if (!applied.ok) {
        throw new Error('Unidades invalidas: ' + applied.errors.join('; '));
      }

      const produtoData = {
        ...formData,
        codigo_interno: codigoInterno,
        nome: formData.nome?.toUpperCase(),
        marca: formData.marca?.toUpperCase(),
        categoria_nome: categoria?.nome?.toUpperCase() || '',
        fornecedor_padrao_codigo: formData.fornecedor_padrao_codigo?.toUpperCase(),
        unidades: applied.produto.unidades,
        unidade_principal: applied.produto.unidade_principal,
        unidade_show_comercial: applied.produto.unidade_show_comercial,
        unidade_show_logistica: applied.produto.unidade_show_comercial,
        unidade_apresentacao_default: applied.produto.unidade_apresentacao_default,
        unidade_comercial_id: applied.produto.unidade_comercial_id,
        unidades_alternativas: applied.produto.unidades_alternativas,
        unidade_show_ativa: formData.unidade_show_ativa !== false,
        preco_custo_calculado: precoCustoCalculado,
        preco_venda_padrao: precoVendaCalculado,
        valor_compra: custoBase,
        preco_venda_tipo: formData.preco_venda_tipo,
        custo_frete_padrao: parseFloat(formData.custo_frete_padrao) || 0,
        custo_imposto1_padrao: parseFloat(formData.custo_imposto1_padrao) || 0,
        custo_imposto2_padrao: parseFloat(formData.custo_imposto2_padrao) || 0,
        custo_outros_padrao: parseFloat(formData.custo_outros_padrao) || 0,
        desconto_compra_padrao: parseFloat(formData.desconto_compra_padrao) || 0,
      };

      let produtoId = produto?.id;
      if (import.meta.env?.DEV) {
        console.debug('[ProdutoFormCompleto] enviando ao backend:', {
          id: produtoId,
          unidade_principal: produtoData.unidade_principal,
          unidade_apresentacao_default: produtoData.unidade_apresentacao_default,
          unidade_show_comercial: produtoData.unidade_show_comercial,
          unidade_show_logistica: produtoData.unidade_show_logistica,
          unidade_comercial_id: produtoData.unidade_comercial_id,
          unidades_alternativas: produtoData.unidades_alternativas,
          unidades: produtoData.unidades,
        });
      }
      if (produtoId) {
        await base44.entities.Produto.update(produtoId, produtoData);
      } else {
        const novoProduto = await base44.entities.Produto.create(produtoData);
        produtoId = novoProduto.id;
      }

      // Reidrata `formData` IMEDIATAMENTE a partir do payload que acabamos de
      // enviar (verdade canonica). Isso elimina dependencia de cache / leitura
      // staleness do backend e garante feedback visual instantaneo do que foi
      // pra rede.
      setFormData(buildFormDataFromProduto({ ...produtoData, id: produtoId }));

      // Verificacao adicional: re-le do banco e checa drift contra o payload.
      // Se o backend rejeitou ou transformou algum campo, isso aparece no log
      // ao inves de silenciosamente revertir o form.
      try {
        if (produtoId) {
          const fresh = await base44.entities.Produto.get(produtoId);
          if (fresh) {
            const driftKeys = [
              'unidade_apresentacao_default',
              'unidade_show_comercial',
              'unidade_principal',
              'unidade_comercial_id',
            ];
            const drift = driftKeys.filter((k) => String(fresh[k] || '').toUpperCase() !== String(produtoData[k] || '').toUpperCase());
            if (drift.length > 0) {
              console.warn('[ProdutoFormCompleto] DRIFT pos-save (backend nao gravou ou transformou):', drift.map((k) => ({ campo: k, enviado: produtoData[k], persistido: fresh[k] })));
            } else if (import.meta.env?.DEV) {
              console.debug('[ProdutoFormCompleto] persistido OK', {
                unidade_apresentacao_default: fresh.unidade_apresentacao_default,
                unidade_principal: fresh.unidade_principal,
              });
            }
            setFormData(buildFormDataFromProduto(fresh));
          }
        }
      } catch (refetchErr) {
        console.warn('Re-fetch pos-save falhou (mantendo estado canonico):', refetchErr?.message || refetchErr);
      }

      toast({
        title: "✓ Produto salvo!",
        description: `${formData.nome} foi ${produto?.id ? 'atualizado' : 'criado'} com sucesso.`,
        className: "bg-white border border-gray-300 dark:bg-gray-800 dark:text-gray-200",
        duration: 3000
      });

      setTemAlteracoesNaoSalvas(false);
      onSave();
      if (produtoId) loadMovimentacoes();
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
              {produto?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleChange('ativo', !formData.ativo)}
                  disabled={isSaving}
                  className={`h-10 w-10 ${formData.ativo ? 'text-red-500' : 'text-green-500'}`}
                  title={formData.ativo ? 'Inativar produto' : 'Reativar produto'}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
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
            {!produto?.id && (
              <div className="rounded-3xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Produto similar</Label>
                </div>
                <Input
                  value={similarSearch}
                  onChange={(e) => setSimilarSearch(e.target.value)}
                  placeholder="Buscar produto irmão para usar como base"
                  className="h-12 rounded-2xl border-0 bg-white dark:bg-gray-900 shadow-sm text-sm text-gray-900 dark:text-white"
                />
                <div className="space-y-2">
                  {produtosSimilaresFiltrados.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyProdutoSimilar(item)}
                      className="w-full rounded-2xl bg-white dark:bg-gray-900 px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-950"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.marca || 'Sem marca'} • {item.categoria_nome || 'Sem categoria'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              {/* Composição de Custos - direto dos campos do produto */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Composição de Custos</h3>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Valor de Compra', field: 'valor_compra', icon: <Box className="w-3.5 h-3.5" />, isCurrency: true },
                    { label: 'Frete', field: 'custo_frete_padrao', icon: <Truck className="w-3.5 h-3.5" />, isCurrency: true },
                    { label: 'Imposto 1', field: 'custo_imposto1_padrao', icon: <FileText className="w-3.5 h-3.5" />, isCurrency: true },
                    { label: 'Imposto 2', field: 'custo_imposto2_padrao', icon: <FileText className="w-3.5 h-3.5" />, isCurrency: true },
                    { label: 'Outros Custos', field: 'custo_outros_padrao', icon: <Plus className="w-3.5 h-3.5" />, isCurrency: true },
                    { label: 'Desconto Comercial', field: 'desconto_compra_padrao', icon: <Tag className="w-3.5 h-3.5" />, isCurrency: true, isNegativo: true },
                  ].map(({ label, field, icon, isNegativo }) => {
                    const valor = parseFloat(formData[field]) || 0;
                    return (
                      <div key={field} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-gray-400">{icon}</span>
                          <span className="whitespace-nowrap">{label}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <CurrencyInput
                            value={formData[field] || 0}
                            onChange={val => handleChange(field, val)}
                            dataIndex={field}
                            placeholder="0,00"
                            className="bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 rounded-none px-0 h-8 text-sm w-28 text-right text-gray-800 dark:text-gray-200 focus:border-gray-500 font-glacial"
                          />
                          <span className="text-xs text-gray-400 w-8">(R$)</span>
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right tabular-nums font-glacial whitespace-nowrap">
                          {isNegativo ? '-' : ''}R$ {formatarNumero(valor)}
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
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Unidade base (fator 1)</Label>
                <Input 
                  value={formData.unidade_principal} 
                  onChange={e => handleChange('unidade_principal', e.target.value.toUpperCase())} 
                  placeholder="UN" 
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5">
              <UnidadesAlternativasEditor
                unidades={formData.unidades_alternativas || []}
                unidadePrincipal={formData.unidade_principal || 'UN'}
                onChange={(value) => handleChange('unidades_alternativas', value)}
              />
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="unidade_show_ativa"
                  checked={formData.unidade_show_ativa !== false}
                  onCheckedChange={(v) => handleChange('unidade_show_ativa', v !== false)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="unidade_show_ativa" className="text-sm text-gray-700 dark:text-gray-300">
                    Usar unidade comercial no sistema
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Quando desativado, listagens e fluxos usam só a unidade base (fator 1), sem conversão para a unidade comercial.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5">
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Unidade comercial (sigla)</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Exibida em todo o sistema (PDV, compras, relatórios). Deve ser uma das siglas da base ou das alternativas.</p>
              <Select
                value={String(
                  formData.unidade_apresentacao_default || formData.unidade_show_comercial || formData.unidade_principal || 'UN',
                ).trim().toUpperCase()}
                onValueChange={(v) => handleChange('unidade_apresentacao_default', v)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-900 border-0 shadow-sm rounded-xl max-w-md" disabled={formData.unidade_show_ativa === false}>
                  <SelectValue placeholder="Selecione a unidade comercial" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((sigla) => <SelectItem key={`com-${sigla}`} value={sigla}>{sigla}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5">
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Unidade logística</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Unificada com a unidade comercial (fonte única da verdade).
              </p>
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

          {/* ABA HISTÓRICO — extrato PDV */}
          <TabsContent value="historico" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-2 pt-2 sm:px-2">
            <ProdutoHistoricoEstoqueTab
              movimentacoes={movimentacoes}
              estoqueAtual={formData.estoque_atual}
              produto={formData}
              loading={loadingMovimentacoes}
              onRefresh={loadMovimentacoes}
            />
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