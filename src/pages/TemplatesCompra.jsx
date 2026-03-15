import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function TemplatesCompra() {
  const [activeTab, setActiveTab] = useState('download'); // 'download' ou 'import'
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Download Template
  const handleDownloadTemplate = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const axiosResponse = await base44.functions.invoke('gerarTemplatePedidoCompra', {});
      const responseData = axiosResponse.data || axiosResponse;
      
      // Decodificar Base64 para Uint8Array
      const binaryString = atob(responseData.file_content);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = responseData.filename || 'template_pedido_compra.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage({ type: 'success', text: 'Template baixado com sucesso!' });
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar template. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Import Template
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Apenas arquivos Excel (.xlsx, .xls) são permitidos.' });
      return;
    }

    setIsImporting(true);
    setMessage(null);

    try {
      // Upload do arquivo para o servidor
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/functions/importarTemplatePedidoCompra', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || 'Erro ao importar template');
      }

      const result = await uploadResponse.json();
      setMessage({ 
        type: 'success', 
        text: `Importado com sucesso! ${result.created} pedidos criados, ${result.updated} atualizados.` 
      });
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erro ao importar template. Verifique o arquivo.' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-20">
      {/* Header */}
      <div className="pb-3 mb-2">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Templates de Pedidos</p>
        <p className="text-xs text-gray-400">Baixe ou importe templates Excel para gerenciar pedidos</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            message.type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('download')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'download'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-600 dark:text-gray-400 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Baixar Template</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'import'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-600 dark:text-gray-400 border-b-2 border-transparent'
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Importar Template</span>
          </div>
        </button>
      </div>

      {/* Download Tab */}
      {activeTab === 'download' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Template Excel</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Baixe o template padrão para criar novos pedidos de compra em lote
                </p>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                disabled={isGenerating}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                {isGenerating ? 'Gerando...' : 'Baixar Template'}
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">Como usar:</h4>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Baixe o template acima</li>
              <li>Abra o arquivo no Excel ou Google Sheets</li>
              <li>Preencha os dados conforme necessário</li>
              <li>Salve o arquivo</li>
              <li>Importe o arquivo na aba "Importar Template"</li>
            </ol>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-700'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Upload className="w-7 h-7 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Arraste o arquivo aqui
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ou clique para selecionar
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isImporting}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input">
                <Button
                  as="span"
                  disabled={isImporting}
                  className="cursor-pointer bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  {isImporting ? 'Importando...' : 'Selecionar Arquivo'}
                </Button>
              </label>
              <p className="text-xs text-gray-500">Apenas arquivos .xlsx ou .xls</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">Informações:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside">
              <li>O arquivo deve estar no formato Excel (.xlsx ou .xls)</li>
              <li>Use o template padrão como referência</li>
              <li>Todos os campos obrigatórios devem ser preenchidos</li>
              <li>Os pedidos serão criados ou atualizados automaticamente</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}