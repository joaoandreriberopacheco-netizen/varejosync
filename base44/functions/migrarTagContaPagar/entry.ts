import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Busca todas as despesas (limite 200) e filtra sem a tag
  const todos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter(
    { tipo: 'Despesa' },
    '-created_date',
    200
  );

  const alvos = todos.filter(l =>
    l.status !== 'Cancelado' &&
    !(Array.isArray(l.tags) && l.tags.includes('conta_pagar'))
  );

  // Atualiza em paralelo
  await Promise.all(alvos.map(l => {
    const tagsAtuais = Array.isArray(l.tags) ? l.tags : [];
    return base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, {
      tags: [...tagsAtuais, 'conta_pagar'],
    });
  }));

  return Response.json({ ok: true, total_encontrados: alvos.length, atualizados: alvos.length });
});