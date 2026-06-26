import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  LayoutTemplate,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { P38_CHIP_ACTIVE, P38_CHIP_INACTIVE, P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';
import { FinanceiroListaEstado } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import FolhaPrevisaoResumo from '@/components/folha-previsao/FolhaPrevisaoResumo';
import FolhaPrevisaoLista from '@/components/folha-previsao/FolhaPrevisaoLista';
import FolhaPrevisaoModeloRow from '@/components/folha-previsao/FolhaPrevisaoModeloRow';
import FolhaPrevisaoModeloDialog from '@/components/folha-previsao/FolhaPrevisaoModeloDialog';
import FolhaPrevisaoMovimentoDialog from '@/components/folha-previsao/FolhaPrevisaoMovimentoDialog';
import FolhaPrevisaoDetalheDrawer from '@/components/folha-previsao/FolhaPrevisaoDetalheDrawer';
import FolhaPrevisaoDesligamentoDialog from '@/components/folha-previsao/FolhaPrevisaoDesligamentoDialog';
import FolhaPrevisaoProjecao from '@/components/folha-previsao/FolhaPrevisaoProjecao';
import {
  calcularTotaisGrupo,
  formatCompetenciaLabel,
  getCompetenciaAtual,
  mapaModelosPorColaborador,
  shiftCompetencia,
  TIPO_VINCULO,
  TIPO_VINCULO_LABELS,
  filtrarCompetenciasPorTipo,
  agruparCompetenciasPorTipo,
  formatCicloFolhaCompetencia,
  FOLHA_DIA_VENCIMENTO,
} from '@/lib/folhaPrevisaoCalculos';
import {
  abrirCompetenciasDoMes,
  adicionarMovimento,
  duplicarModelo,
  listarColaboradoresAtivos,
  listarCompetencias,
  listarModelos,
  reativarNaFolha,
  registrarDesligamento,
  removerMovimento,
  sincronizarLancamentoFinanceiro,
  sincronizarFechamentoCompetencias,
} from '@/lib/folhaPrevisaoService';

const FILTRO_VINCULO_OPTS = [
  { id: 'todos', label: 'Todos' },
  { id: TIPO_VINCULO.FUNCIONARIO, label: 'Funcionários' },
  { id: TIPO_VINCULO.SOCIO, label: 'Sócios' },
];

function FiltroVinculoChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTRO_VINCULO_OPTS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[32px]',
            value === opt.id ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function FolhaPrevisaoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [competenciaMes, setCompetenciaMes] = useState(getCompetenciaAtual());
  const [selectedComp, setSelectedComp] = useState(null);
  const [modeloDialog, setModeloDialog] = useState(null);
  const [desligamentoModelo, setDesligamentoModelo] = useState(null);
  const [movimentoOpen, setMovimentoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filtroVinculo, setFiltroVinculo] = useState('todos');

  const { data: competencias = [], isLoading: loadingComp } = useQuery({
    queryKey: ['folha-previsao', 'competencias', competenciaMes],
    queryFn: async () => {
      await sincronizarFechamentoCompetencias(competenciaMes);
      return listarCompetencias(competenciaMes);
    },
  });

  const { data: modelos = [], isLoading: loadingModelos } = useQuery({
    queryKey: ['folha-previsao', 'modelos'],
    queryFn: listarModelos,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['folha-previsao', 'colaboradores'],
    queryFn: listarColaboradoresAtivos,
  });

  const { data: contas = [] } = useQuery({
    queryKey: ['folha-previsao', 'contas'],
    queryFn: () => base44.entities.ContasFinanceiras.list(),
  });

  const modelosMap = useMemo(() => mapaModelosPorColaborador(modelos), [modelos]);
  const competenciasFiltradas = useMemo(
    () => filtrarCompetenciasPorTipo(competencias, modelosMap, filtroVinculo === 'todos' ? null : filtroVinculo),
    [competencias, modelosMap, filtroVinculo],
  );
  const grupos = useMemo(
    () => agruparCompetenciasPorTipo(competenciasFiltradas, modelosMap),
    [competenciasFiltradas, modelosMap],
  );
  const totaisGrupo = useMemo(() => calcularTotaisGrupo(competenciasFiltradas, modelosMap), [competenciasFiltradas, modelosMap]);
  const contaPadrao = contas.find((c) => c.ativo !== false) || contas[0];
  const selectedModelo = selectedComp ? modelosMap[selectedComp.colaborador_id] : null;

  const modelosFiltrados = useMemo(
    () => modelos.filter(
      (m) => filtroVinculo === 'todos' || (m.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO) === filtroVinculo,
    ),
    [modelos, filtroVinculo],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['folha-previsao'] });
  }, [queryClient]);

  const handleAbrirMes = async () => {
    setSaving(true);
    try {
      const { criados, pulados } = await abrirCompetenciasDoMes(competenciaMes);
      invalidate();
      const msg = criados.length
        ? `${criados.length} previsão(ões) aberta(s).`
        : 'Nenhum colaborador com modelo vinculado.';
      const extra = pulados.length ? ` ${pulados.length} ignorado(s) (já desligados).` : '';
      toast({ title: 'Mês aberto', description: msg + extra });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModelo = async (payload) => {
    setSaving(true);
    try {
      if (modeloDialog?.id) {
        await base44.entities.FolhaPrevisaoModelo.update(modeloDialog.id, { ...payload, dia_vencimento: FOLHA_DIA_VENCIMENTO });
      } else {
        await base44.entities.FolhaPrevisaoModelo.create({ ...payload, dia_vencimento: FOLHA_DIA_VENCIMENTO });
      }
      invalidate();
      setModeloDialog(null);
      toast({ title: 'Modelo salvo' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateModelo = async (modelo) => {
    setSaving(true);
    try {
      await duplicarModelo(modelo);
      invalidate();
      toast({ title: 'Modelo duplicado', description: 'Ajuste o nome e os dados do novo modelo.' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDesligamento = async (dados) => {
    if (!desligamentoModelo?.id) return;
    setSaving(true);
    try {
      await registrarDesligamento(desligamentoModelo.id, dados);
      invalidate();
      setDesligamentoModelo(null);
      setModeloDialog(null);
      toast({
        title: 'Desligamento registrado',
        description: `${desligamentoModelo.colaborador_nome || desligamentoModelo.nome} não entrará nos meses seguintes.`,
      });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReativar = async (modelo) => {
    setSaving(true);
    try {
      await reativarNaFolha(modelo.id);
      invalidate();
      toast({ title: 'Reativado na folha' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMovimento = async (mov) => {
    if (!selectedComp) return;
    setSaving(true);
    try {
      const updated = await adicionarMovimento(selectedComp.id, mov);
      setSelectedComp(updated);
      invalidate();
      setMovimentoOpen(false);
      toast({ title: 'Movimento registrado' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMovimento = async (movId) => {
    if (!selectedComp) return;
    try {
      const updated = await removerMovimento(selectedComp.id, movId);
      setSelectedComp(updated);
      invalidate();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleSyncFinanceiro = async () => {
    if (!selectedComp || !contaPadrao) {
      toast({ title: 'Configure uma conta financeira', variant: 'destructive' });
      return;
    }
    setSyncing(true);
    try {
      await sincronizarLancamentoFinanceiro(selectedComp, {
        contaFinanceiraId: contaPadrao.id,
        categoriaNome: 'Salários',
        modelo: selectedModelo,
      });
      toast({ title: 'Enviado ao financeiro', description: 'Lançamento previsto criado/atualizado.' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden font-din-1451 bg-background pb-[var(--p38-scroll-pad-below-nav)] md:pb-6">
      <div className="pb-3 border-b border-border/40">
        <h1 className="text-xl font-medium text-foreground mb-0.5">Folha</h1>
        <p className="text-xs text-muted-foreground">
          Previsão de custos com pessoas. A folha fecha no último dia de cada mês e o pagamento vence no dia {FOLHA_DIA_VENCIMENTO} do mês seguinte.
        </p>
      </div>

      <Tabs defaultValue="previsao" className="w-full mt-4">
        <TabsList className={cn('w-full h-auto flex-wrap p-1.5 rounded-xl', P38_FIELD_SURFACE)}>
          <TabsTrigger value="previsao" className="flex-1 gap-2 rounded-lg py-2.5 min-h-[44px] min-w-[120px]">
            <CalendarClock className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Previsão do mês</span>
          </TabsTrigger>
          <TabsTrigger value="projecao" className="flex-1 gap-2 rounded-lg py-2.5 min-h-[44px] min-w-[120px]">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Projeção 12 meses</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex-1 gap-2 rounded-lg py-2.5 min-h-[44px] min-w-[120px]">
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Modelos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="previsao" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={cn('flex items-center gap-1 rounded-xl px-1', P38_FIELD_SURFACE)}>
              <Button variant="ghost" size="icon" onClick={() => setCompetenciaMes(shiftCompetencia(competenciaMes, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[100px] text-center text-sm font-semibold uppercase tracking-wide">
                {formatCompetenciaLabel(competenciaMes)}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCompetenciaMes(shiftCompetencia(competenciaMes, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button className="gap-2" onClick={handleAbrirMes} disabled={saving}>
              <Users className="h-4 w-4" />
              Abrir mês
            </Button>
          </div>

          <FolhaPrevisaoResumo
            totais={totaisGrupo}
            count={totaisGrupo.count}
            competenciaLabel={`${formatCompetenciaLabel(competenciaMes)} · ${formatCicloFolhaCompetencia(competenciaMes)}`}
          />

          <FiltroVinculoChips value={filtroVinculo} onChange={setFiltroVinculo} />

          <FinanceiroListaEstado
            loading={loadingComp}
            vazio={!loadingComp && competenciasFiltradas.length === 0}
            vazioMensagem={`Nenhuma previsão para ${formatCompetenciaLabel(competenciaMes)}${filtroVinculo !== 'todos' ? ` (${TIPO_VINCULO_LABELS[filtroVinculo]})` : ''}.`}
            vazioIcon={Users}
          >
            <FolhaPrevisaoLista
              competencias={competenciasFiltradas}
              grupos={grupos}
              modelosMap={modelosMap}
              filtroVinculo={filtroVinculo}
              onOpen={setSelectedComp}
            />
          </FinanceiroListaEstado>

          {!loadingComp && competenciasFiltradas.length === 0 && (
            <div className="flex justify-center -mt-6 pb-4">
              <Button onClick={handleAbrirMes} disabled={saving}>Abrir mês para colaboradores</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projecao" className="mt-4">
          <FolhaPrevisaoProjecao modelos={modelos} competenciaInicio={competenciaMes} />
        </TabsContent>

        <TabsContent value="modelos" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground max-w-xl">
              Um modelo por pessoa. Funcionários: salário, 13º, férias. Sócios: retirada fixa.
            </p>
            <Button className="gap-2 shrink-0" onClick={() => setModeloDialog({})}>
              <Plus className="h-4 w-4" /> Novo modelo
            </Button>
          </div>

          <FiltroVinculoChips value={filtroVinculo} onChange={setFiltroVinculo} />

          <FinanceiroListaEstado
            loading={loadingModelos}
            vazio={!loadingModelos && modelosFiltrados.length === 0}
            vazioMensagem="Nenhum modelo cadastrado."
            vazioIcon={LayoutTemplate}
          >
            <P38MobileLineList className="block md:!block rounded-lg">
              {modelosFiltrados.map((m, i) => (
                <FolhaPrevisaoModeloRow
                  key={m.id}
                  modelo={m}
                  onEdit={setModeloDialog}
                  onDuplicate={handleDuplicateModelo}
                  onDesligar={setDesligamentoModelo}
                  striped={i % 2 === 1}
                />
              ))}
            </P38MobileLineList>
          </FinanceiroListaEstado>

          {!loadingModelos && modelosFiltrados.length === 0 && (
            <div className="flex justify-center -mt-6 pb-4">
              <Button onClick={() => setModeloDialog({})}>Criar primeiro modelo</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FolhaPrevisaoDetalheDrawer
        open={Boolean(selectedComp)}
        onClose={() => setSelectedComp(null)}
        competencia={selectedComp}
        modelo={selectedModelo}
        onAddMovimento={() => setMovimentoOpen(true)}
        onRemoveMovimento={handleRemoveMovimento}
        onSyncFinanceiro={handleSyncFinanceiro}
        syncing={syncing}
      />

      <FolhaPrevisaoModeloDialog
        open={modeloDialog !== null}
        onClose={() => setModeloDialog(null)}
        modelo={modeloDialog?.id ? modeloDialog : null}
        colaboradores={colaboradores}
        onSave={handleSaveModelo}
        onDesligar={setDesligamentoModelo}
        onReativar={handleReativar}
        saving={saving}
      />

      <FolhaPrevisaoDesligamentoDialog
        open={Boolean(desligamentoModelo)}
        onClose={() => setDesligamentoModelo(null)}
        modelo={desligamentoModelo}
        onConfirm={handleDesligamento}
        saving={saving}
      />

      <FolhaPrevisaoMovimentoDialog
        open={movimentoOpen}
        onClose={() => setMovimentoOpen(false)}
        onSave={handleAddMovimento}
        saving={saving}
      />
    </div>
  );
}
