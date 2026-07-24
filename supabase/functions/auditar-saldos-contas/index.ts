// supabase/functions/auditar-saldos-contas/index.ts
// Port de base44/functions/auditarSaldosContas → Edge que chama RPC read-only.
// Contrato (paridade Base44):
//   POST /auditar-saldos-contas  (Authorization: Bearer <jwt>)
//   200 → { total_contas, total_lancamentos_validos, contas: [...] }
//   401 → { error }  | 500 → { error }
import { requireUser, jsonResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const { data, error } = await client.rpc('auditar_saldos_contas');
  if (error) return jsonResponse({ error: error.message }, 500);
  // RPC devolve { error } em caso de excepção interna.
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    return jsonResponse(data, 500);
  }
  return jsonResponse(data);
});