import {
  codigoOrdenacaoDesdeInstante,
  datetimeLocalParaISO,
  isoParaInputDatetimeLocal,
  toLocalDateKey,
} from '@/components/utils/dateUtils';

/** Tag interna para ordenação quando `data_lancamento` não existe no schema Base44. */
export const TAG_ORDEM_PREFIX = '__ordem:';

export function codigoOrdemFromTag(tags) {
  const tag = (tags || []).find((t) => String(t).startsWith(TAG_ORDEM_PREFIX));
  if (!tag) return null;
  const codigo = String(tag).slice(TAG_ORDEM_PREFIX.length);
  return /^\d{14}$/.test(codigo) ? codigo : null;
}

export function mergeTagsOrdem(tags, codigo) {
  const rest = (tags || []).filter((t) => !String(t).startsWith(TAG_ORDEM_PREFIX));
  if (!codigo) return rest;
  return [...rest, `${TAG_ORDEM_PREFIX}${codigo}`];
}

export function codigoParaInputDatetimeLocal(codigo) {
  const s = String(codigo || '');
  if (!/^\d{14}$/.test(s)) return '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

export function instanteDesdeCodigoOrdenacao(codigo) {
  const input = codigoParaInputDatetimeLocal(codigo);
  return input ? datetimeLocalParaISO(input) : null;
}

/** Código AAAAMMDDHHMMSS efetivo (coluna, tag ou derivado de data_lancamento). */
export function codigoOrdemLancamento(l) {
  if (l?.codigo_lancamento) return String(l.codigo_lancamento);
  const fromTag = codigoOrdemFromTag(l?.tags);
  if (fromTag) return fromTag;
  if (l?.data_lancamento) {
    const codigo = codigoOrdenacaoDesdeInstante(l.data_lancamento);
    if (codigo) return codigo;
  }
  return null;
}

/** Instante usado para ordenar/agrupar (coluna ou tag). */
export function instanteOrdemLancamento(l) {
  if (l?.data_lancamento) return l.data_lancamento;
  const codigo = codigoOrdemLancamento(l);
  return codigo ? instanteDesdeCodigoOrdenacao(codigo) : null;
}

/** Valor para `<input type="datetime-local">` no detalhe do lançamento. */
export function resolverDataLancamentoInput(l) {
  const fromColuna = isoParaInputDatetimeLocal(l?.data_lancamento);
  if (fromColuna) return fromColuna;
  const codigo = codigoOrdemFromTag(l?.tags) || l?.codigo_lancamento;
  const fromTag = codigoParaInputDatetimeLocal(codigo);
  if (fromTag) return fromTag;
  return isoParaInputDatetimeLocal(l?.created_date) || '';
}

export function diaChaveOrdemLancamento(l) {
  const instante = instanteOrdemLancamento(l);
  if (instante) return toLocalDateKey(instante);
  return null;
}

/**
 * Payload de escrita: tenta colunas dedicadas + tag de fallback (Base44 legado).
 * @param {{ dataLancamento?: string, tags?: string[] }} params
 */
export function prepararPayloadOrdemLancamento({ dataLancamento, tags } = {}) {
  const iso = dataLancamento || null;
  const codigo = iso ? codigoOrdenacaoDesdeInstante(iso) : null;
  if (!iso || !codigo) return null;
  return {
    data_lancamento: iso,
    codigo_lancamento: codigo,
    tags: mergeTagsOrdem(tags, codigo),
  };
}

export function ordemLancamentoFoiPersistida(l, codigoEsperado) {
  if (!codigoEsperado) return false;
  return codigoOrdemLancamento(l) === String(codigoEsperado);
}
