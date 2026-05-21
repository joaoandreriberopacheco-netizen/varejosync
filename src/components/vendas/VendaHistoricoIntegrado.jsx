import React from 'react';
import { Clock } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';
import { rotuloEvento, TIPO_EVENTO } from '@/lib/eventosVenda';
import { getContextoPedido } from '@/lib/contextoVendaIntegrado';

const fmt = (d) => (d ? formatarDataHora(d) : '-');

export default function VendaHistoricoIntegrado({ pedido, indiceContexto }) {
  const ctxPedido = getContextoPedido(indiceContexto, pedido?.id);
  const eventos = ctxPedido.eventos?.length ? ctxPedido.eventos : [];

  if (!eventos.length && !ctxPedido.destaques?.length) {
    if (!pedido?.historico?.trim()) return null;
  }

  const linhas = [];

  if (ctxPedido.destaques?.length) {
    for (const d of ctxPedido.destaques) {
      if (d.tipo === TIPO_EVENTO.SUBSTITUICAO && d.origem) {
        linhas.push({
          data: pedido.created_date,
          titulo: 'Substituição de venda',
          detalhe: `Substitui ${d.origem.numero} (valor anterior riscado no total do dia)`,
        });
      } else if (d.tipo === TIPO_EVENTO.CANCELAMENTO) {
        linhas.push({
          data: d.data_cancelamento || pedido.updated_date,
          titulo: 'Cancelamento',
          detalhe: [d.motivo, d.cancelado_por].filter(Boolean).join(' · ') || 'Venda cancelada',
        });
      } else {
        linhas.push({
          data: d.evento?.data,
          titulo: d.rotulo,
          detalhe: d.evento?.payload?.resumo || '',
        });
      }
    }
  }

  for (const ev of eventos) {
    if (linhas.some((l) => l.titulo === rotuloEvento(ev))) continue;
    let detalhe = '';
    if (ev.tipo === TIPO_EVENTO.PAGAMENTO_ALTERADO) {
      const depois = ev.payload?.depois || [];
      detalhe = depois.map((p) => `${p.forma_pagamento || '?'}: R$ ${Number(p.valor || 0).toFixed(2)}`).join(' · ');
    } else if (ev.tipo === TIPO_EVENTO.DETALHE_ALTERADO) {
      detalhe = ev.payload?.resumo || '';
    } else if (ev.tipo === TIPO_EVENTO.CANCELAMENTO) {
      detalhe = ev.payload?.motivo || '';
    }
    linhas.push({
      data: ev.data,
      titulo: rotuloEvento(ev),
      detalhe,
      operador: ev.operador_nome,
    });
  }

  const ordenadas = linhas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  if (!ordenadas.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Histórico integrado
        </h3>
      </div>
      <ul className="space-y-3">
        {ordenadas.map((l, i) => (
          <li
            key={i}
            className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-sm"
          >
            <div className="flex justify-between gap-2">
              <span className="font-medium text-gray-800 dark:text-gray-200">{l.titulo}</span>
              <span className="text-xs text-gray-400 shrink-0">{fmt(l.data)}</span>
            </div>
            {l.detalhe && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{l.detalhe}</p>
            )}
            {l.operador && (
              <p className="text-[10px] text-gray-400 mt-1">Por: {l.operador}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
