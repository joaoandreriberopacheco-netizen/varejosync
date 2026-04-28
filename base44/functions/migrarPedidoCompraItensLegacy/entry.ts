import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/* ============================================================================
 * migrarPedidoCompraItensLegacy
 *
 * Backfill idempotente: para cada PedidoCompra existente, le `itens[]` legado
 * e cria/atualiza linhas em PedidoCompraItem com o contrato canonico:
 *   - resolve unidade pelo `produto_unidade_id` se ja existir, senao por sigla
 *     (match em Produto.unidades[] ja saneado pelo migrarProdutoUnidades)
 *   - normaliza siglas (CAIXA -> CX, etc.)
 *   - confia que `custo_unitario` legado esta em fator-1 (pratica estavel do usuario)
 *   - recalcula quantidade_base, custo_total, total
 *   - apos popular, recompoe o espelho `PedidoCompra.itens[]`
 *
 * Idempotencia: se ja existem PedidoCompraItem com `pedido_compra_id` igual,
 * apaga e recria pra garantir consistencia (a entidade canonica e a fonte).
 *
 * Aceita body:
 *   - dry_run: boolean (default true)
 *   - limit: number (max pedidos, default 200)
 *   - pedido_ids: string[] (filtra pra estes)
 *   - apenas_nao_concluidos: boolean (default false)
 * ============================================================================ */

const round6 = (n: any) => Math.round((Number(n) || 0) * 1_000_000) / 1_000_000;
const asNumber = (value: any, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const SIGLA_NORMALIZE_MAP: Record<string, string> = {
  CAIXA: 'CX', CAIXAS: 'CX',
  'M²': 'M2', 'METRO QUADRADO': 'M2', 'METROS QUADRADOS': 'M2',
  PEÇA: 'PC', PEÇAS: 'PC', PECA: 'PC', PECAS: 'PC',
  UNIDADE: 'UN', UNIDADES: 'UN',
};

const normalizeSigla = (raw: any): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  const noAccents = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (SIGLA_NORMALIZE_MAP[s]) return SIGLA_NORMALIZE_MAP[s];
  if (SIGLA_NORMALIZE_MAP[noAccents]) return SIGLA_NORMALIZE_MAP[noAccents];
  return s.replace('²', '2');
};

const isPedidoNaoConcluido = (pedido: any) => {
  const status = String(pedido?.status || '').trim();
  const statusReceb = String(pedido?.status_recebimento_geral || '').trim();
  return status !== 'Concluído' && !statusReceb.startsWith('Concluído');
};

interface UnidadeCanonical {
  id: string;
  sigla: string;
  fator_conversao: number;
  fator_preco: number;
  is_principal?: boolean;
  is_comercial?: boolean;
  ativo?: boolean;
}

const getUnidadesProduto = (produto: any): UnidadeCanonical[] => {
  if (Array.isArray(produto?.unidades) && produto.unidades.length > 0) {
    return produto.unidades as UnidadeCanonical[];
  }
  // Fallback construindo do legado.
  const principal: UnidadeCanonical = {
    id: 'principal',
    sigla: normalizeSigla(produto?.unidade_principal || 'UN') || 'UN',
    fator_conversao: 1,
    fator_preco: 1,
    is_principal: true,
    is_comercial: false,
    ativo: true,
  };
  const alternativas: UnidadeCanonical[] = (Array.isArray(produto?.unidades_alternativas) ? produto.unidades_alternativas : [])
    .filter((a: any) => a?.unidade)
    .map((a: any) => ({
      id: a?.id || `alt_${normalizeSigla(a?.unidade)}`,
      sigla: normalizeSigla(a?.unidade),
      fator_conversao: asNumber(a?.fator_conversao, 1) || 1,
      fator_preco: asNumber(a?.fator_preco, 1) || 1,
      is_principal: false,
      is_comercial: false,
      ativo: a?.ativo !== false,
    }));
  return [principal, ...alternativas];
};

