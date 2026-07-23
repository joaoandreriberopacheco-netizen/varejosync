import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import FornecedorLinhaSelect from '@/components/compras/FornecedorLinhaSelect';
import FiltrosSugestaoCompra, {
  DEFAULT_SUGESTAO_COMPRA_FILTERS,
} from '@/components/compras/FiltrosSugestaoCompra';
import SugestaoCompraTreeGrid, { TREE_GRID_EXPAND_ALL_LEVEL } from '@/components/compras/SugestaoCompraTreeGrid';
import SugestaoCompraMobileList from '@/components/compras/SugestaoCompraMobileList';
import SugestaoCompraMobileToolbar from '@/components/compras/SugestaoCompraMobileToolbar';
import SugestaoCompraDesktopToolbar from '@/components/compras/SugestaoCompraDesktopToolbar';
import { ShoppingCart, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/components/utils';
import { dataHoje } from '@/components/utils/dateUtils';
import { cn } from '@/components/utils';
import { useCompactShell } from '@/hooks/use-breakpoint';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';
import {
  buildLinhasSugestaoCompra,
  distribuirQuantidadeGrupo,
} from '@/lib/calcularSugestaoCompraHierarquia';
import { fetchPedidosVenda90d, fetchDadosVendaAbcd90d } from '@/lib/fetchPedidosVenda90d';
import { buildCatalogSalesVelocityMap } from '@/lib/catalogSalesVelocity';
import { fetchProdutosAtivos } from '@/lib/fetchProdutosAtivos';
import { withRateLimitRetry } from '@/lib/p38ApiErrors';
import {
  buildSugestaoCompraLinhaLookup,
  enrichSugestaoLinhasComAbcd,
  extractProdutosFromSugestaoLinhas,
} from '@/lib/sugestaoCompraTree';
import {
  DEFAULT_SUGESTAO_COLUMN_SORT,
  SUGESTAO_COMPRA_SORT_COLUMNS,
  sortSugestaoCompraLinhasByColumn,
} from '@/lib/sugestaoCompraColumnSort';
import { buildUltimoFornecedorPorProduto } from '@/lib/buildUltimoFornecedorPorProduto';
import { buildPendenteAprovadoFinanceiroPorProduto, buildRecebidosPorPedidoProdutoFromEmbarques } from '@/lib/sugestaoCompraEstoquePendente';
import {
  collectSugestaoTags,
  collectSugestaoVitrineUnits,
  countActiveSugestaoCompraFilters,
  filterSugestaoCompraLinhas,
  linhaAbaixoPontoFuturo,
} from '@/lib/filterSugestaoCompraLinhas';
const SUGESTAO_TREE_LEVEL_KEY = 'sugestaoCompra.treeLevel';
const SUGESTAO_GROUP_CATEGORY_KEY = 'sugestaoCompra.groupByCategory';
const SUGESTAO_COLUMN_SORT_KEY = 'sugestaoCompra.columnSort';

function readColumnSort() {
  try {
    const raw = localStorage.getItem(SUGESTAO_COLUMN_SORT_KEY);
    if (!raw) return { ...DEFAULT_SUGESTAO_COLUMN_SORT };
    const parsed = JSON.parse(raw);
    if (!SUGESTAO_COMPRA_SORT_COLUMNS.some((c) => c.id === parsed?.column)) {
      return { ...DEFAULT_SUGESTAO_COLUMN_SORT };
    }
    return {
      column: parsed.column,
      direction: parsed.direction === 'desc' ? 'desc' : 'asc',
    };
  } catch {
    return { ...DEFAULT_SUGESTAO_COLUMN_SORT };
  }
}

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

function fornecedorPadraoLinha(linha, ultimoFornecedorPorProduto = {}) {
  for (const produto of linha.skus || []) {
    const ultimo = ultimoFornecedorPorProduto[produto.id];
    if (ultimo) return ultimo;
  }
  const ids = linha.skus.map((p) => p.fornecedor_padrao_id).filter(Boolean);
  if (!ids.length) return '';
  const freq = {};
  ids.forEach((id) => {
    freq[id] = (freq[id] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function buildFornecedorInicialPorLinha(linhas, ultimoFornecedorPorProduto = {}) {
  const map = {};
  linhas.forEach((linha) => {
    const id = fornecedorPadraoLinha(linha, ultimoFornecedorPorProduto);
    if (id) map[linha.id] = id;
  });
  return map;
}

export default function SugestaoCompra({ onStatsChange }) {
  const [linhas, setLinhas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [fornecedorPorLinha, setFornecedorPorLinha] = useState({});
  const [quantidadeOverrideBase, setQuantidadeOverrideBase] = useState({});

  const [filters, setFilters] = useState(() => ({ ...DEFAULT_SUGESTAO_COMPRA_FILTERS }));
  const { roundingMode, agruparHierarquia } = filters;
  const [columnSort, setColumnSort] = useState(readColumnSort);
  const [treeLevel, setTreeLevel] = useState(readSugestaoTreeLevel);
  const [groupByCategory, setGroupByCategory] = useState(readSugestaoGroupByCategory);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [loadStats, setLoadStats] = useState({
    totalAtivos: 0,
    elegiveis: 0,
    semVenda: 0,
    abaixoPontoFuturo: 0,
    linhasGrupo: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useCompactShell();
  const calcContextRef = useRef({
    pedidos: [],
    movsPorProduto: {},
    prods: [],
    pending: {},
    vendasDados: null,
    salesVelocityMap: {},
    ultimoFornecedorPorProduto: {},
  });
  const abcdLoadRef = useRef(0);

  const allTags = useMemo(() => collectSugestaoTags(linhas), [linhas]);
  const unidadesVitrine = useMemo(() => collectSugestaoVitrineUnits(linhas), [linhas]);

  const produtoParaCompra = (produto) => buildSnapshotExibicaoComercial(produto);

  const calcQuantityLinha = useCallback((linha) => {
    if (quantidadeOverrideBase[linha.id] != null) {
      return quantidadeOverrideBase[linha.id];
    }
    return linha.sugestao?.quantidade_sugerida_base || 0;
  }, [quantidadeOverrideBase]);

  const resolveFornecedorIdLinha = useCallback((linha) => {
    return fornecedorPorLinha[linha.id]
      || fornecedorPadraoLinha(linha, calcContextRef.current.ultimoFornecedorPorProduto);
  }, [fornecedorPorLinha]);

  const filterOptions = useMemo(
    () => ({
      resolveFornecedorId: resolveFornecedorIdLinha,
      quantidadeBaseLinha: calcQuantityLinha,
    }),
    [resolveFornecedorIdLinha, calcQuantityLinha],
  );

  const sortCtx = useMemo(
    () => ({
      quantidadeBase: calcQuantityLinha,
      fornecedorNome: (linha) => {
        const id = resolveFornecedorIdLinha(linha);
        return fornecedores.find((f) => f.id === id)?.nome || '';
      },
    }),
    [calcQuantityLinha, resolveFornecedorIdLinha, fornecedores],
  );

  const handleQuantidadeLinhaChange = useCallback((linha, qtyComercial) => {
    const snap = produtoParaCompra(linha.produto);
    const disp = resolveCommercialDisplay(
      snap,
      0,
      linha.produto.unidade_principal || 'UN',
    );
    const fator = disp.fator_conversao || 1;
    const parsed = Number(String(qtyComercial).replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const base = parsed * fator;
    setQuantidadeOverrideBase((prev) => ({
      ...prev,
      [linha.id]: base,
    }));
  }, []);

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
      const salesVelocityMap = opts.salesVelocityMap
        ?? buildCatalogSalesVelocityMap(prods, pedidos);
      return buildLinhasSugestaoCompra(prods, pedidos, movsPorProduto, pending, {
        agruparHierarquia: agrupar,
        roundingMode: round,
        fonte: 'velocidade',
        salesVelocityMap,
        incluirTodoCatalogo: true,
        catalogoCompleto: true,
        considerarPedidosAprovadosEstoque: opts.considerarPedidosAprovadosEstoque === true,
      });
    },
    [agruparHierarquia, roundingMode],
  );

  const aplicarLinhas = useCallback((prods, pedidos, movsPorProduto, pending, opts = {}) => {
    const novasLinhas = recomputarLinhas(prods, pedidos, movsPorProduto, pending, opts);
    const abaixoPonto = novasLinhas.filter(linhaAbaixoPontoFuturo).length;
    const semVenda = novasLinhas.filter((l) => !l.sugestao?.media_30d_texto).length;

    setLoadStats({
      totalAtivos: prods.length,
      elegiveis: abaixoPonto,
      comGiro: novasLinhas.filter((l) => l.sugestao?.media_dia > 0 || l.sugestao?.media_30d_texto).length,
      semVenda,
      abaixoPontoFuturo: abaixoPonto,
      linhasGrupo: novasLinhas.filter((l) => l.tipo === 'grupo').length,
    });
    setLinhas(novasLinhas);
    return novasLinhas;
  }, [recomputarLinhas]);

  const loadData = async () => {
    setIsLoading(true);
    const abcdLoadId = ++abcdLoadRef.current;
    try {
      const [prods, forn, cats] = await Promise.all([
        fetchProdutosAtivos(),
        base44.entities.Terceiro.list(),
        base44.entities.Categoria.list(),
      ]);

      setFornecedores(forn);
      setCategorias(cats);

      const movsPorProduto = {};
      const pending = {};
      const salesVelocityMapVazio = buildCatalogSalesVelocityMap(prods, []);
      calcContextRef.current = {
        pedidos: [],
        movsPorProduto,
        prods,
        pending,
        salesVelocityMap: salesVelocityMapVazio,
        ultimoFornecedorPorProduto: {},
      };

      const linhasIniciais = aplicarLinhas(prods, [], movsPorProduto, pending, {
        salesVelocityMap: salesVelocityMapVazio,
      });
      setQuantidadeOverrideBase({});
      setFornecedorPorLinha(buildFornecedorInicialPorLinha(linhasIniciais));
    } catch (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }

    const ctx = calcContextRef.current;
    if (!ctx.prods?.length) return;

    const atualizarComPedidos = (pedidos, extra = {}) => {
      const salesVelocityMap = buildCatalogSalesVelocityMap(ctx.prods, pedidos);
      calcContextRef.current = {
        ...calcContextRef.current,
        pedidos,
        salesVelocityMap,
        ...extra,
      };
      const next = aplicarLinhas(
        ctx.prods,
        pedidos,
        ctx.movsPorProduto,
        extra.pending ?? ctx.pending,
        {
          salesVelocityMap,
          considerarPedidosAprovadosEstoque: extra.considerarPedidosAprovadosEstoque === true,
        },
      );
      if (calcContextRef.current.vendasDados) {
        setLinhas(enrichSugestaoLinhasComAbcd(next, ctx.prods, calcContextRef.current.vendasDados));
      }
    };

    Promise.all([
      base44.entities.PedidoCompra.filter({
        status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente', 'Aprovado', 'Despachado', 'Em Recepção'],
      }).catch(() => []),
      base44.entities.PedidoCompra.list('-created_date', 250).catch(() => []),
      base44.entities.Embarque.list('-created_date', 600).catch(() => []),
    ]).then(([pedidosAbertos, pedidosRecentes, embarquesCompra]) => {
      const pedidosPorId = new Map();
      [...pedidosAbertos, ...pedidosRecentes].forEach((p) => {
        if (p?.id) pedidosPorId.set(p.id, p);
      });
      const pedidosCompra = [...pedidosPorId.values()];
      const recebidosPorPedidoProduto = buildRecebidosPorPedidoProdutoFromEmbarques(embarquesCompra);
      const pendingMap = buildPendenteAprovadoFinanceiroPorProduto(
        pedidosCompra,
        recebidosPorPedidoProduto,
      );
      const ultimoFornecedorPorProduto = buildUltimoFornecedorPorProduto(pedidosRecentes);
      calcContextRef.current = {
        ...calcContextRef.current,
        pedidosCompra,
        pending: pendingMap,
        ultimoFornecedorPorProduto,
      };
      setFornecedorPorLinha((prev) => {
        const merged = { ...prev };
        setLinhas((currentLinhas) => {
          currentLinhas.forEach((l) => {
            if (!merged[l.id]) {
              const id = fornecedorPadraoLinha(l, ultimoFornecedorPorProduto);
              if (id) merged[l.id] = id;
            }
          });
          return currentLinhas;
        });
        return merged;
      });
      if (calcContextRef.current.pedidos?.length) {
        atualizarComPedidos(calcContextRef.current.pedidos, {
          pending: pendingMap,
          ultimoFornecedorPorProduto,
          considerarPedidosAprovadosEstoque: filters.considerarPedidosAprovadosEstoque === true,
        });
      } else {
        aplicarLinhas(
          ctx.prods,
          [],
          calcContextRef.current.movsPorProduto,
          pendingMap,
          {
            salesVelocityMap: calcContextRef.current.salesVelocityMap,
            considerarPedidosAprovadosEstoque: filters.considerarPedidosAprovadosEstoque === true,
          },
        );
      }
    });

    withRateLimitRetry(() => fetchPedidosVenda90d(), {
      maxAttempts: 3,
      baseDelayMs: 800,
    })
      .then((pedidos) => {
        atualizarComPedidos(pedidos);
      })
      .catch(() => {
        toast({
          title: 'Vendas ainda não carregadas',
          description: 'O catálogo já está visível. Média 30d e ponto futuro atualizam ao reconectar.',
          variant: 'destructive',
        });
      });

    withRateLimitRetry(() => fetchDadosVendaAbcd90d(), {
      maxAttempts: 3,
      baseDelayMs: 800,
    })
      .then((vendasDados) => {
        if (abcdLoadId !== abcdLoadRef.current) return;
        const pedidos = vendasDados.pedidos90d?.length
          ? vendasDados.pedidos90d
          : calcContextRef.current.pedidos;
        const salesVelocityMap = buildCatalogSalesVelocityMap(ctx.prods, pedidos);
        calcContextRef.current = {
          ...calcContextRef.current,
          pedidos,
          vendasDados,
          salesVelocityMap,
        };
        const next = recomputarLinhas(
          ctx.prods,
          pedidos,
          calcContextRef.current.movsPorProduto,
          calcContextRef.current.pending,
          {
            salesVelocityMap,
            considerarPedidosAprovadosEstoque: filters.considerarPedidosAprovadosEstoque === true,
          },
        );
        setLinhas(enrichSugestaoLinhasComAbcd(next, ctx.prods, vendasDados));
      })
      .catch(() => {
        /* ABCD ao vivo é opcional */
      });
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
      salesVelocityMap: ctx.salesVelocityMap,
      considerarPedidosAprovadosEstoque: filters.considerarPedidosAprovadosEstoque === true,
    });
    if (ctx.vendasDados) {
      next = enrichSugestaoLinhasComAbcd(next, ctx.prods, ctx.vendasDados);
    }
    setLinhas(next);
  }, [roundingMode, agruparHierarquia, filters.considerarPedidosAprovadosEstoque, recomputarLinhas]);

  const filteredLinhas = useMemo(
    () => filterSugestaoCompraLinhas(linhas, filters, filterOptions),
    [linhas, filters, filterOptions],
  );

  const sortedLinhas = useMemo(
    () => sortSugestaoCompraLinhasByColumn(filteredLinhas, columnSort, sortCtx),
    [filteredLinhas, columnSort, sortCtx],
  );

  const mobileLinhas = sortedLinhas;

  const treeProdutos = useMemo(
    () => extractProdutosFromSugestaoLinhas(filteredLinhas),
    [filteredLinhas],
  );
  const linhaLookup = useMemo(
    () => buildSugestaoCompraLinhaLookup(filteredLinhas),
    [filteredLinhas],
  );

  const activeFilterCount = useMemo(
    () => countActiveSugestaoCompraFilters(filters),
    [filters],
  );

  const handleToggleSomenteAbaixo = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      somenteAbaixoPontoFuturo: !prev.somenteAbaixoPontoFuturo,
    }));
  }, []);

  const handleColumnSort = useCallback((column) => {
    setColumnSort((prev) => {
      const next = prev?.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' };
      try {
        localStorage.setItem(SUGESTAO_COLUMN_SORT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleMobileSortColumn = handleColumnSort;

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
  const allVisibleSelected =
    filteredLinhas.length > 0 && filteredLinhas.every((l) => selectedItems[l.id]);
  const someVisibleSelected = filteredLinhas.some((l) => selectedItems[l.id]);

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

  const fornecedorLinha = (linha) => resolveFornecedorIdLinha(linha);

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

  const renderFornecedorSelect = (linha, className = '') => (
    <FornecedorLinhaSelect
      value={fornecedorLinha(linha)}
      onChange={(v) =>
        setFornecedorPorLinha({
          ...fornecedorPorLinha,
          [linha.id]: v,
        })
      }
      fornecedores={fornecedores}
      className={className || 'h-8 max-w-[14rem] rounded-lg text-xs'}
    />
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 min-w-0', isMobile && 'pb-28')}>
      <FiltrosSugestaoCompra
        filters={filters}
        onFiltersChange={setFilters}
        categorias={categorias}
        fornecedores={fornecedores}
        allTags={allTags}
        unidadesVitrine={unidadesVitrine}
        onLimparFiltros={limparFiltros}
        drawerOpen={isMobile ? filtersDrawerOpen : undefined}
        onDrawerOpenChange={isMobile ? setFiltersDrawerOpen : undefined}
      />

      <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', isMobile && 'gap-2')}>
        <p className={cn('text-sm text-foreground/85', isMobile && 'text-xs leading-relaxed')}>
          {isMobile ? (
            <>
              <span className="font-medium text-foreground">{filteredLinhas.length}</span> itens
              {selectedCount > 0 ? ` · ${selectedCount} selecionados` : ''}
            </>
          ) : (
            <>
              {filteredLinhas.length} item(ns)
              {loadStats.totalAtivos > 0 ? ` · ${loadStats.totalAtivos} no catálogo` : ''}
              {loadStats.abaixoPontoFuturo > 0 ? ` · ${loadStats.abaixoPontoFuturo} abaixo do ponto futuro` : ''}
              {loadStats.linhasGrupo > 0 ? ` · ${loadStats.linhasGrupo} família(s)` : ''}
              {selectedCount > 0 ? ` · ${selectedCount} selecionada(s)` : ''}
            </>
          )}
        </p>
        {!isMobile ? (
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
        ) : null}
      </div>

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 px-4 text-center max-w-lg mx-auto">
          <CheckCircle className="w-9 h-9 text-muted-foreground/40" />
          <p className="text-sm text-foreground/90 font-medium">Nenhuma sugestão no momento</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {loadStats.totalAtivos > 0 ? (
              <>
                {loadStats.totalAtivos} produto(s) no catálogo.
                {loadStats.comGiro === 0
                  ? ' Aguardando histórico de vendas para calcular média 30d e ponto futuro.'
                  : ` ${loadStats.comGiro} com giro nos últimos 60 dias.`}
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
              Ver catálogo e histórico de vendas
            </Link>
          </Button>
        </div>
      ) : filteredLinhas.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhum item corresponde aos filtros.
        </div>
      ) : (
        <div className="min-w-0 w-full space-y-3">
          {isMobile ? (
            <SugestaoCompraMobileToolbar
              filteredCount={filteredLinhas.length}
              selectedCount={selectedCount}
              allSelected={filteredLinhas.length > 0 && filteredLinhas.every((l) => selectedItems[l.id])}
              onSelectAll={handleSelectAll}
              columnSort={columnSort}
              onSortColumn={handleMobileSortColumn}
              activeFilterCount={activeFilterCount}
              onOpenFilters={() => setFiltersDrawerOpen(true)}
              somenteAbaixoPontoFuturo={filters.somenteAbaixoPontoFuturo === true}
              onToggleSomenteAbaixo={handleToggleSomenteAbaixo}
              onRefresh={loadData}
              isLoading={isLoading}
            />
          ) : (
            <SugestaoCompraDesktopToolbar
              filteredCount={filteredLinhas.length}
              selectedCount={selectedCount}
              allSelected={allVisibleSelected}
              someSelected={someVisibleSelected}
              onSelectAllVisible={handleSelectAll}
              columnSort={columnSort}
              onSortColumn={handleMobileSortColumn}
              groupByCategory={groupByCategory}
              onGroupByCategoryChange={handleGroupByCategoryChange}
              treeLevel={treeLevel}
              onTreeLevelChange={handleTreeLevelChange}
            />
          )}
          {isMobile ? (
            <SugestaoCompraMobileList
              linhas={mobileLinhas}
              selectedItems={selectedItems}
              onToggleSelected={(id, checked) =>
                setSelectedItems((prev) =>
                  checked ? { ...prev, [id]: true } : { ...prev, [id]: undefined },
                )
              }
              sugestaoDisplayLinha={sugestaoDisplayLinha}
              onQuantidadeLinhaChange={handleQuantidadeLinhaChange}
              renderFornecedorSelect={(linha) =>
                renderFornecedorSelect(linha, 'h-11 w-full rounded-xl border-0 bg-muted/60 text-sm')
              }
            />
          ) : (
            <SugestaoCompraTreeGrid
              produtos={treeProdutos}
              linhaLookup={linhaLookup}
              agruparHierarquia={agruparHierarquia}
              columnSort={columnSort}
              onColumnSort={handleColumnSort}
              sortCtx={sortCtx}
              groupByCategory={groupByCategory}
              masterLevel={treeLevel === TREE_GRID_EXPAND_ALL_LEVEL ? TREE_GRID_EXPAND_ALL_LEVEL : treeLevel}
              selectedItems={selectedItems}
              onToggleSelected={(id, checked) =>
                setSelectedItems((prev) =>
                  checked ? { ...prev, [id]: true } : { ...prev, [id]: undefined },
                )
              }
              allVisibleSelected={allVisibleSelected}
              someVisibleSelected={someVisibleSelected}
              onSelectAllVisible={handleSelectAll}
              sugestaoDisplayLinha={sugestaoDisplayLinha}
              onQuantidadeLinhaChange={handleQuantidadeLinhaChange}
              renderFornecedorSelect={(linha) =>
                renderFornecedorSelect(linha, 'h-8 w-full max-w-[14rem] rounded-md border-0 bg-muted/30 text-xs')
              }
            />
          )}
        </div>
      )}

      {isMobile ? (
        <div className="fixed inset-x-0 bottom-[var(--p38-bottom-nav-total,0px)] z-40 border-t border-border/40 bg-card/95 backdrop-blur-sm px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]">
          <div className="flex gap-2 max-w-7xl mx-auto">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-2xl gap-2 text-sm font-medium"
              disabled={selectedCount === 0}
              onClick={handleQuote}
            >
              <FileText className="w-4 h-4 shrink-0" />
              Cotação
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-2xl gap-2 text-sm font-medium"
              disabled={selectedCount === 0}
              onClick={handleGenerate}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Pedido{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
