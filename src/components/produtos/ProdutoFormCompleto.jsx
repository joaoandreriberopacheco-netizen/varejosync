import { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Warehouse, Settings, Save, X, Plus, Upload, Loader2, ChevronRight, Truck, Box, FileText, Tag, TrendingUp, Target, History, Undo2, Redo2, Copy, Trash2, Package } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useUnsavedChangesWarning } from '../utils/useUnsavedChangesWarning';
import TagGenerator from './TagGenerator';
import CurrencyInput from './CurrencyInput';
import UnidadesAlternativasEditor from './UnidadesAlternativasEditor';
import { useToast } from "@/components/ui/use-toast";
import ProdutoHistoricoEstoqueTab from '@/components/produtos/ProdutoHistoricoEstoqueTab';
import { applyUnidadesToProduto, makeUnidade, normalizeSigla, tryLegacyMirrorFromCanonicalUnidades } from '@/lib/productUnitsCrud';
import { resolvePrimaryFromFactorOne, resolveCommercialUnit, resolveCommercialDisplay } from '@/lib/productUnits';

/** Id estável para linhas legadas sem `id` (evita novo UUID a cada render / reabrir formulário). */
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return (h >>> 0).toString(36);
}

function syntheticAlternativaId(row) {
  const sig = normalizeSigla(row?.unidade) || '';
  const rot = String(row?.rotulo || '').trim();
  const nome = String(row?.nome || '').trim();
  const fator = String(Number(row?.fator_conversao) || '');
  const body = [sig, rot, nome, fator].join('\u0001');
  if (!body.replace(/\u0001/g, '')) {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `alt-${Date.now().toString(36)}`;
  }
  return `alt-${hashString(body)}`;
}

