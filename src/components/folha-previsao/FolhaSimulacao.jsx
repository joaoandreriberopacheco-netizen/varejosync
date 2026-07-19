import React, { useMemo, useState } from 'react';
import { FileDown, Loader2, RotateCcw, Scissors, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from '@/components/financeiro/fluxo/FinanceiroListaMeta';
import { FinanceiroKpiItem, FinanceiroKpiStrip } from '@/components/financeiro/fluxo/FinanceiroKpiInline';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import {
  calcularProjecaoPessoaFolha,
  formatCurrency,
  getCompetenciaAtual,
  ordenarPessoasFolhaPorCentroENome,
  TIPO_VINCULO_LABELS,
} from '@/lib/folhaPrevisaoCalculos';
import {
  atualizarAjusteSimulacao,
  calcularComparativoSimulacaoFolha,
  montarModelosSimulacao,
} from '@/lib/folhaSimulacaoCalculos';
import { generateFolhaPessoasPorCentroPdf } from '@/lib/folhaPessoasPorCentroPdf';
import { shareOrDownloadBlob } from '@/lib/mobilePrintAndShare';

function SimulacaoPessoaRow({
  modelo,
  colaborador,
  ajuste,
  mediaAntes,
  mediaDepois,
  onToggleCorte,
  onReducaoChange,
  striped,
}) {
  const cortado = Boolean(ajuste?.removido);
  const reducao = Number(ajuste?.reducaoPercentual) || 0;
  const nome = colaborador?.nome || modelo.colaborador_nome || modelo.nome || 'Pessoa';
  const tipoLabel = TIPO_VINCULO_LABELS[modelo.tipo_vinculo] || 'Funcionário';
  const alterado = cortado || reducao > 0;

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(cortado ? 'muted' : alterado ? 'warning' : 'danger')}
      className={cn(
        'max-md:!py-3 max-md:min-h-[72px]',
        cortado && 'opacity-55',
      )}
      title={
        <span className={cn('truncate', cortado && 'line-through')}>
          {nome}
        </span>
      }
      subtitle={
        <span>
          {tipoLabel}
          {!cortado && reducao > 0 && (
            <span className="text-amber-700 dark:text-amber-300"> · −{reducao}%</span>
          )}
        </span>
      }
      meta={
        <>
          <span>Antes {formatCurrency(mediaAntes)}</span>
          {alterado && !cortado && (
            <P38StatusLabel tone="warning">Depois {formatCurrency(mediaDepois)}</P38StatusLabel>
          )}
          {cortado && <P38StatusLabel tone="muted">Cortado</P38StatusLabel>}
        </>
      }
      value={
        <div className="flex flex-col items-end gap-2 w-full max-w-[148px] sm:max-w-[180px]">
          <div className="flex items-center gap-2">
            <Label htmlFor={`corte-${modelo.id}`} className="text-[10px] text-muted-foreground sr-only">
              Cortar {nome}
            </Label>
            <Switch
              id={`corte-${modelo.id}`}
              checked={cortado}
              onCheckedChange={onToggleCorte}
              aria-label={`Cortar ${nome}`}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Cortar</span>
          </div>
          {!cortado && (
            <div className="flex items-center gap-1 w-full">
              <Input
                type="number"
                min={0}
                max={100}
                step={5}
                value={reducao || ''}
                placeholder="0"
                onChange={(e) => onReducaoChange(e.target.value)}
                className="h-8 text-xs px-2"
                aria-label={`Redução percentual de ${nome}`}
              />
              <span className="text-[10px] text-muted-foreground shrink-0">%</span>
            </div>
          )}
        </div>
      }
    />
  );
}

