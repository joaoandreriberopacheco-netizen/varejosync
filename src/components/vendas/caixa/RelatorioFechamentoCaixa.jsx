import React, { useEffect, useRef } from 'react';
import { printOrShareElementAsPdf, shouldUseMobileDocumentExport } from '@/lib/mobilePrintAndShare';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SafeActionButton from '@/components/ui/safe-action-button';
import { Printer, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function RelatorioFechamentoCaixa({ turno, caixaData, open, onClose, onContinuar, isContinuing = false }) {
  const jaImprimiu = useRef(false);

  useEffect(() => {
    if (open && !jaImprimiu.current) {
      jaImprimiu.current = true;
      setTimeout(() => window.print(), 500);
    } else if (!open) {
      jaImprimiu.current = false;
    }
  }, [open]);

  if (!turno || !caixaData) return null;

  const dinheiroConferido = caixaData.dinheiroConferido || 0;
  const totalConferido = 
    dinheiroConferido +
    caixaData.recebimentos.pix +
    (caixaData.recebimentos.credito || 0) +
    (caixaData.recebimentos.debito || 0);
  const esperado = caixaData.liquidez - (caixaData.recebimentos.vale || 0);
  const diferenca = totalConferido - esperado;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-gray-900">
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            Relatório de Fechamento
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo imprimível */}
        <div id="relatorio-fechamento-caixa-print" className="p-6 space-y-6" style={{ fontFamily: "'Ubuntu Sans Mono', 'Cousine', monospace" }}>
          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-gray-900 dark:border-gray-100 pb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">FECHAMENTO DE CAIXA</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Turno {turno.numero}</div>
          </div>

          {/* Dados do turno */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Abertura:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {format(new Date(turno.data_abertura), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Fechamento:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {format(new Date(turno.data_fechamento || new Date()), 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Operador:</span>
              <span className="font-medium text-gray-900 dark:text-white">{turno.usuario_abertura_nome}</span>
            </div>
          </div>

          {/* Saldos */}
          <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Saldo Inicial:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(turno.saldo_inicial)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">+ Vendas:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.totalVendas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">+ Reforços:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.reforcos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">- Sangrias:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.sangrias)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
              <span className="text-gray-800 dark:text-gray-200">Saldo do Turno:</span>
              <span className="font-mono text-gray-900 dark:text-white">{fmt(caixaData.saldoAtual)}</span>
            </div>
          </div>

          {/* Recebimentos */}
          <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">RECEBIMENTOS</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Dinheiro:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.recebimentos.dinheiro)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">PIX:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.recebimentos.pix)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Cartão Débito:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.recebimentos.debito || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Cartão Crédito:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.recebimentos.credito || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Vale Compra:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.recebimentos.vale || 0)}</span>
            </div>
          </div>

          {/* Conferência */}
          <div className="border-t-2 border-gray-900 dark:border-gray-100 pt-4 space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">CONFERÊNCIA</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Dinheiro na Gaveta:</span>
              <span className="font-mono font-medium text-gray-900 dark:text-white">{fmt(caixaData.liquidez)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-800 dark:text-gray-200">Total Conferido:</span>
              <span className="font-mono text-gray-900 dark:text-white">{fmt(totalConferido)}</span>
            </div>
            <div className={`flex justify-between text-base font-bold pt-2 border-t border-gray-300 dark:border-gray-600 ${
              Math.abs(diferenca) < 0.01 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <span>Diferença:</span>
              <span className="font-mono">{diferenca >= 0 ? '+' : ''}{fmt(diferenca)}</span>
            </div>
          </div>

          {/* Status */}
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Caixa Fechado</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="no-print flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => {
              void printOrShareElementAsPdf('relatorio-fechamento-caixa-print', {
                formato: '80mm',
                fileBaseName: `fechamento-${turno?.numero || 'caixa'}`,
                title: 'Relatório de fechamento',
              });
            }}
            className="flex-1 gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <SafeActionButton
            onClick={onContinuar}
            isLoading={isContinuing}
            loadingText="Finalizando..."
            className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800"
          >
            Continuar
          </SafeActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}