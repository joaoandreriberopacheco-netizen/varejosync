import React from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditorBlocks({ blocks, onBlocksChange }) {
  const handleRemove = (id) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
  };

  const handleUpdateConteudo = (id, conteudo) => {
    onBlocksChange(blocks.map(b => 
      b.id === id ? { ...b, conteudo } : b
    ));
  };

  const handleAddBlock = (tipo) => {
    const newId = Math.max(...blocks.map(b => b.id), 0) + 1;
    onBlocksChange([...blocks, {
      id: newId,
      tipo,
      conteudo: `Novo bloco ${tipo}`
    }]);
  };

  return (
    <div className="space-y-3 max-w-2xl">
      {/* Botões de Adicionar */}
      <div className="flex gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddBlock('header')}
          className="flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Cabeçalho
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddBlock('texto')}
          className="flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Texto
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddBlock('footer')}
          className="flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Rodapé
        </Button>
      </div>

      {/* Lista de Blocos */}
      {blocks.map((block) => (
        <div
          key={block.id}
          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition"
        >
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              {block.tipo.charAt(0).toUpperCase() + block.tipo.slice(1)}
            </div>
            <Input
              value={block.conteudo}
              onChange={(e) => handleUpdateConteudo(block.id, e.target.value)}
              className="text-sm"
              placeholder="Conteúdo do bloco"
            />
          </div>

          <button
            onClick={() => handleRemove(block.id)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}