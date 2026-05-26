import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TreeGrid, { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  DEFAULT_PRODUTO_FILTERS,
  filterProdutos,
  countActiveProdutoFilters,
  describeProdutoFilters,
} from '@/lib/filterProdutos';
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
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ...DEFAULT_PRODUTO_FILTERS });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [treeLevel, setTreeLevel] = useState(1);

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
      const catSet = new Set();
      safeProdutos.forEach((p) => {
        if (p.categoria_nome) catSet.add(p.categoria_nome);
      });
      setProdutos(safeProdutos);
      setFornecedores(safeFornecedores);
      setCategorias(Array.from(catSet).sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      console.error('Erro ao carregar relatório de catálogo', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

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
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
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
      className="flex flex-col h-full overflow-hidden w-full bg-white dark:bg-gray-900 print:hidden"
    >
      <div className="flex-none border-b border-gray-100 dark:border-gray-800 px-3 py-2 space-y-2 print:border-none">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 print:hidden" asChild>
            <Link to={createPageUrl('Produtos')} title="Voltar ao catálogo">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-glacial">
              Relatório de estoque (Tree Grid)
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Mesma hierarquia e filtros do catálogo · totais só dos itens filtrados
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 print:hidden"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </Button>
        </div>

        <div className="flex gap-2 min-w-0 print:hidden">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Nome ou descrição (contém)..."
              className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 rounded-xl"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 flex-shrink-0 rounded-xl relative md:hidden ${activeFilterCount > 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setIsFilterOpen((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-700 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="md:hidden space-y-2 pb-1 print:hidden">
            <FilterFields
              filters={filters}
              categorias={categorias}
              fornecedores={fornecedores}
              onChange={handleFilterChange}
            />
            {activeFilterCount > 0 && (
              <ClearFiltersButton filters={filters} setFilters={setFilters} />
            )}
          </div>
        )}

        <div className="hidden md:grid md:grid-cols-6 gap-2 print:hidden">
          <FilterFields
            filters={filters}
            categorias={categorias}
            fornecedores={fornecedores}
            onChange={handleFilterChange}
            compact
          />
        </div>
        {activeFilterCount > 0 && (
          <div className="hidden md:block print:hidden">
            <ClearFiltersButton filters={filters} setFilters={setFilters} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2 flex-none border-b border-gray-50 dark:border-gray-800/80 print:hidden">
        <span className="text-xs text-gray-600 dark:text-gray-300">
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

      <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
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
      <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        R$ {formatarMoeda(value)}
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</div>
    </div>
  );
}

function FilterFields({ filters, categorias, fornecedores, onChange, compact }) {
  const h = compact ? 'h-9 text-xs rounded-lg' : 'h-10 text-sm rounded-xl';
  const itemCls = compact ? 'text-xs' : 'text-sm';
  return (
    <>
      <Input
        placeholder="Nome ou descrição..."
        title="Busca parcial (contém), sem diferenciar maiúsculas"
        className={`bg-gray-100 dark:bg-gray-800 border-none ${h}`}
        value={filters.searchTerm || ''}
        onChange={(e) => onChange('searchTerm', e.target.value)}
      />
      <Select value={filters.categoria} onValueChange={(v) => onChange('categoria', v)}>
        <SelectTrigger className={`bg-gray-100 dark:bg-gray-800 border-none w-full ${h}`}>
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800">
          <SelectItem value="all" className={itemCls}>
            Todas as categorias
          </SelectItem>
          {categorias.map((cat) => (
            <SelectItem key={cat} value={cat} className={itemCls}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.fornecedorId} onValueChange={(v) => onChange('fornecedorId', v)}>
        <SelectTrigger className={`bg-gray-100 dark:bg-gray-800 border-none w-full ${h}`}>
          <SelectValue placeholder="Fornecedor" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800">
          <SelectItem value="all" className={itemCls}>
            Todos os fornecedores
          </SelectItem>
          {fornecedores.map((f) => (
            <SelectItem key={f.id} value={f.id} className={itemCls}>
              {f.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.statusEstoque} onValueChange={(v) => onChange('statusEstoque', v)}>
        <SelectTrigger className={`bg-gray-100 dark:bg-gray-800 border-none w-full ${h}`}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800">
          <SelectItem value="all" className={itemCls}>
            Todos os status
          </SelectItem>
          <SelectItem value="ok" className={itemCls}>
            OK
          </SelectItem>
          <SelectItem value="baixo" className={itemCls}>
            Baixo
          </SelectItem>
          <SelectItem value="critico" className={itemCls}>
            Crítico
          </SelectItem>
          <SelectItem value="inativo" className={itemCls}>
            Inativo
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        placeholder="Tag"
        className={`bg-gray-100 dark:bg-gray-800 border-none ${h}`}
        value={filters.tag || ''}
        onChange={(e) => onChange('tag', e.target.value)}
      />
      <Select value={filters.cadastroIncompleto} onValueChange={(v) => onChange('cadastroIncompleto', v)}>
        <SelectTrigger className={`bg-gray-100 dark:bg-gray-800 border-none w-full ${h}`}>
          <SelectValue placeholder="Cadastro" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800">
          <SelectItem value="all" className={itemCls}>
            Todos
          </SelectItem>
          <SelectItem value="incompleto" className={itemCls}>
            Incompleto
          </SelectItem>
          <SelectItem value="completo" className={itemCls}>
            Completo
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

function ClearFiltersButton({ filters, setFilters }) {
  return (
    <button
      type="button"
      onClick={() =>
        setFilters({
          ...DEFAULT_PRODUTO_FILTERS,
          searchTerm: filters.searchTerm,
        })
      }
      className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1"
    >
      <X className="w-3 h-3" /> Limpar filtros
    </button>
  );
}