export default function ProdutoFormCompleto({ produto, onSave, onClose, produtoSimilarBase }) {
  const normalizeAlternativas = (lista = []) => (Array.isArray(lista) ? lista : [])
    .slice(0, 5)
    .filter((u) => String(u?.unidade || '').trim())
    .map((u) => {
      const ajuste = Number(u?.ajuste_percentual) || 0;
      const fatorPreco = Number(u?.fator_preco) || 0;
      const siglaCanon = normalizeSigla(u?.unidade) || String(u?.unidade || '').trim().toUpperCase();
      const idExistente = String(u?.id || '').trim();
      return {
        ...u,
        id: idExistente || syntheticAlternativaId({ ...u, unidade: siglaCanon }),
        nome: typeof u?.nome === 'string' ? u.nome.trim() : '',
        unidade: siglaCanon,
        fator_conversao: Number(u?.fator_conversao) || 1,
        fator_preco: fatorPreco > 0 ? fatorPreco : (1 + (ajuste / 100)),
      };
    });

  const gerarNomeCompleto = (data) => {
    const campos = [data.campo_hierarquico_1, data.campo_hierarquico_2, data.campo_hierarquico_3, data.campo_hierarquico_4, data.campo_hierarquico_5];
    return campos.map(c => (c || '').trim()).filter(Boolean).join(' ').trim();
  };

  const buildFormDataFromProduto = (produtoData) => {
    const normalizedAlts = normalizeAlternativas(produtoData?.unidades_alternativas);
    const principalFinal = normalizeSigla(produtoData?.unidade_principal) || 'UN';
    const canonLegacy = tryLegacyMirrorFromCanonicalUnidades(produtoData?.unidades);

    let apresentacao = normalizeSigla(produtoData?.unidade_apresentacao_default) || '';
    let showComercial = normalizeSigla(produtoData?.unidade_show_comercial) || '';
    let showLogistica = normalizeSigla(produtoData?.unidade_show_logistica) || '';
    let comercialId = String(produtoData?.unidade_comercial_id ?? '').trim();

    // Só preenche lacunas a partir de `unidades[]`: não sobrescrever colunas legadas já
    // preenchidas — a lista do Base44 por vezes devolve `unidades` com `is_comercial`
    // desatualizado e isso revertia a vitrine ao reidratar o form.
    if (canonLegacy) {
      const ca = normalizeSigla(canonLegacy.unidade_apresentacao_default);
      const cs = normalizeSigla(canonLegacy.unidade_show_comercial);
      const cl = normalizeSigla(canonLegacy.unidade_show_logistica);
      const cc = String(canonLegacy.unidade_comercial_id ?? '').trim();
      if (!apresentacao && ca) apresentacao = ca;
      if (!showComercial && cs) showComercial = cs;
      if (!showLogistica && cl) showLogistica = cl;
      if (!comercialId && cc) comercialId = cc;
    }

    const comIdNorm = comercialId;
    if (comIdNorm && comIdNorm !== 'primary' && comIdNorm !== 'principal') {
      const row = normalizedAlts.find((u) => String(u?.id || '').trim() === comIdNorm);
      if (row?.unidade) {
        const u = normalizeSigla(row.unidade) || String(row.unidade || '').trim().toUpperCase();
        apresentacao = u;
        showComercial = u;
        if (!showLogistica) showLogistica = u;
      }
    }

    if (!apresentacao && !showComercial && (comIdNorm === 'primary' || comIdNorm === 'principal' || !comIdNorm)) {
      apresentacao = principalFinal;
      showComercial = principalFinal;
      if (!showLogistica) showLogistica = principalFinal;
      comercialId = 'primary';
    }

    const siglaComercialFinal = apresentacao || showComercial || principalFinal;
    const logisticaFinal = showLogistica || siglaComercialFinal;

    if (!comercialId || comercialId === 'principal') {
      if (siglaComercialFinal === principalFinal) {
        comercialId = 'primary';
      } else {
        const altMatch = normalizedAlts.find((u) => normalizeSigla(u?.unidade) === siglaComercialFinal);
        comercialId = altMatch?.id ? String(altMatch.id).trim() : '';
      }
    }

    return {
      ...produtoData,
      tags: Array.isArray(produtoData?.tags) ? produtoData.tags : [],
      unidades_alternativas: normalizedAlts,
      tipo: produtoData?.tipo || 'Produto',
      valor_compra: produtoData?.valor_compra || 0,
      preco_venda_padrao: produtoData?.preco_venda_padrao || 0,
      preco_venda_tipo: produtoData?.preco_venda_tipo || 'percentual',
      preco_venda_percentual: produtoData?.preco_venda_percentual || 0,
      unidade_principal: principalFinal,
      unidade_show_comercial: showComercial || siglaComercialFinal,
      unidade_show_logistica: logisticaFinal,
      unidade_apresentacao_default: apresentacao || siglaComercialFinal,
      unidade_comercial_id: comercialId,
      unidade_show_ativa: typeof produtoData?.unidade_show_ativa === 'boolean' ? produtoData.unidade_show_ativa : true,
      ativo: produtoData?.ativo !== false,
    };
  };

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

  /** Uma única atualização: siglas de vitrine + `unidade_comercial_id` coerente (primary vs id da linha). */
  const applyCommercialUnitSelection = (siglaOuRotuloRaw) => {
    setFormData((prev) => {
      const principal = normalizeSigla(prev.unidade_principal || 'UN') || 'UN';
      const alts = normalizeAlternativas(prev.unidades_alternativas || []);
      const validSet = new Set([principal, ...alts.map((a) => normalizeSigla(a.unidade)).filter(Boolean)]);

      const resolverUnidadeValida = (valor) => {
        const normalizado = normalizeSigla(valor) || String(valor || '').trim().toUpperCase();
        if (!normalizado) return '';
        if (validSet.has(normalizado)) return normalizado;
        const valorRotulo = String(valor || '').trim().toUpperCase();
        const porRotulo = alts.find((u) => u.rotulo && String(u.rotulo).trim().toUpperCase() === valorRotulo);
        return normalizeSigla(porRotulo?.unidade) || '';
      };

      let siglaFinal = resolverUnidadeValida(siglaOuRotuloRaw);
      if (!siglaFinal) siglaFinal = principal;

      let comercialId = 'primary';
      if (siglaFinal !== principal) {
        const candidates = alts.filter((u) => normalizeSigla(u.unidade) === siglaFinal);
        const prevCid = String(prev.unidade_comercial_id || '').trim();
        const matchPrev = candidates.find((c) => String(c.id || '').trim() === prevCid);
        const chosen = matchPrev || candidates[0];
        comercialId = chosen?.id ? String(chosen.id).trim() : 'primary';
      }

      const updated = {
        ...prev,
        unidade_apresentacao_default: siglaFinal,
        unidade_show_comercial: siglaFinal,
        unidade_show_logistica: siglaFinal,
        unidade_comercial_id: comercialId,
      };
      saveToHistory(prev);
      return updated;
    });
    setTemAlteracoesNaoSalvas(true);
  };

  const handleChange = (field, value) => {
    if (field === 'unidade_show_comercial' || field === 'unidade_apresentacao_default') {
      applyCommercialUnitSelection(value);
      return;
    }
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'unidade_principal') {
        updated.unidade_principal = normalizeSigla(value) || String(value || '').trim().toUpperCase() || 'UN';
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
    const principal = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
    const alternativas = normalizeAlternativas(formData.unidades_alternativas || [])
      .map((u) => normalizeSigla(u?.unidade) || '')
      .filter(Boolean);
    return [principal, ...alternativas.filter((u) => u !== principal)];
  }, [formData.unidade_principal, formData.unidades_alternativas]);

  /** Evita valor controlado fora da lista (Radix): prioriza `unidade_comercial_id` → sigla da linha; não faz fallback silencioso para principal. */
  const comercialSelectValue = useMemo(() => {
    const principal = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
    const cid = String(formData.unidade_comercial_id || '').trim();
    const rows = normalizeAlternativas(formData.unidades_alternativas || []);

    if (cid && cid !== 'primary' && cid !== 'principal') {
      const row = rows.find((u) => String(u?.id || '').trim() === cid);
      const fromId = normalizeSigla(row?.unidade) || '';
      if (fromId) return fromId;
    }

    const raw =
      normalizeSigla(
        formData.unidade_apresentacao_default ||
          formData.unidade_show_comercial ||
          principal,
      ) || principal;
    return raw;
  }, [
    formData.unidade_principal,
    formData.unidade_apresentacao_default,
    formData.unidade_show_comercial,
    formData.unidade_comercial_id,
    formData.unidades_alternativas,
  ]);

  /** Inclui sigla atual se ainda não estiver na lista (ex.: referência órfã / transição). */
  const commercialSelectOptions = useMemo(() => {
    const base = [...unitOptions];
    if (comercialSelectValue && !base.includes(comercialSelectValue)) base.push(comercialSelectValue);
    return base;
  }, [unitOptions, comercialSelectValue]);

  /** Vitrine na unidade base (interruptor ao lado da sigla principal). */
  const catalogoNaBase = useMemo(() => {
    const principal = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
    const cid = String(formData.unidade_comercial_id || '').trim();
    const siglaOk = comercialSelectValue === principal;
    const idOk = cid === 'primary' || cid === 'principal' || cid === '';
    return siglaOk && idOk;
  }, [formData.unidade_principal, formData.unidade_comercial_id, comercialSelectValue]);

  const commercialSelectWarning = useMemo(() => {
    const cid = String(formData.unidade_comercial_id || '').trim();
    if (!cid || cid === 'primary' || cid === 'principal') {
      if (comercialSelectValue && !unitOptions.includes(comercialSelectValue)) {
        return `A sigla “${comercialSelectValue}” não está nas embalagens com sigla preenchida. Confira “Outras embalagens” ou escolha outra opção.`;
      }
      return '';
    }
    const raw = formData.unidades_alternativas || [];
    const exists = raw.some((u) => String(u?.id || '').trim() === cid);
    if (!exists) {
      return 'A unidade de vitrine aponta para uma linha que não existe mais. Escolha de novo no menu abaixo.';
    }
    if (comercialSelectValue && !unitOptions.includes(comercialSelectValue)) {
      return `A sigla “${comercialSelectValue}” não está nas opções usuais; confira embalagens ou salve após corrigir.`;
    }
    return '';
  }, [
    formData.unidade_comercial_id,
    formData.unidades_alternativas,
    comercialSelectValue,
    unitOptions,
  ]);

  /** Só id/sigla/rótulo: evita re-disparar o efeito de correção a cada mudança de fator/preço (combativo com o editor). */
  const unidadesAlternativasLayoutKey = useMemo(
    () =>
      (formData.unidades_alternativas || [])
        .map((u) =>
          [
            String(u?.id || '').trim(),
            normalizeSigla(u?.unidade) || String(u?.unidade || '').trim().toUpperCase(),
            String(u?.rotulo || '').trim().toUpperCase(),
          ].join(':'),
        )
        .join('|'),
    [formData.unidades_alternativas],
  );

  /** Corrige só inconsistências reais (sigla inválida, id órfão, mudança de base/alternativas) — não substitui escolha válida por “primeira linha com a mesma sigla”. */
  useEffect(() => {
    setFormData((prev) => {
      const principal = normalizeSigla(prev.unidade_principal || 'UN') || 'UN';
      const rawAlts = Array.isArray(prev.unidades_alternativas) ? prev.unidades_alternativas : [];
      const alternativasNormalizadas = normalizeAlternativas(rawAlts);
      const meta = alternativasNormalizadas
        .map((u) => ({
          id: String(u?.id || '').trim(),
          unidade: normalizeSigla(u?.unidade) || '',
          rotulo: String(u?.rotulo || '').trim().toUpperCase(),
        }))
        .filter((u) => u.unidade);

      const validSet = new Set([principal, ...meta.map((u) => u.unidade)]);

      const resolverUnidadeValida = (valor) => {
        const normalizado = normalizeSigla(valor) || String(valor || '').trim().toUpperCase();
        if (!normalizado) return '';
        if (validSet.has(normalizado)) return normalizado;
        const valorRotulo = String(valor || '').trim().toUpperCase();
        const porRotulo = meta.find((x) => x.rotulo && x.rotulo === valorRotulo);
        return porRotulo?.unidade || '';
      };

      const cid = String(prev.unidade_comercial_id || '').trim();
      let idResolvedSigla = '';
      if (cid && cid !== 'primary' && cid !== 'principal') {
        const metaRow = meta.find((u) => u.id === cid);
        idResolvedSigla = metaRow?.unidade || '';
      }

      const fromFields = normalizeSigla(prev.unidade_apresentacao_default || prev.unidade_show_comercial) || '';
      const fieldResolved = resolverUnidadeValida(fromFields);

      let showComercialValido = fieldResolved || resolverUnidadeValida(idResolvedSigla) || principal;
      if (!validSet.has(showComercialValido)) showComercialValido = principal;

      let comercialId = 'primary';
      if (showComercialValido === principal) {
        comercialId = 'primary';
      } else {
        const candidates = meta.filter((u) => u.unidade === showComercialValido);
        if (cid && cid !== 'primary' && cid !== 'principal') {
          const still = candidates.find((c) => c.id === cid);
          if (still) comercialId = cid;
          else if (candidates.length) comercialId = candidates[0].id;
          else comercialId = 'primary';
        } else if (candidates.length) {
          comercialId = candidates[0].id;
        } else {
          comercialId = 'primary';
        }
      }

      if (cid && cid !== 'primary' && cid !== 'principal' && !rawAlts.some((u) => String(u?.id || '').trim() === cid)) {
        comercialId = showComercialValido === principal ? 'primary' : (meta.find((u) => u.unidade === showComercialValido)?.id || 'primary');
      }

      const showLogisticoValido = showComercialValido;

      if (
        prev.unidade_show_comercial === showComercialValido &&
        prev.unidade_show_logistica === showLogisticoValido &&
        prev.unidade_apresentacao_default === showComercialValido &&
        String(prev.unidade_comercial_id || '').trim() === String(comercialId)
      ) {
        return prev;
      }

      return {
        ...prev,
        unidade_show_comercial: showComercialValido,
        unidade_show_logistica: showLogisticoValido,
        unidade_apresentacao_default: showComercialValido,
        unidade_comercial_id: comercialId,
      };
    });
  }, [formData.unidade_principal, unidadesAlternativasLayoutKey]);



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

    const patch = {
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
    };

    setFormData(buildFormDataFromProduto(patch));
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

  const toastSaveBlocked = (title, description) => {
    toast({
      variant: 'destructive',
      title,
      description,
      duration: 8000,
    });
  };

  const describeSaveError = (error) => {
    if (error == null) return 'Erro desconhecido ao salvar. Tente novamente.';
    if (typeof error === 'string' && error.trim()) return error.trim();
    const msg = error?.message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    return 'Erro desconhecido ao salvar. Tente novamente ou verifique sua conexão.';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let codigoInterno = formData.codigo_interno;
      if (!produto?.id && !codigoInterno) {
        try {
          const todosProdutos = await base44.entities.Produto.list();
          const ultimoNumero = (todosProdutos || [])
            .map(p => parseInt(p.codigo_interno, 10) || 0)
            .reduce((max, num) => Math.max(max, num), 0);
          codigoInterno = String(ultimoNumero + 1).padStart(6, '0');
        } catch (listErr) {
          console.error('[ProdutoFormCompleto] Falha ao listar produtos para código interno:', listErr);
          toastSaveBlocked(
            'Não foi possível gerar o código interno',
            describeSaveError(listErr) + ' Verifique a conexão e tente de novo.',
          );
          return;
        }
      }

      const categoria = categorias.find(c => c.id === formData.categoria_id);
      const nomeNormalizado = (formData.nome || '').trim().toUpperCase();
      const produtoOriginalId = produto?.id || null;
      const produtoDuplicado = produtosSimilares.find(item => item.id !== produtoOriginalId && (item.nome || '').trim().toUpperCase() === nomeNormalizado);

      if (produtoDuplicado) {
        toastSaveBlocked(
          'Descrição já cadastrada',
          'Já existe um produto com a mesma descrição. Ajuste modelo, cor, tamanho ou outro campo hierárquico antes de salvar.',
        );
        return;
      }

      // Monta o array canonico `unidades[]` a partir do estado do form e valida
      // invariantes via productUnitsCrud (unica via legitima de mutacao).
      const unidadePrincipalSigla = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
      const alternativasNormalizadas = normalizeAlternativas(formData.unidades_alternativas || []);
      const alternativasMeta = alternativasNormalizadas
        .map((u) => ({
          id: String(u?.id || '').trim(),
          unidade: normalizeSigla(u?.unidade) || '',
          rotulo: String(u?.rotulo || '').trim().toUpperCase(),
        }))
        .filter((u) => u.unidade);
      const validSiglaSet = new Set([unidadePrincipalSigla, ...alternativasMeta.map((u) => u.unidade)]);
      const resolverComercialPreferencia = (valor) => {
        const normalizado = normalizeSigla(valor) || String(valor || '').trim().toUpperCase();
        if (normalizado && validSiglaSet.has(normalizado)) return normalizado;
        const valorRotulo = String(valor || '').trim().toUpperCase();
        const porRotulo = alternativasMeta.find((u) => u.rotulo && u.rotulo === valorRotulo);
        if (porRotulo?.unidade && validSiglaSet.has(porRotulo.unidade)) return porRotulo.unidade;
        return '';
      };
      const comercialPreferenciaSiglaRaw =
        formData.unidade_apresentacao_default || formData.unidade_show_comercial || unidadePrincipalSigla;
      const comercialPreferenciaSigla =
        resolverComercialPreferencia(comercialPreferenciaSiglaRaw) || unidadePrincipalSigla;
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

      const alternativasCanonical = alternativasNormalizadas.map((u) => {
        const payload = {
          id: u.id,
          nome: u.nome || u.rotulo || u.unidade,
          sigla: u.unidade,
          fator_conversao: Number(u.fator_conversao) || 1,
          fator_preco: Number(u.fator_preco) || 1,
          ajuste_percentual: Number(u.ajuste_percentual) || 0,
          preco_venda: Number(u.preco_venda) || 0,
          is_principal: false,
          is_comercial: false,
          ativo: u.ativo !== false,
        };
        if (
          Object.prototype.hasOwnProperty.call(u, "percentual_preco_vs_principal") &&
          u.percentual_preco_vs_principal != null &&
          u.percentual_preco_vs_principal !== ""
        ) {
          payload.percentual_preco_vs_principal = Number(u.percentual_preco_vs_principal) || 0;
        }
        return makeUnidade(payload);
      });

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
      if (!comercialAplicado && comercialPreferenciaSigla && comercialPreferenciaSigla !== unidadePrincipalSigla) {
        toastSaveBlocked(
          'Unidade de vitrine não reconhecida',
          'A unidade de vitrine precisa ser a sigla da base (UN, M2, KG…) ou de uma linha ativa em "Outras embalagens". Inclua a sigla correspondente, confira se a linha não está inativa ou use o mesmo rótulo cadastrado na alternativa.',
        );
        return;
      }
      if (!comercialAplicado) unidadesCanonical[0].is_comercial = true;

      const applied = applyUnidadesToProduto({}, unidadesCanonical);
      if (!applied.ok) {
        toastSaveBlocked(
          'Validação de unidades',
          (applied.errors || []).filter(Boolean).join(' · ') || 'Revise unidades base, alternativas e vitrine antes de salvar.',
        );
        return;
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
      try {
        if (produtoId) {
          await base44.entities.Produto.update(produtoId, produtoData);
        } else {
          const novoProduto = await base44.entities.Produto.create(produtoData);
          produtoId = novoProduto?.id;
          if (!produtoId) {
            toastSaveBlocked(
              'Resposta inválida do servidor',
              'O cadastro não devolveu o id do novo produto. Atualize a lista e confira se o item foi criado.',
            );
            return;
          }
        }
      } catch (apiErr) {
        console.error('[ProdutoFormCompleto] Falha create/update Produto:', apiErr);
        toastSaveBlocked(
          'Falha ao gravar no servidor',
          describeSaveError(apiErr),
        );
        return;
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
            if (import.meta.env?.DEV) {
              console.debug('[ProdutoFormCompleto] GET pós-save — vitrine (servidor):', {
                unidade_apresentacao_default: fresh.unidade_apresentacao_default,
                unidade_show_comercial: fresh.unidade_show_comercial,
                unidade_show_logistica: fresh.unidade_show_logistica,
                unidade_comercial_id: fresh.unidade_comercial_id,
                unidade_show_ativa: fresh.unidade_show_ativa,
              });
            }
            const driftSigKeys = [
              'unidade_apresentacao_default',
              'unidade_show_comercial',
              'unidade_principal',
              'unidade_show_logistica',
            ];
            const UNIT_SNAPSHOT_KEYS = [
              'unidades',
              'unidade_principal',
              'unidades_alternativas',
              'unidade_apresentacao_default',
              'unidade_show_comercial',
              'unidade_show_logistica',
              'unidade_comercial_id',
              'unidade_show_ativa',
            ];
            const drift = driftSigKeys.filter(
              (k) => normalizeSigla(fresh[k]) !== normalizeSigla(produtoData[k]),
            );
            const idDrift = String(fresh.unidade_comercial_id || '') !== String(produtoData.unidade_comercial_id || '');
            if (drift.length > 0 || idDrift) {
              console.warn('[ProdutoFormCompleto] DRIFT pos-save (backend nao gravou ou transformou):', {
                drift,
                idDrift,
                enviado: {
                  unidade_apresentacao_default: produtoData.unidade_apresentacao_default,
                  unidade_show_comercial: produtoData.unidade_show_comercial,
                  unidade_principal: produtoData.unidade_principal,
                  unidade_comercial_id: produtoData.unidade_comercial_id,
                },
                persistido: {
                  unidade_apresentacao_default: fresh.unidade_apresentacao_default,
                  unidade_show_comercial: fresh.unidade_show_comercial,
                  unidade_principal: fresh.unidade_principal,
                  unidade_comercial_id: fresh.unidade_comercial_id,
                },
              });
              toast({
                title: 'Embalagens: resposta diferente do enviado',
                description:
                  'O servidor devolveu outra combinação de unidade de vitrine. A tela mantém o pacote que você acabou de gravar; confira o cadastro no painel se isto se repetir.',
                duration: 9000,
                className: 'bg-amber-50 text-amber-950 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-50 dark:border-amber-800',
              });
            } else if (import.meta.env?.DEV) {
              console.debug('[ProdutoFormCompleto] persistido OK', {
                unidade_apresentacao_default: fresh.unidade_apresentacao_default,
                unidade_principal: fresh.unidade_principal,
              });
            }
            // Base44 pode omitir ou atrasar campos espelho no GET; mesclar o pacote enviado evita regressão visual.
            const unitOverlay = UNIT_SNAPSHOT_KEYS.reduce((acc, key) => {
              if (produtoData[key] !== undefined) acc[key] = produtoData[key];
              return acc;
            }, {});
            setFormData(buildFormDataFromProduto({ ...fresh, ...unitOverlay }));
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
      const unitSnapshot = produtoId
        ? {
            id: produtoId,
            unidade_apresentacao_default: produtoData.unidade_apresentacao_default,
            unidade_show_comercial: produtoData.unidade_show_comercial,
            unidade_show_logistica: produtoData.unidade_show_logistica,
            unidade_comercial_id: produtoData.unidade_comercial_id,
            unidade_show_ativa: produtoData.unidade_show_ativa,
            unidades: produtoData.unidades,
            unidades_alternativas: produtoData.unidades_alternativas,
            unidade_principal: produtoData.unidade_principal,
          }
        : null;
      await Promise.resolve(onSave?.(unitSnapshot));
      if (produtoId) loadMovimentacoes();
      // onClose(); // Mantendo aberto para feedback
    } catch (error) {
      console.error('[ProdutoFormCompleto] Erro inesperado no salvamento:', error);
      toastSaveBlocked('Não foi possível salvar', describeSaveError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const formatarNumero = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return '0,00';
    const rounded = Math.round(numero * 100) / 100;
    return rounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const catalogUnitsPreview = useMemo(() => {
    const snapshot = {
      unidade_principal: formData.unidade_principal,
      unidades_alternativas: (formData.unidades_alternativas || []).map((u) => ({ ...u, ativo: u.ativo !== false })),
      unidade_apresentacao_default: formData.unidade_apresentacao_default,
      unidade_show_comercial: formData.unidade_show_comercial,
      unidade_show_ativa: formData.unidade_show_ativa,
      unidade_comercial_id: formData.unidade_comercial_id,
      estoque_atual: formData.estoque_atual,
    };
    const base = resolvePrimaryFromFactorOne(snapshot, formData.unidade_principal || 'UN');
    const comercial = resolveCommercialUnit(snapshot, base);
    const estoqueBase = Number(formData.estoque_atual) || 0;
    const display = resolveCommercialDisplay(snapshot, estoqueBase, base);
    return { base, comercial, display };
  }, [
    formData.unidade_principal,
    formData.unidades_alternativas,
    formData.unidade_apresentacao_default,
    formData.unidade_show_comercial,
    formData.unidade_show_ativa,
    formData.unidade_comercial_id,
    formData.estoque_atual,
  ]);

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
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
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

      <Tabs defaultValue="descritivo" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid grid-cols-5 w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 flex-shrink-0">
          <TabsTrigger value="descritivo" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Package className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Identificação</span>
          </TabsTrigger>
          <TabsTrigger value="comercial" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Precificação</span>
          </TabsTrigger>
          <TabsTrigger value="logistico" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Warehouse className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Embalagens e logística</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm" disabled={!produto?.id}>
            <History className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="sistema" className="border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-3 text-xs md:text-sm">
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-400" />
            <span className="hidden sm:inline ml-2 text-gray-700 dark:text-gray-300">Avançado</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {/* ABA IDENTIFICAÇÃO — `descritivo` no estado interno das abas */}
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
                  placeholder="Gerado ao salvar"
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
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Categoria (opcional)</Label>
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
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Fornecedor padrão (opcional)</Label>
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

          {/* ABA COMERCIAL — KPIs primeiro, como no A29 */}
          <TabsContent value="comercial" className="mt-0">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Custo Total</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">R$ {formatarNumero(precoCustoCalculado)}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Preço de venda</div>
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

              {/* Preço de venda */}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Preço de venda</h3>
                </div>

                <div className="space-y-1">
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400"><DollarSign className="w-3.5 h-3.5" /></span>
                      <span className="whitespace-nowrap">Preço de venda</span>
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

          {/* ABA LOGÍSTICA — medidas, unidade base com «Vitrine», embalagens, lista/avisos, níveis de estoque */}
          <TabsContent value="logistico" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Dimensões (AxLxP cm)</Label>
                <Input
                  value={formData.dimensoes_cm}
                  onChange={(e) => handleChange('dimensoes_cm', e.target.value)}
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
                  onChange={(e) => handleChange('peso_kg', parseFloat(e.target.value) || 0)}
                  placeholder="0,000"
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Tempo Reposição (dias)</Label>
                <Input
                  type="number"
                  value={formData.tempo_reposicao_dias}
                  onChange={(e) => handleChange('tempo_reposicao_dias', parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Unidade base (fator 1)</Label>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <Input
                    value={formData.unidade_principal}
                    onChange={(e) => handleChange('unidade_principal', e.target.value.toUpperCase())}
                    placeholder="UN, M2, KG…"
                    className="bg-transparent border-0 border-b-2 border-gray-400 dark:border-gray-500 rounded-none px-0 h-10 text-sm text-gray-800 dark:text-gray-200 flex-1 min-w-0"
                  />
                  <div className="flex items-center gap-2 shrink-0 pb-1 rounded-full bg-gray-100/90 dark:bg-gray-900/50 px-3 py-1.5 border border-gray-200/80 dark:border-gray-600/80">
                    <Switch
                      id="catalogo-unidade-principal"
                      className="scale-90"
                      checked={catalogoNaBase}
                      disabled={formData.unidade_show_ativa === false}
                      title="Vitrine na unidade base (fator 1). Desligue para passar a vitrine à primeira embalagem com interruptor «Vitrine»."
                      onCheckedChange={(checked) => {
                        const p = normalizeSigla(formData.unidade_principal || 'UN') || 'UN';
                        if (checked) {
                          applyCommercialUnitSelection(p);
                          return;
                        }
                        const alts = normalizeAlternativas(formData.unidades_alternativas || []);
                        const first = alts.find((u) => String(u?.unidade || '').trim());
                        if (first?.unidade) applyCommercialUnitSelection(first.unidade);
                      }}
                    />
                    <Label
                      htmlFor="catalogo-unidade-principal"
                      className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer whitespace-nowrap select-none"
                    >
                      Vitrine
                    </Label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
                  Coluna <code className="text-[10px] rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5">unidade_principal</code>
                  {' '}— custo, preço padrão e stock contabilizados na base (eixo fator&nbsp;1).
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Embalagens e unidades de venda</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                  Alterações ficam no formulário até guardar o produto (ícone de disquete no topo).
                  «Vitrine» define a sigla de exibição em listagens e fluxos de venda (uma de cada vez: base ou embalagem).
                  Ao salvar, o espelho canónico <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidades[]</code> valida o pacote sem alterar os nomes de colunas enviados ao Base44.
                </p>
              </div>

              <div className="flex items-start gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <Checkbox
                  id="unidade_show_ativa"
                  checked={formData.unidade_show_ativa !== false}
                  onCheckedChange={(v) => handleChange('unidade_show_ativa', v !== false)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="unidade_show_ativa" className="text-sm text-gray-700 dark:text-gray-300">
                    Usar unidade de vitrine no catálogo
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Coluna <code className="text-[10px]">unidade_show_ativa</code>. Desligado: listagens usam só a base (fator&nbsp;1), sem converter para a vitrine.
                  </p>
                </div>
              </div>

              <UnidadesAlternativasEditor
                unidades={formData.unidades_alternativas || []}
                unidadePrincipal={formData.unidade_principal || 'UN'}
                commercialUnitId={formData.unidade_comercial_id}
                catalogControlsDisabled={formData.unidade_show_ativa === false}
                onChange={(value) => handleChange('unidades_alternativas', value)}
                onPickCatalogPrincipal={() =>
                  applyCommercialUnitSelection(formData.unidade_principal || 'UN')
                }
                onPickCatalogRow={(index) => {
                  const rows = normalizeAlternativas(formData.unidades_alternativas || []);
                  const row = rows[index];
                  if (row?.unidade) applyCommercialUnitSelection(row.unidade);
                }}
              />

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Unidade de vitrine (lista)</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                    Alternativa aos interruptores «Vitrine»; grava{' '}
                    <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidade_apresentacao_default</code>,{' '}
                    <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidade_show_comercial</code>,{' '}
                    <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidade_comercial_id</code>
                    {' '}e espelha <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidade_show_logistica</code>.
                    No Postgres do A29 o campo equivalente de negócio é <code className="text-[10px] rounded bg-white/80 dark:bg-gray-900/80 px-1 py-0.5">unidade_exibicao_sigla</code>.
                  </p>
                </div>
                <Select
                  value={comercialSelectValue}
                  onValueChange={(v) => applyCommercialUnitSelection(v)}
                >
                  <SelectTrigger
                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl max-w-md h-11"
                    disabled={formData.unidade_show_ativa === false}
                  >
                    <SelectValue placeholder="Selecione a sigla da vitrine" />
                  </SelectTrigger>
                  <SelectContent>
                    {commercialSelectOptions.map((sigla) => (
                      <SelectItem key={`com-${sigla}`} value={sigla}>
                        {sigla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commercialSelectWarning ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2">
                    {commercialSelectWarning}
                  </p>
                ) : null}
                {formData.unidade_show_ativa !== false && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>
                      Pré-visualização: base{' '}
                      <span className="font-medium text-gray-700 dark:text-gray-300">{catalogUnitsPreview.base}</span>
                      {catalogUnitsPreview.base !== catalogUnitsPreview.comercial && (
                        <>
                          {' · '}
                          vitrine{' '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{catalogUnitsPreview.comercial}</span>
                        </>
                      )}
                    </p>
                    {catalogUnitsPreview.base !== catalogUnitsPreview.comercial &&
                      catalogUnitsPreview.display?.fator_conversao > 1 && (
                        <p className="text-[11px]">
                          Com estoque {formatarNumero(Number(formData.estoque_atual) || 0)} na base, o sistema pode mostrar ~{' '}
                          {formatarNumero(catalogUnitsPreview.display.quantidade)} {catalogUnitsPreview.display.unidade}.
                        </p>
                      )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 px-1 border-t border-gray-200 dark:border-gray-700 pt-3">
                Sem embalagem extra no catálogo: o sistema usa a unidade base. A lista de siglas é a base + embalagens com sigla preenchida.
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
                    onChange={(e) => handleChange('estoque_minimo', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleChange('estoque_ideal', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleChange('estoque_maximo', parseFloat(e.target.value) || 0)}
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

          {/* ABA AVANÇADO — tipo, PDV, rastreio */}
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