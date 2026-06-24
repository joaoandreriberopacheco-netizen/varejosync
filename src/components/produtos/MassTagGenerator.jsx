import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tag, StopCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";

const TAG_MODES = {
  ONLY_EMPTY: 'only_empty',
  REPLACE_ALL: 'replace_all',
};

const normalizeTag = (tag) => {
  return String(tag || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ');
};

const mergeUniqueTags = (existingTags = [], newTags = []) => {
  const merged = [];
  const seen = new Set();

  [...existingTags, ...newTags].forEach((tag) => {
    const cleaned = normalizeTag(tag);
    if (!cleaned) return;
    const key = cleaned.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(cleaned);
  });

  return merged;
};

const getProductTags = (product) => (Array.isArray(product?.tags) ? product.tags : []);

const hasMeaningfulTags = (product) => mergeUniqueTags(getProductTags(product), []).length > 0;

const tagsChanged = (before = [], after = []) =>
  before.length !== after.length || before.some((tag, index) => tag !== after[index]);

export default function MassTagGenerator({ products, onComplete, open, onOpenChange, hideTrigger = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [abortController, setAbortController] = useState(null);
  const [tagMode, setTagMode] = useState(TAG_MODES.ONLY_EMPTY);
  const { toast } = useToast();
  const isControlled = typeof open === 'boolean';
  const isDialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  const BATCH_SIZE = 10;

  const validProducts = useMemo(
    () => (products || []).filter((product) => product && product.id),
    [products]
  );

  const productsWithoutTags = useMemo(
    () => validProducts.filter((product) => !hasMeaningfulTags(product)),
    [validProducts]
  );

  const productsWithTags = validProducts.length - productsWithoutTags.length;

  const productsToProcess = tagMode === TAG_MODES.REPLACE_ALL
    ? validProducts
    : productsWithoutTags;

  const handleStart = async () => {
    if (!validProducts.length) {
      toast({ title: "Nenhum produto para processar", variant: "destructive" });
      return;
    }

    if (!productsToProcess.length) {
      toast({
        title: "Nenhum produto elegível",
        description: tagMode === TAG_MODES.ONLY_EMPTY
          ? "Todos os produtos do filtro atual já possuem tags."
          : "Nenhum produto válido encontrado para processar.",
        variant: "destructive",
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
      const batches = [];
      for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
        batches.push(productsToProcess.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        if (controller.signal.aborted) break;

        const batch = batches[i];
        const batchLog = `Processando lote ${i + 1}/${batches.length} (${batch.length} produtos)...`;
        setLogs(prev => [batchLog, ...prev]);

        try {
          await processBatch(batch, tagMode);
          setProcessedCount(prev => prev + batch.length);
          setProgress(((i + 1) / batches.length) * 100);
        } catch (err) {
          setLogs(prev => [`❌ Erro no lote ${i + 1}: ${err.message}`, ...prev]);
        }
      }

      if (!controller.signal.aborted) {
        setLogs(prev => ["✅ Concluído com sucesso!", ...prev]);
        toast({
          title: "Tagificação concluída",
          description: `${productsToProcess.length} produto(s) processado(s).`,
          className: "bg-green-100 text-green-800"
        });
        if (onComplete) onComplete();
      } else {
        setLogs(prev => ["🛑 Operação cancelada pelo usuário.", ...prev]);
      }

    } catch (error) {
      console.error(error);
      setLogs(prev => [`❌ Erro geral: ${error.message}`, ...prev]);
    } finally {
      setIsProcessing(false);
      setAbortController(null);
    }
  };

  const processBatch = async (batch, mode) => {
    const replaceExisting = mode === TAG_MODES.REPLACE_ALL;

    const productsList = batch.map((product) => ({
      id: product.id,
      nome: product.nome,
      categoria: product.categoria_nome || '',
      descricao: product.descricao || '',
      ...(replaceExisting
        ? { tags_atuais: getProductTags(product) }
        : {}),
    }));

    const prompt = `
      Você é um especialista em categorização de produtos de construção e varejo.
      Analise a lista de produtos abaixo e gere tags relevantes (palavras-chave) para facilitar a busca e filtragem.

      Regras:
      1. Gere tags curtas e objetivas (ex: marca, material, uso, tipo).
      2. GERE TAGS HIERÁRQUICAS quando possível, usando o formato "Categoria > Subcategoria" ou "Uso > Específico" (ex: "Hidráulica > Torneiras", "Ferramentas > Elétricas"). Isso ajudará na organização.
      3. ${replaceExisting
        ? 'SUBSTITUA completamente as tags existentes: retorne apenas o novo conjunto final de tags para cada produto, sem repetir tags antigas.'
        : 'O produto ainda não possui tags: gere o conjunto inicial de tags.'}
      4. NÃO repita tags dentro do mesmo produto, mesmo com diferença de maiúsculas/minúsculas ou com #.
      5. Retorne APENAS um JSON válido com a estrutura:
      {
        "updates": [
          { "id": "ID_DO_PRODUTO", "tags": ["tag1", "tag2", "tag3"] }
        ]
      }

      Produtos:
      ${JSON.stringify(productsList)}
    `;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                tags: { type: "array", items: { type: "string" } }
              },
              required: ["id", "tags"]
            }
          }
        },
        required: ["updates"]
      }
    });

    if (response && response.updates) {
      await Promise.all(response.updates.map(async (update) => {
        const originalProduct = batch.find((product) => product.id === update.id);
        if (originalProduct) {
          const existingTags = getProductTags(originalProduct);
          const newTags = Array.isArray(update.tags) ? update.tags : [];
          const finalTags = mergeUniqueTags([], newTags);

          if (tagsChanged(existingTags, finalTags)) {
            await base44.entities.Produto.update(update.id, { tags: finalTags });
          }
        }
      }));
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen?.(true)}
          className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/20"
        >
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">Tagificação em Massa</span>
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(nextOpen) => !isProcessing && setDialogOpen?.(nextOpen)}>
        <DialogContent className="sm:max-w-md dark:bg-background dark:text-foreground dark:border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Tagificação Inteligente (IA)
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 dark:bg-indigo-900/20 dark:border-indigo-800">
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                Esta ferramenta usará IA para gerar tags automaticamente com base no filtro atual.
              </p>
              <p className="text-sm text-indigo-800 dark:text-indigo-300 mt-2">
                <strong>{validProducts.length}</strong> produto(s) no filtro
                {productsWithTags > 0 && (
                  <> · <strong>{productsWithoutTags.length}</strong> sem tags · <strong>{productsWithTags}</strong> já tagificados</>
                )}
              </p>
            </div>

            {!isProcessing && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground normal-case tracking-normal">
                  O que fazer com as tags?
                </Label>
                <RadioGroup
                  value={tagMode}
                  onValueChange={setTagMode}
                  className="space-y-2"
                >
                  <label
                    htmlFor="tag-mode-only-empty"
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem
                      value={TAG_MODES.ONLY_EMPTY}
                      id="tag-mode-only-empty"
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-medium leading-none">
                        Somente produtos sem tags
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Processa {productsWithoutTags.length} produto(s). Os que já têm tags são ignorados.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="tag-mode-replace-all"
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem
                      value={TAG_MODES.REPLACE_ALL}
                      id="tag-mode-replace-all"
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-medium leading-none">
                        Todos os produtos (substituir tags)
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Processa {validProducts.length} produto(s) e limpa as tags antigas antes de gerar novas.
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
                <div className="h-32 rounded-md border p-2 text-xs font-mono bg-muted/50 dark:border-border/40 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Tag className="w-4 h-4 mr-2" />
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
