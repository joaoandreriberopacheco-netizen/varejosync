import React, { useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { matchesProduct, PrecoVendaTabelaLinhas } from './quickBudgetUtils';

export default function QuickBudgetProductSearch({ inputRef, query, onQueryChange, produtos, tabelaPreco, onAddProduct, onSubmitFirstResult }) {
  const resultados = useMemo(() => {
    const ordenados = [...produtos].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    if (!query?.trim()) return [];
    return ordenados.filter((produto) => matchesProduct(produto, query)).slice(0, 8);
  }, [produtos, query]);

  const shouldShowResults = query?.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          variant="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && resultados[0]) {
              e.preventDefault();
              onSubmitFirstResult?.(resultados[0]);
            }
          }}
          placeholder="Buscar produto, código ou marca"
          className="h-14 md:h-12 pl-11 pr-4 border-0 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-sm text-base md:text-sm"
        />
      </div>

      {shouldShowResults && (
        <div className="space-y-2 max-h-[min(40vh,20rem)] overflow-y-auto pr-1 pb-1">
          {resultados.map((produto) => (
            <button
              key={produto.id}
              type="button"
              onClick={() => onAddProduct(produto)}
              className="w-full rounded-2xl bg-white dark:bg-gray-900 shadow-sm px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{produto.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Estoque: {Number(produto.estoque_atual || 0)}</span>
                    {produto.codigo_interno && <span>#{produto.codigo_interno}</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 self-center">
                  <PrecoVendaTabelaLinhas
                    produto={produto}
                    tabelaPreco={tabelaPreco}
                    variant="quickBudget"
                    finalClassName="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums"
                    labelBottom={false}
                  />
                </div>
              </div>
            </button>
          ))}

          {resultados.length === 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm px-4 py-6 text-center text-sm text-gray-400">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}