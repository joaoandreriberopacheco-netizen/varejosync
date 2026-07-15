import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: redireciona para a nova Agenda Financeira (AGFIM). */
export default function AgefinPage() {
  return <Navigate to={createPageUrl('AgendaFinanceira')} replace />;
}
