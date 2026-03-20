import React from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DesignerToolbar({ templateNome, onNomeChange, onSalvar, salvando, layout, onLayoutChange, onVoltar, documentoInfo }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 flex-wrap">
      {/* Voltar */}
      {onVoltar && (
        <button
          onClick={onVoltar}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Documentos
        </button>
      )}

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* Ícone + nome do documento */}
      {documentoInfo && (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <span>{documentoInfo.icone}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{documentoInfo.nome}</span>
        </span>
      )}

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* Nome do template */}
      <Input
        value={templateNome}
        onChange={(e) => onNomeChange(e.target.value)}
        className="h-7 text-xs w-44 border-gray-200 dark:border-gray-700"
        placeholder="Nome do template"
      />

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* Largura do documento */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Largura:</span>
        <select
          className="h-7 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          value={layout.largura}
          onChange={(e) => onLayoutChange({ ...layout, largura: Number(e.target.value) })}
        >
          <option value={302}>80mm (Cupom)</option>
          <option value={595}>A4 (210mm)</option>
          <option value={480}>Carta Meia A4</option>
        </select>
      </div>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

      {/* Botão Salvar */}
      <Button
        onClick={onSalvar}
        disabled={salvando}
        size="sm"
        className="h-7 text-xs bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white gap-1 px-3"
      >
        <Save className="w-3.5 h-3.5" />
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}