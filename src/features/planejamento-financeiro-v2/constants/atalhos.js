import { createPageUrl } from '@/components/utils';

/** Atalho para o formulário de novo lançamento financeiro (despesa). */
export function buildNovoLancamentoDespesaUrl() {
  const params = new URLSearchParams();
  params.set('novo', '1');
  params.set('tipo', 'Despesa');
  return `${createPageUrl('FluxoCaixa')}?${params.toString()}`;
}
