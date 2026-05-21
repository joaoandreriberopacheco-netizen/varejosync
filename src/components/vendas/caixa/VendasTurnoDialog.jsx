import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Receipt, Eye, ArrowDownUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatarDataHora } from '@/components/utils/dateUtils';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import { formatarDiferencaSubstituicao } from '@/lib/substituicoesVendaCaixa';

const fmtHora = (d) => {
  const dataHora = formatarDataHora(d);
  return dataHora === '—' ? '--:--' : dataHora.split(' ')[1];
};
const fmtDtHora = (d) => formatarDataHora(d);

function BlocoSubstituicao({ meta, formatValor }) {
  if (meta?.papel !== 'substituto' || !meta.origem) return null;
  const origem = meta.origem;
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-amber-200/80 dark:border-amber-800/50 flex items-start gap-2">
      <ArrowDownUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400">
        <span>Substitui </span>
        <span className="font-medium text-gray-600 dark:text-gray-300">{origem.numero}</span>
        <span> (</span>
        <span className="line-through">{formatValor(origem.valor_total)}</span>
        <span>)</span>
      </div>
      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
        {formatarDiferencaSubstituicao(meta.diferenca, formatValor)}
      </span>
    </div>
  );
}

function VendaTurnoCard({ venda, meta, formatValor, onVerDetalhes, compact }) {
  const isSubstituto = meta?.papel === 'substituto';
  const padding = compact ? 'p-4' : 'p-5';

  if (compact) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl ${padding} shadow-sm ${
          isSubstituto ? 'ring-1 ring-amber-200/60 dark:ring-amber-800/40' : ''
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{venda.numero}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{fmtHora(venda.created_date)}</span>
              {isSubstituto && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                  Substituição
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={() => onVerDetalhes(venda)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            style={{ minWidth: '40px', minHeight: '40px' }}
          >
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{venda.vendedor_nome}</div>
        <BlocoSubstituicao meta={meta} formatValor={formatValor} />
        <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-600 dark:text-gray-400">{venda.itens?.length || 0} itens</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white font-glacial">{formatValor(venda.valor_total)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl ${padding} shadow-sm hover:shadow-md transition-shadow ${
        isSubstituto ? 'ring-1 ring-amber-200/60 dark:ring-amber-800/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{venda.numero}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{fmtHora(venda.created_date)}</span>
            {isSubstituto && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                Substituição
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{venda.cliente_nome}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{venda.vendedor_nome}</div>
          <BlocoSubstituicao meta={meta} formatValor={formatValor} />
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-1">{formatValor(venda.valor_total)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{venda.itens?.length || 0} itens</div>
          <button
            onClick={() => onVerDetalhes(venda)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-auto"
            style={{ minWidth: '40px', minHeight: '40px' }}
          >
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function htmlLinhaVenda(v, meta, formatValor) {
  const pags = (v.pagamentos || []).map((p) => `${p.forma_pagamento} R$ ${(p.valor || 0).toFixed(2)}`).join(' | ');
  let sub = '';
  if (meta?.papel === 'substituto' && meta.origem) {
    const diff = formatarDiferencaSubstituicao(meta.diferenca, (n) => `R$ ${Number(n).toFixed(2)}`);
    sub = `<div style="font-size:10px;color:#b45309;margin-top:2px">↔ Substitui ${meta.origem.numero} (<s>R$ ${(meta.origem.valor_total || 0).toFixed(2)}</s>) · ${diff}</div>`;
  }
  return `<div style="border-bottom:1px solid #f3f4f6;padding:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${v.numero} · ${v.cliente_nome || ''} · ${fmtHora(v.created_date)}</span><span style="color:#059669;font-weight:600">+R$ ${(v.valor_total || 0).toFixed(2)}</span></div>${sub}<div style="font-size:10px;color:#9ca3af">${pags}</div></div>`;
}

export default function VendasTurnoDialog({
  open,
  onOpenChange,
  vendasFinalizadas,
  turnoAtivo,
  caixaData,
  formatValor,
  metaPorPedidoId = {},
  onVerDetalhes,
}) {
  const qtdSub = caixaData?.qtdSubstituicoes || 0;
  const valorNaoSoma = caixaData?.valorSubstituidoNaoSoma || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            Vendas do Turno
          </h2>
          <button
            onClick={async () => {
              const linhas = vendasFinalizadas
                .map((v) => htmlLinhaVenda(v, metaPorPedidoId[v.id], formatValor))
                .join('');
              const cancelamentos = turnoAtivo?.cancelamentos_rastro || [];
              const linhasCancelamentos =
                cancelamentos.length > 0
                  ? cancelamentos
                      .map(
                        (c) =>
                          `<div style="border-bottom:1px solid #fee2e2;padding:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#dc2626">${c.pedido_numero} · ${c.cliente_nome || ''}</span><span style="color:#dc2626;font-weight:600">CANCELADO</span></div><div style="font-size:10px;color:#9ca3af">${c.motivo_cancelamento || ''} · ${c.cancelado_por || ''}</div></div>`
                      )
                      .join('')
                  : '<p style="font-size:11px;color:#9ca3af;margin:4px 0">Nenhuma venda cancelada</p>';
              const notaSub =
                qtdSub > 0
                  ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0">${qtdSub} substituição(ões) — R$ ${valorNaoSoma.toFixed(2)} não somam no total</p>`
                  : '';
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
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:14px;margin:8px 0"><span>Total útil:</span><span>R$ ${(caixaData.totalVendas || 0).toFixed(2)}</span></div>
                ${notaSub}
                <div class="dashed"></div>
                <h2>Cancelamentos do Turno (${cancelamentos.length})</h2>
                ${linhasCancelamentos}
                <div class="dashed"></div>
                <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:14px">Não é documento fiscal</p>
              </body></html>`;
              try {
                await openPrintWindowOrShareHtml(
                  html,
                  `extrato-vendas-turno-${turnoAtivo?.numero || 'turno'}.html`,
                  'Extrato de vendas',
                  { windowFeatures: 'width=800,height=900' }
                );
              } catch {
                alert('Permita pop-ups para imprimir.');
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}
            title="Imprimir extrato"
          >
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
              {turnoAtivo?.cancelamentos_rastro?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 px-1 mb-2">
                    Cancelamentos do turno ({turnoAtivo.cancelamentos_rastro.length})
                  </p>
                  <div className="space-y-2">
                    {turnoAtivo.cancelamentos_rastro.map((c, idx) => (
                      <div key={idx} className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                              {c.pedido_numero} · {c.cliente_nome}
                            </div>
                            <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">{c.motivo_cancelamento}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {c.cancelado_por}
                              {c.data_cancelamento ? ` · ${format(new Date(c.data_cancelamento), 'HH:mm')}` : ''}
                            </div>
                          </div>
                          <span className="text-base font-bold text-red-600 dark:text-red-400 font-glacial">
                            -{formatValor(c.valor_total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="hidden md:block">
                <div className="grid gap-3 max-w-4xl mx-auto">
                  {vendasFinalizadas.map((venda) => (
                    <VendaTurnoCard
                      key={venda.id}
                      venda={venda}
                      meta={metaPorPedidoId[venda.id]}
                      formatValor={formatValor}
                      onVerDetalhes={onVerDetalhes}
                      compact={false}
                    />
                  ))}
                </div>
              </div>
              <div className="md:hidden space-y-3">
                {vendasFinalizadas.map((venda) => (
                    <VendaTurnoCard
                      key={venda.id}
                      venda={venda}
                      meta={metaPorPedidoId[venda.id]}
                      formatValor={formatValor}
                      onVerDetalhes={onVerDetalhes}
                      compact
                    />
                ))}
              </div>
            </>
          )}
        </div>

        {vendasFinalizadas.length > 0 && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total útil do turno</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                  {formatValor(caixaData.totalVendas)}
                </span>
              </div>
              {qtdSub > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                  {qtdSub} substituição{qtdSub > 1 ? 'ões' : ''} — {formatValor(valorNaoSoma)} não somam
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
