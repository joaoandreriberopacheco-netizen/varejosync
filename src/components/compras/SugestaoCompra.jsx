import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosSugestaoCompra, {
  DEFAULT_SUGESTAO_COMPRA_FILTERS,
} from '@/components/compras/FiltrosSugestaoCompra';
import SugestaoCompraTreeGrid, { LevelControl, TREE_GRID_EXPAND_ALL_LEVEL } from '@/components/compras/SugestaoCompraTreeGrid';
import { ShoppingCart, RefreshCw, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/components/utils';
import { dataHoje } from '@/components/utils/dateUtils';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';
import { calcularSugestaoCompraProdutoCatalogo } from '@/lib/calcularSugestaoCompraCatalogo';
import {
  buildLinhasSugestaoCompra,
  distribuirQuantidadeGrupo,
} from '@/lib/calcularSugestaoCompraHierarquia';
import { fetchPedidosVenda90d, fetchDadosVendaAbcd90d } from '@/lib/fetchPedidosVenda90d';
import { fetchProdutosAtivos } from '@/lib/fetchProdutosAtivos';
import { withRateLimitRetry } from '@/lib/p38ApiErrors';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ProdutosTreeByCategoryToggle from '@/components/produtos/ProdutosTreeByCategoryToggle';
import { CATALOG_SORT_OPTIONS } from '@/lib/catalogProdutoPerformance';
import {
  buildSugestaoCompraLinhaLookup,
  enrichSugestaoLinhasComAbcd,
  extractProdutosFromSugestaoLinhas,
} from '@/lib/sugestaoCompraTree';
import {
  collectSugestaoTags,
  collectSugestaoVitrineUnits,
  filterSugestaoCompraLinhas,
} from '@/lib/filterSugestaoCompraLinhas';
const FORNECEDOR_VAZIO = '__none__';
const SUGESTAO_TREE_LEVEL_KEY = 'sugestaoCompra.treeLevel';
const SUGESTAO_GROUP_CATEGORY_KEY = 'sugestaoCompra.groupByCategory';
const SUGESTAO_SORT_KEY = 'sugestaoCompra.sortOrder';

function readSugestaoTreeLevel() {
  try {
    const raw = localStorage.getItem(SUGESTAO_TREE_LEVEL_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  } catch {
    return 1;
  }
}

function readSugestaoGroupByCategory() {
  try {
    return localStorage.getItem(SUGESTAO_GROUP_CATEGORY_KEY) === '1';
  } catch {
    return false;
  }
}

function readSugestaoSortOrder() {
  try {
    const raw = localStorage.getItem(SUGESTAO_SORT_KEY);
    return CATALOG_SORT_OPTIONS.some((o) => o.id === raw) ? raw : 'abcd_desc';
  } catch {
    return 'abcd_desc';
  }
}

function fornecedorPadraoLinha(linha) {
  const ids = linha.skus.map((p) => p.fornecedor_padrao_id).filter(Boolean);
  if (!ids.length) return '';
  const freq = {};
  ids.forEach((id) => {
    freq[id] = (freq[id] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

export default function SugestaoCompra({ onStatsChange }) {
  const [linhas, setLinhas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [fornecedorPorLinha, setFornecedorPorLinha] = useState({});

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_SUGESTAO_COMPRA_FILTERS }));
  const { roundingMode, agruparHierarquia } = filters;
  const [sortOrder, setSortOrder] = useState(readSugestaoSortOrder);
  const [treeLevel, setTreeLevel] = useState(readSugestaoTreeLevel);
  const [groupByCategory, setGroupByCategory] = useState(readSugestaoGroupByCategory);
  const [loadStats, setLoadStats] = useState({
    totalAtivos: 0,
    elegiveis: 0,
    semPontoPedido: 0,
    abaixoPontoPedido: 0,
    linhasGrupo: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const calcContextRef = useRef({ pedidos: [], movsPorProduto: {}, prods: [], pending: {}, vendasDados: null });
  const abcdLoadRef = useRef(0);

  const allTags = useMemo(() => collectSugestaoTags(linhas), [linhas]);
  const unidadesVitrine = useMemo(() => collectSugestaoVitrineUnits(linhas), [linhas]);

  const produtoParaCompra = (produto) => buildSnapshotExibicaoComercial(produto);

  const calcQuantityLinha = (linha) => linha.sugestao?.quantidade_sugerida_base || 0;

  const sugestaoDisplayLinha = (linha) => {
    const qBase = calcQuantityLinha(linha);
    return resolveCommercialDisplay(
      produtoParaCompra(linha.produto),
      qBase,
      linha.produto.unidade_principal || 'UN',
    );
  };

  const recomputarLinhas = useCallback(
    (prods, pedidos, movsPorProduto, pending, opts = {}) => {
      const agrupar = opts.agruparHierarquia ?? agruparHierarquia;
      const round = opts.roundingMode ?? roundingMode;
      return buildLinhasSugestaoCompra(prods, pedidos, movsPorProduto, pending, {
        agruparHierarquia: agrupar,
        roundingMode: round,
        fonte: 'catalogo',
      });
    },
    [agruparHierarquia, roundingMode],
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, forn, cats] = await Promise.all([
        fetchProdutosAtivos(),
        base44.entities.Terceiro.list(),
        base44.entities.Categoria.list(),
      ]);

      let pedidosCompra = [];
      try {
        pedidosCompra = await base44.entities.PedidoCompra.filter({
          status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente'],
        });
      } catch {
        // Pendências em pedidos abertos são opcionais para montar a lista.
      }

      let pedidos = [];
      try {
        pedidos = await withRateLimitRetry(() => fetchPedidosVenda90d(), {
          maxAttempts: 3,
          baseDelayMs: 800,
        });
      } catch {
        // Vendas 90d só são necessárias ao gerar pedido com distribuição por SKU.
      }

      const pending = {};
      pedidosCompra.forEach((p) => {
        p.itens?.forEach((i) => {
          pending[i.produto_id] = (pending[i.produto_id] || 0) + (i.quantidade || 0);
        });
      });

      const movsPorProduto = {};
      calcContextRef.current = { pedidos, movsPorProduto, prods, pending };

      let semPontoPedido = 0;
      let abaixoPontoPedido = 0;
      prods.forEach((p) => {
        const s = calcularSugestaoCompraProdutoCatalogo(p, { roundingMode });
        if (s.motivo === 'sem_ponto_pedido') semPontoPedido += 1;
        if (s.elegivel) abaixoPontoPedido += 1;
      });

      const novasLinhas = recomputarLinhas(prods, pedidos, movsPorProduto, pending);

      setLoadStats({
        totalAtivos: prods.length,
        elegiveis: novasLinhas.length,
        semPontoPedido,
        abaixoPontoPedido,
        linhasGrupo: novasLinhas.filter((l) => l.tipo === 'grupo').length,
      });
      setLinhas(novasLinhas);
      setFornecedores(forn);
      setCategorias(cats);

      const abcdLoadId = ++abcdLoadRef.current;
      withRateLimitRetry(() => fetchDadosVendaAbcd90d(), {
        maxAttempts: 3,
        baseDelayMs: 800,
      })
        .then((vendasDados) => {
          if (abcdLoadId !== abcdLoadRef.current) return;
          calcContextRef.current = {
            ...calcContextRef.current,
            pedidos: vendasDados.pedidos90d,
            vendasDados,
          };
          setLinhas((prev) => enrichSugestaoLinhasComAbcd(prev, prods, vendasDados));
        })
        .catch(() => {
          /* ABCD ao vivo é opcional; a lista já está visível */
        });
    } catch (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const ctx = calcContextRef.current;
    if (!ctx.prods?.length) return;
    let next = recomputarLinhas(ctx.prods, ctx.pedidos, ctx.movsPorProduto, ctx.pending, {
      agruparHierarquia,
      roundingMode,
    });
    if (ctx.vendasDados) {
      next = enrichSugestaoLinhasComAbcd(next, ctx.prods, ctx.vendasDados);
    }
    setLinhas(next);
  }, [roundingMode, agruparHierarquia, recomputarLinhas]);

  const filteredLinhas = useMemo(
    () => filterSugestaoCompraLinhas(linhas, filters),
    [linhas, filters],
  );

  const treeProdutos = useMemo(
    () => extractProdutosFromSugestaoLinhas(filteredLinhas),
    [filteredLinhas],
  );
  const linhaLookup = useMemo(
    () => buildSugestaoCompraLinhaLookup(filteredLinhas),
    [filteredLinhas],
  );

  const currentSort = CATALOG_SORT_OPTIONS.find((opt) => opt.id === sortOrder)
    || CATALOG_SORT_OPTIONS.find((o) => o.id === 'abcd_desc');

  const handleSortOrderChange = useCallback((next) => {
    setSortOrder(next);
    try {
      localStorage.setItem(SUGESTAO_SORT_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const handleTreeLevelChange = useCallback((next) => {
    setTreeLevel(next);
    try {
      localStorage.setItem(SUGESTAO_TREE_LEVEL_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const handleGroupByCategoryChange = useCallback((next) => {
    setGroupByCategory(next);
    try {
      localStorage.setItem(SUGESTAO_GROUP_CATEGORY_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const selectedCount = Object.keys(selectedItems).length;

  useEffect(() => {
    onStatsChange?.({
      total: filteredLinhas.length,
      selected: selectedCount,
      catalogo: linhas.length,
      ...loadStats,
    });
  }, [filteredLinhas.length, selectedCount, linhas.length, loadStats, onStatsChange]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const all = {};
      filteredLinhas.forEach((l) => {
        all[l.id] = true;
      });
      setSelectedItems(all);
    } else {
      setSelectedItems({});
    }
  };

  const limparFiltros = () => {
    setFilters({ ...DEFAULT_SUGESTAO_COMPRA_FILTERS });
  };

  const expandirLinhaItens = (linha) => {
    const { pedidos } = calcContextRef.current;
    if (linha.tipo === 'sku') {
      const p = linha.produto;
      const qBase = calcQuantityLinha(linha);
      return [{ produto: p, quantidade_base: qBase, nome: p.nome }];
    }

    const total = calcQuantityLinha(linha);
    const partes = distribuirQuantidadeGrupo(linha.skus, total, pedidos, roundingMode);
    return partes.map(({ produto, quantidade_base }) => ({
      produto,
      quantidade_base,
      nome:
        linha.skus.length > 1
          ? `${linha.label} (${produto.campo_hierarquico_5 || produto.marca || produto.nome})`
          : linha.label,
    }));
  };

  const fornecedorLinha = (linha) =>
    fornecedorPorLinha[linha.id] || fornecedorPadraoLinha(linha);

  const handleGenerate = async () => {
    const selected = filteredLinhas.filter((l) => selectedItems[l.id]);
    if (selected.length === 0) return;

    const semFornecedor = selected.filter((l) => !fornecedorLinha(l));
    if (semFornecedor.length > 0) {
      toast({
        title: 'Itens sem fornecedor',
        description: `${semFornecedor.length} linha(s) sem fornecedor`,
        variant: 'destructive',
      });
      return;
    }

    const bySupplier = {};
    selected.forEach((linha) => {
      const sid = fornecedorLinha(linha);
      const supplier = fornecedores.find((f) => f.id === sid);
      if (!bySupplier[sid]) {
        bySupplier[sid] = { fornecedor_id: sid, fornecedor_nome: supplier?.nome || 'N/A', itens: [] };
      }

      expandirLinhaItens(linha).forEach(({ produto, quantidade_base, nome }) => {
        const snap = produtoParaCompra(produto);
        const disp = resolveCommercialDisplay(snap, quantidade_base, produto.unidade_principal || 'UN');
        const custoBase = produto.preco_custo_calculado || produto.valor_compra || 0;
        const custoUnitCompra = custoBase * (disp.fator_conversao || 1);
        bySupplier[sid].itens.push({
          produto_id: produto.id,
          produto_nome: nome,
          quantidade: disp.quantidade,
          quantidade_base,
          fator_conversao: disp.fator_conversao,
          unidade: disp.unidade,
          custo_unitario: custoUnitCompra,
          total: quantidade_base * custoBase,
        });
      });
    });

    try {
      const all = await base44.entities.PedidoCompra.list();
      let num =
        (all.length > 0 ? Math.max(...all.map((x) => parseInt(x.numero?.split('-')[1] || 0, 10))) : 0) + 1;

      const numerosCriados = [];
      await Promise.all(
        Object.values(bySupplier).map((data) => {
          const total = data.itens.reduce((sum, i) => sum + i.total, 0);
          const numero = `PC-${String(num++).padStart(5, '0')}`;
          numerosCriados.push(numero);
          return base44.entities.PedidoCompra.create({
            ...data,
            numero,
            status: 'Rascunho',
            valor_total: total,
          });
        }),
      );

      const qtd = numerosCriados.length;
      const resumoNumeros = numerosCriados.slice(0, 3).join(', ');
      sonnerToast.success('Pedidos gerados', {
        description:
          qtd === 1
            ? `${numerosCriados[0]} criado em rascunho`
            : `${qtd} pedidos (${resumoNumeros}${qtd > 3 ? '…' : ''})`,
        action: {
          label: 'Ir para Embarques',
          onClick: () => navigate(createPageUrl('PedidosCompra')),
        },
      });
      setSelectedItems({});
      loadData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleQuote = async () => {
    const selected = filteredLinhas.filter((l) => selectedItems[l.id]);
    if (selected.length === 0) return;

    try {
      const all = await base44.entities.Cotacao.list();
      const num =
        (all.length > 0 ? Math.max(...all.map((c) => parseInt(c.numero?.split('-')[1] || 0, 10))) : 0) + 1;

      const itens = [];
      const supplierIds = new Set();

      selected.forEach((linha) => {
        const sid = fornecedorLinha(linha);
        if (sid) supplierIds.add(sid);

        if (linha.tipo === 'grupo') {
          const qBase = calcQuantityLinha(linha);
          const disp = sugestaoDisplayLinha(linha);
          itens.push({
            produto_id: linha.produto.id,
            produto_nome: linha.label,
            quantidade: disp.quantidade,
            unidade: disp.unidade,
            quantidade_base: qBase,
            fator_conversao: disp.fator_conversao,
            observacao: `${linha.skus.length} modelo(s) — família hierárquica`,
          });
        } else {
          expandirLinhaItens(linha).forEach(({ produto, quantidade_base, nome }) => {
            const disp = resolveCommercialDisplay(
              produtoParaCompra(produto),
              quantidade_base,
              produto.unidade_principal || 'UN',
            );
            itens.push({
              produto_id: produto.id,
              produto_nome: nome,
              quantidade: disp.quantidade,
              unidade: disp.unidade,
              quantidade_base,
              fator_conversao: disp.fator_conversao,
            });
          });
        }
      });

      await base44.entities.Cotacao.create({
        numero: `COT-${String(num).padStart(5, '0')}`,
        titulo: `Cotação - ${new Date().toLocaleDateString()}`,
        status: 'Rascunho',
        data_abertura: dataHoje(),
        itens,
        fornecedores: [...supplierIds].map((id) => {
          const f = fornecedores.find((x) => x.id === id);
          return { fornecedor_id: id, fornecedor_nome: f?.nome || 'N/A', status_envio: 'Pendente' };
        }),
      });

      toast({ title: 'Cotação criada', className: 'bg-blue-100 text-blue-800' });
      setSelectedItems({});
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const renderFornecedorSelect = (linha, className = '') => {
    const value = fornecedorLinha(linha) || FORNECEDOR_VAZIO;
    return (
      <Select
        value={value}
        onValueChange={(v) =>
          setFornecedorPorLinha({
            ...fornecedorPorLinha,
            [linha.id]: v === FORNECEDOR_VAZIO ? '' : v,
          })
        }
      >
        <SelectTrigger className={className || 'h-8 w-full max-w-[14rem] rounded-lg border-0 bg-muted/40 text-xs'}>
          <SelectValue placeholder="Fornecedor..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={FORNECEDOR_VAZIO}>Selecione...</SelectItem>
          {fornecedores.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <FiltrosSugestaoCompra
        filters={filters}
        onFiltersChange={setFilters}
        categorias={categorias}
        fornecedores={fornecedores}
        allTags={allTags}
        unidadesVitrine={unidadesVitrine}
        onLimparFiltros={limparFiltros}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/85">
          {filteredLinhas.length} sugestão(ões)
          {loadStats.linhasGrupo > 0 ? ` · ${loadStats.linhasGrupo} família(s)` : ''}
          {selectedCount > 0 ? ` · ${selectedCount} selecionada(s)` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-2xl bg-muted shrink-0"
            onClick={loadData}
            disabled={isLoading}
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 rounded-2xl gap-1.5"
            disabled={selectedCount === 0}
            onClick={handleQuote}
          >
            <FileText className="w-4 h-4" />
            Cotação
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-11 rounded-2xl gap-1.5"
            disabled={selectedCount === 0}
            onClick={handleGenerate}
          >
            <ShoppingCart className="w-4 h-4" />
            Gerar pedido{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </div>
      </div>

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 px-4 text-center max-w-lg mx-auto">
          <CheckCircle className="w-9 h-9 text-muted-foreground/40" />
          <p className="text-sm text-foreground/90 font-medium">Nenhuma sugestão no momento</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {loadStats.totalAtivos > 0 ? (
              <>
                {loadStats.totalAtivos} produto(s) lidos do catálogo.
                {loadStats.semPontoPedido > 0 ? (
                  <> {loadStats.semPontoPedido} sem ponto de pedido (estoque mínimo) — atualize no Catálogo.</>
                ) : null}
                {loadStats.abaixoPontoPedido === 0 && loadStats.semPontoPedido < loadStats.totalAtivos ? (
                  <> Nenhum está com estoque abaixo do ponto de pedido cadastrado.</>
                ) : null}
              </>
            ) : (
              <>Não foi possível carregar produtos do catálogo. Tente atualizar a página.</>
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 rounded-2xl"
            asChild
          >
            <Link to={createPageUrl('Produtos')}>
              Atualizar pontos de pedido no Catálogo
            </Link>
          </Button>
        </div>
      ) : filteredLinhas.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhum item corresponde aos filtros.
        </div>
      ) : (
        <div className="min-w-0 w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={
                  filteredLinhas.length > 0 && filteredLinhas.every((l) => selectedItems[l.id])
                }
                onCheckedChange={handleSelectAll}
              />
              Selecionar visíveis ({filteredLinhas.length})
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                    <TrendingUp className="w-3.5 h-3.5 rotate-90" />
                    <span className="max-w-[160px] truncate">{currentSort?.label || 'Ordenar'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
                  <DropdownMenuLabel className="text-xs">Ordenar sugestões</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {CATALOG_SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => handleSortOrderChange(opt.id)}
                      className={sortOrder === opt.id ? 'font-semibold' : ''}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <ProdutosTreeByCategoryToggle
                checked={groupByCategory}
                onChange={handleGroupByCategoryChange}
                className="h-8"
              />
              <div className="flex items-center gap-1 rounded-xl bg-muted px-2 h-8">
                <span className="text-[10px] text-muted-foreground">nível</span>
                <LevelControl level={treeLevel} onChange={handleTreeLevelChange} />
              </div>
            </div>
          </div>
          <SugestaoCompraTreeGrid
            produtos={treeProdutos}
            linhaLookup={linhaLookup}
            agruparHierarquia={agruparHierarquia}
            sortOrder={sortOrder}
            groupByCategory={groupByCategory}
            masterLevel={treeLevel === TREE_GRID_EXPAND_ALL_LEVEL ? TREE_GRID_EXPAND_ALL_LEVEL : treeLevel}
            selectedItems={selectedItems}
            onToggleSelected={(id, checked) =>
              setSelectedItems((prev) =>
                checked ? { ...prev, [id]: true } : { ...prev, [id]: undefined },
              )
            }
            sugestaoDisplayLinha={sugestaoDisplayLinha}
            renderFornecedorSelect={(linha) =>
              renderFornecedorSelect(linha, 'h-8 w-full max-w-[14rem] rounded-md border-0 bg-muted/30 text-xs')
            }
          />
        </div>
      )}
    </div>
  );
}
