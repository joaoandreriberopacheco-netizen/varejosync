import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════

function calculateIQR(data) {
  if (data.length < 3) return { lowerBound: -Infinity, upperBound: Infinity };

  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;

  return {
    lowerBound: q1 - 1.5 * iqr,
    upperBound: q3 + 1.5 * iqr
  };
}

function filterOutliers(values) {
  if (values.length === 0) return [];
  const { lowerBound, upperBound } = calculateIQR(values);
  return values.filter(v => v >= lowerBound && v <= upperBound);
}

function calculateAverageAfterIQR(values) {
  if (values.length === 0) return 0;
  const filtered = filterOutliers(values);
  if (filtered.length === 0) return 0;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DO SCORE IEP (COM FALLBACKS)
// ═══════════════════════════════════════════════════════════════

function calcularScoreIEPcomFallbacks(produto, vendas90d) {
  // Sem histórico → score mínimo de 10
  if (!vendas90d || vendas90d.length === 0) {
    return 10;
  }

  const itens = vendas90d.flatMap(p => p.itens || []).filter(it => it.produto_id === produto.id);
  
  if (itens.length === 0) {
    return 10;
  }

  // Pilar 1: Margem Relativa (40%)
  const faturamento = itens.reduce((acc, i) => acc + (i.total || 0), 0);
  const custo = itens.reduce((acc, i) => acc + ((i.custo_unitario_momento || 0) * (i.quantidade || 0)), 0);
  const lucro = faturamento - custo;

  let scoreMargem = 0;
  if (faturamento > 0) {
    const margemPct = (lucro / faturamento) * 100;
    scoreMargem = Math.min(100, Math.max(0, margemPct * 2.5));
  }

  // Pilar 2: Frequência de Venda (30%)
  const diasComVenda = new Set(vendas90d.map(p => new Date(p.created_date).toISOString().split('T')[0])).size;
  const scoreFrequencia = Math.min(100, (diasComVenda / 90) * 100);

  // Pilar 3: Taxa de Anexação (30%)
  const vendasComMultiplosItens = vendas90d.filter(p => (p.itens || []).length > 1).length;
  const taxaAnexacao = vendas90d.length > 0 ? (vendasComMultiplosItens / vendas90d.length) * 100 : 0;
  const scoreAnexacao = Math.min(100, Math.max(0, taxaAnexacao));

  // Score final ponderado
  const score = Math.round((scoreMargem * 0.4) + (scoreFrequencia * 0.3) + (scoreAnexacao * 0.3));
  
  return Math.max(10, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════
// ROLL-UP HIERÁRQUICO (SEM MÉDIA DE MÉDIA)
// ═══════════════════════════════════════════════════════════════

function flattenAllSKUsUnderNode(nivelId, produtos, nivelCampo) {
  // Retorna todos os SKUs (produtos folha) que pertencem a este nó hierárquico
  return produtos.filter(p => p[nivelCampo] === nivelId);
}

function calculateHierarchyScoreWithIQR(nivelId, produtos, metricas, nivelCampo) {
  // Flatten: obter todos os SKUs folha sob este nó
  const skusFolha = flattenAllSKUsUnderNode(nivelId, produtos, nivelCampo);
  
  if (skusFolha.length === 0) return 0;

  // Coletar scores individuais dos SKUs
  const scores = skusFolha
    .map(sku => metricas[sku.id]?.score || 0)
    .filter(score => score > 0);

  if (scores.length === 0) return 0;

  // Aplicar IQR e retornar média suavizada
  return Math.round(calculateAverageAfterIQR(scores));
}

// ═══════════════════════════════════════════════════════════════
// FETCH COM PAGINAÇÃO (OTIMIZAÇÃO DE MEMÓRIA)
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
// JOB PRINCIPAL - CALCULARÍEP V7
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

    // 1. CARREGAMENTO DE DADOS (COM PAGINAÇÃO PARA OTIMIZAÇÃO)
    const [produtos, todosPedidos] = await Promise.all([
      base44.entities.Produto.list('-created_date'),
      fetchPedidosComPaginacao(base44, dataISO)
    ]);

    // 2. CÁLCULO INDIVIDUAL DE SCORE IEP (FALLBACKS INCLUSOS)
    const metricasPorSKU = {};
    const metricas = produtos.map(produto => {
      const vendas = todosPedidos.filter(p => p.itens?.some(it => it.produto_id === produto.id));
      const score = calcularScoreIEPcomFallbacks(produto, vendas);
      
      const lucro = vendas.length > 0
        ? vendas
            .flatMap(p => p.itens.filter(it => it.produto_id === produto.id))
            .reduce((acc, i) => acc + ((i.total || 0) - ((i.custo_unitario_momento || 0) * (i.quantidade || 0))), 0)
        : 0;

      metricasPorSKU[produto.id] = { score, lucro };

      return {
        id: produto.id,
        score,
        lucro,
        grupo_id: produto.campo_hierarquico_1 || 'unassigned',
        trava: produto.iep_trava_manual || false
      };
    });

    // 3. CÁLCULO DE CLASSE ABCD (PARETO POR NÍVEL 1)
    const lucroPorGrupo = metricas.reduce((acc, curr) => {
      acc[curr.grupo_id] = (acc[curr.grupo_id] || 0) + curr.lucro;
      return acc;
    }, {});

    const rankingGrupos = Object.entries(lucroPorGrupo)
      .map(([id, lucro]) => ({ id, lucro }))
      .sort((a, b) => b.lucro - a.lucro);

    const lucroTotalCompanhia = rankingGrupos.reduce((acc, g) => acc + g.lucro, 0) || 1;
    let acumulado = 0;
    const mapaClassesGrupo = {};

    rankingGrupos.forEach(grupo => {
      acumulado += grupo.lucro;
      const percentual = (acumulado / lucroTotalCompanhia) * 100;

      if (percentual <= 70) mapaClassesGrupo[grupo.id] = 'A';
      else if (percentual <= 85) mapaClassesGrupo[grupo.id] = 'B';
      else if (percentual <= 95) mapaClassesGrupo[grupo.id] = 'C';
      else mapaClassesGrupo[grupo.id] = 'D';
    });

    // 4. ROLL-UP HIERÁRQUICO (PARA NÍVEIS 2-5)
    const metricsRollup = {};

    // Nível 2
    const nivel2Unicos = [...new Set(produtos.map(p => p.campo_hierarquico_2).filter(Boolean))];
    nivel2Unicos.forEach(nivel2 => {
      metricsRollup[nivel2] = calculateHierarchyScoreWithIQR(nivel2, produtos, metricasPorSKU, 'campo_hierarquico_2');
    });

    // Nível 3
    const nivel3Unicos = [...new Set(produtos.map(p => p.campo_hierarquico_3).filter(Boolean))];
    nivel3Unicos.forEach(nivel3 => {
      metricsRollup[nivel3] = calculateHierarchyScoreWithIQR(nivel3, produtos, metricasPorSKU, 'campo_hierarquico_3');
    });

    // Nível 4
    const nivel4Unicos = [...new Set(produtos.map(p => p.campo_hierarquico_4).filter(Boolean))];
    nivel4Unicos.forEach(nivel4 => {
      metricsRollup[nivel4] = calculateHierarchyScoreWithIQR(nivel4, produtos, metricasPorSKU, 'campo_hierarquico_4');
    });

    // Nível 5
    const nivel5Unicos = [...new Set(produtos.map(p => p.campo_hierarquico_5).filter(Boolean))];
    nivel5Unicos.forEach(nivel5 => {
      metricsRollup[nivel5] = calculateHierarchyScoreWithIQR(nivel5, produtos, metricasPorSKU, 'campo_hierarquico_5');
    });

    // 5. ATUALIZAÇÃO DOS PRODUTOS NO BANCO
    for (const p of metricas) {
      const classeDoGrupo = mapaClassesGrupo[p.grupo_id] || 'D';

      const updateData = { 
        iep_score: p.score,
        iep_score_nivel_2: metricsRollup[produtos.find(x => x.id === p.id)?.campo_hierarquico_2] || 0,
        iep_score_nivel_3: metricsRollup[produtos.find(x => x.id === p.id)?.campo_hierarquico_3] || 0,
        iep_score_nivel_4: metricsRollup[produtos.find(x => x.id === p.id)?.campo_hierarquico_4] || 0,
        iep_score_nivel_5: metricsRollup[produtos.find(x => x.id === p.id)?.campo_hierarquico_5] || 0
      };

      if (!p.trava) {
        updateData.iep_classe = classeDoGrupo;
      }

      await base44.entities.Produto.update(p.id, updateData);
    }

    return Response.json({ 
      status: 'sucesso', 
      processados: metricas.length,
      versao: 'V7',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});