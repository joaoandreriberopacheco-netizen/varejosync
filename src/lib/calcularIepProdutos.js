/**
 * Cálculo ABCD / IEP (mesmas regras do job base44/functions/calcularIEP).
 * Catálogo: enrichProdutosComIep recalcula ao vivo e ignora abcd gravado no cadastro.
 */

function q3(values) {
  if (!values || values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hierarchyKey(parts) {
  return parts.filter(Boolean).join('\x00');
}

export function resolveCustoCalculadoProduto(produto) {
  const salvo = Number(produto?.preco_custo_calculado) || 0;
  if (salvo > 0) return salvo;
  return (
    (Number(produto?.valor_compra) || 0) +
    (Number(produto?.custo_frete_padrao) || 0) +
    (Number(produto?.custo_imposto1_padrao) || 0) +
    (Number(produto?.custo_imposto2_padrao) || 0) +
    (Number(produto?.custo_outros_padrao) || 0) -
    (Number(produto?.desconto_compra_padrao) || 0)
  );
}

export function lineQuantityBase(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase)) && Number(qtyBase) > 0) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade ?? item?.quantidade_comercial) || 0;
  const fator = Number(item?.fator_conversao ?? item?.fator_aplicado) || 1;
  return qty * fator;
}

export function collectItensVendaProduto(produto, pedidos90d) {
  const pid = String(produto?.id ?? '');
  if (!pid) return [];
  return (pedidos90d || [])
    .flatMap((p) => p.itens || [])
    .filter((it) => String(it?.produto_id ?? it?.produtoId ?? '') === pid);
}

/** Linhas de venda do produto via índice (mais fiável que espelho vazio no pedido). */
export function collectItensVendaProdutoFromIndex(produto, itensPorProduto) {
  const pid = String(produto?.id ?? '');
  if (!pid) return [];
  return itensPorProduto?.[pid] || [];
}

function resolveItensVendaProduto(produto, pedidos90d, itensPorProduto) {
  const doIndex = collectItensVendaProdutoFromIndex(produto, itensPorProduto);
  if (doIndex.length) return doIndex;
  return collectItensVendaProduto(produto, pedidos90d);
}

/** Valor da linha de venda (total gravado ou qty × preço unitário). */
export function lineReceitaItem(it) {
  const total = Number(it?.total);
  if (Number.isFinite(total) && total > 0) return total;

  const qtyBase = lineQuantityBase(it);
  if (qtyBase > 0) {
    const unit =
      Number(it?.preco_final_unitario_fator1) ||
      Number(it?.preco_unitario_fator1) ||
      Number(it?.preco_unitario_praticado) ||
      Number(it?.preco_unitario) ||
      0;
    if (unit > 0) return qtyBase * unit;
  }

  const qtyCom = Number(it?.quantidade_comercial ?? it?.quantidade) || 0;
  const precoCom = Number(it?.preco_unitario_comercial) || 0;
  if (qtyCom > 0 && precoCom > 0) return qtyCom * precoCom;

  return 0;
}

export function calcularLucroSkuComQ4(produto, pedidos90d, itensPorProduto = null) {
  const custoUnit = resolveCustoCalculadoProduto(produto);
  const itens = resolveItensVendaProduto(produto, pedidos90d, itensPorProduto);

  if (itens.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0, teveVenda: false };
  }

  const linhas = itens
    .map((it) => {
      const qtyBase = lineQuantityBase(it);
      const total = lineReceitaItem(it);
      const unitPrice = qtyBase > 0 ? total / qtyBase : 0;
      return { unitPrice, qtyBase, total };
    })
    .filter((l) => l.qtyBase > 0 && l.total > 0);

  if (linhas.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0, teveVenda: false };
  }

  const unitPrices = linhas.map((l) => l.unitPrice);
  const limiteQ3 = q3(unitPrices);
  const linhasCore =
    linhas.length < 4 ? linhas : linhas.filter((l) => l.unitPrice <= limiteQ3);

  const quantidade = linhasCore.reduce((acc, l) => acc + l.qtyBase, 0);
  const receita = linhasCore.reduce((acc, l) => acc + l.total, 0);
  const precoMedio = quantidade > 0 ? receita / quantidade : 0;
  const lucro = receita - custoUnit * quantidade;

  return { lucro, precoMedio, quantidade, teveVenda: quantidade > 0 };
}

