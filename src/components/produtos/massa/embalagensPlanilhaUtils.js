/** Remove chaves emb1…emb5 do objeto linha (mutação). */
function stripEmbSlotKeys(dados) {
  for (let n = 1; n <= 5; n++) {
    delete dados[`emb${n}_rotulo`];
    delete dados[`emb${n}_sigla`];
    delete dados[`emb${n}_fator`];
    delete dados[`emb${n}_ajuste`];
  }
}

function parseNum(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Interpreta Emb.1 como unidade base (fator 1) e Emb.2–5 como alternativas (fator ≠ 1 em relação à base).
 * @param {Record<string, unknown>} dados — linha lida da planilha (mutado: remove emb*)
 * @param {{ fallbackPrincipal?: string }} options — sigla base quando Emb.1 vem vazia mas há Emb.2–5
 * @returns {{ alternativas: Array, principalSigla: string|null, emb1Explicit: boolean, error: string|null, warnings: string[] }}
 */
export function parseEmbalagensPlanilhaImport(dados, options = {}) {
  const fallbackPrincipal = String(options.fallbackPrincipal || 'UN').trim().toUpperCase() || 'UN';
  const warnings = [];

  const slots = [];
  for (let n = 1; n <= 5; n++) {
    const r = dados[`emb${n}_rotulo`];
    const s = dados[`emb${n}_sigla`];
    const f = dados[`emb${n}_fator`];
    const a = dados[`emb${n}_ajuste`];
    slots.push({
      n,
      rotulo: r != null ? String(r).trim() : '',
      sigla: s != null ? String(s).trim().toUpperCase() : '',
      fator: parseNum(f),
      ajuste: parseNum(a) ?? 0,
    });
  }
  stripEmbSlotKeys(dados);

  const emb1 = slots[0];
  const hasEmb2345 = slots.slice(1).some((sl) => sl.sigla && sl.fator != null);
  const hasAnyEmb = slots.some((sl) => sl.sigla || sl.rotulo || sl.fator != null);

  if (!hasAnyEmb) {
    return { alternativas: [], principalSigla: null, emb1Explicit: false, error: null, warnings, hadSlotPayload: false };
  }

  const emb1Explicit = Boolean(emb1.sigla);
  let principalSigla = emb1.sigla || '';

  if (!principalSigla && hasEmb2345) {
    principalSigla = fallbackPrincipal;
    warnings.push('Emb.1 sigla vazia; usando a unidade principal atual do produto como base (fator 1).');
  }

  if (!principalSigla) {
    return {
      alternativas: [],
      principalSigla: null,
      emb1Explicit: false,
      error: 'Preencha Emb.1 (sigla da unidade base, fator 1) para importar embalagens.',
      warnings,
      hadSlotPayload: true,
    };
  }

  if (emb1.fator != null && emb1.fator !== 1) {
    warnings.push(`Emb.1 Fator (${emb1.fator}) ignorado; a base é sempre fator 1.`);
  }

  const alternativas = [];
  const siglasAlternativasUsadas = new Set();
  for (const slot of slots.slice(1)) {
    if (!slot.sigla) continue;
    if (siglasAlternativasUsadas.has(slot.sigla)) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `Emb.${slot.n}: sigla "${slot.sigla}" repetida noutro slot (Emb.2–5).`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator == null || !Number.isFinite(slot.fator)) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `Emb.${slot.n}: informe fator numérico para a sigla "${slot.sigla}".`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator === 1) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `Emb.${slot.n}: fator não pode ser 1 (use apenas Emb.1 como base; demais fatores são relativos à Emb.1).`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.fator <= 0) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `Emb.${slot.n}: fator deve ser maior que zero.`,
        warnings,
        hadSlotPayload: true,
      };
    }
    if (slot.sigla === principalSigla) {
      return {
        alternativas: [],
        principalSigla: null,
        emb1Explicit: false,
        error: `Emb.${slot.n}: sigla igual à unidade base (Emb.1).`,
        warnings,
        hadSlotPayload: true,
      };
    }
    alternativas.push({
      unidade: slot.sigla,
      fator_conversao: slot.fator,
      rotulo: slot.rotulo,
      ajuste_percentual: slot.ajuste || 0,
      preco_venda: 0,
      ativo: true,
    });
    siglasAlternativasUsadas.add(slot.sigla);
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
