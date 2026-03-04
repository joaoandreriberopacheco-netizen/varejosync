import React, { useState, useCallback, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, FileImage, Download, Table2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";

export default function MassImageUploader({ isOpen, onClose, onComplete }) {
  const [tab, setTab] = useState('files'); // 'files' | 'url'
  
  // --- FILE UPLOAD STATE ---
  const [files, setFiles] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // --- URL IMPORT STATE ---
  const [xlsFile, setXlsFile] = useState(null);
  const xlsInputRef = useRef(null);

  // --- SHARED STATE ---
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const { toast } = useToast();

  // ---- FILE UPLOAD LOGIC ----
  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => f.type.startsWith('image/')).map(f =>
      Object.assign(f, { preview: URL.createObjectURL(f) })
    );
    if (validFiles.length > 0) { setFiles(prev => [...prev, ...validFiles]); setResults(null); }
  };

  const onDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); }, []);
  const onDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (fileToRemove) => () => {
    setFiles(prev => prev.filter(f => f !== fileToRemove));
    URL.revokeObjectURL(fileToRemove.preview);
  };

  const handleUploadFiles = async () => {
    if (files.length === 0) return;
    setUploading(true); setProgress(0);
    const summary = { success: 0, failed: 0, notFound: 0, details: [] };
    try {
      const allProducts = await base44.entities.Produto.list();
      const codigoInternoMap = {}, codigoBarrasMap = {};
      allProducts.forEach(p => {
        if (p.codigo_interno) codigoInternoMap[p.codigo_interno.toLowerCase()] = p;
        if (p.codigo_barras) codigoBarrasMap[p.codigo_barras] = p;
      });
      let processed = 0;
      for (const file of files) {
        const fileName = file.name.split('.').slice(0, -1).join('.').toLowerCase();
        const matchedProduct = codigoBarrasMap[fileName] || codigoInternoMap[fileName];
        if (!matchedProduct) {
          summary.notFound++;
          summary.details.push({ file: file.name, status: 'error', msg: 'Produto não encontrado pelo nome do arquivo.' });
        } else {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.Produto.update(matchedProduct.id, { imagem_url: file_url });
            summary.success++;
            summary.details.push({ file: file.name, status: 'success', msg: `Associado a ${matchedProduct.nome}` });
          } catch (err) {
            summary.failed++;
            summary.details.push({ file: file.name, status: 'error', msg: 'Erro no upload: ' + err.message });
          }
        }
        processed++;
        setProgress(Math.round((processed / files.length) * 100));
      }
      setResults(summary);
      toast({ title: "Processamento Concluído", description: `${summary.success} imagens associadas.` });
      if (summary.success > 0 && onComplete) onComplete();
    } catch (error) {
      toast({ title: "Erro Crítico", description: error.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // ---- URL IMPORT (XLS) LOGIC ----
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const allProducts = await base44.entities.Produto.list();
      let csv = "\uFEFF";
      csv += "codigo_barras;nome;url_imagem\n";
      allProducts.forEach(p => {
        const cb = (p.codigo_barras || '').replace(/;/g, '');
        const nome = (p.nome || '').replace(/;/g, ' ');
        csv += `${cb};${nome};\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'template_imagens_url.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Template baixado!", description: `${allProducts.length} produtos incluídos.`, duration: 3000 });
    } catch (err) {
      toast({ title: "Erro ao gerar template", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportXls = async () => {
    if (!xlsFile) return;
    setUploading(true); setProgress(0);
    const summary = { success: 0, failed: 0, notFound: 0, details: [] };
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: xlsFile });

      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  codigo_barras: { type: "string" },
                  url_imagem: { type: "string" }
                },
                required: ["codigo_barras", "url_imagem"]
              }
            }
          }
        }
      });

      if (extraction.status !== 'success' || !extraction.output?.data) {
        throw new Error(extraction.details || "Falha ao extrair dados da planilha.");
      }

      const rows = extraction.output.data.filter(r => r.codigo_barras && r.url_imagem);
      const allProducts = await base44.entities.Produto.list();
      const codigoBarrasMap = {}, codigoInternoMap = {};
      allProducts.forEach(p => {
        if (p.codigo_barras) codigoBarrasMap[p.codigo_barras.trim()] = p;
        if (p.codigo_interno) codigoInternoMap[p.codigo_interno.toLowerCase().trim()] = p;
      });

      let processed = 0;
      for (const row of rows) {
        const key = String(row.codigo_barras).trim();
        const product = codigoBarrasMap[key] || codigoInternoMap[key.toLowerCase()];
        if (!product) {
          summary.notFound++;
          summary.details.push({ file: key, status: 'error', msg: 'Produto não encontrado.' });
        } else {
          try {
            await base44.entities.Produto.update(product.id, { imagem_url: row.url_imagem.trim() });
            summary.success++;
            summary.details.push({ file: key, status: 'success', msg: `URL associada a ${product.nome}` });
          } catch (err) {
            summary.failed++;
            summary.details.push({ file: key, status: 'error', msg: 'Erro ao atualizar: ' + err.message });
          }
        }
        processed++;
        setProgress(Math.round((processed / rows.length) * 100));
      }

      setResults(summary);
      toast({ title: "Importação Concluída", description: `${summary.success} imagens vinculadas.` });
      if (summary.success > 0 && onComplete) onComplete();
    } catch (error) {
      toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  // ---- SHARED CLOSE ----
  const handleClose = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview));
    setFiles([]); setResults(null); setProgress(0); setXlsFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-0 gap-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader className="p-6 pb-0 flex-none">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
            <FileImage className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            Importação Massiva de Imagens
          </DialogTitle>
        </DialogHeader>

        {/* TABS */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => { setTab('files'); setResults(null); }}
            className={`px-4 py-2 text-sm rounded-t-md transition-colors font-medium ${tab === 'files' ? 'text-gray-900 dark:text-white border-b-2 border-gray-800 dark:border-gray-200' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Upload de Arquivos
          </button>
          <button
            onClick={() => { setTab('url'); setResults(null); }}
            className={`px-4 py-2 text-sm rounded-t-md transition-colors font-medium flex items-center gap-1.5 ${tab === 'url' ? 'text-gray-900 dark:text-white border-b-2 border-gray-800 dark:border-gray-200' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Importar por URL (Planilha)
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-900/50">
          {results ? (
            /* RESULTS VIEW */
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{results.success}</div>
                  <div className="text-xs text-green-800 dark:text-green-300">Sucesso</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{results.notFound}</div>
                  <div className="text-xs text-amber-800 dark:text-amber-300">Não Encontrados</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">{results.failed}</div>
                  <div className="text-xs text-red-800 dark:text-red-300">Falhas</div>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detalhes</h3>
              <ScrollArea className="flex-1 rounded-xl bg-white dark:bg-gray-800">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {results.details.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-start gap-3 text-sm">
                      {item.status === 'success'
                        ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{item.file}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">{item.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : tab === 'files' ? (
            /* FILE UPLOAD TAB */
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Nomeie os arquivos com o <strong>Código de Barras</strong> ou <strong>Código Interno</strong> do produto.<br />
                Ex: "7891234567890.jpg" ou "PRD-001.png"
              </p>
              <div
                onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-none rounded-xl p-8 text-center cursor-pointer transition-all border-2 border-dashed
                  ${isDragActive ? 'border-gray-400 bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 bg-white dark:bg-gray-800'}`}
              >
                <input type="file" ref={fileInputRef} onChange={e => { handleFiles(e.target.files); e.target.value=''; }} className="hidden" multiple accept="image/*" />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-200 text-sm">{isDragActive ? 'Solte aqui' : 'Clique ou arraste imagens'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>
              {files.length > 0 && (
                <div className="flex-1 mt-4 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{files.length} arquivo{files.length !== 1 ? 's' : ''}</span>
                    <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-600">Limpar tudo</button>
                  </div>
                  <ScrollArea className="flex-1 rounded-xl bg-white dark:bg-gray-800">
                    <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                          <div className="aspect-square"><img src={file.preview} className="w-full h-full object-cover" alt="preview" /></div>
                          <div className="p-1 text-[10px] truncate text-gray-600 dark:text-gray-400">{file.name}</div>
                          <button onClick={e => { e.stopPropagation(); removeFile(file)(); }} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
            /* URL IMPORT TAB */
            <div className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-medium text-gray-700 dark:text-gray-300">Como funciona:</p>
                <ol className="list-decimal ml-4 space-y-1 text-xs">
                  <li>Baixe o template (CSV/XLS) com as colunas <strong>codigo_barras</strong> e <strong>url_imagem</strong></li>
                  <li>Preencha com os dados dos seus produtos</li>
                  <li>Importe o arquivo — o sistema vinculará automaticamente as URLs</li>
                </ol>
              </div>

              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full flex items-center gap-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                <Download className="w-4 h-4" />
                Baixar Template (CSV)
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Importar Planilha</p>
                <div
                  onClick={() => xlsInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 text-center cursor-pointer hover:border-gray-400 bg-white dark:bg-gray-800 transition-colors"
                >
                  <input ref={xlsInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { setXlsFile(e.target.files[0] || null); e.target.value=''; }} />
                  {xlsFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">{xlsFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setXlsFile(null); }} className="text-red-400 hover:text-red-500 ml-2"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                      <Table2 className="w-8 h-8" />
                      <p className="text-sm">Clique para selecionar o arquivo</p>
                      <p className="text-xs">CSV, XLS, XLSX</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {uploading ? (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Processando...</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gray-700 dark:bg-gray-300 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-end w-full">
              <Button variant="outline" onClick={handleClose} className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                {results ? 'Fechar' : 'Cancelar'}
              </Button>
              {!results && tab === 'files' && (
                <Button onClick={handleUploadFiles} disabled={files.length === 0} className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-gray-100 dark:text-gray-900 text-white">
                  Iniciar Importação
                </Button>
              )}
              {!results && tab === 'url' && (
                <Button onClick={handleImportXls} disabled={!xlsFile} className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-gray-100 dark:text-gray-900 text-white">
                  Importar Planilha
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}