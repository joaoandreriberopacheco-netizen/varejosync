import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertTriangle, Paperclip } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  'Em Aberto': { icon: Clock,         color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700',  label: 'Em Aberto' },
  'Pago':      { icon: CheckCircle2,  color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Pago' },
  'Vencido':   { icon: AlertTriangle, color: 'text-red-400',  bg: 'bg-red-50 dark:bg-red-900/20',  label: 'Vencido' },
};

export default function LancamentosCompraPanel({ pedidoId }) {
  const [lancs, setLancs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pedidoId) return;
    setLoading(true);
    Promise.all([
      base44.entities.LancamentoFinanceiro.filter({ pedido_compra_vinculado_id: pedidoId }),
      base44.entities.LancamentoFinanceiro.filter({ referencia_id: pedidoId, referencia_tipo: 'PedidoCompra' })
    ])
      .then(([porVinculo, porReferencia]) => {
        const unicos = [...porVinculo, ...porReferencia].filter(
          (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
        );
        setLancs(unicos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pedidoId]);

  if (!pedidoId) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (lancs.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
        Nenhuma conta a pagar gerada ainda.
      </div>
    );
  }

  const lancamentosCompra = lancs.filter(l => l.referencia_tipo === 'PedidoCompra' || l.pedido_compra_vinculado_id === pedidoId || l.is_custo_mercadoria);
  const totalPago   = lancamentosCompra.filter(l => l.status === 'Pago' || !!l.data_pagamento).reduce((s, l) => s + (l.valor || 0), 0);
  const totalTotal  = lancamentosCompra.reduce((s, l) => s + (l.valor || 0), 0);
  const qtdPago     = lancamentosCompra.filter(l => l.status === 'Pago' || !!l.data_pagamento).length;

  return (
    <div className="space-y-3">
      {/* Resumo */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold">
          Contas a Pagar · {lancamentosCompra.length} parcela{lancamentosCompra.length !== 1 ? 's' : ''}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          {qtdPago}/{lancamentosCompra.length} pago{qtdPago !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Barra de progresso */}
      {totalTotal > 0 && (
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 dark:bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min((totalPago / totalTotal) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Lista de parcelas */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
        {lancamentosCompra
          .sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''))
          .map(l => {
            const cfg = STATUS_CONFIG[l.status] || STATUS_CONFIG['Em Aberto'];
            const Icon = cfg.icon;
            return (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                {/* Status icon */}
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8rem] font-medium text-gray-800 dark:text-gray-100 truncate">{l.descricao}</p>
                  <p className="text-[0.68rem] text-gray-400 dark:text-gray-500 mt-0.5">
                    {l.data_vencimento
                      ? format(new Date(l.data_vencimento + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: ptBR })
                      : 'Sem vencimento'}
                    {l.data_pagamento ? ` · Pago em ${format(new Date(l.data_pagamento + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}` : ''}
                    {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
                  </p>
                </div>

                {/* Valor + comprovante */}
                <div className="flex-none flex flex-col items-end gap-0.5">
                  <span className={`text-[0.82rem] font-bold ${l.status === 'Pago' ? 'text-green-600 dark:text-green-400' : l.status === 'Vencido' ? 'text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                    {R(l.valor)}
                  </span>
                  {l.status === 'Pago' && (
                    <span className="text-[0.6rem] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Pago
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Totalizador */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
        <div className="flex items-center gap-3">
          {totalPago > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">{R(totalPago)} pago</span>
          )}
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{R(totalTotal)}</span>
        </div>
      </div>
    </div>
  );
}