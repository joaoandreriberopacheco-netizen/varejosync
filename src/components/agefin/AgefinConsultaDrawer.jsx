import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Calendar, CheckCircle2, CircleAlert, Paperclip, Receipt, Wallet } from 'lucide-react';
import AnexosPanelIntegrado from '@/components/anexos/AnexosPanelIntegrado';
import { base44 } from '@/api/base44Client';
import { referenciasAnexosBaseParaLancamento } from '@/lib/anexosReferenciasIntegradas';
import { dataHoje, formatarSoData } from '@/components/utils/dateUtils';

function formatDate(value) {
  if (!value) return '—';
  return formatarSoData(value);
}

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function AgefinConsultaDrawer({ open, onClose, conta }) {
  const [refsPedidosPorEmbarque, setRefsPedidosPorEmbarque] = useState([]);

  const refsBase = useMemo(
    () => (conta ? referenciasAnexosBaseParaLancamento(conta) : []),
    [conta]
  );

  useEffect(() => {
    if (!open || !conta || conta.referencia_tipo !== 'EventosLogisticos' || !conta.referencia_id) {
      setRefsPedidosPorEmbarque([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const embs = await base44.entities.Embarque.filter({ evento_logistico_id: conta.referencia_id });
        const ids = [...new Set((embs || []).map((e) => e.pedido_compra_id).filter(Boolean))];
        if (!cancelled) {
          setRefsPedidosPorEmbarque(
            ids.map((id) => ({
              referencia_tipo: 'PedidoCompra',
              referencia_id: id,
              label: 'Pedido de compra (embarque)',
            }))
          );
        }
      } catch {
        if (!cancelled) setRefsPedidosPorEmbarque([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, conta?.referencia_tipo, conta?.referencia_id]);

  const referenciasAnexos = useMemo(() => {
    const merged = [...refsBase];
    const seen = new Set(merged.map((r) => `${r.referencia_tipo}:${r.referencia_id}`));
    refsPedidosPorEmbarque.forEach((r) => {
      const k = `${r.referencia_tipo}:${r.referencia_id}`;
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(r);
      }
    });
    return merged;
  }, [refsBase, refsPedidosPorEmbarque]);

  if (!conta) return null;

  const isPaid = conta.status === 'Pago';
  const todayKey = dataHoje();
  const isOverdue = conta.status === 'Vencido' || (!isPaid && conta.data_vencimento && conta.data_vencimento < todayKey);

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-gray-900 px-4 pb-6">
        <DrawerHeader className="px-0 pb-2 text-left">
          <DrawerTitle className="font-glacial text-gray-900 dark:text-white">{conta.descricao}</DrawerTitle>
          <DrawerDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {conta.terceiro_nome || 'Sem favorecido'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-3">
          <div className="rounded-[22px] bg-gray-50 dark:bg-gray-800/70 p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Valor da conta</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(conta.valor)}</p>
              </div>
              {isPaid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                </span>
              ) : isOverdue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-400/10 dark:text-red-200">
                  <CircleAlert className="w-3.5 h-3.5" /> Vencido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  <Wallet className="w-3.5 h-3.5" /> {conta.status || 'Pendente'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Vencimento</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(conta.data_vencimento)}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Pagamento</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(conta.data_pagamento)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Categoria</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{conta.categoria || '—'}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500">Recorrência</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{conta.is_recorrente ? (conta.frequencia_recorrencia || 'Recorrente') : 'Avulso'}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
              <p className="text-xs text-gray-400 dark:text-gray-500">Resumo</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(conta.data_vencimento)}
                </span>
                {(conta.forma_pagamento_tipo === 'Boleto' || conta.forma_pagamento === 'Boleto') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime-50 dark:bg-lime-500/10 px-2.5 py-1 text-lime-700 dark:text-lime-300">
                    <Receipt className="w-3.5 h-3.5" /> Boleto
                  </span>
                )}
                {conta.data_pagamento && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pagamento registrado
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] bg-gray-50 dark:bg-gray-800/70 p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Anexos e comprovantes</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-gray-900 p-3 shadow-sm">
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Ver boleto, comprovantes e documentos da conta
              </div>
              <AnexosPanelIntegrado
                inline
                referencias={referenciasAnexos}
                referenciaNomero={conta.referencia_numero || conta.descricao}
                readOnly
                uploadTarget={{ referencia_tipo: 'LancamentoFinanceiro', referencia_id: conta.id }}
              />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}