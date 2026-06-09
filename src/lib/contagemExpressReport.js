import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import { formatCountQuantity, getGroupDisplayFromBase } from '@/lib/inventoryCountUnits';

const RELATORIOS_KEY = 'p38_contagem_express_relatorios_v1';
const MAX_RELATORIOS = 50;

export function loadContagemExpressRelatorios() {
  try {
    const raw = localStorage.getItem(RELATORIOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveContagemExpressRelatorio(relatorio) {
  const lista = loadContagemExpressRelatorios();
  const next = [relatorio, ...lista].slice(0, MAX_RELATORIOS);
  localStorage.setItem(RELATORIOS_KEY, JSON.stringify(next));
  return next;
}

/**
 * Enriquece linhas do comparativo com campos de exibição para relatório.
 */
export function enrichComparativoRows(comparativo, produtos) {
  const mapa = Object.fromEntries((produtos || []).map((p) => [p.id, p]));
  return (comparativo || []).map((row) => {
    const produto = mapa[row.produto_id];
    const contadoDisplay = getGroupDisplayFromBase(produto, row.totalBase);
    const sistemaDisplay = getGroupDisplayFromBase(produto, row.saldoExtrato);
    const fator = Number(contadoDisplay.fator_conversao) > 0 ? Number(contadoDisplay.fator_conversao) : 1;
    const diferencaDisplay = row.diferenca / fator;
    return {
      ...row,
      unidade: contadoDisplay.unidade,
      contado: contadoDisplay.quantidade,
      contado_base: row.totalBase,
      estoque_sistema: row.saldoExtrato,
      estoque_sistema_display: sistemaDisplay.quantidade,
      diferenca_display: diferencaDisplay,
      tipo_ajuste: !row.temDiferenca ? 'OK' : row.diferenca > 0 ? 'Entrada' : 'Saída',
      quantidade_ajuste: row.temDiferenca ? Math.abs(row.diferenca) : 0,
      quantidade_ajuste_display: row.temDiferenca ? Math.abs(diferencaDisplay) : 0,
    };
  });
}

export function buildResumoContagemExpress(linhas) {
  const entradas = linhas.filter((r) => r.tipo_ajuste === 'Entrada');
  const saidas = linhas.filter((r) => r.tipo_ajuste === 'Saída');
  const ok = linhas.filter((r) => r.tipo_ajuste === 'OK');
  return {
    total: linhas.length,
    ok: ok.length,
    entradas: entradas.length,
    saidas: saidas.length,
    linhasEntrada: entradas,
    linhasSaida: saidas,
    linhasOk: ok,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContagemExpressReportHtml({
  referenciaNumero,
  usuarioNome,
  dataLancamento,
  linhas,
  resumo,
}) {
  const dataFmt = format(new Date(dataLancamento || Date.now()), "dd/MM/yyyy HH:mm", { locale: ptBR });

  const renderLinha = (item) => {
    const dif = item.diferenca;
    const difStr = dif === 0 ? 'OK' : dif > 0 ? `+${formatCountQuantity(item.diferenca_display)}` : formatCountQuantity(item.diferenca_display);
    const difClass = dif > 0 ? 'pos' : dif < 0 ? 'neg' : 'ok';
    return `
      <tr>
        <td>${escapeHtml(item.produto_nome)}</td>
        <td style="text-align:center">${formatCountQuantity(item.contado)} ${escapeHtml(item.unidade)}</td>
        <td style="text-align:center">${formatCountQuantity(item.estoque_sistema_display)} ${escapeHtml(item.unidade)}</td>
        <td style="text-align:center" class="${difClass}">${difStr} ${escapeHtml(item.unidade)}</td>
        <td style="text-align:center">${item.tipo_ajuste === 'OK' ? '—' : item.tipo_ajuste}</td>
      </tr>`;
  };

  const tabelaCompleta = linhas.map(renderLinha).join('');
  const tabelaEntradas = resumo.linhasEntrada.map(renderLinha).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Nenhuma entrada</td></tr>';
  const tabelaSaidas = resumo.linhasSaida.map(renderLinha).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af">Nenhuma saída</td></tr>';

  return `
    <html>
      <head>
        <title>Contagem Express — ${escapeHtml(referenciaNumero)}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; max-width: 900px; margin: 0 auto; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          h2 { font-size: 14px; margin: 24px 0 8px; }
          .sub { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
          .resumo { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
          .resumo-item { background: #f9fafb; border-radius: 8px; padding: 10px 14px; min-width: 72px; text-align: center; }
          .resumo-item .num { font-size: 20px; font-weight: 700; }
          .resumo-item .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; margin-top: 2px; }
          .num-ok { color: #16a34a; }
          .num-entrada { color: #d97706; }
          .num-saida { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          thead th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 10px; color: #6b7280; text-transform: uppercase; }
          thead th:not(:first-child) { text-align: center; }
          tbody td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
          tbody td:not(:first-child) { text-align: center; }
          .pos { color: #d97706; font-weight: 600; }
          .neg { color: #dc2626; font-weight: 600; }
          .ok { color: #16a34a; font-weight: 600; }
          .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>Relatório — Contagem Express</h1>
        <div class="sub">${escapeHtml(referenciaNumero)} · ${escapeHtml(usuarioNome || 'Operador')} · ${dataFmt}</div>
        <div class="resumo">
          <div class="resumo-item"><div class="num">${resumo.total}</div><div class="label">Produtos</div></div>
          <div class="resumo-item"><div class="num num-ok">${resumo.ok}</div><div class="label">Conferem</div></div>
          <div class="resumo-item"><div class="num num-entrada">${resumo.entradas}</div><div class="label">Entradas</div></div>
          <div class="resumo-item"><div class="num num-saida">${resumo.saidas}</div><div class="label">Saídas</div></div>
        </div>

        <h2>Balanço — produtos com entrada (sobra)</h2>
        <table>
          <thead><tr><th>Produto</th><th>Contado</th><th>Sistema</th><th>Diferença</th><th>Mov.</th></tr></thead>
          <tbody>${tabelaEntradas}</tbody>
        </table>

        <h2>Balanço — produtos com saída (falta)</h2>
        <table>
          <thead><tr><th>Produto</th><th>Contado</th><th>Sistema</th><th>Diferença</th><th>Mov.</th></tr></thead>
          <tbody>${tabelaSaidas}</tbody>
        </table>

        <h2>Lista completa</h2>
        <table>
          <thead><tr><th>Produto</th><th>Contado</th><th>Sistema</th><th>Diferença</th><th>Mov.</th></tr></thead>
          <tbody>${tabelaCompleta}</tbody>
        </table>

        <div class="footer">Movimentações de inventário gravadas com referência ${escapeHtml(referenciaNumero)} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
      </body>
    </html>
  `;
}

export async function publicarRelatorioContagemExpress(payload) {
  const linhas = enrichComparativoRows(payload.comparativo, payload.produtos);
  const resumo = buildResumoContagemExpress(linhas);
  const dataLancamento = payload.dataLancamento || new Date().toISOString();

  const relatorio = {
    id: payload.referenciaNumero,
    referenciaNumero: payload.referenciaNumero,
    usuarioNome: payload.usuarioNome,
    dataLancamento,
    resumo,
    linhas,
    movimentacoes: payload.movimentacoes || [],
  };

  saveContagemExpressRelatorio(relatorio);

  const html = buildContagemExpressReportHtml({
    referenciaNumero: payload.referenciaNumero,
    usuarioNome: payload.usuarioNome,
    dataLancamento,
    linhas,
    resumo,
  });

  try {
    await openPrintWindowOrShareHtml(
      html,
      `contagem-express-${String(payload.referenciaNumero).replace(/\s+/g, '-')}.html`,
      `Contagem Express ${payload.referenciaNumero}`
    );
  } catch {
    /* popup bloqueado */
  }

  return relatorio;
}