function classificarParetoABCD(ranking, totalLucroPositivo) {
  const mapa = {};

  if (totalLucroPositivo <= 0) {
    for (const entry of ranking) {
      mapa[entry.id] = 'D';
    }
    return mapa;
  }

  const comLucro = ranking.filter((entry) => entry.lucro > 0);
  let acumulado = 0;

  for (const entry of comLucro) {
    acumulado += entry.lucro;
    const percentual = (acumulado / totalLucroPositivo) * 100;
    if (percentual <= 70) mapa[entry.id] = 'A';
    else if (percentual <= 85) mapa[entry.id] = 'B';
    else if (percentual <= 95) mapa[entry.id] = 'C';
    else mapa[entry.id] = 'D';
  }

  for (const entry of ranking) {
    if (entry.lucro <= 0) mapa[entry.id] = 'D';
  }

  return mapa;
}

function normalizarScore0a100(lucro, lucroMax, teveVenda) {
  if (!teveVenda) return null;
  if (lucroMax <= 0) return lucro > 0 ? 50 : 1;
  const raw = (Math.max(0, lucro) / lucroMax) * 100;
  return Math.round(Math.max(1, Math.min(100, raw)));
}

/** Chave do grupo ABCD: nível 2 dentro da família; sem h2 usa só família (nível 1). */
export function grupoAbcdKey(produto) {
  const h1 = String(produto?.campo_hierarquico_1 ?? 'unassigned').trim();
  const h2 = String(produto?.campo_hierarquico_2 ?? '').trim();
  if (h2) return hierarchyKey([h1, h2]);
  return hierarchyKey([h1, '__familia__']);
}

/** Calcula métricas IEP para todos os produtos (não grava no BD). */
export function calcularMetricasIepParaCatalogo(produtos, pedidos90d, itensPorProduto = null) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];

  const metricasPorSku = {};
  for (const produto of lista) {
    metricasPorSku[produto.id] = calcularLucroSkuComQ4(produto, pedidos, itensPorProduto);
  }

  const lucroMax = Math.max(0, ...Object.values(metricasPorSku).map((m) => Math.max(0, m.lucro)));

  const lucroPorGrupo = {};
  for (const produto of lista) {
    const key = grupoAbcdKey(produto);
    lucroPorGrupo[key] = (lucroPorGrupo[key] || 0) + (metricasPorSku[produto.id]?.lucro || 0);
  }

  const rankingGrupos = Object.entries(lucroPorGrupo)
    .map(([id, lucro]) => ({ id, lucro }))
    .sort((a, b) => b.lucro - a.lucro);

  const lucroTotalPositivo = rankingGrupos.reduce((acc, g) => acc + Math.max(0, g.lucro), 0);
  const mapaAbcdGrupo = classificarParetoABCD(rankingGrupos, lucroTotalPositivo);

  function classeAbcdProduto(produto) {
    const key = grupoAbcdKey(produto);
    return mapaAbcdGrupo[key] || 'D';
  }

  const skusPorChaveNivel = (nivel) => {
    const map = {};
    for (const produto of lista) {
      const parts = [
        produto.campo_hierarquico_1,
        produto.campo_hierarquico_2,
        produto.campo_hierarquico_3,
        produto.campo_hierarquico_4,
        produto.campo_hierarquico_5,
      ].slice(0, nivel);
      if (parts.filter(Boolean).length < nivel) continue;
      const key = hierarchyKey(parts);
      if (!map[key]) map[key] = [];
      map[key].push(produto.id);
    }
    return map;
  };

  const mediaLucroPorChave = {};
  for (let nivel = 2; nivel <= 5; nivel += 1) {
    const grupos = skusPorChaveNivel(nivel);
    for (const [key, skuIds] of Object.entries(grupos)) {
      const lucros = skuIds.map((id) => metricasPorSku[id]?.lucro ?? 0);
      mediaLucroPorChave[`n${nivel}:${key}`] = average(lucros);
    }
  }

  const mediaNivel2PorH1 = {};
  for (const [key, media] of Object.entries(mediaLucroPorChave)) {
    if (!key.startsWith('n2:')) continue;
    const h1 = key.slice(3).split('\x00')[0];
    if (!h1) continue;
    if (!mediaNivel2PorH1[h1]) mediaNivel2PorH1[h1] = [];
    mediaNivel2PorH1[h1].push(media);
  }
  const mediaNivel1PorH1 = {};
  for (const [h1, medias] of Object.entries(mediaNivel2PorH1)) {
    mediaNivel1PorH1[h1] = average(medias);
  }

  function rollupNivel(produto, nivel) {
    const parts = [
      produto.campo_hierarquico_1,
      produto.campo_hierarquico_2,
      produto.campo_hierarquico_3,
      produto.campo_hierarquico_4,
      produto.campo_hierarquico_5,
    ].slice(0, nivel);
    if (parts.filter(Boolean).length < nivel) return null;
    const key = `n${nivel}:${hierarchyKey(parts)}`;
    const val = mediaLucroPorChave[key];
    return val == null ? null : Math.round(val);
  }

  const porId = {};
  for (const produto of lista) {
    const sku = metricasPorSku[produto.id];
    const h1 = produto.campo_hierarquico_1 || 'unassigned';
    const classe = classeAbcdProduto(produto);
    porId[produto.id] = {
      abcd: classe,
      iep_score: normalizarScore0a100(sku.lucro, lucroMax, sku.teveVenda),
      iep_score_nivel_1: mediaNivel1PorH1[h1] != null ? Math.round(mediaNivel1PorH1[h1]) : null,
      iep_score_nivel_2: rollupNivel(produto, 2),
      iep_score_nivel_3: rollupNivel(produto, 3),
      iep_score_nivel_4: rollupNivel(produto, 4),
      iep_score_nivel_5: rollupNivel(produto, 5),
      iep_classe: produto.iep_trava_manual ? produto.iep_classe || classe : classe,
    };
  }

  return porId;
}

