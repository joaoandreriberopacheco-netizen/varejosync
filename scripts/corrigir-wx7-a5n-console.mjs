#!/usr/bin/env node
/**
 * Imprime script para colar no console do browser em https://p38.base44.app (sessão logada).
 * Não precisa de secrets no agente — usa localStorage do browser.
 */
console.log(`
// Cole no console do p38.base44.app (F12 → Console), com sessão logada:
(async () => {
  const appId = localStorage.getItem('app_id');
  const token = localStorage.getItem('base44_access_token');
  if (!appId || !token) { console.error('Faça login no P38 primeiro.'); return; }
  const { createClient } = await import('https://esm.sh/@base44/sdk@0.8.32');
  const base44 = createClient({ appId, serverUrl: 'https://p38.base44.app', token, requiresAuth: true });
  const roundQty = (n) => Math.round((Number(n) || 0) * 1e6) / 1e6;
  const fator = (pedido, pid) => {
    const hit = (pedido.itens || []).find((it) => String(it.produto_id) === pid);
    const f = Number(hit?.fator_conversao ?? hit?.fator_aplicado ?? 1) || 1;
    return f > 0 ? f : 1;
  };
  const norm = 'WX7-A5N';
  let pedido = (await base44.entities.PedidoCompra.filter({ numero: norm }))?.[0];
  if (!pedido) {
    const all = await base44.entities.PedidoCompra.list('-created_date', 3000);
    pedido = (all || []).find((p) => String(p.numero || '').toUpperCase() === norm);
  }
  if (!pedido) { console.error('Pedido WX7-A5N não encontrado'); return; }
  const embarques = await base44.entities.Embarque.filter({ pedido_compra_id: pedido.id }, '-created_date', 500);
  const recebido = {};
  for (const emb of embarques || []) {
    const arr = emb.itens_embarcados?.length ? emb.itens_embarcados : (emb.itens || []);
    for (const item of arr) {
      const q = Number(item.quantidade_recebida) || 0;
      if (q <= 0) continue;
      const pid = String(item.produto_id_recebido_diferente || item.produto_id);
      recebido[pid] = roundQty((recebido[pid] || 0) + q * fator(pedido, pid));
    }
  }
  const movs = await base44.entities.MovimentacaoEstoque.filter({ referencia_tipo: 'PedidoCompra', referencia_id: pedido.id }, '-created_date', 2000);
  const movimentado = {};
  for (const m of movs || []) {
    if (m.tipo !== 'Entrada' || m.motivo !== 'Compra') continue;
    movimentado[m.produto_id] = roundQty((movimentado[m.produto_id] || 0) + (Number(m.quantidade) || 0));
  }
  const deltas = Object.keys({ ...recebido, ...movimentado }).map((pid) => {
    const r = recebido[pid] || 0;
    const mv = movimentado[pid] || 0;
    const faltante = roundQty(Math.max(0, r - mv));
    return faltante > 0 ? { produto_id: pid, recebido_base: r, movimentado: mv, faltante } : null;
  }).filter(Boolean);
  console.log('Delta:', deltas);
  if (!deltas.length) { console.log('Nada a corrigir.'); return; }
  if (!confirm('Aplicar correção? Faltante: ' + deltas.map((d) => d.faltante).join(', '))) return;
  for (const d of deltas) {
    const linha = (pedido.itens || []).find((it) => String(it.produto_id) === d.produto_id);
    const f = fator(pedido, d.produto_id);
    const un = linha?.unidade_medida || linha?.unidade_sigla || '';
    await base44.entities.MovimentacaoEstoque.create({
      produto_id: d.produto_id,
      produto_nome: linha?.produto_nome || 'Produto',
      tipo: 'Entrada',
      motivo: 'Compra',
      quantidade: d.faltante,
      quantidade_base: d.faltante,
      ...(f > 1 ? { fator_conversao: f } : {}),
      ...(un ? { unidade_medida: un, unidade_sigla: un } : {}),
      referencia_tipo: 'PedidoCompra',
      referencia_id: pedido.id,
      referencia_numero: pedido.numero,
      observacoes: 'Correção retroativa WX7-A5N (console)',
      ...(pedido.fornecedor_nome ? { fornecedor_nome: pedido.fornecedor_nome, terceiro_nome: pedido.fornecedor_nome } : {}),
    });
    const prodRows = await base44.entities.Produto.filter({ id: d.produto_id });
    const prod = prodRows?.[0];
    if (prod) {
      const allMov = await base44.entities.MovimentacaoEstoque.filter({ produto_id: d.produto_id }, '-created_date', 1000);
      const saldo = (allMov || []).reduce((acc, mov) => {
        const q = Number(mov.quantidade) || 0;
        if (mov.tipo === 'Entrada') return acc + q;
        if (mov.tipo === 'Saída') return acc - q;
        return acc;
      }, 0);
      const avariado = Number(prod.estoque_avariado) || 0;
      await base44.entities.Produto.update(d.produto_id, { estoque_atual: Math.max(0, saldo - avariado) });
    }
    console.log('Corrigido produto', d.produto_id, '+', d.faltante);
  }
  console.log('Concluído. Recarregue o extrato do produto.');
})();
`);
