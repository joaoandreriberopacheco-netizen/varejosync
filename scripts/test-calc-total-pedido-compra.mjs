/**
 * Smoke test: total de linha de pedido de compra com embalagem (CX × fator).
 * node scripts/test-calc-total-pedido-compra.mjs
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Réplica da regra comercial (fator > 1): qtd × preço/caixa */
function totalComercial(qty, precoCaixa) {
  return round2(qty * precoCaixa);
}

/** Réplica do caminho antigo problemático: (preco/fator arredondado) × (qty × fator) */
function totalViaFatorArredondado(qty, precoCaixa, fator) {
  const custoF1 = round2(precoCaixa / fator);
  const qBase = qty * fator;
  return round2(qBase * custoF1);
}

const qty = 20;
const preco = 110.26;
const fator = 200;

const esperado = round2(qty * preco);
const bug2 = totalViaFatorArredondado(qty, preco, fator);
const fix = totalComercial(qty, preco);

const checks = [
  ['esperado 2205.20', esperado === 2205.2],
  ['bug legado 2200', bug2 === 2200],
  ['fix comercial 2205.20', fix === 2205.2],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error('FAIL', label);
    failed += 1;
  } else {
    console.log('OK', label);
  }
}

// Bug 1: preço comercial gravado como fator-1 e exibido × fator
const precoComoF1 = preco;
const precoExibidoErrado = round2(precoComoF1 * fator);
const totalErrado = round2(qty * precoExibidoErrado);
console.log('Bug1 preço exibido/caixa errado:', precoExibidoErrado, 'total:', totalErrado);
if (precoExibidoErrado === 22052 && totalErrado === 441040) {
  console.log('OK cenário bug1 reproduzido');
} else {
  console.error('FAIL cenário bug1');
  failed += 1;
}

// Import M² (fator 2,16 só para estoque/CX): manter unidade do PDF
const qtyM2 = 64.8;
const precoM2 = 54.83;
const fatorCx = 2.16;
const totalM2Esperado = round2(qtyM2 * precoM2);
const totalDoubleDiscount = round2(qtyM2 * (precoM2 - (64.5 - precoM2))); // ~15% aplicado duas vezes
const totalErradoCx = round2((qtyM2 / fatorCx) * precoM2); // preço M² rotulado como CX

console.log('M2 esperado', totalM2Esperado, 'double-discount', totalDoubleDiscount, 'CX errado', totalErradoCx);
if (totalM2Esperado === 3552.98 || totalM2Esperado === 3552.97) {
  console.log('OK total M2 import');
} else {
  console.error('FAIL total M2 import', totalM2Esperado);
  failed += 1;
}
if (Math.abs(totalDoubleDiscount - 2925.6) < 2) {
  console.log('OK cenário double-discount reproduzido (~2925.60)');
} else {
  console.error('FAIL cenário double-discount', totalDoubleDiscount);
  failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
