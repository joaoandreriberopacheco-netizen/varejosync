import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONFIRMACAO_ESPERADA = 'EXCLUIR_LF_AUTO';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return Response.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  }

  const body = await req.json();
  const {
    dataCorte,
    dryRun = true,
    incluirPagos = false,
    confirmacao,
  } = body;

  if (!dataCorte || !/^\d{4}-\d{2}-\d{2}$/.test(dataCorte)) {
    return Response.json({ error: 'dataCorte inválida. Use formato YYYY-MM-DD.' }, { status: 400 });
  }

  if (!dryRun && confirmacao !== CONFIRMACAO_ESPERADA) {
    return Response.json({
      error: `Para executar a exclusão real, envie confirmacao: "${CONFIRMACAO_ESPERADA}".`
    }, { status: 400 });
  }

  const statusFiltros = incluirPagos
    ? ['Em Aberto', 'Vencido', 'Pago']
    : ['Em Aberto', 'Vencido'];

  let candidatos = [];

  for (const status of statusFiltros) {
    const lotes = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      tipo: 'Despesa',
      status,
    });
    candidatos.push(...lotes);
  }

  // Critérios de "gerado automaticamente":
  // 1. tag 'lf_gerado_auto' (critério original)
  // 2. is_recorrente=true + grupo_lancamento_id preenchido (lançamentos gerados por gerarContasPrevistasRecorrentes)
  // 3. tag 'recorrente' + grupo_lancamento_id preenchido
  const elegiveis = candidatos.filter((lf) => {
    if (!lf.data_vencimento) return false;
    if (lf.data_vencimento >= dataCorte) return false;

    const tags = Array.isArray(lf.tags) ? lf.tags : [];
    const obs = typeof lf.observacoes === 'string' ? lf.observacoes.toLowerCase() : '';

    const criterio1 = tags.includes('lf_gerado_auto');
    const criterio2 = obs.includes('gerado automaticamente (janela recorrente)');
    const criterio3 = lf.is_recorrente === true && !!lf.grupo_lancamento_id;
    const criterio4 = tags.includes('recorrente') && !!lf.grupo_lancamento_id;

    return criterio1 || criterio2 || criterio3 || criterio4;
  });

  if (dryRun) {
    return Response.json({
      dryRun: true,
      dataCorte,
      incluirPagos,
      total: elegiveis.length,
      amostra: elegiveis.slice(0, 20).map((lf) => ({
        id: lf.id,
        descricao: lf.descricao,
        data_vencimento: lf.data_vencimento,
        status: lf.status,
        tags: lf.tags,
        grupo_lancamento_id: lf.grupo_lancamento_id,
      })),
      executadoPor: user.email,
    });
  }

  // Exclusão real
  const erros = [];
  const deletados = [];

  for (const lf of elegiveis) {
    try {
      await base44.asServiceRole.entities.LancamentoFinanceiro.delete(lf.id);
      deletados.push(lf.id);
    } catch (e) {
      erros.push({ id: lf.id, erro: e.message });
    }
  }

  return Response.json({
    dryRun: false,
    dataCorte,
    incluirPagos,
    totalElegivel: elegiveis.length,
    totalDeletado: deletados.length,
    totalErro: erros.length,
    erros,
    executadoPor: user.email,
  });
});