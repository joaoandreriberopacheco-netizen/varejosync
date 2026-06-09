import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Search, Plus, Minus, Trash2, CheckCircle2, Loader2,
  Package, Boxes, ShoppingCart,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import ProductUnitSelectorDialog from '@/components/produtos/ProductUnitSelectorDialog';
import PinValidationDialog from '@/components/auth/PinValidationDialog';
import ContagemExpressCarrinho from '@/components/estoque/contagem-express/ContagemExpressCarrinho';
import {
  buildCountEntry,
  changeCountEntryUnit,
  formatCountQuantity,
  getCountUnitForEntry,
  getEntryBaseQuantity,
  getEntryDisplayQuantity,
  getGroupDisplayFromBase,
  resolveInventoryProductName,
  updateCountEntryQuantity,
} from '@/lib/inventoryCountUnits';
import { filterAndSortProducts } from '@/components/compras/productMatchingUtils';
import {
  loadContagemExpressDraft,
  saveContagemExpressDraft,
  clearContagemExpressDraft,
  createContagemExpressSessionId,
} from '@/lib/contagemExpressStorage';
import { aplicarContagemExpress, buildComparativoContagem } from '@/lib/contagemExpressApply';
import { toast } from 'sonner';

export default function ContagemExpress() {
  const navigate = useNavigate();
  const buscaRef = useRef(null);

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [itens, setItens] = useState([]);
  const [usuario, setUsuario] = useState(null);

  const [view, setView] = useState('contagem');
  const [busca, setBusca] = useState('');
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [produtoAtivoId, setProdutoAtivoId] = useState(null);
  const [unitSelector, setUnitSelector] = useState({ open: false, itemIdx: null, product: null });

  const [comparativo, setComparativo] = useState([]);
  const [loadingComparativo, setLoadingComparativo] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const draft = loadContagemExpressDraft();
      const sid = draft.sessionId || createContagemExpressSessionId();
      setSessionId(sid);
      setItens(draft.itens || []);

      const [prods, me] = await Promise.all([
        base44.entities.Produto.list('campo_hierarquico_1', 2000),
        base44.auth.me().catch(() => null),
      ]);
      setProdutos(prods);
      setUsuario(me);
      setLoading(false);

      if ((draft.itens || []).length > 0) {
        const last = draft.itens[draft.itens.length - 1];
        if (last?.produto_id) setProdutoAtivoId(last.produto_id);
      }
    };
    init();
  }, []);

  const persistItens = useCallback((novosItens, sid = sessionId) => {
    setItens(novosItens);
    if (sid) saveContagemExpressDraft(sid, novosItens);
  }, [sessionId]);

  useEffect(() => {
    if (!busca.trim()) {
      setProdutosFiltrados([]);
      return;
    }
    setProdutosFiltrados(filterAndSortProducts(produtos, busca));
  }, [busca, produtos]);

  const itensAgrupados = useMemo(() => {
    return itens.reduce((acc, item, idx) => {
      const produto = produtos.find((p) => p.id === item.produto_id);
      const quantidadeBase = getEntryBaseQuantity(item, produto);
      const quantidadeDisplay = getEntryDisplayQuantity(item, produto);
      const unit = getCountUnitForEntry(produto, item);
      const existente = acc.findIndex((a) => a.produto_id === item.produto_id);

      if (existente >= 0) {
        acc[existente].totalBase += quantidadeBase;
        acc[existente].entradas.push({
          idx,
          qtd: quantidadeDisplay,
          unidade: unit.unidade,
          base: quantidadeBase,
        });
      } else {
        acc.push({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          totalBase: quantidadeBase,
          display: getGroupDisplayFromBase(produto, quantidadeBase),
          entradas: [{ idx, qtd: quantidadeDisplay, unidade: unit.unidade, base: quantidadeBase }],
          _produto: produto,
        });
      }

      const grupoAtual = existente >= 0 ? acc[existente] : acc[acc.length - 1];
      grupoAtual.display = getGroupDisplayFromBase(produto, grupoAtual.totalBase);
      grupoAtual._produto = produto;
      return acc;
    }, []);
  }, [itens, produtos]);

  const produtoAtivoGrupo = itensAgrupados.find((g) => g.produto_id === produtoAtivoId);
  const ultimaEntradaIdx = produtoAtivoGrupo?.entradas?.[produtoAtivoGrupo.entradas.length - 1]?.idx;

  const adicionarProduto = (produto) => {
    const novosItens = [...itens, buildCountEntry(produto, 1)];
    persistItens(novosItens);
    setBusca('');
    setProdutoAtivoId(produto.id);
    setView('contagem');
  };

  const atualizarQtd = (idx, delta) => {
    const novosItens = itens.map((item, i) => {
      if (i !== idx) return item;
      const produto = produtos.find((p) => p.id === item.produto_id);
      const qtdAtual = getEntryDisplayQuantity(item, produto);
      return updateCountEntryQuantity(item, produto, Math.max(0, qtdAtual + delta));
    });
    persistItens(novosItens);
  };

  const definirQtd = (idx, valor) => {
    const qtd = parseFloat(valor) || 0;
    const novosItens = itens.map((item, i) => {
      if (i !== idx) return item;
      const produto = produtos.find((p) => p.id === item.produto_id);
      return updateCountEntryQuantity(item, produto, qtd);
    });
    persistItens(novosItens);
  };

  const removerEntradaAtiva = () => {
    if (ultimaEntradaIdx == null) return;
    const novosItens = itens.filter((_, i) => i !== ultimaEntradaIdx);
    persistItens(novosItens);
    if (novosItens.length === 0) {
      setProdutoAtivoId(null);
      return;
    }
    const restante = novosItens[novosItens.length - 1];
    setProdutoAtivoId(restante.produto_id);
  };

  const abrirCarrinho = async () => {
    setView('carrinho');
    if (itens.length === 0) {
      setComparativo([]);
      return;
    }
    setLoadingComparativo(true);
    try {
      const rows = await buildComparativoContagem(base44, itens, produtos);
      setComparativo(rows);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível calcular as diferenças.');
    }
    setLoadingComparativo(false);
  };

  const handleLancarClick = () => {
    if (itens.length === 0) return;
    setShowPinDialog(true);
  };

  const handlePinConfirmado = async () => {
    setShowPinDialog(false);
    setFinalizando(true);
    try {
      const resultado = await aplicarContagemExpress(base44, {
        itens,
        produtos,
        sessionId,
        usuarioNome: usuario?.nome || usuario?.email || usuario?.id || 'Operador',
      });

      clearContagemExpressDraft();
      const novoSid = createContagemExpressSessionId();
      setSessionId(novoSid);
      setItens([]);
      setProdutoAtivoId(null);
      setComparativo([]);
      setView('contagem');

      toast.success(
        `Contagem lançada: ${resultado.ajustesAplicados} ajuste(s) em ${resultado.produtosContados} produto(s).`
      );
    } catch (error) {
      console.error(error);
      toast.error('Erro ao lançar a contagem. Tente novamente.');
    }
    setFinalizando(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (view === 'carrinho') {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background font-din-1451">
        <ContagemExpressCarrinho
          itensAgrupados={itensAgrupados}
          comparativo={comparativo}
          loadingComparativo={loadingComparativo}
          finalizando={finalizando}
          onVoltar={() => setView('contagem')}
          onLancar={handleLancarClick}
        />
        <PinValidationDialog
          forceEnabled
          isOpen={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          onSuccess={handlePinConfirmado}
          operationName="Lançar Contagem Express"
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full max-w-full flex-col overflow-hidden bg-background font-din-1451">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold font-glacial text-foreground">Contagem Express</h1>
          <p className="text-xs text-muted-foreground">Contagem rápida · solo</p>
        </div>
        <button
          type="button"
          onClick={abrirCarrinho}
          className="relative flex h-10 items-center gap-2 rounded-xl bg-muted/60 px-3 text-sm font-medium text-foreground"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Carrinho</span>
          {itensAgrupados.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
              {itensAgrupados.length}
            </span>
          )}
        </button>
      </div>

      {/* Área limpa de contagem */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[calc(var(--p38-bottom-nav-total,0px)+7rem+env(safe-area-inset-bottom,0px))] pt-4">
        {!produtoAtivoGrupo ? (
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Tela limpa para contar</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Busque um produto abaixo. Os itens ficam no carrinho até você lançar com seu PIN.
            </p>
            {itensAgrupados.length > 0 && (
              <button
                type="button"
                onClick={abrirCarrinho}
                className="mt-6 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver carrinho ({itensAgrupados.length} produto{itensAgrupados.length !== 1 ? 's' : ''})
              </button>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-muted/40 p-6 text-center shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contando agora</p>
              <h2 className="mt-2 line-clamp-3 text-lg font-semibold text-foreground">
                {produtoAtivoGrupo.produto_nome}
              </h2>

              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => ultimaEntradaIdx != null && atualizarQtd(ultimaEntradaIdx, -1)}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm"
                >
                  <Minus className="h-6 w-6 text-muted-foreground" />
                </button>

                <div className="min-w-[8rem]">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={produtoAtivoGrupo.entradas[produtoAtivoGrupo.entradas.length - 1]?.qtd ?? 0}
                    onChange={(e) => ultimaEntradaIdx != null && definirQtd(ultimaEntradaIdx, e.target.value)}
                    className="h-16 border-0 bg-transparent text-center text-4xl font-bold font-glacial shadow-none focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (ultimaEntradaIdx == null) return;
                      const item = itens[ultimaEntradaIdx];
                      const produto = produtos.find((p) => p.id === item?.produto_id);
                      if (produto) setUnitSelector({ open: true, itemIdx: ultimaEntradaIdx, product: produto });
                    }}
                    className="mx-auto mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-card"
                  >
                    <Boxes className="h-3 w-3" />
                    {produtoAtivoGrupo.entradas[produtoAtivoGrupo.entradas.length - 1]?.unidade || 'UN'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => ultimaEntradaIdx != null && atualizarQtd(ultimaEntradaIdx, 1)}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={removerEntradaAtiva}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProdutoAtivoId(null);
                    setBusca('');
                    setTimeout(() => buscaRef.current?.focus(), 100);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-4 py-2 text-xs font-semibold text-primary"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Próximo produto
                </button>
              </div>
            </div>

            {itensAgrupados.length > 1 && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                + {itensAgrupados.length - 1} outro{itensAgrupados.length - 1 !== 1 ? 's' : ''} no carrinho
              </p>
            )}
          </div>
        )}
      </div>

      {/* Busca fixa inferior — estilo PDV */}
      <div className="fixed bottom-0 left-0 right-0 z-[55] max-w-full space-y-2 overflow-x-hidden border-t border-border/40 bg-card p-3 dark:border-border/40 dark:bg-background p38-bottom-dock">
        {produtosFiltrados.length > 0 && (
          <div className="max-h-72 divide-y divide-border/30 overflow-y-auto rounded-2xl border border-border/40 bg-card shadow-xl dark:divide-border/40">
            {produtosFiltrados.map((prod) => {
              const nome = resolveInventoryProductName(prod);
              const contagens = itens.filter((i) => i.produto_id === prod.id);
              const totalBase = contagens.reduce((s, i) => s + getEntryBaseQuantity(i, prod), 0);
              const totalDisplay = getGroupDisplayFromBase(prod, totalBase);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => adicionarProduto(prod)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{nome}</p>
                    <p className="text-xs text-muted-foreground">{prod.codigo_interno || prod.codigo_barras || ''}</p>
                  </div>
                  {contagens.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-xs font-medium text-green-500">
                        {formatCountQuantity(totalDisplay.quantidade)} {totalDisplay.unidade}
                      </span>
                    </div>
                  )}
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={buscaRef}
            placeholder="Buscar produto para contar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-11 w-full rounded-xl border-0 bg-muted/50 pl-9 focus-visible:ring-1 focus-visible:ring-border/40 dark:focus-visible:ring-ring"
          />
        </div>
      </div>

      <ProductUnitSelectorDialog
        open={unitSelector.open}
        product={unitSelector.product}
        mode="sale"
        onClose={() => setUnitSelector({ open: false, itemIdx: null, product: null })}
        onConfirm={async (unitOption) => {
          if (!unitOption || unitSelector.itemIdx === null) {
            setUnitSelector({ open: false, itemIdx: null, product: null });
            return;
          }
          const novosItens = itens.map((item, idx) => {
            if (idx !== unitSelector.itemIdx) return item;
            const produto = produtos.find((p) => p.id === item.produto_id);
            return changeCountEntryUnit(item, produto, unitOption);
          });
          persistItens(novosItens);
          setUnitSelector({ open: false, itemIdx: null, product: null });
        }}
      />
    </div>
  );
}
