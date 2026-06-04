import React from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DesignerToolbar({ templateNome, onNomeChange, onSalvar, salvando, layout, onLayoutChange, onVoltar, documentoInfo }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border/40 flex-shrink-0 flex-wrap">
      {/* Voltar */}
      {onVoltar && (
        <button
          onClick={onVoltar}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200 mr-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Documentos
        </button>
      )}

      <div className="w-px h-5 bg-muted" />

      {/* Ícone + nome do documento */}
      {documentoInfo && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{documentoInfo.icone}</span>
          <span className="font-medium text-foreground/90">{documentoInfo.nome}</span>
        </span>
      )}

      <div className="w-px h-5 bg-muted" />

      <div className="w-px h-5 bg-muted" />

      {/* Nome do template */}
      <Input
        value={templateNome}
        onChange={(e) => onNomeChange(e.target.value)}
        className="h-7 text-xs w-44 border-border/40"
        placeholder="Nome do template"
      />

      <div className="w-px h-5 bg-muted" />

      {/* Largura do documento */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Largura:</span>
        <select
          className="h-7 text-xs border border-border/40 rounded px-2 bg-card text-foreground/90"
          value={layout.largura}
          onChange={(e) => onLayoutChange({ ...layout, largura: Number(e.target.value) })}
        >
          <option value={302}>80mm (Cupom)</option>
          <option value={595}>A4 (210mm)</option>
          <option value={480}>Carta Meia A4</option>
        </select>
      </div>

      <div className="w-px h-5 bg-muted" />

      {/* Botão Salvar */}
      <Button
        onClick={onSalvar}
        disabled={salvando}
        size="sm"
        className="h-7 text-xs bg-gray-900 dark:bg-gray-100 dark:text-foreground text-white gap-1 px-3"
      >
        <Save className="w-3.5 h-3.5" />
        {salvando ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  );
}