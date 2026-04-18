export function hasAlternativeUnits(product) {
  return Array.isArray(product?.unidades_alternativas) && product.unidades_alternativas.some((item) => item?.unidade && item.ativo !== false);
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const unidadePrincipal = (product?.unidade_principal || "UN").toUpperCase();
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
  const pref = String(product?.unidade_apresentacao_default || "").trim().toUpperCase();
  if (pref) {
    const match = options.find((o) => o.unidade === pref);
    if (match) return match;
  }
  return options[0] || null;
}

export function buildPurchaseUnitOptions(product) {
  const unidadePrincipal = (product?.unidade_principal || "UN").toUpperCase();
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
  const pref = String(product?.unidade_apresentacao_default || "").trim().toUpperCase();
  if (pref) {
    const match = options.find((o) => o.unidade === pref);
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
  const estoque = normalizeNumber(produto?.estoque_atual, 0);
  const up = (produto?.unidade_principal || "UN").toUpperCase();
  const pref = String(produto?.unidade_apresentacao_default || "").trim().toUpperCase();
  if (!pref || pref === up) return null;
  const alt = normalizeAlternativeUnits(produto).find((a) => a.unidade === pref);
  if (!alt || !alt.fator_conversao) return null;
  const fator = normalizeNumber(alt.fator_conversao, 1);
  if (fator <= 0) return null;
  const qtd = estoque / fator;
  return { sigla: pref, quantidade: qtd, rotulo: alt.rotulo };
}
