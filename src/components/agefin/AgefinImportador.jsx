import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { dataHoje } from '@/components/utils/dateUtils';
import { Upload, X, FileCheck, AlertCircle, ChevronRight, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const resetState = () => {
    setFile(null);
    setExtractedData(null);
    setSelectedNatureza(null);
    setError(null);
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
      resetState();
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
      <div className="space-y-5 px-5 pb-5 pt-2">
        <div className="rounded-[28px] bg-white/95 p-5 shadow-sm dark:bg-gray-800">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-400">Importar conta</p>
              <h2 className="mt-2 font-glacial text-2xl font-semibold text-gray-900 dark:text-white">Leitura automática</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Envie boleto, guia, DAR, PDF ou imagem para pré-preencher a conta.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
              <Sparkles className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
          </div>

          <label className="block cursor-pointer">
            <div className="rounded-[24px] bg-gray-100 px-5 py-7 text-center shadow-sm transition-all hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-950">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-800">
                <Upload className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{file ? file.name : 'Selecionar documento'}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PDF, boleto escaneado ou imagem nítida</p>
            </div>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              accept="image/*,.pdf"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Formato</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                <FileText className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">PDF ou imagem</p>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Resultado</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Pré-cadastro</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl border-2 border-gray-300 border-t-gray-600 animate-spin dark:border-gray-600 dark:border-t-gray-200" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Lendo documento</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Analisando campos principais para contas a pagar.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
            <div className="flex items-start gap-3 text-left">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-5 pb-5 pt-2">
      <div className="rounded-[28px] bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
            <FileCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-white">Documento lido com sucesso</p>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{file?.name}</p>
          </div>
          <button
            onClick={resetState}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Pré-preenchimento</p>
            <h3 className="mt-2 font-glacial text-xl font-semibold text-gray-900 dark:text-white">Revisar dados</h3>
          </div>
          <span className="rounded-2xl bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">PDV style</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <input
              type="text"
              value={extractedData.descricao}
              onChange={(e) => setExtractedData({ ...extractedData, descricao: e.target.value })}
              className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-base text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
              <input
                type="number"
                value={extractedData.valor}
                onChange={(e) => setExtractedData({ ...extractedData, valor: parseFloat(e.target.value) })}
                className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-lg font-semibold text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                step="0.01"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
              <input
                type="date"
                value={extractedData.data_vencimento}
                onChange={(e) => setExtractedData({ ...extractedData, data_vencimento: e.target.value })}
                className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-base text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-5 shadow-sm dark:bg-gray-800">
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Qual é a natureza desta conta?</label>
        <AgefinNaturezaSelector value={selectedNatureza} onChange={setSelectedNatureza} />
      </div>

      {error && (
        <div className="rounded-3xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button
          variant="outline"
          onClick={resetState}
          className="h-14 rounded-2xl border-0 bg-[#2e2629] text-base font-semibold text-white hover:bg-[#362d31] dark:bg-[#2e2629] dark:text-white"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || !selectedNatureza}
          className="h-14 rounded-2xl bg-gray-300 text-base font-semibold text-gray-900 hover:bg-gray-400 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
        >
          {loading ? 'Salvando...' : 'Salvar Conta'}
        </Button>
      </div>
    </div>
  );
}