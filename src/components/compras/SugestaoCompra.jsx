import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FiltrosSugestaoCompra from '@/components/compras/FiltrosSugestaoCompra';
import SugestaoCompraLinha from '@/components/compras/SugestaoCompraLinha';
import { ShoppingCart, RefreshCw, CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/components/utils';
import { dataHoje } from '@/components/utils/dateUtils';
import { buildSnapshotExibicaoComercial, resolveCommercialDisplay } from '@/lib/productUnits';
import { calcularSugestaoCompraProduto } from '@/lib/calcularSugestaoCompra';
import { fetchPedidosVenda90d } from '@/lib/fetchPedidosVenda90d';
import {
  fetchMovimentacoesEstoque90d,
  groupMovimentacoesPorProduto,
} from '@/lib/fetchMovimentacoesEstoque90d';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';

const FORNECEDOR_VAZIO = '__none__';

export default function SugestaoCompra({ onStatsChange }) {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({});
  const [fornecedorPorProduto, setFornecedorPorProduto] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [hidePending, setHidePending] = useState(false);
  const [roundingMode, setRoundingMode] = useState('auto');
  const [loadStats, setLoadStats] = useState({
    totalAtivos: 0,
    elegiveis: 0,
    semVenda90d: 0,
    semDiasEstoque: 0,
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const calcContextRef = useRef({ pedidos: [], movsPorProduto: {} });
  const dadosCarregadosRef = useRef(false);

  const allTags = useMemo(() => {
    const tags = new Set();
    produtos.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }, [produtos]);

  const produtoParaCompra = (produto) => buildSnapshotExibicaoComercial(produto);

  const calcQuantity = (produto) => {
    const base =
      produto._sugestao?.quantidade_sugerida_base ??
      calcularSugestaoCompraProduto(produto, [], [], { roundingMode }).quantidade_sugerida_base;
    return base || 0;
  };

  const sugestaoDisplay = (produto) => {
    const qBase = calcQuantity(produto);
    return resolveCommercialDisplay(
      produtoParaCompra(produto),
      qBase,
      produto.unidade_principal || 'UN',
    );
  };

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
      calcContextRef.current = { pedidos, movsPorProduto };
      dadosCarregadosRef.current = true;

      let semVenda90d = 0;
      let semDiasEstoque = 0;

      const elegiveis = prods
        .map((p) => {
          const sugestao = calcularSugestaoCompraProduto(
            p,
            pedidos,
            movsPorProduto[p.id] || [],
            { roundingMode },
          );
          if (sugestao.motivo === 'sem_venda') semVenda90d += 1;
          if (sugestao.motivo === 'sem_dias_com_estoque') semDiasEstoque += 1;
          return {
            ...p,
            _sugestao: sugestao,
            quantidade_pendente: pending[p.id] || 0,
          };
        })
        .filter((p) => p._sugestao?.elegivel)
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setLoadStats({
        totalAtivos: prods.length,
        elegiveis: elegiveis.length,
        semVenda90d,
        semDiasEstoque,
      });
      setProdutos(elegiveis);
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
    if (!dadosCarregadosRef.current) return;
    const { pedidos, movsPorProduto } = calcContextRef.current;
    setProdutos((prev) => {
      if (!prev.length) return prev;
      return prev.map((p) => ({
        ...p,
        _sugestao: calcularSugestaoCompraProduto(
          p,
          pedidos,
          movsPorProduto[p.id] || [],
          { roundingMode },
        ),
      }));
    });
  }, [roundingMode]);

  const filteredProducts = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return produtos.filter((p) => {
      if (hidePending && p.quantidade_pendente > 0) return false;
      if (s && !p.nome.toLowerCase().includes(s)) return false;
      if (categoryFilter !== 'all' && p.categoria_id !== categoryFilter) return false;
      if (supplierFilter !== 'all' && p.fornecedor_padrao_id !== supplierFilter) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => p.tags?.includes(t))) return false;
      return true;
    });
  }, [produtos, searchTerm, categoryFilter, supplierFilter, selectedTags, hidePending]);

  const selectedCount = Object.keys(selectedItems).length;

  useEffect(() => {
    onStatsChange?.({
      total: filteredProducts.length,
      selected: selectedCount,
      catalogo: produtos.length,
      ...loadStats,
    });
  }, [filteredProducts.length, selectedCount, produtos.length, loadStats, onStatsChange]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const all = {};
      filteredProducts.forEach((p) => {
        all[p.id] = true;
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
    setTagSearch('');
    setHidePending(false);
    setRoundingMode('auto');
  };

  const handleGenerate = async () => {
    const selected = filteredProducts.filter((p) => selectedItems[p.id]);
    if (selected.length === 0) return;

    const noSupplier = selected.filter((p) => !fornecedorPorProduto[p.id] && !p.fornecedor_padrao_id);
    if (noSupplier.length > 0) {
      toast({
        title: 'Produtos sem fornecedor',
        description: `${noSupplier.length} produto(s) sem fornecedor`,
        variant: 'destructive',
      });
      return;
    }

    const bySupplier = {};
    selected.forEach((p) => {
      const sid = fornecedorPorProduto[p.id] || p.fornecedor_padrao_id;
      const supplier = fornecedores.find((f) => f.id === sid);
      if (!bySupplier[sid]) {
        bySupplier[sid] = { fornecedor_id: sid, fornecedor_nome: supplier?.nome || 'N/A', itens: [] };
      }
      const qBase = calcQuantity(p);
      const snap = produtoParaCompra(p);
      const disp = resolveCommercialDisplay(snap, qBase, p.unidade_principal || 'UN');
      const custoBase = p.preco_custo_calculado || p.valor_compra || 0;
      const custoUnitCompra = custoBase * (disp.fator_conversao || 1);
      bySupplier[sid].itens.push({
        produto_id: p.id,
        produto_nome: p.nome,
        quantidade: disp.quantidade,
        quantidade_base: qBase,
        fator_conversao: disp.fator_conversao,
        unidade: disp.unidade,
        custo_unitario: custoUnitCompra,
        total: qBase * custoBase,
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
    const selected = filteredProducts.filter((p) => selectedItems[p.id]);
    if (selected.length === 0) return;

    try {
      const all = await base44.entities.Cotacao.list();
      const num =
        (all.length > 0 ? Math.max(...all.map((c) => parseInt(c.numero?.split('-')[1] || 0, 10))) : 0) + 1;

      const suppliers = [
        ...new Set(selected.map((p) => fornecedorPorProduto[p.id] || p.fornecedor_padrao_id).filter(Boolean)),
      ];

      await base44.entities.Cotacao.create({
        numero: `COT-${String(num).padStart(5, '0')}`,
        titulo: `Cotação - ${new Date().toLocaleDateString()}`,
        status: 'Rascunho',
        data_abertura: dataHoje(),
        itens: selected.map((p) => {
          const qBase = calcQuantity(p);
          const disp = resolveCommercialDisplay(produtoParaCompra(p), qBase, p.unidade_principal || 'UN');
          return {
            produto_id: p.id,
            produto_nome: p.nome,
            quantidade: disp.quantidade,
            unidade: disp.unidade,
            quantidade_base: qBase,
            fator_conversao: disp.fator_conversao,
          };
        }),
        fornecedores: suppliers.map((id) => {
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

  const renderFornecedorSelect = (produto, className = '') => {
    const value = fornecedorPorProduto[produto.id] || produto.fornecedor_padrao_id || FORNECEDOR_VAZIO;
    return (
      <Select
        value={value}
        onValueChange={(v) =>
          setFornecedorPorProduto({
            ...fornecedorPorProduto,
            [produto.id]: v === FORNECEDOR_VAZIO ? '' : v,
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
        allTags={allTags}
        tagSearch={tagSearch}
        onTagSearch={setTagSearch}
        hidePending={hidePending}
        onHidePending={setHidePending}
        roundingMode={roundingMode}
        onRoundingMode={setRoundingMode}
        onLimparFiltros={limparFiltros}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/85">
          {filteredProducts.length} sugestão(ões)
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

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 px-4 text-center max-w-lg mx-auto">
          <CheckCircle className="w-9 h-9 text-muted-foreground/40" />
          <p className="text-sm text-foreground/90 font-medium">Nenhuma sugestão no momento</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {loadStats.totalAtivos > 0 ? (
              <>
                {loadStats.totalAtivos} produto(s) analisado(s) nos últimos 90 dias.
                {loadStats.semVenda90d > 0 ? (
                  <> {loadStats.semVenda90d} sem venda no período.</>
                ) : null}
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
      ) : filteredProducts.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhum produto corresponde aos filtros.
        </div>
      ) : (
        <div className="min-w-0 w-full space-y-2">
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={
                  filteredProducts.length > 0 && filteredProducts.every((p) => selectedItems[p.id])
                }
                onCheckedChange={handleSelectAll}
              />
              Selecionar visíveis
            </label>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Qtd sugerida</span>
          </div>
          <P38MobileLineList allViewports className="rounded-none border-0 shadow-none bg-transparent">
            {filteredProducts.map((p, index) => (
              <SugestaoCompraLinha
                key={p.id}
                produto={p}
                sugestao={p._sugestao}
                disp={sugestaoDisplay(p)}
                selecionado={!!selectedItems[p.id]}
                striped={index % 2 === 1}
                onToggleSelecionado={(c) =>
                  setSelectedItems((prev) =>
                    c ? { ...prev, [p.id]: true } : { ...prev, [p.id]: undefined },
                  )
                }
                fornecedorSelect={renderFornecedorSelect(
                  p,
                  'h-8 w-full max-w-[16rem] rounded-md border-0 bg-muted/30 text-xs',
                )}
              />
            ))}
          </P38MobileLineList>
        </div>
      )}
    </div>
  );
}
