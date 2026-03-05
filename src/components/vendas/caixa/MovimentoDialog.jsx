import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function MovimentoDialog({
  open, onOpenChange,
  tipoMovimento, setTipoMovimento,
  valorMovimento, setValorMovimento,
  observacaoMovimento, setObservacaoMovimento,
  movimentoStep, setMovimentoStep,
  contaCaixaPDV,
  onSalvar,
  formatarValorExibicao,
}) {
  const { toast } = useToast();
  const valorMovimentoRef = React.useRef(null);
  const obsMovimentoRef = React.useRef(null);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => { if (movimentoStep === 'valor') setMovimentoStep('obs'); else onOpenChange(false); }}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            {tipoMovimento === 'Reforço' ? 'Reforço de Caixa' : 'Recolhimento de Caixa'}
          </h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col p-5 gap-4">
          {movimentoStep === 'obs' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tipoMovimento === 'Reforço' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    {tipoMovimento === 'Reforço'
                      ? <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{contaCaixaPDV?.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tipoMovimento === 'Recolhimento de Caixa' ? 'Valor será transferido para Caixa Geral' : 'Valor será creditado neste caixa'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Observação (opcional)</label>
                <textarea
                  ref={obsMovimentoRef}
                  autoFocus
                  rows={4}
                  placeholder="Motivo ou observação..."
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setMovimentoStep('valor');
                      setTimeout(() => valorMovimentoRef.current?.focus(), 100);
                    }
                  }}
                  className="w-full resize-none bg-transparent border-0 focus:outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
              </div>
              <button
                onClick={() => { setMovimentoStep('valor'); setTimeout(() => valorMovimentoRef.current?.focus(), 100); }}
                className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                style={{ minHeight: '56px' }}>
                Próximo →
              </button>
            </>
          )}

          {movimentoStep === 'valor' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-2 flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Valor do {tipoMovimento}</div>
                <div className="text-5xl font-bold text-gray-900 dark:text-white font-glacial">
                  R$ {valorMovimento || '0,00'}
                </div>
                <input
                  ref={valorMovimentoRef}
                  type="text"
                  inputMode="numeric"
                  value={valorMovimento}
                  onChange={() => {}}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
                      if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                      onSalvar();
                      return;
                    }
                    if (e.key === 'Backspace') {
                      e.preventDefault();
                      let nums = valorMovimento.replace(/\D/g, '');
                      nums = nums.slice(0, -1) || '0';
                      setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
                      return;
                    }
                    if (/^\d$/.test(e.key)) {
                      e.preventDefault();
                      let nums = (valorMovimento || '0,00').replace(/\D/g, '') + e.key;
                      setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
                    }
                  }}
                  className="opacity-0 w-0 h-0 absolute"
                />
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Digite o valor acima</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === '⌫') {
                        let nums = (valorMovimento || '0,00').replace(/\D/g, '');
                        nums = nums.slice(0, -1) || '0';
                        setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
                      } else {
                        let nums = (valorMovimento || '0,00').replace(/\D/g, '') + (key === '000' ? '000' : key);
                        if (nums.length > 10) return;
                        setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
                      }
                    }}
                    className={`h-14 rounded-2xl text-xl font-semibold transition-colors ${key === '⌫' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'}`}
                    style={{ minHeight: '56px' }}>
                    {key}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const v = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
                  if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                  onSalvar();
                }}
                className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                style={{ minHeight: '56px' }}>
                Confirmar
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}