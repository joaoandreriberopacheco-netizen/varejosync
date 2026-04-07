import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function monthKey(dateString) {
  return dateString.slice(0, 7);
}

function buildCodigo(index, saidaManaus) {
  const base = saidaManaus.replaceAll('-', '').slice(2);
  return `VIG-${base}-${String(index + 1).padStart(2, '0')}`;
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
    const mesesExistentes = new Set(viagensExistentes.map((item) => monthKey(item.data_saida_origem || item.data_referencia || '')));

    const offsets = ensureNextMonthOnly
      ? (() => {
          const nextMonthDate = addMonths(transportadora.saida_referencia, 1);
          const nextMonth = monthKey(nextMonthDate);
          return mesesExistentes.has(nextMonth) ? [] : [1];
        })()
      : Array.from({ length: monthsToCreate }, (_, index) => index);

    const novasViagens = offsets.map((offset, index) => {
      const saidaManaus = addMonths(transportadora.saida_referencia, offset);
      const chegadaManaus = addDays(saidaManaus, -7);
      const etaTabatinga = addDays(saidaManaus, 7);
      const proximaChegadaManaus = addDays(saidaManaus, 21);

      return {
        nome: `${transportadora.nome} · ${saidaManaus}`,
        codigo: buildCodigo(viagensExistentes.length + index, saidaManaus),
        embarcacao_template_id: transportadoraId,
        embarcacao_nome: transportadora.nome,
        rota_nome: 'Manaus → Tabatinga',
        status_operacao: 'Atracado na Origem',
        data_referencia: saidaManaus,
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