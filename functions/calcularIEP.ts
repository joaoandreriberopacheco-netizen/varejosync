import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    // 1. CARREGAMENTO DE DADOS
    const [produtos, todosPedidos] = await Promise.all([
      base44.entities.Produto.list('-created_date'),
      base44.entities.PedidoVenda.filter({
        created_date: { $gte: dataISO },
        status: { $ne: 'Cancelado' }
      })
    ]);

    // 2. CÁLCULO INDIVIDUAL DE PERFORMANCE (IEP)
    const metricasIndividuais = produtos.map(produto => {
      const vendas = todosPedidos.filter(p => p.itens?.some(it => it.produto_id === produto.id));
      
      if (vendas.length === 0) return { id: produto.id, score: 10, lucro: 0, grupo_id: produto.hierarquia_nivel_1_id };

      const itens = vendas.flatMap(p => p.itens.filter(it => it.produto_id === produto.id));
      const faturamento = itens.reduce((acc, i) => acc + (i.total || 0), 0);
      const custo = itens.reduce((acc, i) => acc + ((i.custo_unitario_momento || 0) * i.quantidade), 0);
      const lucro = faturamento - custo;
      
      // IEP (Desempenho Técnico): Sem peso de participação na rentabilidade total
      const margemRelativa = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
      const scorePotencial = Math.min(100, margemRelativa * 2.5); 
      const scoreCinetico = Math.min(100, (vendas.length / 90) * 100);
      const attachRate = (vendas.filter(p => p.itens.length > 1).length / vendas.length) * 100;

      return {
        id: produto.id,
        score: Math.round((scorePotencial * 0.4) + (scoreCinetico * 0.3) + (attachRate * 0.3)),
        lucro: lucro,
        grupo_id: produto.hierarquia_nivel_1_id || 'unassigned',
        trava: produto.iep_trava_manual || false
      };
    });

    // 3. ANÁLISE DE CLASSE (ABCD) POR GRUPO HIERÁRQUICO
    // Agregação de lucro por Nível 1
    const lucroPorGrupo = metricasIndividuais.reduce((acc, curr) => {
      acc[curr.grupo_id] = (acc[curr.grupo_id] || 0) + curr.lucro;
      return acc;
    }, {} as Record<string, number>);

    const rankingGrupos = Object.entries(lucroPorGrupo)
      .map(([id, lucro]) => ({ id, lucro }))
      .sort((a, b) => b.lucro - a.lucro);

    const lucroTotalCompanhia = rankingGrupos.reduce((acc, g) => acc + g.lucro, 0);
    let acumulado = 0;
    const mapaClassesGrupo: Record<string, string> = {};

    rankingGrupos.forEach(grupo => {
      acumulado += grupo.lucro;
      const percentual = (acumulado / lucroTotalCompanhia) * 100;

      if (percentual <= 70) mapaClassesGrupo[grupo.id] = 'A';
      else if (percentual <= 85) mapaClassesGrupo[grupo.id] = 'B';
      else if (percentual <= 95) mapaClassesGrupo[grupo.id] = 'C';
      else mapaClassesGrupo[grupo.id] = 'D';
    });

    // 4. ATUALIZAÇÃO DOS PRODUTOS
    for (const p of metricasIndividuais) {
      const classeDoGrupo = mapaClassesGrupo[p.grupo_id] || 'D';
      
      const updateData: any = { iep_score: p.score };
      if (!p.trava) {
        updateData.iep_classe = classeDoGrupo;
      }

      await base44.entities.Produto.update(p.id, updateData);
    }

    return Response.json({ status: 'sucesso', processados: metricasIndividuais.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
