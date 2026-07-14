import { useQueryClient } from '@tanstack/react-query';
import { useHomeKpisQuery } from '@/hooks/useP38Entities';
import { p38Keys } from '@/lib/p38QueryConfig';

const DEFAULT_KPIS = {
  vendasHoje: 0,
  valorVendasHoje: 0,
  estoqueAlerta: 0,
  pedidosPendentes: 0,
};

/**
 * KPIs da Home — cache via React Query (partilha catálogo com Produtos).
 * @deprecated Preferir useHomeKpisQuery directamente em código novo.
 */
export function useKPIsCache(options = {}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useHomeKpisQuery(options);

  return {
    kpis: data ?? DEFAULT_KPIS,
    isLoading: isLoading || isFetching,
    loadKPIs: refetch,
    clearCache: () => queryClient.removeQueries({ queryKey: [...p38Keys.all, 'home-kpis'] }),
  };
}
