import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Search, Loader2, Package, ShoppingCart,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import ProductUnitSelectorDialog from '@/components/produtos/ProductUnitSelectorDialog';
import PinValidationDialog from '@/components/auth/PinValidationDialog';
import ContagemExpressCarrinho from '@/components/estoque/contagem-express/ContagemExpressCarrinho';
import ContagemExpressFaixaCarrinho from '@/components/estoque/contagem-express/ContagemExpressFaixaCarrinho';
import ContagemExpressPainelContagem from '@/components/estoque/contagem-express/ContagemExpressPainelContagem';
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
import { calcularSaldoMovimentacoes } from '@/lib/movimentacaoEstoqueSaldo';
import {
  loadContagemExpressDraft,
  saveContagemExpressDraft,
  clearContagemExpressDraft,
  createContagemExpressSessionId,
} from '@/lib/contagemExpressStorage';
import { aplicarContagemExpress, buildComparativoContagem } from '@/lib/contagemExpressApply';
import { publicarRelatorioContagemExpress } from '@/lib/contagemExpressReport';
import { toast } from 'sonner';

async function carregarSaldoProduto(produtoId) {
  const movs = await base44.entities.MovimentacaoEstoque.filter(
    { produto_id: produtoId },
    '-created_date',
    1000
  );
  return calcularSaldoMovimentacoes(movs);
}

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

  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [modoContagem, setModoContagem] = useState('adicionar');
  const [quantidadePendente, setQuantidadePendente] = useState('');
  const [entradaPendente, setEntradaPendente] = useState(null);
  const [saldoInfo, setSaldoInfo] = useState({ loading: false, saldoExtrato: null });

  const [unitSelector, setUnitSelector] = useState({ open: false, product: null });
  const [comparativo, setComparativo] = useState([]);
  const [loadingComparativo, setLoadingComparativo] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  const persistItens = useCallback((novosItens, sid = sessionId) => {
    setItens(novosItens);
    if (sid) saveContagemExpressDraft(sid, novosItens);
  }, [sessionId]);

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
    };
    init();
  }, []);

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

  const totalCarrinhoProduto = useCallback((produtoId) => {
    return itens
      .filter((i) => i.produto_id === produtoId)
      .reduce((sum, item) => {
        const produto = produtos.find((p) => p.id === item.produto_id);
        return sum + getEntryBaseQuantity(item, produto);
      }, 0);
  }, [itens, produtos]);

  const carregarSaldoSelecionado = useCallback(async (produtoId) => {
    if (!produtoId) return;
    setSaldoInfo({ loading: true, saldoExtrato: null });
    try {
      const saldo = await carregarSaldoProduto(produtoId);
      setSaldoInfo({ loading: false, saldoExtrato: saldo });
    } catch {
      setSaldoInfo({ loading: false, saldoExtrato: null });
    }
  }, []);

  const iniciarSelecao = async (produto, { modo = 'adicionar', quantidadeInicial = '' } = {}) => {
    const entry = buildCountEntry(produto, 1);
    setProdutoSelecionado(produto);
    setModoContagem(modo);
    setQuantidadePendente(quantidadeInicial === '' ? '' : String(quantidadeInicial));
    setEntradaPendente(entry);
    setBusca('');
    setProdutosFiltrados([]);
    await carregarSaldoSelecionado(produto.id);
    setTimeout(() => buscaRef.current?.blur(), 50);
  };

  const limparSelecao = () => {
    setProdutoSelecionado(null);
    setQuantidadePendente('');
    setEntradaPendente(null);
    setSaldoInfo({ loading: false, saldoExtrato: null });
    setTimeout(() => buscaRef.current?.focus(), 100);
  };

  const entradaPreview = useMemo(() => {
    if (!produtoSelecionado || !entradaPendente) return null;
    const qtd = parseFloat(quantidadePendente) || 0;
    return updateCountEntryQuantity(entradaPendente, produtoSelecionado, qtd);
  }, [produtoSelecionado, entradaPendente, quantidadePendente]);

  const pendenteBase = entradaPreview
    ? getEntryBaseQuantity(entradaPreview, produtoSelecionado)
    : 0;

  const carrinhoBaseParaPainel = produtoSelecionado && modoContagem === 'adicionar'
    ? totalCarrinhoProduto(produtoSelecionado.id)
    : 0;

  const unidadePainel = entradaPreview
    ? getCountUnitForEntry(produtoSelecionado, entradaPreview).unidade
    : 'UN';

  const confirmarProduto = () => {
    if (!produtoSelecionado || !entradaPreview || pendenteBase <= 0) return;

    let novosItens;
    if (modoContagem === 'substituir') {
      novosItens = [
        ...itens.filter((i) => i.produto_id !== produtoSelecionado.id),
        entradaPreview,
      ];
    } else {
      novosItens = [...itens, entradaPreview];
    }

    persistItens(novosItens);
    limparSelecao();
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
      const comparativoPre = await buildComparativoContagem(base44, itens, produtos);
      const usuarioNome = usuario?.nome || usuario?.full_name || usuario?.email || usuario?.id || 'Operador';

      const resultado = await aplicarContagemExpress(base44, {
        itens,
        produtos,
        sessionId,
        usuarioNome,
      });

      await publicarRelatorioContagemExpress({
        referenciaNumero: resultado.referenciaNumero,
        usuarioNome,
        dataLancamento: resultado.dataLancamento,
        comparativo: comparativoPre,
        produtos,
        movimentacoes: resultado.movimentacoes,
      });

      clearContagemExpressDraft();
      const novoSid = createContagemExpressSessionId();
      setSessionId(novoSid);
      setItens([]);
      setComparativo([]);
      setView('contagem');
      limparSelecao();

      toast.success(
        `Contagem lançada: ${resultado.ajustesAplicados} movimento(s) em ${resultado.produtosContados} produto(s). Relatório gerado.`
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
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate(createPageUrl('Dashboard'))}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold font-glacial text-foreground">
          Contagem Express
        </h1>
        <button
          type="button"
          onClick={abrirCarrinho}
          aria-label="Carrinho"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"
        >
          <ShoppingCart className="h-4 w-4" />
          {itensAgrupados.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white">
              {itensAgrupados.length}
            </span>
          )}
        </button>
      </div>

      <ContagemExpressFaixaCarrinho
        itensAgrupados={itensAgrupados}
        produtoAtivoId={produtoSelecionado?.id}
        onSelecionar={(grupo) => {
          const produto = grupo._produto || produtos.find((p) => p.id === grupo.produto_id);
          if (!produto) return;
          iniciarSelecao(produto, {
            modo: 'substituir',
            quantidadeInicial: grupo.display?.quantidade ?? grupo.totalBase,
          });
        }}
        onAbrirCarrinho={abrirCarrinho}
      />

      {!produtoSelecionado && (
        <div className="shrink-0 px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={buscaRef}
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-14 rounded-2xl border-0 bg-card pl-12 text-base shadow-sm focus-visible:ring-1 focus-visible:ring-border/40 dark:bg-secondary"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(var(--p38-bottom-nav-total,0px)+0.5rem)]">
        {produtoSelecionado ? (
          <ContagemExpressPainelContagem
            produto={produtoSelecionado}
            produtoNome={resolveInventoryProductName(produtoSelecionado)}
            quantidade={quantidadePendente}
            unidade={unidadePainel}
            saldoInfo={saldoInfo}
            totalNoCarrinhoBase={carrinhoBaseParaPainel}
            pendenteBase={pendenteBase}
            onQuantidadeChange={setQuantidadePendente}
            onMenos={() => {
              const q = Math.max(0, (parseFloat(quantidadePendente) || 0) - 1);
              setQuantidadePendente(q > 0 ? String(q) : '');
            }}
            onMais={() => {
              const q = (parseFloat(quantidadePendente) || 0) + 1;
              setQuantidadePendente(String(q));
            }}
            onTrocarUnidade={() => setUnitSelector({ open: true, product: produtoSelecionado })}
            onConfirmar={confirmarProduto}
            onCancelar={limparSelecao}
          />
        ) : produtosFiltrados.length > 0 ? (
          <div className="divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
            {produtosFiltrados.map((prod) => {
              const nome = resolveInventoryProductName(prod);
              const noCarrinho = itensAgrupados.find((g) => g.produto_id === prod.id);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => iniciarSelecao(prod)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{nome}</p>
                  {noCarrinho && (
                    <span className="shrink-0 text-xs font-semibold text-green-600 dark:text-green-400">
                      {formatCountQuantity(noCarrinho.display?.quantidade)} {noCarrinho.display?.unidade}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <ProductUnitSelectorDialog
        open={unitSelector.open}
        product={unitSelector.product}
        mode="sale"
        onClose={() => setUnitSelector({ open: false, product: null })}
        onConfirm={(unitOption) => {
          if (!unitOption || !entradaPendente || !produtoSelecionado) {
            setUnitSelector({ open: false, product: null });
            return;
          }
          setEntradaPendente(changeCountEntryUnit(entradaPendente, produtoSelecionado, unitOption));
          setUnitSelector({ open: false, product: null });
        }}
      />
    </div>
  );
}
