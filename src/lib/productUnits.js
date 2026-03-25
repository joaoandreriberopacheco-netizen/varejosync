export function hasAlternativeUnits(product) {
  return Array.isArray(product?.unidades_alternativas) && product.unidades_alternativas.some((item) => item?.unidade && item.ativo !== false);
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAlternativeUnits(product) {
  return (Array.isArray(product?.unidades_alternativas) ? product.unidades_alternativas : [])
    .filter((item) => item?.unidade && item.ativo !== false)
    .map((item) => ({
      unidade: String(item.unidade).trim().toUpperCase(),
      fator_conversao: normalizeNumber(item.fator_conversao, 1),
      preco_venda: normalizeNumber(item.preco_venda, 0),
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
  return `${produtoId || 'sem-produto'}::${(unidadeMedida || 'UN').toUpperCase()}`;
}

export function buildSaleUnitOptions(product, priceMultiplier = 1) {
  const unidadePrincipal = (product?.unidade_principal || 'UN').toUpperCase();
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
    valor_unitario: (item.preco_venda > 0 ? item.preco_venda : precoBase * item.fator_conversao) * normalizeNumber(priceMultiplier, 1),
    is_primary: false,
  }));

  return dedupeUnits([principal, ...alternatives]);
}

export function buildPurchaseUnitOptions(product) {
  const unidadePrincipal = (product?.unidade_principal || 'UN').toUpperCase();
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
  }));

  return dedupeUnits([principal, ...alternatives]);
}

export function calculateBaseQuantity(quantity, fatorConversao = 1) {
  return normalizeNumber(quantity, 0) * normalizeNumber(fatorConversao, 1);
}

export function formatUnitConversion(option, unidadePrincipal) {
  const fator = normalizeNumber(option?.fator_conversao, 1);
  const principal = (unidadePrincipal || 'UN').toUpperCase();
  if (fator === 1) return `1 ${option?.unidade || principal}`;
  return `1 ${option?.unidade || principal} = ${fator} ${principal}`;
}