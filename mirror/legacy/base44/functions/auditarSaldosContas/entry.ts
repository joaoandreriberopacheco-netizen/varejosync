import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contas = await base44.entities.ContasFinanceiras.list();
    const pageSize = 200;
    let skip = 0;
    let todosLancamentos = [];

    while (true) {
      const lote = await base44.entities.LancamentoFinanceiro.list('-created_date', pageSize, skip);
      if (!lote.length) break;
      todosLancamentos = todosLancamentos.concat(lote);
      if (lote.length < pageSize) break;
      skip += pageSize;
    }

    const lancamentosValidos = todosLancamentos.filter((lancamento) =>
      lancamento.status === 'Pago' && lancamento.conta_financeira_id
    );

    const contasAuditadas = contas.map((conta) => {
      const saldoInicial = Number(conta.saldo_inicial || 0);
      const lancamentosConta = lancamentosValidos.filter(
        (lancamento) => lancamento.conta_financeira_id === conta.id
      );

      const totalReceitas = lancamentosConta
        .filter((lancamento) => lancamento.tipo === 'Receita')
        .reduce((sum, lancamento) => sum + Number(lancamento.valor || 0), 0);

      const totalDespesas = lancamentosConta
        .filter((lancamento) => lancamento.tipo === 'Despesa')
        .reduce((sum, lancamento) => sum + Number(lancamento.valor || 0), 0);

      const saldoCalculado = saldoInicial + totalReceitas - totalDespesas;
      const saldoRegistrado = Number(conta.saldo_atual || 0);

      return {
        conta_id: conta.id,
        conta_nome: conta.nome,
        saldo_inicial: saldoInicial,
        receitas_validas: Number(totalReceitas.toFixed(2)),
        despesas_validas: Number(totalDespesas.toFixed(2)),
        saldo_calculado: Number(saldoCalculado.toFixed(2)),
        saldo_registrado: saldoRegistrado,
        diferenca: Number((saldoCalculado - saldoRegistrado).toFixed(2)),
        quantidade_lancamentos_validos: lancamentosConta.length,
      };
    });

    return Response.json({
      total_contas: contasAuditadas.length,
      total_lancamentos_validos: lancamentosValidos.length,
      contas: contasAuditadas,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});