#!/usr/bin/env node
/**
 * Audita entradas/saídas de um dia no Fluxo de Caixa (dados reais Base44).
 *
 * Uso:
 *   npm run audit:fluxo-dia -- --dia=2026-06-19
 *   npm run audit:fluxo-dia -- --dia=2026-06-19 --out=docs/audit/fluxo-2026-06-19.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { requireBase44Client, REPO_ROOT } from './base44-env.mjs';

function parseArgs(argv) {
  const diaArg = argv.find((a) => a.startsWith('--dia='));
  const outArg = argv.find((a) => a.startsWith('--out='));
  const dia = diaArg?.slice('--dia='.length) || '';
  const out = outArg ? outArg.slice('--out='.length) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    console.error('Uso: npm run audit:fluxo-dia -- --dia=YYYY-MM-DD [--out=caminho.json]');
    process.exit(1);
  }
  return { dia, out };
}

function toDateKey(val) {
  if (!val) return null;
  const s = String(val);
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function getDataKey(l) {
  return toDateKey(l?.data_lancamento) || toDateKey(l?.data_pagamento) || toDateKey(l?.data_vencimento);
}

function isPago(l) {
  return l?.status === 'Pago' || !!l?.data_pagamento;
}

function isTransferencia(l) {
  if (!l) return false;
  if (l.tipo === 'Transferência') return true;
  if (l.categoria === 'Transferência entre Contas') return true;
  if (l.referencia_tipo === 'MovimentosCaixa') return true;
  return false;
}

function pareceRepasse(l) {
  const t = `${l?.descricao || ''} ${l?.observacoes || ''}`.toLowerCase();
  return /repasse|transfer[eê]ncia|dep[oó]sito/i.test(t);
}

function chavePar(l) {
  if (!isTransferencia(l)) return null;
  if (l.referencia_tipo === 'MovimentosCaixa' && l.referencia_id != null) {
    return `mc:${l.referencia_id}`;
  }
  const data = getDataKey(l) || '';
  const valor = Number(l.valor || 0).toFixed(2);
  if (l.categoria === 'Transferência entre Contas' || l.referencia_tipo === 'Manual') {
    return `tr:${data}:${valor}`;
  }
  return null;
}

function buildMapaPares(lancamentos) {
  const porChave = new Map();
  lancamentos.forEach((l) => {
    const key = chavePar(l);
    if (!key) return;
    if (!porChave.has(key)) porChave.set(key, []);
    porChave.get(key).push(l);
  });
  const mapa = new Map();
  porChave.forEach((grupo) => {
    const despesa = grupo.find((i) => i.tipo === 'Despesa');
    const receita = grupo.find((i) => i.tipo === 'Receita');
    if (!despesa || !receita) return;
    mapa.set(despesa.id, receita.conta_financeira_id);
    mapa.set(receita.id, despesa.conta_financeira_id);
  });

  const buckets = new Map();
  lancamentos.forEach((l) => {
    if (mapa.has(l.id) || !isPago(l)) return;
    if (l.tipo !== 'Despesa' && l.tipo !== 'Receita') return;
    const key = `${getDataKey(l)}:${Number(l.valor || 0).toFixed(2)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(l);
  });
  buckets.forEach((grupo) => {
    const despesas = grupo.filter((l) => l.tipo === 'Despesa');
    const receitas = grupo.filter((l) => l.tipo === 'Receita');
    if (despesas.length !== 1 || receitas.length !== 1) return;
    const despesa = despesas[0];
    const receita = receitas[0];
    if (despesa.conta_financeira_id === receita.conta_financeira_id) return;
    if (!isTransferencia(despesa) && !isTransferencia(receita) && !pareceRepasse(despesa)) return;
    mapa.set(despesa.id, receita.conta_financeira_id);
    mapa.set(receita.id, despesa.conta_financeira_id);
  });
  return mapa;
}

function classificar(l, mapaPares) {
  if (!isPago(l) || l.status === 'Cancelado') return 'ignorado_nao_pago';
  if (l.tipo !== 'Receita' && l.tipo !== 'Despesa') return 'ignorado_tipo';
  const par = mapaPares.has(l.id);
  if (isTransferencia(l) || par) return 'transferencia_interna';
  if (l.categoria === 'Venda de Produto' || l.referencia_tipo === 'PedidoVenda') return 'venda';
  if (l.tipo === 'Receita') return 'outra_receita';
  return 'despesa';
}

function round(n) {
  return Math.round(n * 100) / 100;
}

async function main() {
  const { dia, out } = parseArgs(process.argv.slice(2));
  const base44 = requireBase44Client();

  console.log(`[audit] A carregar dados Base44 para ${dia}…`);
  const [lancs, contas] = await Promise.all([
    base44.entities.LancamentoFinanceiro.list('-data_vencimento', 10000),
    base44.entities.ContasFinanceiras.list(),
  ]);

  const contasById = Object.fromEntries((contas || []).map((c) => [c.id, c]));
  const noDia = (lancs || []).filter((l) => getDataKey(l) === dia);
  const mapaPares = buildMapaPares(lancs || []);

  const linhas = noDia.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    valor: Number(l.valor || 0),
    descricao: (l.descricao || '').slice(0, 80),
    conta: l.conta_financeira_nome || contasById[l.conta_financeira_id]?.nome || '—',
    categoria: l.categoria || '—',
    status: l.status,
    classificacao: classificar(l, mapaPares),
    contraparte: mapaPares.get(l.id)
      ? contasById[mapaPares.get(l.id)]?.nome || mapaPares.get(l.id)
      : null,
  }));

  const totais = linhas.reduce(
    (acc, l) => {
      if (l.classificacao === 'transferencia_interna') {
        acc.transferencias += l.tipo === 'Receita' ? l.valor : 0;
        return acc;
      }
      if (l.tipo === 'Receita') acc.entrou += l.valor;
      if (l.tipo === 'Despesa') acc.saiu += l.valor;
      if (l.classificacao === 'venda') acc.vendas += l.valor;
      return acc;
    },
    { entrou: 0, saiu: 0, vendas: 0, transferencias: 0 },
  );
  totais.entrou = round(totais.entrou);
  totais.saiu = round(totais.saiu);
  totais.vendas = round(totais.vendas);
  totais.transferencias = round(totais.transferencias);
  totais.liquido = round(totais.entrou - totais.saiu);

  const relatorio = {
    dia,
    geradoEm: new Date().toISOString(),
    totalLancamentos: linhas.length,
    totais,
    porClassificacao: {
      vendas: linhas.filter((l) => l.classificacao === 'venda'),
      outras_receitas: linhas.filter((l) => l.classificacao === 'outra_receita'),
      despesas: linhas.filter((l) => l.classificacao === 'despesa'),
      transferencias: linhas.filter((l) => l.classificacao === 'transferencia_interna'),
      ignorados: linhas.filter((l) => l.classificacao.startsWith('ignorado')),
    },
  };

  console.log('\n=== Resumo', dia, '===');
  console.log('Lançamentos no dia:', relatorio.totalLancamentos);
  console.log('Entrou (operacional):', `R$ ${totais.entrou.toFixed(2)}`);
  console.log('  └ vendas:', `R$ ${totais.vendas.toFixed(2)}`);
  console.log('Saiu:', `R$ ${totais.saiu.toFixed(2)}`);
  console.log('Líquido:', `R$ ${totais.liquido.toFixed(2)}`);
  console.log('Transferências (excluídas do entrou):', `R$ ${totais.transferencias.toFixed(2)}`);

  if (out) {
    const path = join(REPO_ROOT, out);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(relatorio, null, 2)}\n`, 'utf8');
    console.log('\n[audit] Relatório gravado em', out);
  }
}

main().catch((err) => {
  console.error('[audit] Erro:', err.message || err);
  process.exit(1);
});
