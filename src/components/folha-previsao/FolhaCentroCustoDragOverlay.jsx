import React from 'react';
import { cn } from '@/lib/utils';

function iniciaisCentro(nome) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function CentroBola({
  id,
  label,
  iniciais,
  ativo,
  onDragOver,
  onDragLeave,
  onDrop,
  onTap,
}) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1.5 min-w-[4.5rem] max-w-[5.5rem] rounded-xl p-1 transition-colors hover:bg-muted/40"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onTap}
    >
      <div
        className={cn(
          'flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-2 text-sm font-bold uppercase tracking-tight shadow-lg transition-all',
          ativo
            ? 'scale-110 border-primary bg-primary text-primary-foreground'
            : 'border-border/80 bg-card text-foreground',
        )}
        aria-hidden
      >
        {iniciais}
      </div>
      <span
        className={cn(
          'w-full truncate text-center text-[10px] font-medium leading-tight',
          ativo ? 'text-foreground' : 'text-muted-foreground',
        )}
        title={label}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Overlay com “bolinhas” de centros de custo ao arrastar uma pessoa.
 */
export default function FolhaCentroCustoDragOverlay({
  open,
  centros = [],
  pessoaNome,
  dropCentroAtual,
  onHoverCentro,
  onLeaveCentro,
  onDropCentro,
}) {
  if (!open) return null;

  const handleDrop = (e, centro) => {
    e.preventDefault();
    e.stopPropagation();
    onDropCentro?.(centro);
  };

  const handleOver = (e, chave) => {
    e.preventDefault();
    onHoverCentro?.(chave);
  };

  const assign = (centro) => {
    onDropCentro?.(centro);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-background/70 backdrop-blur-sm pb-[calc(var(--p38-scroll-pad-below-nav)+5.5rem)] md:pb-28 pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-lg px-4">
        <div className="rounded-2xl border border-border/60 bg-card/95 px-4 py-4 shadow-2xl">
          <p className="mb-1 text-center text-sm font-medium text-foreground">
            Solte em um centro de custo
          </p>
          {pessoaNome ? (
            <p className="mb-4 truncate text-center text-xs text-muted-foreground">{pessoaNome}</p>
          ) : (
            <div className="mb-4" />
          )}

          {centros.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-2">
              Cadastre centros pelo botão <strong className="text-foreground">+</strong> antes de classificar.
            </p>
          ) : (
            <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-5">
              {centros.map((centro) => {
                const chave = centro;
                return (
                  <CentroBola
                    key={chave}
                    id={chave}
                    label={centro}
                    iniciais={iniciaisCentro(centro)}
                    ativo={dropCentroAtual === chave}
                    onDragOver={(e) => handleOver(e, chave)}
                    onDragLeave={() => onLeaveCentro?.(chave)}
                    onDrop={(e) => handleDrop(e, centro)}
                    onTap={() => assign(centro)}
                  />
                );
              })}
              <CentroBola
                id="__sem__"
                label="Sem centro"
                iniciais="—"
                ativo={dropCentroAtual === '__sem__'}
                onDragOver={(e) => handleOver(e, '__sem__')}
                onDragLeave={() => onLeaveCentro?.('__sem__')}
                onDrop={(e) => handleDrop(e, '')}
                onTap={() => assign('')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
