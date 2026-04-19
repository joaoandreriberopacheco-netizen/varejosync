import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  File,
  Link2,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ShoppingCart,
  Anchor,
  ChevronRight,
  RefreshCw,
  RadioTower,
  HelpCircle,
  FileUp,
  Clipboard,
  FolderOpen,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import BuscarPedidoCompraParaAnexo from '@/components/anexos/BuscarPedidoCompraParaAnexo';
import BuscarEventoLogisticoParaAnexo from '@/components/anexos/BuscarEventoLogisticoParaAnexo';
import TipoDocumentoSearch from '@/components/anexos/TipoDocumentoSearch';
import { TIPOS_DOCUMENTO_ANEXO, loadTiposCustomAnexo, saveTiposCustomAnexo } from '@/lib/tiposDocumentoAnexo';
import { mapDestinoQueryToEtapa, SHARE_DESTINO_QUERY } from '@/lib/pwaShareTarget';
import AgefinImportador from '@/components/agefin/AgefinImportador';
import BoletoRecorrentePicker from '@/components/financeiro/BoletoRecorrentePicker';
import { brandSurface } from '@/lib/brandSurfaces';
import {
  guardarArquivoParaPedidoImport,
  copiarArquivoParaClipboardOpcional,
} from '@/lib/torrePedidoImportBridge';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  /** torre_controle = classificar documento; opcoes = sala de desembarque (destinos) */
  const [etapa, setEtapa] = useState('torre_controle');
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const pollingRef = useRef(null);
  const inputArquivoManualRef = useRef(null);
  const destinoDeepLinkHandled = useRef(false);
  const [tipoDocumento, setTipoDocumento] = useState('Comprovante');
  const [tiposDocumentoCustom, setTiposDocumentoCustom] = useState(() => loadTiposCustomAnexo());
  const [ajudaTorreAberta, setAjudaTorreAberta] = useState(false);
  const [feedbackClipboard, setFeedbackClipboard] = useState('');
  const [modoAtalhoClipboard, setModoAtalhoClipboard] = useState(false);
  /** Lançamento do mês escolhido no atualizador de boletos (partilha → atualizar PDF) */
  const [contaMesBoletoAlvo, setContaMesBoletoAlvo] = useState(null);
  const colagemAutomaticaClipboardTentada = useRef(false);

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
      // Em alguns browsers não é seguro mutar `name` num Blob/File; usa o nome no estado.
      fileObj = blob;
    }
    const previewUrl = URL.createObjectURL(blob);
    setArquivo({ file: fileObj, previewUrl, nome: fileName, tipo: blob.type });
  };

  const definirTextoColado = (texto) => {
    const valor = String(texto || '').trim();
    if (!valor) return false;
    const isUrl = /^https?:\/\//i.test(valor);
    setArquivo({
      file: null,
      previewUrl: null,
      nome: isUrl ? 'Link colado' : 'Texto colado',
      tipo: isUrl ? 'text/uri-list' : 'text/plain',
      texto: valor,
    });
    return true;
  };

  const extensaoPorMime = (mime = '') => {
    const m = String(mime).toLowerCase();
    if (m === 'application/pdf') return '.pdf';
    if (m === 'image/jpeg') return '.jpg';
    if (m === 'image/png') return '.png';
    if (m === 'image/webp') return '.webp';
    if (m === 'image/gif') return '.gif';
    if (m.startsWith('image/')) return `.${m.split('/')[1] || 'img'}`;
    return '';
  };

  const handleSelecionarArquivoManual = (event) => {
    const f = event?.target?.files?.[0];
    if (!f) return;
    prepararArquivo(f, f.name || `arquivo${extensaoPorMime(f.type)}`);
    setFeedbackClipboard('Arquivo selecionado com sucesso.');
    setModoAtalhoClipboard(false);
    event.target.value = '';
  };

  const handleColarDaAreaTransferencia = async () => {
    const podeLerBinario = typeof navigator !== 'undefined' && typeof navigator.clipboard?.read === 'function';
    const podeLerTexto = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
    setFeedbackClipboard('');

    const tentarTexto = async () => {
      if (!podeLerTexto) return false;
      const texto = await navigator.clipboard.readText();
      if (!String(texto || '').trim()) return false;
      const ok = definirTextoColado(texto);
      if (ok) {
        setFeedbackClipboard('Conteúdo colado com sucesso.');
        setModoAtalhoClipboard(false);
      }
      return ok;
    };

    try {
      if (podeLerBinario) {
        const items = await navigator.clipboard.read();
        for (const item of items || []) {
          const tipoArquivo = (item.types || []).find((t) => t === 'application/pdf' || t.startsWith('image/'));
          if (tipoArquivo) {
            const blob = await item.getType(tipoArquivo);
            const nome = `clipboard-${Date.now()}${extensaoPorMime(tipoArquivo)}`;
            prepararArquivo(blob, nome);
            setFeedbackClipboard('Arquivo colado com sucesso.');
            setModoAtalhoClipboard(false);
            return;
          }
          const tipoTexto = (item.types || []).find((t) => t === 'text/plain' || t === 'text/uri-list');
          if (tipoTexto) {
            const blobTxt = await item.getType(tipoTexto);
            const txt = await blobTxt.text();
            if (definirTextoColado(txt)) {
              setFeedbackClipboard('Conteúdo colado com sucesso.');
              setModoAtalhoClipboard(false);
              return;
            }
          }
        }
      }

      if (await tentarTexto()) return;
      setFeedbackClipboard('Área de transferência vazia ou tipo não suportado. Tente selecionar arquivo ou usar Ctrl+V.');
    } catch (err) {
      try {
        if (await tentarTexto()) return;
      } catch (_) {
        // ignora; cai para mensagem final
      }
      setFeedbackClipboard('Não foi possível aceder diretamente ao clipboard. Tente Ctrl+V ou selecione arquivo.');
      console.error('Colar da área de transferência:', err);
    }
  };

  const SHARED_FILES_CACHE = 'VarejoSync-shared-files';

  const limparTodoCacheCompartilhados = async () => {
    try {
      const cache = await caches.open(SHARED_FILES_CACHE);
      const keys = await cache.keys();
      await Promise.all(keys.map((k) => cache.delete(k)));
    } catch (_) {
      /* ignore */
    }
  };

  const carregarArquivoDoCache = async (fileUrl) => {
    try {
      const cache = await caches.open(SHARED_FILES_CACHE);
      const req = typeof fileUrl === 'string' ? new Request(fileUrl) : fileUrl;
      const resp = await cache.match(req);
      if (!resp) return false;
      const blob = await resp.blob();
      if (blob.size === 0) return false;
      await cache.delete(req);
      const fileName = String(fileUrl).split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      prepararArquivo(blob, fileName);
      await limparTodoCacheCompartilhados();
      return true;
    } catch (e) {
      return false;
    }
  };

  /** SW grava `/shared/${Date.now()}-nome`; sem isso o primeiro da lista pode ser PDF antigo ainda na cache. */
  const extrairTimestampCachePath = (req) => {
    const url = typeof req === 'string' ? req : req.url;
    const m = String(url).match(/\/shared\/(\d+)-/);
    return m ? parseInt(m[1], 10) : 0;
  };

  const consumirArquivoMaisRecenteDoCache = async () => {
    try {
      const cache = await caches.open(SHARED_FILES_CACHE);
      const keys = await cache.keys();
      if (keys.length === 0) return false;

      let melhorReq = null;
      let melhorTs = -1;
      for (const req of keys) {
        const ts = extrairTimestampCachePath(req);
        if (ts >= melhorTs) {
          melhorTs = ts;
          melhorReq = req;
        }
      }

      if (!melhorReq) return false;

      const resp = await cache.match(melhorReq);
      if (!resp) {
        await limparTodoCacheCompartilhados();
        return false;
      }
      const blob = await resp.blob();
      if (blob.size === 0) {
        await limparTodoCacheCompartilhados();
        return false;
      }
      const url = typeof melhorReq === 'string' ? melhorReq : melhorReq.url;
      const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
      prepararArquivo(blob, fileName);
      await limparTodoCacheCompartilhados();
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    let tentativas = 0;
    const MAX_TENTATIVAS = 30;
    let primeiraExecucaoTentar = true;

    const processSharedData = async (fileEntries) => {
        if (!fileEntries || fileEntries.length === 0) {
            setCarregando(false);
            return;
        }
        const firstFileEntry = fileEntries.find(entry => entry.url); 
        const textEntry = fileEntries.find(entry => entry.textContent); 

        if (firstFileEntry) {
            const achou = await carregarArquivoDoCache(firstFileEntry.url);
            if (!achou) await consumirArquivoMaisRecenteDoCache(); 
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
      const shareTarget = params.get('share-target') === '1';
      const focoClipboard = params.get('clipboard') === '1';
      const destino = params.get(SHARE_DESTINO_QUERY);

      if (primeiraExecucaoTentar) {
        primeiraExecucaoTentar = false;
        if (!shareTarget) {
          await limparTodoCacheCompartilhados();
        }
      }

      if (focoClipboard || String(destino || '').toLowerCase() === 'torre') {
        setCarregando(false);
        clearTimeout(pollingRef.current);
        return;
      }

      if (shareTarget) {
        const achouNoCache = await consumirArquivoMaisRecenteDoCache();
        if (achouNoCache) {
          setCarregando(false);
          clearTimeout(pollingRef.current);
          return;
        }
      }

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
    const focoColar = params.get('clipboard') === '1';
    if (focoColar) {
      setModoAtalhoClipboard(true);
      setFeedbackClipboard('A tentar colar automaticamente… Se não aparecer arquivo, use o botão Colar.');
    }
    if (etapaAlvo) {
      destinoDeepLinkHandled.current = true;
      setEtapa(etapaAlvo);
    }
  }, [carregando]);

  /** Atalho ?clipboard=1: tenta ler a área de transferência ao chegar (complementa cópia feita noutra app / passo anterior). */
  useEffect(() => {
    if (carregando) return;
    if (etapa !== 'torre_controle') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('clipboard') !== '1') return;
    if (colagemAutomaticaClipboardTentada.current) return;
    colagemAutomaticaClipboardTentada.current = true;
    const id = window.setTimeout(() => {
      void handleColarDaAreaTransferencia();
    }, 250);
    return () => window.clearTimeout(id);
  }, [carregando, etapa]);

  useEffect(() => {
    if (etapa !== 'torre_controle') setAjudaTorreAberta(false);
  }, [etapa]);

  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = etapa === 'torre_controle' ? 'Torre de Controle | P38 ERP' : 'Anexo Compartilhado | P38 ERP';
    return () => {
      document.title = tituloAnterior;
    };
  }, [etapa]);

  useEffect(() => {
    const handlePaste = async (ev) => {
      if (etapa !== 'torre_controle') return;
      const cd = ev.clipboardData;
      if (!cd) return;

      const fileColado = (cd.files && cd.files.length > 0) ? cd.files[0] : null;
      if (fileColado) {
        ev.preventDefault();
        prepararArquivo(fileColado, fileColado.name || `clipboard-${Date.now()}${extensaoPorMime(fileColado.type)}`);
        setFeedbackClipboard('Arquivo colado com sucesso (Ctrl+V).');
        setModoAtalhoClipboard(false);
        return;
      }

      const texto = cd.getData('text/plain');
      if (texto && definirTextoColado(texto)) {
        ev.preventDefault();
        setFeedbackClipboard('Conteúdo colado com sucesso (Ctrl+V).');
        setModoAtalhoClipboard(false);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [etapa]);

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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AgefinImportador
                key={
                  arquivo?.file
                    ? `agefin-${arquivo.nome || 'doc'}-${arquivo.file.size}-${arquivo.file.lastModified ?? 0}`
                    : 'agefin'
                }
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

      </>,
      portalAlvo
    );

  return (
    <>
    <div className={`relative flex min-h-[100dvh] flex-col ${brandSurface.pageScreen}`}>
      {/* Scroll só aqui: overlays fullscreen vão para document.body (portal). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {etapa === 'torre_controle' ? (
        <>
          <div className="flex items-center gap-3 px-4 pt-5 md:px-5">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-muted dark:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <RadioTower
                className="h-6 w-6 shrink-0 text-gray-700 dark:text-primary"
                aria-hidden
              />
              <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                Torre de controle
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setAjudaTorreAberta((v) => !v)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors dark:bg-muted dark:text-foreground ${ajudaTorreAberta ? 'ring-2 ring-primary/40' : ''}`}
              aria-expanded={ajudaTorreAberta}
              aria-label="Ajuda: tipo de documento"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 px-4 md:px-5">
            <TipoDocumentoSearch
              tipos={tiposDocumentoDisponiveis}
              value={tipoDocumento}
              onChange={setTipoDocumento}
              generousPadding
              deferKeyboardUntilTap
              onAdicionarTipoNovo={(t) =>
                setTiposDocumentoCustom((prev) => {
                  if (prev.includes(t)) return prev;
                  const next = [...prev, t];
                  saveTiposCustomAnexo(next);
                  return next;
                })
              }
            />
          </div>

          <div className="px-4 md:px-5">
            <input
              ref={inputArquivoManualRef}
              type="file"
              accept="*/*"
              onChange={handleSelecionarArquivoManual}
              className="hidden"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => inputArquivoManualRef.current?.click()}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium ${brandSurface.card}`}
              >
                <FolderOpen className="h-4 w-4" />
                Selecionar arquivo
              </button>
              <button
                type="button"
                onClick={handleColarDaAreaTransferencia}
                className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium ${brandSurface.card}`}
              >
                <Clipboard className="h-4 w-4" />
                Colar da área de transferência
              </button>
            </div>
            {(feedbackClipboard || modoAtalhoClipboard) && (
              <p className={`mt-2 text-xs ${brandSurface.textLabel}`}>
                {feedbackClipboard || 'Toque em "Colar da área de transferência" para continuar com o conteúdo copiado.'}
              </p>
            )}
          </div>

          {ajudaTorreAberta && (
            <div className={`mx-4 mt-3 rounded-2xl px-4 py-3 text-sm leading-snug md:mx-5 ${brandSurface.card}`}>
              <p className={brandSurface.textMuted}>
                Escolha o tipo que melhor descreve o arquivo. Use a busca para filtrar ou crie um tipo novo; ele fica salvo neste aparelho para as próximas vezes. Depois avance para escolher o destino no P38.
              </p>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3 md:px-5">
            <ArquivoPreview arquivo={arquivo} />
            <button
              type="button"
              onClick={() => setEtapa('opcoes')}
              disabled={!String(tipoDocumento || '').trim()}
              className="mt-auto flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-40 dark:bg-primary dark:text-primary-foreground md:mt-2"
            >
              Continuar para destinos
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 pb-2 pt-5 md:px-5">
            <button
              type="button"
              onClick={() => {
                if (etapa === 'opcoes') setEtapa('torre_controle');
                else window.history.back();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-muted dark:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Comprovante recebido</h1>
              {etapa === 'opcoes' && (
                <p className={`text-xs ${brandSurface.textLabel}`}>O que deseja fazer com este arquivo?</p>
              )}
            </div>
          </div>
        </>
      )}

      {etapa === 'opcoes' && (
        <div className="grid grid-cols-1 gap-2.5 px-4 md:grid-cols-2 md:gap-3 md:px-5">
          <div className="md:col-span-2">
            <ArquivoPreview arquivo={arquivo} />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-muted-foreground md:col-span-2 px-0.5">
            Destino no P38
          </p>
          <OpcaoCard icon={Link2} titulo="Lançamento financeiro" descricao="Conta a pagar / despesa existente" onClick={() => setEtapa('vincular')} />
          <OpcaoCard icon={ShoppingCart} titulo="Pedido de compra" descricao="Anexar ao processo de compras" onClick={() => setEtapa('vincular_pedido')} />
          <OpcaoCard
            icon={FileUp}
            titulo="Novo pedido (importar itens)"
            descricao="Criar pedido novo e abrir direto o importador de itens"
            onClick={async () => {
              try {
                if (arquivo?.file) {
                  await guardarArquivoParaPedidoImport(arquivo.file, arquivo.nome, arquivo.tipo);
                  void copiarArquivoParaClipboardOpcional(arquivo.file);
                }
              } catch (e) {
                console.warn('[Torre→Pedido] não foi possível guardar cópia do arquivo:', e);
              }
              window.location.href = `${createPageUrl('PedidoCompraDetalhe')}?id=novo&autoImportador=1`;
            }}
          />
          <OpcaoCard icon={Anchor} titulo="Viagem / frete fluvial" descricao="Evento logístico (itinerário)" onClick={() => setEtapa('vincular_evento')} />
          <OpcaoCard
            icon={Plus}
            titulo="Criar novo lançamento"
            descricao="Ler PDF com OCR (AGEFIN) e registrar a conta — mesmo fluxo do importar em Contas a pagar"
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