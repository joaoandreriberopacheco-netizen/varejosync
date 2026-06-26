import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Users,
  LayoutTemplate,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FolhaPrevisaoResumo from '@/components/folha-previsao/FolhaPrevisaoResumo';
import FolhaPrevisaoModeloDialog from '@/components/folha-previsao/FolhaPrevisaoModeloDialog';
import FolhaPrevisaoMovimentoDialog from '@/components/folha-previsao/FolhaPrevisaoMovimentoDialog';
import FolhaPrevisaoDetalheDrawer from '@/components/folha-previsao/FolhaPrevisaoDetalheDrawer';
import FolhaPrevisaoDesligamentoDialog from '@/components/folha-previsao/FolhaPrevisaoDesligamentoDialog';
import FolhaPrevisaoProjecao from '@/components/folha-previsao/FolhaPrevisaoProjecao';
import {
  calcularTotaisCompetencia,
  calcularTotaisGrupo,
  formatCompetenciaLabel,
  formatCurrency,
  formatDataBr,
  getCompetenciaAtual,
  mapaModelosPorColaborador,
  shiftCompetencia,
  SITUACAO_FOLHA,
  TIPO_VINCULO,
  TIPO_VINCULO_LABELS,
  filtrarCompetenciasPorTipo,
  agruparCompetenciasPorTipo,
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
} from '@/lib/folhaPrevisaoService';

