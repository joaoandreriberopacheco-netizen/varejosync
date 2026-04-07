import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transportadoraId, nome, saidaReferencia, contato, telefone, email, observacoes, ativo = true } = await req.json();

    if (!transportadoraId) {
      return Response.json({ error: 'transportadoraId é obrigatório' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Transportadora.update(transportadoraId, {
      nome,
      saida_referencia: saidaReferencia,
      contato,
      telefone,
      email,
      observacoes,
      ativo,
    });

    const viagensExistentes = await base44.asServiceRole.entities.EventoLogisticoSandbox.filter({ transportadora_id: transportadoraId }, '-data_saida_origem', 500);

    for (const viagem of viagensExistentes) {
      await base44.asServiceRole.entities.EventoLogisticoSandbox.delete(viagem.id);
    }

    const response = await base44.asServiceRole.functions.invoke('gerarViagensTransportadora', {
      transportadoraId,
      monthsToCreate: 3,
      ensureNextMonthOnly: false,
    });

    return Response.json({ success: true, ...response.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});