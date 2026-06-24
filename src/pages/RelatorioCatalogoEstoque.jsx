import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import TreeGrid, { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import ProdutosPlanaTable from '@/components/produtos/ProdutosPlanaTable';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/financialUtils';
import {
  filterProdutos,
  countActiveProdutoFilters,
  describeProdutoFilters,
} from '@/lib/filterProdutos';
import { loadCatalogProdutoFilters } from '@/lib/catalogProdutoFiltersStorage';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import RelatorioCatalogoEstoquePrint from '@/components/produtos/RelatorioCatalogoEstoquePrint';
import '@/components/produtos/relatorioCatalogoEstoquePrint.css';

const REPORT_COLS = ['estoque_atual', 'valor_compra', 'preco_custo', 'preco_venda', 'inventario_valorizado'];

function formatarMoeda(n) {
  return (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RelatorioCatalogoEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => loadCatalogProdutoFilters());
  const [treeLevel, setTreeLevel] = useState(1);
  const [viewMode, setViewMode] = useState('dinamica');

  const syncFiltersFromCatalog = useCallback(() => {
    setFilters(loadCatalogProdutoFilters());
  }, []);

  useEffect(() => {
    syncFiltersFromCatalog();
    window.addEventListener('focus', syncFiltersFromCatalog);
    return () => window.removeEventListener('focus', syncFiltersFromCatalog);
  }, [syncFiltersFromCatalog]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const produtosData = await base44.entities.Produto.list('-created_date');
      const fornecedoresData = await base44.entities.Terceiro.filter({
        $or: [{ tipo: 'Fornecedor' }, { tipo: 'Ambos' }],
      });
      const safeProdutos = Array.isArray(produtosData)
        ? produtosData.filter((p) => p && typeof p === 'object')
        : [];
      const safeFornecedores = Array.isArray(fornecedoresData)
        ? fornecedoresData.filter((f) => f && typeof f === 'object')
        : [];
      setProdutos(safeProdutos);
      setFornecedores(safeFornecedores);
    } catch (err) {
      console.error('Erro ao carregar relatório de catálogo', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProdutos = useMemo(() => {
    const filtered = filterProdutos(produtos, filters);
    return [...filtered].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [produtos, filters]);

  const totals = useMemo(
    () => sumCatalogStockTotals(filteredProdutos),
    [filteredProdutos]
  );

  const activeFilterCount = countActiveProdutoFilters(filters);

  const filtersSummary = useMemo(
    () => describeProdutoFilters(filters, { fornecedores }),
    [filters, fornecedores]
  );

  const printGeneratedAt = useMemo(
    () =>
      new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    [filteredProdutos.length, filtersSummary]
  );

  const handlePrint = () => {
    window.print();
  };

  const formatarNumero = useCallback((numero) => formatCurrency(numero), []);
  const isPlana = viewMode === 'plana';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div
        id="relatorio-catalogo-estoque"
        className="flex flex-col h-full overflow-hidden w-full bg-card print:hidden"
      >
        <div className="flex-none border-b border-border/40 px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
              <Link to={createPageUrl('Produtos')} title="Voltar ao catálogo">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-foreground font-glacial">
                Relatório de estoque ({isPlana ? 'Plana' : 'Tree Grid'})
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Espelha os filtros do catálogo · ajuste busca e filtros na página Produtos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>
          </div>

          {activeFilterCount > 0 ? (
            <p className="text-[11px] text-muted-foreground pl-11 pr-1">
              <span className="font-medium text-foreground/90">Filtros do catálogo:</span>{' '}
              {filtersSummary}.{' '}
              <Link
                to={createPageUrl('Produtos')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Alterar no catálogo
              </Link>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground dark:text-muted-foreground pl-11">
              Sem filtros activos no catálogo.{' '}
              <Link
                to={createPageUrl('Produtos')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Ir ao catálogo
              </Link>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2 flex-none border-b border-border/30 dark:border-border/40/80 gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''} na grade
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode('dinamica')}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                  viewMode === 'dinamica'
                    ? 'bg-white dark:bg-muted text-foreground/90 shadow-sm font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                Tree Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('plana')}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                  viewMode === 'plana'
                    ? 'bg-white dark:bg-muted text-foreground/90 shadow-sm font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                Plana
              </button>
            </div>
            {!isPlana ? <LevelControl level={treeLevel} onChange={setTreeLevel} /> : null}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-0 md:px-3">
          {isPlana ? (
            <ProdutosPlanaTable
              filteredProdutos={filteredProdutos}
              visibleColumns={REPORT_COLS}
              formatarNumero={formatarNumero}
              fornecedorMap={{}}
              readOnly
              embedded
            />
          ) : (
            <TreeGrid
              produtos={filteredProdutos}
              visibleColumns={REPORT_COLS}
              masterLevel={treeLevel}
              readOnly
            />
          )}
        </div>

        <div className="flex-none border-t border-border/40 bg-muted/50/60 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="text-[11px] text-muted-foreground">
              Totais dos SKUs filtrados: <strong>estoque</strong> (vitrine comercial quando activa) ×{' '}
              <strong>valor de compra</strong>, <strong>custo total</strong> ou <strong>preço de venda</strong>,
              como no catálogo ({isPlana ? 'vista plana' : 'Tree Grid'}).
            </div>
            <div className="flex flex-wrap gap-6">
              <TotalKpi
                label="Inventário (valor de compra)"
                value={roundToTwoDecimals(totals.totalCompra)}
                hint="Σ estoque × vl. compra"
              />
              <TotalKpi
                label="Inventário (custo total)"
                value={roundToTwoDecimals(totals.totalCusto)}
                hint="Σ estoque × custo total"
              />
              <TotalKpi
                label="Inventário (preço de venda)"
                value={roundToTwoDecimals(totals.totalVenda)}
                hint="Σ estoque × preço de venda"
              />
            </div>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <RelatorioCatalogoEstoquePrint
              produtos={filteredProdutos}
              filtersSummary={filtersSummary}
              totals={totals}
              generatedAt={printGeneratedAt}
              layoutMode={isPlana ? 'plana' : 'tree'}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function TotalKpi({ label, value, hint }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground dark:text-foreground">
        R$ {formatarMoeda(value)}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
