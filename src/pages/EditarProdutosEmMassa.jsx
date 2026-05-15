import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExportarPlanilha from '@/components/produtos/massa/ExportarPlanilha.jsx';
import ImportarPlanilha from '@/components/produtos/massa/ImportarPlanilha.jsx';
import ExportarEmbalagensPlanilha from '@/components/produtos/massa/ExportarEmbalagensPlanilha.jsx';
import ImportarEmbalagensPlanilha from '@/components/produtos/massa/ImportarEmbalagensPlanilha.jsx';
import ResumoPrevisualizacao from '@/components/produtos/massa/ResumoPrevisualizacao.jsx';
import ExportarEstoque from '@/components/produtos/massa/ExportarEstoque.jsx';
import ImportarEstoque from '@/components/produtos/massa/ImportarEstoque.jsx';
import DesfazerImportacao from '@/components/produtos/massa/DesfazerImportacao.jsx';
import { buildLegacyUnitBackfillPatch } from '@/lib/productUnits';

export default function EditarProdutosEmMassa() {
  const [parsedData, setParsedData] = useState(null);
  const [parsedEmbalagens, setParsedEmbalagens] = useState(null);
  const [parsedEstoque, setParsedEstoque] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvouOk, setSalvouOk] = useState(false);
  const [salvouOkEmbalagens, setSalvouOkEmbalagens] = useState(false);
  const [processandoBackfillLegado, setProcessandoBackfillLegado] = useState(false);
  const [resumoBackfillLegado, setResumoBackfillLegado] = useState(null);

  const handleParsed = useCallback((data) => {
    setParsedData(data);
    setSalvouOk(false);
  }, []);

  const handleParsedEmbalagens = useCallback((data) => {
    setParsedEmbalagens(data);
    setSalvouOkEmbalagens(false);
  }, []);

  const handleParsedEstoque = useCallback((data) => {
    setParsedEstoque(data);
    setSalvouOk(false);
  }, []);

  const handleConfirmar = async () => {
    if (!parsedData?.alterados?.length) {
      console.log('❌ Sem dados para sincronizar');
      return;
    }
    setSalvando(true);
    try {
      console.log('🔄 Iniciando sincronização de', parsedData.alterados.length, 'produtos');
      const user = await base44.auth.me();
      
      // Criar snapshot antes de importar (para desfazer depois)
      const idsAfetados = parsedData.alterados.map(a => a.id).filter(Boolean);
      const snapshotDados = [];
      
      if (idsAfetados.length > 0) {
        const produtosAntigos = await base44.entities.Produto.filter({ id: idsAfetados });
        snapshotDados.push(...produtosAntigos);
      }

      // Registrar snapshot
      await base44.entities.ImportacaoLog.create({
        usuario_responsavel: user?.full_name || user?.email,
        quantidade_itens: parsedData.alterados.length,
        snapshot_dados: snapshotDados,
        tipo_importacao: 'Detalhes do Produto'
      });

      // Executar importação
      for (const { id, dados, isNew } of parsedData.alterados) {
        if (isNew) {
           // Novo produto: construir com campos obrigatórios garantidos
           const novosProduto = {
             tipo: dados.tipo && String(dados.tipo).trim() ? dados.tipo : 'Produto',
             preco_venda_padrao: Number(dados.preco_venda_padrao) || 0,
             campo_hierarquico_1: dados.campo_hierarquico_1 && String(dados.campo_hierarquico_1).trim() ? dados.campo_hierarquico_1 : 'Sem categoria'
           };

           // Adicionar apenas campos válidos do schema (excluir 'numero' e outros inválidos)
           const validFields = ['codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidade_vitrine', 'unidades_alternativas', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5'];
           validFields.forEach(field => {
             const valor = dados[field];
             if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
               novosProduto[field] = valor;
             }
           });

           console.log('📦 Payload novo:', novosProduto);
           await base44.entities.Produto.create(novosProduto);
        } else {
          // Produto existente: atualizar apenas campos alterados
          const dadosAtualizacao = {};
          const validFields = ['tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidade_vitrine', 'unidades_alternativas', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome'];
          validFields.forEach(field => {
            const valor = dados[field];
            if (valor === null || valor === undefined) return;
            if (field === 'unidade_vitrine') {
              dadosAtualizacao[field] = String(valor).trim();
            } else if (String(valor).trim() !== '') {
              dadosAtualizacao[field] = valor;
            }
          });

          if (Object.keys(dadosAtualizacao).length > 0) {
            console.log('📦 Payload atualização:', dadosAtualizacao);
            await base44.entities.Produto.update(id, dadosAtualizacao);
          }
        }
      }
      console.log('✅ Sincronização concluída com sucesso');
      setSalvouOk(true);
      setParsedData(null);
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      alert(`Erro ao sincronizar: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarEmbalagens = async () => {
    if (!parsedEmbalagens?.alterados?.length) return;
    setSalvando(true);
    try {
      const user = await base44.auth.me();
      const idsAfetados = parsedEmbalagens.alterados.map((a) => a.id).filter(Boolean);
      const snapshotDados = [];
      if (idsAfetados.length > 0) {
        const produtosAntigos = await base44.entities.Produto.filter({ id: idsAfetados });
        snapshotDados.push(...produtosAntigos);
      }
      await base44.entities.ImportacaoLog.create({
        usuario_responsavel: user?.full_name || user?.email,
        quantidade_itens: parsedEmbalagens.alterados.length,
        snapshot_dados: snapshotDados,
        tipo_importacao: 'Embalagens / Unidades',
      });
      const camposEmb = ['unidade_principal', 'unidade_vitrine', 'unidades_alternativas'];
      for (const { id, dados } of parsedEmbalagens.alterados) {
        const dadosAtualizacao = {};
        camposEmb.forEach((field) => {
          const valor = dados[field];
          if (valor === null || valor === undefined) return;
          if (field === 'unidades_alternativas' && Array.isArray(valor)) {
            dadosAtualizacao[field] = valor;
          } else if (field === 'unidade_vitrine') {
            dadosAtualizacao[field] = String(valor).trim();
          } else if (field !== 'unidades_alternativas' && String(valor).trim() !== '') {
            dadosAtualizacao[field] = valor;
          }
        });
        if (Object.keys(dadosAtualizacao).length > 0) {
          await base44.entities.Produto.update(id, dadosAtualizacao);
        }
      }
      setSalvouOkEmbalagens(true);
      setParsedEmbalagens(null);
    } catch (error) {
      console.error('❌ Erro na sincronização de embalagens:', error);
      alert(`Erro ao sincronizar embalagens: ${error?.message || 'Erro desconhecido'}`);
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

  const carregarTodosProdutos = async () => {
    let produtos = [];
    let skip = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const batch = await base44.entities.Produto.list('-updated_date', pageSize, skip);
      if (!batch.length) {
        hasMore = false;
      } else {
        produtos = produtos.concat(batch);
        skip += pageSize;
      }
    }
    return produtos;
  };

  const handleBackfillUnidadesLegadas = async () => {
    if (processandoBackfillLegado) return;
    setProcessandoBackfillLegado(true);
    try {
      const produtos = await carregarTodosProdutos();
      const candidatos = [];
      let ignoradosConsistentes = 0;
      let conflitos = 0;

      for (const produto of produtos) {
        const analise = buildLegacyUnitBackfillPatch(produto);
        if (analise.conflict) {
          conflitos += 1;
          continue;
        }
        if (!analise.hasChanges) {
          ignoradosConsistentes += 1;
          continue;
        }
        candidatos.push({ id: produto.id, nome: produto.nome, patch: analise.patch });
      }

      const resumoPrevio = {
        total: produtos.length,
        candidatos: candidatos.length,
        conflitos,
        ignorados: ignoradosConsistentes,
        atualizados: 0,
        erros: 0,
      };
      setResumoBackfillLegado(resumoPrevio);

      if (!candidatos.length) return;

      const confirmar = window.confirm(
        `Backfill legado encontrado: ${candidatos.length} produto(s) para corrigir, ${conflitos} conflito(s) e ${ignoradosConsistentes} já consistente(s). Deseja aplicar agora?`
      );
      if (!confirmar) return;

      const user = await base44.auth.me();
      const idsAfetados = candidatos.map((item) => item.id);
      const snapshotDados = await base44.entities.Produto.filter({ id: idsAfetados });
      await base44.entities.ImportacaoLog.create({
        usuario_responsavel: user?.full_name || user?.email,
        quantidade_itens: candidatos.length,
        snapshot_dados: snapshotDados || [],
        tipo_importacao: 'Backfill Unidades Legadas',
      });

      let atualizados = 0;
      let erros = 0;
      for (const item of candidatos) {
        try {
          await base44.entities.Produto.update(item.id, item.patch);
          atualizados += 1;
        } catch (error) {
          console.error(`Erro no backfill do produto ${item.id}:`, error);
          erros += 1;
        }
      }

      setResumoBackfillLegado({
        ...resumoPrevio,
        atualizados,
        erros,
      });
    } catch (error) {
      console.error('❌ Erro no backfill legado de unidades:', error);
      alert(`Erro no backfill legado: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setProcessandoBackfillLegado(false);
    }
  };

  const podeConfirmar = parsedData && parsedData.alterados?.length > 0 && parsedData.erros?.length === 0;
  const podeConfirmarEmbalagens =
    parsedEmbalagens && parsedEmbalagens.alterados?.length > 0 && parsedEmbalagens.erros?.length === 0;
  const podeConfirmarEstoque = parsedEstoque && parsedEstoque.alterados?.length > 0 && parsedEstoque.erros?.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
          Edição em Massa
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Atualize detalhes, embalagens/unidades ou estoque em lote via planilha.
        </p>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg gap-1">
          <TabsTrigger value="produtos" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Detalhes do Produto
          </TabsTrigger>
          <TabsTrigger value="embalagens" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Embalagens
          </TabsTrigger>
          <TabsTrigger value="estoque" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Estoque em Massa
          </TabsTrigger>
          <TabsTrigger value="desfazer" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
            Desfazer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-8 mt-6">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={1} label="Baixar planilha" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gera um <strong>.xlsx</strong> com todos os produtos (sem colunas Base / Alt. — use a aba Embalagens). Colunas editáveis ficam desbloqueadas; IDs e campos calculados são somente-leitura.
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

        <TabsContent value="embalagens" className="space-y-8 mt-6">
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-6 shadow-sm border border-amber-100 dark:border-amber-800">
            <StepLabel number={0} label="Backfill legado (importações antigas)" />
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
              Reconstrói unidade principal (fator 1), PDV, show comercial e show logístico para produtos importados antes do novo contrato de unidades.
            </p>
            <Button
              onClick={handleBackfillUnidadesLegadas}
              disabled={processandoBackfillLegado || salvando}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white h-11 text-sm font-medium"
            >
              {processandoBackfillLegado ? 'Analisando/aplicando backfill...' : 'Corrigir unidades legadas'}
            </Button>
            {resumoBackfillLegado && (
              <div className="mt-4 rounded-lg bg-white/70 dark:bg-gray-900/30 border border-amber-100 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-1">
                <p>Total analisado: {resumoBackfillLegado.total}</p>
                <p>Candidatos: {resumoBackfillLegado.candidatos}</p>
                <p>Conflitos (sem fator 1 único): {resumoBackfillLegado.conflitos}</p>
                <p>Ignorados (já consistentes): {resumoBackfillLegado.ignorados}</p>
                {typeof resumoBackfillLegado.atualizados === 'number' && <p>Atualizados: {resumoBackfillLegado.atualizados}</p>}
                {typeof resumoBackfillLegado.erros === 'number' && <p>Erros de update: {resumoBackfillLegado.erros}</p>}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={1} label="Baixar planilha de embalagens" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Planilha dedicada: <strong>Base</strong> = unidade principal (fator 1); <strong>Alt.1</strong> e <strong>Alt.2</strong> = alternativas (fator vs base); coluna <strong>Unidade vitrine</strong> grava <code className="text-xs">unidade_vitrine</code> (sigla no catálogo/PDV — vazio = base).
            </p>
            <ExportarEmbalagensPlanilha />
          </div>

          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <StepLabel number={2} label="Subir planilha editada" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Use o arquivo exportado nesta aba. O produto é identificado por <strong>ID</strong> ou <strong>Cód. Interno</strong>.
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Importar apenas analisa e prepara os dados. A gravação no banco acontece somente ao clicar em <strong>Confirmar embalagens</strong>.
            </p>
            <ImportarEmbalagensPlanilha onParsed={handleParsedEmbalagens} />
          </div>

          {parsedEmbalagens && (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm space-y-4">
              <StepLabel number={3} label="Validar e confirmar" />
              <ResumoPrevisualizacao data={parsedEmbalagens} />
              <Button
                onClick={handleConfirmarEmbalagens}
                disabled={!podeConfirmarEmbalagens || salvando}
                className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 h-11 text-sm font-medium"
              >
                {salvando
                  ? 'Sincronizando...'
                  : `Confirmar embalagens (${parsedEmbalagens.alterados?.length ?? 0} produtos)`}
              </Button>
            </div>
          )}

          {salvouOkEmbalagens && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✓ Embalagens e unidades atualizadas com sucesso!
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

          <TabsContent value="desfazer" className="space-y-6 mt-6">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial mb-2">
                Histórico de Importações
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Restaure produtos para o estado anterior a uma importação realizada.
              </p>
            </div>
            <DesfazerImportacao />
          </div>
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