#!/usr/bin/env node
/**
 * Audita lançamentos de cartão do dia: lista os que estão na conta Caixa PDV
 * em vez da conta da maquininha (ex.: Banco do Brasil).
 *
 * Uso:
 *   VITE_BASE44_APP_ID=... BASE44_ACCESS_TOKEN=... node scripts/auditar-cartao-conta-pdv.mjs
 *   ... --fix   (reaponta conta_financeira_id pela maquininha)
 */
import { requireFlareClient } from './flare-sdk.mjs';

function hojeBr() {
  const agora = new Date();
  return new Date(agora.getTime() - 5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function isCartaoLancamento(l) {
  const fpt = l?.forma_pagamento_tipo || '';
  const fp = l?.forma_pagamento || '';
  const tags = l?.tags || [];
  return (
    fpt === 'Cartão Crédito' ||
    fpt === 'Cartão Débito' ||
    fp.includes('Cartão') ||
    tags.includes('CARTAO')
  );
}

function isContaCaixaPdv(conta) {
  return conta?.is_caixa_pdv === true || conta?.tipo === 'Caixa PDV';
}

function dataLancamentoKey(l) {
  return (l.created_date || l.data_vencimento || '').slice(0, 10);
}

function parseMaquininhaId(l) {
  if (!l?.observacoes) return null;
  try {
    const obs = typeof l.observacoes === 'string' ? JSON.parse(l.observacoes) : l.observacoes;
    return obs?.maquininha_id || null;
  } catch {
    return null;
  }
}

const fix = process.argv.includes('--fix');
const dataArg = process.argv.find((a) => a.startsWith('--data='));
const dataRef = dataArg ? dataArg.split('=')[1] : hojeBr();

const base44 = requireFlareClient();

const [lancs, contas, maquininhas] = await Promise.all([
  base44.entities.LancamentoFinanceiro.list('-created_date', 2000),
  base44.entities.ContasFinanceiras.filter({ ativo: true }),
  base44.entities.Maquininha.list(),
]);

const contasById = Object.fromEntries(contas.map((c) => [c.id, c]));
const maqById = Object.fromEntries(maquininhas.map((m) => [m.id, m]));

const cartaoDia = lancs.filter((l) => isCartaoLancamento(l) && dataLancamentoKey(l) === dataRef);

const problemas = [];
const ok = [];

for (const l of cartaoDia) {
  const conta = contasById[l.conta_financeira_id];
  const noPdv = isContaCaixaPdv(conta);
  const row = {
    id: l.id,
    descricao: l.descricao,
    valor: l.valor,
    status: l.status,
    conta_atual: conta?.nome || l.conta_financeira_nome || '?',
    conta_id: l.conta_financeira_id,
    forma: l.forma_pagamento_tipo || l.forma_pagamento,
  };

  if (noPdv) {
    const maqId = parseMaquininhaId(l);
    const maq = maqId ? maqById[maqId] : null;
    const destino = maq?.conta_destino_id ? contasById[maq.conta_destino_id] : null;
    problemas.push({
      ...row,
      maquininha: maq?.nome || null,
      conta_correta_sugerida: destino?.nome || maq?.conta_destino_nome || null,
      conta_correta_id: maq?.conta_destino_id || null,
    });

    if (fix && maq?.conta_destino_id && maq.conta_destino_id !== l.conta_financeira_id) {
      await base44.entities.LancamentoFinanceiro.update(l.id, {
        conta_financeira_id: maq.conta_destino_id,
        conta_financeira_nome: maq.conta_destino_nome || destino?.nome || maq.nome,
      });
      row.corrigido = true;
    }
  } else {
    ok.push(row);
  }
}

console.log(
  JSON.stringify(
    {
      data: dataRef,
      total_cartao_dia: cartaoDia.length,
      ok_conta_correta: ok.length,
      problemas_caixa_pdv: problemas.length,
      modo_fix: fix,
      problemas,
      amostra_ok: ok.slice(0, 5),
    },
    null,
    2,
  ),
);

if (problemas.length > 0 && !fix) {
  console.error('\n[auditar] Rode com --fix para reapontar conta_financeira_id pela maquininha.');
  process.exit(1);
}
