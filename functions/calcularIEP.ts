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

    // 2. CÁLCULO DE PERFORMANCE (IEP) E PESO ECONÔMICO (PIB)
    const listaAnalise = produtos.map(produto => {
      const vendas = todosPedidos.filter(p => p.itens?.some(it => it.produto_id === produto.id));
      
      if (vendas.length === 0) return { id: produto.id, score: 0, lucroAbsoluto: 0, trava: produto.iep_trava_manual };

      // --- CÁLCULO DO IEP (EFICIÊNCIA RELATIVA - O IDH) ---
      const dadosItens = vendas.flatMap(p => p.itens.filter(it => it.produto_id === produto.id));
      const faturamentoTotal = dadosItens.reduce((acc, i) => acc + (i.total || 0), 0);
      const lucroTotal = dadosItens.reduce((acc, i) => acc + ((i.total || 0) - ((i.custo_unitario_momento || 0) * i.quantidade)), 0);
      
      // Pilar 1: Potencial (Margem Relativa com peso 60% dentro do pilar)
      const margemRelativa = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;
      const scorePotencial = Math.min(100, margemRelativa * 2); // Ex: 30% de margem = 60 pts

      // Pilar 2: Cinética (Giro/Frequência)
      const scoreCinetico = Math.min(100, (vendas.length / 90) * 100);

      // Pilar 3: Magnética (Anexação/Attach Rate)
      const anexacao = (vendas.filter(p => p.itens.length > 1).length / vendas.length) * 100;
      const scoreMagnetico = anexacao;

      // IEP FINAL (O DNA de Desempenho)
      const iepScore = Math.round((scorePotencial * 0.5) + (scoreCinetico * 0.25) + (scoreMagnetico * 0.25));

      return {
        id: produto.id,
        codigo: produto.codigo_interno,
        score: iepScore,
        lucroAbsoluto: lucroTotal,
        trava: produto.iep_trava_manual || false
      };
    });

    // 3. CLASSIFICAÇÃO POR PARETO DE LUCRO (A ESCALA SOCIAL)
    // Aqui definimos quem manda na empresa pelo volume de dinheiro
    listaAnalise.sort((a, b) => b.lucroAbsoluto - a.lucroAbsoluto);
    
    const totalLucroCompanhia = listaAnalise.reduce((acc, p) => acc + p.lucroAbsoluto, 0);
    let lucroAcumulado = 0;
    const META_MINIMA_IEP_A = 60; // Régua de corte para eficiência do Classe A

    for (const p of listaAnalise) {
      lucroAcumulado += p.lucroAbsoluto;
      const percAcumulado = (lucroAcumulado / totalLucroCompanhia) * 100;

      let classe = 'D';
      if (percAcumulado <= 60) classe = 'A'; // O "A" são os itens que somados dão 60% do lucro
      else if (percAcumulado <= 85) classe = 'B'; // Os próximos 25% do lucro
      else if (percAcumulado <= 95) classe = 'C'; 
      
      // REGRA DO COMANDANTE: Gigante doente é rebaixado
      if (classe === 'A' && p.score < META_MINIMA_IEP_A) {
        classe = 'B';
      }

      // PERSISTÊNCIA
      const updateData: any = { iep_score: p.score };
      if (!p.trava) updateData.iep_classe = classe;
      
      await base44.entities.Produto.update(p.id, updateData);
    }

    return Response.json({ status: 'sucesso', total: listaAnalise.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
