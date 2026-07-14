import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, AlertTriangle, Paperclip } from 'lucide-react';

const formatDateSafe = (value, mask) => {
  if (!value || typeof value !== 'string') return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, mask, { locale: ptBR });
};

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  'Em Aberto': { icon: Clock,         color: 'text-muted-foreground', bg: 'bg-muted',  label: 'Em Aberto' },
  'Pago':      { icon: CheckCircle2,  color: 'text-muted-foreground', bg: 'bg-muted',  label: 'Pago' },
  'Vencido':   { icon: AlertTriangle, color: 'text-red-400',  bg: 'bg-red-50 dark:bg-red-900/20',  label: 'Vencido' },
};

export default function LancamentosCompraPanel({ pedidoId, refreshKey = 0 }) {
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
  }, [pedidoId, refreshKey]);

  if (!pedidoId) return null;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (lancs.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
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
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Contas a Pagar · {lancamentosCompra.length} parcela{lancamentosCompra.length !== 1 ? 's' : ''}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {qtdPago}/{lancamentosCompra.length} pago{qtdPago !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Barra de progresso */}
      {totalTotal > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-muted-foreground/40 dark:bg-muted/400 rounded-full transition-all"
            style={{ width: `${Math.min((totalPago / totalTotal) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Lista de parcelas */}
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden divide-y divide-border/30 dark:divide-white/5">
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
                  <p className="text-[0.8rem] font-medium text-foreground truncate">{l.descricao}</p>
                  <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                    {formatDateSafe(l.data_vencimento, "dd 'de' MMM yyyy") || 'Sem vencimento'}
                    {formatDateSafe(l.data_pagamento, 'dd/MM/yyyy') ? ` · Pago em ${formatDateSafe(l.data_pagamento, 'dd/MM/yyyy')}` : ''}
                    {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
                  </p>
                </div>

                {/* Valor + comprovante */}
                <div className="flex-none flex flex-col items-end gap-0.5">
                  <span className={`text-sm font-bold ${l.status === 'Pago' ? 'text-muted-foreground' : l.status === 'Vencido' ? 'text-red-400' : 'text-foreground/90'}`}>
                    {R(l.valor)}
                  </span>
                  {l.status === 'Pago' && (
                    <span className="text-[0.6rem] bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-medium flex items-center gap-0.5">
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
        <span className="text-xs text-muted-foreground">Total</span>
        <div className="flex items-center gap-3">
          {totalPago > 0 && (
            <span className="text-xs text-muted-foreground font-medium">{R(totalPago)} pago</span>
          )}
          <span className="text-xs font-bold text-foreground/90">{R(totalTotal)}</span>
        </div>
      </div>
    </div>
  );
}