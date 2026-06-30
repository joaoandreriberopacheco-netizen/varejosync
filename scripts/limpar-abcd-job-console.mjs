#!/usr/bin/env node
/**
 * Imprime script para colar no console do browser em https://p38.base44.app (admin logado).
 */
console.log(`
// Cole no console do p38.base44.app (F12 → Console), com sessão ADMIN:
(async () => {
  const appId = localStorage.getItem('app_id');
  const token = localStorage.getItem('base44_access_token');
  if (!appId || !token) { console.error('Faça login no P38 primeiro.'); return; }

  const somenteD = confirm(
    'Limpar ABCD/IEP gravado pelo job?\\n\\nOK = só produtos com letra D\\nCancelar = limpar todos os campos ABCD/IEP do job'
  );

  const { createClient } = await import('https://esm.sh/@base44/sdk@0.8.35');
  const base44 = createClient({ appId, serverUrl: 'https://p38.base44.app', token, requiresAuth: true });

  const preview = await base44.functions.invoke('limparAbcdJobProdutos', {
    dry_run: true,
    somente_d: somenteD,
  });
  const data = preview?.data ?? preview;
  console.log('Prévia:', data);

  if (!confirm('Confirmar limpeza de ' + (data?.elegiveis_limpeza ?? '?') + ' produtos?')) return;

  let offset = 0;
  let passo = 0;
  while (true) {
    passo += 1;
    const resp = await base44.functions.invoke('limparAbcdJobProdutos', {
      dry_run: false,
      somente_d: somenteD,
      offset,
      limit: 25,
    });
    const r = resp?.data ?? resp;
    console.log('Lote', passo, r);
    if (r?.status === 'concluido' || r?.next_offset == null) break;
    offset = r.next_offset;
  }
  console.log('Pronto. Recarregue o catálogo — a classificação ABCD volta ao cálculo ao vivo.');
})();
`);
