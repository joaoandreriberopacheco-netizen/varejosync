import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Image as ImageIcon, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function MassImageGenerator({ products, onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [logs, setLogs] = useState([]);
  const { toast } = useToast();

  const handleStart = async () => {
    if (!products) return;
    
    const validProducts = products.filter(p => p && p.id && p.nome);
    const targetProducts = onlyMissing 
      ? validProducts.filter(p => !p.imagem_url) 
      : validProducts;

    if (targetProducts.length === 0) {
      toast({ title: "Nenhum produto para processar", description: "Todos os produtos já possuem imagem ou a lista está vazia." });
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: targetProducts.length, success: 0, fail: 0 });
    setLogs([]);

    const CONCURRENCY_LIMIT = 3;
    let index = 0;

    const processNext = async () => {
      if (index >= targetProducts.length) return;

      const batch = targetProducts.slice(index, index + CONCURRENCY_LIMIT);
      const batchStartIndex = index;
      index += CONCURRENCY_LIMIT;

      const promises = batch.map(async (product, i) => {
        try {
          const prompt = `Professional studio photography of construction material / hardware store product: ${product.nome} (${product.categoria_nome || ''}). Context: Building supplies, tools, or home improvement. Isolated on white background, 4k, realistic, commercial catalog style.`;
          
          // Add log
          setLogs(prev => [`Gerando imagem para: ${product.nome}...`, ...prev].slice(0, 50));

          const { url } = await base44.integrations.Core.GenerateImage({ prompt });

          if (url) {
            await base44.entities.Produto.update(product.id, { imagem_url: url });
            setProgress(prev => ({ ...prev, current: prev.current + 1, success: prev.success + 1 }));
            setLogs(prev => [`✓ Imagem gerada: ${product.nome}`, ...prev].slice(0, 50));
          } else {
            throw new Error("URL não retornada");
          }
        } catch (error) {
          console.error(error);
          setProgress(prev => ({ ...prev, current: prev.current + 1, fail: prev.fail + 1 }));
          setLogs(prev => [`❌ Erro em ${product.nome}: ${error.message}`, ...prev].slice(0, 50));
        }
      });

      await Promise.all(promises);
      await processNext();
    };

    await processNext();

    setIsProcessing(false);
    if (onComplete) onComplete();
    toast({ title: "Processo concluído", description: "Imagens geradas com sucesso." });
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="ml-2 gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-900/20"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="w-4 h-4" />
        Auto Imagens
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && setIsOpen(open)}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Gerador de Imagens IA
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {!isProcessing ? (
              <>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-sm text-indigo-800 dark:text-indigo-300">
                  <p className="font-semibold flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Como funciona
                  </p>
                  <p>A IA analisará o nome, categoria e marca dos produtos para gerar imagens realistas de estúdio automaticamente.</p>
                  <p className="mt-2 text-xs opacity-80">Nota: O processo leva cerca de 5-10 segundos por imagem.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="missing" 
                    checked={onlyMissing} 
                    onCheckedChange={setOnlyMissing}
                  />
                  <Label htmlFor="missing">Gerar apenas para produtos sem imagem</Label>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Produtos na lista atual: <strong>{products.length}</strong>
                  <br />
                  {onlyMissing && (
                    <span>Sem imagem: <strong>{products.filter(p => !p.imagem_url).length}</strong></span>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Processando...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded text-green-700 dark:text-green-300">
                    Sucesso: {progress.success}
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
                    Falhas: {progress.fail}
                  </div>
                </div>

                <div className="h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs font-mono space-y-1 border border-gray-200 dark:border-gray-700">
                  {logs.map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isProcessing ? (
              <>
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button onClick={handleStart} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Iniciar Geração
                </Button>
              </>
            ) : (
              <Button disabled className="w-full">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando Imagens...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}