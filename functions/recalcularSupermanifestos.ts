import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function atualizarTotais(supermanifestoId, base44) {
  if (!supermanifestoId) return;

  // 1. Buscar todos os manifestos vinculados a este supermanifesto
  const manifestos = await base44.asServiceRole.entities.ManifestoEntrada.filter({
    supermanifesto_id: supermanifestoId
  });

  if (!manifestos || manifestos.length === 0) {
    await base44.asServiceRole.entities.Supermanifesto.update(supermanifestoId, {
      valor_total_estimado: 0,
      quantidade_volumes_estimada: 0,
      peso_total_bruto_kg: 0
    });
    return;
  }

  // 2. Calcular totais
  let valorTotal = 0;
  let volumesTotal = 0;
  let pesoTotal = 0;

  await Promise.all(manifestos.map(async (m) => {
    // Soma volumes do manifesto
    if (m.volumes && Array.isArray(m.volumes)) {
      volumesTotal += m.volumes.reduce((sum, v) => sum + (v.quantidade || 0), 0);
      pesoTotal += m.volumes.reduce((sum, v) => sum + (v.peso_kg || 0), 0);
    }
    
    // Buscar pedido de compra para pegar o valor
    if (m.pedido_compra_id) {
      const [pedido] = await base44.asServiceRole.entities.PedidoCompra.filter({ id: m.pedido_compra_id });
      if (pedido) {
        valorTotal += (pedido.valor_total || 0);
      }
    }
  }));

  // 3. Atualizar
  await base44.asServiceRole.entities.Supermanifesto.update(supermanifestoId, {
    valor_total_estimado: valorTotal,
    quantidade_volumes_estimada: volumesTotal,
    peso_total_bruto_kg: pesoTotal
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Listar todos os supermanifestos
    const supermanifestos = await base44.asServiceRole.entities.Supermanifesto.list();
    
    const results = [];
    
    // 2. Para cada um, chamar a função de atualização
    for (const sm of supermanifestos) {
      await atualizarTotais(sm.id, base44);
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