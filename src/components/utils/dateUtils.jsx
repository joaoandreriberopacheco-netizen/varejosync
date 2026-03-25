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
 * Converte uma data/timestamp para o horário de Rio Branco (UTC-5 fixo).
 * Usa offset manual como fallback garantido para Android/WebView.
 * @param {string|Date} valor
 * @returns {Date} objeto Date ajustado para UTC-5
 */
function toRioBranco(valor) {
  const d = typeof valor === 'string' ? new Date(valor) : valor;
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
  if (!valor) return '—';
  const d = typeof valor === 'string' ? new Date(valor) : valor;
  if (isNaN(d.getTime())) return '—';
  const local = toRioBranco(d);
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
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '—';
  const local = toRioBranco(d);
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
}

/**
 * Formata apenas a data (sem hora) no fuso do sistema.
 * @param {string|Date} valor
 * @returns {string} e.g. "16/03/2026"
 * @deprecated Use formatarSoData para datas sem hora
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