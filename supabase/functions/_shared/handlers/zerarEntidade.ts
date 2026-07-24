// Port automático de base44/functions/zerarEntidade/entry.ts
import type { createP38Client } from '../p38Client.ts';

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { entityId } = await req.json();

    if (!entityId) {
      return Response.json({ error: 'entityId é obrigatório' }, { status: 400 });
    }

    // Processa em lotes pequenos com retry e melhor controle
    const BATCH_SIZE = 25; // Lotes de 25 para melhor controle
    const MAX_RETRY = 3;
    const MAX_ITERATIONS = 1000; // Limite de segurança
    let totalDeleted = 0;
    let iteration = 0;
    let consecutiveEmptyBatches = 0;
    
    // Primeiro, conta o total de registros
    let totalRecords = 0;
    try {
      const firstList = await base44.asServiceRole.entities[entityId].list('', 1);
      // A API retorna metadados com o total
      totalRecords = firstList.length || 0;
    } catch (e) {
      console.warn('Erro ao contar registros:', e.message);
    }

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      let retryCount = 0;
      let batchSize = 0;
      let hasError = false;

      while (retryCount < MAX_RETRY) {
        try {
          // Lista próximo lote
          const records = await base44.asServiceRole.entities[entityId].list('', BATCH_SIZE);
          
          if (!records || records.length === 0) {
            consecutiveEmptyBatches++;
            if (consecutiveEmptyBatches >= 3) {
              // Se 3 lotes consecutivos vazios, acabou
              return Response.json({ 
                success: true, 
                deleted: totalDeleted,
                message: `Exclusão concluída: ${totalDeleted} registros removidos`
              });
            }
            hasError = false;
            break;
          }

          consecutiveEmptyBatches = 0;
          batchSize = records.length;

          // Deleta sequencialmente para garantir sucesso total
          for (const record of records) {
            try {
              await base44.asServiceRole.entities[entityId].delete(record.id);
            } catch (e) {
              console.warn(`Falha ao deletar ${entityId} ${record.id}:`, e.message);
            }
          }

          totalDeleted += batchSize;
          const percentual = totalRecords > 0 ? Math.round((totalDeleted / totalRecords) * 100) : 0;
          
          // Retorna progresso a cada lote
          console.log(`[${entityId}] Progresso: ${totalDeleted}/${totalRecords || '?'} (${percentual}%) - Lote ${iteration}`);
          
          hasError = false;
          break; // Sucesso, sai do retry
        } catch (e) {
          retryCount++;
          console.warn(`Erro ao processar lote (tentativa ${retryCount}/${MAX_RETRY}) de ${entityId}:`, e.message);
          hasError = true;
          
          if (retryCount < MAX_RETRY) {
            // Espera mais antes de retry
            await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          }
        }
      }

      // Se falhou após retries, ainda continua (pode ser um lote problemático)
      if (hasError && retryCount >= MAX_RETRY) {
        console.error(`Lote ${iteration} de ${entityId} falhou após ${MAX_RETRY} tentativas, continuando...`);
        consecutiveEmptyBatches = 0; // Reset contador
      }

      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return Response.json({ 
      success: true, 
      deleted: totalDeleted, 
      completed: true,
      message: `Exclusão concluída: ${totalDeleted} registros removidos`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
