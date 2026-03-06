import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, File, Link2, Plus, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import NovoLancamentoDialog from '@/components/financeiro/NovoLancamentoDialog';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState('opcoes');
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const pollingRef = useRef(null);

  // Busca arquivo do cache 'VarejoSync-shared-files' usando a URL recebida via postMessage
  const carregarArquivoDoCache = async (fileUrl) => {
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const resp = await cache.match(fileUrl);
      if (!resp) return false;
      const blob = await resp.blob();
      if (blob.size === 0) return false;
      await cache.delete(fileUrl);
      const fileName = fileUrl.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      const file = new File([blob], fileName, { type: blob.type });
      const previewUrl = URL.createObjectURL(blob);
      setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
      return true;
    } catch {
      return false;
    }
  };

  // Fallback: varre todo o cache 'VarejoSync-shared-files' em busca de qualquer arquivo
  const varrerCache = async () => {
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const keys = await cache.keys();
      if (keys.length === 0) return false;
      const req = keys[0];
      const resp = await cache.match(req);
      if (!resp) return false;
      const blob = await resp.blob();
      if (blob.size === 0) return false;
      await cache.delete(req);
      const url = typeof req === 'string' ? req : req.url;
      const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      const file = new File([blob], fileName, { type: blob.type });
      const previewUrl = URL.createObjectURL(blob);
      setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let tentativas = 0;
    const MAX_TENTATIVAS = 20;

    // Escuta mensagem do Service Worker com a URL do arquivo no cache
    const onMessage = async (event) => {
      if (event.data?.type === 'SHARED_FILES' && event.data?.files?.length > 0) {
        clearTimeout(pollingRef.current);
        const fileInfo = event.data.files[0];
        const achou = await carregarArquivoDoCache(fileInfo.url);
        if (!achou) await varrerCache();
        setCarregando(false);
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);

    // Polling como fallback caso o postMessage chegue antes da página estar pronta
    const tentar = async () => {
      const achou = await varrerCache();
      if (achou) {
        setCarregando(false);
        return;
      }

      // URL params (texto/link compartilhado)
      const params = new URLSearchParams(window.location.search);
      const title = params.get('title') || params.get('name');
      if (title) {
        setArquivo({ file: null, previewUrl: null, nome: title, tipo: 'text/plain', texto: params.get('text') || params.get('url') });
        setCarregando(false);
        return;
      }

      tentativas++;
      if (tentativas < MAX_TENTATIVAS) {
        pollingRef.current = setTimeout(tentar, 500);
      } else {
        setCarregando(false);
      }
    };

    tentar();

    return () => {
      clearTimeout(pollingRef.current);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  const handleVincular = async (lancamento) => {
    if (!arquivo?.file) return;
    setUploadando(true);
    try {
      const buffer = await arquivo.file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      const base64 = btoa(binary);

      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo,
        file_size: arquivo.file.size,
        referencia_tipo: 'LancamentoFinanceiro',
        referencia_id: lancamento.id,
        referencia_numero: lancamento.descricao || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
      setLancamentoVinculado(lancamento);
      setEtapa('sucesso');
    } finally {
      setUploadando(false);
    }
  };

  const handleNovoCriado = async (lancamento) => {
    if (!arquivo?.file || !lancamento) { setEtapa('sucesso'); return; }
    setUploadando(true);
    try {
      const buffer = await arquivo.file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      const base64 = btoa(binary);

      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo,
        file_size: arquivo.file.size,
        referencia_tipo: 'LancamentoFinanceiro',
        referencia_id: lancamento.id,
        referencia_numero: lancamento.descricao || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
    } finally {
      setUploadando(false);
      setAbrirNovo(false);
      setEtapa('sucesso');
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-3">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        <p className="text-sm text-gray-400">Carregando arquivo compartilhado...</p>
      </div>
    );
  }

  if (etapa === 'sucesso') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 gap-5">
        <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-glacial">Comprovante salvo!</h2>
          {lancamentoVinculado && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Vinculado a: <span className="font-medium">{lancamentoVinculado.descricao}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => window.location.href = createPageUrl('FluxoCaixa')}
          className="w-full max-w-xs h-13 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold active:scale-95 transition-all px-6 py-4"
        >
          Ir para Fluxo de Caixa
        </button>
        <button
          onClick={() => window.location.href = createPageUrl('Dashboard')}
          className="text-sm text-gray-400 dark:text-gray-500"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">Comprovante Recebido</h1>
          <p className="text-xs text-gray-400">O que deseja fazer com este arquivo?</p>
        </div>
      </div>

      {/* Preview do arquivo */}
      <div className="mx-5 mb-5">
        <ArquivoPreview arquivo={arquivo} />
      </div>

      {/* Opções */}
      {etapa === 'opcoes' && (
        <div className="px-5 space-y-3">
          <OpcaoCard
            icon={Link2}
            titulo="Vincular a lançamento existente"
            descricao="Associar este comprovante a uma despesa ou receita já registrada"
            onClick={() => setEtapa('vincular')}
          />
          <OpcaoCard
            icon={Plus}
            titulo="Criar novo lançamento"
            descricao="Registrar um novo lançamento financeiro usando este comprovante"
            onClick={() => setAbrirNovo(true)}
          />
          {!arquivo?.file && (
            <p className="text-xs text-center text-amber-500 mt-4 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl py-3">
              Arquivo não detectado. Verifique se o Service Worker foi atualizado e tente compartilhar novamente.
            </p>
          )}
        </div>
      )}

      {/* Sheet de busca de lançamento */}
      {etapa === 'vincular' && (
        <BuscarLancamentoSheet
          onSelecionar={handleVincular}
          onVoltar={() => setEtapa('opcoes')}
          uploadando={uploadando}
        />
      )}

      {/* Dialog novo lançamento */}
      {abrirNovo && (
        <NovoLancamentoDialog
          open={abrirNovo}
          onClose={() => setAbrirNovo(false)}
          onSaved={(lancamento) => handleNovoCriado(lancamento)}
        />
      )}
    </div>
  );
}

function ArquivoPreview({ arquivo }) {
  if (!arquivo) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 flex flex-col items-center gap-3 shadow-sm">
        <File className="w-10 h-10 text-gray-300 dark:text-gray-700" />
        <p className="text-sm text-gray-400">Nenhum arquivo detectado</p>
      </div>
    );
  }

  const isPdf = arquivo.tipo?.includes('pdf');
  const isImage = arquivo.tipo?.startsWith('image/');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm">
      {isImage && arquivo.previewUrl ? (
        <img src={arquivo.previewUrl} alt={arquivo.nome} className="w-full max-h-56 object-cover" />
      ) : (
        <div className="flex items-center gap-4 p-5">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none">
            {isPdf
              ? <FileText className="w-7 h-7 text-red-400" />
              : isImage
                ? <ImageIcon className="w-7 h-7 text-gray-500 dark:text-gray-400" />
                : <File className="w-7 h-7 text-gray-500 dark:text-gray-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{arquivo.nome}</p>
            <p className="text-xs text-gray-400 mt-0.5">{isPdf ? 'PDF' : isImage ? 'IMAGEM' : 'ARQUIVO'}</p>
            {arquivo.file?.size && (
              <p className="text-xs text-gray-400">
                {arquivo.file.size < 1024 * 1024
                  ? `${(arquivo.file.size / 1024).toFixed(1)} KB`
                  : `${(arquivo.file.size / (1024 * 1024)).toFixed(1)} MB`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OpcaoCard({ icon: Icon, titulo, descricao, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-900 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all text-left"
    >
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{titulo}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{descricao}</p>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 rotate-180 flex-none" />
    </button>
  );
}