import React, { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const STATUS_OPTIONS = [
  { codigo: 'Rascunho',             label: 'Rascunho',              cor: 'bg-gray-100 text-gray-700' },
  { codigo: 'Aguardando Liberação', label: 'Aguardando Liberação',  cor: 'bg-yellow-100 text-yellow-800' },
  { codigo: 'Aprovado',             label: 'Aprovado',              cor: 'bg-green-100 text-green-800' },
  { codigo: 'Despachado',           label: 'Despachado',            cor: 'bg-blue-100 text-blue-800' },
  { codigo: 'Em Recepção',          label: 'Em Recepção',           cor: 'bg-indigo-100 text-indigo-800' },
  { codigo: 'Pendência',            label: 'Pendência',             cor: 'bg-orange-100 text-orange-800' },
  { codigo: 'Devolvido',            label: 'Devolvido',             cor: 'bg-rose-100 text-rose-800' },
  { codigo: 'Concluído',            label: 'Concluído',             cor: 'bg-emerald-100 text-emerald-800' },
  { codigo: 'Cancelado',            label: 'Cancelado',             cor: 'bg-red-100 text-red-800' },
];

export default function FiltrosCompras({ 
  search, onSearch, 
  statusSel, onStatusSel, 
  fornecedores, fornecedorSel, onFornecedorSel,
  todasTags, tagsSel, onTagsSel,
  hasActiveFilters, onLimparFiltros 
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchFornecedor, setSearchFornecedor] = useState('');
  const [searchTag, setSearchTag] = useState('');

  const tagsFiltradas = useMemo(() => {
    const sorted = [...(todasTags || [])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (!searchTag.trim()) return sorted;
    return sorted.filter(t => t.toLowerCase().includes(searchTag.toLowerCase()));
  }, [todasTags, searchTag]);

  const fornecedoresFiltrados = useMemo(() => {
    const sorted = [...fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!searchFornecedor.trim()) return sorted;
    const lower = searchFornecedor.toLowerCase();
    return sorted.filter(f => f.nome.toLowerCase().includes(lower));
  }, [fornecedores, searchFornecedor]);

  const toggleStatus = (codigo) => {
    if (statusSel.includes(codigo)) {
      onStatusSel(statusSel.filter(s => s !== codigo));
    } else {
      onStatusSel([...statusSel, codigo]);
    }
  };

  const toggleFornecedor = (id) => {
    if (fornecedorSel.includes(id)) {
      onFornecedorSel(fornecedorSel.filter(f => f !== id));
    } else {
      onFornecedorSel([...fornecedorSel, id]);
    }
  };

  const toggleTag = (tag) => {
    if (tagsSel.includes(tag)) {
      onTagsSel(tagsSel.filter(t => t !== tag));
    } else {
      onTagsSel([...tagsSel, tag]);
    }
  };

  const fornecedoresSelecionadosNomes = fornecedorSel.length > 0
    ? fornecedores.filter(f => fornecedorSel.includes(f.id)).map(f => f.nome).join(', ')
    : '';

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar número, fornecedor..."
            className="w-full pl-10 pr-4 h-11 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder:text-gray-400 rounded-2xl outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm relative ${
            showFilters 
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' 
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-md'
          }`}
          title="Abrir/fechar filtros"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {hasActiveFilters && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-900" />
          )}
        </button>
      </div>

      {/* Chips de fornecedores e tags selecionadas */}
      {(fornecedorSel.length > 0 || tagsSel.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {fornecedores.filter(f => fornecedorSel.includes(f.id)).map(f => (
            <span key={f.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">
              {f.nome}
              <button onClick={() => toggleFornecedor(f.id)} className="hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {tagsSel.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-2 py-1 rounded-full">
              <Tag className="w-2.5 h-2.5" />
              {tag}
              <button onClick={() => toggleTag(tag)} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
            {hasActiveFilters && (
              <button 
                  onClick={() => {
                    onLimparFiltros();
                    setSearchFornecedor('');
                    setSearchTag('');
                  }}
                className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar tudo
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => {
                const selected = statusSel.includes(s.codigo);
                return (
                  <button
                    key={s.codigo}
                    onClick={() => toggleStatus(s.codigo)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all ${
                      selected
                        ? `${s.cor} font-medium shadow-sm`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {selected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags — busca incremental */}
          {(todasTags?.length > 0) && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Tags</label>
              <div className="space-y-2">
                <div className="relative">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar tag..."
                    className="pl-8 h-9 text-xs bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
                    value={searchTag}
                    onChange={e => setSearchTag(e.target.value)}
                  />
                  {searchTag && (
                    <button onClick={() => setSearchTag('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-32 overflow-y-auto space-y-0.5 pr-1">
                  {tagsFiltradas.map(tag => (
                    <label key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <Checkbox
                        checked={tagsSel.includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{tag}</span>
                    </label>
                  ))}
                  {tagsFiltradas.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhuma tag encontrada</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fornecedores — busca incremental */}
          {fornecedores.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Fornecedores</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar fornecedor..."
                    className="pl-8 h-9 text-xs bg-gray-50 dark:bg-gray-700 border-0 shadow-sm"
                    value={searchFornecedor}
                    onChange={e => setSearchFornecedor(e.target.value)}
                  />
                  {searchFornecedor && (
                    <button 
                      onClick={() => setSearchFornecedor('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                  {fornecedoresFiltrados.map(f => (
                    <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <Checkbox 
                        checked={fornecedorSel.includes(f.id)}
                        onCheckedChange={() => toggleFornecedor(f.id)}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{f.nome}</span>
                    </label>
                  ))}
                  {fornecedoresFiltrados.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhum fornecedor encontrado</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}