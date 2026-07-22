import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosSugestaoCompra from '@/components/compras/FiltrosSugestaoCompra';
import SugestaoCompraLinha from '@/components/compras/SugestaoCompraLinha';
import SugestaoCompraLinhaGrupo from '@/components/compras/SugestaoCompraLinhaGrupo';
import { ShoppingCart, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/components/utils';
import { dataHoje } from '@/components/utils/dateUtils';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';
import { produtoMatchesAbcdMultiFilter } from '@/lib/catalogAbcdEnrichment';
import { calcularSugestaoCompraProduto } from '@/lib/calcularSugestaoCompra';
import {
  buildLinhasSugestaoCompra,
  distribuirQuantidadeGrupo,
} from '@/lib/calcularSugestaoCompraHierarquia';
import { fetchPedidosVenda90d } from '@/lib/fetchPedidosVenda90d';
import {
  fetchMovimentacoesEstoque90d,
  groupMovimentacoesPorProduto,
} from '@/lib/fetchMovimentacoesEstoque90d';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';

const FORNECEDOR_VAZIO = '__none__';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAbcd, setSelectedAbcd] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [hidePending, setHidePending] = useState(false);
  const [roundingMode, setRoundingMode] = useState('auto');
  const [agruparHierarquia, setAgruparHierarquia] = useState(true);
  const [loadStats, setLoadStats] = useState({
    totalAtivos: 0,
    elegiveis: 0,
    semVenda90d: 0,
    semDiasEstoque: 0,
    linhasGrupo: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const calcContextRef = useRef({ pedidos: [], movsPorProduto: {}, prods: [], pending: {} });

  const allTags = useMemo(() => {
    const tags = new Set();
    linhas.forEach((l) => l.skus.forEach((p) => p.tags?.forEach((t) => tags.add(t))));
    return [...tags].sort();
  }, [linhas]);

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
      });
    },
    [agruparHierarquia, roundingMode],
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, forn, cats, pedidos, pedidosCompra, movimentacoes] = await Promise.all([
        base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
        base44.entities.Terceiro.list(),
        base44.entities.Categoria.list(),
        fetchPedidosVenda90d(),
        base44.entities.PedidoCompra.filter({
          status: ['Enviado', 'Aguardando Recepção', 'Aguardando Embarque', 'Recebido Parcialmente'],
        }),
        fetchMovimentacoesEstoque90d(),
      ]);

      const pending = {};
      pedidosCompra.forEach((p) => {
        p.itens?.forEach((i) => {
          pending[i.produto_id] = (pending[i.produto_id] || 0) + (i.quantidade || 0);
        });
      });

      const movsPorProduto = groupMovimentacoesPorProduto(movimentacoes);
      calcContextRef.current = { pedidos, movsPorProduto, prods, pending };

      let semVenda90d = 0;
      let semDiasEstoque = 0;
      prods.forEach((p) => {
        const s = calcularSugestaoCompraProduto(p, pedidos, movsPorProduto[p.id] || [], {
          roundingMode,
        });
        if (s.motivo === 'sem_venda') semVenda90d += 1;
        if (s.motivo === 'sem_dias_com_estoque') semDiasEstoque += 1;
      });

      const novasLinhas = recomputarLinhas(prods, pedidos, movsPorProduto, pending);

      setLoadStats({
        totalAtivos: prods.length,
        elegiveis: novasLinhas.length,
        semVenda90d,
        semDiasEstoque,
        linhasGrupo: novasLinhas.filter((l) => l.tipo === 'grupo').length,
      });
      setLinhas(novasLinhas);
      setFornecedores(forn);
      setCategorias(cats);
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
    setLinhas(
      recomputarLinhas(ctx.prods, ctx.pedidos, ctx.movsPorProduto, ctx.pending, {
        agruparHierarquia,
        roundingMode,
      }),
    );
  }, [roundingMode, agruparHierarquia, recomputarLinhas]);

  const filteredLinhas = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return linhas.filter((linha) => {
      if (hidePending && linha.quantidade_pendente > 0) return false;
      if (s && !linha.searchText.includes(s)) return false;
      if (categoryFilter !== 'all' && !linha.skus.some((p) => p.categoria_id === categoryFilter)) {
        return false;
      }
      if (
        supplierFilter !== 'all' &&
        !linha.skus.some((p) => p.fornecedor_padrao_id === supplierFilter)
      ) {
        return false;
      }
      if (
        selectedTags.length > 0 &&
        !linha.skus.some((p) => selectedTags.every((t) => p.tags?.includes(t)))
      ) {
        return false;
      }
      if (
        selectedAbcd.length > 0 &&
        !linha.skus.some((p) => produtoMatchesAbcdMultiFilter(p, selectedAbcd))
      ) {
        return false;
      }
      return true;
    });
  }, [linhas, searchTerm, categoryFilter, supplierFilter, selectedTags, selectedAbcd, hidePending]);

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
    setCategoryFilter('all');
    setSupplierFilter('all');
    setSelectedTags([]);
    setSelectedAbcd([]);
    setTagSearch('');
    setHidePending(false);
    setRoundingMode('auto');
    setAgruparHierarquia(true);
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
        searchTerm={searchTerm}
        onSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
        categorias={categorias}
        supplierFilter={supplierFilter}
        onSupplierFilter={setSupplierFilter}
        fornecedores={fornecedores}
        selectedTags={selectedTags}
        onSelectedTags={setSelectedTags}
        selectedAbcd={selectedAbcd}
        onSelectedAbcd={setSelectedAbcd}
        allTags={allTags}
        tagSearch={tagSearch}
        onTagSearch={setTagSearch}
        hidePending={hidePending}
        onHidePending={setHidePending}
        roundingMode={roundingMode}
        onRoundingMode={setRoundingMode}
        agruparHierarquia={agruparHierarquia}
        onAgruparHierarquia={setAgruparHierarquia}
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
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
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
                {loadStats.totalAtivos} produto(s) analisado(s) nos últimos 90 dias.
                {loadStats.semVenda90d > 0 ? <> {loadStats.semVenda90d} sem venda no período.</> : null}
                {loadStats.semDiasEstoque > 0 ? (
                  <> {loadStats.semDiasEstoque} sem dias com estoque para calcular a média.</>
                ) : null}
                {loadStats.elegiveis === 0 &&
                loadStats.semVenda90d === 0 &&
                loadStats.semDiasEstoque === 0 ? (
                  <> Nenhum está abaixo do ponto de pedido (média × 1,5 × lead time).</>
                ) : null}
              </>
            ) : (
              <>Não foi possível carregar produtos ou o catálogo está vazio.</>
            )}
          </p>
        </div>
      ) : filteredLinhas.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhum item corresponde aos filtros.
        </div>
      ) : (
        <div className="min-w-0 w-full space-y-2">
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={
                  filteredLinhas.length > 0 && filteredLinhas.every((l) => selectedItems[l.id])
                }
                onCheckedChange={handleSelectAll}
              />
              Selecionar visíveis
            </label>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Qtd sugerida</span>
          </div>
          <P38MobileLineList allViewports className="rounded-none border-0 shadow-none bg-transparent">
            {filteredLinhas.map((linha, index) => {
              const LinhaComp = linha.tipo === 'grupo' ? SugestaoCompraLinhaGrupo : SugestaoCompraLinha;
              const props =
                linha.tipo === 'grupo'
                  ? {
                      linha,
                      disp: sugestaoDisplayLinha(linha),
                    }
                  : {
                      produto: linha.produto,
                      sugestao: linha.sugestao,
                      disp: sugestaoDisplayLinha(linha),
                    };

              return (
                <LinhaComp
                  key={linha.id}
                  {...props}
                  selecionado={!!selectedItems[linha.id]}
                  striped={index % 2 === 1}
                  onToggleSelecionado={(c) =>
                    setSelectedItems((prev) =>
                      c ? { ...prev, [linha.id]: true } : { ...prev, [linha.id]: undefined },
                    )
                  }
                  fornecedorSelect={renderFornecedorSelect(
                    linha,
                    'h-8 w-full max-w-[16rem] rounded-md border-0 bg-muted/30 text-xs',
                  )}
                />
              );
            })}
          </P38MobileLineList>
        </div>
      )}
    </div>
  );
}
