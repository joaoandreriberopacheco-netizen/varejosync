import React, { useMemo, useRef, useState } from 'react';
import { X, FileText, Image, File, Trash2, ExternalLink, Loader2, Upload, Printer } from 'lucide-react';
import exportAnexosToPdf from '@/components/anexos/exportAnexosToPdf';
import TipoDocumentoSearch from '@/components/anexos/TipoDocumentoSearch';

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
    <div className={`${size} bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-none`}>
      {isPdf ? <FileText className={`${iconSize} text-gray-500 dark:text-gray-400`} /> : isImage ? <Image className={`${iconSize} text-gray-500 dark:text-gray-400`} /> : <File className={`${iconSize} text-gray-500 dark:text-gray-400`} />}
    </div>
  );
}

function AnexoCard({ anexo, onDelete, readOnly = false }) {
  const [deleting, setDeleting] = useState(false);
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-3">
      <ThumbnailIcon anexo={anexo} />
      <div className="flex-1 min-w-0">
        <a
          href={anexo.url_drive}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white"
        >
          <span className="truncate text-sm">{anexo.nome_arquivo}</span>
          <ExternalLink className="w-3.5 h-3.5 flex-none text-gray-500 dark:text-gray-400" />
        </a>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatSize(anexo.tamanho_bytes)}</p>
        {anexo.descricao && (
          <p className="mt-1 line-clamp-2 text-[11px] text-gray-400 dark:text-gray-500">{anexo.descricao}</p>
        )}
      </div>
      {!readOnly && (
        <button
          onClick={async () => { setDeleting(true); await onDelete(anexo); setDeleting(false); }}
          disabled={deleting}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-none"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export default function AnexosModal({ isOpen, onClose, anexos, onUpload, onDelete, uploading, referenciaNomero, readOnly = false }) {
  const [tipoSelecionado, setTipoSelecionado] = useState('Comprovante');
  const [tiposCustomizados, setTiposCustomizados] = useState([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const inputRef = useRef();

  const handleExportPdf = async () => {
    if (exportingPdf || anexos.length === 0) return;

    setExportingPdf(true);
    await exportAnexosToPdf(anexos);
    setExportingPdf(false);
  };

  const tiposDisponiveis = useMemo(() => {
    const tiposDosAnexos = anexos.map((a) => a.tipo_documento).filter(Boolean);
    return Array.from(new Set([...TIPOS_DOCUMENTO, ...tiposCustomizados, ...tiposDosAnexos]));
  }, [anexos, tiposCustomizados]);

  const grupos = useMemo(() => {
    const ordemFinal = [...ORDER, ...tiposDisponiveis.filter((tipo) => !ORDER.includes(tipo))];
    return ordemFinal.reduce((acc, tipo) => {
      const itens = anexos.filter(a => (a.tipo_documento || 'Comprovante') === tipo);
      if (itens.length > 0) acc.push({ tipo, itens });
      return acc;
    }, []);
  }, [anexos, tiposDisponiveis]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipoUsado = await onUpload(file, tipoSelecionado, e);
    if (tipoUsado && !TIPOS_DOCUMENTO.includes(tipoUsado)) {
      setTiposCustomizados((prev) => prev.includes(tipoUsado) ? prev : [...prev, tipoUsado]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial">Anexos</h2>
          {referenciaNomero && <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{referenciaNomero}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || anexos.length === 0}
            className="h-9 px-3 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 transition-colors"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span className="text-xs font-medium">PDF</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!readOnly && (
        <>
          <div className="px-5 pb-3">
            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Tipo do documento</p>
            <TipoDocumentoSearch
              tipos={tiposDisponiveis}
              value={tipoSelecionado}
              onChange={setTipoSelecionado}
            />
          </div>

          {/* Upload button */}
          <div className="px-5 pb-4">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-200 py-4 text-gray-600 transition-colors dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              {uploading
                ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-medium">Enviando...</span></>
                : <><Upload className="w-5 h-5" /><span className="text-sm font-medium">Selecionar arquivo</span></>
              }
            </button>
            <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>
        </>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl px-5 py-5 shadow-inner">
        {anexos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <File className="w-7 h-7 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum anexo ainda</p>
          </div>
        ) : (
          <div className="space-y-5">
            {readOnly && (
              <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                Visualização apenas: você pode abrir os anexos, mas não pode adicionar nem excluir arquivos.
              </div>
            )}
            {grupos.map(({ tipo, itens }) => (
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{tipo}</span>
                  <span className="text-[0.65rem] text-gray-300 dark:text-gray-700">·</span>
                  <span className="text-[0.65rem] text-gray-400 dark:text-gray-500">{itens.length}</span>
                </div>
                <div className="space-y-2">
                  {itens.map(anexo => (
                    <AnexoCard key={anexo.id} anexo={anexo} onDelete={onDelete} readOnly={readOnly} />
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