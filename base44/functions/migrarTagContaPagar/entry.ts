import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Busca todas as despesas que não estejam canceladas
  const despesas = await base44.asServiceRole.entities.LancamentoFinanceiro.filter(
    { tipo: 'Despesa' },
    '-created_date',
    500
  );

  const alvos = despesas.filter(l =>
    l.status !== 'Cancelado' &&
    !(Array.isArray(l.tags) && l.tags.includes('conta_pagar'))
  );

  let atualizados = 0;
  for (const l of alvos) {
    const tagsAtuais = Array.isArray(l.tags) ? l.tags : [];
    await base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, {
      tags: [...tagsAtuais, 'conta_pagar'],
    });
    atualizados++;
  }

  return Response.json({
    ok: true,
    total_despesas: despesas.length,
    ja_tinham_tag: despesas.length - alvos.length,
    atualizados,
  });
});