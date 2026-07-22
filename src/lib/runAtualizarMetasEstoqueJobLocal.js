import { base44 } from '@/api/base44Client';
import { calcularMetasEstoqueParaProduto } from '@/lib/calcularMetasEstoqueVendas';
import { fetchPedidosVenda90d } from '@/lib/fetchPedidosVenda90d';
import {
  fetchMovimentacoesEstoque90d,
  groupMovimentacoesPorProduto,
} from '@/lib/fetchMovimentacoesEstoque90d';

const UPDATE_CONCURRENCY = 5;

function produtoMetasVazio(produto) {
  const em = Number(produto?.estoque_minimo) || 0;
  const ei = Number(produto?.estoque_ideal) || 0;
  return em <= 0 && ei <= 0;
}

function buildUpdatePayload(metas) {
  return {
    estoque_minimo: metas.estoque_minimo,
    estoque_ideal: metas.estoque_ideal,
    venda_media_dia: metas.venda_media_dia,
    metas_estoque_lead_time_dias: metas.lead_time_dias,
    metas_estoque_unidade_compra: metas.unidade_vitrine_compra,
    metas_estoque_quantidade_limpa_90d: metas.quantidade_limpa_90d,
    metas_estoque_outliers_descartados: metas.outliers_descartados,
    metas_estoque_dias_com_estoque: metas.dias_com_estoque,
    metas_estoque_atualizado_em: metas.metas_estoque_atualizado_em,
    metas_estoque_versao: metas.metas_estoque_versao,
  };
}

async function fetchProdutosAtivos() {
  const todos = [];
  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await base44.entities.Produto.filter(
      { tipo: 'Produto', ativo: true },
      '-created_date',
      pageSize,
      skip,
    );
    const rows = Array.isArray(batch) ? batch : [];
    if (!rows.length) break;
    todos.push(...rows);
    if (rows.length < pageSize) break;
    skip += pageSize;
  }

  return todos;
}

function computeLocalUpdates(produtos, pedidos90d, movsPorProduto, somenteMetasVazias) {
  const updates = [];
  let ignorados_trava_manual = 0;
  let ignorados_sem_venda = 0;

  for (const produto of produtos) {
    if (produto.estoque_trava_manual === true) {
      ignorados_trava_manual += 1;
      continue;
    }
    if (somenteMetasVazias && !produtoMetasVazio(produto)) continue;

    const metas = calcularMetasEstoqueParaProduto(
      produto,
      pedidos90d,
      { movimentacoes: movsPorProduto[produto.id] || [] },
    );

    if (!metas.atualizar) {
      ignorados_sem_venda += 1;
      continue;
    }

    updates.push({
      id: produto.id,
      data: buildUpdatePayload(metas),
    });
  }

  return { updates, ignorados_trava_manual, ignorados_sem_venda };
}

async function gravarBlocoLocal(payload) {
  const minimalPayload = (data) => ({
    estoque_minimo: data.estoque_minimo,
    estoque_ideal: data.estoque_ideal,
  });

  for (let i = 0; i < payload.length; i += UPDATE_CONCURRENCY) {
    const chunk = payload.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(
      chunk.map(async ({ id, data }) => {
        try {
          await base44.entities.Produto.update(id, data);
        } catch {
          await base44.entities.Produto.update(id, minimalPayload(data));
        }
      }),
    );
  }
}

/**
 * Fallback no browser quando o job servidor não consegue guardar cache em ConfiguracoesVenda.
 */
export async function runAtualizarMetasEstoqueJobLocal(options = {}) {
  const {
    somenteMetasVazias = false,
    batchSize = 50,
    onProgress,
    shouldAbort,
  } = options;

  onProgress?.({
    phase: 'preparing',
    etapa: 'Calculando pontos de pedido localmente (vendas 90d e lead time)…',
  });

  const [produtos, pedidos90d, movimentacoes] = await Promise.all([
    fetchProdutosAtivos(),
    fetchPedidosVenda90d(),
    fetchMovimentacoesEstoque90d(),
  ]);

  const movsPorProduto = groupMovimentacoesPorProduto(movimentacoes);
  const { updates, ignorados_trava_manual, ignorados_sem_venda } = computeLocalUpdates(
    produtos,
    pedidos90d,
    movsPorProduto,
    somenteMetasVazias,
  );

  if (!updates.length) {
    return {
      status: 'sem_alteracao',
      mensagem: somenteMetasVazias
        ? 'Nenhum produto sem metas de estoque para preencher.'
        : 'Nenhum produto precisava de atualização.',
      somente_metas_vazias: somenteMetasVazias,
      atualizados: 0,
      total_pendentes: 0,
      ignorados_trava_manual,
      ignorados_sem_venda,
      modo: 'local',
    };
  }

  const totalPendentes = updates.length;
  const totalBlocos = Math.ceil(totalPendentes / batchSize);
  let totalAtualizados = 0;

  onProgress?.({
    phase: 'writing',
    bloco: 0,
    totalBlocos,
    atualizados: 0,
    totalPendentes,
    etapa: 'Gravando ponto de pedido e estoque ideal nos produtos…',
  });

  for (let offset = 0; offset < totalPendentes; offset += batchSize) {
    if (shouldAbort?.()) throw new Error('Operação cancelada.');

    const bloco = updates.slice(offset, offset + batchSize);
    await gravarBlocoLocal(bloco);
    totalAtualizados += bloco.length;

    onProgress?.({
      phase: 'writing',
      bloco: Math.ceil((offset + bloco.length) / batchSize),
      totalBlocos,
      atualizados: totalAtualizados,
      totalPendentes,
      etapa: 'Gravando ponto de pedido e estoque ideal nos produtos…',
    });
  }

  return {
    status: 'sucesso',
    atualizados: totalAtualizados,
    total_pendentes: totalPendentes,
    total_blocos: totalBlocos,
    somente_metas_vazias: somenteMetasVazias,
    ignorados_trava_manual,
    ignorados_sem_venda,
    modo: 'local',
    timestamp: new Date().toISOString(),
  };
}
