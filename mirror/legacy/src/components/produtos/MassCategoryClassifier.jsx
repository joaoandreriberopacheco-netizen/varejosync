import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LayoutGrid, StopCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  CANONICAL_CATALOG_CATEGORIES,
  CLASSIFY_MODES,
  buildClassificationPrompt,
  ensureCanonicalCategories,
  hasMeaningfulCategory,
  resolveCategoryUpdate,
} from '@/lib/catalogoCategoriasIA';

/** Acima do cabeçalho fixo do catálogo mobile (z-60), FAB (z-55) e bottom nav (z-50). */
const MASS_CATEGORY_DIALOG_Z = 'z-[100]';

const BATCH_SIZE = 10;

export default function MassCategoryClassifier({
  products,
  onComplete,
  open,
  onOpenChange,
  hideTrigger = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [abortController, setAbortController] = useState(null);
  const [classifyMode, setClassifyMode] = useState(CLASSIFY_MODES.ONLY_WITHOUT_CATEGORY);
  const [categoryMap, setCategoryMap] = useState(null);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const prepareRunRef = useRef(0);
  const { toast } = useToast();

  const isControlled = typeof open === 'boolean';
  const isDialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  const validProducts = useMemo(
    () => (products || []).filter((product) => product && product.id),
    [products]
  );

  const productsWithoutCategory = useMemo(
    () => validProducts.filter((product) => !hasMeaningfulCategory(product)),
    [validProducts]
  );

  const productsWithCategory = validProducts.length - productsWithoutCategory.length;

  const productsToProcess = classifyMode === CLASSIFY_MODES.RECLASSIFY_ALL
    ? validProducts
    : productsWithoutCategory;

  useEffect(() => {
    if (!isDialogOpen) {
      prepareRunRef.current += 1;
      setLogs([]);
      setProgress(0);
      setProcessedCount(0);
      setCategoriesReady(false);
      setCategoryMap(null);
      setIsPreparing(false);
      if (!isProcessing) {
        setClassifyMode(CLASSIFY_MODES.ONLY_WITHOUT_CATEGORY);
      }
      return;
    }

    if (categoriesReady || isProcessing) return;

    const runId = prepareRunRef.current + 1;
    prepareRunRef.current = runId;
    setIsPreparing(true);

    ensureCanonicalCategories(base44)
      .then((result) => {
        if (prepareRunRef.current !== runId) return;
        setCategoryMap(result.map);
        setCategoriesReady(true);
        if (result.created.length > 0) {
          setLogs([
            `✓ ${result.created.length} categoria(s) A–J criada(s) automaticamente no cadastro.`,
          ]);
        }
      })
      .catch((error) => {
        if (prepareRunRef.current !== runId) return;
        toast({
          title: 'Erro ao preparar categorias',
          description: error.message,
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (prepareRunRef.current !== runId) return;
        setIsPreparing(false);
      });
  }, [isDialogOpen, categoriesReady, isProcessing, toast]);

  const appendLog = (message) => {
    setLogs((prev) => [message, ...prev]);
  };

  const processBatch = async (batch, mode, map) => {
    const reclassify = mode === CLASSIFY_MODES.RECLASSIFY_ALL;
    const productsList = batch.map((product) => ({
      id: product.id,
      nome: product.nome,
      descricao: product.descricao || '',
      tags: Array.isArray(product.tags) ? product.tags : [],
      categoria_atual: product.categoria_nome || '',
    }));

    const prompt = buildClassificationPrompt(productsList, { reclassify });

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                categoria_codigo: { type: ['string', 'null'] },
                categoria_nome: { type: 'string' },
                confianca: { type: 'string' },
                motivo_curto: { type: 'string' },
              },
              required: ['id'],
            },
          },
        },
        required: ['updates'],
      },
    });

    if (!response?.updates) return { updated: 0, skipped: batch.length };

    let updated = 0;
    let skipped = 0;

    await Promise.all(response.updates.map(async (update) => {
      const originalProduct = batch.find((product) => product.id === update.id);
      if (!originalProduct) {
        skipped += 1;
        return;
      }

      const resolved = resolveCategoryUpdate(update, map);
      if (!resolved) {
        skipped += 1;
        appendLog(`⚠ Indeterminado: ${originalProduct.nome}`);
        return;
      }

      const sameCategory =
        originalProduct.categoria_id === resolved.categoria_id &&
        String(originalProduct.categoria_nome || '').toUpperCase() === resolved.categoria_nome;

      if (sameCategory) {
        skipped += 1;
        return;
      }

      await base44.entities.Produto.update(update.id, {
        categoria_id: resolved.categoria_id,
        categoria_nome: resolved.categoria_nome,
      });

      updated += 1;
      const confidencePrefix = resolved.confianca === 'baixa' ? '⚠ ' : '✓ ';
      appendLog(
        `${confidencePrefix}${originalProduct.nome} → ${resolved.categoria_nome}${resolved.motivo_curto ? ` (${resolved.motivo_curto})` : ''}`
      );
    }));

    return { updated, skipped };
  };

  const handleStart = async () => {
    if (!validProducts.length) {
      toast({ title: 'Nenhum produto para processar', variant: 'destructive' });
      return;
    }

    if (!productsToProcess.length) {
      toast({
        title: 'Nenhum produto elegível',
        description: classifyMode === CLASSIFY_MODES.ONLY_WITHOUT_CATEGORY
          ? 'Todos os produtos do filtro atual já possuem categoria.'
          : 'Nenhum produto válido encontrado para processar.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(0);
    setLogs([]);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      let map = categoryMap;
      if (!map) {
        appendLog('Preparando categorias A–J...');
        const result = await ensureCanonicalCategories(base44);
        map = result.map;
        setCategoryMap(map);
        setCategoriesReady(true);
        if (result.created.length > 0) {
          appendLog(`✓ ${result.created.length} categoria(s) criada(s) no cadastro.`);
        }
      }

      const batches = [];
      for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
        batches.push(productsToProcess.slice(i, i + BATCH_SIZE));
      }

      let totalUpdated = 0;

      for (let i = 0; i < batches.length; i++) {
        if (controller.signal.aborted) break;

        const batch = batches[i];
        appendLog(`Processando lote ${i + 1}/${batches.length} (${batch.length} produtos)...`);

        try {
          const { updated } = await processBatch(batch, classifyMode, map);
          totalUpdated += updated;
          setProcessedCount((prev) => prev + batch.length);
          setProgress(((i + 1) / batches.length) * 100);
        } catch (err) {
          appendLog(`❌ Erro no lote ${i + 1}: ${err.message}`);
        }
      }

      if (!controller.signal.aborted) {
        appendLog(`✅ Concluído — ${totalUpdated} produto(s) classificado(s).`);
        toast({
          title: 'Classificação concluída',
          description: `${totalUpdated} produto(s) atualizado(s) em ${productsToProcess.length} processado(s).`,
          className: 'bg-green-100 text-green-800',
        });
        if (onComplete) onComplete();
      } else {
        appendLog('🛑 Operação cancelada pelo usuário.');
      }
    } catch (error) {
      console.error(error);
      appendLog(`❌ Erro geral: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) abortController.abort();
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen?.(true)}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">Classificar Categorias</span>
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(nextOpen) => !isProcessing && setDialogOpen?.(nextOpen)}>
        <DialogContent
          overlayClassName={`${MASS_CATEGORY_DIALOG_Z} bg-black/80`}
          className={`sm:max-w-lg ${MASS_CATEGORY_DIALOG_Z} dark:bg-background dark:text-foreground dark:border-border/40`}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-600" />
              Classificação de Categorias (IA)
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 dark:bg-emerald-900/20 dark:border-emerald-800">
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                Classifica automaticamente cada produto em uma das <strong>10 categorias A–J</strong> do guia de materiais de construção.
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-2">
                <strong>{validProducts.length}</strong> produto(s) no filtro
                {productsWithCategory > 0 && (
                  <> · <strong>{productsWithoutCategory.length}</strong> sem categoria · <strong>{productsWithCategory}</strong> já classificados</>
                )}
              </p>
            </div>

            {!isProcessing && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Categorias do guia (A–J)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-28 overflow-y-auto text-xs text-muted-foreground">
                  {CANONICAL_CATALOG_CATEGORIES.map((cat) => (
                    <span key={cat.codigo}>
                      <strong className="text-foreground">{cat.codigo}</strong> — {cat.nome}
                    </span>
                  ))}
                </div>
                {isPreparing && (
                  <p className="text-xs text-muted-foreground">Verificando cadastro de categorias...</p>
                )}
                {!isPreparing && categoriesReady && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Categorias A–J prontas no cadastro.</p>
                )}
                {!isPreparing && !categoriesReady && (
                  <p className="text-xs text-muted-foreground">
                    As categorias serão verificadas ao iniciar, se necessário.
                  </p>
                )}
              </div>
            )}

            {!isProcessing && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground normal-case tracking-normal">
                  Modo de classificação
                </Label>
                <RadioGroup
                  value={classifyMode}
                  onValueChange={setClassifyMode}
                  className="space-y-2"
                >
                  <label
                    htmlFor="category-mode-only-empty"
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem
                      value={CLASSIFY_MODES.ONLY_WITHOUT_CATEGORY}
                      id="category-mode-only-empty"
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-medium leading-none">
                        Somente produtos sem categoria
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Processa {productsWithoutCategory.length} produto(s). Ideal para a primeira classificação.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="category-mode-reclassify-all"
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem
                      value={CLASSIFY_MODES.RECLASSIFY_ALL}
                      id="category-mode-reclassify-all"
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-medium leading-none">
                        Reclassificar todos os filtrados
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Processa {validProducts.length} produto(s) e substitui a categoria atual pela sugestão da IA.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processando...</span>
                  <span>{processedCount} / {productsToProcess.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="h-40 rounded-md border p-2 text-xs font-mono bg-muted/50 dark:border-border/40 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Serão processados <strong>{productsToProcess.length}</strong> produto(s).
                Clique em &quot;Iniciar&quot; para começar. Isso pode levar alguns minutos.
              </div>
            )}
          </div>

          <DialogFooter>
            {isProcessing ? (
              <Button variant="destructive" onClick={handleCancel}>
                <StopCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogOpen?.(false)}>Fechar</Button>
                <Button
                  onClick={handleStart}
                  disabled={!productsToProcess.length}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Iniciar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
