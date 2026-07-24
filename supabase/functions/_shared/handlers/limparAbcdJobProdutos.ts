// Port automático de base44/functions/limparAbcdJobProdutos/entry.ts
import type { createP38Client } from '../p38Client.ts';

const BATCH_SIZE = 25;
const PAGE_SIZE = 500;

const CAMPOS_LIMPAR = {
  abcd: null,
  iep_score: null,
  iep_score_nivel_1: null,
  iep_score_nivel_2: null,
  iep_score_nivel_3: null,
  iep_score_nivel_4: null,
  iep_score_nivel_5: null,
  iep_classe: null,
};

function rowsFromApi(batch: unknown): Record<string, unknown>[] {
  return Array.isArray(batch) ? batch : (batch as { data?: unknown[] })?.data ?? [];
}

function temDadoGravadoPeloJob(produto: Record<string, unknown>, somenteD: boolean) {
  if (produto.iep_trava_manual) return false;

  if (somenteD) {
    return String(produto.abcd || '').toUpperCase() === 'D';
  }

  return Boolean(
    produto.abcd ||
      produto.iep_classe ||
      produto.iep_score != null ||
      produto.iep_score_nivel_1 != null ||
      produto.iep_score_nivel_2 != null ||
      produto.iep_score_nivel_3 != null ||
      produto.iep_score_nivel_4 != null ||
      produto.iep_score_nivel_5 != null,
  );
}

async function listarTodosProdutos(entities: ReturnType<typeof createClientFromRequest>['entities']) {
  const todos: Record<string, unknown>[] = [];
  let skip = 0;

  while (true) {
    const batch = await entities.Produto.list('-created_date', PAGE_SIZE, skip);
    const rows = rowsFromApi(batch);
    if (!rows.length) break;
    todos.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return todos;
}

async function parseBody(req: Request) {
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handle(req: Request, base44: Awaited<ReturnType<typeof createP38Client>>): Promise<Response> {
  try {
    // base44 injetado por servePorted
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const body = await parseBody(req);
    const dryRun = body.dry_run !== false;
    const somenteD = body.somente_d === true;
    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(500, Math.max(1, Number(body.limit) || BATCH_SIZE));

    const produtos = await listarTodosProdutos(base44.entities);
    const elegiveis = produtos.filter((p) => temDadoGravadoPeloJob(p, somenteD));
    const comTrava = produtos.filter((p) => p.iep_trava_manual).length;
    const lote = elegiveis.slice(offset, offset + limit);

    if (dryRun) {
      const porLetra: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, vazio: 0 };
      for (const p of elegiveis) {
        const letra = String(p.abcd || '').toUpperCase();
        if (letra === 'A' || letra === 'B' || letra === 'C' || letra === 'D' || letra === 'E') {
          porLetra[letra] += 1;
        } else {
          porLetra.vazio += 1;
        }
      }

      return Response.json({
        status: 'dry_run',
        total_produtos: produtos.length,
        elegiveis_limpeza: elegiveis.length,
        com_trava_manual_preservados: comTrava,
        somente_d: somenteD,
        abcd_por_letra: porLetra,
        campos_limpos: Object.keys(CAMPOS_LIMPAR),
        proximo_passo:
          'Invoque com { "dry_run": false } para limpar. Use lotes com offset/limit se o catálogo for grande.',
      });
    }

    let limpos = 0;
    const erros: { id: string; erro: string }[] = [];

    for (const produto of lote) {
      try {
        await base44.entities.Produto.update(String(produto.id), CAMPOS_LIMPAR);
        limpos += 1;
        await sleep(40);
      } catch (error) {
        erros.push({
          id: String(produto.id),
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const nextOffset = offset + lote.length;
    const concluido = nextOffset >= elegiveis.length;

    return Response.json({
      status: concluido ? 'concluido' : 'em_andamento',
      limpos_neste_lote: limpos,
      offset,
      next_offset: concluido ? null : nextOffset,
      total_elegiveis: elegiveis.length,
      restantes: Math.max(0, elegiveis.length - nextOffset),
      somente_d: somenteD,
      erros,
      mensagem: concluido
        ? 'Campos ABCD/IEP gravados pelo job foram limpos. O catálogo passa a classificar ao vivo.'
        : `Lote concluído. Chame novamente com offset=${nextOffset}.`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
