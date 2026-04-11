import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const despesas = await base44.asServiceRole.entities.LancamentoFinanceiro.filter(
    { tipo: 'Despesa' }, '-created_date', 500
  );

  let removidos = 0;
  let adicionados = 0;

  for (const l of (despesas || [])) {
    const tagsAtuais = Array.isArray(l.tags) ? l.tags : [];
    const temTag = tagsAtuais.includes('conta_pagar');
    const deveTer = l.status !== 'Pago' && l.status !== 'Cancelado';

    if (temTag && !deveTer) {
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, {
        tags: tagsAtuais.filter(t => t !== 'conta_pagar'),
      });
      removidos++;
    } else if (!temTag && deveTer) {
      await base44.asServiceRole.entities.LancamentoFinanceiro.update(l.id, {
        tags: [...tagsAtuais, 'conta_pagar'],
      });
      adicionados++;
    }
  }

  return Response.json({ ok: true, removidos, adicionados, total_processado: despesas?.length ?? 0 });
});