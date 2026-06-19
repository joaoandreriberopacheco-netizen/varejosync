import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Rotina diária (agendar 09:00 America/Rio_Branco, GMT-5).
 * Credita no fluxo as vendas em cartão de crédito cuja data prevista chegou:
 * marca como Pago com data_pagamento = data de liquidação prevista.
 * Até lá ficam apenas em Contas Abertas (conta a receber).
 */
function getHojeBr() {
  const agora = new Date();
  return new Date(agora.getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const hojeStr = getHojeBr();
    const svc = base44.asServiceRole;

    const abertos = await svc.entities.LancamentoFinanceiro.filter({ status: 'Em Aberto' });

    const candidatos = (abertos || []).filter(
      (l) =>
        l.tipo === 'Receita' &&
        l.forma_pagamento_tipo === 'Cartão Crédito' &&
        l.status_conciliacao === 'Pendente' &&
        !l.data_pagamento,
    );

    let processados = 0;
    const erros: { id: string; erro: string }[] = [];

    for (const l of candidatos) {
      const dataLiquidacao = (l.data_liquidacao_prevista || l.data_vencimento || '').slice(0, 10);
      if (!dataLiquidacao || dataLiquidacao > hojeStr) continue;

      try {
        await svc.entities.LancamentoFinanceiro.update(l.id, {
          status: 'Pago',
          data_pagamento: dataLiquidacao,
        });
        processados++;
      } catch (err) {
        erros.push({ id: l.id, erro: (err as Error).message });
      }
    }

    return Response.json({
      success: true,
      hoje: hojeStr,
      candidatos: candidatos.length,
      processados,
      erros,
      mensagem: `${processados} venda(s) em cartão de crédito creditada(s) no fluxo.`,
    });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
});
