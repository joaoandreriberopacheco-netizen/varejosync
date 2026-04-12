import React, { useState, useEffect } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { listarAnexos } from '@/functions/listarAnexos';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';
import AnexosModal from './AnexosModal';

export default function AnexosPanel({ referenciaId, referenciaTipo, referenciaNomero = '', inline = false, readOnly = false }) {
  const [anexos, setAnexos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const res = await listarAnexos({ referencia_tipo: referenciaTipo, referencia_id: referenciaId });
    setAnexos(res.data?.anexos || []);
    setLoading(false);
  };

  useEffect(() => {
    if (referenciaId && referenciaTipo) carregar();
  }, [referenciaId, referenciaTipo]);

  const handleUpload = async (file, tipoSelecionado, e) => {
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
    if (e) e.target.value = '';
    return tipoSelecionado;
  };

  const handleDelete = async (anexo) => {
    await deletarAnexo({ anexo_id: anexo.id, drive_file_id: anexo.drive_file_id });
    setAnexos(prev => prev.filter(a => a.id !== anexo.id));
  };

  const fabClass = inline
    ? "relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    : "fixed right-6 z-[55] flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 shadow-lg transition-colors hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-white p38-bottom-fab1";
  const iconClass = inline
    ? "w-4 h-4 text-gray-500 dark:text-gray-300"
    : "w-5 h-5 text-white dark:text-gray-800";
  const badgeClass = inline
    ? "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gray-700 dark:bg-white text-white dark:text-gray-900 text-[0.5rem] font-bold flex items-center justify-center"
    : "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-[0.55rem] font-bold flex items-center justify-center shadow";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={fabClass}
        title="Anexos"
      >
        {loading
          ? <Loader2 className={`${iconClass} animate-spin`} />
          : <Paperclip className={iconClass} />
        }
        {!loading && anexos.length > 0 && (
          <span className={badgeClass}>
            {anexos.length > 9 ? '9+' : anexos.length}
          </span>
        )}
      </button>

      <AnexosModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        anexos={anexos}
        onUpload={handleUpload}
        onDelete={handleDelete}
        uploading={uploading}
        referenciaNomero={referenciaNomero}
        readOnly={readOnly}
      />
    </>
  );
}