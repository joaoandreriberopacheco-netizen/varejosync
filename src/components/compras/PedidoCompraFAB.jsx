import React, { useState } from 'react';
import { Save, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PedidoCompraFAB({ pedido, onSave, isSaving, isDisabled, empresa }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePrint = () => {
    // Será integrado com função de impressão/PDF no futuro
    console.log('Imprimir relatório:', pedido);
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {/* Menu expandido */}
      {isExpanded && (
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePrint}
            className="h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800 border-0"
            title="Visualizar/Imprimir"
          >
            <FileText className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800 border-0"
            title="Exportar"
          >
            <Download className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Botão principal (salvar) */}
      <Button
        onClick={() => {
          onSave();
          setIsExpanded(false);
        }}
        disabled={isDisabled || isSaving}
        size="icon"
        className="h-14 w-14 rounded-full bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 shadow-lg flex items-center justify-center text-white transition-all"
        title={isSaving ? 'Salvando...' : 'Salvar Pedido'}
      >
        <Save className="w-6 h-6" />
      </Button>

      {/* Botão para expandir menu */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800 border-0 text-gray-600 dark:text-gray-400"
          title="Mais opções"
        >
          <span className="text-lg font-bold">+</span>
        </Button>
      )}

      {/* Botão para fechar menu */}
      {isExpanded && (
        <Button
          onClick={() => setIsExpanded(false)}
          size="icon"
          variant="outline"
          className="h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800 border-0 text-gray-600 dark:text-gray-400"
          title="Fechar menu"
        >
          <span className="text-lg font-bold">×</span>
        </Button>
      )}
    </div>
  );
}