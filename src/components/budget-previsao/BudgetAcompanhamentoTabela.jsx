import React from 'react';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38StatusLabel } from '@/components/ui/p38-mobile-line';
import { cn } from '@/lib/utils';
import { P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import {
  STATUS_CONSUMO,
  STATUS_CONSUMO_LABELS,
} from '@/lib/budgetCalculos';

function CelulaValor({ valor, positivo, className }) {
  const n = Number(valor) || 0;
  const cls =
    positivo === true
      ? 'text-emerald-700 dark:text-emerald-400'
      : positivo === false
        ? 'text-red-700 dark:text-red-400'
        : '';
  return (
    <span className={cn('tabular-nums font-medium', cls, className)}>
      {formatFinanceiroValor(n)}
    </span>
  );
}

function toneFromStatus(status) {
  if (status === STATUS_CONSUMO.ACIMA) return 'danger';
  if (status === STATUS_CONSUMO.ATENCAO) return 'warning';
  return 'success';
}

function BarraConsumo({ percentual, className }) {
  const p = Math.min(100, Math.max(0, Number(percentual) || 0));
  const cor =
    p > 100 ? 'bg-red-500' : p >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className={cn('flex items-center gap-2 justify-end', className)}>
      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', cor)} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(p)}%</span>
    </div>
  );
}

function CardAcompanhamentoMobile({ visao, onOpen }) {
  const { modelo, orcado, realizado, saldo, consumo, status, estimativaResumo, metaDiaria, realizadoHoje } = visao;
  const showHoje = modelo?.modo_estimativa === 'por_dia' || modelo?.usa_dias_uteis;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(visao)}
      className="w-full text-left rounded-xl border border-border/40 bg-card/40 p-3 space-y-2 transition-colors hover:bg-card/70"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{modelo?.nome}</p>
          <p className="text-[11px] text-muted-foreground truncate">{estimativaResumo}</p>
        </div>
        <P38StatusLabel tone={toneFromStatus(status)}>
          {STATUS_CONSUMO_LABELS[status]}
        </P38StatusLabel>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Orçado</p>
          <CelulaValor valor={orcado} className="text-sm" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Realizado</p>
          <CelulaValor valor={realizado} className="text-sm" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</p>
          <CelulaValor valor={saldo} positivo={saldo >= 0} className="text-sm" />
        </div>
      </div>
      <BarraConsumo percentual={consumo} className="justify-start" />
      {showHoje && metaDiaria > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Hoje {formatFinanceiroValor(realizadoHoje)} / {formatFinanceiroValor(metaDiaria)}
        </p>
      ) : null}
    </button>
  );
}

function LinhaAcompanhamento({ visao, onOpen }) {
  const { modelo, orcado, realizado, saldo, consumo, status, estimativaResumo, metaDiaria, realizadoHoje } = visao;
  const showHoje = modelo?.modo_estimativa === 'por_dia' || modelo?.usa_dias_uteis;
  const centro = String(modelo?.centro_custo || '').trim();

  return (
    <tr
      className="border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/20"
      onClick={() => onOpen?.(visao)}
    >
      <td className="py-3 pr-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{modelo?.nome}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{estimativaResumo}</p>
          {(centro || showHoje) && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {centro ? centro : null}
              {centro && showHoje ? ' · ' : null}
              {showHoje && metaDiaria > 0
                ? `Hoje ${formatFinanceiroValor(realizadoHoje)} / ${formatFinanceiroValor(metaDiaria)}`
                : null}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 px-2 text-right text-sm whitespace-nowrap">
        <CelulaValor valor={orcado} />
      </td>
      <td className="py-3 px-2 text-right text-sm whitespace-nowrap">
        <CelulaValor valor={realizado} />
      </td>
      <td className="py-3 px-2 text-right text-sm whitespace-nowrap">
        <CelulaValor valor={saldo} positivo={saldo >= 0} />
      </td>
      <td className="py-3 px-2 text-right">
        <BarraConsumo percentual={consumo} />
      </td>
      <td className="py-3 pl-2 text-right whitespace-nowrap">
        <P38StatusLabel tone={toneFromStatus(status)}>
          {STATUS_CONSUMO_LABELS[status]}
        </P38StatusLabel>
      </td>
    </tr>
  );
}

export default function BudgetAcompanhamentoTabela({ visoes = [], totais, onOpen }) {
  if (!visoes.length) return null;

  const saldoTotal = totais?.saldo ?? visoes.reduce((acc, v) => acc + (v.saldo || 0), 0);
  const consumoTotal =
    totais?.orcado > 0 ? Math.round((totais.realizado / totais.orcado) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="space-y-2 md:hidden">
        {visoes.map((visao) => (
          <CardAcompanhamentoMobile key={visao.modelo?.id} visao={visao} onOpen={onOpen} />
        ))}
        {totais?.count > 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total orçado</p>
              <CelulaValor valor={totais.orcado} className="text-sm font-semibold" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total realizado</p>
              <CelulaValor valor={totais.realizado} className="text-sm font-semibold" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</p>
              <CelulaValor valor={saldoTotal} positivo={saldoTotal >= 0} className="text-sm font-semibold" />
            </div>
          </div>
        )}
      </div>

      <div className={cn('hidden md:block overflow-x-auto rounded-xl', P38_FIELD_SURFACE)}>
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 pr-3 font-medium">Budget</th>
              <th className="py-2.5 px-2 text-right font-medium">Orçado</th>
              <th className="py-2.5 px-2 text-right font-medium">Realizado</th>
              <th className="py-2.5 px-2 text-right font-medium">Saldo</th>
              <th className="py-2.5 px-2 text-right font-medium">Consumo</th>
              <th className="py-2.5 pl-2 text-right font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {visoes.map((visao) => (
              <LinhaAcompanhamento key={visao.modelo?.id} visao={visao} onOpen={onOpen} />
            ))}
            {totais?.count > 0 && (
              <tr className="bg-muted/15 font-semibold">
                <td className="py-3 pr-3 text-sm">Total</td>
                <td className="py-3 px-2 text-right text-sm">
                  <CelulaValor valor={totais.orcado} />
                </td>
                <td className="py-3 px-2 text-right text-sm">
                  <CelulaValor valor={totais.realizado} />
                </td>
                <td className="py-3 px-2 text-right text-sm">
                  <CelulaValor valor={saldoTotal} positivo={saldoTotal >= 0} />
                </td>
                <td className="py-3 px-2 text-right">
                  <BarraConsumo percentual={consumoTotal} />
                </td>
                <td className="py-3 pl-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
