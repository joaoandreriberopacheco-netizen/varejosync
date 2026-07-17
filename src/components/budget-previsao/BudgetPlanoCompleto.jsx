import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { cn } from '@/lib/utils';
import { P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { formatCompetenciaLabel } from '@/lib/budgetCalculos';

function CelulaValor({ valor, positivo }) {
  const n = Number(valor) || 0;
  const cls =
    positivo === true
      ? 'text-emerald-700 dark:text-emerald-400'
      : positivo === false
        ? 'text-red-700 dark:text-red-400'
        : '';
  return <span className={cn('tabular-nums font-medium', cls)}>{formatFinanceiroValor(n)}</span>;
}

function LinhaPlano({ label, planejado, realizado, linkTo }) {
  const diff = (Number(planejado) || 0) - (Number(realizado) || 0);
  return (
    <tr className="border-b border-border/40">
      <td className="py-3 pr-2 text-sm font-medium">{label}</td>
      <td className="py-3 px-2 text-right text-sm">
        <CelulaValor valor={planejado} />
      </td>
      <td className="py-3 px-2 text-right text-sm">
        <CelulaValor valor={realizado} />
      </td>
      <td className="py-3 pl-2 text-right text-sm">
        <CelulaValor valor={diff} positivo={diff >= 0} />
      </td>
      <td className="py-3 pl-2 text-right">
        {linkTo ? (
          <Link to={linkTo} className="text-xs text-primary hover:underline">
            Abrir →
          </Link>
        ) : null}
      </td>
    </tr>
  );
}

export default function BudgetPlanoCompleto({
  competencia,
  totaisFixas,
  totaisFolha,
  totaisBudgets,
  realizadoFixas,
  realizadoFolha,
  receitasRealizadas,
}) {
  const planejadoDespesas =
    (totaisFixas?.total || 0) + (totaisFolha?.custoTotalEmpresa || 0) + (totaisBudgets?.orcado || 0);
  const realizadoDespesas =
    (realizadoFixas || 0) + (realizadoFolha || 0) + (totaisBudgets?.realizado || 0);
  const diffDespesas = planejadoDespesas - realizadoDespesas;
  const resultado = (Number(receitasRealizadas) || 0) - realizadoDespesas;

  const compLabel = formatCompetenciaLabel(competencia);

  const rows = useMemo(
    () => [
      {
        key: 'fixas',
        label: 'Contas fixas',
        planejado: totaisFixas?.total || 0,
        realizado: realizadoFixas || 0,
        link: `/PlanejamentoFinanceiro?competencia=${competencia}`,
      },
      {
        key: 'folha',
        label: 'Folha',
        planejado: totaisFolha?.custoTotalEmpresa || 0,
        realizado: realizadoFolha || 0,
        link: `/FolhaPrevisao?competencia=${competencia}`,
      },
      {
        key: 'budgets',
        label: 'Budgets',
        planejado: totaisBudgets?.orcado || 0,
        realizado: totaisBudgets?.realizado || 0,
        link: `/Budgets?aba=acompanhamento&competencia=${competencia}`,
      },
    ],
    [competencia, totaisFixas, totaisFolha, totaisBudgets, realizadoFixas, realizadoFolha],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-semibold">Plano financeiro — {compLabel}</h2>
        <P38HelpPopover label="Ajuda: plano completo" size="sm">
          <p className="text-muted-foreground">
            Junta contas fixas, folha e budgets. O realizado usa despesas pagas no Fluxo (e lançamentos de folha/fixas quando identificáveis).
          </p>
        </P38HelpPopover>
      </div>

      <div className={cn('overflow-x-auto rounded-xl', P38_FIELD_SURFACE)}>
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2.5 pr-2 font-medium">Camada</th>
              <th className="py-2.5 px-2 text-right font-medium">Planejado</th>
              <th className="py-2.5 px-2 text-right font-medium">Realizado</th>
              <th className="py-2.5 pl-2 text-right font-medium">Diferença</th>
              <th className="py-2.5 pl-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <LinhaPlano
                key={r.key}
                label={r.label}
                planejado={r.planejado}
                realizado={r.realizado}
                linkTo={r.link}
              />
            ))}
            <tr className="border-t-2 border-border/60 bg-muted/20 font-semibold">
              <td className="py-3 pr-2 text-sm">Total despesas</td>
              <td className="py-3 px-2 text-right text-sm">
                <CelulaValor valor={planejadoDespesas} />
              </td>
              <td className="py-3 px-2 text-right text-sm">
                <CelulaValor valor={realizadoDespesas} />
              </td>
              <td className="py-3 pl-2 text-right text-sm">
                <CelulaValor valor={diffDespesas} positivo={diffDespesas >= 0} />
              </td>
              <td />
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-3 pr-2 text-sm">Receitas (fluxo)</td>
              <td className="py-3 px-2 text-right text-sm text-muted-foreground">—</td>
              <td className="py-3 px-2 text-right text-sm">
                <CelulaValor valor={receitasRealizadas} />
              </td>
              <td className="py-3 pl-2" colSpan={2} />
            </tr>
            <tr>
              <td className="py-3 pr-2 text-sm font-semibold">Resultado</td>
              <td className="py-3 px-2 text-right text-sm text-muted-foreground">—</td>
              <td className="py-3 px-2 text-right text-sm font-semibold">
                <CelulaValor valor={resultado} positivo={resultado >= 0} />
              </td>
              <td className="py-3 pl-2" colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
