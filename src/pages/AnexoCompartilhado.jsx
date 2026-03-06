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
    console.log('PAGE: carregarArquivoDoCache chamado para:', fileUrl);
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const resp = await cache.match(fileUrl);
      if (!resp) {
        console.warn('PAGE: carregarArquivoDoCache - Não encontrou arquivo no cache para:', fileUrl);
        return false;
      }
      const blob = await resp.blob();
      if (blob.size === 0) {
        console.warn('PAGE: carregarArquivoDoCache - Arquivo vazio no cache para:', fileUrl);
        return false;
      }
      await cache.delete(fileUrl);
      console.log('PAGE: carregarArquivoDoCache - Arquivo carregado e removido do cache:', fileUrl);
      const fileName = fileUrl.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      const file = new File([blob], fileName, { type: blob.type });
      const previewUrl = URL.createObjectURL(blob);
      setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
      return true;
    } catch (e) {
      console.error('PAGE: Erro em carregarArquivoDoCache:', e);
      return false;
    }
  };

  // Fallback: varre todo o cache 'VarejoSync-shared-files' em busca de qualquer arquivo
  const varrerCache = async () => {
    console.log('PAGE: varrerCache chamado (fallback de polling).');
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const keys = await cache.keys();
      if (keys.length === 0) {
        console.log('PAGE: varrerCache - Cache vazio.');
        return false;
      }
      
      for (const req of keys) {
        const resp = await cache.match(req);
        if (!resp) {
          console.warn('PAGE: varrerCache - Não encontrou resposta para:', req.url);
          continue;
        }
        const blob = await resp.blob();
        if (blob.size > 0) {
          await cache.delete(req);
          console.log('PAGE: varrerCache - Arquivo carregado e removido do cache (via varredura):', req.url);
          const url = typeof req === 'string' ? req : req.url;
          const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
          const file = new File([blob], fileName, { type: blob.type });
          const previewUrl = URL.createObjectURL(blob);
          setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
          return true;
        } else {
            await cache.delete(req);
            console.log('PAGE: varrerCache - Entrada de cache vazia removida:', req.url);
        }
      }
      return false;
    } catch (e) {
      console.error('PAGE: Erro em varrerCache:', e);
      return false;
    }
  };

  useEffect(() => {
    let tentativas = 0;
    const MAX_TENTATIVAS = 30;

    const processSharedData = async (fileEntries) => {
        if (!fileEntries || fileEntries.length === 0) {
            console.log('PAGE: processSharedData - Nenhuma entrada de arquivo para processar.');
            setCarregando(false);
            return;
        }

        const firstFileEntry = fileEntries.find(entry => entry.url);
        const textEntry = fileEntries.find(entry => entry.textContent);

        if (firstFileEntry) {
            const achou = await carregarArquivoDoCache(firstFileEntry.url);
            if (!achou) {
                console.warn('PAGE: carregarArquivoDoCache falhou via postMessage para:', firstFileEntry.url);
                await varrerCache(); 
            }
        } else if (textEntry) {
            console.log('PAGE: processSharedData - Texto/URL compartilhado detectado:', textEntry.textContent);
            setArquivo({ file: null, previewUrl: null, nome: textEntry.name, tipo: textEntry.type, texto: textEntry.textContent });
        } else {
            console.warn('PAGE: processSharedData - Nenhuma informação de arquivo ou texto/URL para carregar.');
        }
        setCarregando(false);
    };

    const onMessage = async (event) => {
      console.log('PAGE: Mensagem recebida do SW:', event.data?.type, event.data?.files);
      if (event.data?.type === 'SHARED_FILES' && event.data?.files) {
        clearTimeout(pollingRef.current);
        await processSharedData(event.data.files);
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);

    const tentar = async () => {
      const params = new URLSearchParams(window.location.search);
      const sharedText = params.get('text');
      const sharedUrl = params.get('url');
      const sharedTitle = params.get('title') || params.get('name');

      if (sharedText || sharedUrl) {
        console.log('PAGE: Dados de texto/URL encontrados via URL params.');
        setArquivo({ file: null, previewUrl: null, nome: sharedTitle || 'Conteúdo Compartilhado', tipo: 'text/plain', texto: sharedText || sharedUrl });
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }
      
      const achouNoCache = await varrerCache();
      if (achouNoCache) {
        console.log('PAGE: Arquivo encontrado via varredura de cache no polling.');
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }

      tentativas++;
      if (tentativas < MAX_TENTATIVAS) {
        pollingRef.current = setTimeout(tentar, 500);
      } else {
        setCarregando(false);
        console.warn('PAGE: Polling atingiu limite de tentativas, nenhum arquivo carregado.');
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('share-target')) {
      tentar();
    } else {
        console.log('PAGE: Carregada via Share Target, esperando mensagem do SW...');
        pollingRef.current = setTimeout(() => tentar(), 2000);
    }

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
          
          {/* MODO DEBUG E BOTÃO DE PÂNICO INTEGRADOS AQUI */}
          {!arquivo?.file && (
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs text-center text-amber-500 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl py-3">
                Arquivo não detectado. Veja os dados de diagnóstico abaixo:
              </p>
              
              <div className="p-4 bg-gray-800 text-green-400 text-[10px] font-mono break-all rounded-xl text-left overflow-x-auto">
                <strong>🔍 MODO DEBUG:</strong><br/>
                URL Atual: {window.location.pathname}<br/>
                Parâmetros: {window.location.search || "Nenhum parâmetro"}<br/>
                Navegador: {navigator.userAgent.includes('Android') ? 'Android' : 'Outro'}
              </div>

              <button 
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                      }
                      alert('Service Worker apagado! O app vai recarregar para baixar a nova versão.');
                      window.location.href = window.location.pathname;
                    });
                  }
                }}
                className="w-full bg-red-500 text-white p-3 rounded-xl text-xs font-bold active:bg-red-600 mt-2"
              >
                🔄 Forçar Atualização do App (Limpar SW)
              </button>
            </div>
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
  const isText = arquivo.tipo?.includes('text/plain') || arquivo.texto;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm">
      {isImage && arquivo.previewUrl ? (
        <img src={arquivo.previewUrl} alt={arquivo.nome} className="w-full max-h-56 object-cover" />
      ) : isText ? (
        <div className="p-5">
            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">{arquivo.nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap">{arquivo.texto}</p>
        </div>
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
