import React, { useMemo } from 'react';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { FinanceiroGrupo } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { FinanceiroKpiItem, FinanceiroKpiStrip } from '@/components/financeiro/fluxo/FinanceiroKpiInline';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { cn } from '@/lib/utils';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import {
  formatCompetenciaLabel,
  calcularProjecaoCaixa,
} from '@/lib/folhaPrevisaoCalculos';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

function ProjecaoMesRow({ linha, destaque, striped }) {
  const encargos = Math.max(0, (linha.custoTotal || 0) - (linha.liquido || 0));
  const temExtra = linha.decimo > 0 || linha.ferias > 0 || linha.retiradasSocio > 0;

  const meta = (
    <>
      <span>{linha.ativos} colaborador(es)</span>
      {destaque && <P38StatusLabel tone="warning">Mês atual</P38StatusLabel>}
      {linha.decimo > 0 && <span>13º {formatFinanceiroValor(linha.decimo)}</span>}
      {linha.ferias > 0 && <span>Férias {formatFinanceiroValor(linha.ferias)}</span>}
      {linha.retiradasSocio > 0 && <span>Sócios {formatFinanceiroValor(linha.retiradasSocio)}</span>}
      {!temExtra && linha.ativos === 0 && <P38StatusLabel tone="muted">Sem colaboradores ativos</P38StatusLabel>}
    </>
  );

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(destaque ? 'warning' : linha.ativos > 0 ? 'danger' : 'muted')}
      className={cn(LINE_TITLE_CLASS, 'max-md:!py-3.5 max-md:min-h-[58px]', linha.ativos === 0 && 'opacity-60')}
      title={formatCompetenciaLabel(linha.competencia)}
      subtitle={encargos > 0 ? `Líquido ${formatFinanceiroValor(linha.liquido)} · Encargos ${formatFinanceiroValor(encargos)}` : `Líquido ${formatFinanceiroValor(linha.liquido)}`}
      meta={meta}
      value={
        linha.ativos > 0 ? (
          <>
            <span className="text-foreground/85">−</span>
            {formatFinanceiroValor(linha.custoTotal)}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      }
      valueSub={
        linha.liquido > 0 && linha.liquido !== linha.custoTotal ? (
          <span className="text-muted-foreground">a pagar {formatFinanceiroValor(linha.liquido)}</span>
        ) : null
      }
    />
  );
}

export default function FolhaPrevisaoProjecao({ modelos, competenciaInicio }) {
  const linhas = useMemo(
    () => calcularProjecaoCaixa(modelos, 12, competenciaInicio),
    [modelos, competenciaInicio],
  );

  const totais = useMemo(
    () =>
      linhas.reduce(
        (acc, l) => {
          acc.liquido += l.liquido || 0;
          acc.custoTotal += l.custoTotal || 0;
          acc.decimo += l.decimo || 0;
          acc.ferias += l.ferias || 0;
          acc.retiradasSocio += l.retiradasSocio || 0;
          acc.adicionalFeriasEstimado += l.adicionalFeriasEstimado || 0;
          acc.custoSocios += l.custoSocios || 0;
          acc.custoFuncionarios += l.custoFuncionarios || 0;
          return acc;
        },
        {
          liquido: 0,
          custoTotal: 0,
          decimo: 0,
          ferias: 0,
          retiradasSocio: 0,
          adicionalFeriasEstimado: 0,
          custoSocios: 0,
          custoFuncionarios: 0,
        },
      ),
    [linhas],
  );

  const encargosTotal = Math.max(0, totais.custoTotal - totais.liquido);
  const mediaMensal = totais.custoTotal / Math.max(linhas.length, 1);
  const competenciaAtual = competenciaInicio;

  const chips = [
    <FinanceiroSummaryChip key="funcionarios">
      Funcionários {formatFinanceiroValor(totais.custoFuncionarios)}
    </FinanceiroSummaryChip>,
    <FinanceiroSummaryChip key="socios-total">
      Sócios {formatFinanceiroValor(totais.custoSocios)}
    </FinanceiroSummaryChip>,
    <FinanceiroSummaryChip key="decimo">13º {formatFinanceiroValor(totais.decimo)}</FinanceiroSummaryChip>,
    <FinanceiroSummaryChip key="ferias-adicional">
      1/3 férias (prov.) {formatFinanceiroValor(totais.adicionalFeriasEstimado)}
    </FinanceiroSummaryChip>,
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <P38HelpPopover label="Ajuda: projeção 12 meses" side="bottom" align="end">
          <p className="font-medium text-foreground">Projeção de caixa (12 meses)</p>
          <p className="text-muted-foreground">
            Estimativa com salários, 13º, férias, 1/3 adicional de férias e encargos.
          </p>
          <p className="text-muted-foreground">Desligados saem automaticamente dos meses seguintes.</p>
        </P38HelpPopover>
      </div>

      <div className={cn(P38_KPI_SHELL, 'space-y-2')}>
        <FinanceiroKpiStrip layout="inline">
          <FinanceiroKpiItem
            label="Total 12 meses"
            value={formatFinanceiroValor(totais.custoTotal)}
            valueClass="text-foreground"
          />
          <FinanceiroKpiItem
            label="Média mensal"
            value={formatFinanceiroValor(mediaMensal)}
            valueClass="text-foreground"
          />
          <FinanceiroKpiItem
            label="Líquido no período"
            value={formatFinanceiroValor(totais.liquido)}
            valueClass="text-[#4A5D23] dark:text-[#a4ce33]"
          />
          {encargosTotal > 0 && (
            <FinanceiroKpiItem
              label="Encargos"
              value={formatFinanceiroValor(encargosTotal)}
              valueClass="text-red-600 dark:text-red-400"
            />
          )}
        </FinanceiroKpiStrip>
        <FinanceiroListaMeta
          total={linhas.length}
          totalLabel="meses projetados"
          summaryChips={chips}
        />
      </div>

      <FinanceiroGrupo
        label="Próximos 12 meses"
        receitas={totais.liquido}
        despesas={encargosTotal}
        liquido={totais.custoTotal}
        card={false}
      >
        {linhas.map((linha, i) => (
          <ProjecaoMesRow
            key={linha.competencia}
            linha={linha}
            destaque={linha.competencia === competenciaAtual}
            striped={i % 2 === 1}
          />
        ))}
      </FinanceiroGrupo>
    </div>
  );
}
