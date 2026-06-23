import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// QUARTIS — desconsidera o 4.º quartil (valores acima de Q3)
// ═══════════════════════════════════════════════════════════════

/** Q3 — limite superior do miolo (exclui 4.º quartil). */
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

function resolveCustoCalculado(produto) {
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

function lineQuantity(item) {
  const qty = item?.quantidade_base ?? item?.quantidade ?? 0;
  return Number(qty) || 0;
}

function lineUnitPrice(item) {
  const qty = lineQuantity(item);
  const total = Number(item?.total) || 0;
  if (qty <= 0) return 0;
  return total / qty;
}

// ═══════════════════════════════════════════════════════════════
// LUCRO POR SKU — IQR por SKU, custo calculado + preço médio de venda
// ═══════════════════════════════════════════════════════════════

function calcularLucroSkuComQ4(produto, pedidos90d) {
  const custoUnit = resolveCustoCalculado(produto);
  const itens = pedidos90d
    .flatMap((p) => p.itens || [])
    .filter((it) => it.produto_id === produto.id);

  if (itens.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0 };
  }

  const linhas = itens
    .map((it) => ({
      unitPrice: lineUnitPrice(it),
      qty: lineQuantity(it),
      total: Number(it.total) || 0,
    }))
    .filter((l) => l.qty > 0 && l.unitPrice > 0);

  if (linhas.length === 0) {
    return { lucro: 0, precoMedio: 0, quantidade: 0 };
  }

  const unitPrices = linhas.map((l) => l.unitPrice);
  const limiteQ3 = q3(unitPrices);
  const linhasCore =
    linhas.length < 4 ? linhas : linhas.filter((l) => l.unitPrice <= limiteQ3);

  const quantidade = linhasCore.reduce((acc, l) => acc + l.qty, 0);
  const receita = linhasCore.reduce((acc, l) => acc + l.total, 0);
  const precoMedio = quantidade > 0 ? receita / quantidade : 0;
  const lucro = receita - custoUnit * quantidade;

  return { lucro, precoMedio, quantidade };
}

// ═══════════════════════════════════════════════════════════════
// CURVA ABCD — Pareto 70 / 15 / 10 / 5 por lucro agregado
// ═══════════════════════════════════════════════════════════════

function classificarParetoABCD(ranking, totalLucro) {
  const mapa = {};
  const base = totalLucro > 0 ? totalLucro : 1;
  let acumulado = 0;

  ranking.forEach((entry) => {
    acumulado += Math.max(0, entry.lucro);
    const percentual = (acumulado / base) * 100;
    if (percentual <= 70) mapa[entry.id] = 'A';
    else if (percentual <= 85) mapa[entry.id] = 'B';
    else if (percentual <= 95) mapa[entry.id] = 'C';
    else mapa[entry.id] = 'D';
  });

  return mapa;
}

function normalizarScore0a100(lucro, lucroMax) {
  if (lucroMax <= 0) return lucro > 0 ? 50 : 10;
  return Math.round(Math.max(10, Math.min(100, (lucro / lucroMax) * 100)));
}

// ═══════════════════════════════════════════════════════════════
// FETCH COM PAGINAÇÃO
// ═══════════════════════════════════════════════════════════════

async function fetchPedidosComPaginacao(base44, dataISO, pageSize = 500) {
  const todosPedidos = [];
  let skip = 0;
  let temMais = true;

  while (temMais) {
    const batch = await base44.entities.PedidoVenda.filter(
      { created_date: { $gte: dataISO }, status: { $ne: 'Cancelado' } },
      '-created_date',
      pageSize,
      skip
    );

    if (!batch || batch.length === 0) {
      temMais = false;
    } else {
      todosPedidos.push(...batch);
      skip += pageSize;
    }
  }

  return todosPedidos;
}

