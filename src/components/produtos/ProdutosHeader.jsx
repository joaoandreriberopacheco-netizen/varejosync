import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/components/utils';
import { Download, Upload, Sparkles, Wand2, PlusCircle, SlidersHorizontal, Search, X, Image as ImageIcon } from 'lucide-react';

export default function ProdutosHeader({
  stats,
  filters,
  categorias,
  fornecedores,
  activeFilterCount,
  isFilterOpen,
  setIsFilterOpen,
  handleFilterChange,
  handleExportarCatalogo,
  handleBaixarTemplateUnificado,
  setIsMassImageUploaderOpen,
  handleAddNew,
  setFilters,
  formatarNumero,
}) {
  return (
    <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 w-full min-w-0">
      <div className="w-full min-w-0 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate font-glacial">Catálogo</h1>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span>{stats.total} produtos</span>
              <span>R$ {formatarNumero(stats.valorEstoqueAtivo || 0)}</span>
              {stats.abaixoMinimo > 0 && <span className="text-red-500">{stats.abaixoMinimo} abaixo mín.</span>}
            </div>
          </div>

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
        </div>

        <div className="flex gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <Input
              placeholder="Buscar produto..."
              className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 text-gray-700 dark:text-gray-200 shadow-none focus-visible:ring-0 w-full min-w-0 rounded-xl"
              value={filters.searchTerm}
              onChange={e => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 flex-shrink-0 rounded-xl relative md:hidden ${activeFilterCount > 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800'}`}
            onClick={() => setIsFilterOpen(v => !v)}
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            {activeFilterCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900 text-[10px] rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </Button>
        </div>

        {isFilterOpen && (
          <div className="md:hidden space-y-2 pb-1">
            <Select value={filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm">Todas as categorias</SelectItem>
                {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-sm">{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm">Todos os fornecedores</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-sm">{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
              <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm w-full rounded-xl"><SelectValue placeholder="Status do estoque" /></SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all" className="text-sm">Todos os status</SelectItem>
                <SelectItem value="ok" className="text-sm">OK</SelectItem>
                <SelectItem value="baixo" className="text-sm">Baixo</SelectItem>
                <SelectItem value="critico" className="text-sm">Crítico</SelectItem>
                <SelectItem value="inativo" className="text-sm">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="Tag" className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm rounded-xl flex-1" value={filters.tag || ''} onChange={e => handleFilterChange('tag', e.target.value)} />
              <Select value={filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
                <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-10 text-sm rounded-xl flex-1"><SelectValue placeholder="Cadastro" /></SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectItem value="all" className="text-sm">Todos</SelectItem>
                  <SelectItem value="incompleto" className="text-sm">Incompleto</SelectItem>
                  <SelectItem value="completo" className="text-sm">Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters({ searchTerm: filters.searchTerm, categoria: 'all', fornecedorId: 'all', statusEstoque: 'all', tag: '', cadastroIncompleto: 'all' })} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="hidden md:grid md:grid-cols-5 gap-2">
          <Select value={filters.categoria} onValueChange={v => handleFilterChange('categoria', v)}>
            <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="all" className="text-xs">Todas as categorias</SelectItem>
              {categorias.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.fornecedorId} onValueChange={v => handleFilterChange('fornecedorId', v)}>
            <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="all" className="text-xs">Todos os fornecedores</SelectItem>
              {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.statusEstoque} onValueChange={v => handleFilterChange('statusEstoque', v)}>
            <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="all" className="text-xs">Todos os status</SelectItem>
              <SelectItem value="ok" className="text-xs">OK</SelectItem>
              <SelectItem value="baixo" className="text-xs">Baixo</SelectItem>
              <SelectItem value="critico" className="text-xs">Crítico</SelectItem>
              <SelectItem value="inativo" className="text-xs">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Tag" className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs rounded-lg" value={filters.tag || ''} onChange={e => handleFilterChange('tag', e.target.value)} />
          <Select value={filters.cadastroIncompleto} onValueChange={v => handleFilterChange('cadastroIncompleto', v)}>
            <SelectTrigger className="bg-gray-100 dark:bg-gray-800 border-none h-9 text-xs w-full rounded-lg"><SelectValue placeholder="Cadastro" /></SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="incompleto" className="text-xs">Incompleto</SelectItem>
              <SelectItem value="completo" className="text-xs">Completo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}