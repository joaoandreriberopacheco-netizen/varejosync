import { TIPO_EVENTO } from '@/lib/eventosVenda';
import { formatarDiferencaSubstituicao } from '@/lib/substituicoesVendaCaixa';
import { getContextoPedido } from '@/lib/contextoVendaIntegrado';

/**
 * Linha HTML extra para extratos (substituição, pagamento alterado, etc.).
 */
export function formatDestaquesVendaHtmlLinha(pedido, indiceContexto, formatValor) {
  const ctx = getContextoPedido(indiceContexto, pedido?.id);
  const destaques = ctx?.destaques || [];
  if (!destaques.length) return '';

  const fmt = formatValor || ((n) => `R$ ${Number(n || 0).toFixed(2)}`);
  const partes = destaques.map((d) => {
    if (d.tipo === TIPO_EVENTO.SUBSTITUICAO && d.origem) {
      const diff = formatarDiferencaSubstituicao(d.diferenca, fmt);
      return `↔ Substitui ${d.origem.numero} (<s>${fmt(d.origem.valor_total)}</s>) · ${diff}`;
    }
    if (d.tipo === TIPO_EVENTO.PAGAMENTO_ALTERADO) {
      return '💳 Pagamento atualizado';
    }
    if (d.tipo === TIPO_EVENTO.CANCELAMENTO) {
      return `✕ ${d.rotulo || 'Cancelada'}`;
    }
    return `* ${d.rotulo || 'Alteração'}`;
  });

  return `<div style="font-size:10px;color:#374151;padding-top:2px">${partes.join(' · ')}</div>`;
}
