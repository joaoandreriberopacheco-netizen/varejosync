import { atualizarMetasEstoque } from '@/functions/atualizarMetasEstoque';

export const METAS_ESTOQUE_BATCH_SIZE = 50;

function normalizeJobResponse(resp) {
  const data = resp?.data ?? resp;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { mensagem: data };
    }
  }
  return data && typeof data === 'object' ? data : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractAtualizarMetasEstoqueError(error) {
  const msg = error?.message || String(error);
  const match = msg.match(/HTTP (\d+)/);
  if (match) {
    return msg.replace(/^.*?:\s*/, '').trim() || `Erro HTTP ${match[1]}`;
  }
  return msg;
}

/**
 * Executa o job servidor que grava estoque mínimo (ponto de pedido) e ideal no cadastro.
 * @param {{
 *   somenteMetasVazias?: boolean,
 *   batchSize?: number,
 *   onProgress?: (progress: {
 *     phase: 'preparing' | 'writing',
 *     bloco?: number,
 *     totalBlocos?: number,
 *     atualizados?: number,
 *     totalPendentes?: number,
 *     etapa?: string,
 *   }) => void,
 *   shouldAbort?: () => boolean,
 * }} options
 */
export async function runAtualizarMetasEstoqueJob(options = {}) {
  const {
    somenteMetasVazias = false,
    batchSize = METAS_ESTOQUE_BATCH_SIZE,
    onProgress,
    shouldAbort,
  } = options;

  onProgress?.({ phase: 'preparing', etapa: 'Analisando vendas 90d, dias com estoque e lead time…' });

  const prepResp = await atualizarMetasEstoque({
    fase: 'preparar',
    somente_metas_vazias: somenteMetasVazias,
    modo: 'manual',
    batch_size: batchSize,
  });
  const prep = normalizeJobResponse(prepResp);

  if (prep.error) throw new Error(prep.error);
  if (prep.status === 'erro') throw new Error(prep.error || 'Falha ao preparar o job.');

  if (prep.status === 'sem_alteracao' || prep.concluido) {
    return {
      status: 'sem_alteracao',
      mensagem: prep.mensagem || 'Nenhum produto pendente de atualização.',
      somente_metas_vazias: somenteMetasVazias,
      atualizados: 0,
      total_pendentes: 0,
    };
  }

  const jobCache = prep.job_cache;
  if (!jobCache?.run_id || !Array.isArray(jobCache.produto_ids)) {
    throw new Error(
      'Resposta incompleta do servidor. Atualize a função atualizarMetasEstoque no Base44.',
    );
  }

  const runId = prep.run_id || jobCache.run_id;
  const totalPendentes = prep.total_pendentes ?? jobCache.produto_ids.length;
  const totalBlocos = prep.total_blocos ?? Math.ceil(totalPendentes / batchSize);
  let offset = 0;
  let totalAtualizados = 0;

  onProgress?.({
    phase: 'writing',
    bloco: 0,
    totalBlocos,
    atualizados: 0,
    totalPendentes,
    etapa: 'Gravando ponto de pedido e estoque ideal nos produtos…',
  });

  while (offset < totalPendentes) {
    if (shouldAbort?.()) throw new Error('Operação cancelada.');

    const gravarResp = await atualizarMetasEstoque({
      fase: 'gravar',
      run_id: runId,
      job_cache: jobCache,
      offset,
      batch_size: batchSize,
      modo: 'manual',
    });
    const bloco = normalizeJobResponse(gravarResp);

    if (bloco.error || bloco.status === 'erro') {
      throw new Error(bloco.error || 'Falha ao gravar um bloco de produtos.');
    }

    totalAtualizados += bloco.atualizados ?? 0;
    offset = bloco.proximo_offset ?? offset + batchSize;

    onProgress?.({
      phase: 'writing',
      bloco: bloco.bloco_atual ?? Math.ceil(offset / batchSize),
      totalBlocos: bloco.total_blocos ?? totalBlocos,
      atualizados: totalAtualizados,
      totalPendentes,
      etapa: 'Gravando ponto de pedido e estoque ideal nos produtos…',
    });

    if (bloco.concluido) break;
    await sleep(150);
  }

  return {
    status: 'sucesso',
    atualizados: totalAtualizados,
    total_pendentes: totalPendentes,
    total_blocos: totalBlocos,
    somente_metas_vazias: somenteMetasVazias,
    ignorados_sem_venda: prep.ignorados_sem_venda,
    timestamp: new Date().toISOString(),
  };
}
