import React, { useEffect, useState } from 'react';
import { Layers, Truck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  P38MobileLine,
  P38MobileMetric,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { cn } from '@/components/utils';
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
    <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-[10px] font-bold shrink-0', tone)}>
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
        '!flex-col !items-stretch gap-3 !py-4 !min-h-0',
        selecionado && 'bg-teal-50/50 dark:bg-teal-950/20',
      )}
      onClick={() => onToggleSelecionado?.(!selecionado)}
    >
      <div className="flex items-start gap-3 w-full min-w-0">
        <div
          className="flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] -ml-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selecionado}
            onCheckedChange={(c) => onToggleSelecionado?.(!!c)}
            className="h-5 w-5"
          />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap items-start gap-2 min-w-0">
            <h3 className="flex-1 min-w-0 text-sm font-semibold uppercase leading-snug break-words text-foreground/90">
              {linha.label}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <AbcdBadge letter={abcd} />
              {isGrupo ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Layers className="w-3 h-3" />
                  {linha.skus?.length ?? 0}
                </span>
              ) : null}
            </div>
          </div>
          {!isGrupo && produto?.codigo_interno ? (
            <p className="mt-1 text-[11px] font-mono text-muted-foreground break-all leading-tight">
              {produto.codigo_interno}
            </p>
          ) : null}
          {linha.quantidade_pendente > 0 ? (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Truck className="w-3.5 h-3.5 shrink-0" />
              {formatSugestaoQuantidadeVitrine(produto, linha.quantidade_pendente) || `${linha.quantidade_pendente}`} em trânsito
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-2 rounded-xl bg-muted/35 dark:bg-muted/25 p-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <P38MobileMetric label="Estoque" value={estoqueTexto} className="min-w-0 max-w-none" />
        <P38MobileMetric label="Méd. 30d" value={media30d} className="min-w-0 max-w-none" />
        <P38MobileMetric
          label="P. futuro"
          value={pontoFuturoProjecao}
          tone={projecaoNegativa ? 'danger' : 'muted'}
          className="min-w-0 max-w-none"
        />
      </div>

      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-xl border border-border/30 bg-card/80 dark:bg-card/40 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Quantidade sugerida
          </p>
          <div className="flex items-center gap-2">
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
              className="h-11 flex-1 min-w-0 px-3 text-right text-base tabular-nums font-medium"
            />
            {unidade ? (
              <span className="text-sm text-muted-foreground shrink-0 min-w-[2rem]">{unidade}</span>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-border/30 bg-card/80 dark:bg-card/40 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Fornecedor
          </p>
          {fornecedorSelect}
        </div>
      </div>
    </P38MobileLine>
  );
}
