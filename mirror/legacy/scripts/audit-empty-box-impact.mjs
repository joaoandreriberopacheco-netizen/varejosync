/**
 * Auditoria de impacto do bug "empty box" no recebimento de embarques.
 *
 * Critérios:
 * - mismatch_itens_only: itens > 0 e itens_embarcados == 0 (principal causa do "caixa vazia")
 * - sem_itens_com_despacho: itens == 0 e itens_embarcados == 0, mas com dados de despacho
 *
 * Uso (PowerShell):
 *   $env:VITE_BASE44_APP_ID="..."
 *   $env:BASE44_ACCESS_TOKEN="..."
 *   node scripts/audit-empty-box-impact.mjs
 *   node scripts/audit-empty-box-impact.mjs --json
 */
import { requireFlareClient } from './flare-sdk.mjs';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasDespacho(embarque) {
  return Boolean(
    embarque?.data_embarque ||
      embarque?.eta ||
      embarque?.transportadora_id ||
      embarque?.transportadora_nome ||
      embarque?.evento_logistico_id
  );
}

function boatLabelFor(embarque, eventosById) {
  const evento = eventosById.get(embarque?.evento_logistico_id || '');
  if (!evento) return '(sem viagem vinculada)';
  return (
    evento?.embarcacao_nome ||
    evento?.nome ||
    evento?.codigo ||
    evento?.id ||
    '(viagem sem nome)'
  );
}

function classify(embarque) {
  const itens = asArray(embarque?.itens);
  const itensEmbarcados = asArray(embarque?.itens_embarcados);

  if (itens.length > 0 && itensEmbarcados.length === 0) return 'mismatch_itens_only';
  if (itens.length === 0 && itensEmbarcados.length === 0 && hasDespacho(embarque)) {
    return 'sem_itens_com_despacho';
  }
  return null;
}

const base44 = requireFlareClient();
const [embarquesRaw, eventosRaw] = await Promise.all([
  base44.entities.Embarque.list('-created_date', 5000),
  base44.entities.EventoLogisticoSandbox.list('-data_referencia', 5000).catch(() => []),
]);

const embarques = asArray(embarquesRaw);
const eventos = asArray(eventosRaw);
const eventosById = new Map(eventos.map((e) => [e.id, e]));

const afetados = embarques
  .map((emb) => {
    const motivo = classify(emb);
    if (!motivo) return null;
    const itens = asArray(emb?.itens);
    const itensEmbarcados = asArray(emb?.itens_embarcados);
    return {
      id: emb.id,
      motivo,
      pedido_compra_numero: emb.pedido_compra_numero || '-',
      codigo_exibicao: emb.codigo_exibicao || '-',
      tipo: emb.tipo || '-',
      status: emb.status || '-',
      status_recebimento: emb.status_recebimento || '-',
      data_embarque: emb.data_embarque || null,
      eta: emb.eta || null,
      transportadora_nome: emb.transportadora_nome || '-',
      evento_logistico_id: emb.evento_logistico_id || '',
      barco_viagem: boatLabelFor(emb, eventosById),
      itens_count: itens.length,
      itens_embarcados_count: itensEmbarcados.length,
      created_date: emb.created_date || null,
      updated_date: emb.updated_date || null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => String(b.updated_date || b.created_date || '').localeCompare(String(a.updated_date || a.created_date || '')));

const resumoPorBarco = afetados.reduce((acc, item) => {
  const key = item.barco_viagem || '(desconhecido)';
  if (!acc[key]) {
    acc[key] = { total: 0, mismatch_itens_only: 0, sem_itens_com_despacho: 0 };
  }
  acc[key].total += 1;
  acc[key][item.motivo] += 1;
  return acc;
}, {});

const output = {
  generatedAt: new Date().toISOString(),
  totalEmbarquesAnalisados: embarques.length,
  totalAfetados: afetados.length,
  totalMismatchItensOnly: afetados.filter((i) => i.motivo === 'mismatch_itens_only').length,
  totalSemItensComDespacho: afetados.filter((i) => i.motivo === 'sem_itens_com_despacho').length,
  resumoPorBarco,
  afetados,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

console.log('\n[audit-empty-box-impact]');
console.log(`- Embarques analisados: ${output.totalEmbarquesAnalisados}`);
console.log(`- Afetados: ${output.totalAfetados}`);
console.log(`  - mismatch_itens_only: ${output.totalMismatchItensOnly}`);
console.log(`  - sem_itens_com_despacho: ${output.totalSemItensComDespacho}`);

console.log('\nResumo por barco/viagem:');
const resumoEntries = Object.entries(resumoPorBarco);
if (resumoEntries.length === 0) {
  console.log('- Nenhum afetado encontrado.');
} else {
  resumoEntries
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([barco, stats]) => {
      console.log(
        `- ${barco}: total=${stats.total}, mismatch=${stats.mismatch_itens_only}, sem_itens=${stats.sem_itens_com_despacho}`
      );
    });
}

console.log('\nTop afetados:');
afetados.slice(0, 30).forEach((item, idx) => {
  console.log(
    `${idx + 1}. pedido=${item.pedido_compra_numero} | embarque=${item.codigo_exibicao} | barco=${item.barco_viagem} | motivo=${item.motivo} | itens=${item.itens_count} | itens_embarcados=${item.itens_embarcados_count}`
  );
});

