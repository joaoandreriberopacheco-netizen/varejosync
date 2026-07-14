/**
 * Atalho direto para cadastro na agenda (PWA shortcut / links internos).
 * Mesmo padrão do lançamento financeiro (?novo=1 no FluxoCaixa).
 */

import { createPageUrl } from '@/components/utils';
import { AGENDA_TIPOS } from '@/lib/agenda/agendaService';

export function buildNovoCompromissoAgendaUrl({
  titulo,
  data,
  tipo,
  descricao,
  hora,
} = {}) {
  const params = new URLSearchParams();
  params.set('novo', '1');

  if (titulo) params.set('titulo', String(titulo).slice(0, 120));
  if (data) params.set('data', String(data).slice(0, 10));
  if (hora) params.set('hora', String(hora).slice(0, 5));
  if (descricao) params.set('descricao', String(descricao).slice(0, 240));
  if (tipo && AGENDA_TIPOS.includes(tipo)) params.set('tipo', tipo);

  return `${createPageUrl('Notificacoes')}?${params.toString()}`;
}

export function navegarParaNovoCompromissoAgenda(options) {
  window.location.href = buildNovoCompromissoAgendaUrl(options);
}

export function parseNovoCompromissoAgendaParams(search = window.location.search) {
  const params = new URLSearchParams(search);
  const novo = params.get('novo');
  if (novo !== '1' && novo !== 'true') return null;

  const draft = {};
  const titulo = params.get('titulo');
  const data = params.get('data');
  const hora = params.get('hora');
  const descricao = params.get('descricao');
  const tipo = params.get('tipo');

  if (titulo) draft.titulo = titulo;
  if (data) draft.data = data;
  if (hora) draft.hora = hora;
  if (descricao) draft.descricao = descricao;
  if (tipo && AGENDA_TIPOS.includes(tipo)) draft.tipo = tipo;

  return draft;
}

export function limparParamsNovoCompromissoAgenda() {
  window.history.replaceState({}, '', window.location.pathname);
}
