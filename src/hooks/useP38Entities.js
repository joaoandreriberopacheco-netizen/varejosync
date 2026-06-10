import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { p38Keys, P38_GC_TIME, P38_STALE_TIME } from '@/lib/p38QueryConfig';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { dataHoje, toLocalDateKey } from '@/components/utils/dateUtils';

function valorPedidoVenda(pedido) {
  return Number(pedido?.valor_total ?? pedido?.total ?? 0) || 0;
}

const entityQueryDefaults = {
  staleTime: P38_STALE_TIME,
  gcTime: P38_GC_TIME,
};

export function fetchProdutosList(sort = '-created_date') {
  return base44.entities.Produto.list(sort);
}

export function fetchTerceirosList() {
  return base44.entities.Terceiro.list();
}

export function fetchFornecedores() {
  return base44.entities.Terceiro.filter({ $or: [{ tipo: 'Fornecedor' }, { tipo: 'Ambos' }] });
}

export function fetchPedidosVendaList(sort = '-created_date') {
  return base44.entities.PedidoVenda.list(sort);
}

export function fetchRascunhosPedidoVendaList(sort = '-created_date') {
  return base44.entities.RascunhoPedidoVenda.list(sort);
}

export async function fetchHomeKpis(dateKey, queryClient) {
  const produtosPromise = queryClient
    ? queryClient.fetchQuery({
        queryKey: p38Keys.produtos(),
        queryFn: () => fetchProdutosList(),
        staleTime: P38_STALE_TIME,
      })
    : fetchProdutosList();

  const pedidosPromise = queryClient
    ? queryClient.fetchQuery({
        queryKey: p38Keys.pedidosVenda(),
        queryFn: () => fetchPedidosVendaList('-created_date'),
        staleTime: P38_STALE_TIME,
      })
    : fetchPedidosVendaList('-created_date');

  const [allPedidos, produtos] = await Promise.all([pedidosPromise, produtosPromise]);
  const pedidos = Array.isArray(allPedidos) ? allPedidos : [];

  const vendasHoje = pedidos.filter(
    (v) => v?.created_date && toLocalDateKey(v.created_date) === dateKey
  );
  const pedidosPendentes = pedidos.filter((p) => p.status === 'Aguardando Caixa');
  const produtosAlerta = (produtos || []).filter(
    (p) => (p.estoque_atual || 0) <= (p.estoque_minimo || 0)
  );

  return {
    vendasHoje: vendasHoje.length,
    valorVendasHoje: roundToTwoDecimals(
      vendasHoje.reduce((sum, v) => sum + valorPedidoVenda(v), 0)
    ),
    estoqueAlerta: produtosAlerta.length,
    pedidosPendentes: pedidosPendentes.length,
  };
}

export function useProdutosListQuery(options = {}) {
  const sort = options.sort ?? '-created_date';
  const { sort: _sort, ...rest } = options;
  return useQuery({
    queryKey: p38Keys.produtos(sort),
    queryFn: () => fetchProdutosList(sort),
    ...entityQueryDefaults,
    ...rest,
  });
}

export function useFornecedoresQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.fornecedores(),
    queryFn: fetchFornecedores,
    ...entityQueryDefaults,
    ...options,
  });
}

export function useTerceirosListQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.terceiros(),
    queryFn: fetchTerceirosList,
    ...entityQueryDefaults,
    ...options,
  });
}

export function usePedidosVendaListQuery(options = {}) {
  const sort = options.sort ?? '-created_date';
  const { sort: _sort, ...rest } = options;
  return useQuery({
    queryKey: p38Keys.pedidosVenda(sort),
    queryFn: () => fetchPedidosVendaList(sort),
    ...entityQueryDefaults,
    ...rest,
  });
}

export function useRascunhosPedidoVendaListQuery(options = {}) {
  const sort = options.sort ?? '-created_date';
  const { sort: _sort, ...rest } = options;
  return useQuery({
    queryKey: p38Keys.rascunhosPedidoVenda(sort),
    queryFn: () => fetchRascunhosPedidoVendaList(sort),
    ...entityQueryDefaults,
    ...rest,
  });
}

export function useHomeKpisQuery(options = {}) {
  const dateKey = dataHoje();
  const queryClient = useQueryClient();
  const { enabled = true, ...rest } = options;

  return useQuery({
    queryKey: p38Keys.homeKpis(dateKey),
    queryFn: () => fetchHomeKpis(dateKey, queryClient),
    enabled,
    staleTime: 30 * 1000,
    gcTime: P38_GC_TIME,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    ...rest,
  });
}

export function useLogisticaEventosQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.logistica.eventos(),
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 500),
    ...entityQueryDefaults,
    ...options,
  });
}

export function useLogisticaEmbarquesQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.logistica.embarques(),
    queryFn: () => base44.entities.Embarque.list('-created_date', 500),
    ...entityQueryDefaults,
    ...options,
  });
}

export function useLogisticaLancamentosFretesQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.logistica.lancamentosFretes(),
    queryFn: () =>
      base44.entities.LancamentoFinanceiro.filter({ referencia_tipo: 'EventosLogisticos' }, '-created_date', 500),
    ...entityQueryDefaults,
    ...options,
  });
}

export function useLogisticaContasPrevistasQuery(options = {}) {
  return useQuery({
    queryKey: p38Keys.logistica.contasPrevistas(),
    queryFn: () => base44.entities.ContaPrevista.list('-data_vencimento', 500),
    ...entityQueryDefaults,
    ...options,
  });
}

export function useP38QueryInvalidation() {
  const queryClient = useQueryClient();

  return {
    invalidateProdutos: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'produto'] }),
    invalidateTerceiros: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'terceiro'] }),
    invalidatePedidosVenda: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'pedido-venda'] }),
    invalidateRascunhosPedidoVenda: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'rascunho-pedido-venda'] }),
    invalidateHomeKpis: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'home-kpis'] }),
    invalidateLogistica: () =>
      queryClient.invalidateQueries({ queryKey: [...p38Keys.all, 'logistica'] }),
  };
}
