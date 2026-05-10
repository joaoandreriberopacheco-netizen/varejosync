/**
 * USO ÚNICO — retificar stock da receção do embarque **5R8B3-A** (caso em que movimentos não foram criados).
 *
 * Executar em DEV (com sessão Base44 válida), na consola do browser:
 *   await window.__retificarEmbarque5r8b3()
 *
 * Depois de correr com sucesso, remover o bloco correspondente em `main.jsx`.
 */

import { criarMovimentosStockRecepcaoEmFalta } from '@/lib/movimentacaoRecepcaoCompra';
import { invokeRecalcularConclusaoPedidoCompra } from '@/lib/p38StockRecalc';

const CODIGO_EMBARQUE_NORMALIZADO = '5r8b3-a';

function motivoEntradaCompraOk(mov) {
  const m = mov?.motivo;
  if (m == null || m === '') return true;
  if (m === 'Compra') return true;
  return String(m).toLowerCase() === 'compra';
}

async function carregarMovimentosEntradaPedido(base44, pedido) {
  if (!pedido?.id) return [];
  const pid = pedido.id;
  let movs = await base44.entities.MovimentacaoEstoque.filter(
    { referencia_tipo: 'PedidoCompra', referencia_id: pid },
    '-created_date',
    150
  );
  if (!movs?.length) {
    movs = await base44.entities.MovimentacaoEstoque.filter(
      { referencia_tipo: 'PedidoCompra', referencia_id: String(pid) },
      '-created_date',
      150
    );
  }
  if (!movs?.length && pedido.numero != null && pedido.numero !== '') {
    try {
      movs = await base44.entities.MovimentacaoEstoque.filter(
        {
          referencia_tipo: 'PedidoCompra',
          referencia_numero: String(pedido.numero),
        },
        '-created_date',
        150
      );
    } catch (e) {
      console.warn('[oneOff 5R8B3] referencia_numero:', e?.message || e);
    }
  }
  return (movs || []).filter(
    (mov) => mov.tipo === 'Entrada' && motivoEntradaCompraOk(mov)
  );
}

function normCodigo(s) {
  return String(s || '').trim().toLowerCase();
}

async function encontrarEmbarque5r8b3(base44) {
  const alvo = CODIGO_EMBARQUE_NORMALIZADO;
  for (const cod of ['5R8B3-A', '5r8b3-a', '5R8B3-a', '5r8b3-A']) {
    const rows = await base44.entities.Embarque.filter({ codigo_exibicao: cod });
    if (rows?.[0]) return rows[0];
  }
  const recent = await base44.entities.Embarque.filter({}, '-updated_date', 500);
  return (recent || []).find((e) => normCodigo(e.codigo_exibicao) === alvo) || null;
}

/**
 * Se `quantidade_recebida` veio 0 no documento mas o embarque está recebido, usa embarcado como fallback (só neste fluxo one-off).
 */
function embarqueComQuantidadeRecebidaFallback(embarque) {
  const raw =
    Array.isArray(embarque?.itens_embarcados) && embarque.itens_embarcados.length > 0
      ? embarque.itens_embarcados
      : Array.isArray(embarque?.itens)
        ? embarque.itens
        : [];
  const patched = raw.map((it) => {
    const qRec = Number(it.quantidade_recebida) || 0;
    const qEmb = Number(it.quantidade_embarcada) || 0;
    if (qRec > 0) return it;
    if (qEmb <= 0) return it;
    return { ...it, quantidade_recebida: qEmb };
  });
  return {
    ...embarque,
    itens: patched,
    itens_embarcados: patched,
  };
}

/**
 * @returns {Promise<{ ok: boolean, criados?: number, error?: string, pedidoId?: string, embarqueId?: string, aviso?: string }>}
 */
export async function retificarEmbarque5r8b3UmaVez(base44) {
  const embarque = await encontrarEmbarque5r8b3(base44);
  if (!embarque) {
    return { ok: false, error: 'Embarque com código 5R8B3-A não encontrado na Base44.' };
  }

  const pedRows = await base44.entities.PedidoCompra.filter({
    id: embarque.pedido_compra_id,
  });
  const pedido = pedRows?.[0];
  if (!pedido) {
    return { ok: false, error: 'Pedido de compra ligado ao embarque não encontrado.' };
  }

  const movimentos = await carregarMovimentosEntradaPedido(base44, pedido);

  let criados = await criarMovimentosStockRecepcaoEmFalta(base44, {
    pedido,
    embarque,
    movimentosExistentes: movimentos,
  });

  let aviso;
  if (criados === 0) {
    const embPatch = embarqueComQuantidadeRecebidaFallback(embarque);
    criados = await criarMovimentosStockRecepcaoEmFalta(base44, {
      pedido,
      embarque: embPatch,
      movimentosExistentes: movimentos,
    });
    if (criados > 0) {
      aviso =
        'Usou quantidade embarcada como recebida onde recebida estava 0 — confira no painel Base44.';
    }
  }

  await invokeRecalcularConclusaoPedidoCompra(base44, pedido.id);

  return {
    ok: true,
    criados,
    pedidoId: pedido.id,
    embarqueId: embarque.id,
    aviso,
    message:
      criados === 0
        ? 'Nenhuma entrada nova: já existiam movimentos ou quantidades recebidas/embarcadas são 0.'
        : `${criados} movimento(s) de entrada criado(s).`,
  };
}
