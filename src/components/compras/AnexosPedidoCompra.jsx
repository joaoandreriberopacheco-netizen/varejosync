// Redireciona para o AnexosPanel existente (módulo financeiro)
// que já tem: seleção de tipo de documento, upload via Drive, listagem com thumbnails
import React, { useState, useEffect } from 'react';
import { listarAnexos } from '@/functions/listarAnexos';
import { deletarAnexo } from '@/functions/deletarAnexo';
import { base44 } from '@/api/base44Client';
import AnexosModal from '@/components/anexos/AnexosModal';

export default function AnexosPedidoCompra({ pedidoId, pedidoNumero, isOpen, onClose }) {
  const [anexos, setAnexos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const carregar = async () => {
    if (!pedidoId) return;
    const res = await listarAnexos({ referencia_tipo: 'PedidoCompra', referencia_id: pedidoId });
    setAnexos(res.data?.anexos || []);
  };

  useEffect(() => {
    if (isOpen && pedidoId) carregar();
  }, [isOpen, pedidoId]);

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
      referencia_tipo: 'PedidoCompra',
      referencia_id: pedidoId,
      referencia_numero: pedidoNumero,
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
    <AnexosModal
      isOpen={isOpen}
      onClose={onClose}
      anexos={anexos}
      onUpload={handleUpload}
      onDelete={handleDelete}
      uploading={uploading}
      referenciaNomero={pedidoNumero}
    />
  );
}