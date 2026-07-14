import { dataMenosDiasSistema } from '@/components/utils/dateUtils';

export const FILTRO_COMPRAS_ULTIMOS_30_DIAS_DEFAULT = true;
export const FILTRO_COMPRAS_SOMENTE_NAO_CONCLUIDOS_DEFAULT = false;
export const FILTRO_COMPRAS_JANELA_DIAS = 30;

/**
 * Visibilidade padrão da lista de embarques:
 * - Somente não concluídos: esconde todos os concluídos.
 * - Últimos 30 dias (padrão): mostra pedidos do período + não concluídos mais antigos.
 * - Ambos desligados: mostra tudo.
 */
export function passaFiltroVisibilidadePedidosCompra(
  item,
  {
    somenteNaoConcluidos = false,
    ultimos30Dias = FILTRO_COMPRAS_ULTIMOS_30_DIAS_DEFAULT,
    getDataPedido,
    isConcluido,
    janelaDias = FILTRO_COMPRAS_JANELA_DIAS,
  } = {},
) {
  const concluido = isConcluido(item);

  if (somenteNaoConcluidos) {
    return !concluido;
  }

  if (!ultimos30Dias) {
    return true;
  }

  if (!concluido) {
    return true;
  }

  const dataPedido = getDataPedido(item);
  if (!dataPedido) {
    return true;
  }

  const limite = dataMenosDiasSistema(janelaDias);
  return dataPedido >= limite;
}
