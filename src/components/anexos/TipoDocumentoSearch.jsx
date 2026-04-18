import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Busca incremental, ordenação alfabética (pt-BR).
 * Se o texto não corresponder a nenhum tipo existente, oferece criar tipo personalizado.
 *
 * @param {boolean} [hideListUntilFocused] — só mostra lista / “adicionar tipo” após foco na busca (ou com texto na busca)
 * @param {boolean} [generousPadding] — linhas mais altas para toque em mobile
 * @param {boolean} [deferKeyboardUntilTap] — barra de busca visível, mas o teclado só abre após toque (evita salto na UI no mobile)
 */
export default function TipoDocumentoSearch({
  tipos = [],
  value,
  onChange,
  onAdicionarTipoNovo,
  hideListUntilFocused = false,
  generousPadding = false,
  deferKeyboardUntilTap = false,
}) {
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardUnlocked, setKeyboardUnlocked] = useState(!deferKeyboardUntilTap);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);

  const normalized = query.trim().toLowerCase();
  const sortedTipos = useMemo(
    () => [...tipos].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    [tipos]
  );

  const filtered = useMemo(() => {
    if (!normalized) return sortedTipos;
    return sortedTipos.filter((tipo) => tipo.toLowerCase().includes(normalized));
  }, [sortedTipos, normalized]);

  const trimmedQuery = query.trim();
  const exactMatch =
    trimmedQuery.length > 0 &&
    sortedTipos.some((t) => t.localeCompare(trimmedQuery, 'pt-BR', { sensitivity: 'base' }) === 0);
  const showAdicionar = trimmedQuery.length > 0 && !exactMatch;

  const listVisible =
    !hideListUntilFocused || searchFocused || normalized.length > 0;

  const rowPad = generousPadding ? 'min-h-[3.75rem] py-5 px-4 md:py-6' : 'min-h-14 py-4 px-4';

  const aplicarTipoPersonalizado = () => {
    if (!trimmedQuery) return;
    onChange(trimmedQuery);
    onAdicionarTipoNovo?.(trimmedQuery);
    setQuery('');
  };

  const clearBlurTimer = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  };

  useEffect(() => () => clearBlurTimer(), []);

  useEffect(() => {
    if (keyboardUnlocked && deferKeyboardUntilTap && inputRef.current) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [keyboardUnlocked, deferKeyboardUntilTap]);

  const unlockAndFocus = () => {
    setKeyboardUnlocked(true);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
        {deferKeyboardUntilTap && !keyboardUnlocked ? (
          <button
            type="button"
            onClick={unlockAndFocus}
            className="flex h-12 w-full items-center rounded-2xl border-0 bg-gray-100 pl-11 pr-4 text-left text-sm shadow-sm dark:bg-muted/60 dark:border dark:border-border"
          >
            <span className="text-gray-500 dark:text-muted-foreground">Buscar tipo de documento (A-Z)</span>
          </button>
        ) : (
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              clearBlurTimer();
              setSearchFocused(true);
            }}
            onBlur={() => {
              clearBlurTimer();
              blurTimer.current = setTimeout(() => setSearchFocused(false), 220);
            }}
            placeholder="Buscar tipo de documento (A-Z)"
            className="h-12 rounded-2xl border-0 bg-gray-100 pl-11 shadow-sm dark:bg-muted/60 dark:border dark:border-border"
            autoComplete="off"
          />
        )}
      </div>

      {hideListUntilFocused && !listVisible && value && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-border dark:bg-card dark:text-muted-foreground">
          Tipo selecionado: <span className="font-medium text-gray-900 dark:text-foreground">{value}</span>
          <span className="mt-1 block text-xs opacity-90">Toque na busca para alterar ou ver a lista.</span>
        </p>
      )}

      {listVisible && showAdicionar && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={aplicarTipoPersonalizado}
          className={`flex w-full items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white text-left text-sm text-gray-700 shadow-sm transition-colors dark:border-border dark:bg-card dark:text-foreground ${rowPad}`}
        >
          <Plus className="h-4 w-4 flex-none text-lime-600 dark:text-lime-400" />
          <span>
            <span className="font-medium">Adicionar tipo </span>
            <span className="text-gray-900 dark:text-foreground">«{trimmedQuery}»</span>
          </span>
        </button>
      )}

      {listVisible && (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1 md:max-h-72">
          {filtered.map((tipo) => {
            const selected = tipo === value;
            return (
              <button
                key={tipo}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(tipo);
                  setQuery('');
                  setSearchFocused(false);
                }}
                className={`flex w-full items-center justify-between rounded-2xl text-left text-sm shadow-sm transition-colors ${rowPad} ${
                  selected
                    ? 'bg-primary/12 text-foreground ring-2 ring-primary/35 dark:bg-muted dark:text-foreground dark:ring-primary/45'
                    : 'bg-gray-100 text-gray-700 dark:border dark:border-border dark:bg-card dark:text-foreground'
                }`}
              >
                <span className="font-medium">{tipo}</span>
                {selected && <Check className="h-4 w-4 flex-none text-primary dark:text-primary" />}
              </button>
            );
          })}

          {filtered.length === 0 && !showAdicionar && (
            <div className="rounded-2xl bg-gray-100 px-4 py-4 text-sm text-gray-500 shadow-sm dark:bg-card dark:text-muted-foreground">
              Nenhum tipo encontrado. Digite acima para sugerir um novo tipo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
