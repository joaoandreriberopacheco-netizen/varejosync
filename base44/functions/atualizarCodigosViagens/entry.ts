import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function buildCodigo(sequence) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seed = sequence;
  let output = '';

  for (let index = 0; index < 6; index += 1) {
    output = chars[seed % chars.length] + output;
    seed = Math.floor(seed / chars.length);
  }

  return `${output.slice(0, 3)}-${output.slice(3)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viagens = await base44.asServiceRole.entities.EventoLogisticoSandbox.list('data_saida_origem', 500);
    const viagensNormalizadas = viagens
      .map((record) => ({ id: record.id, ...(record.data || record) }))
      .filter((viagem) => viagem.transportadora_id && viagem.data_saida_origem)
      .sort((a, b) => new Date(a.data_saida_origem) - new Date(b.data_saida_origem));

    const counters = new Map();
    const updates = [];

    for (const viagem of viagensNormalizadas) {
      const current = counters.get(viagem.transportadora_id) || 0;
      const next = current + 1;
      counters.set(viagem.transportadora_id, next);

      const novoCodigo = buildCodigo(next);
      const novoNome = viagem.embarcacao_nome ? `${viagem.embarcacao_nome} · ${novoCodigo}` : viagem.nome;

      if (viagem.codigo !== novoCodigo || viagem.nome !== novoNome) {
        updates.push({ id: viagem.id, codigo: novoCodigo, nome: novoNome });
      }
    }

    for (const update of updates) {
      await base44.asServiceRole.entities.EventoLogisticoSandbox.update(update.id, {
        codigo: update.codigo,
        nome: update.nome,
      });
    }

    return Response.json({ updated: updates.length, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});