const resolveUnidadeForLegacy = (produto: any, item: any): UnidadeCanonical => {
  const unidades = getUnidadesProduto(produto);
  if (item?.produto_unidade_id) {
    const byId = unidades.find(u => u.id === item.produto_unidade_id);
    if (byId) return byId;
  }
  const sigla = normalizeSigla(item?.unidade_medida || item?.unidade_apresentacao);
  if (sigla) {
    const bySigla = unidades.find(u => normalizeSigla(u.sigla) === sigla);
    if (bySigla) return bySigla;
  }
  return unidades.find(u => u.is_comercial) || unidades.find(u => u.is_principal) || unidades[0];
};

const deriveItemCanonical = (pedido: any, produto: any, legacyItem: any, ordem: number) => {
  const unidade = resolveUnidadeForLegacy(produto, legacyItem);
  const fator = asNumber(unidade?.fator_conversao, 1) || 1;
  const fatorPreco = asNumber(unidade?.fator_preco, 1) || 1;

  // Pratica estavel: custo_unitario legado esta em fator-1.
  const custoFator1 = asNumber(legacyItem?.custo_unitario, 0);
  const frete = asNumber(legacyItem?.custo_frete_unitario, 0);
  const outros = asNumber(legacyItem?.custo_outros_unitario, 0);
  const desconto = asNumber(legacyItem?.desconto_unitario, 0);

  const qComercial = asNumber(legacyItem?.quantidade, 0);
  const qBase = round6(qComercial * fator);
  const custoTotal = round6(custoFator1 + frete + outros - desconto);
  const total = round6(qBase * custoTotal);

  return {
    pedido_compra_id: pedido?.id,
    pedido_compra_numero: pedido?.numero || '',
    produto_id: produto?.id,
    produto_nome: produto?.nome || legacyItem?.produto_nome || '',
    produto_unidade_id: unidade?.id || '',
    unidade_sigla: normalizeSigla(unidade?.sigla) || 'UN',
    fator_aplicado: fator,
    fator_preco_aplicado: fatorPreco,
    quantidade_comercial: round6(qComercial),
    quantidade_base: qBase,
    custo_unitario_fator1: round6(custoFator1),
    custo_unitario_comercial: round6(custoFator1 * fator),
    frete_unitario_fator1: round6(frete),
    outros_unitario_fator1: round6(outros),
    desconto_unitario_fator1: round6(desconto),
    custo_total_unitario_fator1: custoTotal,
    total,
    quantidade_vinculada: asNumber(legacyItem?.quantidade_vinculada, 0),
    ordem,
    observacoes: typeof legacyItem?.observacoes === 'string' ? legacyItem.observacoes : '',
    status_recebimento: legacyItem?.status_recebimento || 'Pendente',
  };
};

