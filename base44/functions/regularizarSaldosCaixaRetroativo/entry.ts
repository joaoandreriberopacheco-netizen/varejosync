import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BATCH_SIZE = 50;

function toNumber(value) {
  return Number(value || 0);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const skip = Number(payload.skip || 0);
    const dryRun = payload.dryRun !== false;

    const contas = await base44.asServiceRole.entities.ContasFinanceiras.list();
    const turnos = await base44.asServiceRole.entities.TurnoCaixa.list();
    const movimentos = await base44.asServiceRole.entities.MovimentosCaixa.list('-created_date', BATCH_SIZE, skip);
    const lancamentosDespesas = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({ tipo: 'Despesa', status: 'Pago' }, '-created_date', 2000);

    const caixaGeral = contas.find((conta) => conta.is_caixa_geral === true);
    if (!caixaGeral) {
      return Response.json({ error: 'Caixa Geral não encontrado.' }, { status: 400 });
    }

    const contasMap = new Map(contas.map((conta) => [conta.id, conta]));
    const turnosMap = new Map(turnos.map((turno) => [turno.id, turno]));
    const despesasPorTurno = new Map();

    for (const lancamento of lancamentosDespesas) {
      if (!lancamento.turno_caixa_id) continue;
      if (lancamento.referencia_tipo === 'MovimentosCaixa') continue;
      const current = despesasPorTurno.get(lancamento.turno_caixa_id) || 0;
      despesasPorTurno.set(lancamento.turno_caixa_id, current + toNumber(lancamento.valor));
    }

    const ajustesConta = new Map();
    const atualizacoesMovimento = [];
    const processados = [];

    for (const movimento of movimentos) {
      if (movimento.status_registro === 'Cancelado') continue;
      if (!movimento.conta_id) continue;

      const contaOrigem = contasMap.get(movimento.conta_id);
      if (!contaOrigem) continue;

      const turno = movimento.turno_caixa_id ? turnosMap.get(movimento.turno_caixa_id) : null;
      const valor = toNumber(movimento.valor);
      const observacao = movimento.observacao || '';
      const isRecolhimento = movimento.tipo === 'Sangria' || movimento.tipo === 'Recolhimento de Caixa';
      const isFechamento = observacao.includes('Fechamento de turno');

      if (!isRecolhimento) continue;

      const origemAtual = ajustesConta.get(contaOrigem.id) ?? 0;
      ajustesConta.set(contaOrigem.id, origemAtual - valor);

      const geralAtual = ajustesConta.get(caixaGeral.id) ?? 0;
      ajustesConta.set(caixaGeral.id, geralAtual + valor);

      const novoTipo = isFechamento ? 'Fechamento de Caixa' : 'Recolhimento de Caixa';
      const novaObservacao = isFechamento
        ? observacao || `Fechamento de turno ${turno?.numero || ''} - Transferido para ${caixaGeral.nome}`
        : (observacao.includes('Transferência para') ? observacao : `Transferência para ${caixaGeral.nome}${observacao ? `. ${observacao}` : ''}`);

      atualizacoesMovimento.push({
        id: movimento.id,
        tipo: novoTipo,
        observacao: novaObservacao,
      });

      processados.push({
        movimento_id: movimento.id,
        numero: movimento.numero,
        conta_origem: contaOrigem.nome,
        conta_destino: caixaGeral.nome,
        valor,
        tipo_novo: novoTipo,
      });
    }

    const ajustesTurno = [];
    for (const turno of turnos) {
      const movimentosTurno = movimentos.filter((movimento) => movimento.turno_caixa_id === turno.id && movimento.status_registro !== 'Cancelado');
      if (movimentosTurno.length === 0) continue;

      const totalReforcos = movimentosTurno.filter((movimento) => movimento.tipo === 'Reforço').reduce((sum, movimento) => sum + toNumber(movimento.valor), 0);
      const totalRecolhimentos = movimentosTurno.filter((movimento) => movimento.tipo === 'Sangria' || movimento.tipo === 'Recolhimento de Caixa').reduce((sum, movimento) => sum + toNumber(movimento.valor), 0);
      const totalDespesas = despesasPorTurno.get(turno.id) || 0;

      ajustesTurno.push({
        id: turno.id,
        total_reforcos: totalReforcos,
        total_sangrias: totalRecolhimentos,
        total_despesas: totalDespesas,
      });
    }

    if (!dryRun) {
      for (const [contaId, delta] of ajustesConta.entries()) {
        const conta = contasMap.get(contaId);
        if (!conta || delta === 0) continue;
        await base44.asServiceRole.entities.ContasFinanceiras.update(contaId, {
          saldo_atual: toNumber(conta.saldo_atual) + delta,
        });
      }

      for (const movimento of atualizacoesMovimento) {
        await base44.asServiceRole.entities.MovimentosCaixa.update(movimento.id, {
          tipo: movimento.tipo,
          observacao: movimento.observacao,
        });
      }

      for (const turno of ajustesTurno) {
        await base44.asServiceRole.entities.TurnoCaixa.update(turno.id, {
          total_reforcos: turno.total_reforcos,
          total_sangrias: turno.total_sangrias,
          total_despesas: turno.total_despesas,
        });
      }
    }

    return Response.json({
      success: true,
      dryRun,
      batchSize: movimentos.length,
      nextSkip: skip + movimentos.length,
      processedCount: processados.length,
      ajustesConta: Array.from(ajustesConta.entries()).map(([contaId, delta]) => ({
        conta_id: contaId,
        conta_nome: contasMap.get(contaId)?.nome,
        delta,
      })),
      movimentos: processados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});