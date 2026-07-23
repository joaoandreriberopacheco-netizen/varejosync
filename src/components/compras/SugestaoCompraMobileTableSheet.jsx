import React, { useEffect } from 'react';
import { X, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SugestaoCompraMobileTable from '@/components/compras/SugestaoCompraMobileTable';
import { useIsPhone } from '@/hooks/use-breakpoint';

async function tryLockLandscape() {
  try {
    await screen.orientation?.lock?.('landscape');
  } catch {
    /* iOS / browser sem suporte — utilizador gira manualmente */
  }
}

function tryUnlockOrientation() {
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ignore */
  }
}

export default function SugestaoCompraMobileTableSheet({
  open,
  onClose,
  isLandscape,
  linhas,
  selectedItems,
  onToggleSelected,
  sugestaoDisplayLinha,
  onQuantidadeLinhaChange,
  renderFornecedorSelect,
}) {
  const isPhone = useIsPhone();

  useEffect(() => {
    if (!open) return undefined;
    if (isPhone) tryLockLandscape();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      if (isPhone) tryUnlockOrientation();
    };
  }, [open, isPhone]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Tabela comparativa de sugestões"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={onClose}
          aria-label="Voltar para lista"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">Tabela comparativa</p>
          <p className="text-[10px] text-muted-foreground">{linhas.length} itens</p>
        </div>
      </header>

      {!isLandscape && isPhone ? (
        <div className="shrink-0 flex items-center gap-2 border-b border-teal-200/50 bg-teal-50/80 dark:bg-teal-950/30 dark:border-teal-800/40 px-3 py-2">
          <RotateCw className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
          <p className="text-[11px] leading-snug text-teal-900 dark:text-teal-100">
            Gire o celular na horizontal para ver mais colunas. Deslize para os lados se precisar.
          </p>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <SugestaoCompraMobileTable
          linhas={linhas}
          selectedItems={selectedItems}
          onToggleSelected={onToggleSelected}
          sugestaoDisplayLinha={sugestaoDisplayLinha}
          onQuantidadeLinhaChange={onQuantidadeLinhaChange}
          renderFornecedorSelect={renderFornecedorSelect}
          embedded
        />
      </div>
    </div>
  );
}
