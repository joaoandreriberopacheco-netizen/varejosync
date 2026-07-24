// Port automático de base44/functions/atualizarCodigosViagens/entry.ts
import type { createP38Client } from '../p38Client.ts';

function buildCodigoAleatorio() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let output = '';

  for (let index = 0; index < 6; index += 1) {
    output += chars[bytes[index] % chars.length];
  }

  return `${output.slice(0, 3)}-${output.slice(3)}`;
}

function gerarCodigoUnico(codigosExistentes) {
  let tentativas = 0;

  while (tentativas < 200) {
    const codigo = buildCodigoAleatorio();
    if (!codigosExistentes.has(codigo)) {
      codigosExistentes.add(codigo);
      return codigo;
    }
    tentativas += 1;
  }

  throw new Error('Não foi possível gerar um código único para a viagem');
}

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const viagens = await base44.asServiceRole.entities.EventoLogisticoSandbox.list('data_saida_origem', 500);
    const viagensNormalizadas = viagens
      .map((record) => ({ id: record.id, ...(record.data || record) }))
      .filter((viagem) => viagem.transportadora_id && viagem.data_saida_origem)
      .sort((a, b) => new Date(a.data_saida_origem) - new Date(b.data_saida_origem));

    const codigosExistentes = new Set();
    const updates = [];

    for (const viagem of viagensNormalizadas) {
      const novoCodigo = gerarCodigoUnico(codigosExistentes);
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
}
