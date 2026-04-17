/**
 * Manutenção: remove LancamentoFinanceiro gerados automaticamente pela janela de recorrência
 * (tag lf_gerado_auto ou observação com "gerado automaticamente (janela recorrente)"),
 * com data_vencimento estritamente anterior à data de corte.
 *
 * Segurança: apenas role admin; dryRun por defeito; delete exige confirmacao explícita.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TAG_AUTO = 'lf_gerado_auto';
const OBS_AUTO = 'gerado automaticamente (janela recorrente)';
const CONFIRMACAO_DELETE = 'EXCLUIR_LF_AUTO';

function isAutoGerado(l: Record<string, unknown>): boolean {
  const tags = Array.isArray(l.tags) ? (l.tags as string[]) : [];
  const obs = String(l.observacoes || '');
  return tags.includes(TAG_AUTO) || obs.toLowerCase().includes(OBS_AUTO.toLowerCase());
}

function ymdBefore(a: string | undefined | null, corte: string): boolean {
  const s = (a || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return s < corte;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dataCorte = typeof body.dataCorte === 'string' ? body.dataCorte.slice(0, 10) : '2026-04-01';
    const dryRun = body.dryRun !== false;
    const incluirPagos = Boolean(body.incluirPagos);
    const confirmacao = typeof body.confirmacao === 'string' ? body.confirmacao : '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataCorte)) {
      return Response.json({ error: 'dataCorte inválida. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const lista = await base44.asServiceRole.entities.LancamentoFinanceiro.list('-data_vencimento', 8000);
    const candidatos = (lista || []).filter((l: Record<string, unknown>) => {
      if (l.tipo !== 'Despesa') return false;
      if (!ymdBefore(l.data_vencimento as string, dataCorte)) return false;
      if (!incluirPagos && l.status !== 'Em Aberto') return false;
      return isAutoGerado(l);
    });

    const ids = candidatos.map((l: { id: string }) => l.id);

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        dataCorte,
        incluirPagos,
        total: ids.length,
        ids: ids.slice(0, 200),
        truncado: ids.length > 200,
        mensagem:
          'dryRun=true (omissão). Para apagar, envie dryRun:false e confirmacao:"EXCLUIR_LF_AUTO".',
      });
    }

    if (confirmacao !== CONFIRMACAO_DELETE) {
      return Response.json(
        {
          error: `Confirmação inválida. Envie confirmacao: "${CONFIRMACAO_DELETE}" junto com dryRun:false.`,
          totalSeriam: ids.length,
        },
        { status: 400 }
      );
    }

    let apagados = 0;
    const erros: string[] = [];
    for (const id of ids) {
      try {
        await base44.asServiceRole.entities.LancamentoFinanceiro.delete(id);
        apagados += 1;
      } catch (e) {
        erros.push(`${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return Response.json({
      ok: true,
      dryRun: false,
      dataCorte,
      apagados,
      totalAlvo: ids.length,
      erros: erros.slice(0, 50),
      executadoPor: user.email || user.id,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
});
