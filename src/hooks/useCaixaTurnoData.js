import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  caixaTurnoQueryKey,
  fetchCaixaTurnoSnapshot,
} from '@/lib/caixaTurnoData';

const CAIXA_STALE_MS = 30_000;
const CAIXA_GC_MS = 5 * 60 * 1000;

/**
 * Cache React Query por par turno+caixa (partilhado entre PDVCaixa e espelho).
 */
export function useCaixaTurnoData(turno, caixa, options = {}) {
  const {
    enabled = true,
    incluirRascunhos = true,
    rascunhoExigirItens = true,
    staleTime = CAIXA_STALE_MS,
    ...rest
  } = options;

  const turnoId = turno?.id;
  const caixaId = caixa?.id;

  return useQuery({
    queryKey: [
      ...caixaTurnoQueryKey(turnoId, caixaId),
      incluirRascunhos ? 'live' : 'fechado',
      rascunhoExigirItens ? 'itens' : 'sem-itens',
    ],
    queryFn: () =>
      fetchCaixaTurnoSnapshot({ turno, caixa, incluirRascunhos, rascunhoExigirItens }),
    enabled: enabled && !!turnoId && !!caixaId,
    staleTime,
    gcTime: CAIXA_GC_MS,
    ...rest,
  });
}

export function useInvalidateCaixaTurno() {
  const queryClient = useQueryClient();
  return {
    invalidateTurno: (turnoId, caixaId) =>
      queryClient.invalidateQueries({
        queryKey: caixaTurnoQueryKey(turnoId, caixaId),
      }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: ['caixa-turno-snapshot'] }),
  };
}
