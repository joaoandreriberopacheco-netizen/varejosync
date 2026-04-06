import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Calendar, CheckCircle2, CircleAlert, Receipt, Paperclip } from 'lucide-react';
import AnexosPanel from '@/components/anexos/AnexosPanel';

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function AgefinDetalheDrawer({ open, onClose, recorrente, contaMes }) {
  if (!recorrente || !contaMes) return null;

  const isPaid = contaMes?.status === 'Pago';
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const isDueToday = contaMes?.data_vencimento === todayKey;
  const isOverdue = !isPaid && contaMes?.data_vencimento && contaMes.data_vencimento < todayKey;

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-gray-900 px-4 pb-6">
        <DrawerHeader className="px-0 pb-2 text-left">
          <DrawerTitle className="font-glacial text-gray-900 dark:text-white">{recorrente.nome_despesa}</DrawerTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
        </DrawerHeader>

        <div className="space-y-3">
          <div className="rounded-[22px] bg-gray-50 dark:bg-gray-800/70 p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Valor previsto</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(recorrente.valor_previsto)}</p>
              </div>
              {isPaid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                </span>
              ) : isOverdue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  <CircleAlert className="w-3.5 h-3.5" /> Vencido
                </span>
              ) : isDueToday ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  <Calendar className="w-3.5 h-3.5" /> Vence hoje
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Vencimento</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(contaMes?.data_vencimento)}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Pago em</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(contaMes?.data_pagamento)}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-gray-500">Descrição da conta</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{contaMes?.descricao || recorrente.nome_despesa}</p>
            </div>
          </div>

          <div className="rounded-[22px] bg-gray-50 dark:bg-gray-800/70 p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Anexos da conta</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <Receipt className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Ver boleto, comprovante e demais anexos
              </div>
              <AnexosPanel
                inline
                referenciaId={contaMes?.id}
                referenciaTipo="LancamentoFinanceiro"
                referenciaNomero={contaMes?.referencia_numero || contaMes?.descricao || recorrente.nome_despesa}
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}