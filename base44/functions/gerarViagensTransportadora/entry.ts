import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

function buildCodigo(sequence) {
  const grupo = String(Math.floor((sequence - 1) / 999) + 1).padStart(3, '0');
  const item = String(((sequence - 1) % 999) + 1).padStart(3, '0');
  return `${grupo}-${item}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transportadoraId, monthsToCreate = 3, ensureNextMonthOnly = false } = await req.json();

    if (!transportadoraId) {
      return Response.json({ error: 'transportadoraId é obrigatório' }, { status: 400 });
    }

    const transportadoras = await base44.asServiceRole.entities.Transportadora.filter({ id: transportadoraId });
    const transportadora = transportadoras?.[0];

    if (!transportadora) {
      return Response.json({ error: 'Transportadora não encontrada' }, { status: 404 });
    }

    if (!transportadora.saida_referencia) {
      return Response.json({ error: 'Transportadora sem saída de referência' }, { status: 400 });
    }

    const viagensExistentes = await base44.asServiceRole.entities.EventoLogisticoSandbox.filter({ transportadora_id: transportadoraId }, '-data_saida_origem', 500);
    const hoje = startOfToday();
    const dataLimite = addDays(hoje, monthsToCreate * 30);
    const sequencias = [];

    let sequencia = 1;
    while (true) {
      const saidaManaus = addDays(transportadora.saida_referencia, (sequencia - 1) * 21);
      const chegadaManaus = addDays(saidaManaus, -7);
      if (new Date(`${chegadaManaus}T00:00:00.000Z`) > new Date(`${dataLimite}T00:00:00.000Z`)) break;
      if (new Date(`${saidaManaus}T00:00:00.000Z`) >= new Date(`${hoje}T00:00:00.000Z`) || new Date(`${chegadaManaus}T00:00:00.000Z`) >= new Date(`${hoje}T00:00:00.000Z`)) {
        sequencias.push(sequencia);
      }
      sequencia += 1;
    }

    const sequenciasFiltradas = ensureNextMonthOnly ? sequencias.slice(-1) : sequencias;

    const novasViagens = sequenciasFiltradas.map((sequencia) => {
      const saidaManaus = addDays(transportadora.saida_referencia, (sequencia - 1) * 21);
      const chegadaManaus = addDays(saidaManaus, -7);
      const etaTabatinga = addDays(saidaManaus, 7);
      const proximaChegadaManaus = addDays(saidaManaus, 21);

      return {
        nome: `${transportadora.nome} · Viagem ${sequencia}`,
        codigo: buildCodigo(sequencia),
        embarcacao_template_id: transportadoraId,
        embarcacao_nome: transportadora.nome,
        rota_nome: 'Manaus → Tabatinga',
        status_operacao: 'Atracado na Origem',
        data_referencia: chegadaManaus,
        data_chegada_manaus: chegadaManaus,
        data_saida_origem: saidaManaus,
        previsao_chegada: etaTabatinga,
        data_chegada_destino: etaTabatinga,
        previsao_retorno: proximaChegadaManaus,
        data_retorno_origem: proximaChegadaManaus,
        proxima_chegada_manaus: proximaChegadaManaus,
        ocupacao_percentual: 0,
        dias_atraso: 0,
        transportadora_id: transportadora.id,
        transportadora_nome: transportadora.nome,
        tipo_registro: 'Viagem',
        observacoes: transportadora.observacoes || '',
        chave_relacional_futura: 'viagem_id'
      };
    });

    if (novasViagens.length > 0) {
      await base44.asServiceRole.entities.EventoLogisticoSandbox.bulkCreate(novasViagens);
    }

    return Response.json({ created: novasViagens.length, viagens: novasViagens });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});