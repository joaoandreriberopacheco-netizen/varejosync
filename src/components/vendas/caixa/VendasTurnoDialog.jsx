import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Printer, Receipt, Eye } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

const fmtHora = (d) => {
  const dataHora = formatarDataHora(d);
  return dataHora === '—' ? '--:--' : dataHora.split(' ')[1];
};
const fmtDtHora = (d) => formatarDataHora(d);

export default function VendasTurnoDialog({ open, onOpenChange, vendasFinalizadas, turnoAtivo, caixaData, formatValor, onVerDetalhes }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            Vendas do Turno
          </h2>
          <button
            onClick={async () => {
              const linhas = vendasFinalizadas.map(v => {
                const pags = (v.pagamentos || []).map(p => `${p.forma_pagamento} R$ ${(p.valor||0).toFixed(2)}`).join(' | ');
                return `<div style="border-bottom:1px solid #f3f4f6;padding:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${v.numero} · ${v.cliente_nome || ''} · ${fmtHora(v.created_date)}</span><span style="color:#059669;font-weight:600">+R$ ${(v.valor_total||0).toFixed(2)}</span></div><div style="font-size:10px;color:#9ca3af">${pags}</div></div>`;
              }).join('');
              const cancelamentos = (turnoAtivo?.cancelamentos_rastro || []);
              const linhasCancelamentos = cancelamentos.length > 0
                ? cancelamentos.map(c => `<div style="border-bottom:1px solid #fee2e2;padding:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#dc2626">${c.pedido_numero} · ${c.cliente_nome || ''}</span><span style="color:#dc2626;font-weight:600">CANCELADO</span></div><div style="font-size:10px;color:#9ca3af">${c.motivo_cancelamento || ''} · ${c.cancelado_por || ''}</div></div>`).join('')
                : '<p style="font-size:11px;color:#9ca3af;margin:4px 0">Nenhuma venda cancelada</p>';
              const html = `<html><head><title>Extrato de Vendas</title><style>
                body{font-family:Inter,sans-serif;font-size:13px;padding:20px;max-width:700px;margin:0 auto}
                h2{font-size:13px;font-weight:600;margin:14px 0 6px;color:#374151}
                .dashed{border-top:1px dashed #aaa;margin:8px 0}
              </style></head><body>
                <div style="text-align:center;margin-bottom:14px"><b style="font-size:16px">VAREJOSYNC</b><br/><span style="color:#9ca3af;font-size:11px">Extrato de Vendas do Turno</span></div>
                <div class="dashed"></div>
                <h2>Turno: ${turnoAtivo?.numero || '-'} · Abertura: ${turnoAtivo?.data_abertura ? fmtDtHora(turnoAtivo.data_abertura) : '-'}</h2>
                <div class="dashed"></div>
                <h2>Vendas (${vendasFinalizadas.length})</h2>
                ${linhas || '<p style="color:#9ca3af;font-size:11px">Nenhuma venda</p>'}
                <div class="dashed"></div>
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;margin:8px 0"><span>Total:</span><span>R$ ${(caixaData.totalVendas||0).toFixed(2)}</span></div>
                <div class="dashed"></div>
                <h2>Cancelamentos do Turno (${cancelamentos.length})</h2>
                ${linhasCancelamentos}
                <div class="dashed"></div>
                <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:14px">Não é documento fiscal</p>
              </body></html>`;
              try {
                await openPrintWindowOrShareHtml(html, `extrato-vendas-turno-${turnoAtivo?.numero || 'turno'}.html`, 'Extrato de vendas', { windowFeatures: 'width=800,height=900' });
              } catch {
                alert('Permita pop-ups para imprimir.');
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
            title="Imprimir extrato">
            <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {vendasFinalizadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda registrada</p>
            </div>
          ) : (
            <>
              {(turnoAtivo?.cancelamentos_rastro?.length > 0) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 px-1 mb-2">
                    Cancelamentos do turno ({turnoAtivo.cancelamentos_rastro.length})
                  </p>
                  <div className="space-y-2">
                    {turnoAtivo.cancelamentos_rastro.map((c, idx) => (
                      <div key={idx} className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-semibold text-red-700 dark:text-red-300">{c.pedido_numero} · {c.cliente_nome}</div>
                            <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">{c.motivo_cancelamento}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{c.cancelado_por}{c.data_cancelamento ? ` · ${format(new Date(c.data_cancelamento), 'HH:mm')}` : ''}</div>
                          </div>
                          <span className="text-base font-bold text-red-600 dark:text-red-400 font-glacial">-{formatValor(c.valor_total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="hidden md:block">
                <div className="grid gap-3 max-w-4xl mx-auto">
                  {vendasFinalizadas.map((venda) => (
                    <div key={venda.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{venda.numero}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{fmtHora(venda.created_date)}</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{venda.vendedor_nome}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-1">{formatValor(venda.valor_total)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{venda.itens?.length || 0} itens</div>
                        </div>
                        <button onClick={() => onVerDetalhes(venda)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          style={{ minWidth: '40px', minHeight: '40px' }}>
                          <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:hidden space-y-3">
                {vendasFinalizadas.map((venda) => (
                  <div key={venda.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{venda.numero}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{fmtHora(venda.created_date)}</div>
                      </div>
                      <button onClick={() => onVerDetalhes(venda)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        style={{ minWidth: '40px', minHeight: '40px' }}>
                        <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{venda.vendedor_nome}</div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{venda.itens?.length || 0} itens</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(venda.valor_total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {vendasFinalizadas.length > 0 && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total do Turno</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(caixaData.totalVendas)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}