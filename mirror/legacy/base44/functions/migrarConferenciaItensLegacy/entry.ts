import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/* ============================================================================
 * migrarConferenciaItensLegacy
 *
 * Backfill idempotente: para cada ConferenciaEstoque, le `itens_conferidos[]`
 * legados (que so tem produto_id, produto_nome, quantidade_contada) e cria
 * linhas em ConferenciaItem com contrato canonico:
 *   - resolve unidade pela unidade_principal do produto (legado nao tinha sigla)
 *   - assume `quantidade_contada` legada esta em unidade fator-1 (era a regra
 *     antes do canonical) e portanto `quantidade_contada_base = quantidade_contada`
 *     e `quantidade_contada_comercial = quantidade_contada / fator_principal`
 *     (igual em produtos sem alternativas).
 *   - calcula divergencia vs `produto.estoque_atual` no momento da migracao.
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

const getUnidadePrincipalProduto = (produto: any): UnidadeCanonical => {
  if (Array.isArray(produto?.unidades) && produto.unidades.length > 0) {
    const principal = produto.unidades.find((u: any) => u.is_principal && u.ativo !== false) || produto.unidades[0];
    return principal as UnidadeCanonical;
  }
  return {
    id: 'principal',
    sigla: normalizeSigla(produto?.unidade_principal || 'UN') || 'UN',
    fator_conversao: 1,
    fator_preco: 1,
    is_principal: true,
    is_comercial: false,
    ativo: true,
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
    const conferenciaIds: string[] | null = Array.isArray(body?.conferencia_ids) && body.conferencia_ids.length > 0
      ? body.conferencia_ids.map((x: any) => String(x))
      : null;

    const todas = await base44.asServiceRole.entities.ConferenciaEstoque.list();
    let candidatas = (todas || []).filter((c: any) =>
      conferenciaIds ? conferenciaIds.includes(String(c.id)) : true
    );
    candidatas = candidatas.slice(0, limit);

    const stats = {
      total: candidatas.length,
      processadas: 0,
      itens_criados: 0,
      itens_apagados: 0,
      sem_itens: 0,
      com_erro: 0,
    };
    const erros: Array<{ conferencia_id: string; nome: string; mensagem: string }> = [];

    const produtoCache = new Map<string, any>();
    const fetchProduto = async (id: string): Promise<any> => {
      if (!id) return null;
      if (produtoCache.has(id)) return produtoCache.get(id);
      const list = await base44.asServiceRole.entities.Produto.filter({ id }, null, 1);
      const produto = Array.isArray(list) && list.length > 0 ? list[0] : null;
      produtoCache.set(id, produto);
      return produto;
    };

    for (const conferencia of candidatas) {
      try {
        const itensLegados = Array.isArray(conferencia?.itens_conferidos) ? conferencia.itens_conferidos : [];
        if (!itensLegados.length) {
          stats.sem_itens++;
          continue;
        }

        // Agrupa por produto_id (telas legadas adicionavam multiplas linhas).
        const agrupado = new Map<string, { produto_id: string; produto_nome: string; quantidade: number }>();
        for (const it of itensLegados) {
          const pid = String(it?.produto_id || '');
          if (!pid) continue;
          const prev = agrupado.get(pid) || { produto_id: pid, produto_nome: it?.produto_nome || '', quantidade: 0 };
          prev.quantidade += asNumber(it?.quantidade_contada, 0);
          agrupado.set(pid, prev);
        }

        const linhasDerivadas: any[] = [];
        let ordem = 0;
        for (const grupo of agrupado.values()) {
          const produto = await fetchProduto(grupo.produto_id);
          if (!produto) {
            erros.push({
              conferencia_id: conferencia.id,
              nome: conferencia.nome_conferencia || '',
              mensagem: `produto_id ${grupo.produto_id} nao encontrado`,
            });
            continue;
          }
          const principal = getUnidadePrincipalProduto(produto);
          const fator = asNumber(principal?.fator_conversao, 1) || 1;
          const qContadaBase = round6(grupo.quantidade);
          const qContadaComercial = round6(qContadaBase / fator);
          const qSistemaBase = asNumber(produto?.estoque_atual, 0);
          const divergencia = round6(qContadaBase - qSistemaBase);
          let sinal = 'zero';
          if (divergencia > 1e-6) sinal = 'positivo';
          else if (divergencia < -1e-6) sinal = 'negativo';

          linhasDerivadas.push({
            conferencia_id: conferencia.id,
            conferencia_nome: conferencia.nome_conferencia || '',
            produto_id: produto.id,
            produto_nome: produto.nome || grupo.produto_nome,
            produto_unidade_id: principal?.id || '',
            unidade_sigla: normalizeSigla(principal?.sigla) || 'UN',
            fator_aplicado: fator,
            quantidade_sistema_base: round6(qSistemaBase),
            quantidade_contada_comercial: qContadaComercial,
            quantidade_contada_base: qContadaBase,
            divergencia_base: divergencia,
            divergencia_sinal: sinal,
            ordem: ordem++,
            observacoes: '',
          });
        }

        if (dryRun) {
          stats.processadas++;
          stats.itens_criados += linhasDerivadas.length;
          continue;
        }

        const linhasAtuais = await base44.asServiceRole.entities.ConferenciaItem.filter({ conferencia_id: conferencia.id });
        for (const linha of (linhasAtuais || [])) {
          try {
            await base44.asServiceRole.entities.ConferenciaItem.delete(linha.id);
            stats.itens_apagados++;
          } catch (e) {
            console.warn('falha ao apagar linha legada:', linha.id, (e as Error).message);
          }
        }

        const criadas: any[] = [];
        for (const item of linhasDerivadas) {
          const novo = await base44.asServiceRole.entities.ConferenciaItem.create(item);
          criadas.push(novo);
          stats.itens_criados++;
        }

        // Recompoe espelho.
        const espelho = criadas.map((it) => ({
          produto_id: it.produto_id,
          produto_nome: it.produto_nome,
          quantidade_contada: it.quantidade_contada_base,
          conferencia_item_id: it.id,
        }));
        await base44.asServiceRole.entities.ConferenciaEstoque.update(conferencia.id, {
          itens_conferidos: espelho,
          migracao_ci_canonical_v1: true,
          migracao_ci_canonical_data: new Date().toISOString(),
        });

        stats.processadas++;
      } catch (e) {
        stats.com_erro++;
        erros.push({ conferencia_id: conferencia.id, nome: conferencia.nome_conferencia || '', mensagem: (e as Error).message });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      stats,
      erros: erros.slice(0, 100),
    });
  } catch (error) {
    console.error('migrarConferenciaItensLegacy erro:', error);
    return Response.json({ error: (error as Error).message || String(error) }, { status: 500 });
  }
});
