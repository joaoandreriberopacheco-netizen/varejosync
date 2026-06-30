/**
 * Curva ABCD para o job manual em Configurações (não altera o catálogo).
 * Separado de calcularIepProdutos para manter o catálogo no estado 1dfe00d2.
 */
import { calcularLucroSkuComQ4, grupoAbcdKey } from '@/lib/calcularIepProdutos';

function classificarParetoABCD(ranking, totalLucroPositivo) {
  const mapa = {};
  for (const entry of ranking) {
    mapa[entry.id] = 'D';
  }
  if (totalLucroPositivo <= 0) return mapa;

  let acumulado = 0;
  for (const entry of ranking) {
    if (entry.lucro <= 0) continue;
    const prevPct = (acumulado / totalLucroPositivo) * 100;
    acumulado += entry.lucro;
    if (prevPct < 70) mapa[entry.id] = 'A';
    else if (prevPct < 85) mapa[entry.id] = 'B';
    else if (prevPct < 95) mapa[entry.id] = 'C';
  }
  return mapa;
}

/** Curva ABCD por grupo h1+h2 — gravação no cadastro via AbcdConfigTool. */
export function calcularMapaAbcdSomente(produtos, pedidos90d) {
  const lista = Array.isArray(produtos) ? produtos : [];
  const pedidos = Array.isArray(pedidos90d) ? pedidos90d : [];

  const lucroPorGrupo = {};
  for (const produto of lista) {
    const { lucro } = calcularLucroSkuComQ4(produto, pedidos);
    const key = grupoAbcdKey(produto);
    lucroPorGrupo[key] = (lucroPorGrupo[key] || 0) + lucro;
  }

  const rankingGrupos = Object.entries(lucroPorGrupo)
    .map(([id, lucro]) => ({ id, lucro }))
    .sort((a, b) => b.lucro - a.lucro);

  const lucroTotalPositivo = rankingGrupos.reduce((acc, g) => acc + Math.max(0, g.lucro), 0);
  const mapaAbcdGrupo = classificarParetoABCD(rankingGrupos, lucroTotalPositivo);

  return {
    mapaAbcdGrupo,
    grupos_nivel_2: rankingGrupos.length,
    total_produtos: lista.length,
  };
}

export function abcdClasseParaProduto(produto, mapaAbcdGrupo) {
  return mapaAbcdGrupo[grupoAbcdKey(produto)] || 'D';
}
