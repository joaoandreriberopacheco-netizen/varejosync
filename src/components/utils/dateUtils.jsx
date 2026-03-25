// Utilitário centralizado de datas — fuso America/Rio_Branco (UTC-5 fixo)
// Usa offset manual para garantir consistência em todos os navegadores/Android WebView

const OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5

/**
 * Converte uma data ISO/UTC para objeto Date local (UTC-5)
 */
function toLocalDate(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + OFFSET_MS);
}

/**
 * Retorna a chave de data local no formato 'YYYY-MM-DD'
 */
export function toLocalDateKey(date) {
  const local = toLocalDate(date);
  if (!local) return '';
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna a data de hoje como 'YYYY-MM-DD' em UTC-5
 */
export function dataHoje() {
  return toLocalDateKey(new Date());
}

/**
 * Formata data e hora: "24/03/2026 18:05"
 */
export function formatarDataHora(date) {
  const local = toLocalDate(date);
  if (!local) return '-';
  const d = String(local.getUTCDate()).padStart(2, '0');
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const y = local.getUTCFullYear();
  const h = String(local.getUTCHours()).padStart(2, '0');
  const min = String(local.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

/**
 * Formata somente a data: "24/03/2026"
 */
export function formatarSoData(date) {
  if (!date) return '-';
  // Se vier como string YYYY-MM-DD (sem hora), não precisa de conversão de fuso
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  }
  const local = toLocalDate(date);
  if (!local) return '-';
  const d = String(local.getUTCDate()).padStart(2, '0');
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const y = local.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Formata somente a hora: "18:05"
 */
export function formatarHora(date) {
  const local = toLocalDate(date);
  if (!local) return '-';
  const h = String(local.getUTCHours()).padStart(2, '0');
  const min = String(local.getUTCMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/**
 * Formata para log: "24/03 18:05"
 */
export function formatarLogTime(date) {
  const local = toLocalDate(date);
  if (!local) return '-';
  const d = String(local.getUTCDate()).padStart(2, '0');
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const h = String(local.getUTCHours()).padStart(2, '0');
  const min = String(local.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m} ${h}:${min}`;
}

/**
 * Retorna chave de agrupamento: "Hoje", "Ontem" ou "24/03/2026"
 */
export function formatarGrupoData(date) {
  const key = toLocalDateKey(date);
  const hoje = dataHoje();
  if (key === hoje) return 'Hoje';
  const ontemDate = new Date(new Date().getTime() + OFFSET_MS - 86400000);
  const ontemKey = `${ontemDate.getUTCFullYear()}-${String(ontemDate.getUTCMonth()+1).padStart(2,'0')}-${String(ontemDate.getUTCDate()).padStart(2,'0')}`;
  if (key === ontemKey) return 'Ontem';
  return formatarSoData(date);
}

/**
 * Retorna ISO string atual em UTC-5
 */
export function agora() {
  return new Date().toISOString();
}