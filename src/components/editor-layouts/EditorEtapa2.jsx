import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditorBlocks from './EditorBlocks';
import PreviewBlocks from './PreviewBlocks';

const BLOCKS_PADRAO = {
  comprovante: [
    { id: 1, tipo: 'header', conteudo: 'COMPROVANTE DE VENDA' },
    { id: 2, tipo: 'texto', conteudo: 'Data: __/__/____  |  Nº: _____' },
    { id: 3, tipo: 'texto', conteudo: 'Cliente: ________________________' },
    { id: 4, tipo: 'texto', conteudo: 'Produtos vendidos' },
    { id: 5, tipo: 'texto', conteudo: 'Total: R$ ____,__' },
    { id: 6, tipo: 'footer', conteudo: 'Obrigado pela preferência!' },
  ],
  relatorio: [
    { id: 1, tipo: 'header', conteudo: 'RELATÓRIO' },
    { id: 2, tipo: 'texto', conteudo: 'Período: __/__/____ a __/__/____' },
    { id: 3, tipo: 'texto', conteudo: 'Resumo executivo' },
    { id: 4, tipo: 'texto', conteudo: 'Dados e análises' },
    { id: 5, tipo: 'footer', conteudo: 'Gerado em: ____' },
  ],
  manifesto: [
    { id: 1, tipo: 'header', conteudo: 'MANIFESTO DE CARGA' },
    { id: 2, tipo: 'texto', conteudo: 'Transportador: ________________________' },
    { id: 3, tipo: 'texto', conteudo: 'Itens transportados' },
    { id: 4, tipo: 'texto', conteudo: 'Data de saída: __/__/____' },
    { id: 5, tipo: 'footer', conteudo: 'Assinado em: __/__/____' },
  ],
};

export default function EditorEtapa2({ tipoDocumento, onBlocksChange, onProximo, onVoltar }) {
  const [blocksConfig, setBlocksConfig] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    carregarOuCriarBlocks();
  }, [tipoDocumento]);

  const carregarOuCriarBlocks = async () => {
    setIsLoading(true);
    try {
      // Se é documento existente
      if (tipoDocumento.id && !tipoDocumento.isNovo) {
        const config = tipoDocumento.blocks_config 
          ? JSON.parse(tipoDocumento.blocks_config)
          : BLOCKS_PADRAO[tipoDocumento.categoria] || BLOCKS_PADRAO.comprovante;
        setBlocksConfig(config);
      } else {
        // Se é novo documento, usar template padrão
        const config = BLOCKS_PADRAO[tipoDocumento.id] || BLOCKS_PADRAO.comprovante;
        setBlocksConfig(config);
      }
    } catch (error) {
      console.error('Erro ao carregar blocos:', error);
      setBlocksConfig(BLOCKS_PADRAO.comprovante);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalvarEtapa = () => {
    if (blocksConfig) {
      onBlocksChange(blocksConfig);
      onProximo();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Carregando editor...</p>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Preview: {tipoDocumento.nome}
          </h2>
          <button
            onClick={() => setShowPreview(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <EyeOff className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <PreviewBlocks blocks={blocksConfig} />
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Voltar para Edição
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Editar: {tipoDocumento.nome}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Arraste, adicione e customize os blocos
          </p>
        </div>
        <button
          onClick={() => setShowPreview(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          title="Visualizar preview"
        >
          <Eye className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        {blocksConfig && <EditorBlocks blocks={blocksConfig} onBlocksChange={setBlocksConfig} />}
      </div>

      {/* Footer com Botões */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onVoltar} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button onClick={handleSalvarEtapa} className="flex-1 flex items-center justify-center gap-2">
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}