import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Edit, ChevronRight, AlertCircle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const statusColors = {
  'Aberto': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'Confirmado': 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  'Em Separação': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  'Enviado': 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  'Recebido': 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  'Cancelado': 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

function PedidoRow({ pedido, statusNome, onEdit }) {
  const isAtrasado = pedido.data_prevista_entrega && new Date(pedido.data_prevista_entrega) < new Date();
  const statusKey = pedido.status || 'Aberto';

  return (
    <button
      onClick={() => onEdit(pedido)}
      className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left"
    >
      <span className="bg-gray-100 dark:bg-gray-700 rounded-lg flex-none w-8 h-8 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">#</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[0.82rem] font-semibold text-gray-900 dark:text-white truncate">
          {pedido.numero}
        </span>
        <span className="text-[0.7rem] text-gray-500 dark:text-gray-400 truncate">
          {pedido.fornecedor_nome}
        </span>
        <div className="flex items-center flex-wrap gap-1 mt-1">
          <span className={`text-[0.6rem] px-2 py-1 rounded-md font-medium ${statusColors[statusKey] || statusColors['Aberto']}`}>
            {statusNome}
          </span>
          {isAtrasado && (
            <span className="text-[0.6rem] px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              Atrasado
            </span>
          )}
        </div>
      </span>
      <span className="flex-none flex flex-col items-end gap-1 pl-1">
        <span className="text-[0.82rem] font-bold text-gray-900 dark:text-white whitespace-nowrap">
          {R(pedido.valor_total)}
        </span>
        <span className="text-[0.68rem] text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {pedido.data_prevista_entrega ? format(new Date(pedido.data_prevista_entrega), 'dd MMM', { locale: ptBR }) : '—'}
        </span>
      </span>
    </button>
  );
}

function GrupoStatus({ status, label, pedidos, statusPedidoCompra, onEdit }) {
  const [open, setOpen] = useState(true);
  const getStatusNome = (codigo) => {
    const s = statusPedidoCompra.find(sp => sp.codigo === codigo);
    return s?.nome || codigo;
  };
  
  const valorTotal = pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);

  return (
    <div className="w-full">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-2 group">
        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label} ({pedidos.length})
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[0.62rem] font-bold text-gray-600 dark:text-gray-300">{R(valorTotal)}</span>
          <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
          {pedidos.map(p => (
            <PedidoRow 
              key={p.id} 
              pedido={p} 
              statusNome={getStatusNome(p.status)}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListaPedidosCompra({ grupos, loading, statusPedidoCompra, onEdit }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
        <AlertCircle className="w-9 h-9 text-gray-200 dark:text-gray-700" />
        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupos.map(({ status, label, pedidos }) => (
        <GrupoStatus 
          key={status} 
          status={status}
          label={label} 
          pedidos={pedidos} 
          statusPedidoCompra={statusPedidoCompra}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}