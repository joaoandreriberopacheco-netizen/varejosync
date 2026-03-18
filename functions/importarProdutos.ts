import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alterados, tipo_importacao = 'Detalhes do Produto' } = await req.json();

    if (!alterados || !Array.isArray(alterados) || alterados.length === 0) {
      return Response.json({ error: 'Nenhum produto para importar' }, { status: 400 });
    }

    // Separar novos e atualizados
    const novos = alterados.filter(a => a.isNew);
    const atualizados = alterados.filter(a => !a.isNew);

    // Snapshot dos produtos antigos (para rollback)
    const idsAfetados = atualizados.map(a => a.id).filter(Boolean);
    const produtosAtualizadosSnapshot = [];
    
    if (idsAfetados.length > 0) {
      const produtosAntigos = await base44.asServiceRole.entities.Produto.filter({ id: idsAfetados });
      produtosAntigos.forEach(p => {
        produtosAtualizadosSnapshot.push({ id: p.id, dados_anteriores: p });
      });
    }

    // Gerar número sequencial do log
    const logsExistentes = await base44.asServiceRole.entities.ImportacaoLog.list('-created_date', 1);
    const ultimoNumero = logsExistentes.length > 0
      ? parseInt((logsExistentes[0].numero || 'IMP-00000').replace('IMP-', '')) + 1
      : 1;
    const numeroLog = `IMP-${String(ultimoNumero).padStart(5, '0')}`;

    // Log de importação com schema correto
    await base44.asServiceRole.entities.ImportacaoLog.create({
      numero: numeroLog,
      tipo: 'Produtos',
      status: 'Concluída',
      total_novos: novos.length,
      total_atualizados: atualizados.length,
      produtos_atualizados: produtosAtualizadosSnapshot,
    });

    // Processar cada produto
    for (const { id, dados, isNew } of alterados) {
      if (isNew) {
        const novoProduto = {
          tipo: dados.tipo && String(dados.tipo).trim() ? dados.tipo : 'Produto',
          preco_venda_padrao: Number(dados.preco_venda_padrao) || 0,
          campo_hierarquico_1: dados.campo_hierarquico_1 && String(dados.campo_hierarquico_1).trim() ? dados.campo_hierarquico_1 : 'Sem categoria',
          numero: `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        };

        const validFields = ['codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5'];
        
        validFields.forEach(field => {
          const valor = dados[field];
          if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
            novoProduto[field] = valor;
          }
        });

        await base44.asServiceRole.entities.Produto.create(novoProduto);
      } else {
        const dadosAtualizacao = {};
        const validFields = ['tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5', 'codigo_barras', 'marca', 'categoria_nome', 'area_codigo', 'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao', 'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual', 'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias', 'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome'];
        
        validFields.forEach(field => {
          const valor = dados[field];
          if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
            dadosAtualizacao[field] = valor;
          }
        });

        if (Object.keys(dadosAtualizacao).length > 0) {
          await base44.asServiceRole.entities.Produto.update(id, dadosAtualizacao);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Sincronização concluída! ${alterados.length} produto(s) processado(s).`,
      count: alterados.length
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});