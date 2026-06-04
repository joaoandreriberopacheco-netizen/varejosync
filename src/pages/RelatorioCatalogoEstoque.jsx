import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import TreeGrid, { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import {
  filterProdutos,
  countActiveProdutoFilters,
  describeProdutoFilters,
} from '@/lib/filterProdutos';
import { loadCatalogProdutoFilters } from '@/lib/catalogProdutoFiltersStorage';
import { sumCatalogStockTotals } from '@/lib/catalogStockTotals';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import RelatorioCatalogoEstoquePrint from '@/components/produtos/RelatorioCatalogoEstoquePrint';

const REPORT_COLS = ['estoque_atual', 'valor_compra', 'preco_custo', 'inventario_valorizado'];

function formatarMoeda(n) {
  return (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RelatorioCatalogoEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => loadCatalogProdutoFilters());
  const [treeLevel, setTreeLevel] = useState(1);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <style>{`
      @media print {
        @page { size: A4 landscape; margin: 12mm; }
        body > * { visibility: hidden !important; }
        body * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        #relatorio-catalogo-estoque-print,
        #relatorio-catalogo-estoque-print * {
          visibility: visible !important;
        }
        #relatorio-catalogo-estoque-print {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 0;
          background: #fff !important;
          color: #111 !important;
        }
      }
    `}</style>
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
              <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-glacial">
                Relatório de estoque (Tree Grid)
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

        <div className="flex items-center justify-between px-3 py-2 flex-none border-b border-gray-50 dark:border-border/40/80">
          <span className="text-xs text-muted-foreground">
            {filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''} na grade
          </span>
          <LevelControl level={treeLevel} onChange={setTreeLevel} />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-0 md:px-3">
          <TreeGrid
            produtos={filteredProdutos}
            visibleColumns={REPORT_COLS}
            masterLevel={treeLevel}
            readOnly
          />
        </div>

        <div className="flex-none border-t border-border/40 bg-muted/50/60 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="text-[11px] text-muted-foreground">
              Totais dos SKUs filtrados: <strong>estoque</strong> (vitrine comercial quando activa) ×{' '}
              <strong>valor de compra</strong> ou <strong>custo total</strong>, como no Tree Grid do catálogo.
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
            </div>
          </div>
        </div>
      </div>

      <RelatorioCatalogoEstoquePrint
        produtos={filteredProdutos}
        filtersSummary={filtersSummary}
        totals={totals}
        generatedAt={printGeneratedAt}
      />
    </>
  );
}

function TotalKpi({ label, value, hint }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground dark:text-gray-100">
        R$ {formatarMoeda(value)}
      </div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
