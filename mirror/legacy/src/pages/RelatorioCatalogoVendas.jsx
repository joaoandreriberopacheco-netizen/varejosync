import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

/** Redireciona para o catálogo com geração automática do relatório de vendas. */
export default function RelatorioCatalogoVendas() {
  return <Navigate to={`${createPageUrl('Produtos')}?relatorioVendas=1`} replace />;
}
