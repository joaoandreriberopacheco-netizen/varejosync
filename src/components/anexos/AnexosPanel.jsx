import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, X, FileText, Image, File, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { listarAnexos } from '@/functions/listarAnexos';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';

function ThumbnailIcon({ anexo }) {
  const [imgError, setImgError] = useState(false);

  if (anexo.url_thumbnail && !imgError) {
    return (
      <img
        src={anexo.url_thumbnail}
        alt={anexo.nome_arquivo}
        className="w-10 h-10 rounded-lg object-cover flex-none"
        onError={() => setImgError(true)}
      />
    );
  }

  const isPdf = anexo.mime_type?.includes('pdf');
  const isImage = anexo.mime_type?.startsWith('image/');

  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-none">
      {isPdf ? (
        <FileText className="w-5 h-5 text-gray-400" />
      ) : isImage ? (
        <Image className="w-5 h-5 text-gray-400" />
      ) : (
        <File className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );
}

function AnexoItem({ anexo, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(anexo);
    setDeleting(false);
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
      <ThumbnailIcon anexo={anexo} />

      <div className="flex-1 min-w-0">
        <a
          href={anexo.url_drive}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 truncate"
        >
          <span className="truncate">{anexo.nome_arquivo}</span>
          <ExternalLink className="w-3 h-3 flex-none opacity-60" />
        </a>
        <p className="text-[0.68rem] text-gray-400 mt-0.5">
          {formatSize(anexo.tamanho_bytes)}
          {anexo.descricao && ` · ${anexo.descricao}`}
        </p>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function AnexosPanel({ referenciaId, referenciaTipo, referenciaNomero = '' }) {
  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const carregar = async () => {
    setLoading(true);
    const res = await listarAnexos({ referencia_tipo: referenciaTipo, referencia_id: referenciaId });
    setAnexos(res.data?.anexos || []);
    setLoading(false);
  };

  useEffect(() => {
    if (referenciaId && referenciaTipo) carregar();
  }, [referenciaId, referenciaTipo]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const form = new FormData();
    form.append('file', file);
    form.append('referencia_tipo', referenciaTipo);
    form.append('referencia_id', referenciaId);
    form.append('referencia_numero', referenciaNomero);

    await uploadAnexoDrive(form);
    await carregar();
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (anexo) => {
    await deletarAnexo({ anexo_id: anexo.id, drive_file_id: anexo.drive_file_id });
    setAnexos(prev => prev.filter(a => a.id !== anexo.id));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Anexos {anexos.length > 0 && <span className="text-gray-400 font-normal">({anexos.length})</span>}
          </span>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Enviando...' : 'Anexar'}
        </button>

        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : anexos.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl py-6 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
        >
          <Paperclip className="w-5 h-5 text-gray-300" />
          <p className="text-xs text-gray-400">Clique para anexar um comprovante</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {anexos.map(anexo => (
            <AnexoItem key={anexo.id} anexo={anexo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}