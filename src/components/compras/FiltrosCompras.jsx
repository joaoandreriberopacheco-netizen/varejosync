import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

export default function FiltrosCompras({ 
  search, onSearch, 
  statusSel, onStatusSel, 
  fornecedores, fornecedorSel, onFornecedorSel,
  hasActiveFilters, onLimparFiltros 
}) {
  const [showFilters, setShowFilters] = useState(false);
  const todasSel = fornecedorSel.length === 0 || fornecedorSel.length === fornecedores.length;
  
  const toggleFornecedor = (id) => {
    if (fornecedorSel.includes(id)) {
      onFornecedorSel(fornecedorSel.filter(f => f !== id));
    } else {
      onFornecedorSel([...fornecedorSel, id]);
    }
  };

  const statusOptions = [
    { codigo: 'Aberto', label: 'Aberto' },
    { codigo: 'Confirmado', label: 'Confirmado' },
    { codigo: 'Em Separação', label: 'Em Separação' },
    { codigo: 'Enviado', label: 'Enviado' },
    { codigo: 'Recebido', label: 'Recebido' },
    { codigo: 'Cancelado', label: 'Cancelado' },
  ];

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
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 w-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-sm ${
            showFilters 
              ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' 
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-md'
          }`}
          title="Abrir/fechar filtros"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros</span>
            {hasActiveFilters && (
              <button 
                onClick={onLimparFiltros}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Limpar tudo
              </button>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Status</label>
            <div className="space-y-2">
              {statusOptions.map(s => (
                <label key={s.codigo} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox 
                    checked={statusSel.includes(s.codigo)}
                    onCheckedChange={() => {
                      if (statusSel.includes(s.codigo)) {
                        onStatusSel(statusSel.filter(st => st !== s.codigo));
                      } else {
                        onStatusSel([...statusSel, s.codigo]);
                      }
                    }}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-200">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fornecedores */}
          {fornecedores.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 block">Fornecedores</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-600">
                    <span>{todasSel ? 'Todos' : `${fornecedorSel.length} selecionado${fornecedorSel.length > 1 ? 's' : ''}`}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
                  <div className="space-y-0.5">
                    <button 
                      onClick={() => onFornecedorSel([])}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}
                    >
                      Todos os fornecedores
                    </button>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-1 space-y-0.5 max-h-48 overflow-y-auto">
                      {fornecedores.map(f => (
                        <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <Checkbox 
                            checked={fornecedorSel.includes(f.id)}
                            onCheckedChange={() => toggleFornecedor(f.id)}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{f.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}
    </div>
  );
}