import React, { useState } from 'react';
import { Plus, FileText, X, Download } from 'lucide-react';

export default function ActionMenuCompras({ onNovopedido, onImportarNF, onDownloadTemplate }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-40">
      {/* Menu expandido */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Novo Pedido */}
          <button
            onClick={() => {
              onNovopedido();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow group"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Novo Pedido</span>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
              <Plus className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </div>
          </button>

          {/* Importar NF */}
          <button
            onClick={() => {
              onImportarNF();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow group"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Importar NF</span>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
              <FileText className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </div>
          </button>

          {/* Download Template */}
          <button
            onClick={() => {
              onDownloadTemplate();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow group"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Template Excel</span>
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
              <Download className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </div>
          </button>
        </div>
      )}

      {/* Botão principal FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl ${
          isOpen
            ? 'bg-gray-800 dark:bg-gray-200 rotate-45'
            : 'bg-gray-800 dark:bg-gray-200'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white dark:text-gray-900" />
        ) : (
          <Plus className="w-6 h-6 text-white dark:text-gray-900" />
        )}
      </button>
    </div>
  );
}