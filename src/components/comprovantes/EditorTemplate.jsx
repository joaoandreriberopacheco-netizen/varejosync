import React, { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditorTemplate({ templateData, onSave, onCancel }) {
  const [htmlContent, setHtmlContent] = useState(templateData?.html_content || '');
  const [cssContent, setCssContent] = useState(templateData?.css_content || '');
  const [nome, setNome] = useState(templateData?.nome || '');
  const [tipo, setTipo] = useState(templateData?.tipo || 'venda');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopyPlaceholders = () => {
    const placeholders = `{{pedido.numero}}
{{pedido.data}}
{{cliente.nome}}
{{itens}}
{{subtotal}}
{{total}}
{{forma_pagamento}}`;
    navigator.clipboard.writeText(placeholders);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        nome,
        tipo,
        html_content: htmlContent,
        css_content: cssContent
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-screen lg:h-auto overflow-hidden">
      {/* Painel Editor */}
      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Cupom Venda Padrão"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value="venda">Venda</option>
              <option value="compra">Compra</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">HTML</label>
            <button
              onClick={handleCopyPlaceholders}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Placeholders'}
            </button>
          </div>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="flex-1 p-3 font-mono text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 resize-none"
            spellCheck="false"
            placeholder="<div class='receipt'>...</div>"
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">CSS</label>
          <textarea
            value={cssContent}
            onChange={(e) => setCssContent(e.target.value)}
            className="flex-1 p-3 font-mono text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 resize-none"
            spellCheck="false"
            placeholder=".receipt { font-size: 12px; ... }"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline" className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="hidden lg:flex flex-col p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Pré-visualização</label>
        <div
          className="flex-1 p-4 bg-white dark:bg-gray-900 rounded text-gray-900 dark:text-gray-100 overflow-auto font-mono text-xs leading-relaxed"
          style={{ fontFamily: 'monospace' }}
          dangerouslySetInnerHTML={{
            __html: `<style>${cssContent}</style>${htmlContent}`
          }}
        />
      </div>
    </div>
  );
}