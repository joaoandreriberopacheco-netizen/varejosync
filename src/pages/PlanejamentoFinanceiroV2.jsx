import { Navigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: /PlanejamentoFinanceiroV2 redireciona para a rota canónica. */
export default function PlanejamentoFinanceiroV2Redirect() {
  const { search } = useLocation();
  return <Navigate to={`${createPageUrl('PlanejamentoFinanceiro')}${search}`} replace />;
}
