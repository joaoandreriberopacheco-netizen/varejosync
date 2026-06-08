/**
 * Ponte Torre de controle → Pedido novo + importador: preserva o PDF/imagem ao mudar de página.
 * sessionStorage sobrevive ao mesmo origem; clipboard.write é tentado em paralelo (gesto do utilizador).
 */

import { createPageUrl } from '@/utils';

export const STORAGE_PEDIDO_IMPORT_BRIDGE = 'p38_pedido_import_torre_v1';

/** Entrada da Torre: { file, nome, tipo } */
export async function navegarParaNovoPedidoImport(arquivoEntry, tipoDocumento = 'Comprovante') {
  try {
    const file = arquivoEntry?.file;
    if (file) {
      await guardarArquivoParaPedidoImport(file, arquivoEntry.nome, arquivoEntry.tipo, tipoDocumento);
      void copiarArquivoParaClipboardOpcional(file);
    }
  } catch (e) {
    console.warn('[Torre→Pedido] não foi possível guardar cópia do arquivo:', e);
  }
  window.location.href = `${createPageUrl('PedidoCompraDetalhe')}?id=novo&autoImportador=1`;
}

export function guardarArquivoParaPedidoImport(file, nome, tipo, tipoDocumento = 'Comprovante') {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        sessionStorage.setItem(
          STORAGE_PEDIDO_IMPORT_BRIDGE,
          JSON.stringify({
            nome: nome || file.name || 'documento',
            tipo: tipo || file.type || 'application/octet-stream',
            tipoDocumento: String(tipoDocumento || 'Comprovante').trim() || 'Comprovante',
            base64,
            ts: Date.now(),
          })
        );
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

export async function copiarArquivoParaClipboardOpcional(file) {
  if (
    !file ||
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false;
  }
  try {
    const mime = file.type || 'application/octet-stream';
    let blob;
    if (file instanceof Blob) {
      blob = file;
    } else {
      const buf = await file.arrayBuffer();
      blob = new Blob([buf], { type: mime });
    }
    await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê e remove. Devolve { file, tipoDocumento } ou null.
 */
const TTL_MS = 30 * 60 * 1000;

export function consumirArquivoPedidoImportDoBridge() {
  try {
    const raw = sessionStorage.getItem(STORAGE_PEDIDO_IMPORT_BRIDGE);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_PEDIDO_IMPORT_BRIDGE);
    const parsed = JSON.parse(raw);
    const { nome, tipo, base64, ts, tipoDocumento } = parsed;
    if (ts && Date.now() - Number(ts) > TTL_MS) {
      return null;
    }
    if (!base64) return null;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: tipo || 'application/octet-stream' });
    const safeName = nome || 'documento.pdf';
    const file = new File([blob], safeName, {
      type: tipo || blob.type || 'application/octet-stream',
      lastModified: Date.now(),
    });
    return {
      file,
      tipoDocumento: String(tipoDocumento || 'Comprovante').trim() || 'Comprovante',
    };
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_PEDIDO_IMPORT_BRIDGE);
    } catch (_) {}
    return null;
  }
}
