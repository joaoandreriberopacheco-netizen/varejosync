// Port automático de base44/functions/sincronizarExclusaoContaRecorrente/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const contaRecorrenteId = payload?.event?.entity_id || payload?.data?.id;

    if (!contaRecorrenteId) {
      return Response.json({ success: true, deletedContasPrevistas: 0, deletedLancamentos: 0 });
    }

    const contasPrevistas = await base44.asServiceRole.entities.ContaPrevista.filter(
      { conta_recorrente_id: contaRecorrenteId },
      '-created_date',
      500
    );

    const contaPrevistaIds = (contasPrevistas || []).map((item) => item.id).filter(Boolean);

    let deletedLancamentos = 0;
    if (contaPrevistaIds.length > 0) {
      const lancamentos = await base44.asServiceRole.entities.LancamentoFinanceiro.filter(
        { referencia_tipo: 'ContaPrevista' },
        '-created_date',
        1000
      );

      const vinculados = (lancamentos || []).filter((item) => contaPrevistaIds.includes(item.referencia_id));

      for (const lancamento of vinculados) {
        await base44.asServiceRole.entities.LancamentoFinanceiro.delete(lancamento.id);
        deletedLancamentos += 1;
      }

      for (const conta of contasPrevistas) {
        await base44.asServiceRole.entities.ContaPrevista.delete(conta.id);
      }
    }

    return Response.json({
      success: true,
      conta_recorrente_id: contaRecorrenteId,
      deletedContasPrevistas: contaPrevistaIds.length,
      deletedLancamentos,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
