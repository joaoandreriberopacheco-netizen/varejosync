import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { CaixaDialogContent } from './CaixaDialogContent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { caixaClasses } from '@/lib/caixaP38Theme';

export default function DespesaDialog({
  open, onOpenChange,
  despesaStep, setDespesaStep,
  descricaoDespesa, setDescricaoDespesa,
  categoriaDespesa, setCategoriaDespesa,
  valorDespesaNum, setValorDespesaNum,
  contaCaixaPDV,
  onSalvar,
  salvando,
  formatarValorExibicao,
}) {
  const { toast } = useToast();
  const tone = caixaClasses('danger');
  const valorRef = React.useRef(null);

  const handleValorChange = (e) => {
    let nums = e.target.value.replace(/\D/g, '') || '0';
    setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
  };

  const handleValorKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = parseFloat((valorDespesaNum || '0').replace(/\./g, '').replace(',', '.')) || 0;
      if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
      if (!salvando) onSalvar(valorDespesaNum);
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      let nums = (valorDespesaNum || '0,00').replace(/\D/g, '');
      nums = nums.slice(0, -1) || '0';
      setValorDespesaNum(formatarValorExibicao(parseInt(nums) / 100));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) { onOpenChange(false); setDespesaStep('obs'); setValorDespesaNum(''); }
    }}>
      <CaixaDialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-background flex flex-col">
        <div className="bg-card border-b border-border/40 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={() => {
              if (despesaStep === 'valor') setDespesaStep('obs');
              else { onOpenChange(false); setDespesaStep('obs'); setValorDespesaNum(''); }
            }}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-foreground/90" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-foreground font-glacial">Registrar Despesa</h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col p-5 gap-4">
          {despesaStep === 'obs' && (
            <>
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tone.well}`}>
                    <DollarSign className={`w-5 h-5 ${tone.icon}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{contaCaixaPDV?.nome}</div>
                    <div className="text-xs text-muted-foreground">Valor será debitado deste caixa</div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-2xl p-4 shadow-sm flex-1 flex flex-col gap-4">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-2">Descrição *</label>
                  <textarea
                    autoFocus
                    rows={3}
                    placeholder="Ex: Gasolina, Sacolas, Material de limpeza..."
                    value={descricaoDespesa}
                    onChange={(e) => setDescricaoDespesa(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (descricaoDespesa.trim()) {
                          setDespesaStep('valor');
                          setTimeout(() => valorRef.current?.focus(), 100);
                        }
                      }
                    }}
                    className="w-full resize-none bg-transparent border-0 focus:outline-none text-base text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-2">Categoria</label>
                  <Select value={categoriaDespesa} onValueChange={setCategoriaDespesa}>
                    <SelectTrigger className="h-11 bg-muted/40 dark:bg-muted dark:text-foreground border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-muted dark:border-border/40">
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!descricaoDespesa.trim()) { toast({ title: "Informe a descrição.", variant: "destructive" }); return; }
                  setDespesaStep('valor');
                  setTimeout(() => valorRef.current?.focus(), 100);
                }}
                className={`w-full h-14 rounded-2xl font-semibold text-base shadow-sm ${tone.btn}`}
                style={{ minHeight: '56px' }}>
                Próximo →
              </button>
            </>
          )}

          {despesaStep === 'valor' && (
            <>
              <div className="bg-card rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-3 flex-1">
                <div className="text-xs text-muted-foreground">{descricaoDespesa}</div>
                <div className="text-xs text-muted-foreground">R$</div>
                <input autoComplete="off"
                  ref={valorRef}
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  value={valorDespesaNum || '0,00'}
                  onChange={handleValorChange}
                  onKeyDown={handleValorKeyDown}
                  onFocus={(e) => e.target.select()}
                  className={`text-5xl font-bold font-glacial text-center bg-transparent border-0 focus:outline-none w-full ${tone.text}`}
                  style={{ caretColor: 'transparent' }}
                />
              </div>

              <button
                onClick={() => {
                  const v = parseFloat((valorDespesaNum || '0').replace(/\./g, '').replace(',', '.')) || 0;
                  if (v <= 0) { toast({ title: "Informe um valor maior que zero.", variant: "destructive" }); return; }
                  if (!salvando) onSalvar(valorDespesaNum);
                }}
                disabled={salvando}
                className={`w-full h-14 rounded-2xl font-semibold text-base shadow-sm ${tone.btn} disabled:opacity-60 disabled:cursor-not-allowed`}
                style={{ minHeight: '56px' }}>
                {salvando ? 'Processando...' : 'Confirmar'}
              </button>
            </>
          )}
        </div>
      </CaixaDialogContent>
    </Dialog>
  );
}