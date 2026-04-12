import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, File, Link2, Plus, Loader2, CheckCircle2, ArrowLeft, ShoppingCart, Anchor } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import BuscarPedidoCompraParaAnexo from '@/components/anexos/BuscarPedidoCompraParaAnexo';
import BuscarEventoLogisticoParaAnexo from '@/components/anexos/BuscarEventoLogisticoParaAnexo';
import NovoLancamentoDialog from '@/components/financeiro/NovoLancamentoDialog';
import { mapDestinoQueryToEtapa, SHARE_DESTINO_QUERY } from '@/lib/pwaShareTarget';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState('opcoes');
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const pollingRef = useRef(null);
  const destinoDeepLinkHandled = useRef(false);

  // NOVO: Função super segura para converter o ficheiro para o servidor
  const converterParaBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Pega só o código Base64
      reader.onerror = error => reject(error);
    });
  };

  const prepararArquivo = (blob, fileName) => {
    let fileObj;
    try {
      fileObj = new File([blob], fileName, { type: blob.type });
    } catch (error) {
      fileObj = blob;
      fileObj.name = fileName;
    }
    const previewUrl = URL.createObjectURL(blob);
    setArquivo({ file: fileObj, previewUrl, nome: fileName, tipo: blob.type });
  };

  const carregarArquivoDoCache = async (fileUrl) => {
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const resp = await cache.match(fileUrl);
      if (!resp) return false;
      const blob = await resp.blob();
      if (blob.size === 0) return false;
      await cache.delete(fileUrl);
      const fileName = fileUrl.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      prepararArquivo(blob, fileName);
      return true;
    } catch (e) {
      return false;
    }
  };

  const varrerCache = async () => {
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const keys = await cache.keys();
      if (keys.length === 0) return false;
      
      for (const req of keys) {
        const resp = await cache.match(req);
        if (!resp) continue;
        const blob = await resp.blob();
        if (blob.size > 0) {
          await cache.delete(req);
          const url = typeof req === 'string' ? req : req.url;
          const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
          prepararArquivo(blob, fileName);
          return true;
        } else {
            await cache.delete(req);
        }
      }
      return false; 
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    let tentativas = 0;
    const MAX_TENTATIVAS = 30;

    const processSharedData = async (fileEntries) => {
        if (!fileEntries || fileEntries.length === 0) {
            setCarregando(false);
            return;
        }
        const firstFileEntry = fileEntries.find(entry => entry.url); 
        const textEntry = fileEntries.find(entry => entry.textContent); 

        if (firstFileEntry) {
            const achou = await carregarArquivoDoCache(firstFileEntry.url);
            if (!achou) await varrerCache(); 
        } else if (textEntry) {
            setArquivo({ file: null, previewUrl: null, nome: textEntry.name, tipo: textEntry.type, texto: textEntry.textContent });
        }
        setCarregando(false);
    };

    const onMessage = async (event) => {
      if (event.data?.type === 'SHARED_FILES' && event.data?.files) {
        clearTimeout(pollingRef.current);
        await processSharedData(event.data.files);
      }
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', onMessage);
    }

    const tentar = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('text') || params.get('url')) {
        setArquivo({ file: null, previewUrl: null, nome: params.get('title') || 'Conteúdo', tipo: 'text/plain', texto: params.get('text') || params.get('url') });
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }
      
      const achouNoCache = await varrerCache();
      if (achouNoCache) {
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }

      tentativas++;
      if (tentativas < MAX_TENTATIVAS) {
        pollingRef.current = setTimeout(tentar, 500);
      } else {
        setCarregando(false);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('share-target')) {
      tentar();
    } else {
        pollingRef.current = setTimeout(() => tentar(), 2000);
    }

    return () => {
      clearTimeout(pollingRef.current);
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', onMessage);
      }
    };
  }, []);

  useEffect(() => {
    if (carregando || destinoDeepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const destino = params.get(SHARE_DESTINO_QUERY);
    const etapaAlvo = mapDestinoQueryToEtapa(destino);
    if (etapaAlvo) {
      destinoDeepLinkHandled.current = true;
      setEtapa(etapaAlvo);
    }
  }, [carregando]);

  const handleVincular = async (lancamento) => {
    if (!arquivo?.file) return;
    setUploadando(true);
    try {
      // Usa o conversor novo!
      const base64 = await converterParaBase64(arquivo.file);

      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo || 'application/pdf',
        file_size: arquivo.file.size,
        referencia_tipo: 'LancamentoFinanceiro',
        referencia_id: lancamento.id,
        referencia_numero: lancamento.descricao || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
      setLancamentoVinculado(lancamento);
      setEtapa('sucesso');
    } catch (error) {
      console.error("Erro no Upload:", error);
      alert("Falha ao enviar! O servidor disse: " + (error.message || JSON.stringify(error)));
    } finally {
      setUploadando(false);
    }
  };

  const handleVincularPedido = async (pedido) => {
    if (!arquivo?.file) return;
    setUploadando(true);
    try {
      const base64 = await converterParaBase64(arquivo.file);
      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo || 'application/pdf',
        file_size: arquivo.file.size,
        referencia_tipo: 'PedidoCompra',
        referencia_id: pedido.id,
        referencia_numero: pedido.numero || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro no Upload:', error);
      alert('Falha ao enviar: ' + (error.message || JSON.stringify(error)));
    } finally {
      setUploadando(false);
    }
  };

  const handleVincularEvento = async (evento) => {
    if (!arquivo?.file) return;
    setUploadando(true);
    try {
      const base64 = await converterParaBase64(arquivo.file);
      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo || 'application/pdf',
        file_size: arquivo.file.size,
        referencia_tipo: 'EventosLogisticos',
        referencia_id: evento.id,
        referencia_numero: evento.codigo || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro no Upload:', error);
      alert('Falha ao enviar: ' + (error.message || JSON.stringify(error)));
    } finally {
      setUploadando(false);
    }
  };

  const handleNovoCriado = async (lancamento) => {
    if (!arquivo?.file || !lancamento) { setEtapa('sucesso'); return; }
    setUploadando(true);
    try {
      const base64 = await converterParaBase64(arquivo.file);

      await base44.functions.invoke('uploadAnexoDrive', {
        file_base64: base64,
        file_name: arquivo.nome,
        file_type: arquivo.tipo || 'application/pdf',
        file_size: arquivo.file.size,
        referencia_tipo: 'LancamentoFinanceiro',
        referencia_id: lancamento.id,
        referencia_numero: lancamento.descricao || '',
        tipo_documento: 'Comprovante',
        origem: 'compartilhamento_web',
      });
    } catch (error) {
      console.error("Erro no Upload:", error);
      alert("Falha ao enviar! O servidor disse: " + (error.message || JSON.stringify(error)));
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
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Comprovante salvo!</h2>
        </div>
        <button onClick={() => window.location.href = createPageUrl('FluxoCaixa')} className="w-full max-w-xs h-13 rounded-2xl bg-gray-900 text-white font-semibold px-6 py-4">
          Ir para Fluxo de Caixa
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto bg-gray-50 pb-[calc(7rem+env(safe-area-inset-bottom))] dark:bg-gray-950">
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Comprovante Recebido</h1>
          <p className="text-xs text-gray-400">O que deseja fazer com este arquivo?</p>
        </div>
      </div>

      <div className="mx-5 mb-5">
        <ArquivoPreview arquivo={arquivo} />
      </div>

      {etapa === 'opcoes' && (
        <div className="px-5 space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 px-1">Destino no P38</p>
          <OpcaoCard icon={Link2} titulo="Lançamento financeiro" descricao="Conta a pagar / despesa existente" onClick={() => setEtapa('vincular')} />
          <OpcaoCard icon={ShoppingCart} titulo="Pedido de compra" descricao="Anexar ao processo de compras" onClick={() => setEtapa('vincular_pedido')} />
          <OpcaoCard icon={Anchor} titulo="Viagem / frete fluvial" descricao="Evento logístico (itinerário)" onClick={() => setEtapa('vincular_evento')} />
          <OpcaoCard icon={Plus} titulo="Criar novo lançamento" descricao="Registrar despesa e anexar o arquivo" onClick={() => setAbrirNovo(true)} />
          
          {!arquivo?.file && (
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs text-center text-amber-500 px-4 bg-amber-50 rounded-2xl py-3">
                Arquivo não detectado. Veja os dados de diagnóstico abaixo:
              </p>
              
              <div className="p-4 bg-gray-800 text-green-400 text-[10px] font-mono break-all rounded-xl text-left overflow-x-auto shadow-inner">
                <strong>🔍 MODO DEBUG:</strong><br/>
                URL Atual: {window.location.pathname}<br/>
                Parâmetros: {window.location.search || "Nenhum parâmetro"}<br/>
                Navegador: {navigator.userAgent.includes('Android') ? 'Android' : 'Outro'}
              </div>

              <button 
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) { registration.unregister(); }
                      alert('Service Worker apagado! O app vai recarregar para baixar a nova versão.');
                      window.location.href = window.location.pathname;
                    });
                  }
                }}
                className="w-full bg-red-500 text-white p-3 rounded-xl text-xs font-bold mt-2 shadow-sm"
              >
                🔄 Forçar Atualização do App
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === 'vincular' && (
        <div className="flex flex-1 flex-col min-h-0">
          <BuscarLancamentoSheet onSelecionar={handleVincular} onVoltar={() => setEtapa('opcoes')} uploadando={uploadando} />
        </div>
      )}
      {etapa === 'vincular_pedido' && (
        <div className="flex flex-1 flex-col min-h-0">
          <BuscarPedidoCompraParaAnexo onSelecionar={handleVincularPedido} onVoltar={() => setEtapa('opcoes')} uploadando={uploadando} />
        </div>
      )}
      {etapa === 'vincular_evento' && (
        <div className="flex flex-1 flex-col min-h-0">
          <BuscarEventoLogisticoParaAnexo onSelecionar={handleVincularEvento} onVoltar={() => setEtapa('opcoes')} uploadando={uploadando} />
        </div>
      )}
      {abrirNovo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-sm dark:bg-black/40">
          <NovoLancamentoDialog open={abrirNovo} onClose={() => setAbrirNovo(false)} onSaved={handleNovoCriado} />
        </div>
      )}
    </div>
  );
}

function ArquivoPreview({ arquivo }) {
  if (!arquivo) {
    return (
      <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-3 shadow-sm">
        <File className="w-10 h-10 text-gray-300" />
        <p className="text-sm text-gray-400">Nenhum arquivo detectado</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm p-5 flex items-center gap-4">
      <FileText className="w-7 h-7 text-gray-500" />
      <div>
        <p className="font-medium text-sm text-gray-900">{arquivo.nome}</p>
        {arquivo.file?.size && <p className="text-xs text-gray-400">{(arquivo.file.size / 1024).toFixed(1)} KB</p>}
      </div>
    </div>
  );
}

function OpcaoCard({ icon: Icon, titulo, descricao, onClick }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm text-left">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-none">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5">{descricao}</p>
      </div>
      <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 flex-none" />
    </button>
  );
}