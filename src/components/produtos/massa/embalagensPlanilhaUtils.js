/** 1 base + 2 alternativas; alinhado a `MAX_EMBALAGENS` em produtoEmbalagensEntity. */
export const MAX_EMBALAGENS_PLANILHA = 3;
export const MAX_ALTERNATIVAS_PLANILHA = MAX_EMBALAGENS_PLANILHA - 1;

const LEGACY_EMB_SLOTS = 5;

function slotDisplayName(n) {
  if (n === 1) return 'Base';
  if (n === 2) return 'Alt.1';
  if (n === 3) return 'Alt.2';
  return `Emb.${n}`;
}

/** Lê coluna de vitrine da linha; legado `unidade_apresentacao_default` só se a nova estiver vazia. */
export function resolveVitrineColunaPlanilha(dados = {}) {
  const novo = dados.unidade_vitrine;
  const temNovo = novo != null && String(novo).trim() !== '';
  if (temNovo) return String(novo).trim();
  const legado = dados.unidade_apresentacao_default;
  if (legado != null && String(legado).trim() !== '') return String(legado).trim();
  return '';
}

/** Remove campo legado após mapear para `unidade_vitrine` (mutação). */
export function mapLegacyVitrineColumn(dados) {
  const vitrine = resolveVitrineColunaPlanilha(dados);
  if (vitrine) dados.unidade_vitrine = vitrine;
  delete dados.unidade_apresentacao_default;
  return dados;
}

/** Sigla exibida na planilha → valor gravado (`''` = vitrine na unidade base). */
export function vitrineExibicaoParaArmazenada(siglaExibicao, principalSigla) {
  const s = String(siglaExibicao ?? '').trim().toUpperCase();
  const p = String(principalSigla || 'UN').trim().toUpperCase() || 'UN';
  if (!s) return '';
  return s === p ? '' : s;
}

/** Alias estável usado na importação em massa. */
export const vitrineSiglaToStoredValue = vitrineExibicaoParaArmazenada;

