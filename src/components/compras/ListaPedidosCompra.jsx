import React, { useState } from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ChevronRight, AlertCircle, Trash2, Check, Package2, CalendarClock, Link2, Truck } from 'lucide-react';
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

function PedidoRow({ pedido, statusNome, onEdit, onDelete, selecionado, desabilitadoSelecao, onToggleSelecao, modoSelecao }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAtrasado = pedido.data_prevista_entrega && new Date(pedido.data_prevista_entrega + 'T12:00:00') < new Date();
  const isRascunho = pedido.status === 'Rascunho';
  const quantidadeItens = Array.isArray(pedido.itens) ? pedido.itens.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) : 0;
  const totalLinhas = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
  const temManifesto = !!pedido.manifesto_entrada_id;
  const temSupermanifesto = !!pedido.supermanifesto_id;

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
        {modoSelecao && (
          <button
            type="button"
            disabled={desabilitadoSelecao}
            onClick={(e) => {
              e.stopPropagation();
              if (!desabilitadoSelecao) onToggleSelecao?.(pedido);
            }}
            className={`ml-2 self-center w-6 h-6 rounded-md flex items-center justify-center shadow-sm transition-colors ${selecionado ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-transparent'} ${desabilitadoSelecao ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={desabilitadoSelecao ? 'Já enviado ao financeiro' : 'Selecionar pedido'}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (modoSelecao) return;
            onEdit(pedido);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (modoSelecao) return;
              onEdit(pedido);
            }
          }}
          className="flex-1 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left min-w-0 cursor-pointer"
        >
          <div className="hidden md:grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_auto] gap-x-6 items-center min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="bg-gray-100 dark:bg-gray-700 rounded-xl flex-none w-10 h-10 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">#</span>
              </span>
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[0.92rem] font-semibold text-gray-900 dark:text-white whitespace-nowrap leading-none">
                    {pedido.numero}
                  </span>
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
                <span className="block text-[0.74rem] text-gray-500 dark:text-gray-400 truncate">
                  {pedido.fornecedor_nome}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-0 text-[0.69rem]">
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 min-w-0">
                <Package2 className="w-3.5 h-3.5 flex-none text-gray-400 dark:text-gray-500" />
                <span>{totalLinhas} itens · Qtd. {quantidadeItens}</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 min-w-0">
                <CalendarClock className="w-3.5 h-3.5 flex-none text-gray-400 dark:text-gray-500" />
                <span>{pedido.data_prevista_entrega ? formatarDataCurta(pedido.data_prevista_entrega) : 'Sem previsão'}</span>
              </span>
              <span className={`flex items-center gap-1.5 min-w-0 ${temManifesto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                <Truck className={`w-3.5 h-3.5 flex-none ${temManifesto ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-400 dark:text-red-400'}`} />
                <span>{temManifesto ? 'Manifesto ok' : 'Sem manifesto'}</span>
              </span>
              <span className={`flex items-center gap-1.5 min-w-0 ${temSupermanifesto ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                <Link2 className={`w-3.5 h-3.5 flex-none ${temSupermanifesto ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <span>{temSupermanifesto ? 'Super ok' : 'Sem vínculo'}</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1 min-w-[118px]">
                <span className="text-[1rem] font-bold text-gray-900 dark:text-white whitespace-nowrap leading-none">
                  {R(pedido.valor_total)}
                </span>
                <span className="text-[0.68rem] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {pedido.data_emissao ? formatarDataCurta(pedido.data_emissao) : '—'}
                </span>
              </div>
              <span className="flex-none w-6 self-stretch relative">
                {isRascunho && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                    title="Excluir rascunho"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </span>
            </div>
          </div>

          <div className="md:hidden rounded-2xl bg-gray-50/70 dark:bg-white/[0.03] px-3 py-3 shadow-sm">
            <div className="flex items-start gap-3 min-w-0">
              <span className="bg-white dark:bg-gray-700 rounded-xl flex-none w-10 h-10 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">#</span>
              </span>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="block text-[0.94rem] font-semibold text-gray-900 dark:text-white leading-none">
                      {pedido.numero}
                    </span>
                    <span className="block text-[0.78rem] text-gray-500 dark:text-gray-400 leading-tight break-words">
                      {pedido.fornecedor_nome}
                    </span>
                    <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
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
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-none pl-2">
                    <span className="text-[1.02rem] font-bold text-gray-900 dark:text-white whitespace-nowrap leading-none">
                      {R(pedido.valor_total)}
                    </span>
                    <span className="text-[0.7rem] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {pedido.data_emissao ? formatarDataCurta(pedido.data_emissao) : '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.7rem]">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 min-w-0">
                    <Package2 className="w-3.5 h-3.5 flex-none text-gray-400 dark:text-gray-500" />
                    <span className="leading-tight">{totalLinhas} itens · Qtd. {quantidadeItens}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 min-w-0 justify-start">
                    <CalendarClock className="w-3.5 h-3.5 flex-none text-gray-400 dark:text-gray-500" />
                    <span className="leading-tight">{pedido.data_prevista_entrega ? formatarDataCurta(pedido.data_prevista_entrega) : 'Sem previsão'}</span>
                  </span>
                  <span className={`flex items-center gap-1.5 min-w-0 ${temManifesto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    <Truck className={`w-3.5 h-3.5 flex-none ${temManifesto ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-400 dark:text-red-400'}`} />
                    <span className="leading-tight break-words">{temManifesto ? 'Manifesto ok' : 'Sem manifesto'}</span>
                  </span>
                  <span className={`flex items-center gap-1.5 min-w-0 ${temSupermanifesto ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Link2 className={`w-3.5 h-3.5 flex-none ${temSupermanifesto ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className="leading-tight break-words">{temSupermanifesto ? 'Super ok' : 'Sem vínculo'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

function GrupoDia({ label, pedidos, onEdit, onDelete, selecionadosIds, onToggleSelecao, modoSelecao }) {
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
          selecionadosIds={selecionadosIds}
          onToggleSelecao={onToggleSelecao}
          modoSelecao={modoSelecao}
        />
      ))}
    </div>
  );
}