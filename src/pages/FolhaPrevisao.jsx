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
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FolhaPrevisaoResumo from '@/components/folha-previsao/FolhaPrevisaoResumo';
import FolhaPrevisaoModeloDialog from '@/components/folha-previsao/FolhaPrevisaoModeloDialog';
import FolhaPrevisaoMovimentoDialog from '@/components/folha-previsao/FolhaPrevisaoMovimentoDialog';
import FolhaPrevisaoDetalheDrawer from '@/components/folha-previsao/FolhaPrevisaoDetalheDrawer';
import {
  calcularTotaisCompetencia,
  calcularTotaisGrupo,
  formatCompetenciaLabel,
  formatCurrency,
  getCompetenciaAtual,
  shiftCompetencia,
} from '@/lib/folhaPrevisaoCalculos';
import {
  abrirCompetenciasDoMes,
  adicionarMovimento,
  duplicarModelo,
  listarColaboradoresAtivos,
  listarCompetencias,
  listarModelos,
  removerMovimento,
  sincronizarLancamentoFinanceiro,
} from '@/lib/folhaPrevisaoService';

function FuncionarioCard({ competencia, onOpen }) {
  const totais = calcularTotaisCompetencia(competencia);
  return (
    <button
      type="button"
      onClick={() => onOpen(competencia)}
      className="w-full rounded-xl bg-card p-3 text-left shadow-sm ring-1 ring-border/40 transition hover:ring-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-foreground">{competencia.colaborador_nome}</div>
          <div className="text-xs text-muted-foreground">{competencia.modelo_nome || 'Sem modelo'}</div>
        </div>
        <Badge variant={competencia.status === 'fechado' ? 'secondary' : 'outline'}>
          {competencia.status === 'fechado' ? 'Fechado' : 'Rascunho'}
        </Badge>
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
    </button>
  );
}

function ModeloCard({ modelo, onEdit, onDuplicate }) {
  const rubricas = modelo.rubricas || [];
  return (
    <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{modelo.nome}</div>
          <div className="text-xs text-muted-foreground">
            {modelo.colaborador_nome ? `Vinculado: ${modelo.colaborador_nome}` : 'Modelo genérico'}
            {' · '}Dia {modelo.dia_vencimento}
          </div>
        </div>
        {!modelo.ativo && <Badge variant="secondary">Inativo</Badge>}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{rubricas.length} rubricas fixas</div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={() => onEdit(modelo)}>Editar</Button>
        <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => onDuplicate(modelo)}>
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </Button>
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
  const [movimentoOpen, setMovimentoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const totaisGrupo = useMemo(() => calcularTotaisGrupo(competencias), [competencias]);
  const contaPadrao = contas.find((c) => c.ativo !== false) || contas[0];

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['folha-previsao'] });
  }, [queryClient]);

  const handleAbrirMes = async () => {
    setSaving(true);
    try {
      const criados = await abrirCompetenciasDoMes(competenciaMes);
      invalidate();
      toast({
        title: criados.length ? `${criados.length} previsão(ões) aberta(s)` : 'Nenhum colaborador/modelo encontrado',
        description: criados.length ? 'Competências criadas a partir dos modelos.' : 'Crie um modelo e vincule colaboradores.',
      });
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
        <h1 className="text-xl font-medium text-foreground mb-0.5">Previsão de Folha</h1>
        <p className="text-xs text-muted-foreground">
          Previsão de pagamento por colaborador — não executa folha, só projeta e agrupa
        </p>
      </div>

      <Tabs defaultValue="previsao" className="w-full mt-4">
        <TabsList className="w-full bg-muted/50 rounded-2xl p-1.5 h-auto">
          <TabsTrigger value="previsao" className="flex-1 gap-2 rounded-xl py-2.5 min-h-[44px]">
            <CalendarClock className="w-4 h-4" />
            <span className="hidden md:inline text-sm">Previsão do mês</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex-1 gap-2 rounded-xl py-2.5 min-h-[44px]">
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

          {loadingComp ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : competencias.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl ring-1 ring-border/40">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma previsão para {formatCompetenciaLabel(competenciaMes)}.
              </p>
              <Button onClick={handleAbrirMes} disabled={saving}>Abrir mês</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {competencias.map((c) => (
                <FuncionarioCard key={c.id} competencia={c} onOpen={setSelectedComp} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="modelos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setModeloDialog({})}>
              <Plus className="h-4 w-4" /> Novo modelo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Crie um modelo com as rubricas padrão (salário, INSS, FGTS…) e duplique para cada colaborador — só muda nome e valores.
          </p>
          {loadingModelos ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
          ) : modelos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl ring-1 ring-border/40">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <Button onClick={() => setModeloDialog({})}>Criar primeiro modelo</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modelos.map((m) => (
                <ModeloCard
                  key={m.id}
                  modelo={m}
                  onEdit={setModeloDialog}
                  onDuplicate={handleDuplicateModelo}
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
