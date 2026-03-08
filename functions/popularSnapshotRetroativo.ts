import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Acesso negado. Apenas admins podem executar este script.' },
        { status: 403 }
      );
    }

    console.log('=== INICIANDO POPULAÇÃO RETROATIVA DE ESTOQUE DIÁRIO ===');
    const dataInicio = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 1: Buscar todos os produtos
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Carregando lista de produtos...');
    const produtos = await base44.entities.Produto.list('-created_date');
    const totalProdutos = produtos.length;
    console.log(`✓ ${totalProdutos} produtos carregados.`);

    if (totalProdutos === 0) {
      return Response.json(
        { status: 'sucesso', mensagem: 'Nenhum produto encontrado.', resumo: null },
        { status: 200 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 2: Definir janela de 90 dias retroativa
    // ─────────────────────────────────────────────────────────────────────────
    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setHours(23, 59, 59, 999);

    const dataInicio90dias = new Date(hoje);
    dataInicio90dias.setDate(dataInicio90dias.getDate() - 90);
    dataInicio90dias.setHours(0, 0, 0, 0);

    const dataInicioISO = dataInicio90dias.toISOString().split('T')[0];
    const dataFimISO = dataFim.toISOString().split('T')[0];

    console.log(
      `Janela de cálculo: ${dataInicioISO} até ${dataFimISO} (90 dias)`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 3: Deletar snapshots existentes (idempotência)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Limpando snapshots existentes para a janela de 90 dias...');
    // Nota: A API de delete_entities usa um filtro, então deletaremos por range de data
    // Para simplicidade, vamos limpar todos e recriar (garantindo idempotência total)
    try {
      await base44.entities.EstoqueDiario.delete({ data: { $gte: dataInicioISO, $lte: dataFimISO } });
      console.log('✓ Snapshots anteriores removidos.');
    } catch (e) {
      // Se falhar (ex: nenhum registro), continuamos
      console.log('ℹ Nenhum snapshot anterior para remover (primeira execução).');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 4: Processar cada produto em lotes
    // ─────────────────────────────────────────────────────────────────────────
    const BATCH_SIZE = 10; // Processar 10 produtos por vez
    const resumo = {
      totalProdutos,
      totalDiasProcessados: 0,
      snapshotsCriados: 0,
      erros: []
    };

    for (let i = 0; i < totalProdutos; i += BATCH_SIZE) {
      const batch = produtos.slice(i, i + BATCH_SIZE);
      console.log(
        `\nProcessando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalProdutos / BATCH_SIZE)} (${batch.length} produtos)...`
      );

      // Processar todos os produtos do lote em paralelo
      const promessasLote = batch.map(async (produto) => {
        try {
          return await processarProduto(
            base44,
            produto,
            dataInicio90dias,
            dataFim,
            resumo
          );
        } catch (erro) {
          console.error(`✗ Erro ao processar produto ${produto.codigo_interno}:`, erro.message);
          resumo.erros.push({
            produto_id: produto.id,
            codigo: produto.codigo_interno,
            erro: erro.message
          });
          return null;
        }
      });

      await Promise.all(promessasLote);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 5: Retornar resumo final
    // ─────────────────────────────────────────────────────────────────────────
    const dataFim_exec = new Date();
    const tempoExecucao = dataFim_exec - dataInicio;

    console.log('\n=== RESUMO FINAL ===');
    console.log(`Total de produtos processados: ${resumo.totalProdutos}`);
    console.log(`Total de snapshots criados: ${resumo.snapshotsCriados}`);
    console.log(`Dias processados por produto: ${resumo.totalDiasProcessados / resumo.totalProdutos || 0} (média)`);
    console.log(`Tempo de execução: ${Math.round(tempoExecucao / 1000)}s`);
    console.log(`Erros encontrados: ${resumo.erros.length}`);

    return Response.json(
      {
        status: 'sucesso',
        mensagem: 'População retroativa de estoque diário concluída.',
        resumo
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro fatal no script:', error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR: Processar um único produto
// ─────────────────────────────────────────────────────────────────────────────
async function processarProduto(base44, produto, dataInicio, dataFim, resumo) {
  const produto_id = produto.id;
  const produto_codigo = produto.codigo_interno;
  const saldoAtual = produto.estoque_atual || 0;

  // Buscar todas as movimentações de estoque do período
  const movimentacoes = await base44.entities.MovimentacaoEstoque.filter({
    produto_id: produto_id,
    created_date: {
      $gte: dataInicio.toISOString(),
      $lte: dataFim.toISOString()
    }
  }, '-created_date'); // Ordenar por data desc para processar de trás para frente

  // Array de snapshots a criar
  const snapshotsDia = [];

  // ─ Matemática Reversa:
  // Começamos com o saldo ATUAL (hoje) e voltamos 90 dias
  // Para cada dia, subtraímos as movimentações que ocorreram NAQUELE dia

  let saldoCalculado = saldoAtual;

  // Gerar datas para cada dia no período
  const datas = [];
  const dataAtual = new Date(dataFim);
  while (dataAtual >= dataInicio) {
    datas.push(new Date(dataAtual)); // Clonar data
    dataAtual.setDate(dataAtual.getDate() - 1);
  }

  // Processar cada data (de hoje para trás)
  for (const data of datas) {
    const dataISO = data.toISOString().split('T')[0];

    // Filtrar movimentações do DIA ATUAL (na ordem reversa)
    const movimentacoesDia = movimentacoes.filter((mov) => {
      const dataMov = mov.created_date.split('T')[0];
      return dataMov === dataISO;
    });

    // Calcular saldo ao FINAL do dia (ANTES de aplicar as movimentações de hoje)
    // Lógica: Se uma movimentação é saída, ela REDUZ o saldo passado
    //         Se uma movimentação é entrada, ela AUMENTA o saldo passado
    let saldoFinalDia = saldoCalculado;

    for (const mov of movimentacoesDia) {
      if (mov.tipo === 'Saída') {
        saldoFinalDia += mov.quantidade; // Reverter a saída (somar)
      } else if (mov.tipo === 'Entrada') {
        saldoFinalDia -= mov.quantidade; // Reverter a entrada (subtrair)
      }
    }

    // Criar snapshot
    snapshotsDia.push({
      produto_id,
      produto_codigo,
      data: dataISO,
      saldo_final_dia: Math.max(0, saldoFinalDia), // Nunca deixar negativo
      data_criacao_snapshot: new Date().toISOString()
    });

    // Atualizar saldo para a próxima iteração (dia anterior)
    saldoCalculado = saldoFinalDia;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inserir snapshots em batch (por dia)
  // ─────────────────────────────────────────────────────────────────────────
  const BATCH_SNAPSHOTS = 30; // 30 snapshots por inserção
  for (let j = 0; j < snapshotsDia.length; j += BATCH_SNAPSHOTS) {
    const batch = snapshotsDia.slice(j, j + BATCH_SNAPSHOTS);
    try {
      await base44.entities.EstoqueDiario.bulkCreate(batch);
      resumo.snapshotsCriados += batch.length;
      resumo.totalDiasProcessados += batch.length;
    } catch (erro) {
      console.error(
        `Erro ao inserir snapshots de ${produto_codigo}:`,
        erro.message
      );
      throw erro;
    }
  }

  console.log(`  ✓ ${produto_codigo}: ${snapshotsDia.length} snapshots criados`);
}