/**
 * Utilitário centralizado de data/hora do sistema VarejoSync.
 *
 * IMPORTANTE: O sistema opera SEMPRE no fuso horário America/Rio_Branco (UTC-5).
 * Nunca use `new Date()` diretamente para gravar timestamps — use `agora()`.
 * Isso garante que todos os registros de hora sigam o mesmo fuso, independente
 * do dispositivo ou localidade do usuário.
 */

export const TIMEZONE_SISTEMA = 'America/Rio_Branco';

/**
 * Retorna o timestamp atual como string ISO 8601 (sempre UTC internamente).
 * Use para TODOS os campos de data/hora persistidos na base de dados.
 * A hora é a mesma globalmente — o fuso só importa na EXIBIÇÃO.
 * @returns {string} ISO string e.g. "2026-03-16T15:32:00.000Z"
 */
export function agora() {
  return new Date().toISOString();
}

/**
 * Retorna a data de hoje no fuso do sistema no formato yyyy-MM-dd.
 * Use para campos de tipo "date" (sem hora).
 * @returns {string} e.g. "2026-03-16"
 */
export function dataHoje() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE_SISTEMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // sv-SE usa formato yyyy-MM-dd nativamente
}

/**
 * Formata um timestamp para exibição no fuso do sistema (com hora).
 * @param {string|Date} valor
 * @param {Object} [opcoes] - Opções extras de Intl.DateTimeFormat
 * @returns {string} e.g. "16/03/2026 às 10:32"
 */
export function formatarDataHora(valor, opcoes = {}) {
  if (!valor) return '—';
  const data = typeof valor === 'string' ? new Date(valor) : valor;
  if (isNaN(data.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE_SISTEMA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...opcoes,
  }).format(data);
}

/**
 * Formata apenas a data (sem hora) no fuso do sistema.
 * @param {string|Date} valor
 * @returns {string} e.g. "16/03/2026"
 */
export function formatarData(valor) {
  if (!valor) return '—';
  const data = typeof valor === 'string' ? new Date(valor) : valor;
  if (isNaN(data.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE_SISTEMA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data);
}

/**
 * Retorna a data de hoje (início do dia UTC-5) como objeto Date.
 * Útil para filtros de "a partir de hoje".
 * @returns {Date}
 */
export function inicioDiaHoje() {
  const hoje = dataHoje(); // yyyy-MM-dd no fuso correto
  // UTC-5 = -05:00
  return new Date(`${hoje}T00:00:00-05:00`);
}

/**
 * Retorna uma string "dd/MM HH:mm" no fuso do sistema — útil para logs.
 * @param {string|Date} [valor] - Se omitido, usa agora()
 * @returns {string} e.g. "16/03 10:32"
 */
export function formatarLogTime(valor) {
  const ts = valor ? (typeof valor === 'string' ? new Date(valor) : valor) : new Date();
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE_SISTEMA,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts);
}