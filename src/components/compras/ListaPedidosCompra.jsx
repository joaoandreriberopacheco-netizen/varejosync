import React, { useState } from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const statusColors = {
  'Rascunho':             'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  'Aguardando Liberação': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  'Aprovado':             'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  'Despachado':           'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  'Em Recepção':          'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  'Pendência':            'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  'Devolvido':            'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
  'Concluído':            'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  'Cancelado':            'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

function PedidoRow({ pedido, statusNome, onEdit, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAtrasado = pedido.data_prevista_entrega && new Date(pedido.data_prevista_entrega + 'T12:00:00') < new Date();
  const isRascunho = pedido.status === 'Rascunho';

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.PedidoCompra.delete(pedido.id);
    setDeleting(false);
    setShowConfirm(false);
    onDelete();
  };

  return (
    <>
      <div className="w-full flex items-stretch group">
        <button
          onClick={() => onEdit(pedido)}
          className="flex-1 flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left min-w-0"
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
              <span className={`text-[0.6rem] px-2 py-1 rounded-md font-medium ${statusColors[pedido.status] || statusColors['Rascunho']}`}>
                {pedido.status}
              </span>
              {isAtrasado && pedido.status !== 'Concluído' && pedido.status !== 'Cancelado' && (
                <span className="text-[0.6rem] px-2 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Atrasado
                </span>
              )}
            </div>
          </span>
          {/* Bloco direito — largura fixa para todos os rows, lixeira sobreposta */}
          <span className="flex-none flex flex-col items-end gap-1 pl-1 w-20 relative">
            <span className="text-[0.82rem] font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {R(pedido.valor_total)}
            </span>
            <span className="text-[0.68rem] text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {pedido.data_prevista_entrega ? formatarDataCurta(pedido.data_prevista_entrega) : '—'}
            </span>
            {/* Lixeira sobreposta — não altera o layout */}
            {isRascunho && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 bg-white/80 dark:bg-gray-800/80 rounded"
                title="Excluir rascunho"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </span>
        </button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              O pedido <strong>{pedido.numero}</strong> será excluído permanentemente. O número ficará como lacuna na sequência — isso é esperado e não gera problemas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-gray-200 dark:border-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GrupoDia({ label, pedidos, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);
  const valorTotal = pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);

  return (
    <div className="w-full">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-2 group">
        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label}
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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListaPedidosCompra({ grupos, loading, onEdit, onDelete }) {
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
      {grupos.map(({ key, label, pedidos }) => (
        <GrupoDia 
          key={key} 
          label={label} 
          pedidos={pedidos}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}