import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      alterados,
      tipo_importacao = 'Detalhes do Produto',
      is_ultimo_lote = true,
      lote_numero = 1,
      total_lotes = 1,
      grupo_importacao_id,
    } = await req.json();

    if (!alterados || !Array.isArray(alterados) || alterados.length === 0) {
      return Response.json({ error: 'Nenhum produto para importar' }, { status: 400 });
    }

    const novos = alterados.filter(a => a.isNew);
    const atualizados = alterados.filter(a => !a.isNew);

    // Snapshot APENAS dos produtos deste lote (pequeno!)
    const idsAfetados = atualizados.map(a => a.id).filter(Boolean);
    const produtosAtualizadosSnapshot = [];

    if (idsAfetados.length > 0) {
      const produtosAntigos = await base44.asServiceRole.entities.Produto.filter({ id: idsAfetados });
      produtosAntigos.forEach(p => {
        produtosAtualizadosSnapshot.push({ id: p.id, dados_anteriores: p });
      });
    }

    // Gerar número sequencial
    const logsExistentes = await base44.asServiceRole.entities.ImportacaoLog.list('-created_date', 1);
    const ultimoNumero = logsExistentes.length > 0
      ? parseInt((logsExistentes[0].numero || 'IMP-00000').replace('IMP-', '')) + 1
      : 1;
    const numeroLog = `IMP-${String(ultimoNumero).padStart(5, '0')}`;

    // Salvar log deste lote imediatamente (antes de processar, para garantir rollback mesmo com timeout)
    await base44.asServiceRole.entities.ImportacaoLog.create({
      numero: numeroLog,
      tipo: 'Produtos',
      status: 'Concluída',
      grupo_importacao_id: grupo_importacao_id || `GRP-${Date.now()}`,
      lote_numero,
      total_lotes,
      is_ultimo_lote,
      total_novos: novos.length,
      total_atualizados: atualizados.length,
      produtos_atualizados: produtosAtualizadosSnapshot,
    });

    // Processar cada produto deste lote
    const novosCriados = [];
    for (const { id, dados, isNew } of alterados) {
      if (isNew) {
        const novoProduto = {
          tipo: dados.tipo && String(dados.tipo).trim() ? dados.tipo : 'Produto',
          preco_venda_padrao: Number(dados.preco_venda_padrao) || 0,
          campo_hierarquico_1: dados.campo_hierarquico_1 && String(dados.campo_hierarquico_1).trim()
            ? dados.campo_hierarquico_1
            : 'Sem categoria',
        };

        const validFields = [
          'codigo_barras', 'marca', 'categoria_nome', 'area_codigo',
          'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao',
          'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual',
          'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote',
          'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias',
          'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome',
          'campo_hierarquico_2', 'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5',
        ];

        validFields.forEach(field => {
          const valor = dados[field];
          if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
            novoProduto[field] = valor;
          }
        });

        const criado = await base44.asServiceRole.entities.Produto.create(novoProduto);
        if (criado?.id) novosCriados.push(criado.id);
      } else {
        const dadosAtualizacao = {};
        const validFields = [
          'tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2',
          'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5',
          'codigo_barras', 'marca', 'categoria_nome', 'area_codigo',
          'valor_compra', 'custo_frete_padrao', 'custo_imposto1_padrao',
          'custo_imposto2_padrao', 'desconto_compra_padrao', 'preco_venda_percentual',
          'preco_custo_calculado', 'unidade_principal', 'unidades_por_pacote',
          'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias',
          'peso_kg', 'dimensoes_cm', 'abcd', 'ativo', 'nome',
        ];

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
      message: `Lote ${lote_numero}/${total_lotes} concluído. ${alterados.length} produto(s) processado(s).`,
      count: alterados.length,
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});