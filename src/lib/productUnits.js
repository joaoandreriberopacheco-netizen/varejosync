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

const MAX_ALTERNATIVE_UNITS = 5;

function normalizeAlternativeUnitRow(item = {}) {
  const unidade = String(item.unidade || "").trim().toUpperCase();
  const fatorConversao = normalizeNumber(item.fator_conversao, 1);
  const ajustePercentual = normalizeNumber(item.ajuste_percentual, 0);
  const fatorPrecoRaw = normalizeNumber(item.fator_preco, 0);
  return {
    id: String(item.id || "").trim() || crypto.randomUUID(),
    nome: typeof item.nome === "string" ? item.nome.trim() : "",
    unidade,
    fator_conversao: fatorConversao,
    fator_preco: fatorPrecoRaw > 0 ? fatorPrecoRaw : (1 + (ajustePercentual / 100)),
    preco_venda: normalizeNumber(item.preco_venda, 0),
    rotulo: typeof item.rotulo === "string" ? item.rotulo.trim() : (item.rotulo_comercial ? String(item.rotulo_comercial).trim() : ""),
    ajuste_percentual: ajustePercentual,
    ativo: item.ativo !== false,
  };
}

export function isShowUnitEnabled(product) {
  if (typeof product?.unidade_show_ativa === "boolean") return product.unidade_show_ativa;
  return true;
}

export function normalizeAlternativeUnits(product) {
  return (Array.isArray(product?.unidades_alternativas) ? product.unidades_alternativas : [])
    .slice(0, MAX_ALTERNATIVE_UNITS)
    .filter((item) => item?.unidade && item.ativo !== false)
    .map((item) => normalizeAlternativeUnitRow(item));
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
  const fatorPreco = normalizeNumber(item.fator_preco, 0);
  if (fatorPreco > 0) return precoBase * fator * fatorPreco * mult;
  const adj = normalizeNumber(item.ajuste_percentual, 0);
  return precoBase * fator * (1 + adj / 100) * mult;
}

