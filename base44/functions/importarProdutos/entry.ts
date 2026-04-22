import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const withRetry = async (fn, retries = 3, baseDelay = 1500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e.status === 429 && i < retries - 1) {
        await sleep(baseDelay * (i + 1));
      } else {
        throw e;
      }
    }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      alterados,
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

    // Tirar snapshot dos produtos que serão atualizados (busca individual com delay)
    const produtosAtualizadosSnapshot = [];
    for (const item of atualizados) {
      if (!item.id) continue;
      try {
        const prods = await withRetry(() => base44.asServiceRole.entities.Produto.filter({ id: item.id }, null, 1));
        if (prods && prods.length > 0) {
          produtosAtualizadosSnapshot.push({ id: prods[0].id, dados_anteriores: prods[0] });
        }
        await sleep(150);
      } catch (e) {
        console.warn(`Snapshot falhou para id ${item.id}:`, e.message);
      }
    }

    // Gerar número sequencial do log (numero pode vir string ou number da API — sempre normalizar)
    const logsExistentes = await base44.asServiceRole.entities.ImportacaoLog.list('-created_date', 1);
    let ultimoNumero = 1;
    if (logsExistentes.length > 0) {
      const bruto = logsExistentes[0]?.numero;
      const semPrefixo = String(bruto ?? 'IMP-00000').replace(/^IMP-/i, '').trim();
      const parsed = parseInt(semPrefixo, 10);
      ultimoNumero = Number.isFinite(parsed) && parsed >= 0 ? parsed + 1 : 1;
    }
    const numeroLog = `IMP-${String(ultimoNumero).padStart(5, '0')}`;

    // Salvar log ANTES de processar (garante rollback mesmo com timeout)
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

    await sleep(100);

    const validFields = [
      'tipo', 'preco_venda_padrao', 'campo_hierarquico_1', 'campo_hierarquico_2',
      'campo_hierarquico_3', 'campo_hierarquico_4', 'campo_hierarquico_5',
      'codigo_barras', 'marca', 'categoria_nome', 'area_codigo',
      'valor_compra', 'desconto_perc', 'custo_frete_padrao', 'custo_imposto1_padrao',
      'custo_imposto2_padrao', 'custo_outros_padrao', 'preco_venda_percentual',
      'preco_custo_calculado', 'unidade_principal', 'unidade_apresentacao_default', 'unidades_alternativas', 'unidades_por_pacote',
      'casas_decimais', 'estoque_minimo', 'estoque_ideal', 'estoque_maximo', 'tempo_reposicao_dias',
      'peso_kg', 'dimensoes_cm', 'abcd', 'preco_livre', 'controla_serial', 'controla_lote', 'controla_validade', 'ativo', 'nome',
    ];

    // Processar cada produto com pequeno delay para evitar rate limit
    let processados = 0;
    for (const { id, dados, isNew } of alterados) {
      try {
        if (isNew) {
          const novoProduto = {
            tipo: dados.tipo && String(dados.tipo).trim() ? dados.tipo : 'Produto',
            preco_venda_padrao: Number(dados.preco_venda_padrao) || 0,
            campo_hierarquico_1: dados.campo_hierarquico_1 && String(dados.campo_hierarquico_1).trim()
              ? dados.campo_hierarquico_1
              : 'Sem categoria',
          };
          validFields.forEach(field => {
            const valor = dados[field];
            if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
              novoProduto[field] = valor;
            }
          });
          await withRetry(() => base44.asServiceRole.entities.Produto.create(novoProduto));
        } else {
           const dadosAtualizacao = {};
           validFields.forEach(field => {
             const valor = dados[field];
             if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
               dadosAtualizacao[field] = valor;
             }
           });
           if (Object.keys(dadosAtualizacao).length > 0) {
             await withRetry(() => base44.asServiceRole.entities.Produto.update(id, dadosAtualizacao));
             console.log(`✓ Produto ${id} atualizado:`, Object.keys(dadosAtualizacao).join(', '));
           } else {
             console.warn(`⚠ Nenhum campo para atualizar no produto ${id}`);
           }
         }
        processados++;
        await sleep(200);
      } catch (e) {
        console.warn(`Erro ao processar produto ${id}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      message: `Lote ${lote_numero}/${total_lotes} concluído. ${processados}/${alterados.length} produto(s) processado(s).`,
      count: processados,
    });
  } catch (error) {
    console.error('Erro na importação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});