import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, File, Link2, Plus, Loader2, CheckCircle2, X, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import BuscarLancamentoSheet from '@/components/anexos/BuscarLancamentoSheet';
import NovoLancamentoDialog from '@/components/financeiro/NovoLancamentoDialog';

export default function AnexoCompartilhado() {
  const [arquivo, setArquivo] = useState(null); // { file: File, previewUrl: string }
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState('opcoes'); // 'opcoes' | 'vincular' | 'novo' | 'sucesso'
  const [uploadando, setUploadando] = useState(false);
  const [lancamentoVinculado, setLancamentoVinculado] = useState(null);
  const [abrirNovo, setAbrirNovo] = useState(false);
  const [lancamentoCriadoId, setLancamentoCriadoId] = useState(null);

  // Tenta capturar o arquivo compartilhado (via Cache Storage, colocado pelo Service Worker)
  useEffect(() => {
    const carregarArquivo = async () => {
      setCarregando(true);

      // Tentativa 1: arquivo salvo pelo Service Worker no Cache Storage
      try {
        const cache = await caches.open('share-target-data');
        const cachedResponse = await cache.match('/_shared_file_payload');
        if (cachedResponse) {
          const parsed = await cachedResponse.json();
          await cache.delete('/_shared_file_payload'); // limpa após ler
          const byteString = atob(parsed.base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: parsed.type });
          const file = new File([blob], parsed.name, { type: parsed.type });
          const previewUrl = URL.createObjectURL(blob);
          setArquivo({ file, previewUrl, nome: parsed.name, tipo: parsed.type });
          setCarregando(false);
          return;
        }
      } catch {}

      // Tentativa 2: parâmetro de URL (texto/link compartilhado)
      const params = new URLSearchParams(window.location.search);
      const title = params.get('title') || params.get('name');
      if (title) {
        setArquivo({ file: null, previewUrl: null, nome: title, tipo: 'text/plain', texto: params.get('text') || params.get('url') });
        setCarregando(false);
        return;
      }

      setCarregando(false);
    };

    carregarArquivo();
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
      setLancamentoCriadoId(lancamento.id);
    } finally {
      setUploadando(false);
      setAbrirNovo(false);
      setEtapa('sucesso');
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
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
            <p className="text-xs text-center text-gray-400 mt-4 px-4">
              Nenhum arquivo detectado. Você foi redirecionado por um compartilhamento de texto.
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
        <p className="text-sm text-gray-400">Nenhum arquivo</p>
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
              ? <FileText className="w-7 h-7 text-gray-500 dark:text-gray-400" />
              : isImage
                ? <ImageIcon className="w-7 h-7 text-gray-500 dark:text-gray-400" />
                : <File className="w-7 h-7 text-gray-500 dark:text-gray-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{arquivo.nome}</p>
            <p className="text-xs text-gray-400 mt-0.5 uppercase">{isPdf ? 'PDF' : isImage ? 'Imagem' : 'Arquivo'}</p>
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