import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { filterAndSortProducts } from '@/components/compras/productMatchingUtils';
import {
  buildSaleUnitOptions,
  calculateBaseQuantity,
  formatCommercialQuantity,
  formatUnitConversion,
  getItemUnitKey,
  normalizeUnitCode,
  resolvePrimaryFromFactorOne,
} from '@/lib/productUnits';

const REFERENCIA_MOVIMENTO_INVENTARIO = 'MovimentoInventario';
const MOTIVOS_ENTRADA = ['Ajuste pontual de inventário', 'Entrada manual', 'Devolução ao estoque', 'Correção de saldo'];
const MOTIVOS_SAIDA = ['Ajuste pontual de inventário', 'Perda / avaria', 'Consumo interno', 'Correção de saldo'];

const round6 = (value) => Math.round((Number(value) || 0) * 1_000_000) / 1_000_000;

function parseQuantidade(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const str = String(value ?? '').trim();
  if (!str) return 0;
  const normalized = str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProdutoNome(produto) {
  return (
    produto?.nome ||
    [produto?.campo_hierarquico_1, produto?.campo_hierarquico_2, produto?.campo_hierarquico_3]
      .filter(Boolean)
      .join(' ') ||
    'Produto sem nome'
  );
}

function getProdutoCodigo(produto) {
  return produto?.codigo_interno || produto?.codigo_barras || produto?.id || '';
}

function getUnitOptions(produto) {
  if (!produto) return [];
  const fallback = normalizeUnitCode(produto?.unidade_principal) || 'UN';
  const options = buildSaleUnitOptions(produto, 1);
  if (options.length > 0) {
    return options.map((option) => ({
      ...option,
      id: option.id || option.unidade || 'primary',
      unidade: normalizeUnitCode(option.unidade) || fallback,
      fator_conversao: Number(option.fator_conversao) > 0 ? Number(option.fator_conversao) : 1,
    }));
  }
  return [{
    id: 'primary',
    nome: 'Unidade base',
    unidade: fallback,
    fator_conversao: 1,
    is_primary: true,
  }];
}

function getProdutoUnidadeId(unit) {
  if (!unit) return 'principal';
  if (unit.is_primary || unit.id === 'primary') return 'principal';
  return unit.id || unit.unidade;
}

function unitLabel(unit, unidadePrincipal) {
  const nome = unit?.nome && unit.nome !== unit.unidade ? `${unit.nome} · ` : '';
  return `${nome}${formatUnitConversion(unit, unidadePrincipal)}`;
}

function getCartKey(produtoId, unitCode) {
  return getItemUnitKey(produtoId, unitCode || 'UN');
}

function createCartItem(produto, unit, quantidade = 1) {
  const fator = Number(unit?.fator_conversao) > 0 ? Number(unit.fator_conversao) : 1;
  const unidade = normalizeUnitCode(unit?.unidade) || normalizeUnitCode(produto?.unidade_principal) || 'UN';
  const quantidadeComercial = round6(quantidade);
  const quantidadeBase = round6(calculateBaseQuantity(quantidadeComercial, fator));
  const unidadePrincipal = resolvePrimaryFromFactorOne(produto, produto?.unidade_principal || unidade);

  return {
    item_key: getCartKey(produto.id, unidade),
    produto_id: produto.id,
    produto_nome: getProdutoNome(produto),
    codigo_produto: getProdutoCodigo(produto),
    quantidade_comercial: quantidadeComercial,
    quantidade_base: quantidadeBase,
    unidade_medida: unidade,
    unidade_sigla: unidade,
    produto_unidade_id: getProdutoUnidadeId(unit),
    fator_conversao: fator,
    unidade_base: normalizeUnitCode(unidadePrincipal) || 'UN',
    estoque_atual_base: round6(produto?.estoque_atual),
    produto_snapshot: produto,
  };
}

function patchItemQuantity(item, quantidade) {
  const quantidadeComercial = round6(Math.max(0, quantidade));
  return {
    ...item,
    quantidade_comercial: quantidadeComercial,
    quantidade_base: round6(calculateBaseQuantity(quantidadeComercial, item.fator_conversao || 1)),
  };
}

function isInventarioManual(movimento) {
  return (
    movimento?.referencia_tipo === REFERENCIA_MOVIMENTO_INVENTARIO ||
    movimento?.origem_tipo === REFERENCIA_MOVIMENTO_INVENTARIO
  );
}

function ProductCard({ product, inCart, onSelect, onUnitSelect }) {
  const unitOptions = getUnitOptions(product);
  const hasAltUnits = unitOptions.length > 1;
  const unidadeBase = resolvePrimaryFromFactorOne(product, product?.unidade_principal || 'UN');

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`w-full rounded-2xl p-4 text-left shadow-sm transition-all active:scale-[0.99] ${
        inCart
          ? 'border border-indigo-100 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30'
          : 'border border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-800">
          <Package className="h-5 w-5 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {getProdutoNome(product)}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {getProdutoCodigo(product) && <span>#{getProdutoCodigo(product)}</span>}
            <span>
              Estoque: {formatCommercialQuantity(product.estoque_atual, unidadeBase)} {unidadeBase}
            </span>
          </div>
          {hasAltUnits && (
            <span className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <Boxes className="h-3.5 w-3.5" />
              <span>{unitOptions.length} unidades disponíveis</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onUnitSelect(product);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onUnitSelect(product);
                  }
                }}
                className="font-medium underline-offset-2 hover:underline"
              >
                escolher
              </span>
            </span>
          )}
        </div>
        {inCart ? (
          <Badge className="border-0 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-100">
            {formatCommercialQuantity(inCart.quantidade_comercial, inCart.unidade_medida)} {inCart.unidade_medida}
          </Badge>
        ) : (
          <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-gray-300" />
        )}
      </div>
    </button>
  );
}

function QuantityEditor({ item, onQuantityChange, onUnitClick, onAdd, onCancel, mode }) {
  const [input, setInput] = useState(() => (
    item ? formatCommercialQuantity(item.quantidade_comercial, item.unidade_medida) : ''
  ));
  const inputRef = useRef(null);

  useEffect(() => {
    setInput(item ? formatCommercialQuantity(item.quantidade_comercial, item.unidade_medida) : '');
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [item]);

  if (!item) return null;

  const increment = (delta) => {
    const next = Math.max(0, round6((Number(item.quantidade_comercial) || 0) + delta));
    onQuantityChange(next);
    setInput(formatCommercialQuantity(next, item.unidade_medida));
  };

  const commitInput = () => {
    const parsed = parseQuantidade(input);
    onQuantityChange(parsed);
    setInput(formatCommercialQuantity(parsed, item.unidade_medida));
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Item selecionado</p>
          <h3 className="mt-1 line-clamp-2 font-semibold text-gray-900 dark:text-white">{item.produto_nome}</h3>
          {item.codigo_produto && <p className="mt-0.5 text-xs text-gray-500">#{item.codigo_produto}</p>}
        </div>
        <button
          type="button"
          onClick={onUnitClick}
          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          {item.unidade_medida}
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-950">
        <Label className="mb-3 block text-center text-xs uppercase tracking-wide text-gray-500">
          Quantidade ({item.unidade_medida})
        </Label>
        <div className="flex items-center justify-center gap-5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => increment(-1)}
          >
            <Minus className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            inputMode="decimal"
            value={input}
            onChange={(event) => {
              const value = event.target.value;
              if (/^[\d.,]*$/.test(value)) {
                setInput(value);
                onQuantityChange(parseQuantidade(value));
              }
            }}
            onFocus={(event) => event.target.select()}
            onBlur={commitInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitInput();
                onAdd();
              }
            }}
            className="h-14 w-28 border-0 bg-transparent p-0 text-center text-3xl font-bold shadow-none focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => increment(1)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-gray-500">
          Base: {formatCommercialQuantity(item.quantidade_base, item.unidade_base)} {item.unidade_base}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 rounded-2xl" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="h-12 rounded-2xl" onClick={onAdd} disabled={item.quantidade_base <= 0}>
          {mode === 'edit' ? 'Salvar item' : 'Adicionar'}
        </Button>
      </div>
    </div>
  );
}

function UnitChoicePanel({ product, onClose, onSelect }) {
  if (!product) return null;
  const unidadePrincipal = resolvePrimaryFromFactorOne(product, product.unidade_principal || 'UN');
  const options = getUnitOptions(product);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Escolher unidade</p>
          <h3 className="mt-1 line-clamp-2 font-semibold text-gray-900 dark:text-white">{getProdutoNome(product)}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
      <div className="mt-4 space-y-2">
        {options.map((unit) => (
          <button
            key={`${unit.id}-${unit.unidade}`}
            type="button"
            onClick={() => onSelect(unit)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-800"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{unit.unidade}</p>
              <p className="text-xs text-gray-500">{unitLabel(unit, unidadePrincipal)}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MovimentosInventario() {
  const [produtos, setProdutos] = useState([]);
  const [movimentosRecentes, setMovimentosRecentes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipo, setTipo] = useState('Entrada');
  const [motivo, setMotivo] = useState('Ajuste pontual de inventário');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [draftItem, setDraftItem] = useState(null);
  const [draftMode, setDraftMode] = useState('add');
  const [editingKey, setEditingKey] = useState('');
  const [unitChoiceProduct, setUnitChoiceProduct] = useState(null);
  const [stage, setStage] = useState('catalog');

  useEffect(() => {
    loadInitialData();
  }, []);

  const motivosDisponiveis = tipo === 'Entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;

  useEffect(() => {
    if (!motivosDisponiveis.includes(motivo)) {
      setMotivo(motivosDisponiveis[0]);
    }
  }, [motivo, motivosDisponiveis]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [userData, produtosData, movimentosData] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Produto.filter({ ativo: true }, '-created_date').catch(() => []),
        base44.entities.MovimentacaoEstoque.list('-created_date', 80).catch(() => []),
      ]);
      setCurrentUser(userData);
      setProdutos(Array.isArray(produtosData) ? produtosData.filter((p) => p?.id) : []);
      setMovimentosRecentes((Array.isArray(movimentosData) ? movimentosData : [])
        .filter(isInventarioManual)
        .slice(0, 12));
    } catch (error) {
      console.error('Erro ao carregar movimentos de inventário:', error);
      toast.error('Erro ao carregar dados de inventário.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProdutos = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return filterAndSortProducts(produtos, searchTerm, { limit: 30 });
  }, [produtos, searchTerm]);

  const cartByKey = useMemo(() => {
    const map = new Map();
    cartItems.forEach((item) => map.set(item.item_key, item));
    return map;
  }, [cartItems]);

  const reviewRows = useMemo(() => {
    const grouped = new Map();
    cartItems.forEach((item) => {
      const current = grouped.get(item.produto_id) || {
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        unidade_base: item.unidade_base,
        estoque_antes: item.estoque_atual_base,
        quantidade_base: 0,
        itens: [],
      };
      current.quantidade_base = round6(current.quantidade_base + item.quantidade_base);
      current.itens.push(item);
      grouped.set(item.produto_id, current);
    });
    return [...grouped.values()].map((row) => {
      const delta = tipo === 'Entrada' ? row.quantidade_base : -row.quantidade_base;
      return {
        ...row,
        estoque_depois: round6(row.estoque_antes + delta),
      };
    }).sort((a, b) => a.produto_nome.localeCompare(b.produto_nome, 'pt-BR'));
  }, [cartItems, tipo]);

  const hasNegativeStock = reviewRows.some((row) => row.estoque_depois < 0);
  const cartCount = cartItems.length;

  const setTipoMovimento = (nextTipo) => {
    setTipo(nextTipo);
    setStage('catalog');
  };

  const openDraft = (produto, unit = null, mode = 'add') => {
    const selectedUnit = unit || getUnitOptions(produto)[0];
    if (!selectedUnit) return;
    const key = getCartKey(produto.id, selectedUnit.unidade);
    const existing = cartByKey.get(key);
    setDraftItem(existing || createCartItem(produto, selectedUnit, 1));
    setDraftMode(existing ? 'edit' : mode);
    setEditingKey(existing ? key : '');
    setUnitChoiceProduct(null);
  };

  const handleProductClick = async (produto) => {
    openDraft(produto);
    try {
      const full = await base44.entities.Produto.get(produto.id);
      if (!full?.id) return;
      setProdutos((prev) => prev.map((item) => (item.id === full.id ? { ...item, ...full } : item)));
      setDraftItem((prev) => {
        if (!prev) return prev;
        if (prev && prev.produto_id !== full.id) return prev;
        const options = getUnitOptions(full);
        const selectedUnit = options.find((unit) => unit.unidade === prev?.unidade_medida) || options[0];
        const existing = cartByKey.get(getCartKey(full.id, selectedUnit?.unidade));
        if (existing) return existing;
        return createCartItem(full, selectedUnit, prev?.quantidade_comercial || 1);
      });
    } catch (error) {
      console.warn('[MovimentosInventario] Produto.get falhou; usando linha da lista.', error);
    }
  };

  const handleSelectUnit = (unit) => {
    if (!unitChoiceProduct) return;
    const key = getCartKey(unitChoiceProduct.id, unit.unidade);
    const existing = cartByKey.get(key);
    const quantity = draftItem?.produto_id === unitChoiceProduct.id
      ? draftItem.quantidade_comercial
      : 1;
    setDraftItem(existing || createCartItem(unitChoiceProduct, unit, quantity || 1));
    setDraftMode(existing || draftMode === 'edit' ? 'edit' : 'add');
    setEditingKey(draftMode === 'edit' ? editingKey : (existing ? key : ''));
    setUnitChoiceProduct(null);
  };

  const handleDraftQuantityChange = (quantity) => {
    setDraftItem((prev) => (prev ? patchItemQuantity(prev, quantity) : prev));
  };

  const handleSaveDraft = () => {
    if (!draftItem || draftItem.quantidade_base <= 0) {
      toast.error('Informe uma quantidade maior que zero.');
      return;
    }
    setCartItems((prev) => {
      const withoutCurrent = prev.filter((item) => item.item_key !== (editingKey || draftItem.item_key));
      return [...withoutCurrent, draftItem].sort((a, b) => a.produto_nome.localeCompare(b.produto_nome, 'pt-BR'));
    });
    setDraftItem(null);
    setEditingKey('');
    setDraftMode('add');
    setStage('cart');
  };

  const handleEditCartItem = (item) => {
    setDraftItem(item);
    setEditingKey(item.item_key);
    setDraftMode('edit');
    setStage('catalog');
  };

  const handleRemoveItem = (itemKey) => {
    setCartItems((prev) => prev.filter((item) => item.item_key !== itemKey));
    if (editingKey === itemKey) {
      setDraftItem(null);
      setEditingKey('');
    }
  };

  const handleClearAfterSave = (updatedProducts, createdMovements) => {
    const productMap = new Map(updatedProducts.map((product) => [product.id, product]));
    setProdutos((prev) => prev.map((produto) => (
      productMap.has(produto.id) ? { ...produto, ...productMap.get(produto.id) } : produto
    )));
    setMovimentosRecentes((prev) => [...createdMovements, ...prev].slice(0, 12));
    setCartItems([]);
    setDraftItem(null);
    setEditingKey('');
    setDocumentoReferencia('');
    setObservacoes('');
    setStage('catalog');
  };

  const handleConcluir = async () => {
    if (cartItems.length === 0) {
      toast.error('Adicione pelo menos um item ao carrinho.');
      return;
    }
    if (hasNegativeStock) {
      toast.error('Há item com estoque negativo na revisão. Ajuste o carrinho antes de concluir.');
      return;
    }

    setSaving(true);
    try {
      const produtosAtuais = await Promise.all(
        [...new Set(cartItems.map((item) => item.produto_id))].map((id) => base44.entities.Produto.get(id))
      );
      const produtosMap = new Map(produtosAtuais.filter(Boolean).map((produto) => [produto.id, produto]));

      const validationRows = cartItems.reduce((acc, item) => {
        const produto = produtosMap.get(item.produto_id) || item.produto_snapshot;
        const unidadeBase = resolvePrimaryFromFactorOne(produto, item.unidade_base || produto?.unidade_principal || 'UN');
        const row = acc[item.produto_id] || {
          produto,
          unidade_base: unidadeBase,
          estoque_antes: round6(produto?.estoque_atual),
          quantidade_base: 0,
        };
        row.quantidade_base = round6(row.quantidade_base + item.quantidade_base);
        acc[item.produto_id] = row;
        return acc;
      }, {});

      const invalid = Object.values(validationRows).find((row) => {
        const depois = tipo === 'Entrada'
          ? round6(row.estoque_antes + row.quantidade_base)
          : round6(row.estoque_antes - row.quantidade_base);
        return depois < 0;
      });
      if (invalid) {
        toast.error(`A saída deixaria ${getProdutoNome(invalid.produto)} com estoque negativo.`);
        return;
      }

      const usuario = currentUser?.full_name || currentUser?.email || 'Sistema';
      const referenciaNumero = documentoReferencia.trim();
      const createdMovements = [];
      const updatedProducts = [];

      for (const [produtoId, row] of Object.entries(validationRows)) {
        const produto = row.produto;
        const itensProduto = cartItems.filter((item) => item.produto_id === produtoId);
        const estoqueDepois = tipo === 'Entrada'
          ? round6(row.estoque_antes + row.quantidade_base)
          : round6(row.estoque_antes - row.quantidade_base);

        for (const item of itensProduto) {
          const obsContexto = [
            observacoes.trim(),
            `Estoque: ${formatCommercialQuantity(row.estoque_antes, row.unidade_base)} ${row.unidade_base} -> ${formatCommercialQuantity(estoqueDepois, row.unidade_base)} ${row.unidade_base}`,
            `Lancado em ${formatCommercialQuantity(item.quantidade_comercial, item.unidade_medida)} ${item.unidade_medida} (fator ${item.fator_conversao})`,
          ].filter(Boolean).join(' | ');

          const payloadMovimento = {
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            tipo,
            motivo,
            quantidade: item.quantidade_base,
            quantidade_base: item.quantidade_base,
            quantidade_comercial: item.quantidade_comercial,
            unidade_medida: item.unidade_medida,
            unidade_sigla: item.unidade_sigla,
            produto_unidade_id: item.produto_unidade_id,
            fator_conversao: item.fator_conversao,
            custo_unitario: Number(produto?.preco_custo_calculado) || Number(produto?.valor_compra) || 0,
            documento_referencia: referenciaNumero,
            referencia_tipo: REFERENCIA_MOVIMENTO_INVENTARIO,
            referencia_numero: referenciaNumero || 'Ajuste manual',
            origem_tipo: REFERENCIA_MOVIMENTO_INVENTARIO,
            origem_id: referenciaNumero || null,
            observacoes: obsContexto,
            usuario_responsavel: usuario,
          };

          const created = await base44.entities.MovimentacaoEstoque.create(payloadMovimento);
          createdMovements.push({ ...payloadMovimento, ...created });
        }

        const updated = await base44.entities.Produto.update(produtoId, {
          estoque_atual: estoqueDepois,
        });
        updatedProducts.push({ ...produto, ...updated, estoque_atual: estoqueDepois });
      }

      handleClearAfterSave(updatedProducts, createdMovements);
      toast.success(`${cartItems.length} movimento(s) registrado(s) com sucesso.`);
    } catch (error) {
      console.error('Erro ao concluir movimentos de inventário:', error);
      toast.error(error?.message || 'Erro ao concluir movimentos de inventário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Estoque
            </p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Movimentos de Inventário
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Selecione itens, informe quantidades, revise o antes/depois e conclua ajustes pontuais de estoque.
            </p>
          </div>
          <Button variant="outline" onClick={loadInitialData} disabled={loading || saving}>
            Atualizar dados
          </Button>
        </div>

        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <Info className="h-4 w-4" />
          <AlertTitle>Uso correto</AlertTitle>
          <AlertDescription>
            Este fluxo é para ajustes manuais e pontuais. Conferência e auditoria seguem separados para contagem formal.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
                  <div className="rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setTipoMovimento('Entrada')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                          tipo === 'Entrada'
                            ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-800 dark:text-emerald-400'
                            : 'text-gray-500'
                        }`}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoMovimento('Saída')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                          tipo === 'Saída'
                            ? 'bg-white text-red-700 shadow-sm dark:bg-gray-800 dark:text-red-400'
                            : 'text-gray-500'
                        }`}
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                        Saída
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-xs">Motivo</Label>
                      <Select value={motivo} onValueChange={setMotivo}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white dark:bg-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {motivosDisponiveis.map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="documento-referencia" className="mb-1.5 block text-xs">Referência opcional</Label>
                      <Input
                        id="documento-referencia"
                        value={documentoReferencia}
                        onChange={(event) => setDocumentoReferencia(event.target.value)}
                        placeholder="Ex: ajuste balcão, OS, romaneio"
                        className="h-12 rounded-2xl bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5 text-blue-600" />
                      Selecionar itens
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStage(stage === 'cart' ? 'catalog' : 'cart')}
                      className="gap-2 rounded-full"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {cartCount}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="sticky top-0 z-10 bg-white pb-2 dark:bg-gray-950 md:static">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          setStage('catalog');
                        }}
                        placeholder="Buscar produto..."
                        className="h-12 rounded-2xl border-0 bg-gray-100 pl-11 shadow-sm dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  {stage === 'cart' ? (
                    <CartList
                      items={cartItems}
                      tipo={tipo}
                      onEdit={handleEditCartItem}
                      onRemove={handleRemoveItem}
                      onReview={() => setStage('review')}
                    />
                  ) : stage === 'review' ? (
                    <ReviewList
                      rows={reviewRows}
                      tipo={tipo}
                      hasNegativeStock={hasNegativeStock}
                      onBack={() => setStage('cart')}
                      onConcluir={handleConcluir}
                      saving={saving}
                    />
                  ) : (
                    <div className="min-h-[420px] space-y-2">
                      {!searchTerm.trim() ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-16 text-center text-gray-400 dark:border-gray-800">
                          <Search className="mb-4 h-14 w-14 opacity-25" />
                          <p className="font-medium">Digite para buscar um produto</p>
                          <p className="mt-1 text-sm">Depois escolha a unidade e quantidade como no PDV.</p>
                        </div>
                      ) : filteredProdutos.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-200 py-12 text-center text-gray-500 dark:border-gray-800">
                          Nenhum produto encontrado para "{searchTerm}".
                        </div>
                      ) : (
                        filteredProdutos.map((product) => {
                          const firstUnit = getUnitOptions(product)[0];
                          const inCart = firstUnit ? cartByKey.get(getCartKey(product.id, firstUnit.unidade)) : null;
                          return (
                            <ProductCard
                              key={product.id}
                              product={product}
                              inCart={inCart}
                              onSelect={handleProductClick}
                              onUnitSelect={setUnitChoiceProduct}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                {unitChoiceProduct ? (
                  <UnitChoicePanel
                    product={unitChoiceProduct}
                    onClose={() => setUnitChoiceProduct(null)}
                    onSelect={handleSelectUnit}
                  />
                ) : (
                  <QuantityEditor
                    item={draftItem}
                    mode={draftMode}
                    onQuantityChange={handleDraftQuantityChange}
                    onUnitClick={() => {
                      const product = produtos.find((p) => p.id === draftItem?.produto_id) || draftItem?.produto_snapshot;
                      if (product) setUnitChoiceProduct(product);
                    }}
                    onAdd={handleSaveDraft}
                    onCancel={() => {
                      setDraftItem(null);
                      setEditingKey('');
                      setDraftMode('add');
                    }}
                  />
                )}

                {!draftItem && !unitChoiceProduct && (
                  <Card className="border-gray-200 dark:border-gray-800">
                    <CardContent className="p-6 text-center text-sm text-gray-500">
                      <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                      Selecione um produto para informar unidade e quantidade.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>Carrinho</span>
                  <Badge variant="secondary">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CartList
                  items={cartItems}
                  tipo={tipo}
                  compact
                  onEdit={handleEditCartItem}
                  onRemove={handleRemoveItem}
                  onReview={() => setStage('review')}
                />
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações gerais</Label>
                  <Textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Explique rapidamente o motivo operacional do ajuste."
                  />
                </div>
                <Button
                  className="h-12 w-full rounded-2xl"
                  onClick={() => setStage('review')}
                  disabled={cartItems.length === 0}
                >
                  Revisar antes/depois
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Antes e depois</CardTitle>
              </CardHeader>
              <CardContent>
                <ReviewList
                  rows={reviewRows}
                  tipo={tipo}
                  hasNegativeStock={hasNegativeStock}
                  compact
                  onBack={() => setStage('cart')}
                  onConcluir={handleConcluir}
                  saving={saving}
                />
              </CardContent>
            </Card>

            <RecentMovements movimentos={movimentosRecentes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CartList({ items, tipo, onEdit, onRemove, onReview, compact = false }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500 dark:border-gray-800">
        <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium">Carrinho vazio</p>
        <p className="mt-1 text-sm">Adicione produtos para montar o ajuste.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.item_key}
          className="rounded-2xl bg-gray-50 p-3 shadow-sm dark:bg-gray-900"
        >
          <div className="flex items-start gap-3">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(item)}>
              <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{item.produto_nome}</p>
              <p className="mt-1 text-xs text-gray-500">
                {formatCommercialQuantity(item.quantidade_comercial, item.unidade_medida)} {item.unidade_medida}
                {' '}= {formatCommercialQuantity(item.quantidade_base, item.unidade_base)} {item.unidade_base}
              </p>
              <p className={`mt-1 text-xs font-medium ${tipo === 'Entrada' ? 'text-emerald-700' : 'text-red-700'}`}>
                {tipo === 'Entrada' ? 'Entrada' : 'Saída'} pontual
              </p>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              onClick={() => onRemove(item.item_key)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {!compact && (
        <Button className="h-12 w-full rounded-2xl" onClick={onReview}>
          Revisar antes/depois
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function ReviewList({ rows, tipo, hasNegativeStock, onBack, onConcluir, saving, compact = false }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500 dark:border-gray-800">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="font-medium">Nada para revisar ainda</p>
        <p className="mt-1 text-sm">O antes/depois aparece depois que itens entram no carrinho.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.produto_id}
          className={`rounded-2xl border p-3 ${
            row.estoque_depois < 0
              ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
          }`}
        >
          <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{row.produto_nome}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-950">
              <span className="block text-gray-500">Antes</span>
              <strong className="text-gray-900 dark:text-white">
                {formatCommercialQuantity(row.estoque_antes, row.unidade_base)} {row.unidade_base}
              </strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-950">
              <span className="block text-gray-500">{tipo}</span>
              <strong className={tipo === 'Entrada' ? 'text-emerald-700' : 'text-red-700'}>
                {tipo === 'Entrada' ? '+' : '-'}{formatCommercialQuantity(row.quantidade_base, row.unidade_base)}
              </strong>
            </div>
            <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-950">
              <span className="block text-gray-500">Depois</span>
              <strong className={row.estoque_depois < 0 ? 'text-red-700' : 'text-gray-900 dark:text-white'}>
                {formatCommercialQuantity(row.estoque_depois, row.unidade_base)} {row.unidade_base}
              </strong>
            </div>
          </div>
        </div>
      ))}
      {hasNegativeStock && (
        <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Há produto que ficaria negativo. Ajuste a quantidade antes de concluir.
        </div>
      )}
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-2xl" onClick={onBack}>
            Voltar ao carrinho
          </Button>
          <Button className="h-12 rounded-2xl" onClick={onConcluir} disabled={saving || hasNegativeStock}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Concluir
          </Button>
        </div>
      )}
      {compact && (
        <Button className="h-12 w-full rounded-2xl" onClick={onConcluir} disabled={saving || hasNegativeStock}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Concluir movimentos
        </Button>
      )}
    </div>
  );
}

function RecentMovements({ movimentos }) {
  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg">Últimos ajustes pontuais</CardTitle>
      </CardHeader>
      <CardContent>
        {movimentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-800">
            Nenhum movimento manual recente.
          </div>
        ) : (
          <div className="space-y-3">
            {movimentos.slice(0, 6).map((movimento) => (
              <div key={movimento.id || `${movimento.produto_id}-${movimento.created_date}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movimento.produto_nome || movimento.produto_id || 'Produto'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(movimento.created_date || movimento.created_at)}</p>
                  </div>
                  <Badge variant={movimento.tipo === 'Entrada' ? 'secondary' : 'destructive'}>
                    {movimento.tipo}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {formatCommercialQuantity(movimento.quantidade_comercial || movimento.quantidade, movimento.unidade_medida)} {movimento.unidade_medida || 'base'}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
