import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    // Apenas processar deletions
    if (event.type !== 'delete') {
      return Response.json({ ok: true });
    }

    // Se for lançamento de movimento de caixa com grupo_lancamento_id
    if (data?.referencia_tipo !== 'MovimentosCaixa' || !data?.grupo_lancamento_id) {
      return Response.json({ ok: true });
    }

    // Deletar todos os lançamentos do mesmo grupo
    const grupoId = data.grupo_lancamento_id;
    const lancamentosGrupo = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      grupo_lancamento_id: grupoId
    });

    for (const lancamento of lancamentosGrupo) {
      await base44.asServiceRole.entities.LancamentoFinanceiro.delete(lancamento.id);
    }

    console.log(`Deletados ${lancamentosGrupo.length} lançamentos do grupo ${grupoId}`);
    return Response.json({ deletados: lancamentosGrupo.length });
    
  } catch (error) {
    console.error('Erro ao sincronizar deleção:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});