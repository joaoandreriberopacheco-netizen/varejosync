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
 * Timestamp atual em ISO UTC (instante absoluto). Use para `created_date`,
 * auditoria, etc. Para **chave de dia civil** no negócio (YYYY-MM-DD em Rio Branco),
 * use `dataHoje()` — nunca `toISOString().slice(0, 10)` (isso é o dia em UTC).
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
 * Data civil de hoje menos N dias (Rio Branco UTC-5 fixo; mesmo critério de `dataHoje`).
 * @param {number} diasAtras inteiro ≥ 0
 */
export function dataMenosDiasSistema(diasAtras) {
  const t = Date.now() - Number(diasAtras) * 86400000;
  const local = new Date(t - 5 * 60 * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Primeiro e último dia do mês civil em `YYYY-MM-DD` (calendário universal; seguro para vencimentos só-data).
 * @param {number} year ex. 2026
 * @param {number} monthIndexZeroBased 0 = janeiro
 */
export function boundsMesCivil(year, monthIndexZeroBased) {
  const pad = (n) => String(n).padStart(2, '0');
  const m = monthIndexZeroBased + 1;
  const start = `${year}-${pad(m)}-01`;
  const ultimoDia = new Date(Date.UTC(year, monthIndexZeroBased + 1, 0)).getUTCDate();
  return { start, end: `${year}-${pad(m)}-${pad(ultimoDia)}` };
}

/**
 * Início do dia civil em Rio Branco como ISO UTC (filtros `$gte` na API).
 */
export function inicioDiaSistemaISO(dateStrYyyyMmDd) {
  return new Date(`${dateStrYyyyMmDd}T00:00:00-05:00`).toISOString();
}

/**
 * Fim do dia civil em Rio Branco como ISO UTC (filtros `$lte` na API).
 */
export function fimDiaSistemaISO(dateStrYyyyMmDd) {
  return new Date(`${dateStrYyyyMmDd}T23:59:59.999-05:00`).toISOString();
}

/**
 * Segunda-feira da mesma semana civil que o dia `YYYY-MM-DD` (semana começa na segunda).
 * Usa apenas calendário gregoriano (sem depender do fuso do navegador).
 */
export function inicioSemanaCivilDesdeYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  const dow = day.getUTCDay();
  const diffToMon = (dow + 6) % 7;
  const mon = new Date(Date.UTC(y, m - 1, d - diffToMon));
  const yy = mon.getUTCFullYear();
  const mm = String(mon.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(mon.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
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
    return new Date(`${valor}T00:00:00-05:00`);
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