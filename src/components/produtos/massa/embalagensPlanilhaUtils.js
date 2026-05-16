import {
  normalizeSigla,
  buildProdutoUnidadesPatchFromVitrine,
} from '@/lib/productUnitsCrud';

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
  const s = normalizeSigla(siglaExibicao);
  const p = normalizeSigla(principalSigla || 'UN') || 'UN';
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
      if (c.key && normalizeHeaderLabel(c.key) === norm) return true;
      return (c.altLabels || []).some((alt) => normalizeHeaderLabel(alt) === norm);
    }) || null
  );
}

/** Cabeçalhos da coluna única de vitrine (planilha antiga) — não aceitos no modelo só-embalagens. */
export const LEGACY_PLANILHA_UNIDADE_VITRINE_LABELS = [
  'Unidade vitrine',
  'Unidade comercial (sigla)',
  'Unidade Vitrine',
  'Unidade vitrine (sigla)',
];

export function isLegacyUnidadeVitrinePlanilhaHeader(label) {
  const norm = normalizeHeaderLabel(label);
  if (!norm) return false;
  return LEGACY_PLANILHA_UNIDADE_VITRINE_LABELS.some((l) => normalizeHeaderLabel(l) === norm);
}

export const EMB_VITRINE_FLAG_KEYS = ['emb1_vitrine', 'emb2_vitrine', 'emb3_vitrine'];

const VITRINE_FLAG_LABELS_PT = ['Base vitrine (0/1)', 'Alt.1 vitrine (0/1)', 'Alt.2 vitrine (0/1)'];

const VITRINE_FLAG_INVALID_PT =
  'Valor inválido em «{label}»: use apenas 0 ou 1 (célula vazia conta como 0).';

/**
 * Normaliza uma célula emb*_vitrine: vazio = 0; só `true` ou número 1 contam como 1.
 * @returns {{ ok: true, value: 0 | 1 } | { ok: false }}
 */
function normalizeVitrineSlotFlagCell(raw) {
  if (raw === true) return { ok: true, value: 1 };
  if (raw === false) return { ok: true, value: 0 };
  if (raw == null) return { ok: true, value: 0 };

  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t === '') return { ok: true, value: 0 };
    const u = t.toUpperCase();
    if (u === 'TRUE' || u === 'VERDADEIRO') return { ok: true, value: 1 };
    if (u === 'FALSE' || u === 'FALSO') return { ok: true, value: 0 };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return { ok: false };
  if (n === 0) return { ok: true, value: 0 };
  if (n === 1) return { ok: true, value: 1 };
  return { ok: false };
}

/**
 * Com os três cabeçalhos mapeados, garante chaves explícitas em `dados` (célula vazia → `null`)
 * para `summarizeVitrineSlotFlagsFromRow` não depender só de `hasOwnProperty` omitindo slots.
 */
export function ensureEmbVitrineFlagKeysFromMappedColumns(dados, colIndexMap) {
  if (!dados || !colIndexMap) return dados;
  for (const k of EMB_VITRINE_FLAG_KEYS) {
    if (!colIndexMap[k]) continue;
    if (!Object.prototype.hasOwnProperty.call(dados, k)) {
      dados[k] = null;
    }
  }
  return dados;
}

/**
 * Lê 0/1 das colunas de vitrine por slot (vazio → 0).
 * @returns {{ v: [number, number, number], error: string|null }}
 */
export function summarizeVitrineSlotFlagsFromRow(dados = {}) {
  const v = /** @type {[number, number, number]} */ ([0, 0, 0]);
  for (let i = 0; i < EMB_VITRINE_FLAG_KEYS.length; i++) {
    const key = EMB_VITRINE_FLAG_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(dados, key)) continue;
    const raw = dados[key];
    const norm = normalizeVitrineSlotFlagCell(raw);
    if (!norm.ok) {
      const label = VITRINE_FLAG_LABELS_PT[i];
      return {
        v,
        error: VITRINE_FLAG_INVALID_PT.replace('{label}', label),
      };
    }
    v[i] = norm.value;
  }
  return { v, error: null };
}

/**
 * Converte flags de vitrine + siglas resolvidas em `unidade_vitrine` armazenada ('' = base).
 * @returns {{ stored: string, error: string|null }}
 */
