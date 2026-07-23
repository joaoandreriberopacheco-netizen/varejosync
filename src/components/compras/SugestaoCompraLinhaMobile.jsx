import React, { useEffect, useState } from 'react';
import { Layers, Truck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/utils';
import {
  P38MobileLine,
  P38MobileMetric,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { getLinhaAbcdLetter } from '@/lib/sugestaoCompraTree';
import {
  sugestaoProjecaoEstoque30dNegativa,
  sugestaoProjecaoEstoque30dTexto,
} from '@/lib/calcularSugestaoCompraVelocidade';
import { formatSugestaoEstoqueLinha, formatSugestaoQuantidadeVitrine } from '@/lib/sugestaoCompraVitrineDisplay';

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
    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[9px] font-bold shrink-0', tone)}>
      {value}
    </span>
  );
}

function rowAccent(linha, selecionado) {
  if (selecionado) return 'info';
  const estoque = linha?.sugestao?.estoque_atual ?? linha?.produto?.estoque_atual ?? 0;
  if (estoque <= 0) return 'danger';
  if (sugestaoProjecaoEstoque30dNegativa(linha?.sugestao)) return 'warning';
  const gap = Number(linha?.sugestao?.gap_ponto_futuro_base);
  if (Number.isFinite(gap) && gap > 0) return 'warning';
  const ponto = linha?.sugestao?.ponto_pedido ?? 0;
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
  incluirPedidosAprovados = false,
}) {
  const sugestao = linha.sugestao;
  const isGrupo = linha.tipo === 'grupo';
  const produto = linha.produto;
  const estoqueFmt = formatSugestaoEstoqueLinha(produto, sugestao, {
    incluirPedidosAprovados,
    quantidadePendente: linha.quantidade_pendente,
  });
  const estoqueTexto = estoqueFmt.primary;
  const media30d = sugestao?.media_30d_texto || '—';
  const pontoFuturoProjecao = sugestaoProjecaoEstoque30dTexto(sugestao);
  const projecaoNegativa = sugestaoProjecaoEstoque30dNegativa(sugestao);
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
      className={cn(
        '!flex-col !items-stretch gap-2 !py-2.5 !min-h-0 !pl-2.5 !pr-2.5 overflow-hidden max-w-full',
        selecionado && 'bg-teal-50/50 dark:bg-teal-950/20',
      )}
      onClick={() => onToggleSelecionado?.(!selecionado)}
    >
      <div className="flex items-start gap-2 w-full min-w-0">
        <div
          className="flex items-center justify-center shrink-0 min-h-[40px] min-w-[40px] -ml-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selecionado}
            onCheckedChange={(c) => onToggleSelecionado?.(!!c)}
            className="h-4 w-4"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 min-w-0">
            <h3 className="flex-1 min-w-0 text-xs font-semibold uppercase leading-snug line-clamp-2 text-foreground/90">
              {linha.label}
            </h3>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <AbcdBadge letter={abcd} />
              {isGrupo ? (
                <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  <Layers className="w-2.5 h-2.5" />
                  {linha.skus?.length ?? 0}
                </span>
              ) : null}
            </div>
          </div>
          {!isGrupo && produto?.codigo_interno ? (
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground truncate">
              {produto.codigo_interno}
            </p>
          ) : null}
          {linha.quantidade_pendente > 0 ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="w-3 h-3 shrink-0" />
              {formatSugestaoQuantidadeVitrine(produto, linha.quantidade_pendente) || `${linha.quantidade_pendente}`} em trânsito
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-1 min-w-0 overflow-hidden rounded-lg bg-muted/30 dark:bg-muted/20 px-1.5 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <P38MobileMetric label="Est." value={estoqueTexto} className="!min-w-0 !max-w-none w-full shrink overflow-hidden" />
        <P38MobileMetric label="Méd." value={media30d} className="!min-w-0 !max-w-none w-full shrink overflow-hidden" />
        <P38MobileMetric
          label="P.fut."
          value={pontoFuturoProjecao}
          tone={projecaoNegativa ? 'danger' : 'muted'}
          className="!min-w-0 !max-w-none w-full shrink overflow-hidden"
        />
      </div>

      <div
        className="grid grid-cols-2 gap-2 items-end min-w-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Qtd
          </p>
          <div className="flex items-center gap-1">
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
              className="h-9 flex-1 min-w-0 px-2 text-right text-sm tabular-nums font-medium"
            />
            {unidade ? (
              <span className="text-[10px] text-muted-foreground shrink-0 w-7 truncate">{unidade}</span>
            ) : null}
          </div>
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 truncate">
            Forn.
          </p>
          <div className="min-w-0 max-w-full overflow-hidden">
            {fornecedorSelect}
          </div>
        </div>
      </div>
    </P38MobileLine>
  );
}
