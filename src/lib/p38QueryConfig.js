/** Cache React Query P38 — entidades quentes partilhadas entre ecrãs */

/** Dados estáveis por 2 min; evita refetch ao voltar ao mesmo módulo */
export const P38_STALE_TIME = 2 * 60 * 1000;

/** Mantém cache em memória 10 min após último uso */
export const P38_GC_TIME = 10 * 60 * 1000;

export const p38Keys = {
  all: ['p38'],
  produtos: (sort = '-created_date') => [...p38Keys.all, 'produto', 'list', sort],
  terceiros: () => [...p38Keys.all, 'terceiro', 'list'],
  fornecedores: () => [...p38Keys.all, 'terceiro', 'fornecedores'],
  pedidosVenda: (sort = '-created_date') => [...p38Keys.all, 'pedido-venda', 'list', sort],
  rascunhosPedidoVenda: (sort = '-created_date') => [...p38Keys.all, 'rascunho-pedido-venda', 'list', sort],
  homeKpis: (dateKey) => [...p38Keys.all, 'home-kpis', dateKey],
  intervenientes: () => [...p38Keys.all, 'intervenientes'],
  logistica: {
    eventos: () => [...p38Keys.all, 'logistica', 'eventos'],
    embarques: () => [...p38Keys.all, 'logistica', 'embarques'],
    lancamentosFretes: () => [...p38Keys.all, 'logistica', 'lancamentos-fretes'],
    contasPrevistas: () => [...p38Keys.all, 'logistica', 'contas-previstas'],
    embarquesPorEvento: (eventoId) => [...p38Keys.all, 'logistica', 'embarques-evento', eventoId],
  },
};
