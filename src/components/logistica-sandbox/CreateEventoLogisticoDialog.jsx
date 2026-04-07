import React, { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Plus, Route, Ship, StickyNote, User, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';

const defaultCycle = { nome: 'Ciclo padrão', duracao: 21 };

function buildObservacaoBase(form, cicloNome, cicloDias) {
  return [
    form.observacoes,
    form.contato_viajante ? `Contato: ${form.contato_viajante}` : '',
    form.telefone_viajante ? `Telefone: ${form.telefone_viajante}` : '',
    `Lógica: ${cicloNome} (${cicloDias} dias)`
  ].filter(Boolean).join(' • ');
}

export default function CreateEventoLogisticoDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    embarcacao_nome: '',
    data_saida_origem: format(new Date(), 'yyyy-MM-dd'),
    usar_ciclo_padrao: true,
    ciclo_personalizado_nome: '',
    ciclo_personalizado_duracao: '',
    contato_viajante: '',
    telefone_viajante: '',
    observacoes: ''
  });
  const [saving, setSaving] = useState(false);

  const cicloAtivo = useMemo(() => {
    if (form.usar_ciclo_padrao) return defaultCycle;
    return {
      nome: form.ciclo_personalizado_nome || 'Ciclo personalizado',
      duracao: Number(form.ciclo_personalizado_duracao || 0)
    };
  }, [form]);

  const chegadaTabatingaPrevista = useMemo(() => {
    if (!form.data_saida_origem || !cicloAtivo.duracao) return '';
    return format(addDays(new Date(`${form.data_saida_origem}T00:00:00`), 7), 'dd/MM/yyyy');
  }, [form.data_saida_origem, cicloAtivo]);

  const chegadaManausPrevista = useMemo(() => {
    if (!form.data_saida_origem || !cicloAtivo.duracao) return '';
    return format(addDays(new Date(`${form.data_saida_origem}T00:00:00`), 14), 'dd/MM/yyyy');
  }, [form.data_saida_origem, cicloAtivo]);

  const encerramentoPrevisto = useMemo(() => {
    if (!form.data_saida_origem || !cicloAtivo.duracao) return '';
    return format(addDays(new Date(`${form.data_saida_origem}T00:00:00`), cicloAtivo.duracao), 'dd/MM/yyyy');
  }, [form.data_saida_origem, cicloAtivo]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const duracao = cicloAtivo.duracao || 21;
    const saidaManaus = new Date(`${form.data_saida_origem}T00:00:00`);
    const chegadaTabatinga = addDays(saidaManaus, 7);
    const chegadaManaus = addDays(saidaManaus, 14);
    const encerramentoCiclo = addDays(saidaManaus, duracao);
    const observacaoBase = buildObservacaoBase(form, cicloAtivo.nome, duracao);
    const codigoBase = format(saidaManaus, 'ddMMyy');

    await Promise.all([
      base44.entities.EventoLogisticoSandbox.create({
        codigo: `SM-${codigoBase}`,
        nome: `${form.embarcacao_nome} · Saída Manaus`,
        embarcacao_nome: form.embarcacao_nome,
        rota_nome: 'Manaus → Tabatinga',
        status_operacao: 'Atracado na Origem',
        data_referencia: format(saidaManaus, 'yyyy-MM-dd'),
        previsao_chegada: format(chegadaTabatinga, 'yyyy-MM-dd'),
        previsao_retorno: format(chegadaManaus, 'yyyy-MM-dd'),
        observacoes: [observacaoBase, 'Marco: saída de Manaus.'].filter(Boolean).join(' • '),
        ciclo_nome: cicloAtivo.nome,
        ciclo_dias: duracao,
        contato_viajante: form.contato_viajante,
        telefone_viajante: form.telefone_viajante,
        ocupacao_percentual: 0,
        dias_atraso: 0,
        chave_relacional_futura: `ciclo-${codigoBase}`
      }),
      base44.entities.EventoLogisticoSandbox.create({
        codigo: `CT-${codigoBase}`,
        nome: `${form.embarcacao_nome} · Chegada Tabatinga`,
        embarcacao_nome: form.embarcacao_nome,
        rota_nome: 'Manaus → Tabatinga',
        status_operacao: 'Atracado no Destino',
        data_referencia: format(chegadaTabatinga, 'yyyy-MM-dd'),
        previsao_chegada: format(chegadaTabatinga, 'yyyy-MM-dd'),
        previsao_retorno: format(chegadaManaus, 'yyyy-MM-dd'),
        observacoes: [observacaoBase, 'Marco: chegada em Tabatinga. Este marco encerra a etapa de ida.'].filter(Boolean).join(' • '),
        ciclo_nome: cicloAtivo.nome,
        ciclo_dias: duracao,
        contato_viajante: form.contato_viajante,
        telefone_viajante: form.telefone_viajante,
        ocupacao_percentual: 0,
        dias_atraso: 0,
        chave_relacional_futura: `ciclo-${codigoBase}`
      }),
      base44.entities.EventoLogisticoSandbox.create({
        codigo: `CM-${codigoBase}`,
        nome: `${form.embarcacao_nome} · Chegada Manaus`,
        embarcacao_nome: form.embarcacao_nome,
        rota_nome: 'Tabatinga → Manaus',
        status_operacao: 'Retornando',
        data_referencia: format(chegadaManaus, 'yyyy-MM-dd'),
        previsao_chegada: format(chegadaManaus, 'yyyy-MM-dd'),
        previsao_retorno: format(encerramentoCiclo, 'yyyy-MM-dd'),
        observacoes: [observacaoBase, 'Marco: retorno para Manaus.'].filter(Boolean).join(' • '),
        ciclo_nome: cicloAtivo.nome,
        ciclo_dias: duracao,
        contato_viajante: form.contato_viajante,
        telefone_viajante: form.telefone_viajante,
        ocupacao_percentual: 0,
        dias_atraso: 0,
        chave_relacional_futura: `ciclo-${codigoBase}`
      }),
      base44.entities.EventoLogisticoSandbox.create({
        codigo: `EC-${codigoBase}`,
        nome: `${form.embarcacao_nome} · Encerramento do ciclo`,
        embarcacao_nome: form.embarcacao_nome,
        rota_nome: 'Manaus → Tabatinga → Manaus',
        status_operacao: 'Atracado na Origem',
        data_referencia: format(encerramentoCiclo, 'yyyy-MM-dd'),
        previsao_chegada: format(encerramentoCiclo, 'yyyy-MM-dd'),
        previsao_retorno: format(encerramentoCiclo, 'yyyy-MM-dd'),
        observacoes: [observacaoBase, 'Marco: encerramento do ciclo de 21 dias.'].filter(Boolean).join(' • '),
        ciclo_nome: cicloAtivo.nome,
        ciclo_dias: duracao,
        contato_viajante: form.contato_viajante,
        telefone_viajante: form.telefone_viajante,
        ocupacao_percentual: 0,
        dias_atraso: 0,
        chave_relacional_futura: `ciclo-${codigoBase}`
      })
    ]);
    setSaving(false);
    setOpen(false);
    setForm({
      embarcacao_nome: '',
      data_saida_origem: format(new Date(), 'yyyy-MM-dd'),
      usar_ciclo_padrao: true,
      ciclo_personalizado_nome: '',
      ciclo_personalizado_duracao: '',
      contato_viajante: '',
      telefone_viajante: '',
      observacoes: ''
    });
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-2xl shadow-sm bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 gap-2">
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl border-0 shadow-xl p-0 overflow-hidden">
        <div className="p-6 bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="font-glacial text-2xl text-gray-900 dark:text-gray-100">Novo evento fluvial</DialogTitle>
            <DialogDescription>Cadastre o marco zero da saída de Manaus e deixe o ETA ser projetado automaticamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Ship className="w-4 h-4" /> Embarcação</div>
                <Input value={form.embarcacao_nome} onChange={(e) => handleChange('embarcacao_nome', e.target.value)} placeholder="Nome do barco" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" required />
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Route className="w-4 h-4" /> Saída de Manaus</div>
                <Input type="date" value={form.data_saida_origem} onChange={(e) => handleChange('data_saida_origem', e.target.value)} className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" required />
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Usar lógica padrão de 21 dias</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pré-configurada para a maioria das viagens.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('usar_ciclo_padrao', !form.usar_ciclo_padrao)}
                  className={`w-12 h-7 rounded-full shadow-sm transition ${form.usar_ciclo_padrao ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition ${form.usar_ciclo_padrao ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {!form.usar_ciclo_padrao && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input value={form.ciclo_personalizado_nome} onChange={(e) => handleChange('ciclo_personalizado_nome', e.target.value)} placeholder="Nome da lógica" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" />
                  <Input type="number" value={form.ciclo_personalizado_duracao} onChange={(e) => handleChange('ciclo_personalizado_duracao', e.target.value)} placeholder="Duração em dias" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" min="1" />
                </div>
              )}

              <div className="rounded-2xl bg-white dark:bg-gray-700 p-4 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ciclo projetado</p>
                <div className="mt-2 space-y-1 text-sm text-gray-900 dark:text-gray-100">
                  <p>Saída Manaus: {format(new Date(`${form.data_saida_origem}T00:00:00`), 'dd/MM/yyyy')}</p>
                  <p>Chegada Tabatinga: {chegadaTabatingaPrevista || '-'}</p>
                  <p>Chegada Manaus: {chegadaManausPrevista || '-'}</p>
                  <p>Encerramento: {encerramentoPrevisto || '-'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><User className="w-4 h-4" /> Contato do viajante</div>
                <Input value={form.contato_viajante} onChange={(e) => handleChange('contato_viajante', e.target.value)} placeholder="Nome do contato" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" />
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Phone className="w-4 h-4" /> Telefone</div>
                <Input value={form.telefone_viajante} onChange={(e) => handleChange('telefone_viajante', e.target.value)} placeholder="WhatsApp / telefone" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl" />
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><StickyNote className="w-4 h-4" /> Observações</div>
              <Textarea value={form.observacoes} onChange={(e) => handleChange('observacoes', e.target.value)} placeholder="Detalhes importantes do evento logístico" className="border-0 bg-white dark:bg-gray-700 shadow-sm rounded-2xl min-h-[100px]" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-2xl border-0 shadow-sm">Cancelar</Button>
              <Button type="submit" disabled={saving} className="rounded-2xl shadow-sm bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                {saving ? 'Salvando...' : 'Criar recorrência do ciclo'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}