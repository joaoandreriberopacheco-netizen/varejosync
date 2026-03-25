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
  const d = new Date();
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Converte uma data/timestamp para o horário de Rio Branco (UTC-5 fixo).
 * Usa offset manual como fallback garantido para Android/WebView.
 * @param {string|Date} valor
 * @returns {Date} objeto Date ajustado para UTC-5
 */
function parseDateValue(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== 'string') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00.000Z`);
  }

  const normalized = /([zZ]|[+-]\d{2}:\d{2})$/.test(valor) ? valor : `${valor}Z`;
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(valor);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toRioBranco(valor) {
  const d = parseDateValue(valor);
  if (!d) return null;
  // Aplica offset UTC-5 manualmente (5 * 60 * 60 * 1000 ms)
  return new Date(d.getTime() - 5 * 60 * 60 * 1000);
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Formata um timestamp para exibição no fuso do sistema (com hora).
 * Usa offset UTC-5 fixo — funciona em qualquer navegador/Android.
 * @param {string|Date} valor
 * @returns {string} e.g. "16/03/2026 10:32"
 */
export function formatarDataHora(valor) {
  const local = toRioBranco(valor);
  if (!local) return '—';
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/**
 * Formata apenas a data (sem hora) no fuso do sistema (UTC-5 fixo).
 * @param {string|Date} valor
 * @returns {string} e.g. "16/03/2026"
 */
export function formatarSoData(valor) {
  if (!valor) return '—';
  // Campos só-data (YYYY-MM-DD) não precisam de conversão de fuso
  if (typeof valor === 'string' && valor.length === 10) {
    const [y, m, dd] = valor.split('-');
    return `${dd}/${m}/${y}`;
  }
  const local = toRioBranco(valor);
  if (!local) return '—';
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

// Meses em pt-BR — evita Intl.DateTimeFormat em Android WebView
const MESES_CURTOS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_LONGOS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/**
 * Retorna chave YYYY-MM-DD no fuso UTC-5 — para agrupamentos de listas.
 * @param {string|Date} valor
 * @returns {string} e.g. "2026-03-16"
 */
export function toLocalDateKey(valor) {
  const local = toRioBranco(valor);
  if (!local) return '';
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/**
 * Formata data curta estilo "16 mar" — para uso em listas/rows.
 * Campos só-data (YYYY-MM-DD) são tratados sem conversão de fuso.
 * @param {string|Date} valor
 * @returns {string} e.g. "16 mar"
 */
export function formatarDataCurta(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && valor.length === 10) {
    const [, m, dd] = valor.split('-');
    return `${parseInt(dd, 10)} ${MESES_CURTOS[parseInt(m, 10) - 1]}`;
  }
  const local = toRioBranco(valor);
  if (!local) return '—';
  return `${local.getUTCDate()} ${MESES_CURTOS[local.getUTCMonth()]}`;
}

/**
 * Formata data longa estilo "16 de março de 2026".
 * @param {string|Date} valor
 * @returns {string}
 */
export function formatarDataLonga(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && valor.length === 10) {
    const [y, m, dd] = valor.split('-');
    return `${parseInt(dd, 10)} de ${MESES_LONGOS[parseInt(m, 10) - 1]} de ${y}`;
  }
  const local = toRioBranco(valor);
  if (!local) return '—';
  return `${local.getUTCDate()} de ${MESES_LONGOS[local.getUTCMonth()]} de ${local.getUTCFullYear()}`;
}

/** @deprecated Use formatarSoData */
export function formatarData(valor) { return formatarSoData(valor); }

/**
 * Retorna a data de hoje (início do dia UTC-5) como objeto Date.
 * @returns {Date}
 */
export function inicioDiaHoje() {
  const hoje = dataHoje();
  return new Date(`${hoje}T00:00:00-05:00`);
}

/**
 * Retorna uma string "dd/MM HH:mm" no fuso UTC-5 — útil para logs.
 * @param {string|Date} [valor]
 * @returns {string} e.g. "16/03 10:32"
 */
export function formatarLogTime(valor) {
  const ts = valor || new Date();
  const local = toRioBranco(ts);
  if (!local) return '—';
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}