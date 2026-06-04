import React, { useState, useMemo } from 'react';
import PedidoProgressBar from '@/components/compras/PedidoProgressBar';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ChevronDown, AlertCircle, Trash2, Check, Package2, CalendarClock, Truck, CalendarDays } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatQuantity } from '@/lib/financialUtils';
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
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
  p38StatusTone,
} from '@/components/ui/p38-mobile-line';

const R = (v) => {
  const n = v || 0;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
};

const STATUS_CONFIG = {
  'Rascunho': { dot: 'bg-muted dark:bg-muted', pill: 'bg-muted text-muted-foreground' },
  'Aguardando': { dot: 'bg-red-500 dark:bg-red-500', pill: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
  'Aguardando Aprovação Financeira': { dot: 'bg-amber-400 dark:bg-amber-400', pill: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  'Aguardando Liberação Financeira': { dot: 'bg-amber-400 dark:bg-amber-400', pill: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  'Aguardando Liberação': { dot: 'bg-amber-400 dark:bg-amber-400', pill: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  'Aprovado': { dot: 'bg-lime-400 dark:bg-lime-400', pill: 'bg-lime-50 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300' },
  'Despachado': { dot: 'bg-cyan-400 dark:bg-cyan-400', pill: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
  'Concluído': { dot: 'bg-emerald-500 dark:bg-emerald-500', pill: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  'Cancelado': { dot: 'bg-muted dark:bg-muted', pill: 'bg-muted text-muted-foreground' },
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
  const embarque = pedido._embarque;
  const itensEmbarque = embarque?.itens || embarque?.itens_embarcados || [];
  const itensDisplay = pedido._display_itens || [];
  const unidadesCard = [...new Set(itensDisplay.map((i) => String(i.unidade_medida || '').trim()).filter(Boolean))];
  const sufixoUnidade = unidadesCard.length === 1 ? unidadesCard[0] : 'un.';
  const temItensAssociados = itensEmbarque.some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
  const quantidadePendente = pedido._quantidade_pendente ?? 0;
  const embarqueDormindo = embarque?.tipo === 'Necessidade' && !embarque?.transportadora_id && !embarque?.transportadora_nome && !embarque?.data_embarque && !embarque?.eta && !temItensAssociados && quantidadePendente <= 0;

  if (embarqueDormindo) return null;

  return (
    <div className="flex items-center gap-4 flex-wrap text-[0.7rem] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Truck className="w-3 h-3 flex-none" />
        <span>{embarque?.transportadora_nome || 'Sem transportadora'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <CalendarClock className="w-3 h-3 flex-none" />
        <span>{embarque?.eta ? formatarDataCurta(embarque.eta) : 'Sem previsão'}</span>
      </span>
      <span className="text-muted-foreground">
        {pedido._display_ordinal || '#01'}
      </span>
      {pedido._is_necessidade && (pedido._quantidade_pendente ?? 0) > 0 && (
        <span className="text-red-500 dark:text-red-400 font-medium">
          {formatQuantity(pedido._quantidade_pendente)} {sufixoUnidade} faltando embarcar
        </span>
      )}
    </div>
  );
}

function getLEDStatus(pedido) {
  const embarque = pedido._embarque;
  const statusPedido = pedido._display_status || pedido.status;
  const itensEmbarque = embarque?.itens || embarque?.itens_embarcados || [];
  const temItensAssociados = itensEmbarque.some((item) => (Number(item?.quantidade_embarcada) || 0) > 0);
  const temTransporte = !!(embarque?.transportadora_id || embarque?.transportadora_nome || embarque?.data_embarque || embarque?.eta);

  if (embarque?.tipo === 'Necessidade' && !temItensAssociados && !temTransporte) {
    return { isVermelho: true, isAmbar: false, isPisca: false, isVerde: false, isCyan: false, hasActiveDivergence: false };
  }

  if (statusPedido === 'Concluído') {
    return { isVermelho: false, isAmbar: false, isPisca: false, isVerde: true, isCyan: false, hasActiveDivergence: false };
  }

  if (statusPedido === 'Despachado') {
    return { isVermelho: false, isAmbar: false, isPisca: false, isVerde: false, isCyan: true, hasActiveDivergence: false };
  }

  if (statusPedido === 'Aguardando Aprovação Financeira' || statusPedido === 'Aguardando Liberação') {
    return { isVermelho: false, isAmbar: true, isPisca: false, isVerde: false, isCyan: false, hasActiveDivergence: false };
  }

  return { isVermelho: false, isAmbar: false, isPisca: false, isVerde: false, isCyan: false, hasActiveDivergence: false };
}

function pedidoAccentFromStatus(displayStatus, led) {
  if (led?.isVerde || displayStatus === 'Concluído') return 'success';
  if (led?.isCyan || displayStatus === 'Despachado') return 'info';
  if (led?.isAmbar || String(displayStatus).includes('Aguard') || String(displayStatus).includes('Aprovação')) return 'warning';
  if (led?.isVermelho || displayStatus === 'Cancelado') return 'danger';
  if (displayStatus === 'Aprovado') return 'success';
  return 'muted';
}

function PedidoMobileLine({ pedido, onEdit, onDelete, selecionado, desabilitadoSelecao, onToggleSelecao, modoSelecao, striped }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isVirtualCard = !!pedido._display_status;
  const displayStatus = pedido._display_status || pedido.status;
  const displayStatusLabel = displayStatus === 'Aguardando Liberação Financeira' || displayStatus === 'Aguardando Aprovação Financeira'
    ? 'Aguard. Pgto'
    : displayStatus;

  const itensDisplay = pedido._display_itens || (pedido.status === 'Pendência'
    ? (pedido.itens || []).filter(i => ((Number(i.quantidade) || 0) - (Number(i.quantidade_vinculada) || 0)) > 0)
    : (pedido.itens || []));
  const totalLinhas = itensDisplay.length;
  const totalQtd = itensDisplay.reduce((a, i) => a + (Number(i.quantidade) || 0), 0);
  const totalQtdEmbarcada = itensDisplay.reduce((a, i) => a + (Number(i.quantidade_embarcada) || 0), 0);
  const totalQtdPedidaCard = itensDisplay.reduce((a, i) => a + (Number(i.quantidade_pedida) || Number(i.quantidade) || 0), 0);
  const unidadesCard = [...new Set(itensDisplay.map((i) => String(i.unidade_medida || '').trim()).filter(Boolean))];
  const sufixoUnidade = unidadesCard.length === 1 ? unidadesCard[0] : 'un.';
  const valorExibido = pedido._display_valor ?? (pedido.status === 'Pendência'
    ? (pedido.valor_pendente_entrega ?? pedido.valor_total)
    : pedido.valor_total);

  const led = useMemo(() => {
    if (isVirtualCard) {
      const quantidadePendente = pedido._quantidade_pendente ?? 0;
      return {
        isVerde: displayStatus === 'Concluído',
        isAmbar: displayStatus === 'Aguardando Aprovação Financeira',
        isVermelho: pedido._embarque?.tipo === 'Necessidade' && !(pedido._embarque?.transportadora_id || pedido._embarque?.transportadora_nome || pedido._embarque?.data_embarque || pedido._embarque?.eta) && (
          !((pedido._embarque?.itens || pedido._embarque?.itens_embarcados || []).some((item) => (Number(item?.quantidade_embarcada) || 0) > 0)) || quantidadePendente > 0
        ),
        isPisca: false,
        isCyan: displayStatus === 'Despachado',
      };
    }
    return getLEDStatus(pedido);
  }, [pedido, displayStatus, isVirtualCard]);

  const accent = pedidoAccentFromStatus(displayStatus, led);
  const codigo = String(pedido._display_code || pedido.numero || '').replace(' - ', '-').replace(/\s+/g, '');

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.PedidoCompra.delete(pedido.id);
    setDeleting(false);
    setShowConfirm(false);
    onDelete();
  };

  const qtdLabel = pedido._is_necessidade
    ? (totalQtd > 0 ? `${formatQuantity(totalQtd)} ${sufixoUnidade} pend.` : '')
    : totalQtdEmbarcada > 0
      ? `${formatQuantity(totalQtdEmbarcada)} / ${formatQuantity(totalQtdPedidaCard)} ${sufixoUnidade}`
      : (totalQtd > 0 ? `${formatQuantity(totalQtd)} ${sufixoUnidade}` : '');

  return (
    <>
      <P38MobileLine
        striped={striped}
        accent={p38AccentKeyFromTone(accent)}
        onClick={() => {
          if (modoSelecao) { if (!desabilitadoSelecao) onToggleSelecao?.(pedido); return; }
          onEdit(pedido);
        }}
        title={codigo}
        subtitle={pedido._display_fornecedor || pedido.fornecedor_nome || '—'}
        meta={
          <>
            <P38StatusLabel tone={p38StatusTone(displayStatus)}>{displayStatusLabel}</P38StatusLabel>
            <span>{totalLinhas} {totalLinhas === 1 ? 'item' : 'itens'}{qtdLabel ? ` · ${qtdLabel}` : ''}</span>
            {pedido._display_date ? <span>{formatarDataCurta(pedido._display_date)}</span> : null}
          </>
        }
        value={R(valorExibido)}
        trailing={
          <div className="flex items-center gap-0.5 shrink-0">
            {modoSelecao && (
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${selecionado ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${desabilitadoSelecao ? 'opacity-40' : ''}`}>
                {selecionado && <Check className="w-3 h-3" />}
              </div>
            )}
            {pedido.status === 'Rascunho' && !modoSelecao && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500"
                aria-label="Excluir rascunho"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border border-border/40 dark:bg-background max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              O pedido <strong className="font-mono">{pedido.numero}</strong> será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PedidoCard({ pedido, onEdit, onDelete, selecionado, desabilitadoSelecao, onToggleSelecao, modoSelecao }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isVirtualCard = !!pedido._display_status;
  const displayStatus = pedido._display_status || pedido.status;
  const displayStatusLabel = displayStatus === 'Aguardando Liberação Financeira'
    ? 'Aguard. Pgto'
    : displayStatus === 'Aguardando Aprovação Financeira'
      ? 'Aguard. Pgto'
      : displayStatus;

  const itensDisplay = pedido._display_itens || (pedido.status === 'Pendência'
    ? (pedido.itens || []).filter(i => ((Number(i.quantidade) || 0) - (Number(i.quantidade_vinculada) || 0)) > 0)
    : (pedido.itens || []));
  const totalLinhas = itensDisplay.length;
  const totalQtd = itensDisplay.reduce((a, i) => a + (Number(i.quantidade) || 0), 0);
  const totalQtdEmbarcada = itensDisplay.reduce((a, i) => a + (Number(i.quantidade_embarcada) || 0), 0);
  const totalQtdPedidaCard = itensDisplay.reduce((a, i) => a + (Number(i.quantidade_pedida) || Number(i.quantidade) || 0), 0);
  const unidadesCard = [...new Set(itensDisplay.map((i) => String(i.unidade_medida || '').trim()).filter(Boolean))];
  const sufixoUnidade = unidadesCard.length === 1 ? unidadesCard[0] : 'un.';
  const valorExibido = pedido._display_valor ?? (pedido.status === 'Pendência'
    ? (pedido.valor_pendente_entrega ?? pedido.valor_total)
    : pedido.valor_total);
  const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG[pedido.status] || STATUS_CONFIG['Rascunho'];

  // LED: cards virtuais refletem seu próprio status; cards pai usam lógica FASE 2+
  const { isVermelho, isAmbar, isPisca, isVerde, isCyan } = useMemo(() => {
    if (isVirtualCard) {
      const quantidadePendente = pedido._quantidade_pendente ?? 0;
      return {
        isVerde: displayStatus === 'Concluído',
        isAmbar: displayStatus === 'Aguardando Aprovação Financeira',
        isVermelho: pedido._embarque?.tipo === 'Necessidade' && !(pedido._embarque?.transportadora_id || pedido._embarque?.transportadora_nome || pedido._embarque?.data_embarque || pedido._embarque?.eta) && (
          !((pedido._embarque?.itens || pedido._embarque?.itens_embarcados || []).some((item) => (Number(item?.quantidade_embarcada) || 0) > 0)) || quantidadePendente > 0
        ),
        isPisca: false,
        isCyan: displayStatus === 'Despachado',
      };
    }
    return getLEDStatus(pedido);
  }, [pedido.id, pedido.status, displayStatus, isVirtualCard, pedido._embarque]);



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
        className="group relative w-full min-w-0 box-border bg-muted rounded-2xl shadow-sm hover:shadow-md active:scale-[0.995] transition-all cursor-pointer overflow-hidden"
      >
        {/* Seleção overlay */}
        {modoSelecao && selecionado && (
          <div className="absolute inset-0 bg-emerald-500/8 dark:bg-emerald-500/10 rounded-2xl pointer-events-none" />
        )}

        <div className="w-full min-w-0 px-3 py-3 overflow-hidden">
          {/* Linha principal */}
          <div className="flex w-full min-w-0 items-stretch justify-between gap-1.5 overflow-hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
              {/* Checkbox modo seleção */}
              {modoSelecao && (
                <div className={`flex-none w-5 h-5 rounded-md flex items-center justify-center transition-colors ${selecionado ? 'bg-emerald-500 text-white' : 'bg-muted'} ${desabilitadoSelecao ? 'opacity-40' : ''}`}>
                  {selecionado && <Check className="w-3 h-3" />}
                </div>
              )}

              {/* LED com lógica de status */}
              <span className={`flex-none w-2.5 h-2.5 rounded-full mt-0.5 ${
                isPisca ? 'animate-blink-led' :
                isVerde ? 'bg-emerald-500 dark:bg-emerald-400' :
                displayStatus === 'Aprovado' ? 'bg-lime-400 dark:bg-lime-400' :
                isCyan ? 'bg-cyan-400 dark:bg-cyan-400' :
                isVermelho ? 'bg-red-500 dark:bg-red-500' :
                isAmbar ? 'bg-amber-400 dark:bg-amber-400' :
                cfg.dot
              }`} />

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 items-start justify-between gap-2 overflow-hidden">
                  <div className="min-w-0 flex-1 overflow-hidden" style={{maxWidth: '55%'}}>
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-semibold text-foreground leading-none font-mono tracking-[0.01em]">
                      {String(pedido._display_code || pedido.numero || '').replace(' - ', '-').replace(/\s+/g, '')}
                    </span>
                    <p className="mt-1 text-[0.78rem] font-medium text-muted-foreground leading-tight">
                      {pedido._display_fornecedor || pedido.fornecedor_nome || '—'}
                    </p>
                    <div className="mt-1">
                      <span className={`inline-flex max-w-[5.5rem] text-[0.6rem] px-1.5 py-[0.1rem] rounded-full font-semibold tracking-tight whitespace-nowrap truncate ${cfg.pill}`}>
                        {displayStatusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Valor + data */}
            <div className="flex-none text-right shrink-0 flex flex-col justify-center gap-0.5 pl-1">
              <p className="text-[0.92rem] font-bold text-foreground leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {R(valorExibido)}
              </p>
              <p className="text-[0.64rem] text-muted-foreground whitespace-nowrap">
                {pedido._display_date ? formatarDataCurta(pedido._display_date) : '—'}
              </p>
            </div>
          </div>

          {/* Linha de metadados */}
          <div className="mt-3 flex flex-col gap-2 text-[0.7rem]">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Package2 className="w-3 h-3 flex-none" />
                <span>
                  {totalLinhas} {totalLinhas === 1 ? 'item' : 'itens'}
                  {pedido._is_necessidade
                    ? (totalQtd > 0 ? ` · ${formatQuantity(totalQtd)} ${sufixoUnidade} pend.` : '')
                    : totalQtdEmbarcada > 0
                      ? ` · ${formatQuantity(totalQtdEmbarcada)} de ${formatQuantity(totalQtdPedidaCard)} ${sufixoUnidade}`
                      : (totalQtd > 0 ? ` · ${formatQuantity(totalQtd)} ${sufixoUnidade}` : '')}
                </span>
              </span>

            </div>
            <EmbarquesInfo pedido={pedido} />
          </div>
          <PedidoProgressBar
            pedido={isVirtualCard
              ? { ...pedido, status: displayStatus, tem_divergencias: false, status_embarque: undefined }
              : pedido
            }
          />
        </div>

        {/* Botão delete hover (rascunho) */}
        {pedido.status === 'Rascunho' && !modoSelecao && (
          <button
            onClick={e => { e.stopPropagation(); setShowConfirm(true); }}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Excluir rascunho"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl dark:bg-background max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-muted-foreground">
              O pedido <strong className="font-mono tracking-[0.08em]">{pedido.numero}</strong> será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-0 shadow-sm dark:bg-muted dark:text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function GrupoDia({ label, pedidos, onEdit, onDelete, selecionadosIds, onToggleSelecao, modoSelecao, className = '', _total_eta = 0 }) {
  const [open, setOpen] = useState(true);
  // Soma apenas _display_valor para cards virtuais (embarques + órfãos), ou usa _total_eta se disponível
  const valorTotal = _total_eta > 0
    ? _total_eta
    : pedidos.reduce((acc, p) => {
        const valorPedido = p._display_valor ?? (p.status === 'Pendência'
          ? (p.valor_pendente_entrega ?? p.valor_total ?? 0)
          : (p.valor_total ?? 0));
        return acc + valorPedido;
      }, 0);

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full min-w-0 flex items-center justify-between border-b border-border/50 dark:border-white/10 px-1 py-2 gap-2 group">
        <p className="text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground truncate min-w-0 flex-1">
          {label}
        </p>
        <div className="flex items-center gap-1.5 flex-none shrink-0">
          <span className="text-[0.65rem] font-bold text-muted-foreground whitespace-nowrap">{R(valorTotal)}</span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </div>
      </button>
      {open && (
        <>
          <P38MobileLineList className="md:hidden">
            {pedidos.map((p, index) => (
              <PedidoMobileLine
                key={p._virtual_key || p.id}
                pedido={p}
                striped={index % 2 === 1}
                onEdit={onEdit}
                onDelete={onDelete}
                modoSelecao={modoSelecao}
                selecionado={selecionadosIds.includes(p.id)}
                desabilitadoSelecao={p.status !== 'Rascunho' || !!p.status_aprovacao_financeira}
                onToggleSelecao={onToggleSelecao}
              />
            ))}
          </P38MobileLineList>
          <div className="hidden md:block space-y-2">
            {pedidos.map(p => (
              <PedidoCard
                key={p._virtual_key || p.id}
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
        </>
      )}
    </div>
  );
}

export default function ListaPedidosCompra({ grupos, loading, onEdit, onDelete, selecionadosIds = [], onToggleSelecao, modoSelecao = false }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-card rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
        <Package2 className="w-9 h-9 text-muted-foreground dark:text-foreground/90" />
        <p className="text-sm text-muted-foreground">Nenhum embarque encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grupos.map(({ key, label, pedidos, _total_eta }, index) => {
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
            _total_eta={_total_eta}
          />
        );
      })}
    </div>
  );
}