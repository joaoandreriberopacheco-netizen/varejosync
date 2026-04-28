import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/* ============================================================================
 * migrarEmbarqueItensLegacy
 *
 * Backfill idempotente: para cada Embarque, le `itens[]`/`itens_embarcados[]`
 * legados e cria linhas em EmbarqueItem com contrato canonico (resolvendo
 * unidade pelo produto + sigla legada).
 *
 * Tenta vincular cada linha de embarque a uma linha de PedidoCompraItem
 * (matching por produto_id no mesmo pedido_compra_id).
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

const resolveUnidade = (produto: any, item: any): UnidadeCanonical => {
  const unidades = getUnidadesProduto(produto);
  if (item?.produto_unidade_id) {
    const byId = unidades.find(u => u.id === item.produto_unidade_id);
    if (byId) return byId;
  }
  const sigla = normalizeSigla(item?.unidade_medida);
  if (sigla) {
    const bySigla = unidades.find(u => normalizeSigla(u.sigla) === sigla);
    if (bySigla) return bySigla;
  }
  return unidades.find(u => u.is_comercial) || unidades.find(u => u.is_principal) || unidades[0];
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const limit = Math.min(Number(body?.limit) || 200, 1000);
    const embarqueIds: string[] | null = Array.isArray(body?.embarque_ids) && body.embarque_ids.length > 0
      ? body.embarque_ids.map((x: any) => String(x))
      : null;

    const todos = await base44.asServiceRole.entities.Embarque.list();
    let candidatos = (todos || []).filter((e: any) =>
      embarqueIds ? embarqueIds.includes(String(e.id)) : true
    );
    candidatos = candidatos.slice(0, limit);

    const stats = {
      total_embarques: candidatos.length,
      processados: 0,
      itens_criados: 0,
      itens_apagados: 0,
      sem_itens: 0,
      com_erro: 0,
    };
    const erros: Array<{ embarque_id: string; numero: string; mensagem: string }> = [];

    const produtoCache = new Map<string, any>();
    const fetchProduto = async (id: string): Promise<any> => {
      if (!id) return null;
      if (produtoCache.has(id)) return produtoCache.get(id);
      const list = await base44.asServiceRole.entities.Produto.filter({ id }, null, 1);
      const produto = Array.isArray(list) && list.length > 0 ? list[0] : null;
      produtoCache.set(id, produto);
      return produto;
    };

    // Cache pra resolver pedido_compra_item_id (busca todas linhas do pedido).
    const pciByPedidoCache = new Map<string, any[]>();
    const fetchPCIByPedido = async (pedidoId: string): Promise<any[]> => {
      if (!pedidoId) return [];
      if (pciByPedidoCache.has(pedidoId)) return pciByPedidoCache.get(pedidoId)!;
      const linhas = await base44.asServiceRole.entities.PedidoCompraItem.filter({ pedido_compra_id: pedidoId });
      const arr = Array.isArray(linhas) ? linhas : [];
      pciByPedidoCache.set(pedidoId, arr);
      return arr;
    };

    for (const embarque of candidatos) {
      try {
        const itensLegados = Array.isArray(embarque?.itens) && embarque.itens.length > 0
          ? embarque.itens
          : (Array.isArray(embarque?.itens_embarcados) ? embarque.itens_embarcados : []);
        if (!itensLegados.length) {
          stats.sem_itens++;
          continue;
        }

        const linhasDerivadas: any[] = [];
        for (let i = 0; i < itensLegados.length; i++) {
          const legado = itensLegados[i];
          const produto = await fetchProduto(String(legado?.produto_id || ''));
          if (!produto) {
            erros.push({
              embarque_id: embarque.id,
              numero: embarque.numero || '',
              mensagem: `produto_id ${legado?.produto_id} nao encontrado (linha ${i})`,
            });
            continue;
          }
          const unidade = resolveUnidade(produto, legado);
          const fator = asNumber(unidade?.fator_conversao, 1) || 1;
          const qPedida = asNumber(legado?.quantidade_pedida, 0);
          const qEmbarcada = asNumber(legado?.quantidade_embarcada, 0);
          const qRecebida = asNumber(legado?.quantidade_recebida, 0);

          // Tenta vincular ao PedidoCompraItem por produto_id no mesmo pedido_compra_id.
          let pciId = legado?.pedido_compra_item_id || '';
          if (!pciId && embarque.pedido_compra_id) {
            const linhasPCI = await fetchPCIByPedido(String(embarque.pedido_compra_id));
            const match = linhasPCI.find(p => p.produto_id === produto.id);
            if (match) pciId = match.id;
          }

          linhasDerivadas.push({
            embarque_id: embarque.id,
            embarque_numero: embarque.numero || '',
            pedido_compra_id: embarque.pedido_compra_id || '',
            pedido_compra_item_id: pciId,
            produto_id: produto.id,
            produto_nome: produto.nome || legado?.produto_nome || '',
            produto_unidade_id: unidade?.id || '',
            unidade_sigla: normalizeSigla(unidade?.sigla) || 'UN',
            fator_aplicado: fator,
            quantidade_pedida_comercial: round6(qPedida),
            quantidade_pedida_base: round6(qPedida * fator),
            quantidade_embarcada_comercial: round6(qEmbarcada),
            quantidade_embarcada_base: round6(qEmbarcada * fator),
            quantidade_recebida_comercial: round6(qRecebida),
            quantidade_recebida_base: round6(qRecebida * fator),
            divergencia_tipo: legado?.divergencia_tipo || 'Nenhuma',
            produto_id_recebido_diferente: legado?.produto_id_recebido_diferente || '',
            produto_nome_recebido_diferente: legado?.produto_nome_recebido_diferente || '',
            acordo_financeiro_lancamento_id: legado?.acordo_financeiro_lancamento_id || '',
            ordem: i,
            observacoes: typeof legado?.observacoes === 'string' ? legado.observacoes : '',
          });
        }

        if (dryRun) {
          stats.processados++;
          stats.itens_criados += linhasDerivadas.length;
          continue;
        }

        const linhasAtuais = await base44.asServiceRole.entities.EmbarqueItem.filter({ embarque_id: embarque.id });
        for (const linha of (linhasAtuais || [])) {
          try {
            await base44.asServiceRole.entities.EmbarqueItem.delete(linha.id);
            stats.itens_apagados++;
          } catch (e) {
            console.warn('falha ao apagar linha legada:', linha.id, (e as Error).message);
          }
        }

        const criadas: any[] = [];
        for (const item of linhasDerivadas) {
          const novo = await base44.asServiceRole.entities.EmbarqueItem.create(item);
          criadas.push(novo);
          stats.itens_criados++;
        }

        // Recompoe espelho.
        const espelho = criadas.map((it) => ({
          produto_id: it.produto_id,
          produto_nome: it.produto_nome,
          produto_unidade_id: it.produto_unidade_id,
          quantidade_pedida: it.quantidade_pedida_comercial,
          quantidade_embarcada: it.quantidade_embarcada_comercial,
          quantidade_recebida: it.quantidade_recebida_comercial,
          unidade_medida: it.unidade_sigla,
          divergencia_tipo: it.divergencia_tipo,
          produto_id_recebido_diferente: it.produto_id_recebido_diferente,
          produto_nome_recebido_diferente: it.produto_nome_recebido_diferente,
          acordo_financeiro_lancamento_id: it.acordo_financeiro_lancamento_id,
          embarque_item_id: it.id,
        }));
        await base44.asServiceRole.entities.Embarque.update(embarque.id, {
          itens: espelho,
          migracao_ei_canonical_v1: true,
          migracao_ei_canonical_data: new Date().toISOString(),
        });

        stats.processados++;
      } catch (e) {
        stats.com_erro++;
        erros.push({ embarque_id: embarque.id, numero: embarque.numero || '', mensagem: (e as Error).message });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      stats,
      erros: erros.slice(0, 100),
    });
  } catch (error) {
    console.error('migrarEmbarqueItensLegacy erro:', error);
    return Response.json({ error: (error as Error).message || String(error) }, { status: 500 });
  }
});
