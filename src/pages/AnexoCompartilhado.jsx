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

  // Busca arquivo do cache 'VarejoSync-shared-files'
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
      console.log('PAGE: carregarArquivoDoCache - Arquivo carregado:', fileUrl);
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

  // Fallback: varre todo o cache em busca de arquivos
  const varrerCache = async () => {
    console.log('PAGE: varrerCache chamado');
    try {
      const cache = await caches.open('VarejoSync-shared-files');
      const keys = await cache.keys();
      if (keys.length === 0) {
        console.log('PAGE: varrerCache - Cache vazio');
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
          console.log('PAGE: varrerCache - Arquivo encontrado:', req.url);
          const url = typeof req === 'string' ? req : req.url;
          const fileName = url.split('/').pop().replace(/^\d+-/, '') || 'arquivo';
          const file = new File([blob], fileName, { type: blob.type });
          const previewUrl = URL.createObjectURL(blob);
          setArquivo({ file, previewUrl, nome: fileName, tipo: blob.type });
          return true;
        } else {
          await cache.delete(req);
        }
      }
      return false;
    } catch (e) {
      console.error('PAGE: Erro em varrerCache:', e);
      return false;
    }
  };

  useEffect(() => {
    const inicializar = async () => {
      setCarregando(true);
      const carregou = await varrerCache();
      if (carregou) {
        setEtapa('vincular');
      } else {
        setEtapa('opcoes');
      }
      setCarregando(false);
    };
    inicializar();
  }, []);

  const handleUpload = async () => {
    if (!arquivo) return;
    setUploadando(true);
    try {
      const formData = new FormData();
      formData.append('file', arquivo.file);
      formData.append('referencia_tipo', lancamentoVinculado?.referencia_tipo || 'Manual');
      formData.append('referencia_id', lancamentoVinculado?.id || '');
      formData.append('tipo_documento', 'Comprovante');
      formData.append('origem', 'compartilhamento_web');

      await base44.integrations.Core.UploadFile({ file: arquivo.file });
      setEtapa('sucesso');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploadando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-300" />
          <p className="text-gray-600 dark:text-gray-300">Carregando arquivo compartilhado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {etapa === 'opcoes' && (
          <div className="space-y-6 mt-8">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Compartilhamento de Arquivo</h1>
              <p className="text-gray-600 dark:text-gray-400">Nenhum arquivo foi detectado no compartilhamento</p>
            </div>
          </div>
        )}

        {etapa === 'vincular' && arquivo && (
          <div className="space-y-6 mt-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Anexar Arquivo</h1>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4">
                  <File className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{arquivo.nome}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(arquivo.file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Vincular a qual lançamento?
                  </label>
                  <BuscarLancamentoSheet onSelect={setLancamentoVinculado} />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploadando}
                    className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded font-medium disabled:opacity-50"
                  >
                    {uploadando ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <CheckCircle2 className="w-4 h-4 inline mr-2" />}
                    Confirmar Anexo
                  </button>
                  <button
                    onClick={() => setEtapa('opcoes')}
                    className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-2.5 rounded font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {etapa === 'sucesso' && (
          <div className="text-center mt-8">
            <div className="bg-green-50 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Arquivo Anexado com Sucesso!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">O arquivo foi vinculado ao lançamento financeiro</p>
            <a href={createPageUrl('Dashboard')} className="inline-block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded font-medium">
              Voltar ao Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}