/**
 * Upload de ficheiro para o pipeline de anexos (Drive) numa referência.
 */

export function fileBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
  });
}

export async function uploadAnexoParaLancamentoFinanceiro(base44, { file, lancamentoId, descricao = '', tipoDocumento = 'Boleto', origem = 'varejosync' }) {
  if (!file || !lancamentoId) return;
  const base64 = await fileBlobToBase64(file);
  await base44.functions.invoke('uploadAnexoDrive', {
    file_base64: base64,
    file_name: file.name || 'documento.pdf',
    file_type: file.type || 'application/pdf',
    file_size: file.size,
    referencia_tipo: 'LancamentoFinanceiro',
    referencia_id: lancamentoId,
    referencia_numero: descricao || '',
    tipo_documento: tipoDocumento,
    origem,
  });
}
