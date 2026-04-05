import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { dataHoje } from '@/components/utils/dateUtils';
import { Upload, X, FileCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AgefinNaturezaSelector from './AgefinNaturezaSelector';

export default function AgefinImportador({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedNatureza, setSelectedNatureza] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      setFile(selectedFile);

      const extracted = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        file_urls: [file_url],
        prompt: `Extraia os dados principais deste documento brasileiro de cobrança com OCR visual de alta precisão. Priorize boletos, faturas de energia, água, internet, DAR, carnês e contas similares.

Regras:
- Leia o conteúdo visual do arquivo com máxima precisão.
- Identifique o beneficiário/emissor principal.
- Identifique a descrição mais útil para uso financeiro humano.
- Extraia o valor final do documento a pagar.
- Extraia a data de vencimento real.
- Se houver múltiplas datas, use a data explicitamente ligada a vencimento.
- Se houver múltiplos valores, use o valor final do documento/cobrança.
- Se não tiver certeza absoluta em algum campo, retorne null nesse campo em vez de inventar.
- Para descrição, prefira algo como "Energia - Amazonas Energia" ou "Boleto - Nome do Beneficiário".
- Retorne a data sempre em formato YYYY-MM-DD.
- Retorne o valor como número decimal, sem símbolo monetário.
- Retorne também um resumo_texto curto com os trechos mais relevantes encontrados no documento.`,
        response_json_schema: {
          type: 'object',
          properties: {
            descricao: { type: ['string', 'null'] },
            valor: { type: ['number', 'null'] },
            data_vencimento: { type: ['string', 'null'] },
            fornecedor: { type: ['string', 'null'] },
            documento_tipo: { type: ['string', 'null'] },
            resumo_texto: { type: ['string', 'null'] }
          },
          required: ['descricao', 'valor', 'data_vencimento', 'fornecedor', 'documento_tipo', 'resumo_texto']
        }
      });

      setExtractedData({
        descricao: extracted.descricao || (extracted.fornecedor ? `${extracted.documento_tipo || 'Conta'} - ${extracted.fornecedor}` : selectedFile.name.replace(/\.[^/.]+$/, '')),
        valor: extracted.valor ?? 0,
        data_vencimento: extracted.data_vencimento || dataHoje(),
      });
    } catch (err) {
      setError('Não consegui ler este documento com precisão. Tente outra imagem ou PDF mais nítido.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!extractedData || !selectedNatureza) return;

    setLoading(true);
    try {
      await base44.entities.ContaPrevista.create({
        ...extractedData,
        natureza: selectedNatureza,
        status: 'Pendente',
      });
      setFile(null);
      setExtractedData(null);
      setSelectedNatureza(null);
      setError(null);
      onSuccess?.();
    } catch (err) {
      setError('Erro ao salvar conta');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!extractedData) {
    return (
      <div className="p-6 text-center">
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-3xl p-8 hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-blue-500 dark:text-blue-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white mb-1">
              {file ? file.name : 'Selecione um documento'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Boleto, NF, DAR, Carnê ou imagem
            </p>
          </div>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
            accept="image/*,.pdf"
          />
        </label>
        {loading && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Lendo documento com OCR avançado…</p>
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Preview */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-green-900 dark:text-green-100">Documento lido com sucesso</p>
          <p className="text-sm text-green-700 dark:text-green-200 mt-1">{file?.name}</p>
        </div>
        <button
          onClick={() => {
            setFile(null);
            setExtractedData(null);
            setSelectedNatureza(null);
          }}
          className="text-green-600 hover:text-green-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Extracted Data Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={extractedData.descricao}
            onChange={(e) => setExtractedData({ ...extractedData, descricao: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor
            </label>
            <input
              type="number"
              value={extractedData.valor}
              onChange={(e) => setExtractedData({ ...extractedData, valor: parseFloat(e.target.value) })}
              className="w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vencimento
            </label>
            <input
              type="date"
              value={extractedData.data_vencimento}
              onChange={(e) => setExtractedData({ ...extractedData, data_vencimento: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Natureza Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Qual é a natureza desta conta?
        </label>
        <AgefinNaturezaSelector value={selectedNatureza} onChange={setSelectedNatureza} />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setExtractedData(null);
            setSelectedNatureza(null);
          }}
          className="flex-1 rounded-2xl h-12"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || !selectedNatureza}
          className="flex-1 rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
        >
          {loading ? 'Salvando...' : 'Salvar Conta'}
        </Button>
      </div>
    </div>
  );
}