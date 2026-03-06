import React, { useState, useEffect } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { listarAnexos } from '@/functions/listarAnexos';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';
import AnexosModal from './AnexosModal';

export default function AnexosPanel({ referenciaId, referenciaTipo, referenciaNomero = '' }) {
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
  };

  const handleDelete = async (anexo) => {
    await deletarAnexo({ anexo_id: anexo.id, drive_file_id: anexo.drive_file_id });
    setAnexos(prev => prev.filter(a => a.id !== anexo.id));
  };

  return (
    <>
      {/* Trigger — clipe num círculo + contador */}
      <button
        onClick={() => setModalOpen(true)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Anexos"
      >
        {loading
          ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          : <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-300" />
        }
        {!loading && anexos.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-700 dark:bg-white text-white dark:text-gray-900 text-[0.55rem] font-bold flex items-center justify-center">
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
      />
    </>
  );
}