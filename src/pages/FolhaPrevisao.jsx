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
import FolhaPessoaDialog from '@/components/folha-previsao/FolhaPessoaDialog';
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
  montarCompetenciasVisao,
  isCompetenciaFutura,
  isCompetenciaPlanejamento,
} from '@/lib/folhaPrevisaoCalculos';
import {
  abrirCompetenciasDoMes,
  adicionarMovimento,
  criarColaboradorParaFolha,
  listarColaboradoresAtivos,
  listarCompetencias,
  listarModelos,
  reativarNaFolha,
  registrarDesligamento,
  removerMovimento,
  salvarCadastroPessoaFolha,
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
  const [pessoaDialog, setPessoaDialog] = useState(null);
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
  const competenciasVisao = useMemo(
    () => montarCompetenciasVisao(competenciaMes, modelos, competencias),
    [competenciaMes, modelos, competencias],
  );
  const competenciasFiltradas = useMemo(
    () => filtrarCompetenciasPorTipo(competenciasVisao, modelosMap, filtroVinculo === 'todos' ? null : filtroVinculo),
    [competenciasVisao, modelosMap, filtroVinculo],
  );
  const qtdPlanejamento = useMemo(
    () => competenciasFiltradas.filter((c) => isCompetenciaPlanejamento(c)).length,
    [competenciasFiltradas],
  );
  const mesFuturo = isCompetenciaFutura(competenciaMes);
  const grupos = useMemo(
    () => agruparCompetenciasPorTipo(competenciasFiltradas, modelosMap),
    [competenciasFiltradas, modelosMap],
  );
  const totaisGrupo = useMemo(() => calcularTotaisGrupo(competenciasFiltradas, modelosMap), [competenciasFiltradas, modelosMap]);
  const contaPadrao = contas.find((c) => c.ativo !== false) || contas[0];
  const selectedModelo = selectedComp ? modelosMap[selectedComp.colaborador_id] : null;

  const colaboradoresMap = useMemo(
    () => Object.fromEntries((colaboradores || []).map((c) => [c.id, c])),
    [colaboradores],
  );

  const idsNaFolha = useMemo(
    () => new Set(modelos.filter((m) => m.colaborador_id).map((m) => m.colaborador_id)),
    [modelos],
  );

  const colaboradoresDisponiveis = useMemo(
    () => colaboradores.filter((c) => !idsNaFolha.has(c.id)),
    [colaboradores, idsNaFolha],
  );

  const pessoasCadastradas = useMemo(
    () => modelos.filter((m) => m.colaborador_id),
    [modelos],
  );

  const pessoasFiltradas = useMemo(
    () => pessoasCadastradas.filter(
      (m) => filtroVinculo === 'todos' || (m.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO) === filtroVinculo,
    ),
    [pessoasCadastradas, filtroVinculo],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['folha-previsao'] });
  }, [queryClient]);

  const handleAbrirMes = async () => {
    const colaboradorAlvo = isCompetenciaPlanejamento(selectedComp) ? selectedComp.colaborador_id : null;
    setSaving(true);
    try {
      const { criados, pulados } = await abrirCompetenciasDoMes(competenciaMes);
      invalidate();
      if (colaboradorAlvo) {
        const lista = await listarCompetencias(competenciaMes);
        const real = (lista || []).find((c) => c.colaborador_id === colaboradorAlvo);
        if (real) setSelectedComp(real);
      }
      const msg = criados.length
        ? `${criados.length} previsão(ões) aberta(s).`
        : 'Nenhuma pessoa cadastrada na folha.';
      const extra = pulados.length ? ` ${pulados.length} ignorado(s) (já desligados).` : '';
      toast({ title: 'Mês aberto', description: msg + extra });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePessoa = async (payload) => {
    setSaving(true);
    try {
      const { _modoPessoa, _novoColaborador, ...rest } = payload;
      let colaboradorId = rest.colaborador_id;
      let colaboradorNome = rest.colaborador_nome;

      if (_novoColaborador) {
        const col = await criarColaboradorParaFolha(_novoColaborador);
        colaboradorId = col.id;
        colaboradorNome = col.nome;
      }

      await salvarCadastroPessoaFolha(
        { ...rest, colaborador_id: colaboradorId, colaborador_nome: colaboradorNome },
        pessoaDialog?.id || null,
      );
      invalidate();
      setPessoaDialog(null);
      toast({ title: 'Pessoa salva', description: 'Ela já entra na programação e na projeção.' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePessoa = async (cadastro) => {
    const nome = cadastro.colaborador_nome || cadastro.nome || 'esta pessoa';
    if (!window.confirm(`Remover ${nome} da folha? A programação deixa de incluí-la.`)) return;
    setSaving(true);
    try {
      await base44.entities.FolhaPrevisaoModelo.delete(cadastro.id);
      invalidate();
      toast({ title: 'Removido da folha' });
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
      setPessoaDialog(null);
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
    if (isCompetenciaPlanejamento(selectedComp)) {
      toast({
        title: 'Mês em planejamento',
        description: 'Abra o mês para registrar movimentos.',
        variant: 'destructive',
      });
      return;
    }
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
          Previsão de custos com pessoas. A folha fecha no último dia de cada mês e o pagamento vence no dia {FOLHA_DIA_VENCIMENTO} do mês seguinte. Meses futuros aparecem em modo planejamento, mesmo antes de abrir.
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
          <TabsTrigger value="pessoas" className="flex-1 gap-2 rounded-lg py-2.5 min-h-[44px] min-w-[120px]">
            <Users className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Pessoas</span>
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
            countPlanejamento={qtdPlanejamento}
            competenciaLabel={`${formatCompetenciaLabel(competenciaMes)} · ${formatCicloFolhaCompetencia(competenciaMes)}`}
          />

          {(mesFuturo || qtdPlanejamento > 0) && (
            <p className="text-xs text-cyan-900 dark:text-cyan-200 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5">
              Modo planejamento: você já vê a previsão com base nas pessoas cadastradas.
              {mesFuturo ? ' Este mês ainda não precisa estar aberto para consultar os valores.' : ' Abra o mês quando quiser registrar vales e movimentos.'}
            </p>
          )}

          <FiltroVinculoChips value={filtroVinculo} onChange={setFiltroVinculo} />

          <FinanceiroListaEstado
            loading={loadingComp || loadingModelos}
            vazio={!loadingComp && !loadingModelos && competenciasFiltradas.length === 0}
            vazioMensagem={`Nenhuma pessoa cadastrada para ${formatCompetenciaLabel(competenciaMes)}${filtroVinculo !== 'todos' ? ` (${TIPO_VINCULO_LABELS[filtroVinculo]})` : ''}. Cadastre na aba Pessoas.`}
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

          {!loadingComp && !loadingModelos && competenciasFiltradas.length === 0 && (
            <div className="flex justify-center -mt-6 pb-4 gap-2">
              <Button variant="outline" onClick={() => setPessoaDialog({})}>Cadastrar pessoa</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projecao" className="mt-4">
          <FolhaPrevisaoProjecao modelos={modelos} competenciaInicio={competenciaMes} />
        </TabsContent>

        <TabsContent value="pessoas" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground max-w-xl">
              Cadastre cada pessoa uma vez: escolha se é funcionário ou sócio e informe salário ou retirada. Ela entra automaticamente na programação.
            </p>
            <Button className="gap-2 shrink-0" onClick={() => setPessoaDialog({})}>
              <Plus className="h-4 w-4" /> Cadastrar pessoa
            </Button>
          </div>

          <FiltroVinculoChips value={filtroVinculo} onChange={setFiltroVinculo} />

          <FinanceiroListaEstado
            loading={loadingModelos}
            vazio={!loadingModelos && pessoasFiltradas.length === 0}
            vazioMensagem="Nenhuma pessoa cadastrada na folha."
            vazioIcon={Users}
          >
            <P38MobileLineList className="block md:!block rounded-lg">
              {pessoasFiltradas.map((m) => (
                <FolhaPrevisaoModeloRow
                  key={m.id}
                  modelo={m}
                  colaborador={colaboradoresMap[m.colaborador_id]}
                  onEdit={setPessoaDialog}
                  onDelete={handleDeletePessoa}
                />
              ))}
            </P38MobileLineList>
          </FinanceiroListaEstado>

          {!loadingModelos && pessoasFiltradas.length === 0 && (
            <div className="flex justify-center -mt-6 pb-4">
              <Button onClick={() => setPessoaDialog({})}>Cadastrar primeira pessoa</Button>
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
        onAbrirMes={handleAbrirMes}
        abrindoMes={saving}
      />

      <FolhaPessoaDialog
        open={pessoaDialog !== null}
        onClose={() => setPessoaDialog(null)}
        cadastro={pessoaDialog?.id ? pessoaDialog : null}
        colaboradoresDisponiveis={colaboradoresDisponiveis}
        onSave={handleSavePessoa}
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
