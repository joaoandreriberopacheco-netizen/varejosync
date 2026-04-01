import React, { useState } from 'react';
import PedidoProgressBar from '@/components/compras/PedidoProgressBar';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ChevronDown, AlertCircle, Trash2, Check, Package2, CalendarClock, Truck, MapPin } from 'lucide-react';
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

const STATUS_CONFIG = {
  'Rascunho':             { dot: 'bg-gray-300 dark:bg-gray-600',     pill: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  'Aguardando Liberação': { dot: 'bg-amber-400 dark:bg-amber-400',    pill: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  'Aprovado':             { dot: 'bg-emerald-400 dark:bg-emerald-400',pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Despachado':           { dot: 'bg-blue-400 dark:bg-blue-400',      pill: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  'Em Recepção':          { dot: 'bg-violet-400 dark:bg-violet-400',  pill: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' },
  'Pendência':            { dot: 'bg-orange-400 dark:bg-orange-400',  pill: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  'Devolvido':            { dot: 'bg-rose-400 dark:bg-rose-400',      pill: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
  'Concluído':            { dot: 'bg-emerald-500 dark:bg-emerald-500',pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Cancelado':            { dot: 'bg-gray-300 dark:bg-gray-600',      pill: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' },
};

function EmbarqueInfo({ pedido }) {
  const temDespacho = !!pedido.data_despacho;
  const temChegada = !!pedido.data_chegada;

  if (temChegada) {
    return (
      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <MapPin className="w-3 h-3 flex-none" />
        <span>Chegou {formatarDataCurta(pedido.data_chegada)}</span>
      </span>
    );
  }
  if (temDespacho) {
    return (
      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
        <Truck className="w-3 h-3 flex-none" />
        <span>Despachado {formatarDataCurta(pedido.data_despacho)}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
      <Truck className="w-3 h-3 flex-none" />
      <span>Sem embarque</span>
    </span>
  );
}

function PedidoCard({ pedido, onEdit, onDelete, selecionado, desabilitadoSelecao, onToggleSelecao, modoSelecao }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAtrasado = pedido.data_prevista_entrega && new Date(pedido.data_prevista_entrega + 'T12:00:00') < new Date();
  const totalLinhas = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
  const totalQtd = Array.isArray(pedido.itens) ? pedido.itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0) : 0;
  const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG['Rascunho'];

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.PedidoCompra.delete(pedido.id);
    setDeleting(false);
    setShowConfirm(false);
    onDelete();
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (modoSelecao) { if (!desabilitadoSelecao) onToggleSelecao?.(pedido); return; }
          onEdit(pedido);
        }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!modoSelecao) onEdit(pedido); } }}
        className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.995] transition-all cursor-pointer overflow-hidden"
      >
        {/* Seleção overlay */}
        {modoSelecao && selecionado && (
          <div className="absolute inset-0 bg-emerald-500/8 dark:bg-emerald-500/10 rounded-2xl pointer-events-none" />
        )}

        <div className="px-4 py-3.5">
          {/* Linha principal */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Checkbox modo seleção */}
              {modoSelecao && (
                <div className={`flex-none w-5 h-5 rounded-md flex items-center justify-center transition-colors ${selecionado ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700'} ${desabilitadoSelecao ? 'opacity-40' : ''}`}>
                  {selecionado && <Check className="w-3 h-3" />}
                </div>
              )}

              {/* Dot de status */}
              <span className={`flex-none w-2.5 h-2.5 rounded-full mt-0.5 ${cfg.dot}`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.9rem] font-semibold text-gray-900 dark:text-white leading-none">
                    {pedido.numero}
                  </span>
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-semibold tracking-wide ${cfg.pill}`}>
                    {pedido.status}
                  </span>
                  {isAtrasado && pedido.status !== 'Concluído' && pedido.status !== 'Cancelado' && (
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Atrasado
                    </span>
                  )}
                </div>
                <p className="text-[0.75rem] text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {pedido.fornecedor_nome || '—'}
                </p>
              </div>
            </div>

            {/* Valor + data */}
            <div className="flex-none text-right">
              <p className="text-[0.95rem] font-bold text-gray-900 dark:text-white leading-none">
                {R(pedido.valor_total)}
              </p>
              <p className="text-[0.68rem] text-gray-400 dark:text-gray-500 mt-1">
                {pedido.data_emissao ? formatarDataCurta(pedido.data_emissao) : '—'}
              </p>
            </div>
          </div>

          {/* Linha de metadados */}
          <div className="mt-3 flex items-center gap-4 flex-wrap text-[0.7rem]">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Package2 className="w-3 h-3 flex-none" />
              <span>{totalLinhas} {totalLinhas === 1 ? 'item' : 'itens'}{totalQtd > 0 ? ` · ${totalQtd.toLocaleString('pt-BR')} un.` : ''}</span>
            </span>
            <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <CalendarClock className="w-3 h-3 flex-none" />
              <span>{pedido.data_prevista_entrega ? formatarDataCurta(pedido.data_prevista_entrega) : 'Sem previsão'}</span>
            </span>
            <EmbarqueInfo pedido={pedido} />
          </div>
          <PedidoProgressBar pedido={pedido} />
        </div>

        {/* Botão delete hover (rascunho) */}
        {pedido.status === 'Rascunho' && !modoSelecao && (
          <button
            onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Excluir rascunho"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl dark:bg-gray-900 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              O pedido <strong>{pedido.numero}</strong> será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-0 shadow-sm dark:bg-gray-800 dark:text-gray-200">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GrupoDia({ label, pedidos, onEdit, onDelete, selecionadosIds, onToggleSelecao, modoSelecao }) {
  const [open, setOpen] = useState(true);
  const valorTotal = pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);

  return (
    <div className="w-full space-y-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-1 group">
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-bold text-gray-500 dark:text-gray-400">{R(valorTotal)}</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </div>
      </button>
      {open && (
        <div className="space-y-2">
          {pedidos.map(p => (
            <PedidoCard
              key={p.id}
              pedido={p}
              onEdit={onEdit}
              onDelete={onDelete}
              modoSelecao={modoSelecao}
              selecionado={selecionadosIds.includes(p.id)}
              desabilitadoSelecao={p.status !== 'Rascunho' || !!p.status_aprovacao_financeira}
              onToggleSelecao={onToggleSelecao}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListaPedidosCompra({ grupos, loading, onEdit, onDelete, selecionadosIds = [], onToggleSelecao, modoSelecao = false }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
        <Package2 className="w-9 h-9 text-gray-200 dark:text-gray-700" />
        <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map(({ key, label, pedidos }) => (
        <GrupoDia
          key={key}
          label={label}
          pedidos={pedidos}
          onEdit={onEdit}
          onDelete={onDelete}
          selecionadosIds={selecionadosIds}
          onToggleSelecao={onToggleSelecao}
          modoSelecao={modoSelecao}
        />
      ))}
    </div>
  );
}