import { createPageUrl } from '@/components/utils';

/**
 * Volta uma entrada no histórico do React Router quando existir stack interno
 * (`history.state.idx` > 0). Caso contrário, navega para a página de fallback
 * (por defeito Home).
 */
export function navigateBackOr(navigate, fallbackPageName = 'Home') {
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
