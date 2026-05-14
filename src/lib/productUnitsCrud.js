/* ============================================================================
 * productUnitsCrud.js
 *
 * Unica via legitima de mutacao do array `Produto.unidades[]`. Toda funcao que
 * grava unidades (form do produto, importador XLS, backfill) DEVE passar por
 * aqui pra garantir os invariantes documentados em productUnits.js.
 *
 * Tambem expoe `unidadesToLegacyMirror` que monta os campos antigos
 * (unidade_principal, unidades_alternativas[], unidade_comercial_id, ...) a
 * partir da fonte canonica — esses sao recompostos a cada save pra manter
 * compatibilidade com leitores legados.
 * ============================================================================ */

import { normalizeUnitCode } from "./productUnits";

const MAX_UNIDADES = 5;

const SIGLA_NORMALIZE_MAP = {
  CAIXA: "CX",
  CAIXAS: "CX",
  "M²": "M2",
  "METRO QUADRADO": "M2",
  "METROS QUADRADOS": "M2",
  PEÇA: "PC",
  "PEÇAS": "PC",
  PECA: "PC",
  PECAS: "PC",
  UNIDADE: "UN",
  UNIDADES: "UN",
};

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Normaliza uma sigla pra forma canonica (CAIXA->CX, M²->M2, etc.). */
export function normalizeSigla(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return "";
  const noAccents = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (SIGLA_NORMALIZE_MAP[s]) return SIGLA_NORMALIZE_MAP[s];
  if (SIGLA_NORMALIZE_MAP[noAccents]) return SIGLA_NORMALIZE_MAP[noAccents];
  return s.replace("²", "2");
}

/** Constroi um objeto de unidade com defaults consistentes (NAO valida). */
export function makeUnidade(input = {}) {
  const adj = asNumber(input.ajuste_percentual, 0);
  const pctRaw = input.percentual_preco_vs_principal;
  const hasPct =
    Object.prototype.hasOwnProperty.call(input, "percentual_preco_vs_principal") &&
    pctRaw !== "" &&
    pctRaw != null;
  return {
    id: String(input.id || "").trim() || newId(),
    nome: typeof input.nome === "string" ? input.nome.trim() : "",
    sigla: normalizeSigla(input.sigla || input.unidade),
    fator_conversao: asNumber(input.fator_conversao, 1) || 1,
    fator_preco: asNumber(input.fator_preco, 1) || 1,
    ajuste_percentual: adj,
    preco_venda: asNumber(input.preco_venda, 0),
    ...(hasPct ? { percentual_preco_vs_principal: asNumber(pctRaw, 0) } : {}),
    is_principal: input.is_principal === true,
    is_comercial: input.is_comercial === true,
    ativo: input.ativo !== false,
  };
}

/**
 * Valida invariantes do array de unidades.
 *
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateUnidades(unidades) {
  const errors = [];
  if (!Array.isArray(unidades)) {
    return { ok: false, errors: ["O campo de unidades deve ser uma lista (array)."] };
  }
  const ativas = unidades.filter((u) => u?.ativo !== false);
  if (ativas.length === 0) {
    return { ok: false, errors: ["É necessário pelo menos uma unidade ativa no produto."] };
  }
  if (unidades.length > MAX_UNIDADES) {
    errors.push(`No máximo ${MAX_UNIDADES} unidades por produto (atual: ${unidades.length}).`);
  }

  const ids = new Set();
  const siglas = new Set();
  let countPrincipal = 0;
  let countComercial = 0;
  let principalFator1 = false;

  for (const u of unidades) {
    if (!u || typeof u !== "object") {
      errors.push("Há uma entrada inválida na lista de unidades.");
      continue;
    }
    const id = String(u.id || "").trim();
    if (!id) {
      errors.push("Cada unidade precisa de um id estável.");
    } else if (ids.has(id)) {
      errors.push(`Id de unidade duplicado: ${id}.`);
    } else {
      ids.add(id);
    }

    const sigla = normalizeSigla(u.sigla);
    if (!sigla) {
      errors.push(`Unidade ${id || "(sem id)"}: informe a sigla.`);
    } else if (u.ativo !== false) {
      if (siglas.has(sigla)) {
        errors.push(`Sigla duplicada entre unidades ativas: ${sigla}.`);
      } else {
        siglas.add(sigla);
      }
    }

    const fator = asNumber(u.fator_conversao, NaN);
    if (!Number.isFinite(fator) || fator <= 0) {
      errors.push(`Unidade ${sigla || id || "(?)"}: o fator de conversão deve ser maior que zero.`);
    }

    if (u.is_principal === true && u.ativo !== false) {
      countPrincipal++;
      if (fator === 1) principalFator1 = true;
    }
    if (u.is_comercial === true && u.ativo !== false) {
      countComercial++;
    }
  }

  if (countPrincipal !== 1) {
    errors.push(`Deve existir exatamente uma unidade base ativa (encontradas: ${countPrincipal}).`);
  } else if (!principalFator1) {
    errors.push("A unidade base deve ter fator de conversão igual a 1.");
  }
  if (countComercial !== 1) {
    errors.push(
      countComercial === 0
        ? "Marque uma unidade comercial ativa (a de vitrine não pode estar inativa ou sem correspondência)."
        : `Deve existir exatamente uma unidade comercial ativa (encontradas: ${countComercial}).`,
    );
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

/** Adiciona uma unidade nova ao array, garantindo `id` estavel. */
export function addUnidade(unidades, input = {}) {
  const arr = Array.isArray(unidades) ? [...unidades] : [];
  const novo = makeUnidade(input);
  if (arr.some((u) => u.id === novo.id)) novo.id = newId();
  arr.push(novo);
  return arr;
}

