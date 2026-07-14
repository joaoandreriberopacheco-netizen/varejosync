import { format, subDays, startOfDay, endOfDay, startOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FILTRO_TEMPORAL_LABELS = {
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  mes: 'Este mês',
  tudo: 'Todo o período',
  personalizado: 'Período personalizado',
};

export const AGRUPAMENTO_LABELS = {
  destinacao: 'Destinação',
  produto: 'Produto',
  data: 'Data',
  responsavel: 'Responsável',
};

export const MODO_LABELS = {
  resumido: 'Resumido',
  completo: 'Completo',
};

export function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getDateRange(filtroTemporal, customStart, customEnd) {
  const agora = new Date();
  if (filtroTemporal === 'hoje') return { start: startOfDay(agora), end: endOfDay(agora) };
  if (filtroTemporal === '7d') return { start: startOfDay(subDays(agora, 6)), end: endOfDay(agora) };
  if (filtroTemporal === '30d') return { start: startOfDay(subDays(agora, 29)), end: endOfDay(agora) };
  if (filtroTemporal === 'mes') return { start: startOfMonth(agora), end: endOfDay(agora) };
  if (filtroTemporal === 'personalizado' && customStart && customEnd) {
    return { start: startOfDay(new Date(customStart + 'T12:00:00')), end: endOfDay(new Date(customEnd + 'T12:00:00')) };
  }
  return { start: new Date(0), end: endOfDay(agora) };
}

export function filterConsumos(consumos, { range, search, destinacao, responsavel }) {
  const term = (search || '').trim().toLowerCase();
  return (consumos || []).filter((item) => {
    const dataRef = item.data_confirmacao || item.created_date;
    if (!dataRef) return false;
    const dentroRange = isWithinInterval(new Date(dataRef), range);
    const matchSearch =
      !term ||
      item.numero?.toLowerCase().includes(term) ||
      item.destinacao?.toLowerCase().includes(term) ||
      item.responsavel_recebimento?.toLowerCase().includes(term) ||
      (item.itens || []).some((it) => it.produto_nome?.toLowerCase().includes(term));
    const matchDestinacao = !destinacao || destinacao === '__todos__' || item.destinacao === destinacao;
    const matchResponsavel = !responsavel || responsavel === '__todos__' || item.responsavel_recebimento === responsavel;
    return dentroRange && matchSearch && matchDestinacao && matchResponsavel;
  });
}

function somaValor(consumos) {
  return consumos.reduce((s, c) => s + (c.valor_total || 0), 0);
}

function somaItens(consumos) {
  return consumos.reduce((s, c) => s + (c.quantidade_total_itens || (c.itens || []).reduce((a, it) => a + (it.quantidade || 0), 0)), 0);
}

/** Produtos agregados de um grupo (para UI resumida). */
export function agregarProdutosDoGrupo(grupo, agrupamento) {
  if (agrupamento === 'produto') {
    return [{ nome: grupo.label, qtd: grupo.qtd, unidade: grupo.unidade || '', subtotal: grupo.total }];
  }
  const map = {};
  (grupo.consumos || []).forEach((c) => {
    (c.itens || []).forEach((it) => {
      const nome = it.produto_nome || 'Sem nome';
      if (!map[nome]) map[nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
      map[nome].qtd += it.quantidade || 0;
      map[nome].subtotal += it.subtotal || 0;
    });
  });
  return Object.entries(map)
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

/** Agrupa itens de vários consumos por nome de produto. */
function agregarProdutos(consumos) {
  const map = {};
  consumos.forEach((c) => {
    (c.itens || []).forEach((it) => {
      const nome = it.produto_nome || 'Sem nome';
      if (!map[nome]) map[nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
      map[nome].qtd += it.quantidade || 0;
      map[nome].subtotal += it.subtotal || 0;
    });
  });
  return Object.entries(map)
    .map(([nome, v]) => ({ key: nome, label: nome, ...v, total: v.subtotal, registros: null }))
    .sort((a, b) => b.total - a.total);
}

export function groupConsumos(consumos, agrupamento) {
  if (agrupamento === 'produto') {
    return agregarProdutos(consumos);
  }

  const groups = {};
  consumos.forEach((c) => {
    let key;
    if (agrupamento === 'destinacao') key = c.destinacao || 'Sem destinação';
    else if (agrupamento === 'responsavel') key = c.responsavel_recebimento || 'Sem responsável';
    else if (agrupamento === 'data') {
      const d = c.data_confirmacao || c.created_date;
      key = d ? format(new Date(d), 'yyyy-MM-dd') : 'sem-data';
    } else key = 'geral';

    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  return Object.entries(groups)
    .map(([key, lista]) => {
      let label = key;
      if (agrupamento === 'data' && key !== 'sem-data') {
        label = format(new Date(key + 'T12:00:00'), "dd/MM/yyyy — EEEE", { locale: ptBR });
      }
      return {
        key,
        label,
        consumos: lista.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
        total: somaValor(lista),
        registros: lista.length,
        itens: somaItens(lista),
      };
    })
    .sort((a, b) => {
      if (agrupamento === 'data') return b.key.localeCompare(a.key);
      return b.total - a.total;
    });
}

export function describeFiltrosAplicados({
  filtroTemporal,
  dataInicio,
  dataFim,
  range,
  search,
  destinacao,
  responsavel,
  agrupamento,
  modo,
}) {
  const partes = [];
  if (filtroTemporal === 'personalizado' && dataInicio && dataFim) {
    partes.push(`Período: ${format(new Date(dataInicio + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dataFim + 'T12:00:00'), 'dd/MM/yyyy')}`);
  } else {
    partes.push(`Período: ${FILTRO_TEMPORAL_LABELS[filtroTemporal] || filtroTemporal}`);
    if (range?.start && filtroTemporal !== 'tudo') {
      partes.push(
        `(${format(range.start, 'dd/MM/yyyy')} — ${format(range.end, 'dd/MM/yyyy')})`
      );
    }
  }
  partes.push(`Agrupamento: ${AGRUPAMENTO_LABELS[agrupamento] || agrupamento}`);
  partes.push(`Visualização: ${MODO_LABELS[modo] || modo}`);
  if (destinacao && destinacao !== '__todos__') partes.push(`Destinação: ${destinacao}`);
  if (responsavel && responsavel !== '__todos__') partes.push(`Responsável: ${responsavel}`);
  if (search?.trim()) partes.push(`Busca: "${search.trim()}"`);
  return partes;
}

function htmlLinhaProdutoResumido(nome, qtd, unidade, subtotal) {
  return `<tr>
    <td style="padding:4px 8px">${escapeHtml(nome)}</td>
    <td style="padding:4px 8px;text-align:center">${qtd} ${escapeHtml(unidade)}</td>
    <td style="padding:4px 8px;text-align:right">${formatCurrency(subtotal)}</td>
  </tr>`;
}

function htmlConsumoCompleto(c) {
  const itensHtml = (c.itens || [])
    .map(
      (it) =>
        `<tr><td style="padding:2px 6px">${escapeHtml(it.produto_nome)}</td>` +
        `<td style="padding:2px 6px;text-align:center">${it.quantidade || 0} ${escapeHtml(it.unidade_medida || '')}</td>` +
        `<td style="padding:2px 6px;text-align:right">${formatCurrency(it.subtotal)}</td></tr>`
    )
    .join('');
  const dataStr = c.data_confirmacao || c.created_date;
  const quando = dataStr ? format(new Date(dataStr), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';
  return `
    <tr style="background:#f9fafb"><td colspan="3" style="padding:8px;font-weight:600">
      ${escapeHtml(c.numero)} · ${escapeHtml(c.destinacao)} · ${escapeHtml(c.responsavel_recebimento)} · ${quando}
      <span style="float:right">${formatCurrency(c.valor_total)}</span>
    </td></tr>
    ${itensHtml}
    ${c.observacoes ? `<tr><td colspan="3" style="padding:2px 8px 8px;font-size:11px;color:#6b7280">Obs: ${escapeHtml(c.observacoes)}</td></tr>` : ''}
  `;
}

function htmlGrupoResumidoDestinacao(grupo) {
  const itensAgrupados = {};
  grupo.consumos.forEach((c) => {
    (c.itens || []).forEach((it) => {
      const nome = it.produto_nome || 'Sem nome';
      if (!itensAgrupados[nome]) itensAgrupados[nome] = { qtd: 0, subtotal: 0, unidade: it.unidade_medida || '' };
      itensAgrupados[nome].qtd += it.quantidade || 0;
      itensAgrupados[nome].subtotal += it.subtotal || 0;
    });
  });
  const itensHtml = Object.entries(itensAgrupados)
    .map(([nome, v]) => htmlLinhaProdutoResumido(nome, v.qtd, v.unidade, v.subtotal))
    .join('');
  return `
    <tr style="background:#e5e7eb"><td colspan="3" style="padding:8px;font-weight:700">
      ${escapeHtml(grupo.label)} — ${formatCurrency(grupo.total)} (${grupo.registros} registro${grupo.registros !== 1 ? 's' : ''})
    </td></tr>
    ${itensHtml}
  `;
}

export function buildPrintHtml({
  grupos,
  agrupamento,
  modo,
  filtrosTexto,
  totais,
  empresaNome,
}) {
  const titulo = 'Relatório de Consumo Interno';
  const geradoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const filtrosHtml = filtrosTexto.map((f) => `<li>${escapeHtml(f)}</li>`).join('');

  let corpo = '';
  if (agrupamento === 'produto') {
    corpo = grupos
      .map((g) => htmlLinhaProdutoResumido(g.label, g.qtd, g.unidade, g.total))
      .join('');
  } else if (modo === 'completo') {
    corpo = grupos
      .map((g) => {
        const header = `
            <tr style="background:#e5e7eb"><td colspan="3" style="padding:8px;font-weight:700">
              ${escapeHtml(g.label)} — ${formatCurrency(g.total)} (${g.registros} registro${g.registros !== 1 ? 's' : ''})
            </td></tr>`;
        const linhas = (g.consumos || []).map(htmlConsumoCompleto).join('');
        return header + linhas;
      })
      .join('');
  } else {
    corpo = grupos.map((g) => htmlGrupoResumidoDestinacao(g)).join('');
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:13px;padding:20px;color:#111}
  h1{font-size:18px;margin:0 0 4px}
  .meta{color:#6b7280;font-size:12px;margin-bottom:12px}
  .filtros{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px}
  .filtros ul{margin:4px 0 0;padding-left:18px}
  .totais{display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap}
  .totais div{font-size:12px}
  .totais strong{font-size:15px;display:block}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;padding:6px 8px}
  td{border-bottom:1px solid #f3f4f6}
</style></head><body>
  <h1>${escapeHtml(titulo)}</h1>
  <p class="meta">${escapeHtml(empresaNome || '')} · Gerado em ${geradoEm}</p>
  <div class="filtros"><strong>Filtros aplicados</strong><ul>${filtrosHtml}</ul></div>
  <div class="totais">
    <div><span>Valor total</span><strong>${formatCurrency(totais.valor)}</strong></div>
    <div><span>Registros</span><strong>${totais.registros}</strong></div>
    <div><span>Itens (qtd)</span><strong>${totais.itens}</strong></div>
  </div>
  <table>
    <thead><tr>
      <th>${agrupamento === 'produto' ? 'Produto' : 'Descrição'}</th>
      <th style="text-align:center">Quantidade</th>
      <th style="text-align:right">Valor</th>
    </tr></thead>
    <tbody>${corpo}</tbody>
    <tfoot><tr>
      <td colspan="2" style="padding:10px 8px;font-weight:700;border-top:2px solid #e5e7eb">Total geral</td>
      <td style="padding:10px 8px;font-weight:700;text-align:right;border-top:2px solid #e5e7eb">${formatCurrency(totais.valor)}</td>
    </tr></tfoot>
  </table>
</body></html>`;
}
