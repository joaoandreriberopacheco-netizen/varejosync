import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Repeat2,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { P38_CHIP_INACTIVE, P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import AgefinPrevisaoCabecalho from '@/components/agefin-previsao/AgefinPrevisaoCabecalho';
import AgefinPrevisaoLista from '@/components/agefin-previsao/AgefinPrevisaoLista';
import AgefinPrevisaoFiltros from '@/components/agefin-previsao/AgefinPrevisaoFiltros';
import AgefinPrevisaoModeloRow from '@/components/agefin-previsao/AgefinPrevisaoModeloRow';
import AgefinSerieDialog from '@/components/agefin-previsao/AgefinSerieDialog';
import AgefinContasFixasGrupos from '@/components/agefin-previsao/AgefinContasFixasGrupos';
import AgefinPrevisaoDetalheDrawer from '@/components/agefin-previsao/AgefinPrevisaoDetalheDrawer';
import AgefinParcelamentoDialog from '@/components/agefin-previsao/AgefinParcelamentoDialog';
import AgefinPrevisaoProjecao from '@/components/agefin-previsao/AgefinPrevisaoProjecao';
import FolhaCentroCustoDragOverlay from '@/components/folha-previsao/FolhaCentroCustoDragOverlay';
import FolhaCentrosCustoDialog from '@/components/folha-previsao/FolhaCentrosCustoDialog';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import AgefinConsultaOrganizer from '@/components/agefin/AgefinConsultaOrganizer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  calcularTotaisGrupo,
  formatCompetenciaLabel,
  getCompetenciaAtual,
  mapaModelosPorId,
  shiftCompetencia,
  filtrarCompetenciasPrevisao,
  agruparCompetenciasPrevisao,
  ordenarSeriesPorCentroENome,
  isCompetenciaFutura,
  isCompetenciaPlanejamento,
  agruparSeriesPorFrequenciaEGrupo,
} from '@/lib/agefinPrevisaoCalculos';
import {
  abrirCompetenciasDoMes,
  abrirCompetenciaSerie,
  desfazerAberturaCompetenciasDoMes,
  listarCentrosCustoRegistros,
  listarContasFinanceiras,
  listarLancamentosCompetencia,
  listarLancamentosRecorrentes,
  listarModelos,
  removerSerie,
  salvarSerie,
  sincronizarFechamentoCompetencias,
  sincronizarLancamentoFinanceiro,
  atualizarCentroCustoSerie,
  atualizarCompetenciaManual,
} from '@/lib/agefinPrevisaoService';
import {
  criarParcelamento,
  listarParcelamentos,
  atualizarParcela,
  removerParcelamento,
} from '@/lib/agefinParcelamentoService';
import AgefinRecuperarSeriesBanner from '@/components/agefin-previsao/AgefinRecuperarSeriesBanner';
import { parcelamentoAfetaSerieNoMes, montarCompetenciasVisaoComParcelas } from '@/lib/agefinParcelamentoCalculos';

export default function PlanejamentoFinanceiroPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [competenciaMes, setCompetenciaMes] = useState(getCompetenciaAtual());
  const [selectedComp, setSelectedComp] = useState(null);
  const [serieDialog, setSerieDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroCentro, setFiltroCentro] = useState('__todos__');
  const [groupBy, setGroupBy] = useState('vencimento');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupByContas, setGroupByContas] = useState('dia_vencimento');
  const [sortOrderContas, setSortOrderContas] = useState('asc');
  const [fabOpen, setFabOpen] = useState(false);
  const [centroDialogOpen, setCentroDialogOpen] = useState(false);
  const [draggingSerieId, setDraggingSerieId] = useState('');
  const [dropCentroAtual, setDropCentroAtual] = useState('__none__');
  const [showImportador, setShowImportador] = useState(false);
  const [importadorLancamentoId, setImportadorLancamentoId] = useState(null);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [parcelamentoDialog, setParcelamentoDialog] = useState(false);
  const [salvandoParcelamento, setSalvandoParcelamento] = useState(false);
  const [removendoParcelamento, setRemovendoParcelamento] = useState(false);

  const { data: lancamentosRecorrentes = [] } = useQuery({
    queryKey: ['agefin-previsao', 'lancamentos-recorrentes'],
    queryFn: listarLancamentosRecorrentes,
  });

  const { data: lancamentosMes = [], isLoading: loadingLanc } = useQuery({
    queryKey: ['agefin-previsao', 'lancamentos', competenciaMes],
    queryFn: async () => {
      await sincronizarFechamentoCompetencias(competenciaMes);
      return listarLancamentosCompetencia(competenciaMes);
    },
  });

  const { data: modelos = [], isLoading: loadingModelos } = useQuery({
    queryKey: ['agefin-previsao', 'modelos'],
    queryFn: listarModelos,
  });

  const { data: parcelamentos = [] } = useQuery({
    queryKey: ['agefin-previsao', 'parcelamentos'],
    queryFn: listarParcelamentos,
  });

  const { data: contas = [] } = useQuery({
    queryKey: ['agefin-previsao', 'contas'],
    queryFn: listarContasFinanceiras,
  });

  const { data: centrosCustoRegistros = [], refetch: refetchCentros } = useQuery({
    queryKey: ['agefin-previsao', 'centros-custo-registros'],
    queryFn: listarCentrosCustoRegistros,
    staleTime: 0,
  });

  const centrosRegistrados = useMemo(
    () =>
      [...(centrosCustoRegistros || [])]
        .filter((row) => row?.ativo !== false)
        .map((row) => String(row?.nome || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    [centrosCustoRegistros],
  );

  const modelosMap = useMemo(() => mapaModelosPorId(modelos), [modelos]);
  const competenciasVisao = useMemo(
    () => montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancamentosMes, parcelamentos),
    [competenciaMes, modelos, lancamentosMes, parcelamentos],
  );

  const competenciasExibidas = useMemo(
    () => filtrarCompetenciasPrevisao(competenciasVisao, { busca: filtroBusca, centro: filtroCentro }),
    [competenciasVisao, filtroBusca, filtroCentro],
  );

  const gruposExibicao = useMemo(
    () => agruparCompetenciasPrevisao(competenciasExibidas, groupBy, sortOrder, modelosMap),
    [competenciasExibidas, groupBy, sortOrder, modelosMap],
  );

  const qtdPlanejamento = useMemo(
    () => competenciasExibidas.filter((c) => isCompetenciaPlanejamento(c)).length,
    [competenciasExibidas],
  );

  const hasLancamentosMes = lancamentosMes.length > 0;
  const mesFuturo = isCompetenciaFutura(competenciaMes);
  const totaisGrupo = useMemo(
    () => calcularTotaisGrupo(competenciasExibidas, modelosMap),
    [competenciasExibidas, modelosMap],
  );
  const contaPadrao = contas.find((c) => c.ativo !== false) || contas[0];
  const selectedModelo = selectedComp ? modelosMap[selectedComp.serie_id] : null;

  const seriesAtivas = useMemo(
    () => ordenarSeriesPorCentroENome(modelos.filter((m) => m.ativo !== false)),
    [modelos],
  );

  const agrupamentoContas = useMemo(
    () =>
      agruparSeriesPorFrequenciaEGrupo(seriesAtivas, {
        centrosRegistrados,
        groupBy: groupByContas,
        sortOrder: sortOrderContas,
      }),
    [seriesAtivas, centrosRegistrados, groupByContas, sortOrderContas],
  );

  const serieArrastando = useMemo(
    () => seriesAtivas.find((s) => s.id === draggingSerieId) || null,
    [seriesAtivas, draggingSerieId],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agefin-previsao'] });
  }, [queryClient]);

  const invalidateCentros = useCallback(
    (lista) => {
      if (lista) {
        queryClient.setQueryData(['agefin-previsao', 'centros-custo-registros'], lista);
      }
      void refetchCentros();
      invalidate();
    },
    [queryClient, refetchCentros, invalidate],
  );

  const handleAbrirMes = async () => {
    const serieAlvo = isCompetenciaPlanejamento(selectedComp) ? selectedComp.serie_id : null;
    setSaving(true);
    try {
      const { criados, pulados } = await abrirCompetenciasDoMes(competenciaMes);
      invalidate();
      if (serieAlvo) {
        const lancs = await listarLancamentosCompetencia(competenciaMes);
        const modelo = modelosMap[serieAlvo];
        const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcelamentos);
        const real = visao.find((c) => c.serie_id === serieAlvo);
        if (real) setSelectedComp(real);
        else if (modelo) setSelectedComp(visao.find((c) => c.serie_id === serieAlvo));
      }
      const msg = criados.length
        ? `${criados.length} conta(s) aberta(s).`
        : 'Nenhuma conta fixa cadastrada.';
      const extra = pulados.length ? ` ${pulados.length} já existente(s).` : '';
      toast({ title: 'Mês aberto', description: msg + extra });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDesfazerAbrirMes = async () => {
    if (
      !window.confirm(
        `Desfazer abertura de ${formatCompetenciaLabel(competenciaMes)}?\n\nRemove apenas lançamentos gerados automaticamente, sem boleto e não pagos.`,
      )
    )
      return;
    setSaving(true);
    try {
      const { total, removidas, bloqueadas } = await desfazerAberturaCompetenciasDoMes(competenciaMes);
      if (selectedComp && removidas.some((r) => r.id === selectedComp.id)) {
        setSelectedComp(null);
      }
      invalidate();
      if (!total) {
        toast({ title: 'Nada para desfazer', description: 'Este mês ainda não foi aberto.' });
        return;
      }
      toast({
        title: 'Abertura desfeita',
        description: `${removidas.length} removida(s) · ${bloqueadas.length} preservada(s)`,
      });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSerie = async (payload) => {
    setSaving(true);
    try {
      const saved = await salvarSerie(payload);
      queryClient.setQueryData(['agefin-previsao', 'modelos'], (old = []) => {
        const idx = old.findIndex((s) => s.id === saved.id);
        if (idx >= 0) {
          const next = [...old];
          next[idx] = saved;
          return next;
        }
        return [...old, saved];
      });
      setSerieDialog(null);
      const freq = saved.frequencia || 'Mensal';
      toast({
        title: 'Conta salva',
        description:
          freq === 'Anual'
            ? `Conta anual cadastrada — aparece no bloco Anual e no mês de vencimento.`
            : 'Ela já entra na programação e na projeção.',
      });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSerie = async (serie) => {
    if (!window.confirm(`Remover "${serie.nome}" da agenda? A programação deixa de incluí-la.`)) return;
    setSaving(true);
    try {
      await removerSerie(serie.id);
      invalidate();
      toast({ title: 'Removida da agenda' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleMoverSerieCentro = async (serie, centro) => {
    setSaving(true);
    try {
      await atualizarCentroCustoSerie(serie.id, centro);
      invalidate();
      toast({ title: 'Centro atualizado' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setDraggingSerieId('');
      setDropCentroAtual('__none__');
    }
  };

  const handleSyncFinanceiro = async () => {
    if (!selectedComp || !contaPadrao || !selectedModelo) {
      toast({ title: 'Configure uma conta financeira', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      await sincronizarLancamentoFinanceiro(selectedComp, {
        contaFinanceiraId: contaPadrao.id,
        modelo: selectedModelo,
      });
      invalidate();
      toast({ title: 'Enviado ao financeiro', description: 'Lançamento previsto criado/atualizado.' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const refreshSelectedComp = useCallback(
    (visao) => {
      if (!selectedComp) return;
      if (selectedComp._modoParcela) {
        const par = visao.find(
          (c) =>
            c._modoParcela &&
            c._parcelamentoId === selectedComp._parcelamentoId &&
            c._parcelaNumero === selectedComp._parcelaNumero,
        );
        if (par) setSelectedComp(par);
        return;
      }
      if (selectedComp._fantasmaParcelamento) {
        const ghost = visao.find(
          (c) => c._fantasmaParcelamento && c.serie_id === selectedComp.serie_id,
        );
        if (ghost) setSelectedComp(ghost);
        return;
      }
      const atualizada = visao.find((c) => c.serie_id === selectedComp.serie_id && !c._modoParcela);
      if (atualizada) setSelectedComp(atualizada);
    },
    [selectedComp],
  );

  const handleCriarParcelamento = async (payload) => {
    setSalvandoParcelamento(true);
    try {
      await criarParcelamento(payload);
      await queryClient.invalidateQueries({ queryKey: ['agefin-previsao', 'parcelamentos'] });
      setParcelamentoDialog(false);
      const lancs = await listarLancamentosCompetencia(competenciaMes);
      const parcs = await listarParcelamentos();
      const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcs);
      refreshSelectedComp(visao);
      toast({
        title: 'Conta parcelada',
        description: `${payload.totalParcelas} parcelas criadas a partir de ${formatCompetenciaLabel(payload.competenciaOrigem)}.`,
      });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvandoParcelamento(false);
    }
  };

  const handleSalvarParcela = async ({ parcelamentoId, parcelaNumero, valor, dataVencimento, diaVencimento }) => {
    if (!selectedComp) return;
    setSalvandoManual(true);
    try {
      await atualizarParcela(parcelamentoId, parcelaNumero, {
        valor,
        dataVencimento,
        diaVencimento,
      });
      await queryClient.invalidateQueries({ queryKey: ['agefin-previsao', 'parcelamentos'] });
      const lancs = await listarLancamentosCompetencia(competenciaMes);
      const parcs = await listarParcelamentos();
      const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcs);
      refreshSelectedComp(visao);
      toast({ title: 'Parcela atualizada' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvandoManual(false);
    }
  };

  const handleRemoverParcelamento = async () => {
    if (!selectedComp?._parcelamentoId) return;
    if (!window.confirm('Desfazer parcelamento? As parcelas deixam de aparecer na previsão.')) return;
    setRemovendoParcelamento(true);
    try {
      await removerParcelamento(selectedComp._parcelamentoId);
      await queryClient.invalidateQueries({ queryKey: ['agefin-previsao', 'parcelamentos'] });
      setSelectedComp(null);
      toast({ title: 'Parcelamento removido' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setRemovendoParcelamento(false);
    }
  };

  const podeParcelarConta =
    selectedComp &&
    !selectedComp._fantasmaParcelamento &&
    !selectedComp._modoParcela &&
    !parcelamentoAfetaSerieNoMes(parcelamentos, selectedComp.serie_id, competenciaMes);

  const handleSalvarManual = async ({ valor, dataVencimento, diaVencimento }) => {
    if (!selectedComp) return;
    setSalvandoManual(true);
    try {
      await atualizarCompetenciaManual({
        competencia: selectedComp,
        modelo: selectedModelo,
        valor,
        dataVencimento,
        diaVencimento,
      });
      invalidate();
      const lancs = await listarLancamentosCompetencia(competenciaMes);
      const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcelamentos);
      refreshSelectedComp(visao);
      toast({
        title: 'Salvo',
        description: selectedComp?.lancamento_id
          ? 'Valor e vencimento atualizados no planejamento e no financeiro.'
          : 'Valor e vencimento gravados no cadastro.',
      });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvandoManual(false);
    }
  };

  const handleAbrirSerieNoMes = async () => {
    if (!selectedComp || !selectedModelo) return;
    setSaving(true);
    try {
      await abrirCompetenciaSerie(selectedModelo, competenciaMes);
      invalidate();
      const lancs = await listarLancamentosCompetencia(competenciaMes);
      const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcelamentos);
      refreshSelectedComp(visao);
      toast({ title: 'Conta aberta no mês' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleVincularBoleto = async () => {
    if (!selectedComp) return;
    setImportadorLancamentoId(null);

    if (isCompetenciaPlanejamento(selectedComp) && !selectedComp.lancamento_id && selectedModelo) {
      setSaving(true);
      try {
        const lf = await abrirCompetenciaSerie(selectedModelo, competenciaMes);
        invalidate();
        const lancs = await listarLancamentosCompetencia(competenciaMes);
        const visao = montarCompetenciasVisaoComParcelas(competenciaMes, modelos, lancs, parcelamentos);
        refreshSelectedComp(visao);
        setImportadorLancamentoId(lf?.id || null);
        setShowImportador(true);
      } catch (e) {
        toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
      return;
    }

    setImportadorLancamentoId(selectedComp.lancamento_id || null);
    setShowImportador(true);
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden font-din-1451 bg-background p-4 lg:p-6 pb-[var(--p38-scroll-pad-below-nav)] md:pb-6">
      <div className="pb-3 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-medium text-foreground">Planejamento financeiro</h1>
          <P38HelpPopover label="Ajuda: planejamento financeiro" side="bottom" align="start">
            <p className="font-medium text-foreground">Planejamento de contas fixas</p>
            <p className="text-muted-foreground">
              Energia, telefone, internet e outras despesas que repetem todo mês. Cadastre uma vez — entra na
              programação e na projeção de caixa.
            </p>
            <p className="text-muted-foreground">
              Meses futuros aparecem em modo planejamento, mesmo antes de abrir o mês.
            </p>
          </P38HelpPopover>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">Contas fixas mensais — energia, telefone, internet…</p>
      </div>

      <AgefinRecuperarSeriesBanner className="mt-4" />

      <Tabs defaultValue="contas" className="w-full mt-4">
        <TabsList
          className={cn(
            'w-full h-auto p-1 rounded-xl flex-nowrap overflow-x-auto md:overflow-visible md:flex-wrap',
            P38_FIELD_SURFACE,
          )}
        >
          <TabsTrigger
            value="contas"
            className="shrink-0 md:flex-1 gap-2 rounded-lg py-2 min-h-[40px] min-w-[100px] md:min-w-[120px]"
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-xs md:hidden">Contas</span>
            <span className="hidden md:inline text-sm">Contas fixas</span>
          </TabsTrigger>
          <TabsTrigger
            value="previsao"
            className="shrink-0 md:flex-1 gap-2 rounded-lg py-2 min-h-[40px] min-w-[86px] md:min-w-[120px]"
          >
            <CalendarClock className="w-4 h-4" />
            <span className="text-xs md:hidden">Mês</span>
            <span className="hidden md:inline text-sm">Previsão do mês</span>
          </TabsTrigger>
          <TabsTrigger
            value="projecao"
            className="shrink-0 md:flex-1 gap-2 rounded-lg py-2 min-h-[40px] min-w-[86px] md:min-w-[120px]"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs md:hidden">12m</span>
            <span className="hidden md:inline text-sm">Projeção 12 meses</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="previsao" className="mt-4 space-y-3">
          <AgefinPrevisaoCabecalho
            competenciaMes={competenciaMes}
            onMesAnterior={() => setCompetenciaMes(shiftCompetencia(competenciaMes, -1))}
            onMesProximo={() => setCompetenciaMes(shiftCompetencia(competenciaMes, 1))}
            onAbrirMes={handleAbrirMes}
            onDesfazerAbrirMes={handleDesfazerAbrirMes}
            saving={saving}
            hasLancamentosMes={hasLancamentosMes}
            mesFuturo={mesFuturo}
            totais={totaisGrupo}
            count={totaisGrupo.count}
            countPlanejamento={qtdPlanejamento}
          />

          <AgefinPrevisaoFiltros
            busca={filtroBusca}
            onBuscaChange={setFiltroBusca}
            centro={filtroCentro}
            onCentroChange={setFiltroCentro}
            centrosRegistrados={centrosRegistrados}
            organizer={
              <AgefinConsultaOrganizer
                variant="previsao"
                groupBy={groupBy}
                sortOrder={sortOrder}
                onGroupByChange={setGroupBy}
                onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              />
            }
          />

          <FinanceiroListaEstado
            loading={loadingLanc || loadingModelos}
            vazio={!loadingLanc && !loadingModelos && competenciasExibidas.length === 0}
            vazioMensagem={
              filtroBusca || filtroCentro !== '__todos__'
                ? 'Nenhuma conta encontrada com estes filtros.'
                : `Nenhuma conta fixa para ${formatCompetenciaLabel(competenciaMes)}. Cadastre na aba Contas fixas.`
            }
            vazioIcon={Repeat2}
          >
            <AgefinPrevisaoLista
              grupos={gruposExibicao}
              competencias={competenciasExibidas}
              modelosMap={modelosMap}
              onOpen={setSelectedComp}
            />
          </FinanceiroListaEstado>

          {!loadingLanc && !loadingModelos && competenciasExibidas.length === 0 && !filtroBusca && filtroCentro === '__todos__' && (
            <div className="flex justify-center -mt-6 pb-4 gap-2">
              <Button variant="outline" onClick={() => setSerieDialog({})}>
                Cadastrar conta fixa
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projecao" className="mt-4">
          <AgefinPrevisaoProjecao
            modelos={modelos}
            competenciaInicio={competenciaMes}
            lancamentos={lancamentosRecorrentes}
          />
        </TabsContent>

        <TabsContent value="contas" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <P38HelpPopover label="Ajuda: contas fixas" side="bottom" align="start">
              <p className="font-medium text-foreground">Blocos por recorrência</p>
              <p className="text-muted-foreground">
                As contas aparecem em blocos: <strong className="text-foreground">Mensal</strong>,{' '}
                <strong className="text-foreground">Bimestral</strong>, <strong className="text-foreground">Trimestral</strong>,{' '}
                <strong className="text-foreground">Semestral</strong> e <strong className="text-foreground">Anual</strong> — só
                o bloco que tiver contas cadastradas.
              </p>
              <p className="text-muted-foreground mt-2">
                Use o organizador para agrupar por dia de vencimento (como na previsão do mês) ou por centro de custo.
                Arrastar entre centros funciona no modo &quot;Centro de custo&quot;.
              </p>
            </P38HelpPopover>
            <AgefinConsultaOrganizer
              variant="contasFixas"
              groupBy={groupByContas}
              sortOrder={sortOrderContas}
              onGroupByChange={setGroupByContas}
              onSortOrderToggle={() => setSortOrderContas((o) => (o === 'asc' ? 'desc' : 'asc'))}
            />
          </div>

          <FinanceiroListaEstado
            loading={loadingModelos}
            vazio={!loadingModelos && seriesAtivas.length === 0}
            vazioMensagem="Nenhuma conta fixa cadastrada."
            vazioIcon={Repeat2}
          >
            <AgefinContasFixasGrupos
              agrupamento={agrupamentoContas}
              groupBy={groupByContas}
              draggingSerieId={draggingSerieId}
              dropCentroAtual={dropCentroAtual}
              onDragStart={(id) => {
                setDraggingSerieId(id);
                void refetchCentros();
              }}
              onDragEnd={() => {
                setDraggingSerieId('');
                setDropCentroAtual('__none__');
              }}
              onHoverCentro={setDropCentroAtual}
              onLeaveCentro={() => setDropCentroAtual('__none__')}
              onDropCentro={(serieId, centro) => {
                const serie = seriesAtivas.find((s) => s.id === serieId);
                if (serie) void handleMoverSerieCentro(serie, centro);
              }}
              onEdit={setSerieDialog}
              onDelete={handleDeleteSerie}
            />
          </FinanceiroListaEstado>
        </TabsContent>
      </Tabs>

      <div className="fixed right-4 z-[55] bottom-[calc(var(--p38-bottom-nav-h,0px)+1rem)] lg:bottom-8 lg:right-8">
        {fabOpen && (
          <div className="mb-2 flex flex-col items-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-md"
              onClick={() => {
                setFabOpen(false);
                setCentroDialogOpen(true);
              }}
            >
              Centros de custo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-md"
              onClick={() => {
                setFabOpen(false);
                setShowImportador(true);
              }}
            >
              Importar conta (PDF)
            </Button>
            <Button
              size="sm"
              className="rounded-full shadow-md"
              onClick={() => {
                setFabOpen(false);
                setSerieDialog({});
              }}
            >
              Nova conta fixa
            </Button>
          </div>
        )}
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setFabOpen((v) => !v)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AgefinPrevisaoDetalheDrawer
        open={Boolean(selectedComp)}
        onClose={() => setSelectedComp(null)}
        competencia={selectedComp}
        modelo={selectedModelo}
        onSyncFinanceiro={handleSyncFinanceiro}
        syncing={syncing}
        onAbrirMes={handleAbrirSerieNoMes}
        abrindoMes={saving}
        onVincularBoleto={handleVincularBoleto}
        onSalvarManual={handleSalvarManual}
        salvandoManual={salvandoManual}
        onParcelar={podeParcelarConta ? () => setParcelamentoDialog(true) : undefined}
        onSalvarParcela={handleSalvarParcela}
        onRemoverParcelamento={
          selectedComp?._parcelamentoId ? handleRemoverParcelamento : undefined
        }
        removendoParcelamento={removendoParcelamento}
      />

      <AgefinParcelamentoDialog
        open={parcelamentoDialog}
        onClose={() => setParcelamentoDialog(false)}
        competencia={selectedComp}
        modelo={selectedModelo}
        onConfirm={handleCriarParcelamento}
        saving={salvandoParcelamento}
      />

      <AgefinSerieDialog
        open={Boolean(serieDialog)}
        onClose={() => setSerieDialog(null)}
        serie={serieDialog}
        centrosRegistrados={centrosRegistrados}
        onSave={handleSaveSerie}
        saving={saving}
      />

      <FolhaCentrosCustoDialog
        open={centroDialogOpen}
        onClose={() => setCentroDialogOpen(false)}
        onChanged={invalidateCentros}
      />

      <FolhaCentroCustoDragOverlay
        open={Boolean(draggingSerieId)}
        centros={centrosRegistrados}
        pessoaNome={serieArrastando?.nome}
        dropCentroAtual={dropCentroAtual}
        onHoverCentro={setDropCentroAtual}
        onLeaveCentro={(chave) => setDropCentroAtual((v) => (v === chave ? '__none__' : v))}
        onDropCentro={(centro) => {
          if (serieArrastando) void handleMoverSerieCentro(serieArrastando, centro);
        }}
      />

      <Dialog
        open={showImportador}
        onOpenChange={(open) => {
          setShowImportador(open);
          if (!open) setImportadorLancamentoId(null);
        }}
      >
        <DialogContent className="flex min-h-0 max-h-[92vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl border-0 p-0 shadow-xl">
          <div className="shrink-0 border-b border-border/40 p-5">
            <h2 className="text-lg font-semibold text-foreground">Anexar boleto (PDF)</h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AgefinImportador
              modoAtualizacao={Boolean(importadorLancamentoId || selectedComp?.lancamento_id)}
              somenteAnexo
              lancamentoFinanceiroId={importadorLancamentoId || selectedComp?.lancamento_id || undefined}
              dadosContaExistente={
                selectedComp
                  ? { descricao: selectedComp.serie_nome, terceiro_nome: selectedComp.terceiro_nome }
                  : undefined
              }
              onSuccess={() => {
                invalidate();
                setShowImportador(false);
                setImportadorLancamentoId(null);
                void (async () => {
                  const lancs = await listarLancamentosCompetencia(competenciaMes);
                  const visao = montarCompetenciasVisaoComParcelas(
                    competenciaMes,
                    modelos,
                    lancs,
                    parcelamentos,
                  );
                  refreshSelectedComp(visao);
                })();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
