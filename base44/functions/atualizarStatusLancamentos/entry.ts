import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar autenticação (chamado por automação como service role)
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0]; // yyyy-MM-dd

    // Buscar todos os lançamentos Em Aberto
    const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      status: 'Em Aberto'
    });

    let atualizados = 0;
    const promises = [];

    for (const l of lancamentos) {
      if (!l.data_vencimento) continue;
      // Vencimento anterior a hoje → marcar como Vencido
      if (l.data_vencimento < hojeStr) {
        promises.push(
          base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, { status: 'Vencido' })
        );
        atualizados++;
      }
    }

    await Promise.all(promises);

    return Response.json({
      success: true,
      atualizados,
      mensagem: `${atualizados} lançamento(s) marcado(s) como Vencido.`
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});