export function buildSaleUnitOptions(product, priceMultiplier = 1) {
  const unidadePrincipal = resolvePrimaryFromFactorOne(product, "UN");
  const precoBase = normalizeNumber(product?.preco_venda_padrao, 0);
  const principal = {
    id: "primary",
    nome: "Unidade base",
    unidade: unidadePrincipal,
    fator_conversao: 1,
    valor_unitario: precoBase * normalizeNumber(priceMultiplier, 1),
    is_primary: true,
  };

  const alternatives = normalizeAlternativeUnits(product).map((item) => ({
    id: item.id,
    nome: item.nome || item.rotulo || item.unidade,
    unidade: item.unidade,
    fator_conversao: item.fator_conversao,
    valor_unitario: saleUnitPriceFromAlternative(precoBase, item, priceMultiplier),
    is_primary: false,
    rotulo: item.rotulo || "",
    ajuste_percentual: item.ajuste_percentual,
    fator_preco: item.fator_preco,
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
  const comercialId = String(product?.unidade_comercial_id || "").trim();
  if (comercialId) {
    const byId = options.find((option) => String(option.id || "") === comercialId);
    if (byId?.unidade) return byId.unidade;
  }
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
    id: "primary",
    nome: "Unidade base",
    unidade: unidadePrincipal,
    fator_conversao: 1,
    valor_unitario: custoBase,
    is_primary: true,
  };

  const alternatives = normalizeAlternativeUnits(product).map((item) => ({
    id: item.id,
    nome: item.nome || item.rotulo || item.unidade,
    unidade: item.unidade,
    fator_conversao: item.fator_conversao,
    valor_unitario: custoBase * item.fator_conversao * normalizeNumber(item.fator_preco, 1),
    is_primary: false,
    rotulo: item.rotulo || "",
    fator_preco: item.fator_preco,
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

/**
 * Marca o item como canônico fator-1 e popula os snapshots auxiliares.
 *
 * Sob o novo contrato, o valor unitário (`custo_unitario` / `preco_unitario_praticado`) **já é fator-1**,
 * então `*_base` é alias do canônico e `*_apresentacao` é o valor já em unidade comercial (× fator).
 * Não dividimos mais por fator — fazer isso destruía itens entrados em fator-1 (legado).
 */
export function normalizeItemToCanonicalFactorOne(item = {}, axisPrefix = "custo") {
  const fator = normalizeNumber(item?.fator_conversao, 1) || 1;
  const quantidade = normalizeNumber(item?.quantidade, 0);
  const quantidadeBase = normalizeNumber(item?.quantidade_base, NaN);
  const quantidadeBaseFinal = Number.isFinite(quantidadeBase) ? quantidadeBase : (quantidade * fator);

  const unitField = axisPrefix === "preco" ? "preco_unitario_praticado" : "custo_unitario";
  const finalField = axisPrefix === "preco" ? "preco_unitario_praticado" : "custo_final_unitario";
  const unitVal = normalizeNumber(item?.[unitField], 0);
  const finalVal = normalizeNumber(item?.[finalField], unitVal);

  const unitApresentacao = unitVal * fator;
  const finalApresentacao = finalVal * fator;

  const payload = {
    ...item,
    preco_eixo: "FATOR_1",
    unidade_apresentacao: item?.unidade_apresentacao || item?.unidade_medida || "UN",
    quantidade_base: quantidadeBaseFinal,
  };

  if (axisPrefix === "preco") {
    payload.preco_unitario_base = unitVal;
    payload.preco_unitario_apresentacao = unitApresentacao;
  } else {
    payload.custo_unitario_base = unitVal;
    payload.custo_final_unitario_base = finalVal;
    payload.custo_unitario_apresentacao = unitApresentacao;
    payload.custo_final_unitario_apresentacao = finalApresentacao;
  }
  return payload;
}

export function formatUnitConversion(option, unidadePrincipal) {
  const fator = normalizeNumber(option?.fator_conversao, 1);
  const principal = (unidadePrincipal || "UN").toUpperCase();
  if (fator === 1) return `1 ${option?.unidade || principal}`;
  return `1 ${option?.unidade || principal} = ${fator} ${principal}`;
}

/**
 * Rótulos consistentes para colunas de catálogo: unidade base (fator 1) vs unidade comercial (PDV).
 * Usa as mesmas regras que `resolveCommercialUnit` / `formatEstoqueApresentacao`.
 */
export function getCatalogUnitLabels(product) {
  const base = resolvePrimaryFromFactorOne(product, product?.unidade_principal || "UN");
  const comercial = resolveCommercialUnit(product, base);
  const same =
    normalizeUnitCode(base) === normalizeUnitCode(comercial) || !isShowUnitEnabled(product);
  return { unidadeBase: base, unidadeComercial: comercial, mostramMesma: same };
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

/**
 * Contrato canônico: o item da linha do pedido é sempre persistido em **fator-1**:
 *   - `quantidade` continua na unidade comercial (CX/CT/etc.) só pra UI;
 *   - `quantidade_base = quantidade × fator_conversao` (m²/kg/etc., sempre fator-1);
 *   - `custo_unitario` é R$/[unidade base do produto] = fator-1, sem conversão escondida;
 *   - `custo_unitario_apresentacao = custo_unitario × fator_conversao` é só um snapshot p/ UI mostrar em comercial.
 *
 * Por que tratar a entrada do usuário como fator-1: o catálogo do produto guarda `valor_compra` em fator-1
 * (R$/[unidade principal]), e é esse valor que pré-preenche `custo_unitario` no formulário. Mantemos o eixo.
 */
export function normalizePurchaseItemToCommercial(product, item = {}) {
  const quantidadeInput = normalizeNumber(item.quantidade, 0);
  const fatorInput = normalizeNumber(item.fator_conversao, 1) || 1;
  const quantidadeBaseInformada = normalizeNumber(item.quantidade_base, NaN);
  const quantidadeBase = Number.isFinite(quantidadeBaseInformada)
    ? quantidadeBaseInformada
    : calculateBaseQuantity(quantidadeInput, fatorInput);
  const display = resolveCommercialDisplay(product, quantidadeBase, item.unidade_medida || product?.unidade_principal || "UN");
  const quantidadeComercial = normalizeNumber(display.quantidade, 0);
  const fatorDisplay = normalizeNumber(display.fator_conversao, 1) || 1;

  const custoUnitarioFator1 = normalizeNumber(item.custo_unitario, 0);
  const custoFinalUnitarioInput = normalizeNumber(item.custo_final_unitario, NaN);
  const custoFinalUnitarioFator1 = Number.isFinite(custoFinalUnitarioInput) ? custoFinalUnitarioInput : custoUnitarioFator1;
  const custoUnitarioApresentacao = custoUnitarioFator1 * fatorDisplay;
  const custoFinalUnitarioApresentacao = custoFinalUnitarioFator1 * fatorDisplay;

  return {
    ...item,
    unidade_medida: display.unidade || item.unidade_medida || product?.unidade_principal || "UN",
    fator_conversao: fatorDisplay,
    quantidade: quantidadeComercial,
    quantidade_base: quantidadeBase,
    custo_unitario: custoUnitarioFator1,
    custo_final_unitario: custoFinalUnitarioFator1,
    preco_eixo: "FATOR_1",
    unidade_apresentacao: display.unidade || item.unidade_medida || product?.unidade_principal || "UN",
    // `*_base` são alias do canônico (mantidos para compat com leitores antigos).
    custo_unitario_base: custoUnitarioFator1,
    custo_final_unitario_base: custoFinalUnitarioFator1,
    // `*_apresentacao` é o valor já convertido p/ unidade comercial (use só em UI/relatório).
    custo_unitario_apresentacao: custoUnitarioApresentacao,
    custo_final_unitario_apresentacao: custoFinalUnitarioApresentacao,
  };
}

/* ============================================================================
 * Schema canonico do `Produto.unidades[]` (a partir desta refatoracao)
 * ----------------------------------------------------------------------------
 * Antes: dados de unidades viviam em 4 lugares diferentes (`unidade_principal`,
 * `unidades_alternativas[]`, `unidade_comercial_id`, `unidade_apresentacao_default`).
 * Cada referencia usava string match (sigla/nome) e qualquer typo orfanizava linhas
 * de pedido — foi essa pilha que motivou esta refatoracao.
 *
 * Agora `Produto.unidades[]` e o array canonico, com IDs estaveis. Os campos
 * legados continuam mantidos como espelho (recomposto a cada save) ate que todos
 * os consumidores migrem.
 *
 * Forma de cada unidade:
 *   {
 *     id:              string   // UUID estavel; NUNCA mudar apos criada
 *     nome:            string   // rotulo livre ("Caixa de 2,16 m²")
 *     sigla:           string   // codigo curto, normalizado ("CX")
 *     fator_conversao: number   // qty na sigla -> qty em fator-1; 1 se for a base
 *     fator_preco:     number   // multiplicador opcional de preco; 1 se neutro
 *     is_principal:    boolean  // EXATAMENTE 1 unidade no array; tem fator_conversao=1
 *     is_comercial:    boolean  // EXATAMENTE 1 unidade no array; e a "sagrada" pra UI/relatorios
 *     ativo:           boolean  // false = soft delete
 *   }
 *
 * Invariantes (validados em `validateUnidades` do productUnitsCrud.js):
 *   1. 1 <= unidades.length <= 5
 *   2. todas com `id` nao vazio e unico
 *   3. siglas unicas (apos normalizacao)
 *   4. fator_conversao > 0
 *   5. exatamente 1 com `is_principal = true`, e essa tem fator_conversao = 1
 *   6. exatamente 1 com `is_comercial = true`
 *
 * Espelho legado (regravado a cada save canonico):
 *   - `unidade_principal`         := unidades[is_principal].sigla
 *   - `unidade_apresentacao_default`/`unidade_show_comercial` := unidades[is_comercial].sigla
 *   - `unidade_comercial_id`      := unidades[is_comercial].id
 *   - `unidades_alternativas[]`   := unidades.filter(!is_principal) mapeadas pro formato antigo
 * ============================================================================ */

/** Le o array canonico, caindo pra reconstrucao do legado se ainda nao migrado. */
export function getUnidadesCanonical(produto = {}) {
  if (Array.isArray(produto?.unidades) && produto.unidades.length > 0) {
    return produto.unidades;
  }
  return null;
}

/** Resolve a unidade `is_principal` (fator-1). Cai pra `unidade_principal` se ainda nao migrado. */
export function getUnidadePrincipalCanonical(produto = {}) {
  const canonical = getUnidadesCanonical(produto);
  if (canonical) {
    return canonical.find((u) => u?.is_principal && u?.ativo !== false) || canonical[0] || null;
  }
  return {
    id: "principal",
    nome: "Unidade base",
    sigla: normalizeUnitCode(produto?.unidade_principal) || "UN",
    fator_conversao: 1,
    fator_preco: 1,
    is_principal: true,
    is_comercial: false,
    ativo: true,
  };
}

/** Resolve a unidade `is_comercial` (sagrada). Cai pra heuristica legada se nao migrado. */
export function getUnidadeComercialCanonical(produto = {}) {
  const canonical = getUnidadesCanonical(produto);
  if (canonical) {
    const explicita = canonical.find((u) => u?.is_comercial && u?.ativo !== false);
    if (explicita) return explicita;
    return canonical.find((u) => u?.is_principal) || canonical[0] || null;
  }
  const sigla = resolveCommercialUnit(produto, getUnidadePrincipalCanonical(produto)?.sigla || "UN");
  const principal = getUnidadePrincipalCanonical(produto);
  if (sigla === principal?.sigla) return principal;
  const alt = normalizeAlternativeUnits(produto).find((a) => a.unidade === sigla);
  if (!alt) return principal;
  return {
    id: alt.id,
    nome: alt.nome || alt.unidade,
    sigla: alt.unidade,
    fator_conversao: alt.fator_conversao,
    fator_preco: alt.fator_preco || 1,
    is_principal: false,
    is_comercial: true,
    ativo: alt.ativo,
  };
}

/** Busca uma unidade canonica pelo `id` estavel. */
export function getUnidadeByIdCanonical(produto = {}, unidadeId = "") {
  if (!unidadeId) return null;
  const canonical = getUnidadesCanonical(produto);
  if (canonical) return canonical.find((u) => u?.id === unidadeId) || null;
  if (unidadeId === "primary" || unidadeId === "principal") {
    return getUnidadePrincipalCanonical(produto);
  }
  const alt = normalizeAlternativeUnits(produto).find((a) => a.id === unidadeId);
  if (!alt) return null;
  return {
    id: alt.id,
    nome: alt.nome || alt.unidade,
    sigla: alt.unidade,
    fator_conversao: alt.fator_conversao,
    fator_preco: alt.fator_preco || 1,
    is_principal: false,
    is_comercial: false,
    ativo: alt.ativo,
  };
}

/** Busca uma unidade canonica pela sigla normalizada. */
export function getUnidadeBySiglaCanonical(produto = {}, sigla = "") {
  const target = normalizeUnitCode(sigla);
  if (!target) return null;
  const canonical = getUnidadesCanonical(produto);
  if (canonical) return canonical.find((u) => normalizeUnitCode(u?.sigla) === target) || null;
  const principal = getUnidadePrincipalCanonical(produto);
  if (normalizeUnitCode(principal?.sigla) === target) return principal;
  const alt = normalizeAlternativeUnits(produto).find((a) => normalizeUnitCode(a.unidade) === target);
  if (!alt) return null;
  return {
    id: alt.id,
    nome: alt.nome || alt.unidade,
    sigla: alt.unidade,
    fator_conversao: alt.fator_conversao,
    fator_preco: alt.fator_preco || 1,
    is_principal: false,
    is_comercial: false,
    ativo: alt.ativo,
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
