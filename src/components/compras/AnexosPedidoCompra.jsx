import React, { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Upload, FileText, Image, Trash2, Download, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ name }) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const isImg = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
  if (isImg) return <Image className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-gray-400" />;
}

export default function AnexosPedidoCompra({ pedidoId, pedidoNumero, isOpen, onClose }) {
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && pedidoId) loadAnexos();
  }, [isOpen, pedidoId]);

  const loadAnexos = async () => {
    try {
      const docs = await base44.entities.AnexoDocumento.filter({
        referencia_tipo: 'PedidoCompra',
        referencia_id: pedidoId,
      });
      setAnexos(docs || []);
    } catch (e) {
      console.error('Erro ao carregar anexos', e);
    }
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.AnexoDocumento.create({
          referencia_tipo: 'PedidoCompra',
          referencia_id: pedidoId,
          referencia_numero: pedidoNumero,
          nome_arquivo: file.name,
          tamanho_bytes: file.size,
          tipo_mime: file.type,
          url: file_url,
        });
        toast({ title: `${file.name} anexado` });
      } catch (e) {
        toast({ title: `Erro ao enviar ${file.name}`, variant: 'destructive' });
      }
    }
    setUploading(false);
    loadAnexos();
  };

  const handleDelete = async (id, nome) => {
    await base44.entities.AnexoDocumento.delete(id);
    setAnexos(prev => prev.filter(a => a.id !== id));
    toast({ title: `${nome} removido` });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet bottom-up */}
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wider">Pedido {pedidoNumero}</p>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-400" />
              Documentos Anexados
            </h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`mx-5 mt-4 mb-2 flex-shrink-0 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-6 gap-2 ${
            dragOver
              ? 'border-gray-400 bg-gray-50 dark:bg-gray-800'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className={`w-6 h-6 ${uploading ? 'animate-bounce text-gray-400' : 'text-gray-300 dark:text-gray-600'}`} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {uploading ? 'Enviando...' : 'Toque ou arraste arquivos aqui'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2 mt-2">
          {anexos.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
              Nenhum documento anexado ainda
            </div>
          )}
          {anexos.map(anexo => (
            <div
              key={anexo.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm"
            >
              <FileIcon name={anexo.nome_arquivo} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">{anexo.nome_arquivo}</p>
                <p className="text-[11px] text-gray-400">{formatBytes(anexo.tamanho_bytes)}</p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Abrir"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
                <button
                  onClick={() => handleDelete(anexo.id, anexo.nome_arquivo)}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}