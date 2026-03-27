import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Info, Package, Users, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

function base64ToBlob(base64, mimeType) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STEPS = [
  { id: 'reading',    label: 'Lendo arquivo…'           },
  { id: 'analyzing', label: 'Analisando dados…'          },
  { id: 'importing', label: 'Importando registros…'      },
  { id: 'done',      label: 'Concluído'                  },
];

export default function TemplatesCompra() {
  const [activeTab, setActiveTab] = useState('download');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(null);   // null | 'reading' | 'analyzing' | 'importing' | 'done'
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Download Template ────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const axiosResponse = await base44.functions.invoke('gerarTemplatePedidoCompra', {});
      const data = axiosResponse.data || axiosResponse;

      const blob = base64ToBlob(data.file_content, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || 'template_pedido_compra.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Template baixado! Preencha a aba "Pedido" e depois importe.' });
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ type: 'error', text: 'Erro ao gerar template. Tente novamente.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Import Template ──────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) processFile(files[0]);
  };

  const processFile = async (file) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Apenas arquivos Excel (.xlsx, .xls) são permitidos.' });
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setImportResult(null);
    setAnalyzeResult(null);

    try {
      // ETAPA 1 — leitura local
      setStep('reading');
      const base64 = await fileToBase64(file);

      // ETAPA 2 — análise no servidor (dry run)
      setStep('analyzing');
      const analyzeResp = await base44.functions.invoke('importarPedidosCompra', { file_content: base64, phase: 'analyze' });
      const analyzed = analyzeResp.data || analyzeResp;

      if (analyzed.error && !analyzed.success) {
        setMessage({ type: 'error', text: analyzed.error });
        setImportResult({ erros: analyzed.erros || [] });
        setStep(null);
        return;
      }

      setAnalyzeResult(analyzed);

      // ETAPA 3 — importação real
      setStep('importing');
      const importResp = await base44.functions.invoke('importarPedidosCompra', { file_content: base64, phase: 'import' });
      const result = importResp.data || importResp;

      if (result.error && !result.success) {
        setMessage({ type: 'error', text: result.error });
        setImportResult({ erros: result.erros || [] });
        setStep(null);
      } else {
        setImportResult(result);
        setStep('done');
        setMessage({
          type: 'success',
          text: `Pedido ${result.pedido_numero} criado com ${result.itens_criados} itens!`
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao importar. Verifique o arquivo.' });
      setStep(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-20">
      {/* Header */}
      <div className="pb-2">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial">Templates de Pedidos</p>
        <p className="text-xs text-gray-400">Baixe o template com sua base de dados, preencha e importe</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          {message.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Import Result Details */}
      {importResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3 shadow-sm">
          {importResult.novos_produtos?.length > 0 && (
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Novos produtos cadastrados:</p>
                <ul className="mt-1 space-y-0.5">
                  {importResult.novos_produtos.map((p, i) => (
                    <li key={i} className="text-xs text-gray-500 dark:text-gray-400">• {p}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {importResult.novos_fornecedores?.length > 0 && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Novos fornecedores cadastrados:</p>
                <ul className="mt-1 space-y-0.5">
                  {importResult.novos_fornecedores.map((f, i) => (
                    <li key={i} className="text-xs text-gray-500 dark:text-gray-400">• {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {importResult.erros?.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Linhas rejeitadas:</p>
                <ul className="mt-1 space-y-0.5">
                  {importResult.erros.map((e, i) => (
                    <li key={i} className="text-xs text-red-500 dark:text-red-400">• {e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'download', label: 'Baixar Template', Icon: Download },
          { id: 'import',   label: 'Importar',         Icon: Upload },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === id
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white'
                : 'text-gray-500 dark:text-gray-400 border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
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
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Template com Base de Dados</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  O arquivo gerado inclui todos os seus produtos e fornecedores cadastrados como referência
                </p>
              </div>
              <Button
                onClick={handleDownloadTemplate}
                disabled={isGenerating}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800"
              >
                {isGenerating ? 'Gerando...' : 'Baixar Template'}
              </Button>
            </div>
          </div>

          {/* Info sobre as abas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Info className="w-4 h-4" /> O template contém 3 abas:
            </p>
            <div className="space-y-2">
              {[
                { Icon: ClipboardList, title: '"Pedido"', desc: 'Preencha aqui: dados do fornecedor no cabeçalho e os itens abaixo. Pode usar IDs da base ou escrever dados novos.' },
                { Icon: Package,      title: '"Produtos Cadastrados"', desc: 'Consulta — lista todos os produtos com ID e campos para referência.' },
                { Icon: Users,        title: '"Fornecedores Cadastrados"', desc: 'Consulta — lista todos os fornecedores com ID e campos para referência.' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}: </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Como usar:</p>
            <ol className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
              <li>Baixe o template — ele já vem com seus dados atuais</li>
              <li>Na aba "Pedido", preencha o cabeçalho com os dados do fornecedor</li>
              <li>Adicione os itens: cole o ID do produto existente <strong>OU</strong> deixe vazio e preencha os campos hierárquicos para cadastrar um novo</li>
              <li>Para novos fornecedores, deixe "Fornecedor ID" vazio e preencha "Fornecedor Nome"</li>
              <li>Salve o arquivo e importe na aba "Importar"</li>
            </ol>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">

          {/* Barra de progresso */}
          {isImporting && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Progresso da importação</p>
              <div className="space-y-2">
                {STEPS.map((s, i) => {
                  const currentIdx = STEPS.findIndex(x => x.id === step);
                  const isDone  = i < currentIdx || step === 'done';
                  const isActive = s.id === step;
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isDone  ? 'bg-green-500' :
                        isActive ? 'bg-gray-700 dark:bg-gray-200' :
                                   'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {isDone ? (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : isActive ? (
                          <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900 animate-pulse" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        isDone  ? 'text-green-600 dark:text-green-400' :
                        isActive ? 'text-gray-900 dark:text-white font-medium' :
                                   'text-gray-400 dark:text-gray-600'
                      }`}>{s.label}</span>
                      {isActive && s.id === 'analyzing' && analyzeResult === null && (
                        <span className="text-xs text-gray-400 ml-auto">verificando dados…</span>
                      )}
                      {isActive && s.id === 'importing' && analyzeResult && (
                        <span className="text-xs text-gray-400 ml-auto">
                          {analyzeResult.itens_count} iten{analyzeResult.itens_count !== 1 ? 's' : ''}, {analyzeResult.fornecedor_nome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Resumo da análise após fase analyze */}
              {analyzeResult && step === 'importing' && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Itens no pedido',     val: analyzeResult.itens_count },
                    { label: 'Produtos a atualizar', val: analyzeResult.produtos_atualizados },
                    { label: 'Produtos novos',       val: analyzeResult.produtos_novos },
                    { label: 'Avisos',               val: analyzeResult.erros?.length || 0 },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{val} </span>{label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`rounded-lg p-8 text-center transition-colors border-2 border-dashed ${
              dragActive
                ? 'border-gray-700 dark:border-gray-300 bg-gray-50 dark:bg-gray-700/50'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Upload className="w-7 h-7 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Arraste o arquivo aqui</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">ou clique para selecionar</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                disabled={isImporting}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800"
              >
                {isImporting ? 'Importando...' : 'Selecionar Arquivo'}
              </Button>
              <p className="text-xs text-gray-400">Apenas .xlsx ou .xls</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">O que acontece na importação:</p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5 list-disc list-inside">
              <li>Fornecedores novos são cadastrados automaticamente</li>
              <li>Produtos novos são cadastrados automaticamente</li>
              <li>O pedido de compra é criado com todos os itens válidos</li>
              <li>Linhas com campos obrigatórios faltando são rejeitadas e informadas</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}