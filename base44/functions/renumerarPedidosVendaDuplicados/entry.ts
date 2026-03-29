import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 1. Buscar todos os pedidos com numero duplicado "PV-00001"
  const duplicados = await base44.asServiceRole.entities.PedidoVenda.filter({ numero: 'PV-00001' }, 'created_date', 200);

  if (!duplicados || duplicados.length === 0) {
    return Response.json({ message: 'Nenhum duplicado encontrado.', count: 0 });
  }

  // 2. Buscar o maior número existente em TODOS os pedidos
  const todos = await base44.asServiceRole.entities.PedidoVenda.list('-created_date', 500);
  let maxNum = 0;
  for (const p of todos) {
    if (p.numero && p.numero.startsWith('PV-')) {
      const n = parseInt(p.numero.replace('PV-', ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }

  // 3. Ordenar duplicados por created_date (mais antigo primeiro)
  duplicados.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  // 4. Atribuir novos números sequenciais
  const resultados = [];
  for (let i = 0; i < duplicados.length; i++) {
    const novoNumero = `PV-${String(maxNum + i + 1).padStart(5, '0')}`;
    await base44.asServiceRole.entities.PedidoVenda.update(duplicados[i].id, { numero: novoNumero });
    resultados.push({ id: duplicados[i].id, numero_antigo: 'PV-00001', numero_novo: novoNumero });
  }

  return Response.json({
    message: `${resultados.length} pedidos renumerados com sucesso.`,
    max_anterior: `PV-${String(maxNum).padStart(5, '0')}`,
    resultados
  });
});