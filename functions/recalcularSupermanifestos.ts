import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { atualizarTotaisSupermanifesto } from './atualizarTotaisSupermanifesto.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Listar todos os supermanifestos
    const supermanifestos = await base44.asServiceRole.entities.Supermanifesto.list();
    
    const results = [];
    
    // 2. Para cada um, chamar a função de atualização
    for (const sm of supermanifestos) {
      await atualizarTotaisSupermanifesto(sm.id, base44);
      results.push({ id: sm.id, numero: sm.numero, status: 'updated' });
    }

    return Response.json({ 
      success: true, 
      processed: results.length,
      details: results 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});