import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, FileText, Image, File, Trash2, ExternalLink, Loader2, ChevronDown } from 'lucide-react';
import { listarAnexos } from '@/functions/listarAnexos';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';

const TIPOS_DOCUMENTO = ['Comprovante', 'Boleto', 'Nota Fiscal', 'Contrato', 'Orçamento', 'Outro'];

const TIPO_CONFIG = {
  'Nota Fiscal':  { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  'Boleto':       { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  'Comprovante':  { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  'Contrato':     { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  'Orçamento':    { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  'Outro':        { color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const ORDER = ['Nota Fiscal', 'Boleto', 'Comprovante', 'Contrato', 'Orçamento', 'Outro'];

function ThumbnailIcon({ anexo }) {
  const [imgError, setImgError] = useState(false);
  if (anexo.url_thumbnail && !imgError) {
    return (
      <img
        src={anexo.url_thumbnail}
        alt={anexo.nome_arquivo}
        className="w-9 h-9 rounded-lg object-cover flex-none"
        onError={() => setImgError(true)}
      />
    );
  }
  const isPdf = anexo.mime_type?.includes('pdf');
  const isImage = anexo.mime_type?.startsWith('image/');
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-none">
      {isPdf ? <FileText className="w-4 h-4 text-gray-400" /> : isImage ? <Image className="w-4 h-4 text-gray-400" /> : <File className="w-4 h-4 text-gray-400" />}
    </div>
  );
}

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG['Outro'];
  return (
    <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md tracking-wide truncate max-w-[80px] ${cfg.color}`}>
      {tipo}
    </span>
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
    <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 group transition-colors">
      <ThumbnailIcon anexo={anexo} />
      <div className="flex-1 min-w-0">
        <a
          href={anexo.url_drive}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 truncate"
        >
          <span className="truncate">{anexo.nome_arquivo}</span>
          <ExternalLink className="w-3 h-3 flex-none opacity-50" />
        </a>
        <div className="flex items-center gap-1.5 mt-0.5">
          <TipoBadge tipo={anexo.tipo_documento || 'Comprovante'} />
          {anexo.tamanho_bytes > 0 && (
            <span className="text-[0.65rem] text-gray-400">{formatSize(anexo.tamanho_bytes)}</span>
          )}
        </div>
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

function TipoSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
      >
        <span>{value}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1 z-50 min-w-[140px]">
          {TIPOS_DOCUMENTO.map(tipo => (
            <button
              key={tipo}
              type="button"
              onClick={() => { onChange(tipo); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${value === tipo ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              {tipo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnexosPanel({ referenciaId, referenciaTipo, referenciaNomero = '' }) {
  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState('Comprovante');
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

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    const base64 = btoa(binary);

    await base44.functions.invoke('uploadAnexoDrive', {
      file_base64: base64,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      referencia_tipo: referenciaTipo,
      referencia_id: referenciaId,
      referencia_numero: referenciaNomero,
      tipo_documento: tipoSelecionado,
    });
    await carregar();
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (anexo) => {
    await deletarAnexo({ anexo_id: anexo.id, drive_file_id: anexo.drive_file_id });
    setAnexos(prev => prev.filter(a => a.id !== anexo.id));
  };

  // Agrupar por tipo na ordem definida
  const grupos = ORDER.reduce((acc, tipo) => {
    const itens = anexos.filter(a => (a.tipo_documento || 'Comprovante') === tipo);
    if (itens.length > 0) acc.push({ tipo, itens });
    return acc;
  }, []);

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

        <div className="flex items-center gap-2">
          <TipoSelector value={tipoSelecionado} onChange={setTipoSelecionado} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-white text-white dark:text-gray-900 text-xs font-medium transition-colors"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Enviando...' : 'Anexar'}
          </button>
        </div>

        <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* Lista agrupada */}
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
          <p className="text-xs text-gray-400">Clique para anexar um documento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ tipo, itens }) => (
            <div key={tipo}>
              <div className="flex items-center gap-2 mb-1 px-2">
                <TipoBadge tipo={tipo} />
                <span className="text-[0.65rem] text-gray-400">{itens.length}</span>
              </div>
              <div className="space-y-0.5">
                {itens.map(anexo => (
                  <AnexoItem key={anexo.id} anexo={anexo} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}