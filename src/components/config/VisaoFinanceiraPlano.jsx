import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, LayoutList, PieChart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import {
  FinanceiroGrupo,
  FinanceiroListaEstado,
  formatFinanceiroValor,
} from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38MobileLine, P38StatusLabel } from '@/components/ui/p38-mobile-line';
import { cn } from '@/lib/utils';
import { P38_CHIP_INACTIVE, P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { formatCompetenciaLabel, getCompetenciaAtual, shiftCompetencia } from '@/lib/budgetCalculos';
import {
  listarModelos as listarModelosBudget,
  listarCompetencias as listarCompetenciasBudget,
  listarLancamentosMes,
  listarLancamentosVencimentoMes,
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

function ItemPlanoLine({ item, striped }) {
  const accent = item.destaque
    ? 'warning'
    : item.coberturaBudget
      ? 'info'
      : item.entraNoTotal === false
        ? 'muted'
        : 'default';
  const meta = (
    <>
      {item.coberturaBudget ? (
        <P38StatusLabel tone="info">Coberto por budget</P38StatusLabel>
      ) : null}
      {item.entraNoTotal === false && !item.coberturaBudget ? (
        <P38StatusLabel tone="muted">Não soma novamente</P38StatusLabel>
      ) : null}
      {item.destaque ? <P38StatusLabel tone="warning">Compromisso do mês</P38StatusLabel> : null}
    </>
  );
  const line = (
    <P38MobileLine
      as={item.link ? Link : 'div'}
      to={item.link || undefined}
      thinAccent
      striped={striped}
      accent={accent}
      className="w-full text-left max-md:!py-3.5 max-md:min-h-[58px]"
      title={item.nome}
      subtitle={item.detalhe}
      meta={meta}
      value={
        <>
          <span className="text-foreground/85">−</span>
          {formatFinanceiroValor(item.valor)}
        </>
      }
      valueSub={
        item.valorSecundario != null
          ? `${item.valorSecundarioLabel}: ${formatFinanceiroValor(item.valorSecundario)}`
          : null
      }
      trailing={item.link ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
    />
  );
  return line;
}

function GrupoCategoriaPlano({ categoria }) {
  return (
    <FinanceiroGrupo
      label={`${categoria.label} (${categoria.items.length})`}
      labelClassName="text-[10px] font-medium normal-case tracking-normal text-muted-foreground"
      despesas={categoria.subtotal}
      liquido={-categoria.subtotal}
      defaultOpen
    >
      {categoria.items.map((item, index) => (
        <ItemPlanoLine key={item.id} item={item} striped={index % 2 === 1} />
      ))}
    </FinanceiroGrupo>
  );
}

function GrupoCentroPlano({ centro }) {
  return (
    <FinanceiroGrupo
      label={centro.label}
      despesas={centro.subtotal}
      liquido={-centro.subtotal}
      defaultOpen
    >
      <div className="space-y-1 pl-0.5 sm:pl-1">
        {centro.categorias.map((categoria) => (
          <GrupoCategoriaPlano key={categoria.id} categoria={categoria} />
        ))}
      </div>
    </FinanceiroGrupo>
  );
}

export default function VisaoFinanceiraPlano() {
  const [competencia, setCompetencia] = useState(getCompetenciaAtual);
  const [modo, setModo] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches
      ? 'explodido'
      : 'resumo',
  );

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

  const { data: lancamentosVencimento = [] } = useQuery({
    queryKey: ['visao-financeira', 'lancamentos-vencimento', competencia],
    queryFn: () => listarLancamentosVencimentoMes(competencia),
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
        lancamentosVencimento,
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
      lancamentosVencimento,
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
                Consolida contas fixas, folha (com provisões de 13º e férias), budgets e contas pontuais ou
                parceladas que vencem no mês.
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
              <p className="text-muted-foreground mt-2">
                Fretes agendados não alteram o lucro bruto. Eles reduzem a
                <strong className="text-foreground"> capacidade disponível para novas compras</strong>.
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
          vazioMensagem="Cadastre contas fixas, folha, budgets ou contas a pagar para ver a consolidação."
        />
      ) : modo === 'resumo' ? (
        <div className="space-y-4">
          <div className={cn('rounded-xl border border-border/40 p-3', P38_FIELD_SURFACE)}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold">Capacidade de compra</p>
                <p className="text-[11px] text-muted-foreground">
                  CMV vendido menos fretes com vencimento no mês — não altera o lucro bruto
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/50">
              <div className="pr-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">CMV vendido</p>
                <CelulaValor valor={resumo.capacidadeCompraBase} className="text-sm" />
              </div>
              <div className="px-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fretes reservados</p>
                <CelulaValor valor={resumo.fretesAgendados} className="text-sm" />
              </div>
              <div className="pl-2 text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponível</p>
                <CelulaValor
                  valor={resumo.capacidadeCompraDisponivel}
                  positivo={resumo.capacidadeCompraDisponivel >= 0}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <CardResumo label="Fixas recorrentes" valor={resumo.fixasRecorrentes} />
            <CardResumo label="Folha" valor={resumo.folha} />
            <CardResumo label="Budgets" valor={resumo.budgets} />
            <CardResumo
              label="Pontuais fora do plano"
              valor={resumo.pontuaisExtraPlano}
              sublabel={`${formatFinanceiroValor(resumo.pontuais)} em compromissos pontuais`}
            />
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
              sublabel="13º acumulado + 1/3 férias"
            />
            <CardResumo
              label="Com provisões"
              valor={resumo.totalComProvisoes}
              sublabel="Operacional + provisões mensais"
              destaque
            />
            <CardResumo
              label="Desembolso conhecido"
              valor={resumo.totalDesembolsoMes}
              sublabel={
                resumo.anuaisVencimentoMes > 0
                  ? `${formatFinanceiroValor(resumo.anuaisVencimentoMes)} em vencimentos anuais`
                  : 'Fixas + folha + contas pontuais'
              }
              destaque
            />
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
                <tr className="border-b border-border/30">
                  <td className="py-2.5 pl-3">
                    Compromissos pontuais / parcelados
                    <span className="block text-[11px] text-muted-foreground font-normal">
                      Inclui fretes; itens cobertos por budget não somam novamente no operacional
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <CelulaValor valor={resumo.pontuais} />
                  </td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2.5 pl-3">Saldo bruto após compromissos conhecidos</td>
                  <td className="py-2.5 pr-3 text-right">
                    <CelulaValor
                      valor={resumo.resultadoDesembolso}
                      positivo={resumo.resultadoDesembolso >= 0}
                    />
                  </td>
                </tr>
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
                  {grupo.subtotalNoTotal !== grupo.subtotal && grupo.id === 'pontuais' ? (
                    <p className="text-[11px] text-muted-foreground">
                      {formatFinanceiroValor(grupo.subtotalNoTotal)} fora de budgets e do CMV já reconhecido
                    </p>
                  ) : null}
                </div>
                <CelulaValor valor={grupo.subtotal} className="text-sm" />
              </div>

              <div className="space-y-2">
                {grupo.centros.map((centro) => (
                  <GrupoCentroPlano key={centro.id} centro={centro} />
                ))}
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
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Compromissos pontuais / parcelados</span>
              <CelulaValor valor={resumo.pontuais} />
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
              <span>Desembolso conhecido no mês</span>
              <CelulaValor valor={resumo.totalDesembolsoMes} />
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
              <span>Lucro bruto − com provisões</span>
              <CelulaValor
                valor={resumo.resultadoComProvisoes}
                positivo={resumo.resultadoComProvisoes >= 0}
              />
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-2">
              <span>Capacidade de compra após fretes</span>
              <CelulaValor
                valor={resumo.capacidadeCompraDisponivel}
                positivo={resumo.capacidadeCompraDisponivel >= 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
