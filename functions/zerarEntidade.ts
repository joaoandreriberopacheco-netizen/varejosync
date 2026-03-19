import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const { entityId } = await req.json();

    if (!entityId) {
      return Response.json({ error: 'entityId é obrigatório' }, { status: 400 });
    }

    // Processa em lotes para evitar timeout e sobrecarga de memória
    const BATCH_SIZE = 100;
    let totalDeleted = 0;
    let batchNum = 0;

    while (true) {
      batchNum++;
      try {
        // Lista registros em lotes pequenos
        const records = await base44.asServiceRole.entities[entityId].list('', BATCH_SIZE);
        
        if (!records || records.length === 0) {
          break; // Nenhum registro restante
        }

        // Deleta IDs do lote atual
        for (const record of records) {
          try {
            await base44.asServiceRole.entities[entityId].delete(record.id);
            totalDeleted++;
          } catch (e) {
            console.warn(`Falha ao deletar ${entityId} ${record.id}:`, e.message);
          }
        }

        // Pequena pausa entre lotes para evitar throttling
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.error(`Erro no lote ${batchNum} de ${entityId}:`, e.message);
        break;
      }
    }

    return Response.json({ success: true, deleted: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});