import React, { useState } from 'react';
import { GripVertical, Trash2, Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BLOCK_TYPES = {
  header: { label: 'Cabeçalho', icon: '📋' },
  company: { label: 'Empresa', icon: '🏢' },
  pedido: { label: 'Dados Pedido', icon: '📄' },
  itens: { label: 'Itens', icon: '📦' },
  totals: { label: 'Totais', icon: '💰' },
  pagamento: { label: 'Pagamento', icon: '💳' },
  footer: { label: 'Rodapé', icon: '📝' }
};

export default function TemplateBlockEditor({ blocks, onBlocksChange, previewData }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      config: {
        fontSize: 12,
        align: 'left',
        marginTop: 8,
        marginBottom: 8,
        fontFamily: 'monospace',
        fontWeight: 'normal'
      }
    };
    onBlocksChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const deleteBlock = (id) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
    setSelectedBlockId(null);
  };

  const updateBlockConfig = (id, config) => {
    onBlocksChange(
      blocks.map(b => b.id === id ? { ...b, config: { ...b.config, ...config } } : b)
    );
  };

  const moveBlock = (id, direction) => {
    const idx = blocks.findIndex(b => b.id === id);
    if ((direction === 'up' && idx > 0) || (direction === 'down' && idx < blocks.length - 1)) {
      const newBlocks = [...blocks];
      const moveIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[moveIdx]] = [newBlocks[moveIdx], newBlocks[idx]];
      onBlocksChange(newBlocks);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen lg:h-auto overflow-hidden">
      {/* Painel Blocos */}
      <div className="lg:col-span-1 flex flex-col p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Blocos</h3>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(BLOCK_TYPES).map(([type, info]) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="p-2 text-xs rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <div className="text-lg mb-1">{info.icon}</div>
              <div className="text-gray-700 dark:text-gray-300">{info.label}</div>
            </button>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Estrutura</h4>
          <div className="space-y-1">
            {blocks.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum bloco adicionado</p>
            ) : (
              blocks.map((block, idx) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-2 rounded cursor-move flex items-center justify-between text-xs transition ${
                    selectedBlockId === block.id
                      ? 'bg-blue-100 dark:bg-blue-900 border border-blue-400'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="w-3 h-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{BLOCK_TYPES[block.type].label}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlock(block.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Painel Configuração */}
      <div className="lg:col-span-1 flex flex-col p-4 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        {selectedBlock ? (
          <>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              {BLOCK_TYPES[selectedBlock.type].label}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Fonte</label>
                <select
                  value={selectedBlock.config.fontFamily}
                  onChange={(e) => updateBlockConfig(selectedBlock.id, { fontFamily: e.target.value })}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <option value="monospace">Monospace</option>
                  <option value="sans-serif">Sans-Serif</option>
                  <option value="serif">Serif</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Tamanho: {selectedBlock.config.fontSize}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={selectedBlock.config.fontSize}
                  onChange={(e) => updateBlockConfig(selectedBlock.id, { fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Alinhamento</label>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map(align => (
                    <button
                      key={align}
                      onClick={() => updateBlockConfig(selectedBlock.id, { align })}
                      className={`px-2 py-1 text-xs rounded border transition ${
                        selectedBlock.config.align === align
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Peso</label>
                <div className="grid grid-cols-2 gap-1">
                  {['normal', 'bold'].map(weight => (
                    <button
                      key={weight}
                      onClick={() => updateBlockConfig(selectedBlock.id, { fontWeight: weight })}
                      className={`px-2 py-1 text-xs rounded border transition ${
                        selectedBlock.config.fontWeight === weight
                          ? 'bg-blue-500 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {weight === 'bold' ? 'Bold' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Margem Superior</label>
                <Input
                  type="number"
                  min="0"
                  max="32"
                  value={selectedBlock.config.marginTop}
                  onChange={(e) => updateBlockConfig(selectedBlock.id, { marginTop: parseInt(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Margem Inferior</label>
                <Input
                  type="number"
                  min="0"
                  max="32"
                  value={selectedBlock.config.marginBottom}
                  onChange={(e) => updateBlockConfig(selectedBlock.id, { marginBottom: parseInt(e.target.value) })}
                  className="text-xs"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-400 text-center py-8">Selecione um bloco para configurar</p>
        )}
      </div>

      {/* Preview */}
      <div className="lg:col-span-1 flex flex-col p-4 bg-gray-100 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pré-visualização</h3>
        <div className="flex-1 p-4 bg-white dark:bg-gray-900 rounded overflow-auto">
          {blocks.map(block => {
            const style = {
              fontFamily: block.config.fontFamily,
              fontSize: `${block.config.fontSize}px`,
              textAlign: block.config.align,
              fontWeight: block.config.fontWeight,
              marginTop: `${block.config.marginTop}px`,
              marginBottom: `${block.config.marginBottom}px`,
              lineHeight: '1.4'
            };

            let content = '';
            switch (block.type) {
              case 'header':
                content = 'CABEÇALHO DO COMPROVANTE';
                break;
              case 'company':
                content = 'EMPRESA LTDA\nAV. PRINCIPAL, 123\nCEP: 00.000-000';
                break;
              case 'pedido':
                content = 'PEDIDO #000001\nDATA: 19/03/2026\nCLIENTE: JOÃO SILVA';
                break;
              case 'itens':
                content = 'ITEM         QTD  PREÇO      TOTAL\n───────────────────────────\n1. PRODUTO   1    99.99      99.99';
                break;
              case 'totals':
                content = 'SUBTOTAL:           R$ 99.99\nTOTAL:              R$ 99.99';
                break;
              case 'pagamento':
                content = 'DINHEIRO: R$ 99.99\n───────────────────────────';
                break;
              case 'footer':
                content = 'Obrigado pela sua compra!';
                break;
            }

            return (
              <div
                key={block.id}
                style={style}
                className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}