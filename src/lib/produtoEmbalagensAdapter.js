/**
 * Ponte entre linhas `ProdutoEmbalagem` (até 3) e campos legados em `Produto`
 * usados por ProdutoFormCompleto / productUnitsCrud.
 */

import {
  makeUnidade,
  migrateLegacyToUnidades,
  normalizeSigla,
  unidadesToLegacyMirror,
  validateUnidades,
} from "@/lib/productUnitsCrud";
import { MAX_EMBALAGENS } from "@/lib/produtoEmbalagensEntity";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rowSigla(row) {
  return normalizeSigla(row?.sigla ?? row?.Sigla ?? row?.unidade ?? "");
}

function rowNome(row) {
  const n = row?.nome ?? row?.Nome;
  return typeof n === "string" ? n.trim() : "";
}

/** Constrói `unidades[]` canónico a partir das linhas da entidade auxiliar. */
export function embalagensRowsToCanonicalUnidades(rows) {
  const sorted = [...(rows || [])]
    .filter((r) => r && r.ativo !== false)
    .sort((a, b) => (Number(a?.ordem) || 0) - (Number(b?.ordem) || 0))
    .slice(0, MAX_EMBALAGENS);

  const out = [];
  for (const row of sorted) {
    const sigla = rowSigla(row);
    if (!sigla) continue;
    const pctRaw = row?.percentual_preco_vs_principal ?? row?.PercentualPrecoVsPrincipal;
    const hasPct =
      Object.prototype.hasOwnProperty.call(row, "percentual_preco_vs_principal") ||
      Object.prototype.hasOwnProperty.call(row, "PercentualPrecoVsPrincipal");
    const id = String(row?.id ?? row?.Id ?? "").trim() || undefined;
    const mu = {
      id,
      nome: rowNome(row) || sigla,
      sigla,
      fator_conversao: asNumber(row?.fator_conversao ?? row?.FatorConversao, 1) || 1,
      fator_preco: asNumber(row?.fator_preco ?? row?.FatorPreco, 1) || 1,
      ajuste_percentual: asNumber(row?.ajuste_percentual ?? row?.AjustePercentual, 0),
      preco_venda: asNumber(row?.preco_venda ?? row?.PrecoVenda, 0),
      is_principal: row?.is_principal === true || row?.IsPrincipal === true,
      is_comercial: row?.is_comercial === true || row?.IsComercial === true,
      ativo: row?.ativo !== false && row?.Ativo !== false,
    };
    if (hasPct && pctRaw != null && pctRaw !== "") {
      mu.percentual_preco_vs_principal = asNumber(pctRaw, 0);
    }
    out.push(makeUnidade(mu));
  }
  return out;
}

/**
 * Patch para mesclar no objeto `Produto` antes do hydrate do formulário.
 * Inclui `unidades[]` coerente quando a validação passa.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Record<string, unknown>}
 */
export function embalagensRowsToLegacyProdutoPatch(rows) {
  const unidades = embalagensRowsToCanonicalUnidades(rows);
  const validation = validateUnidades(unidades);
  if (!validation.ok || unidades.length === 0) {
    return {};
  }
  const legacyMirror = unidadesToLegacyMirror(unidades);
  const siglaCom =
    normalizeSigla(legacyMirror.unidade_show_comercial) ||
    normalizeSigla(legacyMirror.unidade_apresentacao_default) ||
    "";
  return {
    ...legacyMirror,
    unidade_show_logistica: siglaCom || legacyMirror.unidade_show_comercial || "",
    unidades,
  };
}

/**
 * Escolhe até 3 unidades canónicas: sempre inclui principal e unidade comercial;
 * preenche com demais na ordem do array.
 * @param {Array<Record<string, unknown>>} unidades
 */
export function pickUnidadesForEmbalagemEntity(unidades) {
  if (!Array.isArray(unidades) || unidades.length === 0) return [];
  const principal = unidades.find((u) => u?.is_principal === true) || unidades[0];
  const commercial = unidades.find((u) => u?.is_comercial === true) || principal;
  const picked = [];
  const pushU = (u) => {
    if (!u || picked.length >= MAX_EMBALAGENS) return;
    if (picked.some((p) => p.id === u.id)) return;
    picked.push(u);
  };
  pushU(principal);
  pushU(commercial);
  for (const u of unidades) {
    pushU(u);
    if (picked.length >= MAX_EMBALAGENS) break;
  }
  return picked;
}

/**
 * Converte `Produto` (com `unidades[]` e/ou legado) em payloads de criação para `ProdutoEmbalagem`.
 *
 * @param {Record<string, unknown>} produto
 * @returns {Array<Record<string, unknown>>}
 */
export function legacyProdutoToEmbalagensRows(produto = {}) {
  let unidades = Array.isArray(produto.unidades) && produto.unidades.length ? [...produto.unidades] : null;
  if (!unidades) {
    unidades = migrateLegacyToUnidades(produto).unidades;
  }
  const picked = pickUnidadesForEmbalagemEntity(unidades);
  return picked.map((u, i) => {
    const sigla = normalizeSigla(u.sigla);
    const payload = {
      sigla,
      nome: (typeof u.nome === "string" && u.nome.trim()) || sigla,
      fator_conversao: asNumber(u.fator_conversao, 1) || 1,
      ordem: i,
      is_principal: u.is_principal === true,
      is_comercial: u.is_comercial === true,
      ativo: u.ativo !== false,
    };
    if (
      Object.prototype.hasOwnProperty.call(u, "percentual_preco_vs_principal") &&
      u.percentual_preco_vs_principal != null &&
      u.percentual_preco_vs_principal !== ""
    ) {
      payload.percentual_preco_vs_principal = asNumber(u.percentual_preco_vs_principal, 0);
    }
    return payload;
  });
}
