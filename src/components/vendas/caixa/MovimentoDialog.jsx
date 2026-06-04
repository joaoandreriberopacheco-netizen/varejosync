import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function MovimentoDialog({
  open, onOpenChange,
  tipoMovimento,
  valorMovimento, setValorMovimento,
  observacaoMovimento, setObservacaoMovimento,
  movimentoStep, setMovimentoStep,
  contaCaixaPDV,
  onSalvar,
  formatarValorExibicao,
}) {
  const { toast } = useToast();
  const valorRef = React.useRef(null);
  const [processando, setProcessando] = React.useState(false);

  const handleValorChange = (e) => {
    let nums = e.target.value.replace(/\D/g, '') || '0';
    setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
  };

  const executarSalvar = async () => {
    setProcessando(true);
    try {
      await onSalvar();
    } finally {
      setProcessando(false);
    }
  };

  const handleValorKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
      if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
      executarSalvar();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      let nums = (valorMovimento || '0,00').replace(/\D/g, '');
      nums = nums.slice(0, -1) || '0';
      setValorMovimento(formatarValorExibicao(parseInt(nums) / 100));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-background flex flex-col">
        <div className="bg-card border-b border-border/40 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => { if (movimentoStep === 'valor') setMovimentoStep('obs'); else onOpenChange(false); }}
            disabled={processando}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-foreground/90" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-foreground font-glacial">
            {tipoMovimento === 'Reforço' ? 'Reforço de Caixa' : 'Recolhimento de Caixa'}
          </h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col p-5 gap-4">
          {movimentoStep === 'obs' && (
            <>
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tipoMovimento === 'Reforço' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    {tipoMovimento === 'Reforço'
                      ? <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      : <Minus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{contaCaixaPDV?.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {tipoMovimento === 'Recolhimento de Caixa' ? 'Valor será transferido para Caixa Geral' : 'Valor será creditado neste caixa'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-sm flex-1">
                <label className="text-xs text-muted-foreground block mb-2">Observação (opcional)</label>
                <textarea
                  autoFocus
                  rows={4}
                  disabled={processando}
                  placeholder="Motivo ou observação..."
                  value={observacaoMovimento}
                  onChange={(e) => setObservacaoMovimento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setMovimentoStep('valor');
                      setTimeout(() => valorRef.current?.focus(), 100);
                    }
                  }}
                  className="w-full resize-none bg-transparent border-0 focus:outline-none text-base text-foreground placeholder:text-gray-300 dark:placeholder:text-muted-foreground disabled:opacity-60"
                />
              </div>
              <button
                onClick={() => { setMovimentoStep('valor'); setTimeout(() => valorRef.current?.focus(), 100); }}
                disabled={processando}
                className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm transition-opacity ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'} ${processando ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ minHeight: '56px' }}>
                Próximo →
              </button>
            </>
          )}

          {movimentoStep === 'valor' && (
            <>
              <div className="bg-card rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 flex-1">
                <div className="text-xs text-muted-foreground">Valor do {tipoMovimento}</div>
                <div className="text-xs text-muted-foreground">R$</div>
                <input autoComplete="off"
                  ref={valorRef}
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  disabled={processando}
                  value={valorMovimento || '0,00'}
                  onChange={handleValorChange}
                  onKeyDown={handleValorKeyDown}
                  onFocus={(e) => e.target.select()}
                  className="text-5xl font-bold text-foreground font-glacial text-center bg-transparent border-0 focus:outline-none w-full disabled:opacity-60"
                  style={{ caretColor: 'transparent' }}
                />
              </div>

              <button
                onClick={() => {
                  const v = parseFloat((valorMovimento || '0').replace(/\./g, '').replace(',', '.')) || 0;
                  if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                  executarSalvar();
                }}
                disabled={processando}
                className={`w-full h-14 rounded-2xl font-semibold text-white text-base shadow-sm transition-opacity ${tipoMovimento === 'Reforço' ? 'bg-emerald-600' : 'bg-blue-600'} ${processando ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ minHeight: '56px' }}>
                {processando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Processando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}