export function vitrineStoredFromSlotFlags(v, principalSigla, alt1Sigla, alt2Sigla) {
  const p = normalizeSigla(principalSigla || 'UN') || 'UN';
  const a1 = alt1Sigla != null && String(alt1Sigla).trim() !== '' ? normalizeSigla(alt1Sigla) : '';
  const a2 = alt2Sigla != null && String(alt2Sigla).trim() !== '' ? normalizeSigla(alt2Sigla) : '';
  const sum = v[0] + v[1] + v[2];
  if (sum !== 1) {
    return {
      stored: '',
      error:
        'Nas colunas «Base vitrine (0/1)», «Alt.1 vitrine (0/1)» e «Alt.2 vitrine (0/1)» deve haver exatamente um «1» e dois «0» (células vazias contam como 0).',
    };
  }
  if (v[0]) return { stored: '', error: null };
  if (v[1]) {
    if (!a1) {
      return {
        stored: '',
        error:
          '«Alt.1 vitrine (0/1)» está como 1, mas não há sigla em Alt.1 nesta linha. Preencha Alt.1 ou marque a vitrine na base.',
      };
    }
    return { stored: vitrineExibicaoParaArmazenada(a1, p), error: null };
  }
  if (v[2]) {
    if (!a2) {
      return {
        stored: '',
        error:
          '«Alt.2 vitrine (0/1)» está como 1, mas não há sigla em Alt.2 nesta linha. Preencha Alt.2 ou escolha outro slot de vitrine.',
      };
    }
    return { stored: vitrineExibicaoParaArmazenada(a2, p), error: null };
  }
  return { stored: '', error: 'Erro ao interpretar colunas de vitrine.' };
}

/** Valor canónico gravado em `unidade_vitrine` (não mistura legado de exibição). */
export function vitrineArmazenadaDoProduto(produto, principalSigla) {
  const principal = normalizeSigla(principalSigla || 'UN') || 'UN';
  const raw = produto?.unidade_vitrine;
  if (raw == null || String(raw).trim() === '') return '';
  return vitrineExibicaoParaArmazenada(raw, principal);
}

/** Espelha `is_comercial` nas alternativas conforme `unidade_vitrine` gravada. */
export function syncIsComercialOnAlternativas(alternativas = [], vitrineStored, principalSigla) {
  const principal = normalizeSigla(principalSigla || 'UN') || 'UN';
  const storedCanon = normalizeSigla(vitrineStored);
  const vitrineSigla = storedCanon || principal;
  return alternativas.map((u) => {
    const unidade = normalizeSigla(u?.unidade);
    return {
      ...u,
      is_comercial: storedCanon !== '' && Boolean(unidade) && unidade === vitrineSigla,
    };
  });
}

/**
 * Patch de unidades/vitrine idêntico ao save do formulário (`applyUnidadesToProduto`).
 * Excel só precisa da coluna vitrine; `is_comercial` vem do pathway inverso em productUnitsCrud.
 */
export function buildVitrineIsComercialPatch(produto, vitrineStored, principalSigla) {
  return buildProdutoUnidadesPatchFromVitrine(produto, vitrineStored, principalSigla);
}

/** Cadastro ainda tem espelho `is_comercial` diferente do que a vitrine exige. */
export function espelhoIsComercialDivergeDoCadastro(produto, patch = {}) {
  if (
    patch.unidades_alternativas
    && JSON.stringify(patch.unidades_alternativas)
      !== JSON.stringify(produto?.unidades_alternativas || [])
  ) {
    return true;
  }
  if (
    patch.unidades
    && JSON.stringify(patch.unidades) !== JSON.stringify(produto?.unidades || [])
  ) {
    return true;
  }
  return false;
}

/** Remove chaves emb1…emb5 do objeto linha (mutação). */
function stripEmbSlotKeys(dados) {
  for (let n = 1; n <= LEGACY_EMB_SLOTS; n++) {
    delete dados[`emb${n}_rotulo`];
    delete dados[`emb${n}_sigla`];
    delete dados[`emb${n}_fator`];
    delete dados[`emb${n}_ajuste`];
    delete dados[`emb${n}_vitrine`];
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
  const fallbackPrincipal = normalizeSigla(options.fallbackPrincipal || 'UN') || 'UN';
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
      sigla: s != null ? normalizeSigla(s) : '',
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
