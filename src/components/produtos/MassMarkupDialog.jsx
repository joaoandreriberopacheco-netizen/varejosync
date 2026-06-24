import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, StopCircle, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/financialUtils';
import { planMarkupMassaUpdates } from '@/lib/catalogMarkupMassa';

const BATCH_SIZE = 10;
const PREVIEW_LIMIT = 8;

function parseMarkupInput(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function MassMarkupDialog({
  products = [],
  onComplete,
  open,
  onOpenChange,
  hideTrigger = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [markupInput, setMarkupInput] = useState('40');
  const [somenteSeDiferente, setSomenteSeDiferente] = useState(true);
  const [step, setStep] = useState('config');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [abortController, setAbortController] = useState(null);
  const { toast } = useToast();

  const isControlled = typeof open === 'boolean';
  const isDialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  const markupAlvo = parseMarkupInput(markupInput);

  const plan = useMemo(() => {
    if (markupAlvo === null) return null;
    return planMarkupMassaUpdates(products, markupAlvo, { somenteSeDiferente });
  }, [products, markupAlvo, somenteSeDiferente]);

  const resetState = () => {
    setStep('config');
    setIsProcessing(false);
    setProgress(0);
    setProcessedCount(0);
    setLogs([]);
    setAbortController(null);
  };

  const handleDialogChange = (nextOpen) => {
    if (isProcessing) return;
    if (!nextOpen) resetState();
    setDialogOpen?.(nextOpen);
  };

  const handlePreview = () => {
    if (!products.length) {
      toast({ title: 'Nenhum produto no filtro atual', variant: 'destructive' });
      return;
    }
    if (markupAlvo === null) {
      toast({ title: 'Informe um markup válido', variant: 'destructive' });
      return;
    }
    if (!plan?.updates.length) {
      toast({
        title: 'Nada a alterar',
        description: 'Todos os itens filtrados já estão com esse markup ou não têm custo.',
        variant: 'destructive',
      });
      return;
    }
    setStep('preview');
  };

  const handleApply = async () => {
    if (!plan?.updates.length) return;

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setLogs([]);

    const controller = new AbortController();
    setAbortController(controller);

    const batches = [];
    for (let i = 0; i < plan.updates.length; i += BATCH_SIZE) {
      batches.push(plan.updates.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        if (controller.signal.aborted) break;

        const batch = batches[i];
        setLogs((prev) => [`Processando lote ${i + 1}/${batches.length}...`, ...prev]);

        try {
          await Promise.all(
            batch.map(async (item) => {
              await base44.entities.Produto.update(item.produto.id, item.patch);
            }),
          );
          successCount += batch.length;
          setProcessedCount(successCount);
          setProgress(((i + 1) / batches.length) * 100);
        } catch (err) {
          errorCount += batch.length;
          setLogs((prev) => [`Erro no lote ${i + 1}: ${err.message}`, ...prev]);
        }
      }

      if (!controller.signal.aborted) {
        if (errorCount === 0) {
          setLogs((prev) => [`Concluído: ${successCount} produto(s) atualizado(s).`, ...prev]);
          toast({
            title: 'Markup aplicado',
            description: `${successCount} produto(s) atualizado(s) com ${markupAlvo}% de markup.`,
          });
          onComplete?.();
          handleDialogChange(false);
        } else {
          toast({
            title: 'Concluído com erros',
            description: `${successCount} ok, ${errorCount} com falha.`,
            variant: 'destructive',
          });
        }
      } else {
        setLogs((prev) => ['Operação cancelada.', ...prev]);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao aplicar markup', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const handleCancelProcessing = () => {
    abortController?.abort();
  };

  const previewRows = plan?.updates.slice(0, PREVIEW_LIMIT) || [];

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen?.(true)}
          disabled={!products.length}
          className="gap-2"
        >
          <Percent className="w-4 h-4" />
          <span className="hidden sm:inline">Markup em massa</span>
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-2xl dark:bg-background dark:text-foreground dark:border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 p38-text-accent" />
              Aplicar markup aos filtrados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border/40 bg-muted/40 p-3 text-sm">
              <p>
                Serão considerados os <strong>{products.length}</strong> produto(s) do filtro atual do catálogo.
              </p>
              {plan && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {plan.updates.length} serão alterados
                  {plan.skipped.sem_custo > 0 ? ` · ${plan.skipped.sem_custo} sem custo` : ''}
                  {plan.skipped.sem_alteracao > 0 ? ` · ${plan.skipped.sem_alteracao} já no markup` : ''}
                </p>
              )}
            </div>

            {step === 'config' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="markup-alvo">Markup alvo (% sobre o custo)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="markup-alvo"
                      inputMode="decimal"
                      value={markupInput}
                      onChange={(e) => setMarkupInput(e.target.value)}
                      placeholder="Ex: 40"
                      className="max-w-[160px]"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O preço de venda será recalculado: custo × (1 + markup ÷ 100).
                  </p>
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={somenteSeDiferente}
                    onCheckedChange={(v) => setSomenteSeDiferente(v === true)}
                  />
                  <span>
                    Só alterar produtos cujo preço/markup for diferente do alvo
                  </span>
                </label>
              </div>
            )}

            {step === 'preview' && plan && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pré-visualização dos primeiros {Math.min(PREVIEW_LIMIT, plan.updates.length)} de {plan.updates.length} itens:
                </p>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Markup</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((item) => (
                        <TableRow key={item.preview.id}>
                          <TableCell className="text-xs max-w-[200px] truncate" title={item.preview.nome}>
                            {item.preview.nome}
                          </TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap">
                            {item.preview.markupAtual.toFixed(1)}% → {item.preview.markupNovo.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-xs whitespace-nowrap">
                            R$ {formatCurrency(item.preview.precoAtual)} → R$ {formatCurrency(item.preview.precoNovo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Gravando alterações...</span>
                  <span>{processedCount} / {plan?.updates.length || 0}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="h-24 rounded-md border p-2 text-xs font-mono bg-muted/50 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancelProcessing}>
                <StopCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            ) : step === 'preview' ? (
              <>
                <Button variant="outline" onClick={() => setStep('config')}>Voltar</Button>
                <Button onClick={handleApply} className="p38-bg-accent text-white hover:opacity-90">
                  Confirmar ({plan?.updates.length || 0} itens)
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleDialogChange(false)}>Fechar</Button>
                <Button onClick={handlePreview} disabled={!products.length || markupAlvo === null}>
                  Pré-visualizar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
