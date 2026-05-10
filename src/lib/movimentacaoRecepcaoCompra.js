/**
 * Payload para entrada de stock na receção de embarque (pedido de compra), enviado apenas ao
 * SDK Base44 → entidade `MovimentacaoEstoque` na **database Base44** (sem canal paralelo).
 *
 * O recálculo na cloud (`recalcularEstoqueProduto`) usa `produto_id`, `tipo`, `quantidade`;
 * os restantes campos servem rastreio no painel Base44.
 */

import { invokeRecalcularEstoqueProduto } from '@/lib/p38StockRecalc';

/** Compara código do embarque com observações/documento (Base44 pode gravar maiúsculas diferentes). */
export function movimentoCombinaCodigoEmbarque(mov, codigoExibicao) {
  if (!codigoExibicao || !mov) return false;
  const c = String(codigoExibicao).trim().toLowerCase();
  if (!c) return false;
  const obs = String(mov.observacoes || '').toLowerCase();
  const doc = String(mov.documento_referencia || '').trim().toLowerCase();
  return obs.includes(c) || doc === c;
}

export function buildMovimentacaoRecepcaoCompraPayload({
  produtoId,
  produtoNome,
  quantidade,
  pedido,
  embarque,
}) {
  const refTipo = 'PedidoCompra';
  const refId = pedido?.id;
  const refNumero = pedido?.numero != null ? String(pedido.numero) : '';
  const embCodigo =
    embarque?.codigo_exibicao != null && String(embarque.codigo_exibicao).trim() !== ''
      ? String(embarque.codigo_exibicao).trim()
      : embarque?.numero != null
        ? String(embarque.numero)
        : '';

  const observacoes = embCodigo
    ? `Recepção pedido ${refNumero} · embarque ${embCodigo}`
    : `Recepção pedido ${refNumero}`;

  return {
    produto_id: produtoId,
    produto_nome: produtoNome,
    tipo: 'Entrada',
    motivo: 'Compra',
    quantidade,
    referencia_tipo: refTipo,
    referencia_id: refId,
    referencia_numero: refNumero,
    /** Liga o movimento ao embarque na UI (aba Recepção) e no painel Base44. */
    documento_referencia: embCodigo || undefined,
    observacoes,
  };
}

/**
 * Para embarques já «recebidos» na UI mas sem linhas em MovimentacaoEstoque (legado ou falha intermedia).
 * Cria apenas movimentos em falta (evita duplicar quando já há marca do código do embarque nas observações / documento_referencia).
 *
 * @returns número de movimentos criados
 */
export async function criarMovimentosStockRecepcaoEmFalta(base44, { pedido, embarque, movimentosExistentes = [] }) {
  const itens =
    Array.isArray(embarque?.itens_embarcados) && embarque.itens_embarcados.length > 0
      ? embarque.itens_embarcados
      : Array.isArray(embarque?.itens)
        ? embarque.itens
        : [];

  const codigoEmb = String(embarque?.codigo_exibicao || '').trim();

  let criados = 0;
  for (const item of itens) {
    const qRec = Number(item.quantidade_recebida) || 0;
    if (qRec <= 0) continue;
    const produtoId = item.produto_id_recebido_diferente || item.produto_id;
    if (!produtoId) continue;

    const jaExiste = movimentosExistentes.some((m) => {
      const marcaPorCodigo = codigoEmb && movimentoCombinaCodigoEmbarque(m, codigoEmb);
      const mesmoProduto =
        String(m.produto_id) === String(produtoId) &&
        m.tipo === 'Entrada' &&
        (m.motivo === 'Compra' || m.motivo == null || m.motivo === '');
      return marcaPorCodigo && mesmoProduto;
    });

    if (jaExiste) continue;

    await base44.entities.MovimentacaoEstoque.create(
      buildMovimentacaoRecepcaoCompraPayload({
        produtoId,
        produtoNome: item.produto_nome_recebido_diferente || item.produto_nome,
        quantidade: qRec,
        pedido,
        embarque,
      })
    );
    await invokeRecalcularEstoqueProduto(base44, produtoId);
    criados += 1;
  }

  return criados;
}
