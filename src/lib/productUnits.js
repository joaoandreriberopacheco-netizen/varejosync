export function hasAlternativeUnits(product) {
  return Array.isArray(product?.unidades_alternativas) && product.unidades_alternativas.some((item) => item?.unidade && item.ativo !== false);
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeUnitCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function isShowUnitEnabled(product) {
  if (typeof product?.unidade_show_ativa === "boolean") return product.unidade_show_ativa;
  return true;
}

export function normalizeAlternativeUnits(product) {
  return (Array.isArray(product?.unidades_alternativas) ? product.unidades_alternativas : [])
    .filter((item) => item?.unidade && item.ativo !== false)
    .map((item) => ({
      unidade: String(item.unidade).trim().toUpperCase(),
      fator_conversao: normalizeNumber(item.fator_conversao, 1),
      preco_venda: normalizeNumber(item.preco_venda, 0),
      rotulo: typeof item.rotulo === "string" ? item.rotulo.trim() : (item.rotulo_comercial ? String(item.rotulo_comercial).trim() : ""),
      ajuste_percentual: normalizeNumber(item.ajuste_percentual, 0),
      ativo: item.ativo !== false,
    }));
}

/** Unidade base (fator 1): preferir alternativa com fator 1 (legado); senão `unidade_principal` (contrato Emb.1 / formulário). */
export function resolvePrimaryFromFactorOne(product, fallbackUnit = "UN") {
  const alternativas = normalizeAlternativeUnits(product);
  const fatorUm = alternativas.filter((item) => normalizeNumber(item.fator_conversao, 0) === 1);
  const principalAtual = normalizeUnitCode(product?.unidade_principal);

  if (fatorUm.length === 1) return fatorUm[0].unidade;
  if (fatorUm.length > 1) {
    const matchAtual = fatorUm.find((item) => item.unidade === principalAtual);
    return (matchAtual?.unidade || fatorUm[0].unidade);
  }

  return principalAtual || normalizeUnitCode(fallbackUnit) || "UN";
}

export function buildLegacyUnitBackfillPatch(product) {
  const alternativas = normalizeAlternativeUnits(product);
  const fatorUm = alternativas.filter((item) => normalizeNumber(item?.fator_conversao, 0) === 1);
  if (fatorUm.length !== 1) {
    return {
      hasChanges: false,
      conflict: true,
      reason: fatorUm.length === 0 ? "missing_factor_one" : "multiple_factor_one",
      patch: null,
    };
  }

  const principal = normalizeUnitCode(fatorUm[0].unidade || product?.unidade_principal || "UN") || "UN";
  const validUnits = new Set([principal, ...alternativas.map((item) => normalizeUnitCode(item?.unidade)).filter(Boolean)]);
  const showLogisticoLegado = normalizeUnitCode(product?.unidade_show_logistica);
  // Regra de tradução legada: quando há fator 1 intencional, ele substitui a unidade legada.
  const pdvResolvida = principal;
  const showComercialResolvida = pdvResolvida;
  const showLogisticoResolvida = validUnits.has(showLogisticoLegado) ? showLogisticoLegado : pdvResolvida;

  const patch = {
    unidade_principal: principal,
    unidade_apresentacao_default: pdvResolvida,
    unidade_show_comercial: showComercialResolvida,
    unidade_show_logistica: showLogisticoResolvida,
    migracao_unidades_legacy_v2: true,
    migracao_unidades_data: new Date().toISOString(),
  };

  const hasChanges =
    normalizeUnitCode(product?.unidade_principal) !== patch.unidade_principal ||
    normalizeUnitCode(product?.unidade_apresentacao_default) !== patch.unidade_apresentacao_default ||
    normalizeUnitCode(product?.unidade_show_comercial) !== patch.unidade_show_comercial ||
    normalizeUnitCode(product?.unidade_show_logistica) !== patch.unidade_show_logistica ||
    product?.migracao_unidades_legacy_v2 !== true;

  return {
    hasChanges,
    conflict: false,
    reason: hasChanges ? "needs_update" : "already_consistent",
    patch: hasChanges ? patch : null,
  };
}

function dedupeUnits(units) {
  const seen = new Set();
  return units.filter((item) => {
    const key = item.unidade;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getItemUnitKey(produtoId, unidadeMedida) {
  return `${produtoId || "sem-produto"}::${(unidadeMedida || "UN").toUpperCase()}`;
}

function saleUnitPriceFromAlternative(precoBase, item, priceMultiplier) {
  const mult = normalizeNumber(priceMultiplier, 1);
  const fator = normalizeNumber(item.fator_conversao, 1);
  if (item.preco_venda > 0) {
    return item.preco_venda * mult;
  }
  const adj = normalizeNumber(item.ajuste_percentual, 0);
  return precoBase * fator * (1 + adj / 100) * mult;
}

export function buildSaleUnitOptions(product, priceMultiplier = 1) {
  const unidadePrincipal = resolvePrimaryFromFactorOne(product, "UN");
  const precoBase = normalizeNumber(product?.preco_venda_padrao, 0);
  const principal = {
    unidade: unidadePrincipal,
    fator_conversao: 1,
    valor_unitario: precoBase * normalizeNumber(priceMultiplier, 1),
    is_primary: true,
  };

  const alternatives = normalizeAlternativeUnits(product).map((item) => ({
    unidade: item.unidade,
    fator_conversao: item.fator_conversao,
    valor_unitario: saleUnitPriceFromAlternative(precoBase, item, priceMultiplier),
    is_primary: false,
    rotulo: item.rotulo || "",
    ajuste_percentual: item.ajuste_percentual,
  }));

  return dedupeUnits([principal, ...alternatives]);
}

export function pickDefaultSaleUnit(product, priceMultiplier = 1) {
  const options = buildSaleUnitOptions(product, priceMultiplier);
  const principalResolvida = resolvePrimaryFromFactorOne(product, options[0]?.unidade || "UN");
  if (!isShowUnitEnabled(product)) {
    return options.find((o) => o.unidade === principalResolvida) || options[0] || null;
  }
  const prioridades = [
    product?.unidade_apresentacao_default,
    product?.unidade_show_comercial,
    principalResolvida,
  ];
  for (const pref of prioridades) {
    const normalized = String(pref || "").trim().toUpperCase();
    if (!normalized) continue;
    const match = options.find((o) => o.unidade === normalized);
    if (match) return match;
  }
  return options[0] || null;
}

export function resolveCommercialUnit(product, fallbackUnit = "UN") {
  const options = buildSaleUnitOptions(product);
  if (!options.length) return normalizeUnitCode(fallbackUnit) || "UN";
  const principalResolvida = resolvePrimaryFromFactorOne(product, options[0]?.unidade || fallbackUnit);
  if (!isShowUnitEnabled(product)) {
    return principalResolvida || normalizeUnitCode(fallbackUnit) || "UN";
  }
  const validUnits = new Set(options.map((option) => option.unidade));
  const priorities = [
    product?.unidade_apresentacao_default,
    product?.unidade_show_comercial,
    principalResolvida,
    fallbackUnit,
  ];
  for (const priority of priorities) {
    const normalized = normalizeUnitCode(priority);
    if (normalized && validUnits.has(normalized)) return normalized;
  }
  return options[0]?.unidade || normalizeUnitCode(fallbackUnit) || "UN";
}

export function buildPurchaseUnitOptions(product) {
  const unidadePrincipal = resolvePrimaryFromFactorOne(product, "UN");
  const custoBase = normalizeNumber(product?.valor_compra, 0);
  const principal = {
    unidade: unidadePrincipal,
    fator_conversao: 1,
    valor_unitario: custoBase,
    is_primary: true,
  };

  const alternatives = normalizeAlternativeUnits(product).map((item) => ({
    unidade: item.unidade,
    fator_conversao: item.fator_conversao,
    valor_unitario: custoBase * item.fator_conversao,
    is_primary: false,
    rotulo: item.rotulo || "",
  }));

  return dedupeUnits([principal, ...alternatives]);
}

export function pickDefaultPurchaseUnit(product) {
  const options = buildPurchaseUnitOptions(product);
  const principalResolvida = resolvePrimaryFromFactorOne(product, options[0]?.unidade || "UN");
  if (!isShowUnitEnabled(product)) {
    return options.find((o) => o.unidade === principalResolvida) || options[0] || null;
  }
  const prioridades = [
    product?.unidade_apresentacao_default,
    product?.unidade_show_comercial,
    principalResolvida,
  ];
  for (const pref of prioridades) {
    const normalized = String(pref || "").trim().toUpperCase();
    if (!normalized) continue;
    const match = options.find((o) => o.unidade === normalized);
    if (match) return match;
  }
  return options[0] || null;
}

export function calculateBaseQuantity(quantity, fatorConversao = 1) {
  return normalizeNumber(quantity, 0) * normalizeNumber(fatorConversao, 1);
}

export function formatUnitConversion(option, unidadePrincipal) {
  const fator = normalizeNumber(option?.fator_conversao, 1);
  const principal = (unidadePrincipal || "UN").toUpperCase();
  if (fator === 1) return `1 ${option?.unidade || principal}`;
  return `1 ${option?.unidade || principal} = ${fator} ${principal}`;
}

export function formatEstoqueApresentacao(produto) {
  if (!isShowUnitEnabled(produto)) return null;
  const estoque = normalizeNumber(produto?.estoque_atual, 0);
  const up = resolvePrimaryFromFactorOne(produto, "UN");
  const alternativas = normalizeAlternativeUnits(produto);
  const pref = resolveCommercialUnit(produto, up);
  if (!pref || pref === up) return null;
  const alt = alternativas.find((a) => a.unidade === pref);
  if (!alt || !alt.fator_conversao) return null;
  const fator = normalizeNumber(alt.fator_conversao, 1);
  if (fator <= 0) return null;
  const qtd = estoque / fator;
  return { sigla: pref, quantidade: qtd, rotulo: alt.rotulo };
}

export function resolveCommercialDisplay(product, quantityBase = 0, fallbackUnit = "UN") {
  if (!isShowUnitEnabled(product)) {
    const unidadeLegada = resolvePrimaryFromFactorOne(product, fallbackUnit);
    return { unidade: unidadeLegada, fator_conversao: 1, quantidade: normalizeNumber(quantityBase, 0), option: null };
  }
  const unidade = resolveCommercialUnit(product, fallbackUnit);
  const purchaseOptions = buildPurchaseUnitOptions(product);
  const option = purchaseOptions.find((item) => item.unidade === unidade) || purchaseOptions[0] || null;
  const fator = normalizeNumber(option?.fator_conversao, 1) || 1;
  const quantidade = fator > 0 ? normalizeNumber(quantityBase, 0) / fator : normalizeNumber(quantityBase, 0);
  return { unidade, fator_conversao: fator, quantidade, option };
}

export function normalizePurchaseItemToCommercial(product, item = {}) {
  const quantidadeInput = normalizeNumber(item.quantidade, 0);
  const fatorInput = normalizeNumber(item.fator_conversao, 1) || 1;
  const quantidadeBaseInformada = normalizeNumber(item.quantidade_base, NaN);
  const quantidadeBase = Number.isFinite(quantidadeBaseInformada)
    ? quantidadeBaseInformada
    : calculateBaseQuantity(quantidadeInput, fatorInput);
  const display = resolveCommercialDisplay(product, quantidadeBase, item.unidade_medida || product?.unidade_principal || "UN");
  const quantidadeComercial = normalizeNumber(display.quantidade, 0);
  const totalInformado = normalizeNumber(item.total, NaN);
  const unitInput = normalizeNumber(item.custo_unitario, 0);
  const totalEconomico = Number.isFinite(totalInformado) ? totalInformado : (quantidadeInput * unitInput);
  const custoUnitarioComercial = quantidadeComercial > 0
    ? (totalEconomico / quantidadeComercial)
    : (unitInput * normalizeNumber(display.fator_conversao, 1));

  return {
    ...item,
    unidade_medida: display.unidade || item.unidade_medida || product?.unidade_principal || "UN",
    fator_conversao: normalizeNumber(display.fator_conversao, 1) || 1,
    quantidade: quantidadeComercial,
    quantidade_base: quantidadeBase,
    custo_unitario: custoUnitarioComercial,
  };
}

export function resolveBoatLogisticsUnit(product, fallbackUnit = "UN") {
  const options = buildSaleUnitOptions(product);
  if (!options.length) {
    return normalizeUnitCode(fallbackUnit) || "UN";
  }
  const principalResolvida = resolvePrimaryFromFactorOne(product, options[0]?.unidade || fallbackUnit);

  const validUnits = new Set(options.map((option) => option.unidade));
  const priorities = [
    product?.unidade_show_logistica,
    product?.unidade_apresentacao_default,
    product?.unidade_show_comercial,
    principalResolvida,
    fallbackUnit,
  ];

  for (const priority of priorities) {
    const normalized = normalizeUnitCode(priority);
    if (normalized && validUnits.has(normalized)) {
      return normalized;
    }
  }

  const principal = normalizeUnitCode(principalResolvida);
  if (principal && validUnits.has(principal)) return principal;
  return options[0]?.unidade || normalizeUnitCode(fallbackUnit) || "UN";
}
