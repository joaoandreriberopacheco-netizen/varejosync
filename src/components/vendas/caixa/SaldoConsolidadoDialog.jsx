import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

export default function SaldoConsolidadoDialog({ open, onOpenChange, caixaData, turnoAtivo, vendasFinalizadas, movimentos, formatValor }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #saldo-consolidado-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          @page { size: A4; margin: 15mm; }
        }
        #saldo-consolidado-print { display: contents; }
      `}</style>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-background flex flex-col">
        <div className="bg-card border-b border-border/40 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-foreground/90" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-foreground font-glacial">Saldo Consolidado</h2>
          <button
            onClick={async () => {
              const el = document.getElementById('saldo-consolidado-print');
              const printContent = el ? el.innerHTML : '';
              const doc = `
              <html><head><title>Saldo Consolidado</title>
              <style>
                body { font-family: 'DIN 1451', DINish, system-ui, sans-serif; font-size: 12px; color: #111; margin: 10mm; }
                .space-y-3 > * + * { margin-top: 12px; }
                .rounded-2xl { border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; }
                .px-5 { padding-left: 20px; padding-right: 20px; }
                .py-3 { padding-top: 12px; padding-bottom: 12px; }
                .py-4 { padding-top: 16px; padding-bottom: 16px; }
                .border-b { border-bottom: 1px solid #f3f4f6; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .text-sm { font-size: 12px; }
                .text-xs { font-size: 10px; }
                .text-xl { font-size: 18px; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .font-medium { font-weight: 500; }
                .text-muted-foreground, .text-muted-foreground { color: #9ca3af; }
                .text-foreground/90, .text-foreground { color: #374151; }
                .text-foreground { color: #111827; }
                .text-emerald-600 { color: #059669; }
                .text-blue-600 { color: #2563eb; }
                .bg-muted/40 { background: #f9fafb; }
                .space-y-2 > * + * { margin-top: 8px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .mt-0\\.5 { margin-top: 2px; }
              </style></head><body>${printContent}</body></html>
            `;
              try {
                await openPrintWindowOrShareHtml(doc, `saldo-consolidado-${turnoAtivo?.numero || 'turno'}.html`, 'Saldo consolidado', { windowFeatures: 'width=800,height=900' });
              } catch {
                alert('Permita pop-ups para imprimir.');
              }
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors print:hidden"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <Printer className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div id="saldo-consolidado-print" className="max-w-lg mx-auto space-y-3">
            <div className="bg-card rounded-2xl overflow-hidden shadow-sm print:shadow-none print:rounded-none">
              <div className="px-5 py-3 border-b border-border/40">
                <h3 className="text-sm font-semibold text-foreground/90">Extrato do Turno</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {turnoAtivo?.numero} · abertura {turnoAtivo?.data_abertura ? format(new Date(turnoAtivo.data_abertura), 'dd/MM HH:mm') : '-'}
                </p>
              </div>
              <div className="px-5 py-3 flex justify-between items-center border-b border-border/30 dark:border-border/40/50">
                <div>
                  <div className="text-sm text-foreground/90">Fundo de caixa (dinheiro)</div>
                  <div className="text-xs text-muted-foreground">Abertura do turno</div>
                </div>
                <span className="text-sm font-semibold text-foreground">{formatValor(caixaData.saldoInicial ?? turnoAtivo?.saldo_inicial ?? 0)}</span>
              </div>
              {(vendasFinalizadas || []).length > 0 && vendasFinalizadas.map((v) => {
                const pagamentos = (v.pagamentos || []);
                const temMultiplos = pagamentos.length > 1;
                return (
                  <div key={v.id} className="border-b border-border/30 dark:border-border/40/50">
                    <div className="px-5 py-2.5 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground/90">{v.numero} · {v.cliente_nome}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(v.created_date), 'HH:mm')}{!temMultiplos && pagamentos[0] ? ` · ${pagamentos[0].forma_pagamento} ${formatValor(pagamentos[0].valor)}` : ''}</div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0 tabular-nums">+{formatValor(v.valor_total)}</span>
                    </div>
                    {temMultiplos && pagamentos.map((p, idx) => (
                      <div key={idx} className="px-5 py-1 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground pl-3">↳ {p.forma_pagamento}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{formatValor(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {(movimentos || []).filter(m => m.tipo === 'Reforço').map((m) => (
                <div key={m.id} className="px-5 py-3 flex justify-between items-center border-b border-border/30 dark:border-border/40/50">
                  <div>
                    <div className="text-sm text-foreground/90">Reforço · {m.numero}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(m.created_date), 'HH:mm')} · {m.usuario_responsavel_nome}</div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatValor(m.valor)}</span>
                </div>
              ))}
              {(movimentos || []).filter(m => m.tipo === 'Sangria' || m.tipo === 'Recolhimento de Caixa').map((m) => (
                <div key={m.id} className="px-5 py-3 flex justify-between items-center border-b border-border/30 dark:border-border/40/50">
                  <div>
                    <div className="text-sm text-foreground/90">Recolhimento · {m.numero}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(m.created_date), 'HH:mm')} · {m.usuario_responsavel_nome}</div>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">−{formatValor(m.valor)}</span>
                </div>
              ))}
              {(caixaData.despesasLista || []).map((d) => (
                <div key={d.id} className="px-5 py-3 flex justify-between items-center border-b border-border/30 dark:border-border/40/50">
                  <div>
                    <div className="text-sm text-foreground/90">Despesa · {d.descricao}</div>
                    <div className="text-xs text-muted-foreground">{d.created_date ? format(new Date(d.created_date), 'HH:mm') : ''} · {d.categoria}</div>
                  </div>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">−{formatValor(d.valor)}</span>
                </div>
              ))}
              <div className="px-5 py-4 bg-muted/40 dark:bg-muted/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total do turno (liquidez)</span>
                  <span className="text-xl font-bold text-foreground font-glacial">{formatValor(caixaData.totalVendas)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">↳ Dinheiro na gaveta</span>
                  <span className="text-sm font-medium text-foreground/90">{formatValor(caixaData.saldoAtual)}</span>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl overflow-hidden shadow-sm print:shadow-none print:rounded-none print:border print:border-border/40">
              <div className="px-5 py-3 border-b border-border/40">
                <h3 className="text-sm font-semibold text-foreground/90">O que esperar no caixa</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Baseado nas vendas do turno</p>
              </div>
              {[
                { label: 'Dinheiro', sub: 'gaveta — imediato', valor: caixaData.saldoAtual },
                { label: 'PIX', sub: 'conta digital — imediato', valor: caixaData.recebimentos.pix },
                { label: 'Cartão Débito', sub: 'maquininha — D+1', valor: caixaData.recebimentos.debito || 0 },
                { label: 'Cartão Crédito', sub: 'maquininha — D+30', valor: caixaData.recebimentos.credito || 0 },
              ].map(({ label, sub, valor }) => (
                <div key={label} className="px-5 py-3 flex justify-between items-center border-b border-border/30 dark:border-border/40/50 last:border-0">
                  <div>
                    <div className="text-sm text-foreground/90">{label}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatValor(valor)}</span>
                </div>
              ))}
              <div className="px-5 py-4 bg-muted/40 dark:bg-muted/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total de vendas</span>
                  <span className="text-xl font-bold text-foreground font-glacial">{formatValor(caixaData.totalVendas)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Toda liquidez gerada no turno, independente do meio de pagamento</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}