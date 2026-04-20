import { Navigate } from 'react-router-dom';

/** Rota legada: o espelho do caixa fica apenas em /CaixasAtivos */
export default function ControleCaixasAtivos() {
  return <Navigate to="/CaixasAtivos" replace />;
}
