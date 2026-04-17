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

  // Buscar lançamentos do tipo Despesa antes da dataCorte
  const statusFiltros = incluirPagos
    ? ['Em Aberto', 'Pago']
    : ['Em Aberto'];

  let candidatos = [];

  for (const status of statusFiltros) {
    const lotes = await base44.asServiceRole.entities.LancamentoFinanceiro.filter({
      tipo: 'Despesa',
      status,
    });
    candidatos.push(...lotes);
  }

  // Filtrar por dataCorte (estritamente anterior) e critério de "gerado automaticamente"
  const elegíveis = candidatos.filter((lf) => {
    if (!lf.data_vencimento) return false;
    if (lf.data_vencimento >= dataCorte) return false;

    const temTag = Array.isArray(lf.tags) && lf.tags.includes('lf_gerado_auto');
    const temObs = typeof lf.observacoes === 'string' &&
      lf.observacoes.toLowerCase().includes('gerado automaticamente (janela recorrente)');

    return temTag || temObs;
  });

  if (dryRun) {
    return Response.json({
      dryRun: true,
      dataCorte,
      incluirPagos,
      total: elegíveis.length,
      ids: elegíveis.slice(0, 500).map((lf) => lf.id),
      executadoPor: user.email,
    });
  }

  // Exclusão real
  const erros = [];
  const deletados = [];

  for (const lf of elegíveis) {
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
    totalElegivel: elegíveis.length,
    totalDeletado: deletados.length,
    totalErro: erros.length,
    erros,
    executadoPor: user.email,
  });
});