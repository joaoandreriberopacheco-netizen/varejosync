import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

type Row = Record<string, unknown>;

/**
 * Lista o catálogo de interface em formato de tree grid (plano ou aninhado).
 * POST JSON: ver docs/migration/CATALOGO_INTERFACE_TREE_GRID.md
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Use POST' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const parentStableCode =
      typeof body.parent_stable_code === 'string' ? body.parent_stable_code.trim() : '';
    const parentId = typeof body.parent_id === 'string' ? body.parent_id.trim() : '';
    const incluirDescontinuados = Boolean(body.incluir_descontinuados);
    const incluirRascunhos = Boolean(body.incluir_rascunhos);
    const responseFormat = body.response_format === 'nested' ? 'nested' : 'flat';
    const profundidadeRaw = body.profundidade_max;
    const profundidadeMax =
      profundidadeRaw === null || profundidadeRaw === undefined || profundidadeRaw === ''
        ? null
        : Number(profundidadeRaw);

    if (profundidadeMax !== null && (!Number.isFinite(profundidadeMax) || profundidadeMax < 0)) {
      return Response.json({ error: 'profundidade_max inválida' }, { status: 400 });
    }

    const listed = await base44.entities.CatalogoInterface.list('ordem', 8000);
    const all = (Array.isArray(listed) ? listed : []) as Row[];
    const byId = new Map<string, Row>();
    const byStable = new Map<string, Row>();
    for (const r of all) {
      const id = String(r.id ?? '');
      if (id) byId.set(id, r);
      const sc = String(r.stable_code ?? '');
      if (sc) byStable.set(sc, r);
    }

    const passesLifecycle = (row: Row) => {
      const ls = String(row.lifecycle_status ?? '');
      if (ls === 'descontinuado' && !incluirDescontinuados) return false;
      if (ls === 'rascunho' && !incluirRascunhos) return false;
      return true;
    };

    const getParentId = (row: Row): string | null => {
      const p = row.parent_id;
      if (p === undefined || p === null || p === '') return null;
      return String(p);
    };

    const childrenOf = (pid: string | null): Row[] => {
      return all
        .filter((r) => getParentId(r) === pid)
        .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
    };

    let anchor: Row | null = null;
    if (parentId) anchor = byId.get(parentId) ?? null;
    else if (parentStableCode) anchor = byStable.get(parentStableCode) ?? null;

    if ((parentStableCode || parentId) && !anchor) {
      return Response.json({ error: 'Âncora não encontrada' }, { status: 404 });
    }

    if (anchor && !passesLifecycle(anchor)) {
      return Response.json(
        { error: 'Âncora excluída pelos filtros de ciclo de vida (use incluir_descontinuados / incluir_rascunhos)' },
        { status: 404 }
      );
    }

    const anchorId = anchor ? String(anchor.id ?? '') : null;

    /**
     * profundidade_max relativa à âncora: 0 = só a âncora; 1 = âncora + filhos diretos; null = ilimitado.
     */
    const collectPreorderFromAnchor = (rootId: string, maxRel: number | null): Row[] => {
      const out: Row[] = [];

      const visit = (id: string, relFromAnchor: number) => {
        const node = byId.get(id);
        if (!node || !passesLifecycle(node)) return;
        if (maxRel !== null && relFromAnchor > maxRel) return;
        out.push(node);
        if (maxRel !== null && relFromAnchor >= maxRel) return;
        for (const ch of childrenOf(id)) {
          const cid = String(ch.id ?? '');
          if (cid) visit(cid, relFromAnchor + 1);
        }
      };

      visit(rootId, 0);
      return out;
    };

    let rawNodes: Row[];

    if (anchorId) {
      rawNodes = collectPreorderFromAnchor(anchorId, profundidadeMax);
    } else {
      rawNodes = childrenOf(null).filter((r) => passesLifecycle(r));
    }

    const depthMemo = new Map<string, number>();
    const depthOf = (id: string): number => {
      if (depthMemo.has(id)) return depthMemo.get(id)!;
      let d = 0;
      let cur: string | null = id;
      const guard = new Set<string>();
      while (cur) {
        if (guard.has(cur)) break;
        guard.add(cur);
        const p = getParentId(byId.get(cur) ?? {});
        if (!p) break;
        d += 1;
        cur = p;
      }
      depthMemo.set(id, d);
      return d;
    };

    const anchorDepth = anchorId ? depthOf(anchorId) : 0;

    const flatRows = rawNodes.map((node) => {
      const id = String(node.id ?? '');
      const pid = getParentId(node);
      const parentStable = pid ? String((byId.get(pid)?.stable_code as string) ?? '') : '';

      const pathIds: string[] = [];
      const pathStable: string[] = [];
      const pathTitles: string[] = [];
      let cur: string | null = id;
      const guard2 = new Set<string>();
      while (cur) {
        if (guard2.has(cur)) break;
        guard2.add(cur);
        const n = byId.get(cur);
        if (!n) break;
        pathIds.unshift(cur);
        pathStable.unshift(String(n.stable_code ?? ''));
        pathTitles.unshift(String(n.titulo ?? ''));
        cur = getParentId(n);
      }

      const depthRelativeRoot = anchorId ? depthOf(id) - anchorDepth : depthOf(id);

      return {
        ...node,
        parent_stable_code: parentStable,
        depth: depthRelativeRoot,
        path_ids: pathIds,
        path_stable_codes: pathStable,
        path_titles: pathTitles,
      };
    });

    const buildNested = (parentKey: string | null): unknown[] => {
      return flatRows
        .filter((r) => getParentId(r as Row) === parentKey)
        .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))
        .map((r) => {
          const id = String(r.id ?? '');
          return { ...r, children: buildNested(id) };
        });
    };

    let nested: unknown = null;
    if (responseFormat === 'nested' && anchorId) {
      nested = {
        anchor: flatRows.find((r) => String(r.id) === anchorId) ?? null,
        children: buildNested(anchorId),
      };
    } else if (responseFormat === 'nested' && !anchorId) {
      nested = { roots: buildNested(null) };
    }

    return Response.json({
      contractVersion: '1.0.0',
      responseShape: responseFormat,
      branch: anchor
        ? { stable_code: String(anchor.stable_code ?? ''), id: String(anchor.id ?? '') }
        : { stable_code: null, id: null },
      incluir_descontinuados: incluirDescontinuados,
      incluir_rascunhos: incluirRascunhos,
      profundidade_max: profundidadeMax,
      count: flatRows.length,
      rows: flatRows,
      nested,
    });
  } catch (error) {
    return Response.json({ error: (error as Error)?.message || String(error) }, { status: 500 });
  }
});
