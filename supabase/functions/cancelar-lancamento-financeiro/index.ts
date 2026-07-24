// supabase/functions/cancelar-lancamento-financeiro/index.ts
// Port de base44/functions/cancelarLancamentoFinanceiro → Edge + RPC transacional.
// Contrato (paridade Base44):
//   POST /cancelar-lancamento-financeiro  (Authorization: Bearer <jwt>)
//   body: { lancamentoId: string, motivo?: string }
//   200 → { sucesso: true, cancelados: number }
//   404 → { error: 'Lançamento não encontrado' }
//   400/401/500 → { error }
import { requireUser, resolveUserName, jsonResponse, badRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { user, client } = auth;

  let body: { lancamentoId?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('JSON inválido.');
  }
  const { lancamentoId, motivo } = body;
  if (!lancamentoId) return badRequest('lancamentoId obrigatório.');

  const userName = await resolveUserName(client, user.id, user.email);

  const { data, error } = await client.rpc('cancelar_lancamento_financeiro', {
    p_lancamento_id: lancamentoId,
    p_motivo: motivo || '',
    p_user_name: userName,
  });
  if (error) return jsonResponse({ error: error.message }, 500);

  const result = data as Record<string, unknown> | null;
  if (result && result.error) {
    const msg = String(result.error);
    const status = msg.includes('não encontrado') ? 404 : 400;
    return jsonResponse(result, status);
  }
  return jsonResponse(result);
});