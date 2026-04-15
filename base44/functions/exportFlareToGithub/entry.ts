import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Exporta todos os TargetFlare pendentes como JSON para o repositório GitHub.
 * Faz commit de flare-queue.json no branch configurado.
 *
 * Variáveis de ambiente obrigatórias:
 *   FLARE_GITHUB_OWNER  — ex: "minha-org"
 *   FLARE_GITHUB_REPO   — ex: "varejosync"
 *   FLARE_GITHUB_BRANCH — ex: "main" (opcional, default: "main")
 *   FLARE_GITHUB_PATH   — ex: ".flare/flare-queue.json" (opcional)
 *
 * Pode ser chamada manualmente (POST, admin) ou por automation de entidade.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Permite chamada por automation de entidade (sem user) OU por admin manual
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Apenas administradores.' }, { status: 403 });
      }
    } catch {
      // Se não há sessão de utilizador, assume automation (service role)
      isAutomation = true;
    }

    // Config via env vars
    const owner  = Deno.env.get('FLARE_GITHUB_OWNER');
    const repo   = Deno.env.get('FLARE_GITHUB_REPO');
    const branch = Deno.env.get('FLARE_GITHUB_BRANCH') || 'main';
    const path   = Deno.env.get('FLARE_GITHUB_PATH')   || '.flare/flare-queue.json';

    if (!owner || !repo) {
      return Response.json({
        error: 'Configure FLARE_GITHUB_OWNER e FLARE_GITHUB_REPO nas variáveis de ambiente.'
      }, { status: 500 });
    }

    // Buscar token GitHub via conector autorizado
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    // Buscar todos os TargetFlare pendentes
    const rows = await base44.asServiceRole.entities.TargetFlare.filter(
      { status: 'pending' }, '-created_date', 500
    );
    const items = Array.isArray(rows) ? rows : [];

    const payload = {
      exportedAt: new Date().toISOString(),
      count: items.length,
      items: items.map(r => ({
        id:                   r.id,
        status:               r.status,
        file_path:            r.file_path,
        line:                 r.line,
        column:               r.column,
        source_location_raw:  r.source_location_raw,
        component_name:       r.component_name,
        briefing:             r.briefing,
        action_briefing:      r.action_briefing,
        confidence:           r.confidence,
        resolution_precision: r.resolution_precision,
        context_image_url:    r.context_image_url,
        route:                r.route,
        created_date:         r.created_date,
        updated_date:         r.updated_date,
      })),
    };

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

    const fileApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Verificar se o ficheiro já existe (para obter o sha necessário no update)
    let existingSha = null;
    const getResp = await fetch(`${fileApiUrl}?ref=${branch}`, { headers });
    if (getResp.ok) {
      const existing = await getResp.json();
      existingSha = existing.sha;
    }

    const commitBody = {
      message: `chore(flare): sync queue — ${items.length} pending [${new Date().toISOString().slice(0,16)}Z]`,
      content,
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    };

    const putResp = await fetch(fileApiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!putResp.ok) {
      const err = await putResp.text();
      return Response.json({ error: `GitHub API: ${putResp.status}`, detail: err }, { status: 502 });
    }

    const result = await putResp.json();

    return Response.json({
      success: true,
      committed: result.commit?.sha?.slice(0, 8),
      path,
      branch,
      count: items.length,
      exportedAt: payload.exportedAt,
    });

  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});