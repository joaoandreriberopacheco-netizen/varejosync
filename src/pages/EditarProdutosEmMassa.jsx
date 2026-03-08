import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ExportarPlanilha from '@/components/produtos/massa/ExportarPlanilha.jsx';
import ImportarPlanilha from '@/components/produtos/massa/ImportarPlanilha.jsx';
import ResumoPrevisualizacao from '@/components/produtos/massa/ResumoPrevisualizacao.jsx';

export default function EditarProdutosEmMassa() {
  const [parsedData, setParsedData] = useState(null); // { alterados, erros }
  const [salvando, setSalvando] = useState(false);
  const [salvouOk, setSalvouOk] = useState(false);

  const handleParsed = useCallback((data) => {
    setParsedData(data);
    setSalvouOk(false);
  }, []);

  const handleConfirmar = async () => {
    if (!parsedData?.alterados?.length) return;
    setSalvando(true);
    try {
      for (const { id, dados } of parsedData.alterados) {
        await base44.entities.Produto.update(id, dados);
      }
      setSalvouOk(true);
      setParsedData(null);
    } finally {
      setSalvando(false);
    }
  };

  const podeConfirmar = parsedData && parsedData.alterados?.length > 0 && parsedData.erros?.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
          Edição em Massa
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Exporte a planilha, edite offline e importe de volta para sincronizar.
        </p>
      </div>

      {/* Step 1 – Exportar */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
        <StepLabel number={1} label="Baixar planilha" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Gera um <strong>.xlsx</strong> com todos os produtos. Colunas editáveis ficam desbloqueadas; IDs e campos calculados são somente-leitura.
        </p>
        <ExportarPlanilha />
      </div>

      {/* Step 2 – Importar */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
        <StepLabel number={2} label="Subir planilha editada" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Selecione o arquivo <strong>.xlsx</strong> modificado. Colunas extras ou não reconhecidas serão ignoradas.
        </p>
        <ImportarPlanilha onParsed={handleParsed} />
      </div>

      {/* Step 3 – Preview & Confirmar */}
      {parsedData && (
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm space-y-4">
          <StepLabel number={3} label="Validar e confirmar" />
          <ResumoPrevisualizacao data={parsedData} />
          <Button
            onClick={handleConfirmar}
            disabled={!podeConfirmar || salvando}
            className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 h-11 text-sm font-medium"
          >
            {salvando ? 'Sincronizando...' : `Confirmar Sincronização (${parsedData.alterados?.length ?? 0} registros)`}
          </Button>
        </div>
      )}

      {/* Sucesso */}
      {salvouOk && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 text-center">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            ✓ Sincronização concluída com sucesso!
          </p>
        </div>
      )}
    </div>
  );
}

function StepLabel({ number, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold flex items-center justify-center">
        {number}
      </span>
      <span className="font-semibold text-gray-800 dark:text-white text-sm font-glacial">{label}</span>
    </div>
  );
}