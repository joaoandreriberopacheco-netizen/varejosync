import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExportarPlanilha from '@/components/produtos/massa/ExportarPlanilha.jsx';
import ImportarPlanilha from '@/components/produtos/massa/ImportarPlanilha.jsx';
import ResumoPrevisualizacao from '@/components/produtos/massa/ResumoPrevisualizacao.jsx';
import ExportarEstoque from '@/components/produtos/massa/ExportarEstoque.jsx';
import ImportarEstoque from '@/components/produtos/massa/ImportarEstoque.jsx';

export default function EditarProdutosEmMassa() {
  const [parsedData, setParsedData] = useState(null);
  const [parsedEstoque, setParsedEstoque] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvouOk, setSalvouOk] = useState(false);

  const handleParsed = useCallback((data) => {
    setParsedData(data);
    setSalvouOk(false);
  }, []);

  const handleParsedEstoque = useCallback((data) => {
    setParsedEstoque(data);
    setSalvouOk(false);
  }, []);

  const handleConfirmar = async () => {
    if (!parsedData?.alterados?.length) return;
    setSalvando(true);
    try {
      for (const { id, dados, isNew } of parsedData.alterados) {
        if (isNew) {
          await base44.entities.Produto.create(dados);
        } else {
          await base44.entities.Produto.update(id, dados);
        }
      }
      setSalvouOk(true);
      setParsedData(null);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarEstoque = async () => {
    if (!parsedEstoque?.alterados?.length) return;
    setSalvando(true);
    try {
      const user = await base44.auth.me();
      
      for (const { id, estoque_novo, estoque_anterior, produto_nome } of parsedEstoque.alterados) {
        const diferenca = estoque_novo - estoque_anterior;
        
        await base44.entities.Produto.update(id, { estoque_atual: estoque_novo });
        
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: id,
          produto_nome,
          tipo: diferenca >= 0 ? 'Entrada' : 'Saída',
          motivo: 'Ajuste de Inventário',
          quantidade: Math.abs(diferenca),
          custo_unitario: 0,
          referencia_tipo: 'Importação de Inventário',
          observacoes: `Ajuste em massa: ${estoque_anterior} → ${estoque_novo}`,
          usuario_responsavel: user?.email || 'Sistema',
        });
      }
      
      setSalvouOk(true);
      setParsedEstoque(null);
    } finally {
      setSalvando(false);
    }
  };

  const podeConfirmar = parsedData && parsedData.alterados?.length > 0 && parsedData.erros?.length === 0;
  const podeConfirmarEstoque = parsedEstoque && parsedEstoque.alterados?.length > 0 && parsedEstoque.erros?.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
          Edição em Massa
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Atualize produtos ou estoque em lote via planilha.
        </p>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger value="produtos" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Detalhes do Produto
          </TabsTrigger>
          <TabsTrigger value="estoque" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Estoque em Massa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-8 mt-6">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={1} label="Baixar planilha" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gera um <strong>.xlsx</strong> com todos os produtos. Colunas editáveis ficam desbloqueadas; IDs e campos calculados são somente-leitura.
            </p>
            <ExportarPlanilha />
          </div>

          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={2} label="Subir planilha editada" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Selecione o arquivo <strong>.xlsx</strong> modificado. Colunas extras ou não reconhecidas serão ignoradas.
            </p>
            <ImportarPlanilha onParsed={handleParsed} />
          </div>

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

          {salvouOk && !parsedEstoque && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✓ Sincronização concluída com sucesso!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="estoque" className="space-y-8 mt-6">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={1} label="Baixar template de estoque" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gera um <strong>.xlsx</strong> com ID, Nome e Estoque Atual de todos os produtos.
            </p>
            <ExportarEstoque />
          </div>

          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={2} label="Subir planilha de inventário" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Importe o arquivo <strong>.xlsx</strong> com as quantidades atualizadas. Movimentações de estoque serão geradas automaticamente.
            </p>
            <ImportarEstoque onParsed={handleParsedEstoque} />
          </div>

          {parsedEstoque && (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm space-y-4">
              <StepLabel number={3} label="Validar e confirmar ajustes" />
              <div className="space-y-3">
                {parsedEstoque.erros?.length > 0 && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                      Erros encontrados:
                    </p>
                    {parsedEstoque.erros.map((erro, idx) => (
                      <p key={idx} className="text-xs text-red-600 dark:text-red-400">• {erro.mensagem}</p>
                    ))}
                  </div>
                )}
                
                {parsedEstoque.alterados?.length > 0 && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                      {parsedEstoque.alterados.length} produto(s) serão atualizados
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {parsedEstoque.alterados.slice(0, 10).map((item, idx) => (
                        <p key={idx} className="text-xs text-blue-600 dark:text-blue-400">
                          • {item.produto_nome}: {item.estoque_anterior} → {item.estoque_novo}
                        </p>
                      ))}
                      {parsedEstoque.alterados.length > 10 && (
                        <p className="text-xs text-blue-500 dark:text-blue-400 italic">
                          ... e mais {parsedEstoque.alterados.length - 10} itens
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleConfirmarEstoque}
                disabled={!podeConfirmarEstoque || salvando}
                className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 h-11 text-sm font-medium"
              >
                {salvando ? 'Atualizando estoque...' : `Confirmar Atualização (${parsedEstoque.alterados?.length ?? 0} produtos)`}
              </Button>
            </div>
          )}

          {salvouOk && parsedEstoque === null && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✓ Estoque atualizado e movimentações registradas com sucesso!
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
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