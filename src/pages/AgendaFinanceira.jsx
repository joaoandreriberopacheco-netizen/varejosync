import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: rota antiga redireciona para Planejamento financeiro. */
export default function AgendaFinanceiraPage() {
  return <Navigate to={createPageUrl('PlanejamentoFinanceiroV2')} replace />;
}
