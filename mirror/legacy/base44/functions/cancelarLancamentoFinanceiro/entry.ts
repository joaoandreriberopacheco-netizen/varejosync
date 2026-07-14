import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { lancamentoId, motivo } = await req.json();
    
    // Buscar lançamento
    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ id: lancamentoId });
    if (!lancamentos.length) {
      return Response.json({ error: 'Lançamento não encontrado' }, { status: 404 });
    }

    const lancamento = lancamentos[0];
    
    // Se for movimento de caixa com grupo, cancelar todos do grupo
    const grupoId = lancamento.grupo_lancamento_id;
    const lancamentosParaCancelar = grupoId 
      ? await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: grupoId })
      : [lancamento];

    for (const lanc of lancamentosParaCancelar) {
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(lanc.id, {
        status: 'Cancelado',
        observacoes: (lanc.observacoes || '') + `\n[CANCELADO por ${user.full_name} em ${new Date().toLocaleString('pt-BR')}] ${motivo || ''}`
      });
    }

    return Response.json({ 
      sucesso: true, 
      cancelados: lancamentosParaCancelar.length 
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});