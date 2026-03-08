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

    console.log('=== INICIANDO CÁLCULO DO ÍNDICE DE ENERGIA DE PRODUTO (IEP) ===');
    const dataInicio = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 1: Definir janela móvel de 90 dias
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
      `Janela de análise: ${dataInicioISO} até ${dataFimISO} (90 dias)`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 2: Carregar produtos
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Carregando produtos...');
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
    // PASSO 3: Processar produtos em lotes
    // ─────────────────────────────────────────────────────────────────────────
    const BATCH_SIZE = 8; // 8 produtos por lote
    const resumo = {
      totalProdutos,
      processados: 0,
      atualizados: 0,
      erros: []
    };

    for (let i = 0; i < totalProdutos; i += BATCH_SIZE) {
      const batch = produtos.slice(i, i + BATCH_SIZE);
      console.log(
        `\nProcessando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalProdutos / BATCH_SIZE)} (${batch.length} produtos)...`
      );

      const promessasLote = batch.map(async (produto) => {
        try {
          return await processarProdutoIEP(
            base44,
            produto,
            dataInicio90dias,
            dataFim,
            resumo
          );
        } catch (erro) {
          console.error(`✗ Erro ao processar ${produto.codigo_interno}:`, erro.message);
          resumo.erros.push({
            produto_id: produto.id,
            codigo: produto.codigo_interno,
            erro: erro.message
          });
          resumo.processados++;
          return null;
        }
      });

      await Promise.all(promessasLote);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 4: Retornar resumo final
    // ─────────────────────────────────────────────────────────────────────────
    const dataFim_exec = new Date();
    const tempoExecucao = dataFim_exec - dataInicio;

    console.log('\n=== RESUMO FINAL ===');
    console.log(`Total processado: ${resumo.processados}/${resumo.totalProdutos}`);
    console.log(`IEPs calculados e persistidos: ${resumo.atualizados}`);
    console.log(`Tempo de execução: ${Math.round(tempoExecucao / 1000)}s`);
    console.log(`Erros: ${resumo.erros.length}`);

    if (resumo.erros.length > 0) {
      console.log('Erros encontrados:');
      resumo.erros.forEach(e => console.log(`  - ${e.codigo}: ${e.erro}`));
    }

    return Response.json(
      {
        status: 'sucesso',
        mensagem: 'Cálculo do IEP concluído.',
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

// ═════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: Processar um produto para cálculo de IEP
// ═════════════════════════════════════════════════════════════════════════════
async function processarProdutoIEP(base44, produto, dataInicio, dataFim, resumo) {
  const produto_id = produto.id;
  const produto_codigo = produto.codigo_interno;

  // ─ Buscar dados dos últimos 90 dias
  const [pedidosVenda, estoqueDiario] = await Promise.all([
    base44.entities.PedidoVenda.filter({
      created_date: {
        $gte: dataInicio.toISOString(),
        $lte: dataFim.toISOString()
      }
    }),
    base44.entities.EstoqueDiario.filter({
      produto_id,
      data: {
        $gte: dataInicio.toISOString().split('T')[0],
        $lte: dataFim.toISOString().split('T')[0]
      }
    })
  ]);

  // ─ Filtrar pedidos que contêm o produto
  const pedidosComProduto = pedidosVenda.filter(pedido =>
    pedido.itens && pedido.itens.some(item => item.produto_id === produto_id)
  );

  // ─ Se nenhum pedido no período, o produto tem IEP mínimo
  if (pedidosComProduto.length === 0) {
    const scoreMinimo = 10; // Mínimo para não ficar completamente invisível
    const classe = 'D';
    await atualizarIEP(base44, produto, scoreMinimo, classe);
    resumo.processados++;
    resumo.atualizados++;
    console.log(`  ⚠ ${produto_codigo}: Sem vendas (IEP = ${scoreMinimo}, Classe = ${classe})`);
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PILAR 1: ENERGIA EM POTENCIAL (40%)
  // Faturamento bruto + Margem de Contribuição com IQR
  // ─────────────────────────────────────────────────────────────────────────
  const dados_potencial = pedidosComProduto
    .flatMap(pedido =>
      pedido.itens
        .filter(item => item.produto_id === produto_id)
        .map(item => ({
          total: item.total || 0,
          custo: (item.custo_unitario_momento || 0) * item.quantidade,
          margem: (item.total || 0) - ((item.custo_unitario_momento || 0) * item.quantidade)
        }))
    );

  const faturamentos = dados_potencial.map(d => d.total);
  const margens = dados_potencial.map(d => d.margem);

  const faturamentos_filtrados = filtrarPorIQR(faturamentos);
  const margens_filtradas = filtrarPorIQR(margens);

  const faturamentoMedio = calcularMedia(faturamentos_filtrados);
  const margemMedia = calcularMedia(margens_filtradas);
  const margemPercent = faturamentoMedio > 0 ? (margemMedia / faturamentoMedio) * 100 : 0;

  const scoreEnergiaEmPotencial = Math.min(100, Math.max(0, margemPercent * 2)); // 0-100

  // ─────────────────────────────────────────────────────────────────────────
  // PILAR 2: ENERGIA CINÉTICA (30%)
  // Quantidade vendida + Demanda Projetada + Dias de Ruptura
  // ─────────────────────────────────────────────────────────────────────────
  const dados_cinetica = pedidosComProduto
    .flatMap(pedido =>
      pedido.itens
        .filter(item => item.produto_id === produto_id)
        .map(item => item.quantidade)
    );

  const quantidades_filtradas = filtrarPorIQR(dados_cinetica);
  const quantidadeMedia = calcularMedia(quantidades_filtradas);
  const demandaProjetada = quantidadeMedia * 90; // 90 dias

  // ─ Calcular dias de ruptura (saldo zero)
  const diasRuptura = estoqueDiario.filter(snap => snap.saldo_final_dia === 0).length;
  const diasTotais = estoqueDiario.length || 90;
  const taxaRuptura = diasTotais > 0 ? (diasRuptura / diasTotais) * 100 : 0;

  // Score cinético: penaliza por ruptura (perda de venda)
  const scoreEnergiaEmCinetica = Math.min(
    100,
    Math.max(0, quantidadeMedia * 5 - taxaRuptura * 2)
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PILAR 3: ENERGIA MAGNÉTICA (30%)
  // Ticket médio e cross-sell do produto
  // ─────────────────────────────────────────────────────────────────────────
  const tickets = pedidosComProduto.map(pedido => pedido.valor_total || 0);
  const tickets_filtrados = filtrarPorIQR(tickets);
  const ticketMedio = calcularMedia(tickets_filtrados);

  // Normalizar ticket médio para uma escala 0-100 (baseado em quartis do mercado)
  const scoreEnergiaMagnetica = Math.min(100, Math.max(0, (ticketMedio / 100))); // Ajustar conforme necessário

  // ─────────────────────────────────────────────────────────────────────────
  // AGREGAÇÃO COM PESOS
  // ─────────────────────────────────────────────────────────────────────────
  const PESO_POTENCIAL = 0.40;
  const PESO_CINETICA = 0.30;
  const PESO_MAGNETICA = 0.30;

  const iepScore = Math.round(
    scoreEnergiaEmPotencial * PESO_POTENCIAL +
    scoreEnergiaEmCinetica * PESO_CINETICA +
    scoreEnergiaMagnetica * PESO_MAGNETICA
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CLASSIFICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  const iepClasse = classificarPorScore(iepScore);

  // ─────────────────────────────────────────────────────────────────────────
  // PERSISTÊNCIA (com respeito ao override manual)
  // ─────────────────────────────────────────────────────────────────────────
  await atualizarIEP(base44, produto, iepScore, iepClasse);

  resumo.processados++;
  resumo.atualizados++;

  console.log(
    `  ✓ ${produto_codigo}: IEP = ${iepScore} | Classe = ${iepClasse} | Potencial: ${scoreEnergiaEmPotencial.toFixed(1)} | Cinética: ${scoreEnergiaEmCinetica.toFixed(1)} | Magnética: ${scoreEnergiaMagnetica.toFixed(1)}`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// FUNÇÃO AUXILIAR: Atualizar IEP no banco
// ═════════════════════════════════════════════════════════════════════════════
async function atualizarIEP(base44, produto, iepScore, iepClasse) {
  const updateData = {
    iep_score: iepScore
  };

  // Respeitar override manual: só atualizar iep_classe se não estiver travado
  if (!produto.iep_trava_manual) {
    updateData.iep_classe = iepClasse;
  }

  await base44.entities.Produto.update(produto.id, updateData);
}

// ═════════════════════════════════════════════════════════════════════════════
// FUNÇÕES DE CÁLCULO ESTATÍSTICO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calcula Q1, Q3 e IQR para um array de valores
 */
function calcularIQR(valores) {
  if (valores.length === 0) return { q1: 0, q3: 0, iqr: 0 };

  const sorted = [...valores].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index] || 0;
  const q3 = sorted[q3Index] || 0;
  const iqr = q3 - q1;

  return { q1, q3, iqr };
}

/**
 * Filtra valores fora do range [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
 */
function filtrarPorIQR(valores) {
  if (valores.length === 0) return [];
  if (valores.length <= 2) return valores; // Não filtrar se poucos dados

  const { q1, q3, iqr } = calcularIQR(valores);

  const limiteInferior = q1 - 1.5 * iqr;
  const limiteSuperior = q3 + 1.5 * iqr;

  return valores.filter(v => v >= limiteInferior && v <= limiteSuperior);
}

/**
 * Calcula a média de um array
 */
function calcularMedia(valores) {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/**
 * Classifica o produto baseado no score IEP
 */
function classificarPorScore(iepScore) {
  if (iepScore >= 75) return 'A';
  if (iepScore >= 50) return 'B';
  if (iepScore >= 25) return 'C';
  return 'D';
}