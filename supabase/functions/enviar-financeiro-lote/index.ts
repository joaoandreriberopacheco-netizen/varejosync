// Port de base44/functions/enviarFinanceiroLote → Edge itera pedidos, RPC por pedido.
import { requireUser, resolveUserName, jsonResponse, badRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user, client } = auth;

  let body: {
    pedidos?: Array<Record<string, unknown>>;
    formaPagamento?: string;
    dataPrimeiroVencimento?: string;
    numParcelas?: number;
    intervaloParcelasDias?: number;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido.');
  }

  const pedidos = body?.pedidos;
  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    return badRequest('Nenhum pedido informado');
  }

  const userName = await resolveUserName(client, user.id, user.email);
  const opts = {
    forma_pagamento: body.formaPagamento || 'Parcelado',
    data_primeiro_vencimento: body.dataPrimeiroVencimento || '',
    num_parcelas: String(Math.max(1, Number(body.numParcelas) || 1)),
    intervalo_parcelas_dias: String(Math.max(1, Number(body.intervaloParcelasDias) || 30)),
    user_name: userName,
    user_id: user.id,
  };

  const idsVistos = new Set<string>();
  const enviados: string[] = [];
  const erros: Array<{ id: string; mensagem: string }> = [];

  for (const pedido of pedidos) {
    const id = String(pedido?.id || '');
    if (!id || idsVistos.has(id)) continue;
    idsVistos.add(id);

    const { data, error } = await client.rpc('enviar_financeiro_lote_um_pedido', {
      p_payload: { pedido_id: id, ...opts },
    });
    if (error) {
      erros.push({ id, mensagem: error.message });
      continue;
    }
    const result = data as Record<string, unknown> | null;
    if (result?.error) {
      erros.push({ id, mensagem: String(result.error) });
      continue;
    }
    enviados.push(id);
  }

  if (!enviados.length && erros.length) {
    return jsonResponse({ error: erros.map((e) => e.mensagem).join(' · ') }, 400);
  }

  return jsonResponse({ success: true, quantidade: enviados.length, enviados, erros });
});
