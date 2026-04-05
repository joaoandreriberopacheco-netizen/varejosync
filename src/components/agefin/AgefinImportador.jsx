import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { dataHoje } from '@/components/utils/dateUtils';
import { Upload, X, FileCheck, AlertCircle, ChevronRight, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AgefinNaturezaSelector from './AgefinNaturezaSelector';

export default function AgefinImportador({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedNatureza, setSelectedNatureza] = useState('Único');
  const [selectedRecorrencia, setSelectedRecorrencia] = useState('Mensal');
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
        file_urls: [file_url],
        prompt: `Leia visualmente este documento brasileiro de cobrança e extraia dados REAIS do conteúdo do documento, nunca do nome do arquivo.

Regras obrigatórias:
- Ignore completamente o nome do arquivo.
- Leia o PDF/imagem como OCR visual completo.
- Extraia apenas o que estiver claramente visível no documento.
- Se um campo não existir, retorne null.
- Não invente valores.
- Se houver vários valores, use o valor final a pagar, valor total do documento ou valor do boleto.
- Se houver várias datas, use a data explicitamente associada a vencimento.
- A descrição deve ser útil para um lançamento financeiro humano.
- A descrição deve preferir o conceito do pagamento + beneficiário, por exemplo: "Energia elétrica - Amazonas Energia", "FGTS Digital - Ministério do Trabalho", "DAR IPVA - SEFAZ AM", "Taxa ambiental - IBAMA".
- Identifique também a natureza sugerida: use "Único" por padrão; use "Parcelado" apenas quando houver parcela explícita; use "Recorrente" apenas quando o documento indicar cobrança mensal/competência recorrente e isso estiver claro.
- Retorne data em YYYY-MM-DD.
- Retorne valor como número decimal sem símbolo monetário.

Campos a interpretar do documento:
- beneficiario
- data_vencimento
- valor_pagamento
- competencia
- numero_parcela
- descricao
- natureza_sugerida
- confianca_leitura: alta, media ou baixa`,
        response_json_schema: {
          type: 'object',
          properties: {
            descricao: { type: ['string', 'null'] },
            valor_pagamento: { type: ['number', 'null'] },
            data_vencimento: { type: ['string', 'null'] },
            beneficiario: { type: ['string', 'null'] },
            competencia: { type: ['string', 'null'] },
            numero_parcela: { type: ['string', 'null'] },
            linha_digitavel: { type: ['string', 'null'] },
            codigo_pix_copia_cola: { type: ['string', 'null'] },
            instrucoes: { type: ['string', 'null'] },
            frequencia_sugerida: { type: ['string', 'null'] },
            natureza_sugerida: { type: ['string', 'null'] },
            confianca_leitura: { type: ['string', 'null'] }
          },
          required: ['descricao', 'valor_pagamento', 'data_vencimento', 'beneficiario', 'competencia', 'numero_parcela', 'linha_digitavel', 'codigo_pix_copia_cola', 'instrucoes', 'frequencia_sugerida', 'natureza_sugerida', 'confianca_leitura']
        }
      });

      const descricaoFallback = [extracted.descricao, extracted.beneficiario].filter(Boolean).join(' - ');
      const naturezaValida = ['Parcelado', 'Único', 'Recorrente'].includes(extracted.natureza_sugerida)
        ? extracted.natureza_sugerida
        : 'Único';
      const frequenciaValida = ['Semanal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'].includes(extracted.frequencia_sugerida)
        ? extracted.frequencia_sugerida
        : 'Mensal';
      const numeroParcela = extracted.numero_parcela ? parseInt(String(extracted.numero_parcela).replace(/[^0-9]/g, ''), 10) : null;
      const periodoReferencia = extracted.competencia && /^\d{4}-\d{2}-\d{2}$/.test(extracted.competencia)
        ? extracted.competencia
        : extracted.competencia && /^\d{2}\/\d{4}$/.test(extracted.competencia)
          ? `${extracted.competencia.split('/')[1]}-${extracted.competencia.split('/')[0]}-01`
          : extracted.competencia && /^\d{2}\/\d{2}\/\d{4}$/.test(extracted.competencia)
            ? `${extracted.competencia.split('/')[2]}-${extracted.competencia.split('/')[1]}-01`
            : null;

      setSelectedNatureza(naturezaValida);
      setSelectedRecorrencia(frequenciaValida);
      setExtractedData({
        descricao: descricaoFallback || 'Conta importada',
        valor: extracted.valor_pagamento ?? 0,
        data_vencimento: extracted.data_vencimento || dataHoje(),
        terceiro_nome: extracted.beneficiario || '',
        periodo_referencia: periodoReferencia || dataHoje().slice(0, 8) + '01',
        parcela_numero: Number.isFinite(numeroParcela) ? numeroParcela : '',
        linha_digitavel: extracted.linha_digitavel || '',
        codigo_pix_copia_cola: extracted.codigo_pix_copia_cola || '',
        observacoes: extracted.instrucoes || '',
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
    setSelectedNatureza('Único');
    setSelectedRecorrencia('Mensal');
    setError(null);
  };

  const handleConfirm = async () => {
    if (!extractedData || !selectedNatureza) return;

    setLoading(true);
    try {
      const payload = {
        tipo: 'Despesa',
        descricao: extractedData.descricao,
        terceiro_id: 'importado-manualmente',
        terceiro_nome: extractedData.terceiro_nome || 'Beneficiário não identificado',
        categoria_financeira_id: 'importacao-pendente',
        categoria_nome: 'Importação pendente',
        categoria: 'Importação pendente',
        valor: extractedData.valor,
        data_vencimento: extractedData.data_vencimento,
        natureza: selectedNatureza,
        parcela_numero: selectedNatureza === 'Parcelado' && extractedData.parcela_numero ? Number(extractedData.parcela_numero) : null,
        periodo_referencia: extractedData.periodo_referencia || null,
        status: 'Em Aberto',
        status_conciliacao: 'N/A',
        boleto_url: file?.name || null,
        referencia_tipo: 'Manual',
        observacoes: [
          extractedData.observacoes ? `Instruções: ${extractedData.observacoes}` : null,
          extractedData.linha_digitavel ? `Linha digitável: ${extractedData.linha_digitavel}` : null,
          extractedData.codigo_pix_copia_cola ? `PIX copia e cola: ${extractedData.codigo_pix_copia_cola}` : null,
          selectedNatureza === 'Recorrente' ? `Frequência sugerida: ${selectedRecorrencia}` : null,
        ].filter(Boolean).join('\n'),
      };

      const contaCriada = await base44.entities.ContaPrevista.create(payload);
      resetState();
      onSuccess?.(contaCriada);
    } catch (err) {
      setError('Erro ao salvar conta');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!extractedData) {
    return (
      <div className="h-full overflow-y-auto space-y-5 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2">
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-y-contain px-5 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-2 touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]">
        <div className="space-y-5">
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
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Beneficiário</label>
                  <input
                    type="text"
                    value={extractedData.terceiro_nome}
                    onChange={(e) => setExtractedData({ ...extractedData, terceiro_nome: e.target.value })}
                    className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-base text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Competência</label>
                  <input
                    type="date"
                    value={extractedData.periodo_referencia}
                    onChange={(e) => setExtractedData({ ...extractedData, periodo_referencia: e.target.value })}
                    className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-base text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor</label>
                  <input
                    type="number"
                    value={extractedData.valor}
                    onChange={(e) => setExtractedData({ ...extractedData, valor: parseFloat(e.target.value) || 0 })}
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nº da parcela</label>
                  <input
                    type="number"
                    value={extractedData.parcela_numero}
                    onChange={(e) => setExtractedData({ ...extractedData, parcela_numero: e.target.value })}
                    className="h-14 w-full rounded-2xl bg-gray-100 px-4 text-base text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Frequência</label>
                  <Select value={selectedRecorrencia} onValueChange={setSelectedRecorrencia}>
                    <SelectTrigger className="h-14 rounded-2xl border-0 bg-gray-100 px-4 text-base text-gray-900 shadow-none focus:ring-0 dark:bg-gray-900 dark:text-white">
                      <SelectValue placeholder="Escolher frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                      <SelectItem value="Bimestral">Bimestral</SelectItem>
                      <SelectItem value="Trimestral">Trimestral</SelectItem>
                      <SelectItem value="Semestral">Semestral</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Linha digitável</label>
                <textarea
                  value={extractedData.linha_digitavel}
                  onChange={(e) => setExtractedData({ ...extractedData, linha_digitavel: e.target.value })}
                  className="min-h-[92px] w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">PIX copia e cola</label>
                <textarea
                  value={extractedData.codigo_pix_copia_cola}
                  onChange={(e) => setExtractedData({ ...extractedData, codigo_pix_copia_cola: e.target.value })}
                  className="min-h-[92px] w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Instruções / observações</label>
                <textarea
                  value={extractedData.observacoes}
                  onChange={(e) => setExtractedData({ ...extractedData, observacoes: e.target.value })}
                  className="min-h-[110px] w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:bg-gray-200 dark:bg-gray-900 dark:text-white dark:focus:bg-gray-950"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm dark:bg-gray-800">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Qual é a natureza desta conta?</label>
            <AgefinNaturezaSelector value={selectedNatureza || 'Único'} onChange={setSelectedNatureza} />
            {selectedNatureza === 'Recorrente' && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Sugestão de recorrência: <span className="font-medium text-gray-900 dark:text-white">{selectedRecorrencia}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-3xl bg-red-50 p-4 shadow-sm dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/5 bg-gray-50/95 px-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:bg-gray-950/95 md:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-3">
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
    </div>
  );
}