import { createPageUrl } from '@/components/utils';

/** Aba/vista usadas pelo atalho lateral do caixa (equivalente ao overlay rápido). */
export const PDV_CAIXA_QUICK_TAB = 'vendas';
export const PDV_CAIXA_QUICK_VIEW = 'aguardando';

const CAIXA_TABS = new Set(['balanco', 'vendas', 'movimentos']);
const CAIXA_VENDAS_VIEWS = new Set(['aguardando', 'consulta']);

export function buildPDVCaixaQuickUrl() {
  const base = createPageUrl('PDVCaixa');
  return `${base}?tab=${PDV_CAIXA_QUICK_TAB}&view=${PDV_CAIXA_QUICK_VIEW}`;
}

export function buildPDVVendedorQuickUrl() {
  return createPageUrl('PDVVendedor');
}

export function readPDVCaixaInitialFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const view = params.get('view');
  return {
    initialActiveTab: CAIXA_TABS.has(tab) ? tab : 'balanco',
    initialVendasView: CAIXA_VENDAS_VIEWS.has(view) ? view : 'aguardando',
  };
}
