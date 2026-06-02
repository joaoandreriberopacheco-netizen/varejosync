import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/components/utils';
import { Download, Upload, Sparkles, Wand2, PlusCircle, SlidersHorizontal, Search, X, Image as ImageIcon, BarChart3, Filter } from 'lucide-react';
import { DEFAULT_PRODUTO_FILTERS } from '@/lib/filterProdutos';
import ProdutosSearchStartsWithToggle from '@/components/produtos/ProdutosSearchStartsWithToggle';
import MassTagGenerator from '@/components/produtos/MassTagGenerator';

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
}) {
  const quantidadeOperador = filters.quantidadeOperador || 'all';
  const [isMassTagOpen, setIsMassTagOpen] = useState(false);

  const clearFilters = () => {
    setFilters({ ...DEFAULT_PRODUTO_FILTERS });
  };

  return (
    <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 w-full min-w-0">
      <div className="w-full min-w-0 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate font-glacial">Catálogo</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
              {isSummaryFiltered && (
                <Filter
                  className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0"
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
              className="h-9 gap-1.5 px-2.5 flex-shrink-0 border-blue-200 bg-blue-50/80 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:hover:bg-blue-900/50"
              asChild
              title="Relatório de estoque (Tree Grid)"
            >
              <Link to={createPageUrl('RelatorioCatalogoEstoque')}>
                <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">Relatório</span>
              </Link>
            </Button>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleExportarCatalogo} title="Exportar">
                <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="Importar">
                    <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  <DropdownMenuItem onClick={handleBaixarTemplateUnificado} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Download className="w-4 h-4 mr-2" />Template
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('ImportacaoProdutos')}>
                      <Upload className="w-4 h-4 mr-2" />Importar CSV
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsMassImageUploaderOpen(true)} className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <ImageIcon className="w-4 h-4 mr-2" />Importar Imagens
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" title="IA">
                    <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                  {filteredProdutos.length > 0 && (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        setIsMassTagOpen(true);
                      }}
                      className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />Tagificação em Massa
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('OtimizacaoEstoqueIA')}>
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500" />Otimizar Estoque
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="dark:text-gray-200 dark:hover:bg-gray-700 text-sm">
                    <Link to={createPageUrl('EstimativaEmbalagensIA')}>
                      <Wand2 className="w-4 h-4 mr-2 text-blue-500" />Estimar Embalagens
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleAddNew} variant="ghost" size="icon" className="h-9 w-9" title="Novo produto">
                <PlusCircle className="h-4 w-4 text-gray-700 dark:text-gray-300" />
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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <Input
              placeholder="Nome ou descrição (use ; para combinar termos)..."
              className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 text-gray-700 dark:text-gray-200 shadow-none focus-visible:ring-0 w-full min-w-0 rounded-xl"
              value={filters.searchTerm}
              onChange={e => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 flex-shrink-0 rounded-xl relative ${isFilterOpen || activeFilterCount > 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setIsFilterOpen(v => !v)}
            title="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            {activeFilterCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 pb-1">
            <Select value={filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm md:text-xs">Todas as categorias</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-sm md:text-xs">{cat}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os fornecedores</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-sm md:text-xs">{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Status do estoque" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os status</SelectItem>
                <SelectItem value="ok" className="text-sm md:text-xs">OK</SelectItem>
                <SelectItem value="baixo" className="text-sm md:text-xs">Baixo</SelectItem>
                <SelectItem value="critico" className="text-sm md:text-xs">Crítico</SelectItem>
                <SelectItem value="inativo" className="text-sm md:text-xs">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.ativoStatus || 'all'} onValueChange={v => handleFilterChange('ativoStatus', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Ativos/Inativos" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm md:text-xs">Ativos e inativos</SelectItem>
                <SelectItem value="ativos" className="text-sm md:text-xs">Somente ativos</SelectItem>
                <SelectItem value="inativos" className="text-sm md:text-xs">Somente inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Cadastro" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm md:text-xs">Todos os cadastros</SelectItem>
                <SelectItem value="incompleto" className="text-sm md:text-xs">Incompleto</SelectItem>
                <SelectItem value="completo" className="text-sm md:text-xs">Completo</SelectItem>
              </SelectContent>
            </Select>

            <Input placeholder="Tag" className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg" value={filters.tag || ''} onChange={e => handleFilterChange('tag', e.target.value)} />

            <Select
              value={quantidadeOperador}
              onValueChange={v => setFilters(prev => ({
                ...prev,
                quantidadeOperador: v,
                quantidadeValorAte: v === 'between' ? prev.quantidadeValorAte : '',
              }))}
            >
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs w-full rounded-xl md:rounded-lg"><SelectValue placeholder="Quantidade" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
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
              className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg disabled:opacity-50"
              value={filters.quantidadeValor || ''}
              onChange={e => handleFilterChange('quantidadeValor', e.target.value)}
            />

            {quantidadeOperador === 'between' && (
              <Input
                inputMode="decimal"
                placeholder="Qtd. final"
                className="bg-gray-100 dark:bg-gray-800 border-none h-10 md:h-9 text-sm md:text-xs rounded-xl md:rounded-lg"
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
