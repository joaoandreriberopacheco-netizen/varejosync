import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contas = await base44.entities.ContasFinanceiras.list();

    const todosLancamentos = [];
    const pageSize = 200;
    let skip = 0;

    while (true) {
      const lote = await base44.entities.LancamentoFinanceiro.list('-created_date', pageSize, skip);
      if (!lote || lote.length === 0) break;
      todosLancamentos.push(...lote);
      if (lote.length < pageSize) break;
      skip += pageSize;
    }

    const lancamentosValidos = todosLancamentos.filter((lancamento) => {
      const data = lancamento.data || lancamento;
      return data?.status === 'Pago' && data?.conta_financeira_id;
    });

    const resultado = contas.map((conta) => {
      const contaData = conta.data || conta;
      const saldoInicial = Number(contaData.saldo_inicial || 0);
      const lancamentosConta = lancamentosValidos.filter((lancamento) => {
        const data = lancamento.data || lancamento;
        return data.conta_financeira_id === conta.id;
      });

      const totalReceitas = lancamentosConta
        .filter((l) => (l.data || l).tipo === 'Receita')
        .reduce((sum, l) => sum + Number((l.data || l).valor || 0), 0);

      const totalDespesas = lancamentosConta
        .filter((l) => (l.data || l).tipo === 'Despesa')
        .reduce((sum, l) => sum + Number((l.data || l).valor || 0), 0);

      const saldoCalculado = saldoInicial + totalReceitas - totalDespesas;

      return {
        conta_id: conta.id,
        conta_nome: contaData.nome,
        saldo_inicial: saldoInicial,
        total_receitas_pagas: totalReceitas,
        total_despesas_pagas: totalDespesas,
        saldo_calculado: Number(saldoCalculado.toFixed(2)),
        saldo_atual_registrado: Number(contaData.saldo_atual || 0),
        diferenca: Number((saldoCalculado - Number(contaData.saldo_atual || 0)).toFixed(2)),
        quantidade_lancamentos_validos: lancamentosConta.length,
      };
    });

    return Response.json({
      total_contas: resultado.length,
      total_lancamentos_validos: lancamentosValidos.length,
      contas: resultado,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});