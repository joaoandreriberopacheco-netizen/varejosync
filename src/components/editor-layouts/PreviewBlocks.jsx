import React from 'react';

const LOREM_IPSUM = {
  header: 'EMPRESA LTDA - CNPJ: 12.345.678/0001-90',
  texto: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  footer: 'Desenvolvido por Base44 | Data: 19/03/2026 | Página 1'
};

export default function PreviewBlocks({ blocks }) {
  return (
    <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700">
      {blocks.map((block) => {
        const loremContent = LOREM_IPSUM[block.tipo] || block.conteudo;
        
        if (block.tipo === 'header') {
          return (
            <div key={block.id} className="border-b-2 border-gray-900 dark:border-white pb-3 mb-4 text-center">
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                {loremContent}
              </p>
            </div>
          );
        }

        if (block.tipo === 'footer') {
          return (
            <div key={block.id} className="border-t border-gray-400 dark:border-gray-500 pt-3 mt-6 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {loremContent}
              </p>
            </div>
          );
        }

        return (
          <div key={block.id} className="mb-3">
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
              {loremContent}
            </p>
          </div>
        );
      })}
    </div>
  );
}