import React, { useMemo } from 'react';
import {
  formatCompetenciaLabel,
  formatCurrency,
  calcularProjecaoCaixa,
} from '@/lib/folhaPrevisaoCalculos';

function MesRow({ linha, destaque }) {
  const temExtra = linha.decimo > 0 || linha.ferias > 0;
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ring-1 ${
        destaque ? 'bg-primary/5 ring-primary/30' : 'bg-card ring-border/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium text-sm">{formatCompetenciaLabel(linha.competencia)}</div>
          <div className="text-[10px] text-muted-foreground">{linha.ativos} colaborador(es)</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold tabular-nums">{formatCurrency(linha.custoTotal)}</div>
          <div className="text-[10px] text-muted-foreground">custo total</div>
        </div>
      </div>
      {temExtra && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          {linha.decimo > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              13º {formatCurrency(linha.decimo)}
            </span>
          )}
          {linha.ferias > 0 && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              Férias {formatCurrency(linha.ferias)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function FolhaPrevisaoProjecao({ modelos, competenciaInicio }) {
  const linhas = useMemo(
    () => calcularProjecaoCaixa(modelos, 12, competenciaInicio),
    [modelos, competenciaInicio],
  );

  const totalAno = linhas.reduce((acc, l) => acc + l.custoTotal, 0);
  const competenciaAtual = competenciaInicio;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Projeção de caixa para os próximos 12 meses — inclui salários fixos, 13º (nov/dez), férias programadas e
        encargos. Colaboradores desligados saem automaticamente dos meses seguintes.
      </p>

      <div className="rounded-xl bg-muted/40 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Custo total projetado (12 meses)</span>
        <span className="text-lg font-semibold tabular-nums">{formatCurrency(totalAno)}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {linhas.map((linha) => (
          <MesRow key={linha.competencia} linha={linha} destaque={linha.competencia === competenciaAtual} />
        ))}
      </div>
    </div>
  );
}
