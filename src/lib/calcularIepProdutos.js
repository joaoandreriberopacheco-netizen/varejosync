/**
 * Cálculo ABCD / IEP (mesmas regras do job base44/functions/calcularIEP).
 * Usado no catálogo quando os campos ainda não foram persistidos no Produto.
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

/** Quantidade em unidade base (alinha ao RelatorioMargem). */
export function lineQuantityBase(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase))) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade) || 0;
  const fator = Number(item?.fator_conversao) || 1;
  return qty * fator;
}

export function collectItensVendaProduto(produto, pedidos90d) {
  const pid = String(produto?.id ?? '');
  if (!pid) return [];
  return (pedidos90d || [])
    .flatMap((p) => p.itens || [])
    .filter((it) => String(it?.produto_id ?? it?.produtoId ?? '') === pid);
}

export function calcularLucroSkuComQ4(produto, pedidos90d) {
  const custoUnit = resolveCustoCalculadoProduto(produto);
  const itens = collectItensVendaProduto(produto, pedidos90d);

  if (itens.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0, teveVenda: false };
  }

  const linhas = itens
    .map((it) => {
      const qtyBase = lineQuantityBase(it);
      const total = Number(it.total) || 0;
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
    ranking.forEach((entry) => {
      mapa[entry.id] = 'D';
    });
    return mapa;
  }

  const comLucro = ranking.filter((entry) => entry.lucro > 0);
  let acumulado = 0;

  comLucro.forEach((entry) => {
    acumulado += entry.lucro;
    const percentual = (acumulado / totalLucroPositivo) * 100;
    if (percentual <= 70) mapa[entry.id] = 'A';
    else if (percentual <= 85) mapa[entry.id] = 'B';
    else if (percentual <= 95) mapa[entry.id] = 'C';
    else mapa[entry.id] = 'D';
  });

  ranking
    .filter((entry) => entry.lucro <= 0)
    .forEach((entry) => {
      mapa[entry.id] = 'D';
    });

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
  const h1 = (produto.campo_hierarquico_1 || 'unassigned').trim();
  const h2 = (produto.campo_hierarquico_2 || '').trim();
  if (h2) return hierarchyKey([h1, h2]);
  return hierarchyKey([h1, '__familia__']);
}

/** Calcula métricas IEP para todos os produtos (não grava no BD). */
export function calcularMetricasIepParaCatalogo(produtos, pedidos90d) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];

  const metricasPorSku = {};
  for (const produto of lista) {
    metricasPorSku[produto.id] = calcularLucroSkuComQ4(produto, pedidos);
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

/** Aplica métricas IEP/ABCD calculadas a partir das vendas de 90 dias. */
export function enrichProdutosComIep(produtos, pedidos90d) {
  const lista = Array.isArray(produtos) ? produtos : [];
  if (!lista.length || !Array.isArray(pedidos90d)) return lista;

  const calculado = calcularMetricasIepParaCatalogo(lista, pedidos90d);
  return lista.map((produto) => {
    const m = calculado[produto.id];
    if (!m) return produto;
    return { ...produto, ...m };
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
  const tipo = String(pedido?.tipo ?? 'PDV').toUpperCase();
  return tipo === 'PDV' || tipo === 'PEDIDO';
}
