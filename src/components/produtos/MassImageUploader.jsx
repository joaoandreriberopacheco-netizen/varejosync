import React, { useState, useCallback, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, FileImage } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";

export default function MassImageUploader({ isOpen, onClose, onComplete }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(file => 
      file.type.startsWith('image/')
    ).map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setResults(null);
    }
  };

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same files can be selected again if cleared
    e.target.value = ''; 
  };

  const removeFile = (fileToRemove) => () => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
    URL.revokeObjectURL(fileToRemove.preview);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    
    const summary = {
      success: 0,
      failed: 0,
      notFound: 0,
      details: []
    };

    try {
      // 1. Fetch all products to match efficiently
      // Ideally we should fetch only needed fields to be lighter
      const allProducts = await base44.entities.Produto.list();
      
      // Create lookup maps for O(1) access
      const codigoInternoMap = {};
      const codigoBarrasMap = {};
      
      allProducts.forEach(p => {
        if (p.codigo_interno) codigoInternoMap[p.codigo_interno.toLowerCase()] = p;
        if (p.codigo_barras) codigoBarrasMap[p.codigo_barras] = p;
      });

      const totalFiles = files.length;
      let processed = 0;

      for (const file of files) {
        const fileName = file.name.split('.').slice(0, -1).join('.').toLowerCase(); // Remove extension
        
        // Try to match product BEFORE uploading to save bandwidth/storage if no match
        // Logic: Match by Barcode OR Internal Code
        let matchedProduct = codigoBarrasMap[fileName] || codigoInternoMap[fileName];

        if (!matchedProduct) {
           summary.notFound++;
           summary.details.push({ 
             file: file.name, 
             status: 'error', 
             msg: 'Produto não encontrado pelo nome do arquivo.' 
           });
        } else {
          try {
            // Upload file
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Update product
            await base44.entities.Produto.update(matchedProduct.id, { imagem_url: file_url });
            
            summary.success++;
            summary.details.push({ 
              file: file.name, 
              status: 'success', 
              msg: `Associado a ${matchedProduct.nome}` 
            });
          } catch (err) {
            summary.failed++;
            summary.details.push({ 
              file: file.name, 
              status: 'error', 
              msg: 'Erro no upload: ' + err.message 
            });
          }
        }

        processed++;
        setProgress(Math.round((processed / totalFiles) * 100));
      }

      setResults(summary);
      toast({
        title: "Processamento Concluído",
        description: `${summary.success} imagens associadas com sucesso.`,
        className: summary.success > 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
      });
      
      if (summary.success > 0 && onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error("Erro massivo:", error);
      toast({ title: "Erro Crítico", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    // Cleanup previews
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setResults(null);
    setProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 gap-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="p-6 pb-2 flex-none border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
            <FileImage className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Importação Massiva de Imagens
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Os arquivos devem ter o nome igual ao <strong>Código de Barras</strong> ou <strong>Código Interno</strong> do produto.
            <br/><span className="text-xs opacity-80">Exemplo: "789123456.jpg" ou "PRD-001.png"</span>
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
          {!results ? (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Dropzone */}
              <div 
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-none border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragActive 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-gray-800'
                  }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileInputChange} 
                  className="hidden" 
                  multiple 
                  accept="image/png, image/jpeg, image/webp" 
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {isDragActive ? 'Solte os arquivos aqui' : 'Clique ou arraste imagens aqui'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Suporta JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="flex-1 mt-6 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Arquivos Selecionados ({files.length})
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-red-500 h-auto py-1 px-2 text-xs hover:text-red-600 hover:bg-red-50">
                      Limpar tudo
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-1 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                    <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                          <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                            <img 
                              src={file.preview} 
                              className="w-full h-full object-cover" 
                              onLoad={() => { /* kept for potential logic */ }}
                              alt="preview"
                            />
                          </div>
                          <div className="p-2 text-xs truncate font-medium border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                            {file.name}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // prevent triggering file input
                              removeFile(file)();
                            }}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              {/* Results View */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{results.success}</div>
                  <div className="text-xs font-medium text-green-800 dark:text-green-300">Sucesso</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{results.notFound}</div>
                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Não Encontrados</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed}</div>
                  <div className="text-xs font-medium text-red-800 dark:text-red-300">Falhas</div>
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detalhes</h3>
              <ScrollArea className="flex-1 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {results.details.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-start gap-3 text-sm">
                      {item.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${item.status === 'error' && item.msg.includes('não encontrado') ? 'text-yellow-500' : 'text-red-500'}`} />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{item.file}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{item.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {uploading ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Processando...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={handleClose} className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700">
                {results ? 'Fechar' : 'Cancelar'}
              </Button>
              {!results && (
                <Button 
                  onClick={handleUpload} 
                  disabled={files.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Iniciar Importação
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}