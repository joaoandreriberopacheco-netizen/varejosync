import React, { useState, useMemo } from 'react';
import PedidoProgressBar from '@/components/compras/PedidoProgressBar';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ChevronDown, AlertCircle, Trash2, Check, Package2, CalendarClock, Truck } from 'lucide-react';
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
  'Aguardando Liberação': { dot: 'bg-emerald-300 dark:bg-emerald-500/80', pill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  'Aprovado':             { dot: 'bg-emerald-400 dark:bg-emerald-400',pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Despachado':           { dot: 'bg-cyan-400 dark:bg-cyan-400',      pill: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
  'Em Trânsito':          { dot: 'bg-sky-400 dark:bg-sky-400',        pill: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400' },
  'Entregue':             { dot: 'bg-emerald-500 dark:bg-emerald-500',pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Pendência':            { dot: 'bg-orange-400 dark:bg-orange-400',  pill: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  'Devolvido':            { dot: 'bg-rose-400 dark:bg-rose-400',      pill: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
  'Concluído':            { dot: 'bg-emerald-500 dark:bg-emerald-500',pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Cancelado':            { dot: 'bg-gray-300 dark:bg-gray-600',      pill: 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' },
};

// Adiciona animação de piscar ao CSS global
if (typeof document !== 'undefined' && !document.getElementById('blink-animation')) {
  const style = document.createElement('style');
  style.id = 'blink-animation';
  style.innerHTML = `
    @keyframes blink-red-amber {
      0%, 100% { background-color: rgb(239, 68, 68); }
      50% { background-color: rgb(217, 119, 6); }
    }
    .animate-blink-led {
      animation: blink-red-amber 1s infinite;
    }
  `;
  document.head.appendChild(style);
}

function EmbarquesInfo({ pedido }) {
  const embarques = pedido.embarques_registrados || [];
  const primeiroEmbarque = embarques[0];
  const segundoEmbarque = embarques[1];

  if (!primeiroEmbarque) {
    return (
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
        <Truck className="w-3 h-3 flex-none" />
        <span>Sem embarque</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-[0.7rem]">
      <div className="flex items-center gap-4 flex-wrap text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Truck className="w-3 h-3 flex-none" />
          <span>{primeiroEmbarque.transportadora_nome || 'Não informado'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3 flex-none" />
          <span>{primeiroEmbarque.eta ? formatarDataCurta(primeiroEmbarque.eta) : 'Sem previsão'}</span>
        </span>
      </div>
      {segundoEmbarque && (
        <div className="flex items-center gap-4 flex-wrap text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3 h-3 flex-none" />
            <span>{segundoEmbarque.transportadora_nome || 'Não informado'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3 flex-none" />
            <span>{segundoEmbarque.eta ? formatarDataCurta(segundoEmbarque.eta) : 'Sem previsão'}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function getLEDStatus(pedido) {
  const dataAprovacao = pedido.data_aprovacao_financeira ? new Date(pedido.data_aprovacao_financeira) : null;
  const diasAposAprovacao = dataAprovacao ? Math.floor((new Date() - dataAprovacao) / (1000 * 60 * 60 * 24)) : null;

  const semPendencias = !pedido.tem_divergencias;
  const statusFinalizado = pedido.status === 'Entregue' || pedido.status === 'Concluído';
  const cicloEncerrado = semPendencias && statusFinalizado;
  const isPagamentoAutorizado = pedido.status_aprovacao_financeira === 'Aprovado';

  const isVermelho = !cicloEncerrado && diasAposAprovacao !== null && diasAposAprovacao >= 20;
  const isAmbar = isPagamentoAutorizado && pedido.tem_divergencias;
  const isPisca = isVermelho && isAmbar;
  const isVerde = cicloEncerrado;

  return { isVermelho, isAmbar, isPisca, isVerde };
}

function PedidoCard({ pedido, onEdit, onDelete, selecionado, desabilitadoSelecao, onToggleSelecao, modoSelecao }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalLinhas = Array.isArray(pedido.itens) ? pedido.itens.length : 0;
  const totalQtd = Array.isArray(pedido.itens) ? pedido.itens.reduce((a, i) => a + (Number(i.quantidade) || 0), 0) : 0;
  const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG['Rascunho'];
  const { isVermelho, isAmbar, isPisca, isVerde } = useMemo(() => getLEDStatus(pedido), [pedido.id, pedido.status, pedido.data_aprovacao_financeira, pedido.status_aprovacao_financeira, pedido.tem_divergencias]);

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

              {/* LED com lógica de status */}
              <span className={`flex-none w-2.5 h-2.5 rounded-full mt-0.5 ${
                isPisca ? 'animate-blink-led' :
                isVerde ? 'bg-emerald-500 dark:bg-emerald-400' :
                isVermelho ? 'bg-red-500 dark:bg-red-500' :
                isAmbar ? 'bg-amber-400 dark:bg-amber-400' :
                cfg.dot
              }`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[0.9rem] font-semibold text-gray-900 dark:text-white leading-none font-mono tracking-[0.08em]">
                    {pedido.numero}
                  </span>
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded-full font-semibold tracking-wide ${cfg.pill}`}>
                    {pedido.status}
                  </span>
                  {isAmbar && (
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold">
                      Pendências
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
                {R(pedido.valor_pendente_entrega ?? pedido.valor_total)}
              </p>
              <p className="text-[0.68rem] text-gray-400 dark:text-gray-500 mt-1">
                {pedido.data_emissao ? formatarDataCurta(pedido.data_emissao) : '—'}
              </p>
            </div>
          </div>

          {/* Linha de metadados */}
          <div className="mt-3 flex flex-col gap-2 text-[0.7rem]">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Package2 className="w-3 h-3 flex-none" />
                <span>{totalLinhas} {totalLinhas === 1 ? 'item' : 'itens'}{totalQtd > 0 ? ` · ${totalQtd.toLocaleString('pt-BR')} un.` : ''}</span>
              </span>
            </div>
            <EmbarquesInfo pedido={pedido} />
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
              O pedido <strong className="font-mono tracking-[0.08em]">{pedido.numero}</strong> será excluído permanentemente.
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

function GrupoDia({ label, pedidos, onEdit, onDelete, selecionadosIds, onToggleSelecao, modoSelecao, className = '' }) {
  const [open, setOpen] = useState(true);
  const valorTotal = pedidos.reduce((acc, p) => {
    const valorPedido = p.valor_pendente_entrega ?? p.valor_total ?? 0;
    return acc + valorPedido;
  }, 0);

  return (
    <div className={`w-full space-y-2 ${className}`}>
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
      {grupos.map(({ key, label, pedidos }, index) => {
        const previousLabel = grupos[index - 1]?.label || '';
        const isSpecialTransition = (
          (previousLabel.includes('Sem transportador') && label.includes('Sem ETA')) ||
          (previousLabel.includes('Sem ETA') && label.includes('Sem transportador'))
        );

        return (
          <GrupoDia
            key={key}
            label={label}
            pedidos={pedidos}
            onEdit={onEdit}
            onDelete={onDelete}
            selecionadosIds={selecionadosIds}
            onToggleSelecao={onToggleSelecao}
            modoSelecao={modoSelecao}
            className={index > 0 ? (isSpecialTransition ? 'pt-5' : 'pt-3') : ''}
          />
        );
      })}
    </div>
  );
}