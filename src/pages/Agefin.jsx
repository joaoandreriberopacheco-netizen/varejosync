import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: redireciona para AGEFIN (Agenda Financeira). */
export default function AgefinPage() {
  return <Navigate to={createPageUrl('AgendaFinanceira')} replace />;
}
