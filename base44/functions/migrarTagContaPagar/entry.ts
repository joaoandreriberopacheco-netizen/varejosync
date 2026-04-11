import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Busca apenas Despesas não pagas e não canceladas
  const [emAberto, vencidos] = await Promise.all([
    base44.asServiceRole.entities.LancamentoFinanceiro.filter(
      { tipo: 'Despesa', status: 'Em Aberto' }, '-created_date', 500
    ),
    base44.asServiceRole.entities.LancamentoFinanceiro.filter(
      { tipo: 'Despesa', status: 'Vencido' }, '-created_date', 500
    ),
  ]);

  const todos = [...(emAberto || []), ...(vencidos || [])];

  // Apenas os que ainda não têm a tag
  const alvos = todos.filter(l =>
    !(Array.isArray(l.tags) && l.tags.includes('conta_pagar'))
  );

  // Atualiza em paralelo em lotes de 20
  const LOTE = 20;
  for (let i = 0; i < alvos.length; i += LOTE) {
    const lote = alvos.slice(i, i + LOTE);
    await Promise.all(lote.map(l =>
      base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, {
        tags: [...(Array.isArray(l.tags) ? l.tags : []), 'conta_pagar'],
      })
    ));
  }

  return Response.json({ ok: true, total_encontrados: alvos.length, atualizados: alvos.length });
});