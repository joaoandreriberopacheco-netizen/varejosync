import { addDays, format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

export const AGENDA_FREQUENCIAS = [
  'Diária',
  'Semanal',
  'Mensal',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
];

export const AGENDA_TIPOS = ['Evento', 'Compromisso', 'Tarefa'];

const DIAS_JANELA_FUTURA = 30;
const STATUS_TAREFA_ATIVOS = new Set(['Pendente', 'Em Andamento', 'Atrasada']);
const STATUS_CONTA_ATIVOS = new Set(['Em Aberto', 'Vencido']);

function parseDateSafe(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  try {
    return parseISO(raw);
  } catch {
    return null;
  }
}

function combineDateTime(dateValue, hora) {
  const date = parseDateSafe(dateValue);
  if (!date) return null;
  if (!hora) return date;
  const [h, m] = String(hora).split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return combined;
}

function isWithinAgendaWindow(dateValue) {
  const date = parseDateSafe(dateValue);
  if (!date) return false;
  const today = startOfDay(new Date());
  const limit = addDays(today, DIAS_JANELA_FUTURA);
  return !isBefore(date, addDays(today, -1)) && !isBefore(limit, date);
}

function isOverdue(dateValue) {
  const date = parseDateSafe(dateValue);
  if (!date) return false;
  return isBefore(startOfDay(date), startOfDay(new Date()));
}

export function formatAgendaDate(dateValue, hora) {
  const date = parseDateSafe(dateValue);
  if (!date) return '';
  const label = format(date, "dd/MM/yyyy", { locale: ptBR });
  return hora ? `${label} · ${hora}` : label;
}

export function formatRecurrenceLabel(item) {
  if (!item?.recorrente || !item?.frequencia) return null;
  if (item.data_fim_recorrencia) {
    return `${item.frequencia} até ${formatAgendaDate(item.data_fim_recorrencia)}`;
  }
  return item.frequencia;
}

function agendaItemToFeed(item) {
  const overdue = item.status === 'Pendente' && isOverdue(item.data);
  return {
    id: `agenda:${item.id}`,
    source: 'agenda',
    sourceId: item.id,
    type: overdue ? 'warning' : item.tipo === 'Tarefa' ? 'info' : 'success',
    category: item.tipo,
    title: item.titulo,
    message: item.descricao || formatRecurrenceLabel(item) || item.tipo,
    timestamp: combineDateTime(item.data, item.hora) || parseDateSafe(item.data) || new Date(),
    dueDate: item.data,
    hora: item.hora,
    read: item.status !== 'Pendente',
    completed: item.status === 'Concluída',
    recurrence: formatRecurrenceLabel(item),
    raw: item,
    actionable: true,
  };
}

function contaToFeed(conta) {
  const overdue = isOverdue(conta.data_vencimento);
  const valor = conta.valor != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor)
    : null;

  return {
    id: `conta:${conta.id}`,
    source: 'conta',
    sourceId: conta.id,
    type: overdue ? 'danger' : 'warning',
    category: 'Conta',
    title: conta.descricao || 'Conta a pagar',
    message: [conta.terceiro_nome, valor].filter(Boolean).join(' · ') || 'Despesa em aberto',
    timestamp: parseDateSafe(conta.data_vencimento) || new Date(),
    dueDate: conta.data_vencimento,
    read: false,
    completed: false,
    recurrence: null,
    raw: conta,
    actionable: false,
  };
}

function tarefaToFeed(tarefa) {
  const overdue = tarefa.status === 'Atrasada' || (tarefa.data_vencimento && isOverdue(tarefa.data_vencimento));

  return {
    id: `tarefa:${tarefa.id}`,
    source: 'tarefa',
    sourceId: tarefa.id,
    type: overdue ? 'danger' : tarefa.prioridade === 'Urgente' || tarefa.prioridade === 'Alta' ? 'warning' : 'info',
    category: 'Tarefa sistema',
    title: tarefa.titulo,
    message: [tarefa.tipo, tarefa.referencia_numero, tarefa.descricao].filter(Boolean).join(' · '),
    timestamp: parseDateSafe(tarefa.data_vencimento) || new Date(),
    dueDate: tarefa.data_vencimento,
    read: false,
    completed: false,
    recurrence: null,
    raw: tarefa,
    actionable: true,
  };
}

export function sortAgendaFeed(items) {
  return [...items].sort((a, b) => {
    const aDate = parseDateSafe(a.dueDate) || a.timestamp;
    const bDate = parseDateSafe(b.dueDate) || b.timestamp;
    if (!aDate || !bDate) return 0;
    return aDate.getTime() - bDate.getTime();
  });
}

export function filterAgendaFeed(items, filter) {
  const today = startOfDay(new Date());

  switch (filter) {
    case 'hoje':
      return items.filter((item) => {
        const date = parseDateSafe(item.dueDate);
        return date && isSameDay(date, today);
      });
    case 'compromissos':
      return items.filter((item) => item.source === 'agenda');
    case 'contas':
      return items.filter((item) => item.source === 'conta');
    case 'tarefas':
      return items.filter((item) => item.source === 'tarefa' || (item.source === 'agenda' && item.category === 'Tarefa'));
    default:
      return items;
  }
}

export async function fetchAgendaFeed(user) {
  const [agendaItems, lancamentos, tarefas] = await Promise.all([
    user?.id
      ? base44.entities.AgendaItem.filter({ usuario_id: user.id }, '-data', 200).catch(() => [])
      : Promise.resolve([]),
    base44.entities.LancamentoFinanceiro.list('-data_vencimento', 250).catch(() => []),
    base44.entities.Tarefa.list('-data_vencimento', 150).catch(() => []),
  ]);

  const minhasAgenda = (Array.isArray(agendaItems) ? agendaItems : [])
    .filter((item) => item.status !== 'Cancelada')
    .map(agendaItemToFeed);

  const contas = (Array.isArray(lancamentos) ? lancamentos : [])
    .filter((l) => l.tipo === 'Despesa' && STATUS_CONTA_ATIVOS.has(l.status) && isWithinAgendaWindow(l.data_vencimento))
    .map(contaToFeed);

  const minhasTarefas = (Array.isArray(tarefas) ? tarefas : [])
    .filter((t) => (!user?.id || t.responsavel_id === user.id) && STATUS_TAREFA_ATIVOS.has(t.status))
    .map(tarefaToFeed);

  return sortAgendaFeed([...minhasAgenda, ...contas, ...minhasTarefas]);
}

export async function saveAgendaItem(payload, existingId) {
  if (existingId) {
    return base44.entities.AgendaItem.update(existingId, payload);
  }
  return base44.entities.AgendaItem.create(payload);
}

export async function completeAgendaFeedItem(item) {
  if (item.source === 'agenda') {
    return base44.entities.AgendaItem.update(item.sourceId, { status: 'Concluída' });
  }
  if (item.source === 'tarefa') {
    return base44.entities.Tarefa.update(item.sourceId, {
      status: 'Concluída',
      data_conclusao: new Date().toISOString(),
    });
  }
  return null;
}

export async function deleteAgendaItem(itemId) {
  return base44.entities.AgendaItem.delete(itemId);
}

export function countPendingFeed(items) {
  return items.filter((item) => !item.completed && !item.read).length;
}
