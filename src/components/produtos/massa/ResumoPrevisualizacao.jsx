import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ResumoPrevisualizacao({ data }) {
  const { alterados = [], erros = [], linhasIgnoradasSemMudanca = 0 } = data;
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{alterados.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">A importar (com mudança)</p>
        </div>
        <div className={`rounded-xl p-4 shadow-sm text-center ${erros.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-900'}`}>
          <p className={`text-2xl font-bold ${erros.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {erros.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Erros de validação</p>
        </div>
      </div>

      {/* Status */}
      {erros.length === 0 && alterados.length > 0 && (
        <div className="flex items-center gap-2 text-[#4A5D23] dark:text-[#a4ce33] text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Tudo válido. Pronto para sincronizar.
        </div>
      )}

      {erros.length > 0 && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          Corrija os erros na planilha antes de continuar.
        </div>
      )}

      {alterados.length === 0 && erros.length === 0 && (
        <p className="text-sm text-gray-400 text-center">
          {linhasIgnoradasSemMudanca > 0
            ? `Nada a sincronizar: ${linhasIgnoradasSemMudanca} linha(s) sem diferença em relação ao cadastro atual.`
            : 'Nenhuma alteração detectada na planilha.'}
        </p>
      )}

      {/* Erros listados com detalhes */}
      {erros.length > 0 && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 space-y-2">
          <p className="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">
            🔍 Vistoria de Campos - Erros Encontrados:
          </p>
          {erros.slice(0, 10).map((e, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-white dark:bg-red-900/30 rounded-lg">
              <span className="text-red-500 flex-shrink-0 mt-0.5">✗</span>
              <p className="text-xs text-red-700 dark:text-red-300 flex-1">{e.mensagem}</p>
            </div>
          ))}
          {erros.length > 10 && (
            <p className="text-xs text-red-600 dark:text-red-400 italic pt-1">
              ... e mais {erros.length - 10} erro(s)
            </p>
          )}
        </div>
      )}

      {/* Detalhes das alterações */}
      {alterados.length > 0 && (
        <div>
          <button
            onClick={() => setMostrarDetalhes(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-1"
          >
            {mostrarDetalhes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {mostrarDetalhes ? 'Ocultar detalhes' : 'Ver produtos alterados'}
          </button>
          {mostrarDetalhes && (
            <P38MobileLineList className="mt-2 max-h-48 overflow-y-auto">
              {alterados.map(({ id, nome, dados }, index) => (
                <P38MobileLine
                  key={id}
                  striped={index % 2 === 1}
                  accent="info"
                  className="flex items-start justify-between gap-2 px-4 py-2"
                >
                  <p className="text-xs font-medium truncate flex-1">{nome}</p>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {Object.keys(dados).map(campo => (
                      <Badge key={campo} variant="secondary" className="text-[10px] px-1.5 py-0">{campo}</Badge>
                    ))}
                  </div>
                </P38MobileLine>
              ))}
            </P38MobileLineList>
          )}
        </div>
      )}
    </div>
  );
}