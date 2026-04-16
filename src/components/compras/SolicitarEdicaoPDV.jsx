import React, { useState } from 'react';
import { X, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { agora, formatarLogTime } from '@/components/utils/dateUtils';
import {
  cancelarLancamentosNaoPagosPedidoCompra,
  listarLancamentosPedidoCompra,
  temLancamentoPagoParaPedido,
} from '@/lib/pedidoCompraFinanceiro';

export default function SolicitarEdicaoPDV({ pedido, currentUser, isAdmin, isOpen, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleEnviar = async () => {
    if (!motivo.trim()) return;
    setLoading(true);
    try {
      await base44.entities.PedidoCompra.update(pedido.id, {
        status_aprovacao_financeira: 'Solicitação de Edição Pendente',
        solicitacao_edicao_motivo: motivo,
        solicitacao_edicao_data: agora(),
        solicitacao_edicao_solicitante: currentUser?.full_name || currentUser?.email,
        historico: (pedido.historico || '') + `\n[Solicitar Edicao: ${motivo} | Por: ${currentUser?.full_name} | ${formatarLogTime()}]`,
      });
      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setDone(false);
        setMotivo('');
      }, 1500);
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleReabrir = async () => {
    if (!motivo.trim()) return;
    setLoading(true);
    try {
      const lancs = await listarLancamentosPedidoCompra(base44, pedido.id);
      if (temLancamentoPagoParaPedido(lancs)) {
        toast({
          title: 'Não é possível reabrir',
          description: 'Há parcelas pagas neste pedido. Alinhe com o financeiro antes de reabrir.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const nota = `| Reabrir admin | ${formatarLogTime()} | Motivo: ${motivo}`;
      await cancelarLancamentosNaoPagosPedidoCompra(base44, pedido.id, nota);
      await base44.entities.PedidoCompra.update(pedido.id, {
        status_aprovacao_financeira: 'Pendente',
        status: 'Rascunho',
        historico: (pedido.historico || '') + `\n[Reaberto por Admin: ${currentUser?.full_name} | ${formatarLogTime()} | Motivo: ${motivo}]`,
      });
      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        window.location.reload();
      }, 1200);
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">{pedido?.numero}</p>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Solicitar Reabertura</h2>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isAdmin ? 'Pedido reaberto!' : 'Solicitação enviada!'}
            </p>
          </div>
        ) : (
          <div className="px-5 pt-5 pb-6 space-y-5">
            {/* Aviso */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {isAdmin
                  ? 'Como administrador, você pode reabrir o pedido diretamente. O pedido voltará ao status Rascunho.'
                  : 'A solicitação será encaminhada ao financeiro para aprovação. Informe o motivo abaixo.'}
              </p>
            </div>

            {/* Campo de motivo — estilo PDV */}
            <div>
              <label className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold block mb-2">
                Motivo *
              </label>
              <textarea
                className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                rows={4}
                placeholder={isAdmin
                  ? 'Ex: Correção de valores negociados com fornecedor...'
                  : 'Ex: Produto indisponível, erro de quantidade...'}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium"
              >
                Cancelar
              </button>
              {isAdmin ? (
                <button
                  onClick={handleReabrir}
                  disabled={!motivo.trim() || loading}
                  className="flex-1 h-12 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  {loading ? 'Reabrindo...' : 'Reabrir Agora'}
                </button>
              ) : (
                <button
                  onClick={handleEnviar}
                  disabled={!motivo.trim() || loading}
                  className="flex-1 h-12 rounded-xl bg-gray-900 dark:bg-gray-700 text-white text-sm font-semibold disabled:opacity-40"
                >
                  {loading ? 'Enviando...' : 'Solicitar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}