// ═══════════════════════════════════════════════════════════════
// JOB PRINCIPAL — IQR por SKU + ABCD no nível hierárquico 2
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const hoje = new Date();
    const data90d = new Date();
    data90d.setDate(hoje.getDate() - 90);
    const dataISO = data90d.toISOString();

    const [produtos, todosPedidos] = await Promise.all([
      base44.entities.Produto.list('-created_date'),
      fetchPedidosComPaginacao(base44, dataISO),
    ]);

    // 1. Lucro por SKU (IQR/Q4 por SKU; custo calculado + preço médio sem 4.º quartil)
    const metricasPorSku = {};
    for (const produto of produtos) {
      const { lucro, precoMedio, quantidade } = calcularLucroSkuComQ4(produto, todosPedidos);
      metricasPorSku[produto.id] = { lucro, precoMedio, quantidade };
    }

    const lucroMax = Math.max(0, ...Object.values(metricasPorSku).map((m) => m.lucro));

    // 2. ABCD no nível 2 (campo_hierarquico_1 + campo_hierarquico_2)
    const lucroPorNivel2 = {};
    for (const produto of produtos) {
      const h1 = produto.campo_hierarquico_1 || 'unassigned';
      const h2 = produto.campo_hierarquico_2;
      if (!h2) continue;
      const key = hierarchyKey([h1, h2]);
      lucroPorNivel2[key] = (lucroPorNivel2[key] || 0) + (metricasPorSku[produto.id]?.lucro || 0);
    }

    const rankingNivel2 = Object.entries(lucroPorNivel2)
      .map(([id, lucro]) => ({ id, lucro }))
      .sort((a, b) => b.lucro - a.lucro);

    const lucroTotalNivel2 = rankingNivel2.reduce((acc, g) => acc + Math.max(0, g.lucro), 0);
    const mapaAbcdNivel2 = classificarParetoABCD(rankingNivel2, lucroTotalNivel2);

    function classeAbcdProduto(produto) {
      const h1 = produto.campo_hierarquico_1 || 'unassigned';
      const h2 = produto.campo_hierarquico_2;
      if (!h2) return 'D';
      const key = hierarchyKey([h1, h2]);
      return mapaAbcdNivel2[key] || 'D';
    }

    // 3. Médias por nível — IQR só no SKU; níveis recebem média simples dos filhos
    const skusPorChaveNivel = (nivel) => {
      const map = {};
      for (const produto of produtos) {
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

    // Nível 1: média dos filhos de nível 2 (não média direta de todos os SKUs)
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
      if (parts.filter(Boolean).length < nivel) return 0;
      const key = `n${nivel}:${hierarchyKey(parts)}`;
      return Math.round(mediaLucroPorChave[key] || 0);
    }

    // 4. Persistência
    for (const produto of produtos) {
      const sku = metricasPorSku[produto.id];
      const h1 = produto.campo_hierarquico_1 || 'unassigned';
      const classe = classeAbcdProduto(produto);
      const trava = produto.iep_trava_manual || false;

      const updateData = {
        abcd: classe,
        iep_score: normalizarScore0a100(sku.lucro, lucroMax),
        iep_score_nivel_1: Math.round(mediaNivel1PorH1[h1] || 0),
        iep_score_nivel_2: rollupNivel(produto, 2),
        iep_score_nivel_3: rollupNivel(produto, 3),
        iep_score_nivel_4: rollupNivel(produto, 4),
        iep_score_nivel_5: rollupNivel(produto, 5),
      };

      if (!trava) {
        updateData.iep_classe = classe;
      }

      await base44.entities.Produto.update(produto.id, updateData);
    }

    return Response.json({
      status: 'sucesso',
      processados: produtos.length,
      grupos_nivel_2: Object.keys(lucroPorNivel2).length,
      versao: 'V8-abcd-iqr-nivel2',
      regras: {
        janela_dias: 90,
        custo: 'preco_custo_calculado',
        preco: 'media_venda_sem_4_quartil_por_sku',
        abcd_nivel: 'campo_hierarquico_2',
        pareto: '70/15/10/5',
        iqr: 'por_sku_exclui_q4',
        nivel_1: 'media_dos_filhos_nivel_2',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
