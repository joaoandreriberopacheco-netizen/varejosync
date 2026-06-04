import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/components/utils';
import { Columns, Download, Upload, Sparkles, Wand2, PlusCircle, SlidersHorizontal, Search, X, Image as ImageIcon, BarChart3, Filter } from 'lucide-react';
import { DEFAULT_PRODUTO_FILTERS } from '@/lib/filterProdutos';
import ProdutosSearchStartsWithToggle from '@/components/produtos/ProdutosSearchStartsWithToggle';
import MassTagGenerator from '@/components/produtos/MassTagGenerator';
import { LevelControl } from '@/components/produtos/treegrid/TreeGrid';

export default function ProdutosHeader({
  stats,
  filters,
  categorias,
  fornecedores,
  activeFilterCount,
  isSummaryFiltered = false,
  isFilterOpen,
  setIsFilterOpen,
  handleFilterChange,
  handleExportarCatalogo,
  handleBaixarTemplateUnificado,
  setIsMassImageUploaderOpen,
  handleAddNew,
  setFilters,
  formatarNumero,
  filteredProdutos = [],
  loadData,
  treeLevel,
  setTreeLevel,
  setIsColumnSelectorOpen,
}) {
  const quantidadeOperador = filters.quantidadeOperador || 'all';
  const [isMassTagOpen, setIsMassTagOpen] = useState(false);

  const clearFilters = () => {
    setFilters({ ...DEFAULT_PRODUTO_FILTERS });
  };

  return (
    <div className="flex-none bg-card border-b border-border/40 w-full min-w-0">
      <div className="w-full min-w-0 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate font-glacial">Catálogo</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground min-w-0">
              {isSummaryFiltered && (
                <Filter
                  className="w-3 h-3 p38-text-accent flex-shrink-0"
                  aria-label="Resumo sob filtros ativos"
                />
              )}
              <span className="truncate">{stats.total} produtos</span>
              <span className="truncate">R$ {formatarNumero(stats.valorEstoqueAtivo || 0)}</span>
              {stats.abaixoMinimo > 0 && <span className="text-red-500 flex-shrink-0">{stats.abaixoMinimo} abaixo mín.</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 min-w-0 max-w-[58vw] sm:max-w-none overflow-x-auto overscroll-x-contain">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-2.5 flex-shrink-0 p38-catalog-accent-btn"
              asChild
              title="Relatório de estoque (Tree Grid)"
            >
              <Link to={createPageUrl('RelatorioCatalogoEstoque')}>
                <BarChart3 className="w-4 h-4 p38-text-accent" />
                <span className="text-xs font-medium p38-text-accent whitespace-nowrap">Relatório</span>
              </Link>
            </Button>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleExportarCatalogo} title="Exportar">
                <Download className="w-4 h-4 text-muted-foreground" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="Importar">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-muted dark:border-border/40">
                  <DropdownMenuItem onClick={handleBaixarTemplateUnificado} className="dark:text-foreground dark:hover:bg-primary/90 text-sm">
                    <Download className="w-4 h-4 mr-2" />Template
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-foreground dark:hover:bg-primary/90 text-sm">
                    <Link to={createPageUrl('ImportacaoProdutos')}>
                      <Upload className="w-4 h-4 mr-2" />Importar CSV
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsMassImageUploaderOpen(true)} className="dark:text-foreground dark:hover:bg-primary/90 text-sm">
                    <ImageIcon className="w-4 h-4 mr-2" />Importar Imagens
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="IA">
                    <Sparkles className="w-4 h-4 p38-text-accent" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-muted dark:border-border/40">
                  {filteredProdutos.length > 0 && (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setIsMassTagOpen(true);
                      }}
                      className="dark:text-foreground dark:hover:bg-primary/90 text-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2 p38-text-accent" />Tagificação em Massa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="dark:text-foreground dark:hover:bg-primary/90 text-sm">
                    <Link to={createPageUrl('OtimizacaoEstoqueIA')}>
                      <Sparkles className="w-4 h-4 mr-2 p38-text-accent" />Otimizar Estoque
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-foreground dark:hover:bg-primary/90 text-sm">
                    <Link to={createPageUrl('EstimativaEmbalagensIA')}>
                      <Wand2 className="w-4 h-4 mr-2 p38-text-accent" />Estimar Embalagens
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleAddNew} variant="ghost" size="icon" className="h-9 w-9" title="Novo produto">
                <PlusCircle className="h-4 w-4 text-foreground/90" />
              </Button>
            </div>
            <MassTagGenerator
              products={filteredProdutos}
              onComplete={loadData}
              open={isMassTagOpen}
              onOpenChange={setIsMassTagOpen}
              hideTrigger
            />
          </div>
        </div>

        <div className="flex gap-2 min-w-0 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Nome ou descrição (use ; para combinar termos)..."
              className="border-none bg-muted h-10 text-sm pl-9 text-foreground/90 shadow-none focus-visible:ring-0 w-full min-w-0 rounded-xl"
              value={filters.searchTerm}
              onChange={e => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 flex-shrink-0 rounded-xl relative ${isFilterOpen || activeFilterCount > 0 ? 'bg-muted' : 'bg-muted'}`}
            onClick={() => setIsFilterOpen(v => !v)}
            title="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            {activeFilterCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-muted dark:bg-muted text-white dark:text-foreground text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-xl bg-muted"
            onClick={() => setIsColumnSelectorOpen(true)}
            title="Colunas"
          >
            <Columns className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 pb-1">
            <div className="flex items-center gap-2 bg-muted rounded-xl md:rounded-lg px-3 h-10 md:h-9 md:col-span-2">
              <span className="text-xs text-muted-foreground flex-shrink-0">Nível da TreeGrid</span>
              <LevelControl level={treeLevel} onChange={setTreeLevel} />
            </div>
            <Select value={filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Todas as categorias</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-sm md:text-xs">{cat}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os fornecedores</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-sm md:text-xs">{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Status do estoque" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os status</SelectItem>
                <SelectItem value="ok" className="text-sm md:text-xs">OK</SelectItem>
                <SelectItem value="baixo" className="text-sm md:text-xs">Baixo</SelectItem>
                <SelectItem value="critico" className="text-sm md:text-xs">Crítico</SelectItem>
                <SelectItem value="inativo" className="text-sm md:text-xs">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.ativoStatus || 'all'} onValueChange={v => handleFilterChange('ativoStatus', v)}>
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Ativos/Inativos" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Ativos e inativos</SelectItem>
                <SelectItem value="ativos" className="text-sm md:text-xs">Somente ativos</SelectItem>
                <SelectItem value="inativos" className="text-sm md:text-xs">Somente inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Cadastro" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os cadastros</SelectItem>
                <SelectItem value="incompleto" className="text-sm md:text-xs">Incompleto</SelectItem>
                <SelectItem value="completo" className="text-sm md:text-xs">Completo</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Tag" className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg" value={filters.tag || ''} onChange={e => handleFilterChange('tag', e.target.value)} />

            <Select
              value={quantidadeOperador}
              onValueChange={v => setFilters(prev => ({
                ...prev,
                quantidadeOperador: v,
                quantidadeValorAte: v === 'between' ? prev.quantidadeValorAte : '',
              }))}
            >
              <SelectTrigger className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Quantidade" /></SelectTrigger>
              <SelectContent className="dark:bg-muted dark:border-border/40">
                <SelectItem value="all" className="text-sm md:text-xs">Quantidade: todos</SelectItem>
                <SelectItem value="gt" className="text-sm md:text-xs">Maior que</SelectItem>
                <SelectItem value="gte" className="text-sm md:text-xs">Maior ou igual a</SelectItem>
                <SelectItem value="lt" className="text-sm md:text-xs">Menor que</SelectItem>
                <SelectItem value="lte" className="text-sm md:text-xs">Menor ou igual a</SelectItem>
                <SelectItem value="between" className="text-sm md:text-xs">Entre</SelectItem>
              </SelectContent>
            </Select>

            <Input
              inputMode="decimal"
              placeholder={quantidadeOperador === 'between' ? 'Qtd. inicial' : 'Quantidade'}
              disabled={quantidadeOperador === 'all'}
              className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg disabled:opacity-50"
              value={filters.quantidadeValor || ''}
              onChange={e => handleFilterChange('quantidadeValor', e.target.value)}
            />

            {quantidadeOperador === 'between' && (
              <Input
                inputMode="decimal"
                placeholder="Qtd. final"
                className="bg-muted border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg"
                value={filters.quantidadeValorAte || ''}
                onChange={e => handleFilterChange('quantidadeValorAte', e.target.value)}
              />
            )}

            <div className="flex items-center gap-2 md:col-span-2 min-w-0">
              <div className="flex-1 min-w-0">
                <ProdutosSearchStartsWithToggle
                  checked={!!filters.searchStartsWith}
                  onChange={v => handleFilterChange('searchStartsWith', v)}
                />
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="h-9 px-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