export function normalizeHeaderLabel(label) {
  return String(label ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Casa cabeçalho da 1.ª linha com `label` / `altLabels` (ignora maiúsculas e acentos). */
export function findColunaByHeader(label, colunas = []) {
  const norm = normalizeHeaderLabel(label);
  if (!norm) return null;
  return (
    colunas.find((c) => {
      if (normalizeHeaderLabel(c.label) === norm) return true;
      return (c.altLabels || []).some((alt) => normalizeHeaderLabel(alt) === norm);
    }) || null
  );
}

/**
 * Lê vitrine da linha já extraída; distingue coluna ausente vs célula vazia.
 * @returns {{ rawExibicao: string, colPresent: boolean, cellPresent: boolean, stored: string|null }}
 */
export function parseVitrineFromRow(dados = {}, options = {}) {
  const { colPresent = false, principalSigla = 'UN' } = options;
  const principal = String(principalSigla || 'UN').trim().toUpperCase() || 'UN';
  if (!colPresent) {
    return { rawExibicao: '', colPresent: false, cellPresent: false, stored: null };
  }
  const hasKey = Object.prototype.hasOwnProperty.call(dados, 'unidade_vitrine');
  const raw = resolveVitrineColunaPlanilha(dados);
  const cellPresent = hasKey || raw !== '';
  const rawExibicao = raw ? String(raw).trim().toUpperCase() : '';
  const siglaParaArmazenar = rawExibicao || principal;
  const stored = vitrineExibicaoParaArmazenada(siglaParaArmazenar, principal);
  return { rawExibicao: raw || '', colPresent: true, cellPresent, stored };
}

/** Valor canónico gravado em `unidade_vitrine` (não mistura legado de exibição). */
export function vitrineArmazenadaDoProduto(produto, principalSigla) {
  const principal = String(principalSigla || 'UN').trim().toUpperCase() || 'UN';
  const raw = produto?.unidade_vitrine;
  if (raw == null || String(raw).trim() === '') return '';
  return vitrineExibicaoParaArmazenada(String(raw).trim(), principal);
}

/** Espelha `is_comercial` nas alternativas conforme `unidade_vitrine` gravada. */
export function syncIsComercialOnAlternativas(alternativas = [], vitrineStored, principalSigla) {
  const principal = String(principalSigla || 'UN').trim().toUpperCase() || 'UN';
  const vitrineSigla = vitrineStored ? String(vitrineStored).trim().toUpperCase() : principal;
  return alternativas.map((u) => {
    const unidade = String(u?.unidade ?? '').trim().toUpperCase();
    return {
      ...u,
      is_comercial: vitrineStored !== '' && unidade === vitrineSigla,
    };
  });
}

/** Remove chaves emb1…emb5 do objeto linha (mutação). */
function stripEmbSlotKeys(dados) {
  for (let n = 1; n <= LEGACY_EMB_SLOTS; n++) {
    delete dados[`emb${n}_rotulo`];
    delete dados[`emb${n}_sigla`];
    delete dados[`emb${n}_fator`];
    delete dados[`emb${n}_ajuste`];
  }
}

function detectLegacyOverflowSlots(dados) {
  for (let n = MAX_EMBALAGENS_PLANILHA + 1; n <= LEGACY_EMB_SLOTS; n++) {
    const s = dados[`emb${n}_sigla`];
    const f = dados[`emb${n}_fator`];
    const a = dados[`emb${n}_ajuste`];
    const hasSigla = s != null && String(s).trim() !== '';
    const hasFator = f != null && String(f).trim() !== '';
    const hasAjuste = a != null && String(a).trim() !== '';
    if (hasSigla || hasFator || hasAjuste) {
      return `No máximo 3 embalagens na planilha (1 base + Alt.1 e Alt.2). Remova dados nas colunas Emb.${n} ou posteriores.`;
    }
  }
  return null;
}

function parseNum(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Interpreta Base (emb1) como unidade principal (fator 1) e Alt.1–Alt.2 como alternativas.
 * @param {Record<string, unknown>} dados — linha lida da planilha (mutado: remove emb*)
 * @param {{ fallbackPrincipal?: string }} options — sigla base quando Base vem vazia mas há alternativas
 * @returns {{
 *   alternativas: Array<{
 *     unidade: string,
 *     fator_conversao: number,
 *     rotulo: string,
 *     ajuste_percentual: number,
 *     fator_preco: number,
 *     preco_venda: number,
 *     ativo: boolean
 *   }>,
 *   principalSigla: string|null,
 *   emb1Explicit: boolean,
 *   error: string|null,
 *   warnings: string[],
 *   hadSlotPayload: boolean
 * }} `hadSlotPayload` — houve conteúdo em slots ou regra de erro/warning por causa deles.
 */
export function parseEmbalagensPlanilhaImport(dados, options = {}) {
  const fallbackPrincipal = String(options.fallbackPrincipal || 'UN').trim().toUpperCase() || 'UN';
  const warnings = [];

  const overflowError = detectLegacyOverflowSlots(dados);
  if (overflowError) {
    stripEmbSlotKeys(dados);
    return {
      alternativas: [],
      principalSigla: null,
      emb1Explicit: false,
      error: overflowError,
      warnings,
      hadSlotPayload: true,
    };
  }

  const slots = [];
  for (let n = 1; n <= MAX_EMBALAGENS_PLANILHA; n++) {
    const s = dados[`emb${n}_sigla`];
    const f = dados[`emb${n}_fator`];
    const adj = dados[`emb${n}_ajuste`];
    slots.push({
      n,
      rotulo: '',
      sigla: s != null ? String(s).trim().toUpperCase() : '',
      fator: parseNum(f),
      fatorPreco: parseNum(adj),
    });
  }
  stripEmbSlotKeys(dados);

  const emb1 = slots[0];
  const hasAlts = slots.slice(1).some((sl) => sl.sigla && sl.fator != null);
  const hasAnyEmb = slots.some((sl) => {
    const temAjuste = sl.fatorPreco != null && Number.isFinite(sl.fatorPreco);
    return Boolean(sl.sigla || sl.fator != null || temAjuste);
  });

  if (!hasAnyEmb) {
    return { alternativas: [], principalSigla: null, emb1Explicit: false, error: null, warnings, hadSlotPayload: false };
  }

  const emb1Explicit = Boolean(emb1.sigla);
  let principalSigla = emb1.sigla || '';

  if (!principalSigla && hasAlts) {
    principalSigla = fallbackPrincipal;
    warnings.push('Sigla da base vazia na planilha; usando a base já cadastrada no produto.');
  }

  if (!principalSigla) {
    return {
      alternativas: [],
      principalSigla: null,
      emb1Explicit: false,
      error: 'Preencha a sigla da base.',
      warnings,
      hadSlotPayload: true,
    };
  }

  if (emb1.fator != null && emb1.fator !== 1) {
    warnings.push('Fator de conversão da base na planilha é ignorado (na base vale sempre 1).');
  }

  if (emb1.fatorPreco != null && Number.isFinite(emb1.fatorPreco) && emb1.fatorPreco !== 1) {
    warnings.push('Ajuste preço (×) da base na planilha é ignorado (na base vale sempre 1,00).');
  }

  const alternativas = [];
  const siglasAlternativasUsadas = new Set();
  for (const slot of slots.slice(1)) {
    if (!slot.sigla) continue;
    const label = slotDisplayName(slot.n);
    if (siglasAlternativasUsadas.has(slot.sigla)) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: sigla "${slot.sigla}" repetida em outra alternativa.`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator == null || !Number.isFinite(slot.fator)) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: informe o fator de conversão (número) para a sigla "${slot.sigla}".`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator === 1) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: fator de conversão não pode ser 1 (só a base tem fator 1; nas alternativas é a conversão em relação à base).`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator <= 0) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: fator de conversão deve ser maior que zero.`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.sigla === principalSigla) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: sigla igual à da base.`,
        warnings,
        hadSlotPayload: true,
      };
    }
    const fpRaw = slot.fatorPreco;
    const fatorPreco = fpRaw == null || !Number.isFinite(fpRaw) ? 1 : fpRaw;
    if (fatorPreco <= 0) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `${label}: ajuste preço (×) deve ser maior que zero (ex.: 1,10 ou 0,80).`,
        warnings,
        hadSlotPayload: true,
      };
    }
    alternativas.push({
      unidade: slot.sigla,
      fator_conversao: slot.fator,
      rotulo: slot.rotulo,
      ajuste_percentual: 0,
      fator_preco: fatorPreco,
      preco_venda: 0,
      ativo: true,
    });
    siglasAlternativasUsadas.add(slot.sigla);
  }

  if (alternativas.length > MAX_ALTERNATIVAS_PLANILHA) {
    return {
      alternativas: [],
      principalSigla: null,
      emb1Explicit: false,
      error: `No máximo ${MAX_ALTERNATIVAS_PLANILHA} alternativas (Alt.1 e Alt.2).`,
      warnings,
      hadSlotPayload: true,
    };
  }

  return {
    alternativas,
    principalSigla,
    emb1Explicit,
    error: null,
    warnings,
    hadSlotPayload: true,
  };
}
