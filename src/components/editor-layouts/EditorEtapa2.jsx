import React, { useState } from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditorBlocks from './EditorBlocks';
import PreviewBlocks from './PreviewBlocks';

export default function EditorEtapa2({ tipoDocumento, onBlocksChange, onProximo, onVoltar }) {
  const [blocksConfig, setBlocksConfig] = useState([
    { id: 1, tipo: 'header', conteudo: 'Cabeçalho do Documento' },
    { id: 2, tipo: 'texto', conteudo: 'Conteúdo principal' },
    { id: 3, tipo: 'footer', conteudo: 'Rodapé' },
  ]);
  const [showPreview, setShowPreview] = useState(false);

  const handleSalvarEtapa = () => {
    onBlocksChange(blocksConfig);
    onProximo();
  };

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
            Arraste, adicione e customizse os blocos
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
        <EditorBlocks blocks={blocksConfig} onBlocksChange={setBlocksConfig} />
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