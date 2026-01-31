import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Função auxiliar para atualizar totais
// Deve ser chamada sempre que um ManifestoEntrada for vinculado/desvinculado ou atualizado
export async function atualizarTotaisSupermanifesto(supermanifestoId, base44) {
  if (!supermanifestoId) return;

  // 1. Buscar todos os manifestos vinculados a este supermanifesto
  const manifestos = await base44.asServiceRole.entities.ManifestoEntrada.filter({
    supermanifesto_id: supermanifestoId
  });

  if (!manifestos || manifestos.length === 0) {
    // Zerar totais se não houver manifestos
    await base44.asServiceRole.entities.Supermanifesto.update(supermanifestoId, {
      valor_total_estimado: 0,
      quantidade_volumes_estimada: 0,
      peso_total_bruto_kg: 0
    });
    return;
  }

  // 2. Buscar detalhes dos pedidos vinculados para somar valor
  let valorTotal = 0;
  let volumesTotal = 0;
  let pesoTotal = 0;

  // Processar manifestos em paralelo
  await Promise.all(manifestos.map(async (m) => {
    // Soma volumes do manifesto (se houver array de volumes discriminados)
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

  // 3. Atualizar o Supermanifesto
  await base44.asServiceRole.entities.Supermanifesto.update(supermanifestoId, {
    valor_total_estimado: valorTotal,
    quantidade_volumes_estimada: volumesTotal,
    peso_total_bruto_kg: pesoTotal
  });
}

// Handler da automação
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    // Apenas recalcula se for chamado manualmente ou por uma trigger específica se necessário.
    // Como a lógica de atualização depende de Manifestos vinculados, o ideal é chamar essa função
    // quando um MANIFESTO é atualizado/criado/deletado e tem supermanifesto_id.
    
    // Se a automação for disparada pelo próprio Supermanifesto, evitamos loop infinito
    // checando se os campos de totais mudaram. Mas aqui vamos focar na lógica core.
    
    // Se for chamado via invoke com { supermanifesto_id: "..." }
    if (data?.supermanifesto_id) {
        await atualizarTotaisSupermanifesto(data.supermanifesto_id, base44);
        return Response.json({ success: true });
    }
    
    // Se for trigger de entidade (ManifestoEntrada)
    // Precisamos ajustar a automação para disparar em ManifestoEntrada, não Supermanifesto
    if (event?.entity_name === 'ManifestoEntrada' && data?.supermanifesto_id) {
         await atualizarTotaisSupermanifesto(data.supermanifesto_id, base44);
         return Response.json({ success: true, message: "Totais atualizados via trigger de Manifesto" });
    }

    return Response.json({ skipped: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});