/** Aplica um patch parcial a uma unidade pelo id. */
export function updateUnidade(unidades, id, patch = {}) {
  if (!Array.isArray(unidades)) return [];
  return unidades.map((u) => {
    if (u?.id !== id) return u;
    const merged = { ...u, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, "sigla")) {
      merged.sigla = normalizeSigla(patch.sigla);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "fator_conversao")) {
      merged.fator_conversao = asNumber(patch.fator_conversao, u.fator_conversao) || u.fator_conversao;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "fator_preco")) {
      merged.fator_preco = asNumber(patch.fator_preco, u.fator_preco) || u.fator_preco;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "ajuste_percentual")) {
      merged.ajuste_percentual = asNumber(patch.ajuste_percentual, u.ajuste_percentual);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "preco_venda")) {
      merged.preco_venda = asNumber(patch.preco_venda, u.preco_venda);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "percentual_preco_vs_principal")) {
      if (patch.percentual_preco_vs_principal === "" || patch.percentual_preco_vs_principal == null) {
        delete merged.percentual_preco_vs_principal;
      } else {
        merged.percentual_preco_vs_principal = asNumber(patch.percentual_preco_vs_principal, 0);
      }
    }
    return merged;
  });
}

/** Remove uma unidade pelo id (hard delete). Para soft delete passe `ativo:false` em updateUnidade. */
export function removeUnidade(unidades, id) {
  if (!Array.isArray(unidades)) return [];
  return unidades.filter((u) => u?.id !== id);
}

/** Marca exatamente 1 unidade como is_principal. Tambem ajusta fator_conversao=1 nela. */
export function setUnidadePrincipal(unidades, id) {
  if (!Array.isArray(unidades)) return [];
  return unidades.map((u) => {
    if (u?.id === id) return { ...u, is_principal: true, fator_conversao: 1 };
    return u?.is_principal ? { ...u, is_principal: false } : u;
  });
}

/** Marca exatamente 1 unidade como is_comercial (a "sagrada"). */
export function setUnidadeComercial(unidades, id) {
  if (!Array.isArray(unidades)) return [];
  return unidades.map((u) => {
    if (u?.id === id) return { ...u, is_comercial: true };
    return u?.is_comercial ? { ...u, is_comercial: false } : u;
  });
}

/* --------------------------------------------------------------------------
 * Migracao: legado -> canonico
 * -------------------------------------------------------------------------- */

/** Extrai um fator de conversao do nome do produto (ex.: "(2,16M²/CX)"). */
function extractFatorFromName(...nomes) {
  for (const raw of nomes) {
    if (!raw) continue;
    const s = String(raw)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace("METRO QUADRADO", "M2").replace("M²", "M2")
      .replace(/CAIXAS?/g, "CX");
    const padroes = [
      /(\d+(?:[.,]\d+)?)\s*M2\s*[\/xX\s]*\s*CX/i,
      /CX\s*(\d+(?:[.,]\d+)?)\s*M2/i,
      /\(\s*(\d+(?:[.,]\d+)?)\s*M2\s*\)/i,
    ];
    for (const re of padroes) {
      const m = re.exec(s);
      if (m) {
        const v = Number(String(m[1]).replace(",", "."));
        if (Number.isFinite(v) && v > 1 && v < 100) {
          return Math.round(v * 10000) / 10000;
        }
      }
    }
  }
  return null;
}

