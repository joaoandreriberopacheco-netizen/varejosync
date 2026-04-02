import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function gerarCodigoAleatorio(tamanho = 5) {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let resultado = '';
  const array = new Uint32Array(tamanho);
  crypto.getRandomValues(array);

  for (let i = 0; i < tamanho; i++) {
    resultado += caracteres[array[i] % caracteres.length];
  }

  return resultado;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    const usados = new Set();
    const atualizados = [];

    for (const pedido of pedidos) {
      let novoNumero = '';

      for (let tentativa = 0; tentativa < 50; tentativa++) {
        const candidato = gerarCodigoAleatorio(5);
        if (!usados.has(candidato)) {
          novoNumero = candidato;
          usados.add(candidato);
          break;
        }
      }

      if (!novoNumero) {
        return Response.json({ error: `Falha ao gerar identificador para o pedido ${pedido.id}` }, { status: 500 });
      }

      await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, { numero: novoNumero });
      atualizados.push({ id: pedido.id, numero_anterior: pedido.numero || null, numero_novo: novoNumero });
    }

    return Response.json({
      success: true,
      total_atualizados: atualizados.length,
      pedidos: atualizados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});