import { Link } from 'react-router-dom';
import { ArrowLeft, Warehouse } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/components/utils';
import CorrecaoRecepcaoEstoquePainel from '@/components/config/CorrecaoRecepcaoEstoquePainel';

export default function CorrecaoRecepcaoEstoquePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-16 pt-2">
      <Link
        to={createPageUrl('PedidosCompra')}
        className="inline-flex items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar a Embarques
      </Link>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-glacial flex items-center gap-2">
          <Warehouse className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Correção de stock após recepção (lote)
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Simula ou aplica entradas em falta, para vários pedidos de uma vez — só administradores.
        </p>
      </div>

      {isAdmin ? (
        <CorrecaoRecepcaoEstoquePainel />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Precisas de sessão como <strong>administrador</strong> para usar esta ferramenta.
        </div>
      )}
    </div>
  );
}
