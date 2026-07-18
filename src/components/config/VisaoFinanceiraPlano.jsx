import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, LayoutList, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { cn } from '@/lib/utils';
import { P38_CHIP_INACTIVE, P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { formatCompetenciaLabel, getCompetenciaAtual, shiftCompetencia } from '@/lib/budgetCalculos';
import {
  listarModelos as listarModelosBudget,
  listarCompetencias as listarCompetenciasBudget,
  listarLancamentosMes,
  obterLucroBrutoCompetencia,
} from '@/lib/budgetService';
import { listarModelos as listarModelosFolha, listarCompetencias as listarCompetenciasFolha } from '@/lib/folhaPrevisaoService';
import { listarModelos as listarModelosAgefin, listarLancamentosCompetencia } from '@/lib/agefinPrevisaoService';
import { montarPlanoFinanceiroConsolidado } from '@/lib/planoFinanceiroConsolidado';

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

function CardResumo({ label, valor, sublabel, destaque = false, positivo }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 p-3 min-w-0',
        destaque ? 'bg-muted/25 border-border/60' : 'bg-card/40',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <CelulaValor valor={valor} positivo={positivo} className="text-base mt-0.5" />
      {sublabel ? <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{sublabel}</p> : null}
    </div>
  );
}

function LinhaExplodida({ item }) {
  return (
    <tr className={cn('border-b border-border/30', item.destaque && 'bg-amber-50/50 dark:bg-amber-950/20')}>
      <td className="py-2.5 pl-3 pr-2 text-sm">
        <div className="font-medium leading-snug">{item.nome}</div>
        {item.detalhe ? (
          <div className="text-[11px] text-muted-foreground mt-0.5">{item.detalhe}</div>
        ) : null}
      </td>
      <td className="py-2.5 px-2 text-right text-sm">
        <CelulaValor valor={item.valor} />
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right text-sm">
        {item.valorSecundario != null ? (
          <div>
            <CelulaValor valor={item.valorSecundario} />
            {item.valorSecundarioLabel ? (
              <div className="text-[10px] text-muted-foreground">{item.valorSecundarioLabel}</div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right">
        {item.link ? (
          <Link to={item.link} className="text-xs text-primary hover:underline whitespace-nowrap">
            Abrir
          </Link>
        ) : null}
      </td>
    </tr>
  );
}

function CardExplodidoMobile({ item }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 p-3 space-y-1',
        item.destaque ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60' : 'bg-card/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{item.nome}</p>
          {item.detalhe ? <p className="text-[11px] text-muted-foreground">{item.detalhe}</p> : null}
        </div>
        {item.link ? (
          <Link to={item.link} className="shrink-0 text-xs text-primary hover:underline">
            Abrir
          </Link>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor</p>
          <CelulaValor valor={item.valor} className="text-sm" />
        </div>
        {item.valorSecundario != null ? (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {item.valorSecundarioLabel || 'Extra'}
            </p>
            <CelulaValor valor={item.valorSecundario} className="text-sm" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function VisaoFinanceiraPlano() {
  const [competencia, setCompetencia] = useState(getCompetenciaAtual);
  const [modo, setModo] = useState('resumo');

  const { data: modelosAgefin = [], isLoading: loadingAgefin } = useQuery({
    queryKey: ['visao-financeira', 'agefin-modelos'],
    queryFn: listarModelosAgefin,
  });

  const { data: modelosFolha = [], isLoading: loadingFolha } = useQuery({
    queryKey: ['visao-financeira', 'folha-modelos'],
    queryFn: listarModelosFolha,
  });

  const { data: modelosBudget = [], isLoading: loadingBudget } = useQuery({
    queryKey: ['visao-financeira', 'budget-modelos'],
    queryFn: listarModelosBudget,
  });

  const { data: competenciasFolha = [] } = useQuery({
    queryKey: ['visao-financeira', 'folha-competencias', competencia],
    queryFn: () => listarCompetenciasFolha(competencia),
  });

  const { data: competenciasBudget = [] } = useQuery({
    queryKey: ['visao-financeira', 'budget-competencias', competencia],
    queryFn: () => listarCompetenciasBudget(competencia),
  });

  const { data: lancamentosAgefin = [] } = useQuery({
    queryKey: ['visao-financeira', 'agefin-lancamentos', competencia],
    queryFn: () => listarLancamentosCompetencia(competencia),
  });

  const { data: lancamentosMes = [] } = useQuery({
    queryKey: ['visao-financeira', 'lancamentos-mes', competencia],
    queryFn: () => listarLancamentosMes(competencia),
  });

  const { data: lucroBrutoMes } = useQuery({
    queryKey: ['visao-financeira', 'lucro-bruto', competencia],
    queryFn: () => obterLucroBrutoCompetencia(competencia),
  });

  const plano = useMemo(
    () =>
      montarPlanoFinanceiroConsolidado({
        competencia,
        modelosAgefin,
        lancamentosAgefin,
        modelosFolha,
        competenciasFolha,
        modelosBudget,
        competenciasBudget,
        lancamentosMes,
        lucroBruto: lucroBrutoMes?.lucro_bruto || 0,
        margemDetalhe: lucroBrutoMes,
      }),
    [
      competencia,
      modelosAgefin,
      lancamentosAgefin,
      modelosFolha,
      competenciasFolha,
      modelosBudget,
      competenciasBudget,
      lancamentosMes,
      lucroBrutoMes,
    ],
  );

  const loading = loadingAgefin || loadingFolha || loadingBudget;
  const { resumo } = plano;
  const compLabel = formatCompetenciaLabel(competencia);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-foreground">Visão ampla do negócio</h2>
            <P38HelpPopover label="Ajuda: visão ampla" size="sm">
              <p className="text-muted-foreground">
                Consolida contas fixas, folha (com provisões de 13º e férias) e budgets num único painel analítico.
              </p>
              <p className="text-muted-foreground mt-2">
                Contas <strong className="text-foreground">anuais</strong> ficam separadas do total operacional e
                mostram a provisão mensal (valor ÷ 12). No mês de vencimento, o desembolso integral aparece à parte.
              </p>
              <p className="text-muted-foreground mt-2">
                O <strong className="text-foreground">resultado com provisões</strong> compara o lucro bruto com
                despesas operacionais + provisões mensais — útil para saber se o negócio sustenta o custo real do
                time e das obrigações recorrentes.
              </p>
            </P38HelpPopover>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Planejamento consolidado com detalhamento por conta, colaborador e budget
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn('flex items-center rounded-xl p-1', P38_FIELD_SURFACE)}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCompetencia((c) => shiftCompetencia(c, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm font-medium tabular-nums min-w-[5.5rem] text-center">{compLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCompetencia((c) => shiftCompetencia(c, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className={cn('flex rounded-xl p-1', P38_FIELD_SURFACE)}>
            <button
              type="button"
              onClick={() => setModo('resumo')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                modo === 'resumo' ? 'bg-background shadow-sm text-foreground' : P38_CHIP_INACTIVE,
              )}
            >
              <PieChart className="h-3.5 w-3.5" />
              Resumo
            </button>
            <button
              type="button"
              onClick={() => setModo('explodido')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                modo === 'explodido' ? 'bg-background shadow-sm text-foreground' : P38_CHIP_INACTIVE,
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Explodido
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <FinanceiroListaEstado loading />
      ) : plano.grupos.length === 0 ? (
        <FinanceiroListaEstado
          vazio
          vazioMensagem="Cadastre contas fixas, folha ou budgets para ver a consolidação."
        />
      ) : modo === 'resumo' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <CardResumo label="Fixas recorrentes" valor={resumo.fixasRecorrentes} />
            <CardResumo label="Folha" valor={resumo.folha} />
            <CardResumo label="Budgets" valor={resumo.budgets} />
            <CardResumo
              label="Total operacional"
              valor={resumo.totalOperacional}
              destaque
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <CardResumo
              label="Anuais (provisão/mês)"
              valor={resumo.anuaisDiluido}
              sublabel="Separado do operacional"
            />
            <CardResumo
              label="Provisões folha"
              valor={resumo.provisoesFolha}
              sublabel="13º acumulado + 1/3 férias + eventos"
            />
            <CardResumo
              label="Com provisões"
              valor={resumo.totalComProvisoes}
              sublabel="Operacional + provisões mensais"
              destaque
            />
            {resumo.anuaisVencimentoMes > 0 ? (
              <CardResumo
                label="Vencimento anual (mês)"
                valor={resumo.anuaisVencimentoMes}
                sublabel="Desembolso extra neste mês"
                destaque
              />
            ) : null}
          </div>

          <div className={cn('rounded-2xl p-3 lg:p-4', P38_FIELD_SURFACE)}>
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pl-3 font-medium">Indicador</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-border/30">
                  <td className="py-2.5 pl-3">Lucro bruto</td>
                  <td className="py-2.5 pr-3 text-right">
                    <CelulaValor valor={resumo.lucroBruto} positivo={resumo.lucroBruto >= 0} />
                  </td>
                </tr>
                {plano.margemDetalhe?.receita_liquida > 0 && (
                  <tr className="border-b border-border/20 text-[11px] text-muted-foreground">
                    <td className="py-1 pl-4" colSpan={2}>
                      Receita líq. {formatFinanceiroValor(plano.margemDetalhe.receita_liquida)} · CMV{' '}
                      {formatFinanceiroValor(plano.margemDetalhe.custo_total)}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-border/30">
                  <td className="py-2.5 pl-3">Resultado operacional</td>
                  <td className="py-2.5 pr-3 text-right">
                    <CelulaValor
                      valor={resumo.resultadoOperacional}
                      positivo={resumo.resultadoOperacional >= 0}
                    />
                  </td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2.5 pl-3">Resultado com provisões</td>
                  <td className="py-2.5 pr-3 text-right font-medium">
                    <CelulaValor
                      valor={resumo.resultadoComProvisoes}
                      positivo={resumo.resultadoComProvisoes >= 0}
                    />
                  </td>
                </tr>
                {resumo.anuaisVencimentoMes > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="py-2.5 pl-3">Resultado após vencimentos anuais</td>
                    <td className="py-2.5 pr-3 text-right">
                      <CelulaValor
                        valor={resumo.resultadoDesembolso}
                        positivo={resumo.resultadoDesembolso >= 0}
                      />
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2.5 pl-3 text-muted-foreground">Realizado (pago no fluxo)</td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">
                    <CelulaValor
                      valor={resumo.resultadoRealizado}
                      positivo={resumo.resultadoRealizado >= 0}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {plano.grupos.map((grupo) => (
            <div key={grupo.id} className="space-y-2">
              <div className="flex items-center justify-between px-1 gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{grupo.label}</h3>
                  {grupo.separadoDoTotal ? (
                    <p className="text-[11px] text-muted-foreground">
                      Não entra no total operacional — provisão / evento à parte
                    </p>
                  ) : null}
                </div>
                <CelulaValor valor={grupo.subtotal} className="text-sm" />
              </div>

              <div className="space-y-2 md:hidden">
                {grupo.items.map((item) => (
                  <CardExplodidoMobile key={item.id} item={item} />
                ))}
              </div>

              <div className={cn('hidden md:block overflow-x-auto rounded-2xl p-2', P38_FIELD_SURFACE)}>
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-border/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-3 font-medium">Item</th>
                      <th className="py-2 px-2 text-right font-medium">Valor</th>
                      <th className="py-2 px-2 text-right font-medium">Complemento</th>
                      <th className="py-2 pr-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.items.map((item) => (
                      <LinhaExplodida key={item.id} item={item} />
                    ))}
                    <tr className="border-t border-border/60 font-medium text-sm">
                      <td className="py-2.5 pl-3">Subtotal</td>
                      <td className="py-2.5 px-2 text-right">
                        <CelulaValor valor={grupo.subtotal} />
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className={cn('rounded-2xl p-3 lg:p-4 space-y-2', P38_FIELD_SURFACE)}>
            <div className="flex justify-between text-sm">
              <span>Total operacional</span>
              <CelulaValor valor={resumo.totalOperacional} />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>+ Provisões mensais (anuais diluídas + folha)</span>
              <CelulaValor valor={resumo.totalProvisoesMensais} />
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
              <span>Total com provisões</span>
              <CelulaValor valor={resumo.totalComProvisoes} />
            </div>
            {resumo.anuaisVencimentoMes > 0 && (
              <div className="flex justify-between text-sm text-amber-700 dark:text-amber-400">
                <span>+ Vencimentos anuais neste mês</span>
                <CelulaValor valor={resumo.anuaisVencimentoMes} />
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
              <span>Lucro bruto − com provisões</span>
              <CelulaValor
                valor={resumo.resultadoComProvisoes}
                positivo={resumo.resultadoComProvisoes >= 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
