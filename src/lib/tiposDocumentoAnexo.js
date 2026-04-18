/** localStorage: tipos criados pelo usuário na Torre de controle / anexos. */
export const STORAGE_TIPOS_CUSTOM_ANEXO = 'varejosync_tipos_documento_anexo_custom';

export function loadTiposCustomAnexo() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_TIPOS_CUSTOM_ANEXO);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string' && t.trim()) : [];
  } catch {
    return [];
  }
}

export function saveTiposCustomAnexo(tipos) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_TIPOS_CUSTOM_ANEXO, JSON.stringify(tipos));
  } catch {
    /* ignore quota */
  }
}

/** Tipos padrão para classificação de anexos (Drive / compartilhamento). */
export const TIPOS_DOCUMENTO_ANEXO = [
  'Comprovante',
  'Boleto',
  'Nota Fiscal',
  'Contrato',
  'Orçamento',
  'Outro',
];

/** Ordem de agrupamento na listagem do modal de anexos. */
export const ORDEM_TIPOS_DOCUMENTO_ANEXO = [
  'Nota Fiscal',
  'Boleto',
  'Comprovante',
  'Contrato',
  'Orçamento',
  'Outro',
];