/**
 * Migra `unidade_principal` + `unidades_alternativas[]` legados pra `unidades[]` canonico.
 *
 * - Se `produto.unidades` ja existe e nao esta vazio, retorna sem mudancas.
 * - Caso contrario, monta o array canonico com IDs estaveis e tenta corrigir
 *   typos historicos de `fator_conversao` da unidade CX comparando com o regex
 *   do nome do produto (resolve casos como Polar 4,67 -> 2,16).
 * - Define `is_comercial` baseado em `unidade_comercial_id` ou siglas legadas.
 *
 * @returns {{ unidades: Array, changed: boolean, fixes: string[], conflict: boolean }}
 */
export function migrateLegacyToUnidades(produto = {}) {
  if (Array.isArray(produto?.unidades) && produto.unidades.length > 0) {
    return { unidades: produto.unidades, changed: false, fixes: [], conflict: false };
  }

  const fixes = [];
  const principalSigla = normalizeSigla(produto?.unidade_principal || "UN") || "UN";
  const fatorNome = extractFatorFromName(
    produto?.nome,
    produto?.descricao,
    produto?.campo_hierarquico_1,
    produto?.campo_hierarquico_2,
    produto?.campo_hierarquico_3,
  );

  const principal = makeUnidade({
    id: "principal",
    nome: "Unidade base",
    sigla: principalSigla,
    fator_conversao: 1,
    fator_preco: 1,
    is_principal: true,
    is_comercial: false,
    ativo: true,
  });

  const alternativasInput = Array.isArray(produto?.unidades_alternativas)
    ? produto.unidades_alternativas
    : [];
  const alternativas = alternativasInput
    .filter((a) => a?.unidade)
    .map((a) => {
      const sigla = normalizeSigla(a.unidade);
      let fator = asNumber(a.fator_conversao, 1) || 1;
      if (fatorNome && sigla === "CX" && Math.abs(fator - fatorNome) > 0.01) {
        fixes.push(`unidade CX: fator ${fator} -> ${fatorNome} (corrigido pelo regex do nome)`);
        fator = fatorNome;
      }
      const mu = {
        id: a.id || newId(),
        nome: a.nome || a.rotulo || sigla,
        sigla,
        fator_conversao: fator,
        fator_preco: asNumber(a.fator_preco, 1) || 1,
        ajuste_percentual: asNumber(a.ajuste_percentual, 0),
        preco_venda: asNumber(a.preco_venda, 0),
        is_principal: false,
        is_comercial: false,
        ativo: a.ativo !== false,
      };
      if (
        Object.prototype.hasOwnProperty.call(a, "percentual_preco_vs_principal") &&
        a.percentual_preco_vs_principal != null &&
        a.percentual_preco_vs_principal !== ""
      ) {
        mu.percentual_preco_vs_principal = asNumber(a.percentual_preco_vs_principal, 0);
      }
      return makeUnidade(mu);
    });

  const unidades = [principal, ...alternativas];

  // Resolve a unidade comercial usando os campos legados.
  const comercialIdLegacy = String(produto?.unidade_comercial_id || "").trim();
  const comercialSiglaLegacy = normalizeSigla(
    produto?.unidade_apresentacao_default ||
    produto?.unidade_show_comercial ||
    principalSigla
  );

  let comercialAplicado = false;
  if (comercialIdLegacy === "primary" || comercialIdLegacy === "principal") {
    unidades[0].is_comercial = true;
    comercialAplicado = true;
  } else if (comercialIdLegacy) {
    const byId = unidades.find((u) => u.id === comercialIdLegacy);
    if (byId) {
      byId.is_comercial = true;
      comercialAplicado = true;
    }
  }
  if (!comercialAplicado && comercialSiglaLegacy) {
    const bySigla = unidades.find((u) => normalizeSigla(u.sigla) === comercialSiglaLegacy);
    if (bySigla) {
      bySigla.is_comercial = true;
      comercialAplicado = true;
    }
  }
  if (!comercialAplicado) {
    unidades[0].is_comercial = true;
    fixes.push("is_comercial fallback para a unidade principal (sem match nos campos legados)");
  }

  // Dedupe por sigla mantendo o primeiro (preserva principal).
  const seen = new Set();
  const deduped = [];
  for (const u of unidades) {
    const key = normalizeSigla(u.sigla);
    if (!key) continue;
    if (seen.has(key)) {
      fixes.push(`sigla duplicada removida: ${key}`);
      continue;
    }
    seen.add(key);
    deduped.push(u);
  }

  return { unidades: deduped, changed: true, fixes, conflict: false };
}