function FuncionarioCard({ competencia, modelo, onOpen }) {
  const totais = calcularTotaisCompetencia(competencia, modelo);
  const desligado = modelo?.situacao === SITUACAO_FOLHA.DESLIGADO;
  const ultimoMes = competencia.situacao_mes === 'ultimo_mes';
  const ehSocio = (modelo?.tipo_vinculo || competencia.tipo_vinculo) === TIPO_VINCULO.SOCIO;

  return (
    <button
      type="button"
      onClick={() => onOpen(competencia)}
      className={`w-full rounded-xl bg-card p-3 text-left shadow-sm ring-1 transition hover:ring-primary/30 ${
        ultimoMes ? 'ring-amber-400/50' : desligado ? 'ring-red-300/40 opacity-90' : 'ring-border/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-foreground">{competencia.colaborador_nome}</div>
          <div className="text-xs text-muted-foreground">{competencia.modelo_nome || 'Sem modelo'}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={ehSocio ? 'secondary' : 'outline'} className="text-[10px]">
            {TIPO_VINCULO_LABELS[ehSocio ? TIPO_VINCULO.SOCIO : TIPO_VINCULO.FUNCIONARIO]}
          </Badge>
          {ultimoMes && <Badge variant="destructive" className="text-[10px]">Último mês</Badge>}
          {desligado && !ultimoMes && (
            <Badge variant="secondary" className="text-[10px]">Desligou</Badge>
          )}
          {!desligado && (
            <Badge variant={competencia.status === 'fechado' ? 'secondary' : 'outline'} className="text-[10px]">
              {competencia.status === 'fechado' ? 'Fechado' : 'Rascunho'}
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Líquido</div>
          <div className="font-semibold tabular-nums">{formatCurrency(totais.liquido)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Vales</div>
          <div className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {formatCurrency(totais.totalVales)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Custo total</div>
          <div className="font-semibold tabular-nums">{formatCurrency(totais.custoTotalEmpresa)}</div>
        </div>
      </div>
      {(totais.totalDecimo > 0 || totais.totalFerias > 0 || totais.totalRetiradaSocio > 0 || totais.totalValesPendentes > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {totais.totalValesPendentes > 0 && (
            <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Vale em aberto {formatCurrency(totais.totalValesPendentes)}
            </span>
          )}
          {totais.totalDecimo > 0 && (
            <span className="text-[10px] rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              13º {formatCurrency(totais.totalDecimo)}
            </span>
          )}
          {totais.totalFerias > 0 && (
            <span className="text-[10px] rounded-full bg-sky-100 px-2 py-0.5 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              Férias {formatCurrency(totais.totalFerias)}
            </span>
          )}
          {totais.totalRetiradaSocio > 0 && (
            <span className="text-[10px] rounded-full bg-violet-100 px-2 py-0.5 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
              Retirada {formatCurrency(totais.totalRetiradaSocio)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function ModeloCard({ modelo, onEdit, onDuplicate, onDesligar }) {
  const rubricas = modelo.rubricas || [];
  const desligado = modelo.situacao === SITUACAO_FOLHA.DESLIGADO;
  const ehSocio = modelo.tipo_vinculo === TIPO_VINCULO.SOCIO;

  return (
    <div className={`rounded-xl bg-card p-3 shadow-sm ring-1 ${desligado ? 'ring-red-300/40' : 'ring-border/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{modelo.nome}</div>
          <div className="text-xs text-muted-foreground">
            {modelo.colaborador_nome ? `Vinculado: ${modelo.colaborador_nome}` : 'Modelo genérico'}
            {' · '}Dia {modelo.dia_vencimento}
          </div>
          {desligado && modelo.data_desligamento && (
            <div className="text-xs text-red-700 dark:text-red-400 mt-1">
              Desligou em {formatDataBr(modelo.data_desligamento)}
            </div>
          )}
        </div>
        {desligado ? (
          <Badge variant="destructive">Desligou</Badge>
        ) : !modelo.ativo ? (
          <Badge variant="secondary">Inativo</Badge>
        ) : (
          <Badge variant="outline">{TIPO_VINCULO_LABELS[ehSocio ? TIPO_VINCULO.SOCIO : TIPO_VINCULO.FUNCIONARIO]}</Badge>
        )}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {rubricas.length} rubricas
        {ehSocio && modelo.retirada_valor_fixo > 0 && (
          <> · Retirada {modelo.retirada_frequencia === 'semanal' ? 'semanal' : 'mensal'} {formatCurrency(modelo.retirada_valor_fixo)}</>
        )}
        {!ehSocio && modelo.decimo_terceiro_ativo !== false && ' · 13º ativo'}
        {!ehSocio && (modelo.ferias_programadas?.length || 0) > 0 && ` · ${modelo.ferias_programadas.length} férias`}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={() => onEdit(modelo)}>Editar</Button>
        <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => onDuplicate(modelo)}>
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </Button>
        {modelo.colaborador_id && !desligado && onDesligar && (
          <Button size="sm" variant="ghost" className="h-8 text-red-700 dark:text-red-400" onClick={() => onDesligar(modelo)}>
            Desligar
          </Button>
        )}
      </div>
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
    queryFn: () => listarCompetencias(competenciaMes),
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
        await base44.entities.FolhaPrevisaoModelo.update(modeloDialog.id, payload);
      } else {
        await base44.entities.FolhaPrevisaoModelo.create(payload);
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
          Previsão de custos com pessoas — funcionários e sócios. Lançamentos enviados ao financeiro aparecem no Fluxo de Caixa.
        </p>
      </div>

      <Tabs defaultValue="previsao" className="w-full mt-4">
        <TabsList className="w-full bg-muted/50 rounded-2xl p-1.5 h-auto flex-wrap">
          <TabsTrigger value="previsao" className="flex-1 gap-2 rounded-xl py-2.5 min-h-[44px] min-w-[120px]">
            <CalendarClock className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Previsão do mês</span>
          </TabsTrigger>
          <TabsTrigger value="projecao" className="flex-1 gap-2 rounded-xl py-2.5 min-h-[44px] min-w-[120px]">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Projeção 12 meses</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex-1 gap-2 rounded-xl py-2.5 min-h-[44px] min-w-[120px]">
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Modelos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="previsao" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCompetenciaMes(shiftCompetencia(competenciaMes, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[100px] text-center font-medium">{formatCompetenciaLabel(competenciaMes)}</span>
              <Button variant="ghost" size="icon" onClick={() => setCompetenciaMes(shiftCompetencia(competenciaMes, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button className="gap-2" onClick={handleAbrirMes} disabled={saving}>
              <Users className="h-4 w-4" />
              Abrir mês para colaboradores
            </Button>
          </div>

          <FolhaPrevisaoResumo totais={totaisGrupo} count={totaisGrupo.count} />

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: TIPO_VINCULO.FUNCIONARIO, label: 'Funcionários' },
              { id: TIPO_VINCULO.SOCIO, label: 'Sócios' },
            ].map((opt) => (
              <Button
                key={opt.id}
                size="sm"
                variant={filtroVinculo === opt.id ? 'default' : 'outline'}
                className="h-8 rounded-full"
                onClick={() => setFiltroVinculo(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {loadingComp ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : competenciasFiltradas.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl ring-1 ring-border/40">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma previsão para {formatCompetenciaLabel(competenciaMes)}
                {filtroVinculo !== 'todos' ? ` (${TIPO_VINCULO_LABELS[filtroVinculo]})` : ''}.
              </p>
              <Button onClick={handleAbrirMes} disabled={saving}>Abrir mês</Button>
            </div>
          ) : filtroVinculo === 'todos' ? (
            <div className="space-y-6">
              {grupos.funcionarios.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Funcionários</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {grupos.funcionarios.map((c) => (
                      <FuncionarioCard key={c.id} competencia={c} modelo={modelosMap[c.colaborador_id]} onOpen={setSelectedComp} />
                    ))}
                  </div>
                </section>
              )}
              {grupos.socios.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Sócios</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {grupos.socios.map((c) => (
                      <FuncionarioCard key={c.id} competencia={c} modelo={modelosMap[c.colaborador_id]} onOpen={setSelectedComp} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {competenciasFiltradas.map((c) => (
                <FuncionarioCard key={c.id} competencia={c} modelo={modelosMap[c.colaborador_id]} onOpen={setSelectedComp} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projecao" className="mt-4">
          <FolhaPrevisaoProjecao modelos={modelos} competenciaInicio={competenciaMes} />
        </TabsContent>

        <TabsContent value="modelos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setModeloDialog({})}>
              <Plus className="h-4 w-4" /> Novo modelo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Um modelo por pessoa (funcionário ou sócio). Funcionários: salário, 13º, férias. Sócios: retirada fixa semanal ou mensal.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: TIPO_VINCULO.FUNCIONARIO, label: 'Funcionários' },
              { id: TIPO_VINCULO.SOCIO, label: 'Sócios' },
            ].map((opt) => (
              <Button
                key={opt.id}
                size="sm"
                variant={filtroVinculo === opt.id ? 'default' : 'outline'}
                className="h-8 rounded-full"
                onClick={() => setFiltroVinculo(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {loadingModelos ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : modelos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl ring-1 ring-border/40">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <Button onClick={() => setModeloDialog({})}>Criar primeiro modelo</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modelos
                .filter((m) => filtroVinculo === 'todos' || (m.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO) === filtroVinculo)
                .map((m) => (
                <ModeloCard
                  key={m.id}
                  modelo={m}
                  onEdit={setModeloDialog}
                  onDuplicate={handleDuplicateModelo}
                  onDesligar={setDesligamentoModelo}
                />
              ))}
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
