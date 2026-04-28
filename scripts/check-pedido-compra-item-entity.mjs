#!/usr/bin/env node
/**
 * check-pedido-compra-item-entity.mjs
 *
 * Diagnostica se a entidade canonica `PedidoCompraItem` esta registrada e
 * populada no app Base44, comparando contra o array legado `PedidoCompra.itens[]`.
 *
 * Saida possivel:
 *   - "NAO REGISTRADA"  -> precisa publicar o schema PedidoCompraItem.jsonc no painel Base44.
 *   - "REGISTRADA, vazia" -> schema deployado mas a migracao ainda nao rodou
 *                            (use `migrarPedidoCompraItensLegacy` com dry_run:false).
 *   - "REGISTRADA, populada" -> tudo certo, entidade ja existe e tem dados.
 *
 * Como rodar (PowerShell):
 *   $env:VITE_BASE44_APP_ID = "<app_id>"
 *   $env:BASE44_ACCESS_TOKEN = "<token>"   # localStorage > base44_access_token
 *   npm run check:pci-entity
 *
 * Ou direto: `node scripts/check-pedido-compra-item-entity.mjs`.
 */

import { tryFlareClient, getFlareEnv } from './flare-sdk.mjs';

const SAMPLE_PEDIDOS = 50;

const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR');

const isLikelyEntityNotFound = (err) => {
  if (!err) return false;
  const msg = String(err?.message || err || '').toLowerCase();
  const status = err?.status || err?.response?.status;
  if (status === 404) return true;
  if (status === 400 && /entity|schema|not\s*found|unknown/.test(msg)) return true;
  if (/\bentity\b.*not\s*found/.test(msg)) return true;
  if (/unknown\s*entity/.test(msg)) return true;
  if (/no\s*such\s*entity/.test(msg)) return true;
  return false;
};

async function safeList(base44, entityName, limit = 1) {
  const entityRef = base44?.entities?.[entityName];
  if (!entityRef || typeof entityRef.list !== 'function') {
    return { ok: false, reason: 'sdk_missing_entity', items: [], error: null };
  }
  try {
    const items = await entityRef.list(null, null, limit);
    return { ok: true, items: Array.isArray(items) ? items : (items?.data ?? []), error: null };
  } catch (err) {
    return {
      ok: false,
      reason: isLikelyEntityNotFound(err) ? 'entity_not_registered' : 'request_failed',
      items: [],
      error: err,
    };
  }
}

async function safeFilter(base44, entityName, where, limit) {
  try {
    const items = await base44.entities[entityName].filter(where, null, limit);
    return Array.isArray(items) ? items : (items?.data ?? []);
  } catch (err) {
    if (isLikelyEntityNotFound(err)) return null;
    throw err;
  }
}

async function main() {
  const env = getFlareEnv();
  if (!env.appId || !env.token) {
    console.error('[check] Falta VITE_BASE44_APP_ID ou BASE44_ACCESS_TOKEN no ambiente.');
    console.error('       Pegue o token em DevTools > Application > Local Storage > base44_access_token.');
    process.exit(1);
  }

  const base44 = tryFlareClient();
  if (!base44) {
    console.error('[check] Falha ao criar cliente Base44.');
    process.exit(1);
  }

  console.log(`\n== Diagnostico PedidoCompraItem ==`);
  console.log(`App: ${env.appId}`);
  console.log(`Server: ${env.serverUrl}\n`);

  // 1) PedidoCompraItem registrado?
  const probe = await safeList(base44, 'PedidoCompraItem', 1);

  let pciStatus = 'desconhecido';
  let pciCount = null;

  if (!probe.ok && probe.reason === 'sdk_missing_entity') {
    pciStatus = 'NAO REGISTRADA (SDK nao expoe entities.PedidoCompraItem)';
  } else if (!probe.ok && probe.reason === 'entity_not_registered') {
    pciStatus = 'NAO REGISTRADA no painel Base44';
  } else if (!probe.ok) {
    pciStatus = `ERRO ao consultar (${probe.error?.message || probe.error})`;
  } else {
    pciStatus = 'REGISTRADA';
    const todas = await safeFilter(base44, 'PedidoCompraItem', {}, 1000);
    pciCount = todas == null ? null : todas.length;
  }

  console.log(`PedidoCompraItem: ${pciStatus}`);
  if (pciCount != null) {
    console.log(`  Linhas encontradas (amostra ate 1000): ${fmtNum(pciCount)}`);
    if (pciCount === 0) {
      console.log('  -> Schema OK, mas tabela vazia: rodar migrarPedidoCompraItensLegacy.');
    }
  }

  // 2) Itens legados em PedidoCompra.itens[]
  console.log(`\nLegado (itens[] dentro de PedidoCompra, amostra ${SAMPLE_PEDIDOS}):`);
  const pedidos = await safeFilter(base44, 'PedidoCompra', {}, SAMPLE_PEDIDOS);
  if (pedidos == null) {
    console.log('  ERRO: PedidoCompra tambem nao foi encontrado pelo SDK.');
  } else {
    let totalItens = 0;
    let pedidosComItens = 0;
    let pedidosSemItens = 0;
    for (const p of pedidos) {
      const itens = Array.isArray(p?.itens) ? p.itens : [];
      if (itens.length > 0) pedidosComItens++; else pedidosSemItens++;
      totalItens += itens.length;
    }
    console.log(`  Pedidos lidos: ${fmtNum(pedidos.length)}`);
    console.log(`  Pedidos com ao menos 1 item: ${fmtNum(pedidosComItens)}`);
    console.log(`  Pedidos sem itens: ${fmtNum(pedidosSemItens)}`);
    console.log(`  Total de linhas legadas (itens[]): ${fmtNum(totalItens)}`);
    if (pciCount != null && pedidos.length > 0) {
      const ratio = totalItens > 0 ? pciCount / totalItens : 0;
      const aviso = totalItens > 0 && pciCount === 0
        ? '  -> Inconsistencia: legado tem itens, canonico esta vazio.'
        : ratio < 0.9 && totalItens > 0
          ? '  -> Migracao provavelmente incompleta (canonico < legado).'
          : '';
      if (aviso) console.log(aviso);
    }
  }

  // 3) Diagnostico final
  console.log(`\n== Conclusao ==`);
  if (pciStatus.startsWith('NAO REGISTRADA')) {
    console.log('Acao: publicar o schema base44/entities/PedidoCompraItem.jsonc no painel');
    console.log('       (Base44 > App Schema > Add entity), depois rodar a migracao.');
    process.exit(2);
  }
  if (pciCount === 0) {
    console.log('Acao: rodar migrarPedidoCompraItensLegacy com {"dry_run": false}.');
    process.exit(3);
  }
  console.log('Tudo certo: PedidoCompraItem existe e tem linhas.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[check] Erro inesperado:', err);
  process.exit(1);
});
