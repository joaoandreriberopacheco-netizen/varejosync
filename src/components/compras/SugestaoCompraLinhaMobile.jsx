import React, { useEffect, useState } from 'react';
import { Layers, Truck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { P38MobileLine, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import { cn } from '@/components/utils';

function AbcdBadge({ letter }) {
  const value = String(letter || '').toUpperCase();
  if (!value) return null;
  const tone =
    value === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    : value === 'B' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
    : value === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    : value === 'E' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
    : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold shrink-0', tone)}>
      {value}
    </span>
  );
}

function rowAccent(linha, selecionado) {
  if (selecionado) return 'info';
  const estoque = linha?.sugestao?.estoque_atual ?? linha?.produto?.estoque_atual ?? 0;
  const ponto = linha?.sugestao?.ponto_pedido ?? 0;
  if (estoque <= 0) return 'danger';
  if (ponto > 0 && estoque < ponto) return 'warning';
  return 'muted';
}

export default function SugestaoCompraLinhaMobile({
  linha,
  disp,
  selecionado,
  onToggleSelecionado,
  onQuantidadeLinhaChange,
  fornecedorSelect,
  striped,
}) {
  const sugestao = linha.sugestao;
  const isGrupo = linha.tipo === 'grupo';
  const estoque = sugestao?.estoque_atual ?? linha.produto?.estoque_atual ?? 0;
  const media30d = sugestao?.media_30d_texto;
  const pontoFuturo = sugestao?.ponto_futuro_texto;
  const abcd = getLinhaAbcdLetter(linha);
  const qty = disp?.quantidade ?? 0;
  const unidade = disp?.unidade || '';

  const [localQty, setLocalQty] = useState(() => String(qty));

  useEffect(() => {
    setLocalQty(String(qty));
  }, [linha.id, qty]);

  const commitQty = () => {
    const parsed = Number(String(localQty).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setLocalQty(String(qty));
      return;
    }
    onQuantidadeLinhaChange?.(linha, parsed);
  };

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(rowAccent(linha, selecionado))}
      className="!flex-col !items-stretch gap-2.5 !py-3.5 !min-h-0"
    >
      <div className="flex items-start gap-2.5 w-full min-w-0">
        <Checkbox
          checked={selecionado}
          onCheckedChange={(c) => onToggleSelecionado?.(!!c)}
          className="mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold uppercase truncate text-foreground/90">
              {linha.label}
            </span>
            <AbcdBadge letter={abcd} />
            {isGrupo ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                <Layers className="w-3 h-3" />
                {linha.skus?.length ?? 0}
              </span>
            ) : null}
          </div>
          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground leading-snug">
            <p>
              <span className="text-foreground/70">Estoque</span>{' '}
              <span className="tabular-nums font-medium text-foreground/85">{estoque}</span>
            </p>
            <p>
              <span className="text-foreground/70">Média 30d</span>{' '}
              {media30d || '—'}
            </p>
            <p>
              <span className="text-foreground/70">Ponto futuro</span>{' '}
              <span className={cn(
                'font-medium',
                sugestao?.fallback_cadastro ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400',
              )}>
                {pontoFuturo || '—'}
              </span>
            </p>
          </div>
          {linha.quantidade_pendente > 0 ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="w-3 h-3 shrink-0" />
              {linha.quantidade_pendente} em trânsito
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 pl-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Qtd sugerida</span>
          <Input
            type="text"
            inputMode="decimal"
            value={localQty}
            onChange={(e) => setLocalQty(e.target.value)}
            onBlur={commitQty}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitQty();
                e.currentTarget.blur();
              }
            }}
            className="h-9 w-[4.5rem] px-2 text-right text-sm tabular-nums"
          />
          {unidade ? (
            <span className="text-[11px] text-muted-foreground">{unidade}</span>
          ) : null}
        </div>
      </div>

      <div className="pl-8 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
        {fornecedorSelect}
      </div>
    </P38MobileLine>
  );
}