const CAMPOS_ABCD_IEP_CATALOGO = [
  'abcd',
  'iep_score',
  'iep_score_nivel_1',
  'iep_score_nivel_2',
  'iep_score_nivel_3',
  'iep_score_nivel_4',
  'iep_score_nivel_5',
  'iep_classe',
];

/** Remove ABCD/IEP gravados no cadastro — o catálogo usa só o cálculo ao vivo. */
export function stripAbcdIepCadastro(produto) {
  if (!produto || typeof produto !== 'object') return produto;
  const next = { ...produto };
  for (const key of CAMPOS_ABCD_IEP_CATALOGO) {
    delete next[key];
  }
  return next;
}

/**
 * Aplica métricas IEP/ABCD calculadas a partir das vendas de 90 dias.
 * Aceita pedidos90d[] ou { pedidos90d, itensPorProduto }.
 */
export function enrichProdutosComIep(produtos, vendasDados) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const pedidos90d = Array.isArray(vendasDados)
    ? vendasDados
    : vendasDados?.pedidos90d;
  const itensPorProduto = Array.isArray(vendasDados) ? null : vendasDados?.itensPorProduto;

  if (!lista.length || !Array.isArray(pedidos90d)) {
    return lista.map(stripAbcdIepCadastro);
  }

  const calculado = calcularMetricasIepParaCatalogo(lista, pedidos90d, itensPorProduto);
  return lista.map((produto) => {
    const m = calculado[produto.id];
    if (!m) return stripAbcdIepCadastro(produto);
    return { ...stripAbcdIepCadastro(produto), ...m };
  });
}

export function iso90DiasAtras() {
  const data = new Date();
  data.setDate(data.getDate() - 90);
  return data.toISOString();
}

export function pedidoDentroJanela90d(pedido, dataISO) {
  const cut = new Date(dataISO).getTime();
  const raw = pedido?.created_date ?? pedido?.created_at;
  if (!raw) return true;
  return new Date(raw).getTime() >= cut;
}

export function pedidoElegivelIep(pedido) {
  const status = String(pedido?.status ?? '');
  if (status === 'Cancelado') return false;
  const tipo = String(pedido?.tipo ?? 'PDV').trim().toUpperCase();
  if (tipo === 'PEDIDO') return true;
  if (tipo === 'PDV' || tipo.startsWith('PDV ')) return true;
  return false;
}