export default function FolhaSimulacao({
  modelos = [],
  centrosRegistrados = [],
  colaboradoresMap = {},
  loading = false,
}) {
  const { toast } = useToast();
  const [ajustes, setAjustes] = useState({});
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const pessoasBase = useMemo(
    () =>
      ordenarPessoasFolhaPorCentroENome(
        (modelos || []).filter((m) => m.colaborador_id && m.ativo !== false),
        colaboradoresMap,
      ),
    [modelos, colaboradoresMap],
  );

  const centrosRegistradosSet = useMemo(
    () => new Set(centrosRegistrados.map((c) => c.toLocaleLowerCase('pt-BR'))),
    [centrosRegistrados],
  );

  const pessoasPorCentro = useMemo(() => {
    const mapa = {};
    for (const pessoa of pessoasBase) {
      const centro = String(pessoa.centro_custo || '').trim();
      const chave =
        centro && centrosRegistradosSet.has(centro.toLocaleLowerCase('pt-BR')) ? centro : '__sem__';
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(pessoa);
    }
    return mapa;
  }, [pessoasBase, centrosRegistradosSet]);

  const comparativo = useMemo(
    () =>
      calcularComparativoSimulacaoFolha({
        modelos: pessoasBase,
        centrosRegistrados,
        colaboradoresMap,
        ajustesPorId: ajustes,
        competenciaInicio: getCompetenciaAtual(),
      }),
    [pessoasBase, centrosRegistrados, colaboradoresMap, ajustes],
  );

  const mediasPorId = useMemo(() => {
    const inicio = getCompetenciaAtual();
    const mapa = {};
    for (const pessoa of pessoasBase) {
      mapa[pessoa.id] = calcularProjecaoPessoaFolha(pessoa, 12, inicio).mediaMensal;
    }
    const simulados = montarModelosSimulacao(pessoasBase, ajustes);
    for (const pessoa of simulados) {
      const origem = pessoasBase.find((p) => p.id === pessoa.id);
      if (!origem) continue;
      mapa[`${origem.id}__depois`] = calcularProjecaoPessoaFolha(pessoa, 12, inicio).mediaMensal;
    }
    return mapa;
  }, [pessoasBase, ajustes]);

  const temAjustes = Object.keys(ajustes).length > 0;

  const handleLimpar = () => {
    setAjustes({});
    toast({ title: 'Simulação limpa', description: 'Voltou ao cenário real da folha.' });
  };

  const handleGerarPdf = async () => {
    if (!comparativo.depois.secoes.length) {
      toast({
        title: 'Ninguém restou',
        description: 'Mantenha ao menos uma pessoa na simulação para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }

    setGerandoPdf(true);
    try {
      const blob = await generateFolhaPessoasPorCentroPdf({
        relatorio: comparativo.depois,
        titulo: 'Folha — Simulação de cortes',
        avisoSimulacao: true,
        comparativo: {
          totalAntes: comparativo.antes.resumo.totalMediaMensal,
          economiaMensal: comparativo.economiaMensal,
          pessoasCortadas: comparativo.pessoasCortadas,
          pessoasAntes: comparativo.antes.resumo.totalPessoas,
          pessoasDepois: comparativo.depois.resumo.totalPessoas,
        },
      });
      const data = new Date().toISOString().slice(0, 10);
      const result = await shareOrDownloadBlob(
        blob,
        `folha_simulacao_${data}.pdf`,
        'application/pdf',
        'Folha — Simulação de cortes',
      );
      if (result !== 'aborted') {
        toast({
          title: result === 'shared' ? 'PDF compartilhado' : 'PDF gerado',
          description: `${comparativo.depois.resumo.totalPessoas} pessoa(s) no cenário simulado.`,
        });
      }
    } catch (e) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm',
          P38_FIELD_SURFACE,
        )}
      >
        <p className="font-medium text-foreground">Modo simulação</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Teste cortes e reduções sem alterar o cadastro real. Ao sair desta aba, tudo é descartado.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleLimpar}
            disabled={!temAjustes}
          >
            <RotateCcw className="h-4 w-4" />
            Limpar simulação
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleGerarPdf}
            disabled={gerandoPdf || loading || pessoasBase.length === 0}
          >
            {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {gerandoPdf ? 'Gerando…' : 'PDF resultado'}
          </Button>
        </div>
        <P38HelpPopover label="Ajuda: simulação de cortes" side="bottom" align="end">
          <p className="font-medium text-foreground">Como simular</p>
          <p className="text-muted-foreground">
            Use <strong className="text-foreground">Cortar</strong> para remover alguém do cenário. Informe um percentual para simular redução de salário ou retirada (inclui encargos).
          </p>
          <p className="text-muted-foreground">
            O PDF lista apenas quem ficou, com média mensal em 12 meses e totais por centro de custo.
          </p>
        </P38HelpPopover>
      </div>

      <div className={cn(P38_KPI_SHELL, 'space-y-2')}>
        <FinanceiroKpiStrip>
          <FinanceiroKpiItem label="Média mensal antes" value={formatFinanceiroValor(comparativo.antes.resumo.totalMediaMensal)} />
          <FinanceiroKpiItem
            label="Média mensal depois"
            value={formatFinanceiroValor(comparativo.depois.resumo.totalMediaMensal)}
            tone={comparativo.temAlteracao ? 'warning' : 'default'}
          />
          <FinanceiroKpiItem
            label="Economia mensal"
            value={formatFinanceiroValor(comparativo.economiaMensal)}
            tone={comparativo.economiaMensal > 0 ? 'success' : 'default'}
          />
          <FinanceiroKpiItem
            label="Pessoas"
            value={`${comparativo.antes.resumo.totalPessoas} → ${comparativo.depois.resumo.totalPessoas}`}
          />
        </FinanceiroKpiStrip>
        <FinanceiroListaMeta>
          {comparativo.pessoasCortadas > 0 && (
            <FinanceiroSummaryChip className="text-red-800 dark:text-red-300">
              <UserMinus className="w-3 h-3 mr-1 inline" />
              {comparativo.pessoasCortadas} cortada(s)
            </FinanceiroSummaryChip>
          )}
          {comparativo.depois.resumo.totalDecimo > 0 && (
            <FinanceiroSummaryChip>13º {formatFinanceiroValor(comparativo.depois.resumo.totalDecimo)}</FinanceiroSummaryChip>
          )}
          {comparativo.depois.resumo.totalFerias > 0 && (
            <FinanceiroSummaryChip>Férias {formatFinanceiroValor(comparativo.depois.resumo.totalFerias)}</FinanceiroSummaryChip>
          )}
          {!comparativo.temAlteracao && (
            <FinanceiroSummaryChip className="text-muted-foreground">Nenhum ajuste aplicado</FinanceiroSummaryChip>
          )}
        </FinanceiroListaMeta>
      </div>

      <FinanceiroListaEstado
        loading={loading}
        vazio={!loading && pessoasBase.length === 0}
        vazioMensagem="Cadastre pessoas na aba Pessoas para simular cortes."
        vazioIcon={Scissors}
      >
        <div className="space-y-3">
          {[...centrosRegistrados, '__sem__'].map((centro) => {
            const chave = centro || '__sem__';
            const pessoas = pessoasPorCentro[chave] || [];
            if (!pessoas.length) return null;
            const centroLabel = chave === '__sem__' ? 'Sem centro de custo' : centro;
            return (
              <div key={chave} className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{centroLabel}</p>
                  <span className="text-xs text-muted-foreground">
                    {pessoas.filter((p) => !ajustes[p.id]?.removido).length}/{pessoas.length} ativas
                  </span>
                </div>
                <P38MobileLineList className="block md:!block rounded-none">
                  {pessoas.map((pessoa, idx) => (
                    <SimulacaoPessoaRow
                      key={pessoa.id}
                      modelo={pessoa}
                      colaborador={colaboradoresMap[pessoa.colaborador_id]}
                      ajuste={ajustes[pessoa.id]}
                      mediaAntes={mediasPorId[pessoa.id] || 0}
                      mediaDepois={mediasPorId[`${pessoa.id}__depois`] ?? mediasPorId[pessoa.id] ?? 0}
                      onToggleCorte={(checked) => {
                        setAjustes((prev) =>
                          atualizarAjusteSimulacao(prev, pessoa.id, {
                            removido: checked,
                            reducaoPercentual: checked ? 0 : prev[pessoa.id]?.reducaoPercentual || 0,
                          }),
                        );
                      }}
                      onReducaoChange={(valor) => {
                        const n = Math.min(100, Math.max(0, parseFloat(valor) || 0));
                        setAjustes((prev) =>
                          atualizarAjusteSimulacao(prev, pessoa.id, { reducaoPercentual: n, removido: false }),
                        );
                      }}
                      striped={idx % 2 === 1}
                    />
                  ))}
                </P38MobileLineList>
              </div>
            );
          })}
        </div>
      </FinanceiroListaEstado>
    </div>
  );
}
