import { createPageUrl } from '@/components/utils';

/**
 * Volta uma entrada no histórico do React Router quando existir stack interno
 * (`history.state.idx` > 0). Caso contrário, navega para a página de fallback
 * (por defeito a landing configurada em `pages.config`, hoje Dashboard).
 */
export function navigateBackOr(navigate, fallbackPageName = 'Dashboard') {
  if (typeof window === 'undefined') {
    navigate(createPageUrl(fallbackPageName));
    return;
  }
  const idx = window.history.state?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
  } else {
    navigate(createPageUrl(fallbackPageName));
  }
}
