import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import {
  RUBRICA_LABELS,
  DECIMO_PADRAO,
  SITUACAO_FOLHA,
  TIPO_VINCULO,
  TIPO_VINCULO_LABELS,
  RETIRADA_FREQUENCIA_LABELS,
  criarModeloComDefaults,
  criarRubricasPadrao,
  formatDataBr,
  FOLHA_DIA_VENCIMENTO,
  gerarIdInterno,
} from '@/lib/folhaPrevisaoCalculos';

function RubricaRow({ rubrica, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-end">
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={rubrica.tipo} onValueChange={(v) => onChange({ ...rubrica, tipo: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RUBRICA_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Nome</Label>
        <Input
          value={rubrica.nome}
          onChange={(e) => onChange({ ...rubrica, nome: e.target.value })}
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-xs">Valor</Label>
        <Input
          type="number"
          step="0.01"
          value={rubrica.valor_base ?? 0}
          onChange={(e) => onChange({ ...rubrica, valor_base: parseFloat(e.target.value) || 0 })}
          className="h-9"
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

function FeriasRow({ ferias, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[120px_1fr_100px_32px] gap-2 items-end">
      <div>
        <Label className="text-xs">Mês (AAAA-MM)</Label>
        <Input
          value={ferias.competencia_prevista || ''}
          onChange={(e) => onChange({ ...ferias, competencia_prevista: e.target.value })}
          placeholder="2026-07"
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-xs">Descrição</Label>
        <Input
          value={ferias.descricao || ''}
          onChange={(e) => onChange({ ...ferias, descricao: e.target.value })}
          placeholder="Férias julho"
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-xs">Valor</Label>
        <Input
          type="number"
          step="0.01"
          value={ferias.valor_previsto ?? 0}
          onChange={(e) => onChange({ ...ferias, valor_previsto: parseFloat(e.target.value) || 0 })}
          className="h-9"
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export default function FolhaPrevisaoModeloDialog({
  open,
  onClose,
  modelo,
  colaboradores = [],
  onSave,
  onDesligar,
  onReativar,
  saving,
}) {
  const [form, setForm] = useState(criarModeloComDefaults({ nome: '' }));

  useEffect(() => {
    if (modelo) {
      setForm({
        ...criarModeloComDefaults(),
        ...modelo,
        rubricas: modelo.rubricas?.length ? modelo.rubricas : criarRubricasPadrao(modelo.tipo_vinculo),
        ferias_programadas: modelo.ferias_programadas || [],
      });
    } else {
      setForm(criarModeloComDefaults({ nome: '' }));
    }
  }, [modelo, open]);

  const colaboradorSel = colaboradores.find((c) => c.id === form.colaborador_id);
  const desligado = form.situacao === SITUACAO_FOLHA.DESLIGADO;
  const ehSocio = form.tipo_vinculo === TIPO_VINCULO.SOCIO;

  const handleTipoVinculo = (tipo) => {
    setForm((prev) =>
      criarModeloComDefaults({
        ...prev,
        tipo_vinculo: tipo,
        rubricas: criarRubricasPadrao(tipo),
        decimo_terceiro_ativo: tipo === TIPO_VINCULO.SOCIO ? false : true,
      }),
    );
  };

  const handleSave = () => {
    onSave({
      ...form,
      colaborador_nome: colaboradorSel?.nome || form.colaborador_nome || '',
    });
  };

  const updateRubrica = (idx, rub) => {
    const rubricas = [...form.rubricas];
    rubricas[idx] = rub;
    setForm({ ...form, rubricas });
  };

  const addRubrica = () => {
    setForm({
      ...form,
      rubricas: [
        ...form.rubricas,
        { id: gerarIdInterno('rub'), tipo: 'provento', nome: 'Nova rubrica', valor_base: 0, ordem: form.rubricas.length + 1 },
      ],
    });
  };

  const updateFerias = (idx, f) => {
    const ferias_programadas = [...(form.ferias_programadas || [])];
    ferias_programadas[idx] = f;
    setForm({ ...form, ferias_programadas });
  };

  const addFerias = () => {
    setForm({
      ...form,
      ferias_programadas: [
        ...(form.ferias_programadas || []),
        { id: gerarIdInterno('fer'), competencia_prevista: '', valor_previsto: 0, descricao: 'Férias', status: 'previsto' },
      ],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {desligado && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-800 dark:text-red-300">
              Desligou em {formatDataBr(form.data_desligamento)}.
              {onReativar && (
                <Button variant="link" className="h-auto p-0 ml-2 text-red-800 dark:text-red-300" onClick={() => onReativar(modelo)}>
                  Reativar na folha
                </Button>
              )}
            </div>
          )}

          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo_vinculo || TIPO_VINCULO.FUNCIONARIO} onValueChange={handleTipoVinculo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_VINCULO_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome do modelo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Colaborador (opcional)</Label>
            <Select
              value={form.colaborador_id || '__none__'}
              onValueChange={(v) => setForm({ ...form, colaborador_id: v === '__none__' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Modelo genérico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Modelo genérico (sem vínculo)</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pagamento</Label>
            <p className="text-sm text-muted-foreground mt-1.5 rounded-lg bg-muted/40 px-3 py-2">
              Pagamento no dia {FOLHA_DIA_VENCIMENTO} do mês seguinte à competência. Fechamento automático no último dia de cada mês.
            </p>
          </div>

          {ehSocio && (
            <div className="rounded-lg ring-1 ring-border/40 p-3 space-y-3">
              <Label className="font-medium">Retirada fixa do sócio</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Frequência</Label>
                  <Select
                    value={form.retirada_frequencia || 'mensal'}
                    onValueChange={(v) => setForm({ ...form, retirada_frequencia: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(RETIRADA_FREQUENCIA_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor por retirada (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.retirada_valor_fixo ?? 0}
                    onChange={(e) => setForm({ ...form, retirada_valor_fixo: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Semanal: multiplica pelo número de semanas do mês. Mensal: uma vez no mês. Vai para a projeção e pode ser enviada ao fluxo de caixa.
              </p>
            </div>
          )}

          {!ehSocio && (
          <div className="rounded-lg ring-1 ring-border/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="decimo"
                checked={form.decimo_terceiro_ativo !== false}
                onCheckedChange={(v) => setForm({ ...form, decimo_terceiro_ativo: Boolean(v) })}
              />
              <Label htmlFor="decimo" className="font-medium">Incluir 13º salário na projeção</Label>
            </div>
            {form.decimo_terceiro_ativo !== false && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">1ª parcela (mês)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.decimo_mes_parcela_1 ?? DECIMO_PADRAO.decimo_mes_parcela_1}
                    onChange={(e) => setForm({ ...form, decimo_mes_parcela_1: parseInt(e.target.value, 10) || 11 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">2ª parcela (mês)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={form.decimo_mes_parcela_2 ?? DECIMO_PADRAO.decimo_mes_parcela_2}
                    onChange={(e) => setForm({ ...form, decimo_mes_parcela_2: parseInt(e.target.value, 10) || 12 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">% salário/parcela</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.decimo_percentual_parcela ?? DECIMO_PADRAO.decimo_percentual_parcela}
                    onChange={(e) => setForm({ ...form, decimo_percentual_parcela: parseFloat(e.target.value) || 50 })}
                  />
                </div>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Padrão: 50% em novembro + 50% em dezembro, sobre o salário base.
            </p>
          </div>
          )}

          {!ehSocio && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Férias programadas</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addFerias}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {(form.ferias_programadas || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma férias prevista.</p>
              ) : (
                form.ferias_programadas.map((f, idx) => (
                  <FeriasRow
                    key={f.id || idx}
                    ferias={f}
                    onChange={(nf) => updateFerias(idx, nf)}
                    onRemove={() =>
                      setForm({
                        ...form,
                        ferias_programadas: form.ferias_programadas.filter((_, i) => i !== idx),
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Rubricas fixas</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addRubrica}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.rubricas.map((rub, idx) => (
                <RubricaRow
                  key={rub.id || idx}
                  rubrica={rub}
                  onChange={(r) => updateRubrica(idx, r)}
                  onRemove={() => setForm({ ...form, rubricas: form.rubricas.filter((_, i) => i !== idx) })}
                />
              ))}
            </div>
          </div>

          {modelo?.id && form.colaborador_id && !desligado && onDesligar && (
            <Button type="button" variant="outline" className="w-full text-red-700 dark:text-red-400" onClick={() => onDesligar(modelo)}>
              Registrar desligamento…
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.nome.trim() || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
