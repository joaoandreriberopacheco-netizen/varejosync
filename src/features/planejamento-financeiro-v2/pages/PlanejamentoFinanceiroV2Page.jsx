import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Repeat2, TrendingUp } from 'lucide-react';
import { P38HelpPopover } from '@/components/ui/p38-help-popover';
import { cn } from '@/lib/utils';
import { P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { mapaModelosPorId, shiftCompetencia, ordenarSeriesPorCentroENome } from '@/lib/agefinPrevisaoCalculos';
import { useCompetenciaUrl } from '../hooks/useCompetenciaUrl';
import { useAgefinPrevisaoQueries } from '../hooks/useAgefinPrevisaoQueries';
import { usePlanejamentoActions } from '../hooks/usePlanejamentoActions';
import ContasFixasTab from '../tabs/ContasFixasTab';
import PrevisaoMesTab from '../tabs/PrevisaoMesTab';
import ProjecaoTab from '../tabs/ProjecaoTab';
import PlanejamentoDialogs, { PlanejamentoFab } from '../components/PlanejamentoDialogs';

export default function PlanejamentoFinanceiroV2Page() {
  const { competenciaMes, setCompetenciaMes, abaAtiva, setAbaAtiva } = useCompetenciaUrl();

  const [selectedComp, setSelectedComp] = useState(null);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroCentro, setFiltroCentro] = useState('__todos__');
  const [groupBy, setGroupBy] = useState('vencimento');
  const [sortOrder, setSortOrder] = useState('asc');
  const [groupByContas, setGroupByContas] = useState('dia_vencimento');
  const [sortOrderContas, setSortOrderContas] = useState('asc');
  const [draggingSerieId, setDraggingSerieId] = useState('');
  const [dropCentroAtual, setDropCentroAtual] = useState('__none__');
  const [centroDialogOpen, setCentroDialogOpen] = useState(false);
  const [showImportador, setShowImportador] = useState(false);
  const [importadorLancamentoId, setImportadorLancamentoId] = useState(null);

  const queries = useAgefinPrevisaoQueries({
    abaAtiva,
    competenciaMes,
    precisaContas: Boolean(selectedComp),
  });

  const modelosMap = useMemo(() => mapaModelosPorId(queries.modelos), [queries.modelos]);
  const selectedModelo = selectedComp ? modelosMap[selectedComp.serie_id] : null;
  const contaPadrao = queries.contas.find((c) => c.ativo !== false) || queries.contas[0];

  const actions = usePlanejamentoActions({
    competenciaMes,
    modelos: queries.modelos,
    modelosMap,
    parcelamentos: queries.parcelamentos,
    contaPadrao,
    selectedComp,
    selectedModelo,
    setSelectedComp,
  });

  const seriesAtivas = useMemo(
    () => ordenarSeriesPorCentroENome(queries.modelos.filter((m) => m.ativo !== false)),
    [queries.modelos],
  );

  const serieArrastando = useMemo(
    () => seriesAtivas.find((s) => s.id === draggingSerieId) || null,
    [seriesAtivas, draggingSerieId],
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden font-din-1451 bg-background p-4 lg:p-6 pb-[var(--p38-scroll-pad-below-nav)] md:pb-6">
      <div className="pb-3 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-medium text-foreground">Planejamento financeiro (v2)</h1>
          <P38HelpPopover label="Ajuda: planejamento financeiro" side="bottom" align="start">
            <p className="font-medium text-foreground">Três papéis distintos</p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">AGEFIN Consulta</strong> lê todas as contas a pagar por
              vencimento no financeiro — incluindo fretes e outras despesas avulsas.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong className="text-foreground">Contas fixas</strong> é o cadastro de templates: contas que
              renovam mensalmente, bimestralmente, anualmente, etc. Ao salvar, o sistema gera/atualiza os
              lançamentos no financeiro (a mesma base que a AGEFIN lê).
            </p>
            <p className="text-muted-foreground mt-2">
              <strong className="text-foreground">Previsão do mês</strong> mostra a pauta da competência a
              partir desses templates e dos lançamentos já abertos — sem fretes (estes ficam só na AGEFIN).
            </p>
          </P38HelpPopover>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Templates de contas recorrentes — a AGEFIN lê toda a pauta (incluindo fretes) por vencimento
        </p>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full mt-4">
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

        <TabsContent value="contas" className="mt-4">
          <ContasFixasTab
            loading={queries.loadingModelos}
            modelos={queries.modelos}
            centrosRegistrados={queries.centrosRegistrados}
            groupBy={groupByContas}
            sortOrder={sortOrderContas}
            onGroupByChange={setGroupByContas}
            onSortOrderToggle={() => setSortOrderContas((o) => (o === 'asc' ? 'desc' : 'asc'))}
            draggingSerieId={draggingSerieId}
            dropCentroAtual={dropCentroAtual}
            onDragStart={(id) => {
              setDraggingSerieId(id);
              void queries.refetchCentros();
            }}
            onDragEnd={() => {
              setDraggingSerieId('');
              setDropCentroAtual('__none__');
            }}
            onHoverCentro={setDropCentroAtual}
            onLeaveCentro={() => setDropCentroAtual('__none__')}
            onDropCentro={(serieId, centro) => {
              const serie = seriesAtivas.find((s) => s.id === serieId);
              if (serie) {
                void actions.handleMoverSerieCentro(serie, centro, () => {
                  setDraggingSerieId('');
                  setDropCentroAtual('__none__');
                });
              }
            }}
            onEdit={actions.setSerieDialog}
            onDelete={actions.handleDeleteSerie}
            onCadastrar={() => actions.setSerieDialog({})}
          />
        </TabsContent>

        <TabsContent value="previsao" className="mt-4">
          <PrevisaoMesTab
            competenciaMes={competenciaMes}
            onMesAnterior={() => setCompetenciaMes(shiftCompetencia(competenciaMes, -1))}
            onMesProximo={() => setCompetenciaMes(shiftCompetencia(competenciaMes, 1))}
            onAbrirMes={actions.handleAbrirMes}
            onDesfazerAbrirMes={actions.handleDesfazerAbrirMes}
            saving={actions.saving}
            loading={queries.loadingLancamentos || queries.loadingModelos}
            modelos={queries.modelos}
            lancamentosMes={queries.lancamentosMes}
            parcelamentos={queries.parcelamentos}
            filtroBusca={filtroBusca}
            onBuscaChange={setFiltroBusca}
            filtroCentro={filtroCentro}
            onCentroChange={setFiltroCentro}
            centrosRegistrados={queries.centrosRegistrados}
            groupBy={groupBy}
            sortOrder={sortOrder}
            onGroupByChange={setGroupBy}
            onSortOrderToggle={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            onOpenCompetencia={setSelectedComp}
            onCadastrar={() => actions.setSerieDialog({})}
          />
        </TabsContent>

        <TabsContent value="projecao" className="mt-4">
          <ProjecaoTab
            loading={queries.loadingModelos || queries.loadingRecorrentes}
            modelos={queries.modelos}
            competenciaMes={competenciaMes}
            lancamentosRecorrentes={queries.lancamentosRecorrentes}
          />
        </TabsContent>
      </Tabs>

      <PlanejamentoFab
        onCentros={() => setCentroDialogOpen(true)}
        onImportar={() => {
          setImportadorLancamentoId(null);
          setShowImportador(true);
        }}
        onNovaConta={() => actions.setSerieDialog({})}
      />

      <PlanejamentoDialogs
        selectedComp={selectedComp}
        selectedModelo={selectedModelo}
        onCloseSelected={() => setSelectedComp(null)}
        centrosRegistrados={queries.centrosRegistrados}
        serieDialog={actions.serieDialog}
        onCloseSerieDialog={() => actions.setSerieDialog(null)}
        onSaveSerie={actions.handleSaveSerie}
        saving={actions.saving}
        parcelamentoDialog={actions.parcelamentoDialog}
        onCloseParcelamentoDialog={() => actions.setParcelamentoDialog(false)}
        onCriarParcelamento={actions.handleCriarParcelamento}
        salvandoParcelamento={actions.salvandoParcelamento}
        centroDialogOpen={centroDialogOpen}
        onCloseCentroDialog={() => setCentroDialogOpen(false)}
        onCentrosChanged={actions.invalidateCentros}
        draggingSerieId={draggingSerieId}
        serieArrastando={serieArrastando}
        dropCentroAtual={dropCentroAtual}
        onHoverCentro={setDropCentroAtual}
        onLeaveCentro={(chave) => setDropCentroAtual((v) => (v === chave ? '__none__' : v))}
        onDropCentro={(centro) => {
          if (serieArrastando) {
            void actions.handleMoverSerieCentro(serieArrastando, centro, () => {
              setDraggingSerieId('');
              setDropCentroAtual('__none__');
            });
          }
        }}
        showImportador={showImportador}
        onCloseImportador={() => {
          setShowImportador(false);
          setImportadorLancamentoId(null);
        }}
        importadorLancamentoId={importadorLancamentoId}
        onImportadorSuccess={() => {
          actions.refreshDepoisDeLancamentos();
          setShowImportador(false);
          setImportadorLancamentoId(null);
          void actions.recarregarVisaoMes().then(actions.refreshSelectedComp);
        }}
        syncing={actions.syncing}
        onSyncFinanceiro={() => void actions.handleSyncFinanceiro()}
        onAbrirSerieNoMes={actions.handleAbrirSerieNoMes}
        onVincularBoleto={() =>
          actions.handleVincularBoleto((lancId) => {
            setImportadorLancamentoId(lancId);
            setShowImportador(true);
          })
        }
        onSalvarManual={actions.handleSalvarManual}
        salvandoManual={actions.salvandoManual}
        podeParcelarConta={actions.podeParcelarConta}
        onParcelar={() => actions.setParcelamentoDialog(true)}
        onSalvarParcela={actions.handleSalvarParcela}
        onRemoverParcelamento={
          selectedComp?._parcelamentoId ? actions.handleRemoverParcelamento : undefined
        }
        removendoParcelamento={actions.removendoParcelamento}
      />
    </div>
  );
}
