import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: consulta mensal unificada em AGEFIN (Agenda Financeira). */
export default function AgefinConsultaPage() {
  return <Navigate to={createPageUrl('AgendaFinanceira')} replace />;
}
