import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Legado: abre o catálogo e gera o PDF com os filtros guardados. */
export default function RelatorioCatalogoEstoque() {
  return <Navigate to={`${createPageUrl('Produtos')}?relatorioEstoque=1`} replace />;
}
