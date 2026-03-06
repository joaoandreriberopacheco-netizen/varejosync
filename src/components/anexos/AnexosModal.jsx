import React, { useState, useRef } from 'react';
import { X, FileText, Image, File, Trash2, ExternalLink, Loader2, Upload, ChevronRight } from 'lucide-react';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';

const TIPOS_DOCUMENTO = ['Comprovante', 'Boleto', 'Nota Fiscal', 'Contrato', 'Orçamento', 'Outro'];
const ORDER = ['Nota Fiscal', 'Boleto', 'Comprovante', 'Contrato', 'Orçamento', 'Outro'];

function ThumbnailIcon({ anexo, large = false }) {
  const [imgError, setImgError] = useState(false);
  const size = large ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl';
  const iconSize = large ? 'w-6 h-6' : 'w-5 h-5';

  if (anexo.url_thumbnail && !imgError) {
    return (
      <img
        src={anexo.url_thumbnail}
        alt={anexo.nome_arquivo}
        className={`${size} object-cover flex-none`}
        onError={() => setImgError(true)}
      />
    );
  }
  const isPdf = anexo.mime_type?.includes('pdf');
  const isImage = anexo.mime_type?.startsWith('image/');
  return (
    <div className={`${size} bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-none`}>
      {isPdf ? <FileText className={`${iconSize} text-gray-400`} /> : isImage ? <Image className={`${iconSize} text-gray-400`} /> : <File className={`${iconSize} text-gray-400`} />}
    </div>
  );
}

function AnexoCard({ anexo, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <ThumbnailIcon anexo={anexo} large />
      <div className="flex-1 min-w-0">
        <a
          href={anexo.url_drive}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1.5 hover:text-gray-900"
        >
          <span className="truncate text-sm">{anexo.nome_arquivo}</span>
          <ExternalLink className="w-3.5 h-3.5 flex-none text-gray-400" />
        </a>
        <p className="text-xs text-gray-400 mt-0.5">{formatSize(anexo.tamanho_bytes)}</p>
      </div>
      <button
        onClick={async () => { setDeleting(true); await onDelete(anexo); setDeleting(false); }}
        disabled={deleting}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors flex-none"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AnexosModal({ isOpen, onClose, anexos, onUpload, onDelete, uploading, referenciaNomero }) {
  const [tipoSelecionado, setTipoSelecionado] = useState('Comprovante');
  const inputRef = useRef();

  const grupos = ORDER.reduce((acc, tipo) => {
    const itens = anexos.filter(a => (a.tipo_documento || 'Comprovante') === tipo);
    if (itens.length > 0) acc.push({ tipo, itens });
    return acc;
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, tipoSelecionado, e);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950 dark:bg-gray-950">
      {/* Header escuro PDV */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white font-glacial">Anexos</h2>
          {referenciaNomero && <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{referenciaNomero}</p>}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tipo Selector — grade PDV */}
      <div className="px-5 pb-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-gray-600 mb-2">Tipo do documento</p>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS_DOCUMENTO.map(tipo => (
            <button
              key={tipo}
              onClick={() => setTipoSelecionado(tipo)}
              className={`py-4 px-2 rounded-2xl text-sm font-medium transition-all ${
                tipoSelecionado === tipo
                  ? 'bg-white text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Upload button — destaque */}
      <div className="px-5 pb-4">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center gap-2 text-gray-300 transition-colors border border-dashed border-gray-700"
        >
          {uploading
            ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-medium">Enviando...</span></>
            : <><Upload className="w-5 h-5" /><span className="text-sm font-medium">Selecionar arquivo</span></>
          }
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Lista — fundo ligeiramente mais claro */}
      <div className="flex-1 overflow-y-auto bg-gray-900 rounded-t-3xl px-5 py-5">
        {anexos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <File className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">Nenhum anexo ainda</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map(({ tipo, itens }) => (
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">{tipo}</span>
                  <span className="text-[0.65rem] text-gray-700">·</span>
                  <span className="text-[0.65rem] text-gray-500">{itens.length}</span>
                </div>
                <div className="space-y-2">
                  {itens.map(anexo => (
                    <AnexoCard key={anexo.id} anexo={anexo} onDelete={onDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}