const itemToLegacyMirror = (item: any) => {
  const fator = asNumber(item?.fator_aplicado, 1) || 1;
  return {
    produto_id: item?.produto_id || '',
    produto_nome: item?.produto_nome || '',
    produto_unidade_id: item?.produto_unidade_id || '',
    quantidade: asNumber(item?.quantidade_comercial, 0),
    unidade_medida: item?.unidade_sigla || 'UN',
    fator_conversao: fator,
    quantidade_base: asNumber(item?.quantidade_base, 0),
    quantidade_vinculada: asNumber(item?.quantidade_vinculada, 0),
    custo_unitario: asNumber(item?.custo_unitario_fator1, 0),
    custo_final_unitario: asNumber(item?.custo_total_unitario_fator1, 0),
    custo_unitario_base: asNumber(item?.custo_unitario_fator1, 0),
    custo_final_unitario_base: asNumber(item?.custo_total_unitario_fator1, 0),
    custo_unitario_apresentacao: asNumber(item?.custo_unitario_comercial, 0),
    custo_final_unitario_apresentacao: round6(asNumber(item?.custo_total_unitario_fator1, 0) * fator),
    custo_frete_unitario: asNumber(item?.frete_unitario_fator1, 0),
    custo_outros_unitario: asNumber(item?.outros_unitario_fator1, 0),
    desconto_unitario: asNumber(item?.desconto_unitario_fator1, 0),
    total: asNumber(item?.total, 0),
    preco_eixo: 'FATOR_1',
    unidade_apresentacao: item?.unidade_sigla || 'UN',
    pedido_compra_item_id: item?.id || undefined,
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const limit = Math.min(Number(body?.limit) || 200, 1000);
    const pedidoIds: string[] | null = Array.isArray(body?.pedido_ids) && body.pedido_ids.length > 0
      ? body.pedido_ids.map((x: any) => String(x))
      : null;
    const apenasNaoConcluidos = body?.apenas_nao_concluidos === true;

    const todosPedidos = await base44.asServiceRole.entities.PedidoCompra.list();
    let candidatos = (todosPedidos || []).filter((p: any) =>
      pedidoIds ? pedidoIds.includes(String(p.id)) : true
    );
    if (apenasNaoConcluidos) candidatos = candidatos.filter(isPedidoNaoConcluido);
    candidatos = candidatos.slice(0, limit);

    const stats = {
      total_pedidos: candidatos.length,
      pedidos_processados: 0,
      itens_criados: 0,
      itens_apagados: 0,
      pedidos_sem_itens: 0,
      pedidos_com_erro: 0,
    };
    const erros: Array<{ pedido_id: string; numero: string; mensagem: string }> = [];

    // Cache de produtos pra reduzir round-trips.
    const produtoCache = new Map<string, any>();
    const fetchProduto = async (id: string): Promise<any> => {
      if (!id) return null;
      if (produtoCache.has(id)) return produtoCache.get(id);
      const list = await base44.asServiceRole.entities.Produto.filter({ id }, null, 1);
      const produto = Array.isArray(list) && list.length > 0 ? list[0] : null;
      produtoCache.set(id, produto);
      return produto;
    };

    for (const pedido of candidatos) {
      try {
        const itensLegados = Array.isArray(pedido?.itens) ? pedido.itens : [];
        if (!itensLegados.length) {
          stats.pedidos_sem_itens++;
          continue;
        }

        const linhasDerivadas: any[] = [];
        for (let i = 0; i < itensLegados.length; i++) {
          const legado = itensLegados[i];
          const produto = await fetchProduto(String(legado?.produto_id || ''));
          if (!produto) {
            erros.push({
              pedido_id: pedido.id,
              numero: pedido.numero || '',
              mensagem: `produto_id ${legado?.produto_id} nao encontrado (linha ${i})`,
            });
            continue;
          }
          linhasDerivadas.push(deriveItemCanonical(pedido, produto, legado, i));
        }

        if (dryRun) {
          stats.pedidos_processados++;
          stats.itens_criados += linhasDerivadas.length;
          continue;
        }

        // Apaga linhas antigas e recria.
        const linhasAtuais = await base44.asServiceRole.entities.PedidoCompraItem.filter({ pedido_compra_id: pedido.id });
        for (const linha of (linhasAtuais || [])) {
          try {
            await base44.asServiceRole.entities.PedidoCompraItem.delete(linha.id);
            stats.itens_apagados++;
          } catch (e) {
            console.warn('falha ao apagar linha legada:', linha.id, (e as Error).message);
          }
        }

        const criadas: any[] = [];
        for (const item of linhasDerivadas) {
          const novo = await base44.asServiceRole.entities.PedidoCompraItem.create(item);
          criadas.push(novo);
          stats.itens_criados++;
        }

        // Recompoe espelho.
        const espelho = criadas.map(itemToLegacyMirror);
        const valorTotal = round6(espelho.reduce((acc: number, it: any) => acc + asNumber(it.total, 0), 0));
        await base44.asServiceRole.entities.PedidoCompra.update(pedido.id, {
          itens: espelho,
          valor_total: valorTotal,
          migracao_pci_canonical_v1: true,
          migracao_pci_canonical_data: new Date().toISOString(),
        });

        stats.pedidos_processados++;
      } catch (e) {
        stats.pedidos_com_erro++;
        erros.push({ pedido_id: pedido.id, numero: pedido.numero || '', mensagem: (e as Error).message });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      stats,
      erros: erros.slice(0, 100),
    });
  } catch (error) {
    console.error('migrarPedidoCompraItensLegacy erro:', error);
    return Response.json({ error: (error as Error).message || String(error) }, { status: 500 });
  }
});