/* --------------------------------------------------------------------------
 * Espelho legado: canonico -> legado (recomposto a cada save)
 * -------------------------------------------------------------------------- */

/**
 * Se `unidades[]` for canónico e válido, devolve o espelho legado (incl. logística alinhada à comercial).
 * Base44 / leitores antigos por vezes gravam só parte dos campos — use isto no hydrate do formulário.
 */
export function tryLegacyMirrorFromCanonicalUnidades(unidades) {
  if (!Array.isArray(unidades) || unidades.length === 0) return null;
  const validation = validateUnidades(unidades);
  if (!validation.ok) return null;
  const legacyMirror = unidadesToLegacyMirror(unidades);
  const sigla = normalizeSigla(legacyMirror.unidade_show_comercial) || normalizeSigla(legacyMirror.unidade_apresentacao_default) || "";
  return {
    ...legacyMirror,
    unidade_show_logistica: sigla || legacyMirror.unidade_show_comercial || "",
  };
}

/** Monta os campos legados (`unidade_principal`, `unidades_alternativas[]`, ...)
 *  a partir do array canonico. NAO valida — chame `validateUnidades` antes. */
export function unidadesToLegacyMirror(unidades) {
  if (!Array.isArray(unidades) || unidades.length === 0) {
    return {
      unidade_principal: "UN",
      unidades_alternativas: [],
      unidade_apresentacao_default: "",
      unidade_show_comercial: "",
      unidade_comercial_id: "",
    };
  }
  const principal = unidades.find((u) => u?.is_principal && u?.ativo !== false) || unidades[0];
  const comercial = unidades.find((u) => u?.is_comercial && u?.ativo !== false) || principal;

  const alternativasLegacy = unidades
    .filter((u) => u && u.id !== principal.id)
    .map((u) => {
      const row = {
        id: u.id,
        nome: u.nome || "",
        unidade: normalizeSigla(u.sigla),
        fator_conversao: asNumber(u.fator_conversao, 1) || 1,
        fator_preco: asNumber(u.fator_preco, 1) || 1,
        ajuste_percentual: asNumber(u.ajuste_percentual, 0),
        preco_venda: asNumber(u.preco_venda, 0),
        rotulo: typeof u.nome === "string" && u.nome.trim() ? u.nome.trim() : normalizeSigla(u.sigla) || "",
        ativo: u.ativo !== false,
      };
      if (
        Object.prototype.hasOwnProperty.call(u, "percentual_preco_vs_principal") &&
        u.percentual_preco_vs_principal != null &&
        u.percentual_preco_vs_principal !== ""
      ) {
        row.percentual_preco_vs_principal = asNumber(u.percentual_preco_vs_principal, 0);
      }
      return row;
    });

  const principalSigla = normalizeSigla(principal?.sigla) || "UN";
  const comercialSigla = normalizeSigla(comercial?.sigla) || principalSigla;
  const comercialId = comercial && comercial.id !== principal.id
    ? comercial.id
    : "primary";

  return {
    unidade_principal: principalSigla,
    unidades_alternativas: alternativasLegacy,
    unidade_apresentacao_default: comercialSigla,
    unidade_show_comercial: comercialSigla,
    unidade_comercial_id: comercialId,
  };
}

/**
 * Aplica unidades canonicas a um produto, retornando o produto + espelho legado.
 * Esta e a UNICA forma de gravar unidades — ela valida invariantes e regrava
 * todos os campos correspondentes em uma so operacao.
 *
 * @returns {{ ok: boolean, produto: object, errors: string[] }}
 */
export function applyUnidadesToProduto(produto = {}, unidades) {
  const validation = validateUnidades(unidades);
  if (!validation.ok) {
    return { ok: false, produto, errors: validation.errors };
  }
  const legacyMirror = unidadesToLegacyMirror(unidades);
  return {
    ok: true,
    errors: [],
    produto: {
      ...produto,
      unidades,
      ...legacyMirror,
    },
  };
}
