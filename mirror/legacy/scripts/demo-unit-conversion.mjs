/**
 * Demonstração / engenharia reversa do conversor de unidades (pedido de compra).
 * Corre: node --import ./scripts/vite-node-alias.mjs scripts/demo-unit-conversion.mjs
 *   ou: npx vite-node scripts/demo-unit-conversion.mjs
 */
import {
  applyPurchaseUnitOptionToItem,
  buildPurchaseUnitOptions,
  calculateBaseQuantity,
  commercialQuantityFromBase,
  custoApresentacaoParaFator1,
  custoFator1ParaApresentacao,
  normalizeItemToCanonicalFactorOne,
  resolveEffectiveQuantidadeBase,
  syncItemQuantidadeBaseComercial,
} from '../src/lib/productUnits.js';

const produto = {
  id: 'porcelanato-demo',
  nome: 'PORCELANATO 80X80 GEORGIA BEGE (2,60 M²/CX)',
  unidade_principal: 'M2',
  valor_compra: 60.48,
  unidades_alternativas: [
    { id: 'u-m2', unidade: 'M2', fator_conversao: 1, is_principal: true, ativo: true },
    { id: 'u-cx', unidade: 'CX', fator_conversao: 2.6, ativo: true },
  ],
};

const options = buildPurchaseUnitOptions(produto);
const m2 = options.find((o) => o.unidade === 'M2');
const cx = options.find((o) => o.unidade === 'CX');

function log(title, obj) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
  console.log(JSON.stringify(obj, null, 2));
}

function passo(desc, calc, result) {
  console.log(`  ${desc}`);
  console.log(`    → ${calc}`);
  console.log(`    = ${result}`);
}

log('PRODUTO — unidades de compra', {
  unidades: options.map((o) => ({
    sigla: o.unidade,
    fator: o.fator_conversao,
    custo_sugerido_R$: o.valor_unitario,
    principal: o.is_primary || false,
  })),
});

// --- Passo a passo: funções de baixo nível ---
console.log('\n### ENGENHARIA REVERSA — funções núcleo\n');

log('1) calculateBaseQuantity (qty comercial × fator → m² base)', {});
passo('314,6 M² com fator 1', '314.6 × 1', calculateBaseQuantity(314.6, 1));
passo('121 CX com fator 2,6', '121 × 2.6', calculateBaseQuantity(121, 2.6));
passo('79 CX com fator 2,6', '79 × 2.6', calculateBaseQuantity(79, 2.6));

log('2) commercialQuantityFromBase (m² base ÷ fator → qty comercial)', {});
passo('314,6 m² → CX (fator 2,6)', '314.6 / 2.6', commercialQuantityFromBase(314.6, 2.6, 'CX'));
passo('205,4 m² → CX (fator 2,6)', '205.4 / 2.6', commercialQuantityFromBase(205.4, 2.6, 'CX'));

// Bug antigo simulado (Math.round(2.6)=3)
const bugAntigo = (base) => {
  const bi = Math.round(base);
  const fi = Math.round(2.6);
  if (bi % fi === 0) return bi / fi;
  return base / 2.6;
};
passo('BUG ANTIGO: 314,6 com round(fator)=3', 'round(314.6)=315, 315%3=0 → 315/3', bugAntigo(314.6));

log('3) Preço — eixo fator-1 (R$/m²) vs apresentação (R$/CX)', {});
const custoM2 = 60.48;
passo('R$/m² → R$/CX', '60.48 × 2.6', custoFator1ParaApresentacao(custoM2, 2.6));
passo('R$/CX → R$/m²', '157.25 / 2.6', custoApresentacaoParaFator1(157.25, 2.6));

// --- Fluxo completo: M² → CX (correto) ---
console.log('\n### FLUXO COMPLETO — utilizador com 314,6 M² troca para CX\n');

const itemEmM2 = {
  produto_id: produto.id,
  quantidade: 314.6,
  unidade_medida: 'M2',
  fator_conversao: 1,
  quantidade_base: 314.6,
  custo_unitario: 60.48,
};

const baseAntes = calculateBaseQuantity(itemEmM2.quantidade, itemEmM2.fator_conversao);
console.log('Entrada na tela:', itemEmM2.quantidade, itemEmM2.unidade_medida);
console.log('Passo A — quantidade_base = qty × fator_antigo =', `${itemEmM2.quantidade} × ${itemEmM2.fator_conversao} =`, baseAntes);
console.log('Passo B — qty CX = base / fator_novo =', `${baseAntes} / ${cx.fator_conversao} =`, commercialQuantityFromBase(baseAntes, cx.fator_conversao, 'CX'));

const depoisTroca = applyPurchaseUnitOptionToItem(itemEmM2, produto, cx, { preserveQuantidadeBase: true });
log('Resultado applyPurchaseUnitOptionToItem (M²→CX)', {
  quantidade: depoisTroca.quantidade,
  unidade_medida: depoisTroca.unidade_medida,
  fator_conversao: depoisTroca.fator_conversao,
  quantidade_base: depoisTroca.quantidade_base,
  custo_unitario_fator1: depoisTroca.custo_unitario,
  custo_apresentacao_CX: depoisTroca.custo_unitario_apresentacao,
  total_item: depoisTroca.quantidade_base * (depoisTroca.custo_unitario - 0),
});

// --- Cenário do bug: base stale 205,4 ---
console.log('\n### CENÁRIO DO BUG — ecrã mostra 314,6 M² mas quantidade_base=205,4 (79 CX antigos)\n');

const itemInconsistente = {
  ...itemEmM2,
  quantidade_base: 205.4, // valor preso de 79 CX
};

console.log('Se usasse quantidade_base stale direto:');
console.log('  205.4 / 2.6 =', commercialQuantityFromBase(205.4, 2.6, 'CX'), 'CX  ← era o 79');

console.log('\nCódigo ATUAL ignora base stale na troca; usa qty×fator:');
const baseEfetiva = calculateBaseQuantity(itemInconsistente.quantidade, itemInconsistente.fator_conversao);
console.log('  base =', itemInconsistente.quantidade, '×', itemInconsistente.fator_conversao, '=', baseEfetiva);
const fixTroca = applyPurchaseUnitOptionToItem(itemInconsistente, produto, cx, { preserveQuantidadeBase: true });
log('Resultado com fix', {
  quantidade_CX: fixTroca.quantidade,
  quantidade_base_m2: fixTroca.quantidade_base,
});

// --- CX → M² ---
console.log('\n### FLUXO INVERSO — 121 CX → M²\n');
const itemCx = { ...depoisTroca };
const voltaM2 = applyPurchaseUnitOptionToItem(itemCx, produto, m2, { preserveQuantidadeBase: true });
log('CX → M²', {
  quantidade: voltaM2.quantidade,
  unidade: voltaM2.unidade_medida,
  quantidade_base: voltaM2.quantidade_base,
});
