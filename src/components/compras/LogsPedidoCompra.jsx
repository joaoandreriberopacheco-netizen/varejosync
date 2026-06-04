import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, User, Bot, Users } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';

const STATUS_CORES = {
  'Rascunho':             'bg-muted text-foreground/90 dark:bg-muted dark:text-foreground/90',
  'Enviado':              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Aguardando Liberação': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Aprovado':             'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Despachado':           'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Em Recepção':          'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Pendência':            'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Devolvido':            'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  'Concluído':            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Cancelado':            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const TIPO_ICON = {
  'Usuario':      User,
  'Interveniente': Users,
  'Sistema':      Bot,
};

export default function LogsPedidoCompra({ pedidoId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pedidoId) return;
    setLoading(true);
    base44.entities.TransicaoPedidoCompra
      .filter({ pedido_id: pedidoId }, '-data_transicao')
      .then(data => {
        setLogs(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pedidoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-border/40 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <ArrowRight className="w-5 h-5" />
        </div>
        <p className="text-sm">Nenhuma transição registrada</p>
        <p className="text-xs mt-1">O histórico aparecerá aqui conforme o pedido avança</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, idx) => {
        const Icon = TIPO_ICON[log.tipo_autenticacao] || User;
        const dataFormatada = formatarDataHora(log.data_transicao);

        return (
          <div key={log.id || idx} className="bg-muted/50 rounded-xl px-4 py-3 shadow-sm">
            {/* Linha de transição de status */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {log.status_anterior && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[log.status_anterior] || 'bg-muted text-muted-foreground'}`}>
                  {log.status_anterior}
                </span>
              )}
              {log.status_anterior && (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[log.status_novo] || 'bg-muted text-muted-foreground'}`}>
                {log.status_novo}
              </span>
            </div>

            {/* Responsável e data */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {log.responsavel_nome || log.responsavel_email || 'Sistema'}
                </span>
                {log.codigo_operacao && (
                  <span className="text-xs text-muted-foreground font-mono hidden sm:inline">· {log.codigo_operacao}</span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">{dataFormatada}</span>
            </div>

            {/* Observação */}
            {log.observacao && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed border-t border-border/40 pt-1.5">
                {log.observacao}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}