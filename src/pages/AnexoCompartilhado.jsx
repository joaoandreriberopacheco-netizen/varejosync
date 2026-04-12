import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileText, File, Link2, Plus, Loader2, CheckCircle2, ArrowLeft, ShoppingCart, Anchor, ChevronRight, Receipt, RefreshCw, LayoutDashboard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import BuscarPedidoCompraParaAnexo from '@/components/anexos/BuscarPedidoCompraParaAnexo';
import BuscarEventoLogisticoParaAnexo from '@/components/anexos/BuscarEventoLogisticoParaAnexo';
import NovoLancamentoDialog from '@/components/financeiro/NovoLancamentoDialog';
import TipoDocumentoSearch from '@/components/anexos/TipoDocumentoSearch';
import { TIPOS_DOCUMENTO_ANEXO } from '@/lib/tiposDocumentoAnexo';
import { mapDestinoQueryToEtapa, SHARE_DESTINO_QUERY } from '@/lib/pwaShareTarget';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import BoletoRecorrentePicker from '@/components/financeiro/BoletoRecorrentePicker';
import { brandSurface } from '@/lib/brandSurfaces';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  /** torre_controle = classificar documento; opcoes = sala de desembarque (destinos) */
  const [etapa, setEtapa] = useState('torre_controle');
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const pollingRef = useRef(null);
  const destinoDeepLinkHandled = useRef(false);
  const [tipoDocumento, setTipoDocumento] = useState('Comprovante');
  const [tiposDocumentoCustom, setTiposDocumentoCustom] = useState([]);
  /** Lançamento do mês escolhido no atualizador de boletos (partilha → atualizar PDF) */
  const [contaMesBoletoAlvo, setContaMesBoletoAlvo] = useState(null);

  const tiposDocumentoDisponiveis = useMemo(
    () => Array.from(new Set([...TIPOS_DOCUMENTO_ANEXO, ...tiposDocumentoCustom])),
    [tiposDocumentoCustom]
  );

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
      const req = typeof fileUrl === 'string' ? new Request(fileUrl) : fileUrl;
      const resp = await cache.match(req);
      if (!resp) return false;
      const blob = await resp.blob();
      if (blob.size === 0) return false;
      await cache.delete(req);
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
      const achouNoCache = await varrerCache();
      if (achouNoCache) {
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('text') || params.get('url')) {
        setArquivo({
          file: null,
          previewUrl: null,
          nome: params.get('title') || 'Conteúdo',
          tipo: 'text/plain',
          texto: params.get('text') || params.get('url'),
        });
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
      pollingRef.current = setTimeout(() => tentar(), 400);
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

  useEffect(() => {
    if (carregando) return;
    const precisaArquivo =
      etapa === 'importar_pdf_conta' || etapa === 'atualizar_boleto' || etapa === 'atualizar_boleto_import';
    if (precisaArquivo && !arquivo?.file) {
      setContaMesBoletoAlvo(null);
      setEtapa('opcoes');
    }
  }, [carregando, etapa, arquivo?.file]);

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
        tipo_documento: tipoDocumento,
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
        tipo_documento: tipoDocumento,
        origem: 'compartilhamento_web',
      });
      setLancamentoVinculado(null);
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
        tipo_documento: tipoDocumento,
        origem: 'compartilhamento_web',
      });
      setLancamentoVinculado(null);
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro no Upload:', error);
      alert('Falha ao enviar: ' + (error.message || JSON.stringify(error)));
    } finally {
      setUploadando(false);
    }
  };

  const handleNovoCriado = async (lancamento) => {
    if (lancamento) setLancamentoVinculado(lancamento);
    if (!arquivo?.file || !lancamento) {
      setEtapa('sucesso');
      return;
    }
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
        tipo_documento: tipoDocumento,
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
      <div className={`flex min-h-screen flex-col items-center justify-center gap-3 ${brandSurface.pageScreen}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-muted-foreground" />
        <p className={`text-sm ${brandSurface.textMuted}`}>Carregando arquivo compartilhado...</p>
      </div>
    );
  }

  if (etapa === 'sucesso' || etapa === 'sucesso_conta') {
    const titulo = etapa === 'sucesso_conta' ? 'Conta a pagar atualizada!' : 'Comprovante salvo!';
    const anexosLancamentoId = etapa === 'sucesso' && lancamentoVinculado?.id ? lancamentoVinculado.id : null;
    const href = anexosLancamentoId
      ? `${createPageUrl('LancamentoAnexos')}?id=${encodeURIComponent(anexosLancamentoId)}`
      : createPageUrl(etapa === 'sucesso_conta' ? 'Financeiro' : 'FluxoCaixa');
    const ctaLabel = anexosLancamentoId
      ? 'Ver anexos do lançamento'
      : etapa === 'sucesso_conta'
        ? 'Ir para Financeiro'
        : 'Ir para Fluxo de caixa';
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center px-6 gap-5 ${brandSurface.pageScreen}`}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-foreground">{titulo}</h2>
          {etapa === 'sucesso_conta' && (
            <p className={`mt-2 text-sm ${brandSurface.textMuted}`}>Pode rever no AGEFIN e no atualizador de boletos.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.href = href;
          }}
          className="h-14 w-full max-w-xs rounded-2xl bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-sm"
        >
          {ctaLabel}
        </button>
      </div>
    );
  }

  /** Fullscreen acima de tudo; fora da árvore do #root evita overflow/transform a partir do Layout/PWA. */
  const portalAlvo = typeof document !== 'undefined' ? document.body : null;

  const overlaysFullscreen =
    portalAlvo &&
    createPortal(
      <>
        {(etapa === 'vincular' || etapa === 'vincular_pedido' || etapa === 'vincular_evento') && (
          <div
            className={`fixed inset-0 z-[50000] flex min-h-[100dvh] flex-col ${brandSurface.pageScreen}`}
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar destino do anexo"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {etapa === 'vincular' ? (
                <BuscarLancamentoSheet
                  onSelecionar={handleVincular}
                  onVoltar={() => setEtapa('opcoes')}
                  uploadando={uploadando}
                />
              ) : etapa === 'vincular_pedido' ? (
                <BuscarPedidoCompraParaAnexo
                  onSelecionar={handleVincularPedido}
                  onVoltar={() => setEtapa('opcoes')}
                  uploadando={uploadando}
                />
              ) : (
                <BuscarEventoLogisticoParaAnexo
                  onSelecionar={handleVincularEvento}
                  onVoltar={() => setEtapa('opcoes')}
                  uploadando={uploadando}
                />
              )}
            </div>
          </div>
        )}

        {etapa === 'importar_pdf_conta' && arquivo?.file && (
          <div
            className="fixed inset-0 z-[50000] flex min-h-[100dvh] flex-col bg-gray-50 dark:bg-gray-950"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEtapa('opcoes')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Importar conta a pagar</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">O PDF já foi enviado; confira os dados sugeridos antes de salvar.</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <AgefinImportador
                initialFile={arquivo.file}
                onSuccess={(_data, meta) => {
                  if (meta?.close) setEtapa('sucesso_conta');
                }}
              />
            </div>
          </div>
        )}

        {etapa === 'atualizar_boleto' && arquivo?.file && (
          <div
            className="fixed inset-0 z-[50000] flex min-h-[100dvh] flex-col bg-gray-50 dark:bg-gray-950"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <BoletoRecorrentePicker
              onVoltar={() => setEtapa('opcoes')}
              onSelectCard={({ contaMes }) => {
                setContaMesBoletoAlvo(contaMes);
                setEtapa('atualizar_boleto_import');
              }}
            />
          </div>
        )}

        {etapa === 'atualizar_boleto_import' && arquivo?.file && contaMesBoletoAlvo && (
          <div
            className="fixed inset-0 z-[50000] flex min-h-[100dvh] flex-col bg-gray-50 dark:bg-gray-950"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setContaMesBoletoAlvo(null);
                  setEtapa('atualizar_boleto');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Atualizar boleto</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{contaMesBoletoAlvo.descricao || 'Conta selecionada'}</p>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <AgefinImportador
                key={contaMesBoletoAlvo.id}
                initialFile={arquivo.file}
                modoAtualizacao
                contaPrevistaId={contaMesBoletoAlvo.referencia_id || undefined}
                lancamentoFinanceiroId={contaMesBoletoAlvo.id}
                onSuccess={(_data, meta) => {
                  if (meta?.close) {
                    setContaMesBoletoAlvo(null);
                    setEtapa('sucesso_conta');
                  }
                }}
              />
            </div>
          </div>
        )}

        {abrirNovo && (
          <div className="fixed inset-0 z-[50010] flex min-h-[100dvh] items-center justify-center bg-black/25 px-4 py-6 backdrop-blur-sm dark:bg-black/40">
            <NovoLancamentoDialog open={abrirNovo} onClose={() => setAbrirNovo(false)} onSaved={handleNovoCriado} />
          </div>
        )}
      </>,
      portalAlvo
    );

  return (
    <>
    <div className={`relative flex min-h-[100dvh] flex-col ${brandSurface.pageScreen}`}>
      {/* Scroll só aqui: overlays fullscreen vão para document.body (portal). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3 px-4 pb-3 pt-5 md:px-5 md:pb-4">
        <button
          type="button"
          onClick={() => {
            if (etapa === 'opcoes') setEtapa('torre_controle');
            else window.history.back();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-muted dark:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {etapa === 'torre_controle' ? 'Torre de controle' : 'Comprovante recebido'}
          </h1>
          <p className={`text-xs ${brandSurface.textLabel}`}>
            {etapa === 'torre_controle'
              ? 'Identifique o tipo de documento antes de encaminhar.'
              : 'O que deseja fazer com este arquivo?'}
          </p>
        </div>
      </div>

      <div className="mx-4 mb-4 md:mx-5 md:mb-5">
        <ArquivoPreview arquivo={arquivo} />
      </div>

      {etapa === 'torre_controle' && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-6 md:px-5">
          <div className={`flex items-start gap-3 rounded-2xl p-3 md:p-4 ${brandSurface.card}`}>
            <div className={`h-10 w-10 shrink-0 ${brandSurface.iconCapsule}`}>
              <LayoutDashboard className="h-5 w-5 text-gray-600 dark:text-foreground" />
            </div>
            <p className={`text-sm leading-snug ${brandSurface.textMuted}`}>
              Use a lista abaixo (com busca e opção de criar tipo novo). Depois avance para escolher o destino no P38.
            </p>
          </div>
          <div>
            <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-muted-foreground">
              Tipo de documento
            </p>
            <TipoDocumentoSearch
              tipos={tiposDocumentoDisponiveis}
              value={tipoDocumento}
              onChange={setTipoDocumento}
              hideListUntilFocused
              generousPadding
              onAdicionarTipoNovo={(t) =>
                setTiposDocumentoCustom((prev) => (prev.includes(t) ? prev : [...prev, t]))
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setEtapa('opcoes')}
            disabled={!String(tipoDocumento || '').trim()}
            className="mt-auto flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-40 dark:bg-primary dark:text-primary-foreground md:mt-4"
          >
            Continuar para destinos
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {etapa === 'opcoes' && (
        <div className="grid grid-cols-1 gap-2.5 px-4 md:grid-cols-2 md:gap-3 md:px-5">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground md:col-span-2 px-0.5">
            Destino no P38
          </p>
          <OpcaoCard icon={Link2} titulo="Lançamento financeiro" descricao="Conta a pagar / despesa existente" onClick={() => setEtapa('vincular')} />
          <OpcaoCard icon={ShoppingCart} titulo="Pedido de compra" descricao="Anexar ao processo de compras" onClick={() => setEtapa('vincular_pedido')} />
          <OpcaoCard icon={Anchor} titulo="Viagem / frete fluvial" descricao="Evento logístico (itinerário)" onClick={() => setEtapa('vincular_evento')} />
          <OpcaoCard
            icon={Receipt}
            titulo="Importar conta a pagar (PDF)"
            descricao="Ler boleto e criar conta no AGEFIN"
            disabled={!arquivo?.file}
            onClick={() => arquivo?.file && setEtapa('importar_pdf_conta')}
          />
          <OpcaoCard
            icon={RefreshCw}
            titulo="Atualizar boleto (recorrente)"
            descricao="Escolher o mês e o card, depois aplicar este PDF"
            disabled={!arquivo?.file}
            onClick={() => arquivo?.file && setEtapa('atualizar_boleto')}
          />
          <OpcaoCard
            icon={Plus}
            titulo="Criar novo lançamento"
            descricao="Registrar despesa e anexar o arquivo"
            onClick={() => setAbrirNovo(true)}
          />
          
          {!arquivo?.file && (
            <div className="mt-4 flex flex-col gap-2 md:col-span-2">
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
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
      </div>
    </div>
    {overlaysFullscreen}
    </>
  );
}

function ArquivoPreview({ arquivo }) {
  if (!arquivo) {
    return (
      <div className={`flex flex-col items-center gap-3 rounded-3xl p-5 shadow-sm md:p-6 ${brandSurface.card}`}>
        <File className="h-10 w-10 text-gray-300 dark:text-muted-foreground" />
        <p className={`text-sm ${brandSurface.textMuted}`}>Nenhum arquivo detectado</p>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 overflow-hidden rounded-3xl p-4 shadow-sm md:gap-4 md:p-5 ${brandSurface.card}`}>
      <FileText className="h-6 w-6 shrink-0 text-gray-500 dark:text-muted-foreground md:h-7 md:w-7" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-foreground">{arquivo.nome}</p>
        {arquivo.file?.size && <p className={`text-xs ${brandSurface.textLabel}`}>{(arquivo.file.size / 1024).toFixed(1)} KB</p>}
      </div>
    </div>
  );
}

function OpcaoCard({ icon: Icon, titulo, descricao, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={
        disabled
          ? undefined
          : (e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick?.();
            }
      }
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition-colors md:flex-row md:gap-4 md:rounded-3xl md:p-5 ${
        brandSurface.card
      } ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-gray-50/80 dark:hover:bg-muted/30'}`}
    >
      <div className={`h-11 w-11 shrink-0 md:h-12 md:w-12 ${brandSurface.iconCapsule}`}>
        <Icon className="h-5 w-5 text-gray-700 dark:text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-foreground">{titulo}</p>
        <p className={`mt-0.5 text-xs ${brandSurface.textLabel}`}>{descricao}</p>
      </div>
      <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-gray-300 dark:text-muted-foreground" />
    </button>
  );
}